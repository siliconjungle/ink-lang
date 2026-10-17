use ink_core::{analysis::function_dependencies, core::{CheckedModule, Expr, Type}, syntax};
use std::collections::BTreeSet;

fn names(values: &[&str]) -> BTreeSet<String> {
    values.iter().map(|s| (*s).to_owned()).collect()
}
fn program(source: &str) -> ink_core::core::Program {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap().program().clone()
}

#[test]
fn dependencies_follow_calls_signatures_constructors_and_owned_children() {
    let p = program(r#"module Dependencies;
record Item{value:u32,}
record Work{items:Buffer<Item>,}
record Local{value:u32,}
record Unused{other:List<f64>,}
fn leaf(work:Work)->Work{return work;}
fn middle(work:Work)->Work{return leaf(work);}
fn root(work:Work)->Work{let local=Local{value:7};return middle(work);}
fn unrelated(x:Unused)->Unused{return x;}
"#);
    let original = serde_json::to_value(&p).unwrap();
    let d = function_dependencies(&p, "root", 100000).unwrap();
    assert_eq!(d.functions, names(&["root", "middle", "leaf"]));
    assert_eq!(d.named_types, names(&["Work", "Item", "Local"]));
    assert_eq!(serde_json::to_value(&p).unwrap(), original);
}

#[test]
fn enum_dependencies_respect_parameters_callbacks_and_initializer_scope() {
    let p = program(r#"module LexicalTypes;
enum Mode{A,B,}
record Value{A:u32,}
fn parameter(Mode:Value)->u32{return Mode.A;}
fn callback(xs:List<Value>)->List<u32>{return xs.map(fn(Mode)=>Mode.A);}
fn initialized()->Bool{let Mode:Bool=Mode.A==Mode.B;return Mode;}
fn nested(Mode:Bool)->Bool{let answer=repeat(2,Mode,fn(i)=>fn(Mode)=>Mode);return answer;}
"#);
    for root in ["parameter", "callback"] {
        assert_eq!(function_dependencies(&p, root, 100000).unwrap().named_types, names(&["Value"]));
    }
    assert_eq!(function_dependencies(&p, "initialized", 100000).unwrap().named_types, names(&["Mode"]));
    assert!(function_dependencies(&p, "nested", 100000).unwrap().named_types.is_empty());
}

#[test]
fn record_names_do_not_capture_unrelated_lexical_field_receivers() {
    let p = program(r#"module RecordShadow;
record Alias{items:List<f64>,}
record Point{x:u32,}
fn value(Alias:Point)->u32{return Alias.x;}
fn local(x:u32)->u32{let Alias=Point{x:x};return Alias.x;}
"#);
    for root in ["value", "local"] {
        assert_eq!(function_dependencies(&p, root, 100000).unwrap().named_types, names(&["Point"]));
    }
}

#[test]
fn local_type_annotations_and_recursive_carriers_remain_reachable() {
    let p = program(r#"module AnnotationTypes;
record Item{value:u32,}
record Other{value:f64,}
fn empty()->u32{let values:List<Item>=[];return length(values);}
"#);
    assert_eq!(function_dependencies(&p, "empty", 100000).unwrap().named_types, names(&["Item"]));
    // Analysis reports dependency cycles without admitting recursive execution.
    let mut raw = p.clone();
    raw.records.insert("Recursive".into(), vec![("next".into(), Type::Option(Box::new(Type::Named("Recursive".into()))))]);
    raw.functions[0].params = vec![("x".into(), Type::Named("Recursive".into()))];
    assert_eq!(function_dependencies(&raw, "empty", 100000).unwrap().named_types, names(&["Item", "Recursive"]));
}

#[test]
fn call_cycles_terminate_and_work_exhaustion_never_returns_partial_results() {
    let mut p = program("module Cycles;fn a(x:u32)->u32{return x;}fn b(x:u32)->u32{return x;}");
    p.functions[0].body = Expr::Call("b".into(), vec![Expr::Var("x".into())]);
    p.functions[1].body = Expr::Call("a".into(), vec![Expr::Var("x".into())]);
    assert_eq!(function_dependencies(&p, "a", 100000).unwrap().functions, names(&["a", "b"]));
    for limit in [0, 1, 3] {
        assert!(function_dependencies(&p, "a", limit).unwrap_err().contains("budget"));
    }
    assert!(function_dependencies(&p, "missing", 100000).unwrap_err().contains("root"));
}

#[test]
fn changed_source_is_recomputed_and_missing_named_types_fail_closed() {
    let mut p = program(r#"module FreshDependencies;
record First{x:u32,}record Second{x:u32,}
fn leaf()->u32{let local=First{x:7};return local.x;}
fn root()->u32{return leaf();}
"#);
    assert_eq!(function_dependencies(&p, "root", 100000).unwrap().named_types, names(&["First"]));
    let leaf = &mut p.functions[0];
    let Expr::Let(_, _, initial, _) = &mut leaf.body else { panic!("source let"); };
    let Expr::Record(name, _) = initial.as_mut() else { panic!("source record"); };
    *name = "Second".into();
    assert_eq!(function_dependencies(&p, "root", 100000).unwrap().named_types, names(&["Second"]));
    p.records.remove("Second");
    assert!(function_dependencies(&p, "root", 100000).unwrap_err().contains("unknown named type"));
}
