// Sums, counts and lengths over map/filter/zip pipelines, and nested float
// arithmetic, on every backend. The native Rust lowering emits filtered sums
// as one fold with branches, zip sums and pipeline lengths without
// collecting, and canonicalises float NaN once per arithmetic tree or sum.
// Results must equal the reference evaluator bit for bit, including NaN
// payloads, signed zeros, infinities and wrapping integers.
use serde_json::{json, Value};
use verified_language::{eval, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;

const SOURCE: &str = r#"module pipeline_loops;
record Item {id:u64,price:u64,qty:u64,open:Bool,weight:f32,}
fn sum32(xs:List<u32>,limit:u32)->u32{return sum(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*17+3));}
fn sum64(xs:List<u64>,limit:u64)->u64{return sum(xs.filter(fn(x)=>x<limit).map(fn(x)=>x*17+3));}
fn sumi(xs:List<i32>)->i32{return sum(xs.map(fn(x)=>x*3).filter(fn(x)=>x>-100));}
fn sum_int(xs:List<u32>)->Int{return sum(xs.filter(fn(x)=>x>2).map(fn(x)=>Int(x)*Int(x)));}
fn two_filters(xs:List<u32>)->u32{return sum(xs.filter(fn(x)=>x>1).map(fn(x)=>x*2).filter(fn(x)=>x<4000000000));}
fn filtered_only(xs:List<u64>)->u64{return sum(xs.filter(fn(x)=>x!=7));}
fn sumf(xs:List<f32>)->f32{return sum(xs.filter(fn(x)=>x>0.5).map(fn(x)=>x*x));}
fn plain_sumf(xs:List<f32>)->f32{return sum(xs);}
fn dot(xs:List<f32>,ys:List<f32>)->f32{return sum(xs.zip(ys,fn(a)=>fn(b)=>a*b));}
fn dot_kept(xs:List<f32>,ys:List<f32>)->f32{return sum(xs.zip(ys,fn(a)=>fn(b)=>a*b).filter(fn(p)=>p>0.0));}
fn zip_words(xs:List<u32>,ys:List<u32>)->u32{return sum(xs.zip(ys,fn(a)=>fn(b)=>a*b+1));}
fn zip_length(xs:List<u32>,ys:List<u32>)->u32{return length(xs.zip(ys,fn(a)=>fn(b)=>a+b));}
fn zip_list(xs:List<f32>,ys:List<f32>)->List<f32>{return xs.zip(ys,fn(a)=>fn(b)=>a*b-a);}
fn axpy(xs:List<f32>,a:f32,b:f32)->List<f32>{return xs.map(fn(x)=>a*x+b);}
fn tree(a:f32,b:f32,c:f32,d:f32)->f32{return (a+b)*(c-d)+a*d;}
fn revenue(items:List<Item>)->u64{return sum(items.filter(fn(i)=>i.open).map(fn(i)=>i.price*i.qty));}
fn heavy_weight(items:List<Item>)->f32{return sum(items.filter(fn(i)=>i.weight>0.5).map(fn(i)=>i.weight*2.0));}
fn count_open(items:List<Item>)->u32{return length(items.filter(fn(i)=>i.open));}
fn counted(items:List<Item>)->Int{return count(items.filter(fn(i)=>i.open));}
fn mapped_length(xs:List<u32>)->u32{return length(xs.map(fn(x)=>x+1));}
fn reused(xs:List<u32>)->u32{return sum(xs.filter(fn(x)=>x>3))+length(xs.filter(fn(x)=>x<3))+length(xs);}
fn nested(rows:List<List<u32>>)->u32{return sum(rows.map(fn(r)=>sum(r.filter(fn(x)=>x>2).map(fn(x)=>x*2))).filter(fn(s)=>s>0));}
"#;

#[test]
fn pipeline_loops_agree_on_every_backend() {
    let p = parse(SOURCE).unwrap();
    let r = Runtime::new(p.clone()).unwrap();
    let mut seed = 0x9e3779b97f4a7c15u64;
    let mut next = || {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        seed
    };
    let f32s = [0.0f32, -0.0, 0.75, -1.5, 3.4e38, f32::INFINITY, f32::NEG_INFINITY, 1e-45, 0.1, 2.5];
    let float = |bits: u32| -> Value {
        let x = f32::from_bits(bits);
        // JSON numbers carry finite values; infinities and NaN payloads use bits.
        if x.is_finite() { json!(x) } else { json!({"F32Bits": bits}) }
    };
    let mut steps = vec![];
    let mut expected = vec![];
    let mut add = |name: &str, args: Value| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args.as_array().unwrap().iter().zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap()).collect();
        let want = eval::call(&p, name, values, &mut 100_000_000).unwrap().json();
        steps.push(json!({"pure": name, "args": args}));
        expected.push(json!({"reply": {"value": want}, "snapshot": r.checkpoint_portable().unwrap()}));
    };
    for round in 0..24 {
        let n = (next() % 9) as usize + if round == 0 { 0 } else { 1 };
        let words: Vec<u32> = (0..n).map(|_| [0, 1, 3, 4, 7, 2147483648, 4294967295u32][(next() % 7) as usize]).collect();
        let others: Vec<u32> = (0..(next() % 9) as usize).map(|_| (next() % 20) as u32).collect();
        let wide: Vec<u64> = words.iter().map(|w| [*w as u64, 7, 18446744073709551615][(next() % 3) as usize]).collect();
        let signed: Vec<i32> = words.iter().map(|w| *w as i32).collect();
        // Every few rounds a NaN with a payload, either sign.
        let bits = |k: u64| -> u32 {
            match k % 13 {
                10 => 0x7fc0_1234,
                11 => 0xffa0_0001,
                12 => 0x7f80_0001,
                i => f32s[i as usize].to_bits(),
            }
        };
        let xs: Vec<Value> = (0..n).map(|_| float(bits(next()))).collect();
        let ys: Vec<Value> = (0..(next() % 9) as usize).map(|_| float(bits(next()))).collect();
        let items: Vec<Value> = (0..n).map(|i| {
            let price = [0u64, 7, 18446744073709551615][(next() % 3) as usize];
            let (qty, open, weight) = (next() % 5, next() % 2 == 0, float(bits(next())));
            json!({"id": i, "price": price, "qty": qty, "open": open, "weight": weight})
        }).collect();
        let limit = [0u32, 4, 2147483649, 4294967295][round % 4];
        add("sum32", json!([words, limit]));
        add("sum64", json!([wide, limit as u64]));
        add("sumi", json!([signed]));
        add("sum_int", json!([words]));
        add("two_filters", json!([words]));
        add("filtered_only", json!([wide]));
        add("sumf", json!([xs]));
        add("plain_sumf", json!([xs]));
        add("dot", json!([xs, ys]));
        add("dot_kept", json!([xs, xs.iter().rev().collect::<Vec<_>>()]));
        add("zip_words", json!([words, others]));
        add("zip_length", json!([words, others]));
        add("zip_list", json!([xs, ys]));
        add("axpy", json!([xs, float(bits(next())), float(bits(next()))]));
        add("tree", json!([float(bits(next())), float(bits(next())), float(bits(next())), float(bits(next()))]));
        add("revenue", json!([items]));
        add("heavy_weight", json!([items]));
        add("count_open", json!([items]));
        add("counted", json!([items]));
        add("mapped_length", json!([words]));
        add("reused", json!([others]));
        add("nested", json!([[words, others, []]]));
    }
    parity::conformance("pipeline-loops", p.clone(), SOURCE, steps, expected);
}
