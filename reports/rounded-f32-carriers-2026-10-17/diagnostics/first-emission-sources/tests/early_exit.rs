use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{parse, Expr, Program, Type},
};
use serde_json::{json, Value};
use std::{
    fs,
    process::Command,
    time::{SystemTime, UNIX_EPOCH},
};
fn directory(tag: &str) -> std::path::PathBuf {
    let path = std::env::temp_dir().join(format!(
        "ink-first-{tag}-{}-{}",
        std::process::id(),
        SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos()
    ));
    fs::create_dir_all(&path).unwrap();
    path
}
fn fixture() -> (Program, Vec<(String, Value, eval::Value)>) {
    let mut source = String::from("module first;");
    for t in ["u32", "i32", "u64", "f32"] {
        source.push_str(&format!(r#"
fn first_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,x,a));}}
fn nested_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(x)=>fn(a)=>choose(x==k,z,choose(x>k,choose(x==z,a,ys.at_or(0,x)),a)));}}
fn value_dep_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,x+a,a));}}
fn predicate_dep_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(x)=>fn(a)=>choose(a>k,x,a));}}
fn same_binder_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(a)=>fn(a)=>choose(k>z,k,z));}}
"#));
    }
    source.push_str(r#"
fn shadow(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>choose(sum(ys.map(fn(a)=>a))>k,ys.map(fn(a)=>a+x).at_or(0,x),a));}
fn hidden(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,sum(ys.map(fn(y)=>y+a)),a));}
fn let_shadow(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,x,a));}
fn let_initializer_dep(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,x,a));}
fn wrapped_tree(xs:List<u32>,ys:List<u32>,z:u32,k:u32)->u32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,x,a));}
fn float_bits(xs:List<f32>,ys:List<f32>,z:f32,k:f32)->f32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x!=x,x,choose(x==0.0,x,a)));}
fn float_order(xs:List<f32>,ys:List<f32>,z:f32,k:f32)->f32{return foldr(xs,z,fn(x)=>fn(a)=>choose(x>k,(x+z)+k,a));}
"#);
    let mut p = parse(&source).unwrap();
    for (name, dep) in [("let_shadow", false), ("let_initializer_dep", true)] {
        let f = p.functions.iter_mut().find(|f| f.name == name).unwrap();
        let Expr::Call(_, args) = &mut f.body else {
            panic!()
        };
        let Expr::Lambda(_, rest) = &mut args[2] else {
            panic!()
        };
        let Expr::Lambda(_, body) = rest.as_mut() else {
            panic!()
        };
        let Expr::Call(_, branches) = body.as_mut() else {
            panic!()
        };
        branches[1] = Expr::Let(
            "a".into(),
            Some(Box::new(Type::U32)),
            Box::new(Expr::Binary(
                "+".into(),
                Box::new(Expr::Var(if dep { "a" } else { "x" }.into())),
                Box::new(Expr::Num(1)),
            )),
            Box::new(Expr::Var("a".into())),
        );
    }
    {
        let f = p
            .functions
            .iter_mut()
            .find(|f| f.name == "wrapped_tree")
            .unwrap();
        let Expr::Call(_, args) = &mut f.body else {
            panic!()
        };
        let Expr::Lambda(_, rest) = &mut args[2] else {
            panic!()
        };
        let Expr::Lambda(_, body) = rest.as_mut() else {
            panic!()
        };
        let old = body.clone();
        *body = Box::new(Expr::Let(
            "local".into(),
            Some(Box::new(Type::U32)),
            Box::new(Expr::Num(0)),
            old,
        ));
    }
    CheckedModule::from_source(p.clone()).unwrap();
    let mut cases = Vec::new();
    let mut add = |name: String, args: Value| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let expected = eval::call(&p, &name, values, &mut 1_000_000).unwrap();
        cases.push((name, args, expected));
    };
    for (t, xs, z, k) in [
        (
            "u32",
            json!([0, 1, 4294967295u32, 7]),
            json!(4294967295u32),
            json!(1),
        ),
        (
            "i32",
            json!([-2147483648i64, -1, 0, 2147483647]),
            json!(-1),
            json!(0),
        ),
        (
            "u64",
            json!([0, 1, 9007199254740993u64, 18446744073709551615u64]),
            json!(18446744073709551615u64),
            json!(1),
        ),
        (
            "f32",
            json!([{"F32Bits":0x80000000u32},-1.0,0.0,3.0]),
            json!({"F32Bits":0x80000000u32}),
            json!(0.0),
        ),
    ] {
        for data in [
            json!([]),
            xs.clone(),
            json!([z.clone()]),
            json!([k.clone(), z.clone(), k.clone()]),
        ] {
            for family in [
                "first",
                "nested",
                "value_dep",
                "predicate_dep",
                "same_binder",
            ] {
                add(format!("{family}_{t}"), json!([data, [z.clone()], z, k]));
            }
        }
    }
    let mut state = 0x9e3779b9u32;
    for _ in 0..64 {
        let mut xs = Vec::new();
        for _ in 0..9 {
            state ^= state << 13;
            state ^= state >> 17;
            state ^= state << 5;
            xs.push(state);
        }
        for family in [
            "first",
            "nested",
            "value_dep",
            "predicate_dep",
            "same_binder",
        ] {
            add(
                format!("{family}_u32"),
                json!([xs, [state], state, state >> 1]),
            );
        }
        for name in ["shadow", "hidden", "let_shadow", "let_initializer_dep"] {
            add(name.into(), json!([xs, [state, 1], state, 3]));
        }
    }
    for bits in [
        vec![],
        vec![0x7fc12345u32, 0x80000000, 0],
        vec![0x80000000, 0x7fc54321, 0],
        vec![0x3f800000, 0x7fc12345, 0x80000000],
        vec![0x7f800000, 0xff800000, 0],
    ] {
        let xs: Vec<_> = bits.into_iter().map(|b| json!({"F32Bits":b})).collect();
        add(
            "float_bits".into(),
            json!([xs,[],{"F32Bits":0x7fc55555u32},0.0]),
        );
    }
    add(
        "float_order".into(),
        json!([[16777216.0, 1.0], [0.0], 1.0, -16777216.0]),
    );
    add("wrapped_tree".into(), json!([[5, 7], [], 9, 6]));
    (p, cases)
}
fn recognizes(_: &str) -> bool {
    false
}

fn wire(v: Value, t: &Type) -> Value {
    match t {
        Type::U64 => json!(v.as_u64().unwrap().to_string()),
        Type::List(t) => Value::Array(
            v.as_array()
                .unwrap()
                .iter()
                .map(|v| wire(v.clone(), t))
                .collect(),
        ),
        _ => v,
    }
}
#[test]
fn literal_reverse_folds_match_interpreter() {
    let (p, cases) = fixture();
    let emission = ink_lowering_js::lower(&CheckedModule::from_source(p.clone()).unwrap()).unwrap();
    for (i, f) in p.functions.iter().enumerate() {
        let start = emission
            .javascript
            .find(&format!("function __fn{i}("))
            .unwrap();
        let open = start + emission.javascript[start..].find('{').unwrap();
        let mut depth = 0;
        let mut end = open;
        for (offset, ch) in emission.javascript[open..].char_indices() {
            if ch == '{' {
                depth += 1;
            } else if ch == '}' {
                depth -= 1;
                if depth == 0 {
                    end = open + offset + 1;
                    break;
                }
            }
        }
        let body = &emission.javascript[start..end];
        assert_eq!(
            body.contains("break;"),
            recognizes(&f.name),
            "{}: {}",
            f.name,
            body
        );
        if !recognizes(&f.name) {
            assert!(!body.contains("__foldr("));
            assert!(body.contains(">=0;"), "reverse fold required: {body}");
        }
    }
    let rows: Vec<_> = cases
        .iter()
        .map(|(n, a, v)| {
            let f = p.functions.iter().find(|f| &f.name == n).unwrap();
            let args: Vec<_> = a
                .as_array()
                .unwrap()
                .iter()
                .zip(&f.params)
                .map(|(v, (_, t))| wire(v.clone(), t))
                .collect();
            let expected = match v {
                eval::Value::F32(bits) => json!(bits),
                _ => wire(v.json(), &f.result),
            };
            json!({"name":n,"args":args,"expected":expected,"float":f.result==Type::F32})
        })
        .collect();
    let dir = directory("js");
    fs::write(dir.join("output.mjs"), &emission.javascript).unwrap();
    fs::write(dir.join("cases.json"), serde_json::to_vec(&rows).unwrap()).unwrap();
    fs::write(dir.join("test.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import {functions,metadata} from './output.mjs';
const view=new DataView(new ArrayBuffer(4));const bits=v=>{if(v&&typeof v==='object')return v.F32Bits;view.setFloat32(0,v,true);return view.getUint32(0,true);};
const convert=(v,t)=>t.kind==='u64'?BigInt(v):t.kind==='list'?v.map(x=>convert(x,t.element)):v;
for(const c of JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)))){const f=metadata.functions.find(f=>f.name===c.name);const args=c.args.map((v,i)=>convert(v,f.params[i].type));const before=structuredClone(args);let value=functions[c.name](...args);value=c.float?bits(value):typeof value==='bigint'?value.toString():value;assert.deepEqual(value,c.expected,c.name);assert.deepEqual(args,before);}
// Test-only native getters establish demand behavior; no production counters.
let reads=0;const xs=[1,9,99];xs.forEach((x,i)=>Object.defineProperty(xs,i,{get(){reads++;return x;}}));
assert.equal(functions.first_u32(xs,[],7,2),9);assert.equal(reads,3);
reads=0;assert.equal(functions.nested_u32(xs,[88],7,1),7);assert.equal(reads,3); // literal fold visits the complete input
console.log('differential cases and early-exit read checks passed');
"#).unwrap();
    let run = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}{}",
        String::from_utf8_lossy(&run.stdout),
        String::from_utf8_lossy(&run.stderr)
    );
    println!(
        "{} interpreter comparisons; {}",
        cases.len(),
        String::from_utf8_lossy(&run.stdout)
    );
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn demand_scan_evaluates_list_and_default_once_then_skips_tail_callbacks() {
    let p=parse(r#"module counters;
fn pred(x:u32,k:u32)->Bool{return x>=k;}
fn mapper(x:u32,z:u32)->u32{return choose(x==1,z,x+z);}
fn initial(z:u32)->u32{return z;}
fn ingress(xs:List<u32>)->List<u32>{return xs;}
fn run(xs:List<u32>,z:u32,k:u32)->u32{return fold_until(ingress(xs),initial(z),fn(x)=>fn(a)=>pred(x,k),fn(x)=>fn(a)=>choose(pred(x,k),mapper(x,z),a));}
"#).unwrap();
    let mut source = ink_lowering_js::lower(&CheckedModule::from_source(p).unwrap())
        .unwrap()
        .javascript;
    // Counters are deliberately injected into emitted test code only.
    for (i, key) in ["pred", "mapper", "initial", "ingress"].iter().enumerate() {
        let start = source.find(&format!("function __fn{i}(")).unwrap();
        let at = start + source[start..].find('{').unwrap() + 1;
        source.insert_str(at, &format!("globalThis.visits.{key}++;"));
        source = source.replace(
            &format!("/* inline {key} */"),
            &format!("/* inline {key} */globalThis.visits.{key}++;"),
        );
    }
    let dir = directory("js-visits");
    fs::write(dir.join("output.mjs"), source).unwrap();
    fs::write(dir.join("test.mjs"),r#"import assert from 'node:assert/strict';import {functions} from './output.mjs';
function check(xs,k,want,pred,mapper){globalThis.visits={pred:0,mapper:0,initial:0,ingress:0};assert.equal(functions.run(xs,7,k),want);assert.deepEqual(visits,{pred,mapper,initial:1,ingress:1});}
check([0,1,9],1,7,4,1); // replacement == default must terminate
check([9,1,3],2,16,2,1);
check([0,1,2],9,7,6,0);
check([],9,7,0,0);
"#).unwrap();
    let run = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    fs::remove_dir_all(dir).unwrap();
}
