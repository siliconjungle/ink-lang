use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn general_control_and_owned_operations_preserve_cross_target_values() {
    let source = r#"module universal;
state Mark:Table<u64,u32> =Table.empty();
fn until(xs:List<u32>,z:u32,k:u32)->u32{return fold_until(xs,z,fn(x)=>fn(a)=>x>=k,fn(x)=>fn(a)=>choose(x>=k,x,a));}
fn mixed(xs:List<u32>,z:String,k:u32)->String{return fold_until(xs,z,fn(x)=>fn(a)=>x>=k,fn(x)=>fn(a)=>choose(x>=k,"found",a));}
fn original(xs:List<u32>,z:u32,k:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>=k,x,a));}
fn owned(xs:List<u32>)->List<u32>{return buffer(xs).map(fn(x)=>x+1).map_indexed(fn(i)=>fn(x)=>x+i).scan().freeze();}
fn signed(xs:List<i32>)->List<i32>{return buffer(xs).map(fn(x)=>x+1).scan().freeze();}
fn wide(xs:List<u64>)->List<u64>{return buffer(xs).map_indexed(fn(i)=>fn(x)=>x+1).scan().freeze();}
fn float_scan(xs:List<f32>)->List<f32>{return buffer(xs).map(fn(x)=>x).scan().freeze();}
fn float_first(xs:List<f32>,z:f32)->f32{return fold_until(xs,z,fn(x)=>fn(a)=>x!=x,fn(x)=>fn(a)=>choose(x!=x,x,a));}
fn compact(xs:List<u32>)->List<u32>{return buffer(xs).filter(fn(x)=>x>2).map(fn(x)=>x+1).freeze();}
"#;
    let p = parse(source).unwrap();
    let snapshot = Runtime::new(p.clone())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let rows: Vec<(&str, Value)> = vec![
        ("until", json!([[1, 9, 3], 7, 4])),
        ("until", json!([[], 7, 4])),
        ("until", json!([[1, 2, 3], 7, 4])),
        ("mixed", json!([[1, 9, 3], "absent", 4])),
        ("mixed", json!([[], "absent", 4])),
        ("original", json!([[1, 9, 3], 7, 4])),
        ("owned", json!([[u32::MAX, 1, 3]])),
        ("owned", json!([[]])),
        ("signed", json!([[i32::MAX, -2, -1]])),
        ("wide", json!([[u64::MAX, 9007199254740993u64]])),
        ("float_scan", json!([[16777216.0, 1.0, -16777216.0, -0.0]])),
        (
            "float_first",
            json!([[{"F32Bits":2143363909u32},0.0],{"F32Bits":2143289345u32}]),
        ),
        ("compact", json!([[0, 9, 2, 4]])),
        ("compact", json!([[]])),
    ];
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in rows {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let inputs = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let value = eval::call(&p, name, inputs, &mut 1_000_000).unwrap().json();
        steps.push(json!({"pure":name,"args":args,"expect_gpu":name=="until"}));
        expected.push(json!({"reply":{"value":value},"snapshot":snapshot}));
    }
    parity::conformance("universal-control", p, source, steps, expected);
}
