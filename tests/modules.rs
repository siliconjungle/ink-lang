use serde_json::{json, Value};
use std::{fs, path::Path};
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn imported_callback_parameters_shadow_same_named_helpers() {
    let dir=Path::new("build/module-callback-shadowing");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("library.ink"),"module shadowing_library;
      fn unique(x:u32)->Bool{return true;}
      fn apply(x:u32,unique:fn(u32)->Bool)->Bool{return unique(x);}").unwrap();
    fs::write(dir.join("main.ink"),"module shadowing_root;
      import \"library.ink\" as helper;
      fn run(x:u32)->Bool{return helper.apply(x,fn(n)=>n==7);}").unwrap();
    let p=modules::load(dir.join("main.ink")).unwrap().program;
    CheckedModule::from_source(p.clone()).unwrap();
    for (input,want) in [(7,true),(8,false)] {
      assert_eq!(eval::call(&p,"run",vec![eval::Value::U32(input)],&mut 10_000).unwrap(),eval::Value::Bool(want));
    }
}
#[test]
fn imported_generic_templates_and_aliases_are_linked_before_elaboration() {
    let dir = Path::new("build/generic-modules");
    fs::create_dir_all(dir).unwrap();
    fs::write(
        dir.join("helpers.ink"),
        r#"module helpers;
      type Sequence<T>=List<T>;record Pair<T>{left:T,right:T,}
      enum Message<T>{Empty,Value(T),}
      fn apply<T>(x:T,f:fn(T)->T)->T{return f(x);}
      fn size<T,const N:u32>(xs:Array<T,N>)->u32{return N;}
      fn message()->Message<u32>{return Message<u32>.Value(7);}
      fn id<T>(x:T)->T{return x;}
      fn pair<T>(x:T)->Pair<T>{return Pair<T>{left:id<T>(x),right:x};}
    "#,
    )
    .unwrap();
    fs::write(
        dir.join("main.ink"),
        r#"module root;import "helpers.ink" as helpers;
      type Values=helpers.Sequence<u32>;
      fn make(x:u32)->helpers.Pair<u32>{return helpers.pair<u32>(x);}
      type Message=helpers.Message<u32>;
      fn checked_imports()->u32{let m=helpers.message();let v=match m{helpers.Message.Empty=>0,helpers.Message.Value(v)=>v,};return helpers.apply<u32>(v,fn(x)=>x+helpers.size<u32,2>(array<u32,2>([1,2])));}
      fn first(xs:Values)->u32{return helpers.id<u32>(xs.at_or(0,0));}
    "#,
    )
    .unwrap();
    let loaded = modules::load(dir.join("main.ink")).unwrap();
    let p = loaded.program;
    CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(
        eval::call(&p, "checked_imports", vec![], &mut 10000)
            .unwrap()
            .json(),
        json!(9)
    );
    assert_eq!(
        eval::call(&p, "make", vec![eval::Value::U32(7)], &mut 1000)
            .unwrap()
            .json(),
        json!({"left":7,"right":7})
    );
    assert_eq!(
        eval::call(
            &p,
            "first",
            vec![eval::Value::List(vec![eval::Value::U32(8)])],
            &mut 1000
        )
        .unwrap()
        .json(),
        json!(8)
    );
}
#[test]
fn imported_function_type_failure_identifies_its_original_declaration() {
    let dir = Path::new("build/module-type-diagnostic");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("main.ink"), "module entry; import \"helpers.ink\" as helpers; fn root(x:u32)->Bool{return helpers.bad(x);}").unwrap();
    fs::write(dir.join("helpers.ink"), "module helpers;\n// λ source locations count characters\nfn bad(x:u32)->Bool{return x+1;}\n").unwrap();
    let error = modules::load(dir.join("main.ink")).err().unwrap();
    assert!(error.contains("helpers.ink:3:1:"), "{error}");
    assert!(error.contains("fn bad(x:u32)->Bool"), "{error}");
    assert!(!error.contains("ink_m"), "{error}");
    fs::write(
        dir.join("helpers.ink"),
        "module helpers; fn bad(x:u32)->Bool{return x>0;}",
    )
    .unwrap();
    let program = modules::load(dir.join("main.ink")).unwrap().program;
    assert_eq!(
        eval::call(&program, "root", vec![eval::Value::U32(2)], &mut 1000)
            .unwrap()
            .json(),
        json!(true)
    );
}
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

#[test]
fn embedded_bit_automata_module_captures_its_source_and_checks_literals() {
    let loaded=verified_language::modules::load("examples/bit-automata.ink").unwrap();
    assert!(loaded.files.iter().any(|file|file.path.to_string_lossy()=="std:bit_automata"&&file.source==include_str!("../knowledge/libraries/bit_automata.ink")));
    let function=loaded.program.functions.iter().find(|f|f.name=="compile_literal").unwrap();
    let value=verified_language::eval::Value::from_program_json(&serde_json::json!([1,2,1]),&function.params[0].1,&loaded.program).unwrap();
    let result=verified_language::eval::call(&loaded.program,"compile_literal",vec![value],&mut 1_000_000).unwrap().json();
    let mut masks=vec![0u32;256];masks[1]=5;masks[2]=2;
    assert_eq!(result,serde_json::json!({"Some":{"masks":masks,"accept":4,"width":3}}));
}

#[test]
fn imported_record_spread_initializer_keeps_qualified_function_scope() {
    let dir=Path::new("build/module-spread-import");fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("library.ink"),"module lib;record R{x:u32,y:u32,}fn make()->R{return R{x:3,y:4};}").unwrap();
    fs::write(dir.join("main.ink"),r#"module main;import "library.ink" as lib;
      fn run()->u32{let r=lib.R{..lib.make(),y:9};return r.x+r.y;}"#).unwrap();
    let p=modules::load(dir.join("main.ink")).unwrap().program;CheckedModule::from_source(p.clone()).unwrap();
    assert_eq!(eval::call(&p,"run",vec![],&mut 10000).unwrap(),eval::Value::U32(12));
}
