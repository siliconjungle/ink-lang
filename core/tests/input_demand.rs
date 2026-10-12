use ink_core::{core::CheckedModule, input_demand, syntax};
use std::collections::BTreeSet;
fn demand(body: &str) -> Vec<Option<BTreeSet<String>>> {
    let source=format!("module Demand; record Row{{key:u32,value:f32,flag:Bool,}} pub fn helper(xs:List<Row>)->u32{{return length(xs);}} pub fn run(xs:List<Row>,r:Row,cut:u32)->u32{{return {body};}}");
    let m = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let f = m
        .program()
        .functions
        .iter()
        .find(|f| f.name == "run")
        .unwrap();
    input_demand::fields(f, m.program())
}
fn set(xs: &[&str]) -> Option<BTreeSet<String>> {
    Some(xs.iter().map(|x| (*x).into()).collect())
}
#[test]
fn demanded_fields_follow_bindings_callbacks_and_whole_observations() {
    for body in [
        "foldr(xs.filter(fn(x)=>x.flag).map(fn(x)=>x.key),cut,fn(x)=>fn(acc)=>x+acc)",
        "foldl(xs,cut,fn(x)=>fn(acc)=>choose(x.flag,x.key+acc,acc))",
    ] {
        let d = demand(body);
        assert_eq!(d[0], set(&["flag", "key"]));
        assert_eq!(d[1], set(&[]));
    }
    assert_eq!(demand("length(xs.map(fn(x)=>x.value))")[0], set(&["value"]));
    assert_eq!(demand("length(xs)")[0], set(&[]));
    assert_eq!(demand("r.key")[1], set(&["key"]));
    assert_eq!(demand("choose(xs==xs,1,0)")[0], None);
    assert_eq!(demand("helper(xs)")[0], None);
    assert_eq!(demand("length(xs.filter(fn(r)=>r.key>cut))")[1], set(&[]));
}
#[test]
fn escaping_records_accumulators_nested_values_and_unknown_operations_stay_complete() {
    let source = r#"module Escapes;
record Row{key:u32,value:f32,flag:Bool,}
pub fn id(xs:List<Row>)->List<Row>{return xs.filter(fn(x)=>x.flag);}
pub fn map_id(xs:List<Row>)->List<Row>{return xs.map(fn(x)=>x);}
pub fn choose_row(xs:List<Row>,r:Row)->Row{return foldr(xs,r,fn(x)=>fn(acc)=>choose(x.flag,x,acc));}
pub fn nested(xs:List<Row>)->List<List<Row>>{return xs.map(fn(x)=>list(x));}
pub fn aliases(xs:List<Row>,ys:List<Row>)->u32{return length(xs.concat(ys).filter(fn(x)=>x.key>0));}
pub fn shadow(xs:List<Row>)->u32{let alias=xs;let xs=list(Row{key:0,value:0.0,flag:false});return length(alias.filter(fn(x)=>x.key>0))+length(xs);}
pub fn sliced(xs:List<Row>)->u32{return length(xs.take(3).drop(1).filter(fn(x)=>x.flag));}
pub fn zipped(xs:List<Row>,ys:List<Row>)->List<u32>{return xs.zip(ys,fn(x)=>fn(y)=>x.key+y.key);}
"#;
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    for f in &m.program().functions {
        let d = input_demand::fields(f, m.program());
        match f.name.as_str() {
            "aliases" | "zipped" | "shadow" => assert!(d.iter().all(|x| *x == set(&["key"]))),
            "sliced" => assert_eq!(d[0], set(&["flag"])),
            _ => assert!(d.iter().all(Option::is_none)),
        }
    }
}
