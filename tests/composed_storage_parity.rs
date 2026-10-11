//! Every changed storage path is compared with reference values and snapshots.
//! GPU arithmetic floats retain their existing WGSL contract; CPU-only rows
//! below assert raw F32 bits on all five CPU paths rather than assuming GPU bits.
use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = r#"module ComposedStorage40;
enum Error{Failed,}
state Marker:Table<u32,u32> =Table.empty();
change put(k:u32,v:u32)->Result<Unit,Error> writes(Marker){if Marker.contains(k){Marker.replace(k,v);}else{Marker.insert(k,v);}return Ok(());}
query joined()->List<u32> reads(Marker){return Marker.values();}
record Row{label:String,value:Int,}
fn make(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+1);}
fn keep(x:u32,t:u32)->Bool{return x>t;}
fn compact(xs:List<u32>,t:u32)->List<u32>{return make(xs).filter(fn(x)=>keep(x,t));}
fn chain(xs:List<u32>,t:u32)->List<u32>{return compact(xs,t).map_indexed(fn(i)=>fn(x)=>x+i).scan();}
fn shared(xs:List<u32>,t:u32)->List<u32>{let a=make(xs);return a.filter(fn(x)=>keep(x,t)).concat(a);}
fn captured(xs:List<u32>)->List<u32>{return make(xs).filter(fn(x)=>xs.at_or(x,0)>0);}
fn branches(xs:List<u32>,t:u32,b:Bool)->List<u32>{return choose(b,make(xs),xs.map(fn(x)=>x*3)).filter(fn(x)=>keep(x,t));}
fn zip(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.zip(ys,fn(x)=>fn(y)=>x+y);}
fn ordered(xs:List<u32>)->u32{return foldr(xs,0,fn(x)=>fn(a)=>x-a);}
fn total(xs:List<u32>)->u32{return sum(xs);}
fn count_all(xs:List<u32>)->u64{return count(xs);}
fn lexical(xs:List<u32>)->List<u32>{let a=make(xs);let b=a.map(fn(x)=>x*2);return b.concat(a);}
fn signed(xs:List<i32>)->List<i32>{return xs.map(fn(x)=>x+1).filter(fn(x)=>x<0).scan();}
fn wide(xs:List<u64>)->List<u64>{return xs.map(fn(x)=>x+1).filter(fn(x)=>x>0).scan();}
fn flags(xs:List<Bool>)->List<Bool>{return xs.map(fn(x)=>choose(x,false,true)).filter(fn(x)=>x);}
fn vectors(xs:List<Vec2<u32>>)->List<Vec2<u32>>{return xs.map(fn(x)=>vec2(x.x+1,x.y*3)).filter(fn(x)=>x.x>0);}
fn float_bits(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x).filter(fn(x)=>x==x);}
fn float_chain(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x+0.0).filter(fn(x)=>x>0.0).map(fn(x)=>x*0.5);}
fn join_strings(xs:List<String>,ys:List<String>)->List<String>{let a=xs;return a.concat(ys);}
fn join_ints(xs:List<Int>,ys:List<Int>)->List<Int>{return xs.concat(ys);}
fn join_records(xs:List<Row>,ys:List<Row>)->List<Row>{let a=xs;return a.concat(ys);}
fn join_nested(xs:List<List<u32>>,ys:List<List<u32>>)->List<List<u32>>{let a=xs;return a.concat(ys);}
"#;
#[test]
fn composed_storage_values_and_snapshots_match_every_backend() {
    let p = parse(SOURCE).unwrap();
    let mut reference = Runtime::new(p.clone()).unwrap();
    let mut rows: Vec<(&str, Value, bool, bool)> = vec![];
    for xs in [json!([]),json!([0]),json!([u32::MAX,0,1,3,9,0x80000000u32])] {
        for t in [0,3,u32::MAX] {
            for name in ["compact","chain","shared"] { rows.push((name,json!([xs,t]),false,true)); }
            for b in [false,true] { rows.push(("branches",json!([xs,t,b]),false,true)); }
        }
        for name in ["captured","ordered","total","lexical"] { rows.push((name,json!([xs]),false,true)); }
        rows.push(("count_all",json!([xs]),false,false));
        for ys in [json!([]),json!([1]),json!([u32::MAX,7,2,5,8,13,21,34])] {
            rows.push(("zip",json!([xs,ys]),false,true));
        }
    }
    rows.extend([
        ("signed",json!([[i32::MAX,i32::MIN,-1,0,7]]),false,true),
        ("signed",json!([[]]),false,true),
        ("wide",json!([[u64::MAX,0,1,7]]),false,false),
        ("wide",json!([[]]),false,false),
        ("flags",json!([[true,false,true,false]]),false,true),
        ("flags",json!([[]]),false,true),
        ("vectors",json!([[[u32::MAX,2],[0,u32::MAX],[7,3]]]),false,true),
        ("vectors",json!([[]]),false,true),
        ("float_bits",json!([[{"F32Bits":0x80000000u32},{"F32Bits":0x7fc01234u32},{"F32Bits":1u32},1.5]]),true,false),
        ("float_bits",json!([[]]),true,false),
        ("float_chain",json!([[16777216.0,1.0,-16777216.0,0.5]]),true,false),
        ("join_strings",json!([["a\u{0000}雪",""],["😀","x"]]),false,false),
        ("join_strings",json!([[],[]]),false,false),
        ("join_ints",json!([[{"Int":"123456789012345678901234567890"}],[{"Int":"-7"}]]),false,false),
        ("join_records",json!([[{"label":"x","value":{"Int":"-3"}}],[{"label":"雪","value":{"Int":"987654321098765432109876543210"}}]]),false,false),
        ("join_nested",json!([[[1,2],[]],[[u32::MAX],[3,4]]]),false,false),
    ]);
    let mut steps=vec![];let mut expected=vec![];
    for (name,args) in [("joined",json!([])),("put",json!([u32::MAX,7])),("put",json!([0,3])),("joined",json!([])),("put",json!([0,9])),("joined",json!([]))] {
        let outcome=reference.invoke_json(name,&args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    for (name,args,cpu_only,gpu) in rows {
        let f=p.functions.iter().find(|f|f.name==name).unwrap();
        let inputs=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
        let value=eval::call(&p,name,inputs,&mut 100000000).unwrap().json();
        steps.push(json!({"pure":name,"args":args,"cpu_only":cpu_only,"expect_gpu":gpu}));
        expected.push(json!({"reply":{"value":value},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    parity::conformance("generated-parity-memory40",p,SOURCE,steps,expected);
}
