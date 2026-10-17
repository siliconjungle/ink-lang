use ink_core::{
    action_model::{Projection, ProjectionMode, STRUCTURAL_SEMANTICS},
    core::CheckedModule,
    logic::{Sort, Term},
    optimisation, registry, syntax,
};
use serde_json::json;
use std::collections::BTreeMap;

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()
}
fn c(datatype: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct { datatype: datatype.into(), constructor, arguments }
}
fn data(sort: &Sort) -> &str {
    match sort { Sort::Data(id) => id, _ => panic!("expected data") }
}
fn bundle(objects: BTreeMap<String, registry::Entry>) -> registry::Bundle {
    let entries = objects.keys().cloned().collect::<Vec<_>>();
    assert!(entries.len() <= 64);
    registry::Bundle {
        schema: 1,
        snapshot: registry::Snapshot { schema: 1, semantics: registry::SNAPSHOT_SEMANTICS.into(),
            root: registry::identity(&json!({"schema":1,"entries":entries})).unwrap() },
        roots: entries.clone(),
        membership: entries.iter().map(|id| (id.clone(), registry::Membership {
            entries: entries.clone(), path: vec![],
        })).collect(),
        objects,
    }
}

#[test]
fn unrelated_action_discovery_does_not_rename_unchanged_structural_transitions() {
    let source = "module stable;
record A { x:u32, } record B { y:u32, z:u32, }
fn first(x:u32)->u32 {let a=A{x:x};return a.x;}
fn second(x:u32)->u32 {let b=B{y:x,z:x+1};return b.y+b.z;}
query prepare(x:u32)->u32 {return first(x);}
query untouched(xs:List<u32>)->List<u32> {return xs.map(fn(x)=>x+1);}";
    let a = module(source);
    let b = module(&source.replace("return first(x);", "return second(x);"));
    let original = Projection::derive(&a).unwrap();
    let changed = Projection::derive(&b).unwrap();
    assert_ne!(original.actions["untouched"].function, changed.actions["untouched"].function);
    let aa = Projection::derive_mode(&a, ProjectionMode::StructuralV2).unwrap();
    let bb = Projection::derive_mode(&b, ProjectionMode::StructuralV2).unwrap();
    assert_eq!(aa.semantics, STRUCTURAL_SEMANTICS);
    assert_eq!(aa.actions["untouched"].function, bb.actions["untouched"].function);
    assert_ne!(aa.actions["prepare"].function, bb.actions["prepare"].function);
    assert!(aa.pure_functions.contains_key("first"));
    assert!(bb.pure_functions.contains_key("second"));
    aa.context().unwrap(); bb.context().unwrap();
    assert_eq!(registry::canonical(&original).unwrap(),
        registry::canonical(&Projection::derive_mode(&a, ProjectionMode::Legacy).unwrap()).unwrap());
    assert!(!serde_json::to_value(&original).unwrap().as_object().unwrap().contains_key("pure_functions"));
}

#[test]
fn structural_transitions_preserve_event_order_rollback_and_exhaustion() {
    let source = "module lifecycle; enum Error { Failed, }
state Rows:Table<u64,u64>=Table.empty();event seen:u64;
change erase(key:u64,fail:Bool)->Result<Unit,Error> writes(Rows) emits(seen){
 Rows.remove(key);emit seen(10);emit seen(20);if fail{return Err(Error.Failed);}return Ok(());}";
    let model = Projection::derive_mode(&module(source), ProjectionMode::StructuralV2).unwrap();
    let context = model.context().unwrap();
    let rows = c(&model.tables[0].datatype, 1, vec![Term::U64(7),Term::U64(9),c(&model.tables[0].datatype,0,vec![])]);
    let state = c(&model.state, 0, vec![rows]);
    let action = &model.actions["erase"];
    for (version,fail) in [(3,false),(3,true),(u64::MAX,false)] {
        let reply = context.evaluate(&[], &Term::Call {function:action.function.clone(),
            arguments:vec![state.clone(),Term::U64(version),Term::U64(7),Term::Bool(fail)]}).unwrap();
        let Term::Construct { constructor,arguments,.. } = reply else {panic!()};
        if version == u64::MAX {
            assert_eq!(constructor,1);assert_eq!(arguments,vec![Term::U64(1),Term::U64(version),state.clone()]);
        } else if fail {
            assert_eq!(constructor,0);assert_eq!(arguments[1],Term::Bool(false));
            assert_eq!(arguments[2],Term::U64(version));assert_eq!(arguments[3],state);
            assert_eq!(arguments[4],c(&model.events,0,vec![]));
        } else {
            assert_eq!(constructor,0);assert_eq!(arguments[1],Term::Bool(true));
            assert_eq!(arguments[2],Term::U64(4));
            assert_eq!(arguments[3],c(&model.state,0,vec![c(&model.tables[0].datatype,0,vec![])]));
            let Term::Construct {arguments:events,..} = &arguments[4] else {panic!()};
            let Term::Construct {arguments:first,..} = &events[0] else {panic!()};
            assert_eq!(first, &vec![Term::U64(10)]);
            let Term::Construct {arguments:tail,..} = &events[1] else {panic!()};
            let Term::Construct {arguments:second,..} = &tail[0] else {panic!()};
            assert_eq!(second, &vec![Term::U64(20)]);
            assert_eq!(tail[1],c(&model.events,0,vec![]));
        }
    }
    assert!(matches!(action.result,Sort::Data(_)));assert!(!data(&action.result).is_empty());
}

#[test]
fn versioned_replacement_replays_definitions_and_rejects_mode_or_source_substitution() {
    let a = module("module replay;query read(x:u32)->u32{let y=x;return y;}");
    let b = module("module replay;query read(x:u32)->u32{return x;}");
    let before = Projection::derive_mode(&a,ProjectionMode::StructuralV2).unwrap();
    let after = Projection::derive_mode(&b,ProjectionMode::StructuralV2).unwrap();
    let mut objects=before.objects.clone();objects.extend(after.objects.clone());
    let args = before.actions["read"].params.iter().map(|(name,_)|Term::Var(name.clone())).collect::<Vec<_>>();
    let packet = json!({"schema":1,"semantics":"ink-evidence-v1","input_core_sha256":a.identity().unwrap(),
        "knowledge":bundle(objects),"applications":[],"action_replacement":{
            "selected":serde_json::from_slice::<serde_json::Value>(&b.bytes().unwrap()).unwrap(),
            "projection":"structural-v2","proofs":{"read":{"Convert":{
                "from":Term::Call{function:before.actions["read"].function.clone(),arguments:args.clone()},
                "to":Term::Call{function:after.actions["read"].function.clone(),arguments:args}}}}}});
    let request:optimisation::Package=serde_json::from_value(packet.clone()).unwrap();
    assert_eq!(optimisation::check(&a,&request).unwrap().module().identity().unwrap(),b.identity().unwrap());
    let mut bad=packet.clone();bad["action_replacement"]["projection"]=json!("legacy");
    assert!(optimisation::check(&a,&serde_json::from_value(bad).unwrap()).is_err());
    let mut bad=packet.clone();bad["action_replacement"]["projection"]=json!("future");
    assert!(serde_json::from_value::<optimisation::Package>(bad).is_err());
    let mut bad=packet;bad["action_replacement"]["selected"]=serde_json::from_slice(&module("module replay;query read(x:u32)->u32{return 7;}").bytes().unwrap()).unwrap();
    assert!(optimisation::check(&a,&serde_json::from_value(bad).unwrap()).is_err());
}

#[test]
fn source_plan_transport_preserves_frozen_float_rows_without_relaxing_knowledge() {
    use ink_core::planning;
    let freeze = |source: &str| {
        let mut value: serde_json::Value=serde_json::from_slice(&module(source).bytes().unwrap()).unwrap();
        value["semantics"]=json!("ink-executable-core-v14");
        value["program"]["frozen"]=json!({"Fixed":[[0,0.1],[1,-0.0],[2,{"F32Bits":2141196852u32}]]});
        CheckedModule::from_bytes(&serde_json::to_vec(&value).unwrap()).unwrap()
    };
    let a=freeze("module transport;state Fixed:Table<u64,f32>=Table.empty();query read(x:f32)->f32{let y=x;return y;}");
    let b=freeze("module transport;state Fixed:Table<u64,f32>=Table.empty();query read(x:f32)->f32{return x;}");
    let before=Projection::derive_mode(&a,ProjectionMode::StructuralV2).unwrap();
    let after=Projection::derive_mode(&b,ProjectionMode::StructuralV2).unwrap();
    let mut objects=before.objects.clone();objects.extend(after.objects.clone());
    let args=before.actions["read"].params.iter().map(|(name,_)|Term::Var(name.clone())).collect::<Vec<_>>();
    let request=json!({"schema":1,"semantics":"ink-evidence-v1","input_core_sha256":a.identity().unwrap(),
        "knowledge":bundle(objects),"applications":[],"action_replacement":{
            "selected":serde_json::from_slice::<serde_json::Value>(&b.bytes().unwrap()).unwrap(),
            "projection":"structural-v2","proofs":{"read":{"Convert":{
                "from":Term::Call{function:before.actions["read"].function.clone(),arguments:args.clone()},
                "to":Term::Call{function:after.actions["read"].function.clone(),arguments:args}}}}}});
    let packet:planning::Package=serde_json::from_value(json!({"schema":1,"semantics":planning::SEMANTICS,
        "input_core_sha256":a.identity().unwrap(),"steps":[{"kind":"rewrite","package":request}]})).unwrap();
    assert!(registry::canonical(&packet).is_err());
    let wire=planning::canonical(&packet).unwrap();
    let decoded:planning::Package=serde_json::from_slice(&wire).unwrap();
    assert_eq!(planning::identity(&packet).unwrap(),planning::identity(&decoded).unwrap());
    let mut checker=planning::Checker::new(a.clone());
    let checked=checker.check(&decoded).unwrap();checker.check(&decoded).unwrap();
    assert_eq!(checker.reused_steps(),1);
    assert_eq!(checked.original().identity().unwrap(),a.identity().unwrap());
    assert_eq!(checked.module().identity().unwrap(),b.identity().unwrap());
    assert_eq!(serde_json::to_vec(&checked.module().program().frozen).unwrap(),serde_json::to_vec(&a.program().frozen).unwrap());
    // A complete plan may transport source floats; mathematical objects still
    // reject them before hashing, typing or equality can grant authority.
    let mut bad=serde_json::to_value(&packet).unwrap();
    let objects=bad["steps"][0]["package"]["knowledge"]["objects"].as_object_mut().unwrap();
    objects.values_mut().next().unwrap()["payload"]["untrusted_float"]=json!(0.5);
    let bad:planning::Package=serde_json::from_value(bad).unwrap();
    assert!(planning::canonical(&bad).is_ok());
    assert!(planning::check(&a,&bad).unwrap_err().contains("canonical knowledge forbids floating"));
    let legacy=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:a.identity().unwrap(),steps:vec![]};
    assert_eq!(planning::canonical(&legacy).unwrap(),registry::canonical(&legacy).unwrap());
    assert_eq!(planning::identity(&legacy).unwrap(),registry::identity(&legacy).unwrap());
}

#[test]
fn structural_large_helpers_keep_lexical_captures_and_raw_float_results() {
    let mut source=String::from("module captures;fn deep(x:f32,y:f32,flag:Bool)->f32{let v0=x;");
    for i in 0..24 {source+=&format!("let v{}=choose(flag,v{i}+y,v{i}*y);",i+1);}
    source+="return v24;}query read(x:f32,y:f32,flag:Bool)->f32{return deep(x,y,flag);}";
    let checked=module(&source);
    let projection=Projection::derive_mode(&checked,ProjectionMode::StructuralV2).unwrap();
    let context=projection.context().unwrap();
    let state=c(&projection.state,0,vec![]);
    for (x,y) in [(0,0x80000000),(1,0x3f800001),(0x7fa01234,0xbf800000),(0x7f800000,0)] {
        for flag in [false,true] {
            let expected=ink_core::eval::call(checked.program(),"deep",vec![
                ink_core::eval::Value::F32(x),ink_core::eval::Value::F32(y),
                ink_core::eval::Value::Bool(flag)],&mut 1_000_000).unwrap();
            let ink_core::eval::Value::F32(bits)=expected else {panic!()};
            let actual=context.evaluate(&[],&Term::Call {function:projection.actions["read"].function.clone(),
                arguments:vec![state.clone(),Term::U64(0),Term::U64(x as u64),Term::U64(y as u64),Term::Bool(flag)]}).unwrap();
            let Term::Construct{arguments,..}=actual else {panic!()};
            assert_eq!(arguments[0],Term::U64(bits as u64));
        }
    }
}
