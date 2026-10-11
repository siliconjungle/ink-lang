use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{parse, Program, Type},
};
use serde_json::{json, Value};
use std::{fs, process::Command};

fn balanced(xs: &[String]) -> String {
    if xs.len() == 1 {
        xs[0].clone()
    } else {
        let m = xs.len() / 2;
        format!("({}+{})", balanced(&xs[..m]), balanced(&xs[m..]))
    }
}
fn fixture() -> Program {
    let mut s = String::from("module inline;record Pair{key:u32,value:f32,}");
    for t in ["u32", "i32", "u64", "f32"] {
        s.push_str(&format!(r#"
fn leaf_{t}(x:{t},z:{t},k:{t})->{t}{{let x:{t}=x+z;return choose(x>k,(x*k)+z,x-k);}}
fn nested_{t}(x:{t},z:{t},k:{t})->{t}{{return leaf_{t}(leaf_{t}(x,z,k),z,k);}}
fn stage_{t}(xs:List<{t}>,z:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>nested_{t}(x,z,k));}}
fn pass_{t}(xs:List<{t}>,ys:List<{t}>)->List<{t}>{{return xs;}}
fn run_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return stage_{t}(xs,z,k).zip(ys,fn(x)=>fn(y)=>leaf_{t}(x+y,z,k));}}
fn fold_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(x)=>fn(a)=>nested_{t}(x+a,z,k));}}
fn lazy_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return choose(z>k,z,sum(stage_{t}(xs,z,k)));}}
fn eager_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return pass_{t}(stage_{t}(xs,z,k),stage_{t}(ys,z,k));}}
"#));
    }
    s.push_str(
        r#"
fn fp(x:f32)->f32{return x;}
fn fp_root(x:f32)->f32{return fp(x);}
fn vh(v:Vec3<f32>)->Vec3<f32>{return vec3(v.z,v.x,-v.y);}
fn vr(v:Vec3<f32>)->Vec3<f32>{return vh(vh(v));}
fn rh(r:Pair)->Pair{return Pair{key:r.key+1,value:fp(r.value)};}
fn rr(r:Pair)->Pair{return rh(rh(r));}
fn emit(xs:List<u32>,z:u32)->List<u32>{return xs.map(fn(x)=>x+z);}
fn ignore(xs:List<u32>,ys:List<u32>)->List<u32>{return xs;}
fn order(xs:List<u32>,ys:List<u32>,z:u32)->List<u32>{return ignore(emit(xs,z),emit(ys,z));}
fn body_lazy(xs:List<u32>,flag:Bool)->u32{return choose(flag,7,sum(emit(xs,1)));}
fn root_lazy(xs:List<u32>,flag:Bool)->u32{return body_lazy(xs,flag);}
"#,
    );
    s.push_str(&format!(
        "fn large(x:u32)->u32{{return {};}}fn large_root(x:u32)->u32{{return large(x);}}",
        balanced(&vec!["x".into(); 1025])
    ));
    for i in 0..13 {
        s.push_str(&format!(
            "fn chain{i}(x:u32)->u32{{return {};}}",
            if i == 12 {
                "x".into()
            } else {
                format!("chain{}(x+1)", i + 1)
            }
        ));
    }
    s.push_str("fn deep(x:u32)->u32{");
    for i in 0..30 {
        s.push_str(&format!(
            "let v{i}:u32={}+1;",
            if i == 0 {
                "x".into()
            } else {
                format!("v{}", i - 1)
            }
        ));
    }
    s.push_str("return deep_leaf(v29);}fn deep_leaf(x:u32)->u32{");
    for i in 0..25 {
        s.push_str(&format!(
            "let w{i}:u32={}+1;",
            if i == 0 {
                "x".into()
            } else {
                format!("w{}", i - 1)
            }
        ));
    }
    s.push_str("return w24;}fn deep_root(x:u32)->u32{");
    for i in 0..20 {
        s.push_str(&format!(
            "let q{i}:u32={}+1;",
            if i == 0 {
                "x".into()
            } else {
                format!("q{}", i - 1)
            }
        ));
    }
    s.push_str("return choose(true,choose(true,deep(q19),0),0);}");
    let p = parse(&s).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    p
}
fn number(t: &Type, n: u64) -> eval::Value {
    match t {
        Type::U32 => eval::Value::U32(n as u32),
        Type::I32 => eval::Value::I32(n as u32 as i32),
        Type::U64 => eval::Value::U64(n),
        Type::F32 => eval::Value::F32(n as u32),
        _ => panic!(),
    }
}
fn cases(p: &Program) -> Vec<(String, Vec<eval::Value>, eval::Value)> {
    let mut rows = vec![];
    let mut state = 0x9e3779b97f4a7c15u64;
    let mut add = |name: String, args: Vec<eval::Value>| {
        let value = eval::call(p, &name, args.clone(), &mut 2_000_000).unwrap();
        rows.push((name, args, value));
    };
    for (n, t) in [
        ("u32", Type::U32),
        ("i32", Type::I32),
        ("u64", Type::U64),
        ("f32", Type::F32),
    ] {
        for i in 0..12 {
            let mut random = || {
                state ^= state << 13;
                state ^= state >> 7;
                state ^= state << 17;
                if t == Type::F32 {
                    (state as u32 & 0x807fffff | 0x3f000000) as u64
                } else {
                    state
                }
            };
            let raw = if i == 0 {
                vec![]
            } else if i == 1 {
                if t == Type::F32 {
                    vec![0x4b800000, 0x3f800000, 0xcb800000, 0x80000000]
                } else {
                    vec![0, u64::MAX, 1, 0x80000000]
                }
            } else {
                (0..i % 5).map(|_| random()).collect()
            };
            let right = (0..(12 - i) % 5).map(|_| number(&t, random())).collect();
            let z = number(&t, if t == Type::F32 { 0x3f800000 } else { u64::MAX });
            let k = number(&t, if t == Type::F32 { 0xbf800000 } else { 7 });
            let xs = eval::Value::List(raw.iter().map(|n| number(&t, *n)).collect());
            let ys = eval::Value::List(right);
            for family in ["run", "fold", "lazy", "eager"] {
                add(
                    format!("{family}_{n}"),
                    vec![xs.clone(), ys.clone(), z.clone(), k.clone()],
                );
            }
            for family in ["leaf", "nested"] {
                add(
                    format!("{family}_{n}"),
                    vec![number(&t, random()), z.clone(), k.clone()],
                );
            }
        }
    }
    for bits in [
        0u32, 0x80000000, 1, 0x7fc12345, 0xffc54321, 0x7f800000, 0xff800000,
    ] {
        add("fp_root".into(), vec![eval::Value::F32(bits)]);
        add(
            "vr".into(),
            vec![eval::Value::Vector(vec![
                eval::Value::F32(bits),
                eval::Value::F32(0x80000000),
                eval::Value::F32(1),
            ])],
        );
        add(
            "rr".into(),
            vec![eval::Value::Record(
                "Pair".into(),
                [
                    ("key".into(), eval::Value::U32(u32::MAX)),
                    ("value".into(), eval::Value::F32(bits)),
                ]
                .into_iter()
                .collect(),
            )],
        );
    }
    for x in [0u32, 1, u32::MAX] {
        for name in ["large_root", "chain0", "deep_root"] {
            add(name.into(), vec![eval::Value::U32(x)]);
        }
    }
    rows
}
fn body<'a>(source: &'a str, marker: &str) -> &'a str {
    let start = source.find(marker).unwrap();
    let open = start + source[start..].find('{').unwrap();
    let mut depth = 0;
    for (i, ch) in source[open..].char_indices() {
        if ch == '{' {
            depth += 1;
        } else if ch == '}' {
            depth -= 1;
            if depth == 0 {
                return &source[start..open + i + 1];
            }
        }
    }
    panic!()
}
fn directory(tag: &str) -> std::path::PathBuf {
    let p = std::env::temp_dir().join(format!("ink-inline27-{tag}-{}", std::process::id()));
    fs::create_dir_all(&p).unwrap();
    p
}

fn wire(v: &eval::Value) -> Value {
    match v {
        eval::Value::U64(n) => json!(n.to_string()),
        eval::Value::F32(n) => json!({"F32Bits":n}),
        eval::Value::List(xs) | eval::Value::Vector(xs) => xs.iter().map(wire).collect(),
        eval::Value::Record(_, fs) => fs.iter().map(|(n, v)| (n.clone(), wire(v))).collect(),
        _ => v.json(),
    }
}
fn expected(v: &eval::Value) -> Value {
    match v {
        eval::Value::F32(n) => json!(n),
        eval::Value::List(xs) | eval::Value::Vector(xs) => xs.iter().map(expected).collect(),
        eval::Value::Record(_, fs) => fs.iter().map(|(n, v)| (n.clone(), expected(v))).collect(),
        _ => wire(v),
    }
}
#[test]
fn bounded_known_calls_match_interpreter_and_keep_exports_and_fallbacks() {
    let p = fixture();
    let m = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&m).unwrap();
    let source = emitted.javascript;
    for name in ["run_u32", "fold_f32", "eager_u64", "rr", "vr"] {
        let index = p.functions.iter().position(|f| f.name == name).unwrap();
        let b = body(&source, &format!("function __fn{index}("));
        assert!(b.contains("/* inline "), "{name}: {b}");
        assert!(
            !b.split_once('{').unwrap().1.contains("__fn"),
            "{name}: helper remains: {b}"
        );
    }
    for name in ["large_root", "chain0"] {
        let index = p.functions.iter().position(|f| f.name == name).unwrap();
        let b = body(&source, &format!("function __fn{index}("));
        assert!(
            b["function __fn".len()..].contains("__fn"),
            "bounded fallback required: {name}"
        );
    }
    let rows = cases(&p);
    let jsonrows:Vec<_>=rows.iter().map(|(n,args,result)|json!({"name":n,"args":args.iter().map(wire).collect::<Vec<_>>(),"expected":expected(result)})).collect();
    let dir = directory("js");
    fs::write(dir.join("output.mjs"), &source).unwrap();
    fs::write(
        dir.join("cases.json"),
        serde_json::to_vec(&jsonrows).unwrap(),
    )
    .unwrap();
    fs::write(dir.join("test.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import {functions,metadata} from './output.mjs';
const view=new DataView(new ArrayBuffer(4));const bits=v=>{if(v&&typeof v==='object')return v.F32Bits;view.setFloat32(0,v,true);return view.getUint32(0,true);};
function convert(v,t){switch(t.kind){case'u64':return BigInt(v);case'list':case'vector':return v.map(v=>convert(v,t.element));case'record':return Object.fromEntries(t.fields.map(f=>[f.name,convert(v[f.name],f.type)]));default:return v;}}
function result(v,t){switch(t.kind){case'u64':return v.toString();case'f32':return bits(v);case'list':case'vector':return Array.from(v,v=>result(v,t.element));case'record':return Object.fromEntries(t.fields.map(f=>[f.name,result(v[f.name],f.type)]));default:return v;}}
const rows=JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)));for(const row of rows){const f=metadata.functions.find(f=>f.name===row.name);const args=row.args.map((v,i)=>convert(v,f.params[i].type));const before=structuredClone(args);assert.deepEqual(result(functions[row.name](...args),f.result),row.expected,row.name);assert.deepEqual(args,before);}
assert.equal(Object.keys(functions).length,metadata.functions.length);for(const f of metadata.functions)assert.equal(typeof functions[f.name],'function');
const NativeArray=globalThis.Array;let allocs=0,reads=[];globalThis.Array=new Proxy(NativeArray,{construct(t,args){allocs++;return Reflect.construct(t,args);}});
function input(v,name){return v.map((x,i)=>x).map((x,i,a)=>{Object.defineProperty(a,i,{get(){reads.push(name+i);return x;}});return x;});}
function tracked(v,name){const a=v.slice();v.forEach((x,i)=>Object.defineProperty(a,i,{get(){reads.push(name+i);return x;}}));return a;}
const xs=tracked([1,2],'x'),ys=tracked([8,9],'y');reads=[];allocs=0;assert.deepEqual(functions.order(xs,ys,3),[4,5]);assert.deepEqual(reads,['x0','x1','y0','y1']);assert.equal(allocs,2);
reads=[];allocs=0;assert.equal(functions.root_lazy(xs,true),7);assert.deepEqual(reads,[]);assert.equal(allocs,0);
reads=[];allocs=0;assert.equal(functions.root_lazy(xs,false),5);assert.deepEqual(reads,['x0','x1']);assert.equal(allocs,1);globalThis.Array=NativeArray;
console.log(`${rows.length} interpreter/JS comparisons; argument order/once, lazy inline branches, exports and bounded fallbacks passed`);
"#).unwrap();
    let out = Command::new("node")
        .arg(dir.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}{}",
        String::from_utf8_lossy(&out.stdout),
        String::from_utf8_lossy(&out.stderr)
    );
    println!("{}", String::from_utf8_lossy(&out.stdout));
    fs::remove_dir_all(dir).unwrap();
}
#[test]
fn recursive_definitions_still_reject_at_compile_time() {
    for source in [
        "module cyc;fn f(x:u32)->u32{return f(x);}",
        "module cyc;fn f(x:u32)->u32{return g(x);}fn g(x:u32)->u32{return f(x);}",
    ] {
        assert!(CheckedModule::from_source(parse(source).unwrap()).is_err());
    }
}
