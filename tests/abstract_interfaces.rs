use serde_json::{json, Value};
use std::{fs, path::Path};
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

const LIBRARY: &str = include_str!("fixtures/abstract-interfaces/library.ink");
fn setup(name: &str, source: &str) -> std::path::PathBuf {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("build")
        .join(name);
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("library.ink"), LIBRARY).unwrap();
    fs::write(
        dir.join("main.ink"),
        format!("module caller;import \"library.ink\" as lib;{source}"),
    )
    .unwrap();
    dir.join("main.ink")
}

#[test]
fn imported_abstract_records_reject_representation_access_in_every_source_scope() {
    let sources=[
      "fn reveal(v:lib.Hidden<u32>)->u32{return v.item;}",
      "fn forge()->lib.Hidden<u32>{return lib.Hidden<u32>{item:7,valid:true};}",
      "type Alias=lib.Hidden<u32>;fn forge()->Alias{return Alias{item:7,valid:true};}",
      "record Outer{inner:lib.Hidden<u32>,}fn reveal(v:Outer)->u32{return v.inner.item;}",
      "fn reveal(v:lib.Hidden<u32>)->u32{return lib.through<u32>(v,fn(x)=>x.item);}",
      "fn reveal(v:List<lib.Hidden<u32>>)->List<u32>{return v.map(fn(x)=>x.item);}",
      "fn reveal(v:Option<lib.Hidden<u32>>)->u32{return match v{Some(x)=>x.item,None=>0,};}",
      "fn reveal(v:lib.Hidden<u32>)->u32{return repeat(2,0,fn(i)=>fn(acc)=>acc+v.item);}",
      "fn reveal(v:List<lib.Hidden<u32>>)->List<u32>{return parallel_map(v,1,fn(i)=>fn(x)=>x.item);}",
      "query reveal(v:lib.Hidden<u32>)->u32{return v.item;}",
      "private state Current:lib.Hidden<u32>=lib.wrap<u32>(7);query reveal()->u32 reads(Current){return Current.item;}",
      "private state Current:lib.Hidden<u32>=lib.wrap<u32>(7);keep Observed:u32=Current.item;",
      "spec fn reveal(v:lib.Hidden<u32>)->Bool requires v.valid;ensures result;implementation body for reveal{return true;}",
      "spec fn reveal(v:lib.Hidden<u32>)->lib.Hidden<u32> ensures result.valid;implementation body for reveal{return v;}",
      "private state Current:lib.Hidden<u32>=lib.wrap<u32>(7);invariant Current.valid;",
      "private state Current:lib.Hidden<u32>=lib.wrap<u32>(7);spec query observe()->Bool reads(Current) ensures before(Current).valid;implementation body for observe{return true;}",
    ];
    for (i, source) in sources.iter().enumerate() {
        let file = setup(&format!("abstract-reject-{i}"), source);
        let error = modules::load(file)
            .err()
            .expect("abstract representation leaked");
        assert!(
            error.contains("representation access outside"),
            "{i}: {error}"
        );
    }
}

#[test]
fn callback_specialisation_preserves_owner_access_and_avoids_source_marker_capture() {
    use sha2::{Digest, Sha256};
    let marker = format!("__ink_origin_{:x}", Sha256::digest(b"abstract_library"));
    let source=format!("fn answer({marker}:u32)->u32{{let v=lib.wrap<u32>(7);let next=lib.transform<u32>(v,fn(x)=>x+{marker});return lib.through<u32>(next,fn(x)=>lib.observe<u32>(x));}}");
    let file = setup("abstract-callback-origins", &source);
    let p = modules::load(&file).unwrap().program;
    CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(
        eval::call(&p, "answer", vec![eval::Value::U32(5)], &mut 100_000)
            .unwrap()
            .json(),
        json!(12)
    );
    for f in &p.functions {
        verified_language::analysis::walk(&f.body, |e| {
            assert!(
                !matches!(e,verified_language::syntax::Expr::Let(n,_,_,_) if n.starts_with("__ink_origin_")),
                "source marker leaked into executable bytes"
            )
        });
    }
    let checked = CheckedModule::from_source(p).unwrap();
    fs::write(
        file.parent().unwrap().join("library.ink"),
        LIBRARY.replace("abstract ", ""),
    )
    .unwrap();
    let plain = CheckedModule::from_source(modules::load(file).unwrap().program).unwrap();
    assert_eq!(
        checked.bytes().unwrap(),
        plain.bytes().unwrap(),
        "source opacity changed executable meaning"
    );
}

#[test]
fn nongeneric_records_and_generated_invariant_constructors_keep_the_source_boundary() {
    let file = setup(
        "abstract-nongeneric",
        "fn make()->lib.Plain{return lib.make(7);}",
    );
    let plain = "module abstract_library;abstract record Plain{item:u32,}
      fn make(item:u32)->Plain{return Plain{item:item};}fn observe(v:Plain)->u32{return v.item;}";
    fs::write(file.parent().unwrap().join("library.ink"), plain).unwrap();
    let p = modules::load(&file).unwrap().program;
    CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(
        eval::call(&p, "make", vec![], &mut 10_000).unwrap().json(),
        json!({"item":7})
    );
    for source in [
        "fn reveal(v:lib.Plain)->u32{return v.item;}",
        "fn forge()->lib.Plain{return lib.Plain{item:7};}",
    ] {
        fs::write(
            &file,
            format!("module caller;import \"library.ink\" as lib;{source}"),
        )
        .unwrap();
        assert!(modules::load(&file)
            .err()
            .unwrap()
            .contains("representation access outside"));
    }
    let file = setup(
        "abstract-generated-constructor",
        "fn make()->lib.Hidden<u32>{return lib.wrap<u32>(7);}",
    );
    let p = modules::load(&file).unwrap().program;
    let constructor = p.contracts.value_constructors.values().next().unwrap();
    fs::write(&file,format!("module caller;import \"library.ink\" as lib;fn forge()->lib.Hidden<u32>{{return {constructor}(7,true);}}")).unwrap();
    assert!(modules::load(&file)
        .err()
        .unwrap()
        .contains("constructors must use the declared source interface"));
}

#[test]
fn abstract_interfaces_preserve_complete_calls_state_and_invalid_ingress_across_targets() {
    let file =
        Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/abstract-interfaces/main.ink");
    let mut p = modules::load(&file).unwrap().program;
    verified_language::contracts::attach(
        &mut p,
        serde_json::from_str(include_str!("fixtures/abstract-interfaces/proofs.json")).unwrap(),
    )
    .unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![
        json!({"pure":"make","args":[],"cpu_only":true}),
        json!({"pure":"read","args":[{"item":9,"valid":true}],"cpu_only":true}),
        json!({"pure":"mapped","args":[{"item":u32::MAX,"valid":true}],"cpu_only":true}),
        json!({"pure":"read","args":[{"item":9,"valid":false}],"cpu_only":true}),
        json!({"call":"set","args":[{"item":9,"valid":true}]}),
        json!({"call":"current","args":[]}),
        json!({"call":"abort","args":[{"item":10,"valid":true}]}),
        json!({"call":"current","args":[]}),
        json!({"call":"set","args":[{"item":1,"valid":false}]}),
        json!({"pure":"numeric","args":[[0,u32::MAX]],"expect_gpu":true}),
    ];
    let expected: Vec<Value> = steps
        .iter()
        .map(|step| {
            let reply = if let Some(name) = step["pure"].as_str() {
                let f = p.functions.iter().find(|f| f.name == name).unwrap();
                let args = step["args"]
                    .as_array()
                    .unwrap()
                    .iter()
                    .zip(&f.params)
                    .map(|(v, (_, ty))| eval::Value::from_program_json(v, ty, &p).unwrap())
                    .collect();
                match eval::call(&p, name, args, &mut 1_000_000) {
                    Ok(v) => json!({"value":v.json()}),
                    Err(e) => json!({"host_error":e}),
                }
            } else {
                match runtime.invoke_json(step["call"].as_str().unwrap(), &step["args"]) {
                    Ok(v) => json!({"outcome":v.json()}),
                    Err(e) => json!({"host_error":e}),
                }
            };
            json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()})
        })
        .collect();
    let valid = runtime.checkpoint_portable().unwrap();
    steps.push(json!({"restore":valid}));
    let layout = verified_language::snapshot::layout(&p).unwrap();
    let mut logical =
        verified_language::snapshot_wire::decode(&layout, &valid, Default::default()).unwrap();
    logical.tables[0] = vec![(json!(0), json!({"item":9,"valid":false}))];
    let forged =
        verified_language::snapshot_wire::encode(&layout, &logical, Default::default()).unwrap();
    assert!(Runtime::restore_portable(p.clone(), &forged)
        .err()
        .unwrap()
        .contains("invariant"));
    steps.push(json!({"reject_restore":forged}));
    parity::conformance(
        "invariant-value-abstract-parity",
        p,
        &fs::read_to_string(file).unwrap(),
        steps,
        expected,
    );
}

#[test]
fn imported_abstract_values_compose_through_actual_callback_domains_across_targets() {
    let file = Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/abstract-composition/main.ink");
    let mut p = modules::load(&file).unwrap().program;
    verified_language::contracts::attach(&mut p,
        serde_json::from_str(include_str!("fixtures/abstract-composition/proofs.json")).unwrap()).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let runtime = Runtime::new(p.clone()).unwrap();
    let snapshot = runtime.checkpoint_portable().unwrap();
    let steps = vec![
        json!({"pure":"items","args":[[]],"cpu_only":true}),
        json!({"pure":"items","args":[[{"item":0,"valid":true},{"item":u32::MAX,"valid":true}]],"cpu_only":true}),
        json!({"pure":"items","args":[[{"item":0,"valid":true},{"item":7,"valid":false}]],"cpu_only":true}),
        json!({"pure":"nested","args":[[{"item":9,"valid":true}]],"cpu_only":true}),
        json!({"pure":"maybe","args":[{"Some":{"item":7,"valid":true}}],"cpu_only":true}),
        json!({"pure":"maybe","args":[{"None":null}],"cpu_only":true}),
        json!({"pure":"either","args":[{"Ok":{"item":11,"valid":true}}],"cpu_only":true}),
        json!({"pure":"either","args":[{"Err":{"item":12,"valid":true}}],"cpu_only":true}),
        json!({"pure":"either","args":[{"Err":{"item":12,"valid":false}}],"cpu_only":true}),
        json!({"pure":"indexed","args":[],"cpu_only":true}),
        json!({"pure":"zipped","args":[],"cpu_only":true}),
        json!({"pure":"folded","args":[],"cpu_only":true}),
        json!({"pure":"stopped","args":[],"cpu_only":true}),
        json!({"pure":"repeated","args":[],"cpu_only":true}),
        json!({"pure":"until","args":[],"cpu_only":true}),
        json!({"pure":"numeric","args":[[0,u32::MAX]],"expect_gpu":true}),
    ];
    let expected:Vec<Value> = steps.iter().map(|step| {
        let name=step["pure"].as_str().unwrap();
        let f=p.functions.iter().find(|f|f.name==name).unwrap();
        let args=step["args"].as_array().unwrap().iter().zip(&f.params)
            .map(|(v,(_,ty))|eval::Value::from_program_json(v,ty,&p).unwrap()).collect();
        let reply=match eval::call(&p,name,args,&mut 1_000_000) {
            Ok(v)=>json!({"value":v.json()}),Err(e)=>json!({"host_error":e}),
        };
        json!({"reply":reply,"snapshot":snapshot})
    }).collect();
    parity::conformance("invariant-value-abstract-composition",p,&fs::read_to_string(file).unwrap(),steps,expected);
}

#[test]
fn abstract_action_callbacks_preserve_state_events_and_invalid_ingress_across_targets() {
    let file=Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/action-abstract-composition/main.ink");
    let mut p=modules::load(&file).unwrap().program;
    verified_language::contracts::attach(&mut p,serde_json::from_str(include_str!("fixtures/action-abstract-composition/proofs.json")).unwrap()).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let mut runtime=Runtime::new(p.clone()).unwrap();
    let steps=vec![
        json!({"call":"current","args":[]}),
        json!({"call":"items","args":[[{"item":1,"valid":true},{"item":2,"valid":true}]]}),
        json!({"call":"items","args":[[{"item":1,"valid":false}]]}),
        json!({"call":"maybe","args":[{"Some":{"item":7,"valid":true}}]}),
        json!({"call":"maybe","args":[{"None":null}]}),
        json!({"call":"either","args":[{"Ok":{"item":8,"valid":true}}]}),
        json!({"call":"either","args":[{"Err":{"item":9,"valid":true}}]}),
        json!({"call":"either","args":[{"Err":{"item":9,"valid":false}}]}),
        json!({"call":"store","args":[[{"item":1,"valid":true},{"item":2,"valid":true}]]}),
        json!({"call":"current","args":[]}),
        json!({"call":"abort","args":[[{"item":11,"valid":true}]]}),
        json!({"call":"current","args":[]}),
        json!({"call":"store","args":[[{"item":11,"valid":false}]]}),
        json!({"call":"current","args":[]}),
        json!({"pure":"numeric","args":[[0,u32::MAX]],"expect_gpu":true}),
    ];
    let expected:Vec<Value>=steps.iter().map(|step| {
        let reply=if let Some(name)=step["pure"].as_str() {
            let args=vec![eval::Value::List(vec![eval::Value::U32(0),eval::Value::U32(u32::MAX)])];
            match eval::call(&p,name,args,&mut 1_000_000){Ok(v)=>json!({"value":v.json()}),Err(e)=>json!({"host_error":e})}
        }else{
            match runtime.invoke_json(step["call"].as_str().unwrap(),&step["args"]){Ok(v)=>json!({"outcome":v.json()}),Err(e)=>json!({"host_error":e})}
        };
        json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()})
    }).collect();
    parity::conformance("invariant-value-action-composition",p,&fs::read_to_string(file).unwrap(),steps,expected);
}

#[test]
fn checked_action_result_guarantees_preserve_boundaries_across_targets() {
 let file=Path::new(env!("CARGO_MANIFEST_DIR")).join("tests/fixtures/result-guarantees/main.ink");
 let mut p=modules::load(&file).unwrap().program;
 verified_language::contracts::attach(&mut p,serde_json::from_str(include_str!("fixtures/result-guarantees/proofs.json")).unwrap()).unwrap();
 CheckedModule::from_source(p.clone()).unwrap();
 let mut runtime=Runtime::new(p.clone()).unwrap();
 let steps=vec![
  json!({"call":"safe_read","args":[]}),
  json!({"call":"safe_echo","args":[]}),
  json!({"call":"safe_read","args":[]}),
  json!({"call":"safe_change","args":[]}),
  json!({"call":"safe_read","args":[]}),
  json!({"call":"repair","args":[]}),
  json!({"call":"safe_read","args":[]}),
  json!({"call":"repair_nested","args":[]}),
  json!({"call":"safe_read","args":[]}),
  json!({"call":"repair_commit","args":[]}),
  json!({"call":"safe_read","args":[]}),
  json!({"call":"echo","args":[0]}),
  json!({"call":"allocate","args":[0]}),
  json!({"call":"safe_read","args":[]}),
  json!({"pure":"numeric","args":[[0,u32::MAX]],"expect_gpu":true}),
 ];
 let expected:Vec<Value>=steps.iter().map(|step|{
  let reply=if let Some(name)=step["pure"].as_str(){
   match eval::call(&p,name,vec![eval::Value::List(vec![eval::Value::U32(0),eval::Value::U32(u32::MAX)])],&mut 1_000_000){Ok(v)=>json!({"value":v.json()}),Err(e)=>json!({"host_error":e})}
  }else{match runtime.invoke_json(step["call"].as_str().unwrap(),&step["args"]){Ok(v)=>json!({"outcome":v.json()}),Err(e)=>json!({"host_error":e})}};
  json!({"reply":reply,"snapshot":runtime.checkpoint_portable().unwrap()})
 }).collect();
 parity::conformance("invariant-value-result-guarantees",p,&fs::read_to_string(file).unwrap(),steps,expected);
}
