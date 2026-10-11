use std::{fs, path::Path, process::Command};
#[path = "support/parity.rs"]
mod parity;
use verified_language::{
    core::CheckedModule,
    eval,
    laws::{Catalogue, CheckedCatalogue},
    optimisation::{self, Package},
    registry, semantic as s, syntax,
};

#[test]
fn literal_observation_laws_replay_and_rehashed_false_laws_fail() {
    let m = CheckedModule::from_source(
        syntax::parse("module literals;fn size(x:u32)->u32{return length([x,x+1]);}").unwrap(),
    )
    .unwrap();
    let bundle: registry::Bundle =
        serde_json::from_slice(&fs::read("knowledge/store/literal-collection-view.json").unwrap())
            .unwrap();
    let c = registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(c.roots.len(), 202);
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let names: serde_json::Value =
        serde_json::from_slice(&fs::read("knowledge/store/names.json").unwrap()).unwrap();
    for name in [
        "u32-2-length",
        "u64-3-count",
        "i32-1-outside",
        "f32-2-first",
    ] {
        let key = names[format!("rewrite/literal-list/{name}")]
            .as_str()
            .unwrap();
        let mut law = c.objects[key].clone();
        law.to = if name.ends_with("first") {
            s::free(law.to.sort.clone(), "fallback")
        } else if name.ends_with("outside") {
            s::free(law.to.sort.clone(), "x0")
        } else {
            let s::Sort::Value(t) = &law.to.sort else {
                panic!()
            };
            s::word(t.clone(), 99)
        };
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let mut objects = c.objects.clone();
        objects.insert(id.clone(), law);
        let forged = Catalogue {
            schema: 1,
            semantics: verified_language::laws::SEMANTICS.into(),
            roots: vec![id],
            objects,
        };
        assert!(
            CheckedCatalogue::check(&forged, m.program()).is_err(),
            "accepted false {name}"
        );
    }
}

#[test]
fn database_selection_skips_unobserved_element_computation() {
    let source = r#"module literal_selection;
      fn size(x:u32,y:u32)->u32{return length([x*x+1,y*y+1]);}
      fn first(x:u32,y:u32)->u32{return [x,y*y+1].at_or(0,99);}
      fn first_nonzero(x:u32,y:u32)->u32{return foldr([x,y*y+1],99,fn(item)=>fn(rest)=>if item!=0{item}else{rest});}
      fn cardinality(xs:List<u32>)->u32{return length([sum(xs),sum(xs)]);}
    "#;
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let dir = Path::new("build/literal-selection");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("core.json"), m.bytes().unwrap()).unwrap();
    let output = Command::new("python3")
        .args([
            "planner/plan.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
        ])
        .arg(dir.join("core.json"))
        .args([
            "--snapshot",
            "knowledge/store/snapshot.json",
            "--knowledge-root",
            "knowledge",
            "--budget",
            "4096",
            "--rounds",
            "32",
            "-o",
        ])
        .arg(dir.join("selection.json"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let package: Package =
        serde_json::from_slice(&fs::read(dir.join("selection.json")).unwrap()).unwrap();
    assert!(package.applications.iter().any(|a| a.function == "size"));
    assert!(package.applications.iter().any(|a| a.function == "first"));
    assert!(package
        .applications
        .iter()
        .any(|a| a.function == "first_nonzero"));
    assert!(package
        .applications
        .iter()
        .any(|a| a.function == "cardinality"));
    let selected = optimisation::check(&m, &package).unwrap();
    let subject = optimisation::subject(selected.module()).unwrap();
    assert_eq!(
        subject.functions["size"],
        s::word(verified_language::syntax::Type::U32, 2)
    );
    for x in [0, 1, u32::MAX] {
        for y in [0, 7, u32::MAX] {
            for name in ["size", "first", "first_nonzero"] {
                let args = vec![eval::Value::U32(x), eval::Value::U32(y)];
                assert_eq!(
                    eval::call(m.program(), name, args.clone(), &mut 10000).unwrap(),
                    eval::call(selected.module().program(), name, args, &mut 10000).unwrap()
                );
            }
        }
    }
    let runtime = verified_language::stateful::Runtime::new(m.program().clone()).unwrap();
    let steps = vec![
        serde_json::json!({"pure":"cardinality","args":[[1,2,3,4]]}),
        serde_json::json!({"pure":"first_nonzero","args":[7,99]}),
        serde_json::json!({"pure":"first_nonzero","args":[0,3]}),
    ];
    let expected=steps.iter().map(|step|{let f=m.program().functions.iter().find(|f|f.name==step["pure"].as_str().unwrap()).unwrap();let args=step["args"].as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();serde_json::json!({"reply":{"value":eval::call(m.program(),&f.name,args,&mut 1_000_000).unwrap().json()},"snapshot":runtime.checkpoint_portable().unwrap()})}).collect();
    parity::conformance_selected(
        "literal-database-parity",
        &selected,
        source,
        steps,
        expected,
    );
}
