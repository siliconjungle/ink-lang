use ink_core::{
    core::{CheckedModule, MEASURE_SEMANTICS},
    syntax, termination,
};
use serde_json::{json, Value};

const CORE: &[u8] = include_bytes!("fixtures/authored-measures-core.json");
fn image() -> Value {
    serde_json::from_slice(CORE).unwrap()
}
fn rejects(v: Value) {
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&v).unwrap()).is_err());
}

#[test]
fn authored_measures_replay_independently_of_catalogue_and_reject_downgrades() {
    let checked = CheckedModule::from_bytes(CORE).unwrap();
    assert_eq!(checked.semantics(), MEASURE_SEMANTICS);
    assert_eq!(
        termination::obligations(checked.program()).unwrap().len(),
        5
    );
    assert_eq!(
        CheckedModule::from_bytes(&checked.bytes().unwrap())
            .unwrap()
            .identity()
            .unwrap(),
        checked.identity().unwrap()
    );
    let mut v = image();
    v["semantics"] = json!("ink-executable-core-v5");
    rejects(v);
}
#[test]
fn incomplete_duplicate_and_stale_termination_certificates_never_admit() {
    let mut v = image();
    v["program"]["termination"]["knowledge"] = Value::Null;
    rejects(v);
    let mut v = image();
    v["program"]["termination"]["knowledge"]["roots"]
        .as_array_mut()
        .unwrap()
        .pop();
    rejects(v);
    let mut v = image();
    let roots = v["program"]["termination"]["knowledge"]["roots"]
        .as_array_mut()
        .unwrap();
    roots.push(roots[0].clone());
    rejects(v);
    let mut v = image();
    v["program"]["module"] = json!("different_source");
    rejects(v);
    let mut v = image();
    let measure = v["program"]["termination"]["measures"]
        .as_object_mut()
        .unwrap()
        .values_mut()
        .next()
        .unwrap();
    *measure = json!({"Num":0});
    rejects(v);
}
#[test]
fn source_annotation_and_authoring_typecheck_grant_no_admission() {
    let p = syntax::parse(
        "module raw;fn f(n:u32,d:u32)->u32 decreases n;{if d>0&&n>=d{return f(n-d,d)+1;}return 0;}",
    )
    .unwrap();
    ink_core::check::check_termination_source(&p).unwrap();
    assert!(CheckedModule::from_source(p)
        .unwrap_err()
        .contains("require checked evidence"));
}
#[test]
fn recursive_measures_nonword_measures_and_unvisited_calls_reject() {
    for (source,error) in [
        ("fn f(n:u32)->u32 decreases f(n);{if n>0{return f(n-1);}return 0;}","recursive execution"),
        ("fn f(n:u32)->u32 decreases n>0;{if n>0{return f(n-1);}return 0;}","unsigned word"),
        ("fn f(xs:List<u32>)->u32 decreases length(xs);{return foldl(xs,0,fn(n)=>fn(acc)=>f(list(n)));}","coverage of every recursive call"),
        ("fn f(n:u32)->u32 decreases n;{return n;}","coverage of every recursive call"),
    ] {
        let p=syntax::parse(&format!("module raw;{source}")).unwrap();
        let e=termination::obligations(&p).unwrap_err();
        assert!(e.contains(error),"{e}");
    }
}
