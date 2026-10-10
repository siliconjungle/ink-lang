use serde_json::{json, Value};
use std::{fs, path::Path};
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn imports_types_state_events_and_standard_helpers_lower_identically() {
    let loaded = modules::load("examples/modules/main.ink").unwrap();
    assert_eq!(loaded.files.len(), 4);
    let first = CheckedModule::from_source(loaded.program.clone())
        .unwrap()
        .identity()
        .unwrap();
    assert_eq!(
        first,
        CheckedModule::from_source(modules::load("examples/modules/main.ink").unwrap().program)
            .unwrap()
            .identity()
            .unwrap()
    );
    let p = loaded.program;
    let mut state = Runtime::new(p.clone()).unwrap();
    let id = format!("{:032x}", 1);
    let steps = vec![
        json!({"call":"put","args":[id,137]}),
        json!({"call":"get","args":[id]}),
        json!({"pure":"prefixes","args":[[1,u32::MAX,2]],"expect_gpu":true}),
        json!({"pure":"clamp","args":[u32::MAX]}),
        json!({"call":"put","args":[id,3]}),
        json!({"call":"get","args":[id]}),
    ];
    let expected:Vec<Value>=steps.iter().map(|step|{
  let reply=if let Some(name)=step["pure"].as_str(){let f=p.functions.iter().find(|f|f.name==name).unwrap();let inputs=step["args"].as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();json!({"value":eval::call(&p,name,inputs,&mut 1000000).unwrap().json()})}else{json!({"outcome":state.invoke_json(step["call"].as_str().unwrap(),&step["args"]).unwrap().json()})};json!({"reply":reply,"snapshot":state.checkpoint_portable().unwrap()})
 }).collect();
    parity::conformance(
        "modules-parity",
        p,
        &fs::read_to_string("examples/modules/main.ink").unwrap(),
        steps,
        expected,
    );
}
#[test]
fn linking_preserves_fields_and_shadowed_local_values() {
    let dir = Path::new("build/module-shadowing");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("library.ink"),"module lib; record Point{x:u32,} fn x(x:u32)->u32{return x+1;} fn point(p:Point)->u32{return p.x;} fn nested(x:u32)->u32{let x:u32=x+1;return x*2;}").unwrap();
    fs::write(dir.join("main.ink"),"module main; import \"library.ink\" as lib; fn answer(x:u32)->u32{return lib.x(x)+lib.point(lib.Point{x:2})+lib.nested(x);}").unwrap();
    let loaded = modules::load(dir.join("main.ink")).unwrap();
    let value = eval::call(
        &loaded.program,
        "answer",
        vec![eval::Value::U32(3)],
        &mut 10000,
    )
    .unwrap()
    .json();
    assert_eq!(value, json!(14));
    fs::write(dir.join("main.ink"), "module shop.main; /* lib.absent record bogus */ import \"library.ink\" as lib; record Wrapped{lib:lib.Point,} fn field(w:Wrapped)->u32{return w.lib.x;}").unwrap();
    let loaded = modules::load(dir.join("main.ink")).unwrap();
    CheckedModule::from_source(loaded.program.clone()).unwrap();
    let field = loaded
        .program
        .functions
        .iter()
        .find(|f| f.name == "field")
        .unwrap();
    let argument = eval::Value::from_program_json(
        &json!({"lib":{"x":9}}),
        &field.params[0].1,
        &loaded.program,
    )
    .unwrap();
    assert_eq!(
        eval::call(&loaded.program, "field", vec![argument], &mut 1000)
            .unwrap()
            .json(),
        json!(9)
    );
    let identity = CheckedModule::from_source(loaded.program)
        .unwrap()
        .identity()
        .unwrap();
    let source = fs::read_to_string(dir.join("main.ink"))
        .unwrap()
        .replace("as lib;", "as library;")
        .replace("lib.Point", "library.Point");
    fs::write(dir.join("main.ink"), source).unwrap();
    assert_eq!(
        identity,
        CheckedModule::from_source(modules::load(dir.join("main.ink")).unwrap().program)
            .unwrap()
            .identity()
            .unwrap()
    );
    fs::write(dir.join("main.ink"),"module main; import \"library.ink\" as lib;\nfn broken(p:lib.Point)->u32{ return p.x + ; }").unwrap();
    let error = modules::load(dir.join("main.ink")).err().unwrap();
    assert!(error.contains("main.ink:2:"), "{error}");
}
#[test]
fn imports_reject_cycles_unknown_exports_namespaces_and_module_collisions() {
    let parsed = verified_language::syntax::parse_with_record_names(
        "module Test; fn fake()->UnknownRecord{return UnknownRecord{};}",
        ["UnknownRecord".to_string()],
    )
    .unwrap();
    assert!(
        CheckedModule::from_source(parsed).is_err(),
        "recognizing a constructor must not grant a type"
    );
    let dir = Path::new("build/module-invalid");
    fs::create_dir_all(dir).unwrap();
    fs::write(
        dir.join("a.ink"),
        "module a; import \"b.ink\" as b; fn x(x:u32)->u32{return x;}",
    )
    .unwrap();
    fs::write(
        dir.join("b.ink"),
        "module b; import \"a.ink\" as a; fn y(x:u32)->u32{return x;}",
    )
    .unwrap();
    assert!(modules::load(dir.join("a.ink"))
        .err()
        .unwrap()
        .contains("cycle"));
    fs::write(dir.join("b.ink"), "module b; fn y(x:u32)->u32{return x;}").unwrap();
    for (source, message) in [
        (
            "module a; import \"b.ink\" as b; fn x(x:u32)->u32{return b.absent(x);}",
            "has no declaration",
        ),
        (
            "module a; import \"b.ink\" as b; fn x(b:u32)->u32{return b;}",
            "shadows an import",
        ),
        (
            "module a; import \"b.ink\" as b; fn b(x:u32)->u32{return x;}",
            "conflicts",
        ),
        (
            "module a; import \"b.ink\"; fn x(x:u32)->u32{return x;}",
            "explicit namespace",
        ),
    ] {
        fs::write(dir.join("a.ink"), source).unwrap();
        assert!(
            modules::load(dir.join("a.ink"))
                .err()
                .unwrap()
                .contains(message),
            "{message}"
        );
    }
    fs::write(
        dir.join("a.ink"),
        "module a; import \"b.ink\" as b; fn x(x:u32)->u32{return x;}",
    )
    .unwrap();
    fs::write(dir.join("b.ink"), "module a; fn y(x:u32)->u32{return x;}").unwrap();
    assert!(modules::load(dir.join("a.ink"))
        .err()
        .unwrap()
        .contains("declared by both"));
}
