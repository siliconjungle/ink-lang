use ink_core::{
    core::CheckedModule,
    eval,
    syntax::{parse, Expr, Program, Type},
};
use serde_json::{json, Value};
use std::{fs, process::Command};

fn expected(v: &eval::Value) -> Value {
    match v {
        eval::Value::U64(n) => json!(n.to_string()),
        eval::Value::F32(n) => json!(n),
        eval::Value::Vector(xs) | eval::Value::List(xs) => xs.iter().map(expected).collect(),
        eval::Value::Record(_, fs) => fs.iter().map(|(n, v)| (n.clone(), expected(v))).collect(),
        _ => v.json(),
    }
}
fn wire(v: &Value, t: &Type, p: &Program) -> Value {
    match t {
        Type::U64 => json!(v.as_u64().unwrap().to_string()),
        Type::List(t) | Type::Vector(t, _) => v
            .as_array()
            .unwrap()
            .iter()
            .map(|v| wire(v, t, p))
            .collect(),
        Type::Named(n) => p.records[n]
            .iter()
            .map(|(n, t)| (n.clone(), wire(&v[n], t, p)))
            .collect(),
        _ => v.clone(),
    }
}
fn run_node(tag: &str, source: &str, rows: &Value, script: &str) {
    let path = std::env::temp_dir().join(format!("ink-statements-{tag}-{}", std::process::id()));
    fs::create_dir_all(&path).unwrap();
    fs::write(path.join("output.mjs"), source).unwrap();
    fs::write(path.join("cases.json"), serde_json::to_vec(rows).unwrap()).unwrap();
    fs::write(path.join("test.mjs"), script).unwrap();
    let output = Command::new("node")
        .arg(path.join("test.mjs"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    println!("{}", String::from_utf8_lossy(&output.stdout));
    fs::remove_dir_all(path).unwrap();
}
#[test]
fn direct_loops_and_lexical_statements_match_interpreter_exactly() {
    let mut source = String::from("module statements; record Pair{value:u32,flag:Bool,}");
    for t in ["u32", "i32", "u64", "f32"] {
        let scan = if t == "f32" { "" } else { ".scan()" };
        source.push_str(&format!(r#"
fn map_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>choose(x<k,(x+z)*k,x-z));}}
fn stages_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return xs.filter(fn(x)=>x>=k).map(fn(x)=>x+z){scan}.concat(ys);}}
fn zip_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return xs.zip(ys,fn(x)=>fn(y)=>choose(x<k,x+y,y-z));}}
fn repeat_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat(3,x,fn(i)=>fn(a)=>choose(i==1,a+z,a-k)));}}
fn fold_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,z,fn(x)=>fn(a)=>choose(x<k,x-a,(x+a)+z));}}
fn sum_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return sum(xs.map(fn(x)=>x+z));}}
fn empty_repeat_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return repeat(0,sum(xs.map(fn(x)=>x+z)),fn(i)=>fn(a)=>sum(ys.map(fn(y)=>y+k)));}}
fn empty_fold_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->{t}{{return foldr(xs,sum(ys.map(fn(y)=>y+z)),fn(x)=>fn(a)=>x-a);}}
fn local_{t}(xs:List<{t}>,ys:List<{t}>,z:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>x);}}
"#));
    }
    source.push_str(
        r#"
fn index_shadow(xs:List<u32>)->List<u32>{return xs.map_indexed(fn(x)=>fn(x)=>x);}
fn zip_shadow(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.zip(ys,fn(x)=>fn(x)=>x);}
fn indexed(xs:List<u32>)->List<Bool>{return xs.map_indexed(fn(i)=>fn(x)=>choose(i==0,x>0,x==i));}
fn nested(xs:List<List<u32>>)->List<u32>{return xs.map(fn(xs)=>sum(xs.map(fn(x)=>x+1)));}
fn records(xs:List<u32>,k:u32)->List<Pair>{return xs.map(fn(x)=>Pair{value:x*k,flag:x>k});}
fn vector(xs:List<f32>)->List<Vec2<f32>>{return xs.map(fn(x)=>vec2(x,-x));}
fn bits(xs:List<f32>,k:f32)->List<f32>{return xs.map(fn(x)=>choose(x==k,k,x));}
fn q(x:i32,y:i32,z:i32)->i32{return quot_or(x,y,z);}
fn r(x:i32,y:i32,z:i32)->i32{return rem_or(x,y,z);}
fn wide(xs:List<u64>)->List<Bool>{return xs.map_indexed(fn(i)=>fn(x)=>x>1);}
"#,
    );
    let mut p = parse(&source).unwrap();
    // A callback-local Let shadows its item; its initializer must still see
    // the outer item. A second Let shadows again inside a lazy branch.
    for t in ["u32", "i32", "u64", "f32"] {
        let f = p
            .functions
            .iter_mut()
            .find(|f| f.name == format!("local_{t}"))
            .unwrap();
        let Type::List(inner) = &f.result else {
            panic!()
        };
        let Expr::Method(_, _, args) = &mut f.body else {
            panic!()
        };
        let Expr::Lambda(_, body) = &mut args[0] else {
            panic!()
        };
        let plus = Expr::Binary(
            "+".into(),
            Box::new(Expr::Var("x".into())),
            Box::new(Expr::Var("z".into())),
        );
        let innerlet = Expr::Let(
            "x".into(),
            Some(inner.clone()),
            Box::new(Expr::Binary(
                "-".into(),
                Box::new(Expr::Var("x".into())),
                Box::new(Expr::Var("k".into())),
            )),
            Box::new(Expr::Var("x".into())),
        );
        *body = Box::new(Expr::Let(
            "x".into(),
            Some(inner.clone()),
            Box::new(plus),
            Box::new(Expr::Call(
                "choose".into(),
                vec![
                    Expr::Binary(
                        "<".into(),
                        Box::new(Expr::Var("x".into())),
                        Box::new(Expr::Var("k".into())),
                    ),
                    innerlet,
                    Expr::Var("x".into()),
                ],
            )),
        ));
    }
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let emitted = ink_lowering_js::lower(&module).unwrap();
    let code = emitted
        .javascript
        .split("export const metadata")
        .next()
        .unwrap();
    for old in [
        "__map(",
        "__filter(",
        "__zip(",
        "__scan(",
        "__foldr(",
        "__repeat(",
        "(()=>",
        "=>",
    ] {
        // Representation helpers contain arrows: inspect only compiled functions.
        let compiled = code.split("function __fn0(").nth(1).unwrap();
        assert!(
            !compiled.contains(old),
            "remaining callback machinery: {old}"
        );
    }
    let mut rows = vec![];
    let mut add = |name: String, args: Value| {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let result = eval::call(&p, &name, values, &mut 2_000_000).unwrap();
        let args: Vec<_> = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| wire(v, t, &p))
            .collect();
        rows.push(json!({"name":name,"args":args,"expected":expected(&result)}));
    };
    for (t, xs, z, k) in [
        (
            "u32",
            json!([0, 1, 4294967295u32, 2147483648u32]),
            json!(4294967295u32),
            json!(7),
        ),
        (
            "i32",
            json!([-2147483648i64, -1, 0, 2147483647]),
            json!(-2147483648i64),
            json!(-3),
        ),
        (
            "u64",
            json!([0, 1, 9007199254740993u64, 18446744073709551615u64]),
            json!(18446744073709551615u64),
            json!(7),
        ),
        (
            "f32",
            json!([16777216.0,1.0,-16777216.0,{"F32Bits":2147483648u32}]),
            json!(1.0),
            json!(-1.0),
        ),
    ] {
        for data in [
            json!([]),
            xs.clone(),
            json!([z.clone()]),
            json!([k.clone(), z.clone()]),
        ] {
            for right in [json!([]), xs.clone()] {
                for family in [
                    "map",
                    "stages",
                    "zip",
                    "repeat",
                    "fold",
                    "sum",
                    "local",
                    "empty_repeat",
                    "empty_fold",
                ] {
                    add(format!("{family}_{t}"), json!([data, right, z, k]));
                }
            }
        }
    }
    for x in [-2147483648i64, -7, -1, 0, 1, 2147483647] {
        for y in [-1, 0, 2] {
            for f in ["q", "r"] {
                add(f.into(), json!([x, y, 19]));
            }
        }
    }
    add("index_shadow".into(), json!([[7, 8, 9]]));
    add("zip_shadow".into(), json!([[1, 2, 3], [7, 8]]));
    add("indexed".into(), json!([[1, 1, 4294967295u32, 3]]));
    add("nested".into(), json!([[[4294967295u32, 1], [], [5]]]));
    add("records".into(), json!([[0, 1, 4294967295u32], 7]));
    add("wide".into(), json!([[0, 1, 18446744073709551615u64]]));
    for bits in [
        0,
        0x80000000u32,
        1,
        0x7fc12345,
        0xffc54321,
        0x7f800000,
        0xff800000,
    ] {
        add("bits".into(), json!([[{"F32Bits":bits}],{"F32Bits":0}]));
        add("vector".into(), json!([[{"F32Bits":bits}]]));
    }
    run_node(
        "differential",
        &emitted.javascript,
        &json!(rows),
        r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import {functions,metadata} from './output.mjs';
const view=new DataView(new ArrayBuffer(4));const bits=v=>{if(v&&typeof v==='object')return v.F32Bits;view.setFloat32(0,v,true);return view.getUint32(0,true);};
function convert(v,t){switch(t.kind){case'u64':return BigInt(v);case'list':case'vector':return v.map(v=>convert(v,t.element));case'record':return Object.fromEntries(t.fields.map(f=>[f.name,convert(v[f.name],f.type)]));default:return v;}}
function result(v,t){switch(t.kind){case'u64':return v.toString();case'f32':return bits(v);case'list':case'vector':return Array.from(v,v=>result(v,t.element));case'record':return Object.fromEntries(t.fields.map(f=>[f.name,result(v[f.name],f.type)]));default:return v;}}
const rows=JSON.parse(fs.readFileSync(new URL('./cases.json',import.meta.url)));for(const row of rows){const f=metadata.functions.find(f=>f.name===row.name);const args=row.args.map((v,i)=>convert(v,f.params[i].type));const before=structuredClone(args);assert.deepEqual(result(functions[row.name](...args),f.result),row.expected,row.name+JSON.stringify(row.args));assert.deepEqual(args,before);}
assert.ok(Object.is(functions.r(-7,7,19),0));assert.equal(functions.q(-2147483648,-1,19),19);assert.equal(functions.r(-2147483648,-1,19),19);
console.log(`${rows.length} exact typed interpreter comparisons, lexical Lets, composite outputs and division edges passed`);
"#,
    );
}

#[test]
fn direct_stages_read_once_and_lazy_branches_do_no_work() {
    let p=parse(r#"module visits;
fn plus(x:u32,k:u32)->u32{return x+k;}
fn pred(x:u32,k:u32)->Bool{return x>=k;}
fn pipeline(xs:List<u32>,k:u32)->List<u32>{return xs.filter(fn(x)=>pred(x,k)).map(fn(x)=>plus(x,k));}
fn indexed(xs:List<u32>,k:u32)->List<u32>{return xs.map_indexed(fn(i)=>fn(x)=>plus(x,i+k));}
fn reverse(xs:List<u32>,k:u32)->u32{return foldr(xs,k,fn(x)=>fn(a)=>x-a);}
fn choose_lazy(xs:List<u32>,flag:Bool)->List<u32>{return choose(flag,xs.map(fn(x)=>plus(x,1)),xs);}
fn lookup_lazy(xs:List<u32>,ys:List<u32>)->u32{return xs.at_or(0,sum(ys.map(fn(x)=>plus(x,1))));}
fn div_lazy(xs:List<u32>,d:u32)->u32{return quot_or(12,d,sum(xs.map(fn(x)=>plus(x,1))));}
fn rem_lazy(xs:List<u32>,d:u32)->u32{return rem_or(12,d,sum(xs.map(fn(x)=>plus(x,1))));}
fn and_lazy(xs:List<u32>,flag:Bool)->Bool{return flag && sum(xs.map(fn(x)=>plus(x,1)))>0;}
fn or_lazy(xs:List<u32>,flag:Bool)->Bool{return flag || sum(xs.map(fn(x)=>plus(x,1)))>0;}
fn zero_repeat(xs:List<u32>,ys:List<u32>)->u32{return repeat(0,sum(xs.map(fn(x)=>plus(x,1))),fn(i)=>fn(a)=>sum(ys.map(fn(y)=>plus(y,1))));}
fn initial_fold(xs:List<u32>,ys:List<u32>)->u32{return foldr(xs,sum(ys.map(fn(y)=>plus(y,1))),fn(x)=>fn(a)=>x-a);}
fn second(xs:List<u32>,ys:List<u32>)->List<u32>{return xs.zip(ys,fn(x)=>fn(y)=>x+y);}
"#).unwrap();
    let mut source = ink_lowering_js::lower(&CheckedModule::from_source(p).unwrap())
        .unwrap()
        .javascript;
    for (i, key) in ["plus", "pred"].iter().enumerate() {
        let start = source.find(&format!("function __fn{i}(")).unwrap();
        let at = start + source[start..].find('{').unwrap() + 1;
        source.insert_str(at, &format!("globalThis.visits.{key}++;"));
        source = source.replace(
            &format!("/* inline {key} */"),
            &format!("/* inline {key} */globalThis.visits.{key}++;"),
        );
    }
    run_node(
        "counters",
        &source,
        &json!([]),
        r#"
import assert from 'node:assert/strict';import {functions} from './output.mjs';
const NativeArray=globalThis.Array;let allocations=0;
globalThis.Array=new Proxy(NativeArray,{construct(target,args){allocations++;return Reflect.construct(target,args);}});
let reads=[];function input(values,tag){const xs=values.slice();values.forEach((value,i)=>Object.defineProperty(xs,i,{get(){reads.push(tag+i);return value;}}));return xs;}
function reset(){visits={plus:0,pred:0};reads=[];allocations=0;}globalThis.visits={plus:0,pred:0};
let xs=input([1,2,3],'x'),ys=input([8,9],'y');reset();assert.deepEqual(functions.pipeline(xs,2),[4,5]);assert.deepEqual(reads,['x0','x1','x2']);assert.deepEqual(visits,{plus:2,pred:3});assert.equal(allocations,1); // filter literal + exactly one map allocation; no fused stages
reset();assert.deepEqual(functions.indexed(xs,1),[2,4,6]);assert.deepEqual(reads,['x0','x1','x2']);assert.equal(visits.plus,3);assert.equal(allocations,1);
reset();assert.equal(functions.reverse(xs,9),(1-(2-(3-9)))>>>0);assert.deepEqual(reads,['x2','x1','x0']);assert.equal(allocations,0);
reset();assert.deepEqual(functions.second(xs,ys),[9,11]);assert.deepEqual(reads,['x0','y0','x1','y1']);assert.equal(allocations,1);
reset();assert.equal(functions.choose_lazy(xs,false),xs);assert.deepEqual(reads,[]);assert.equal(visits.plus,0);assert.equal(allocations,0);
reset();assert.equal(functions.lookup_lazy([7],ys),7);assert.deepEqual(reads,[]);assert.equal(visits.plus,0);assert.equal(allocations,0);
for(const [name,arg,want] of [['div_lazy',3,4],['rem_lazy',5,2],['and_lazy',false,false],['or_lazy',true,true]]){reset();assert.equal(functions[name](xs,arg),want);assert.deepEqual(reads,[]);assert.equal(visits.plus,0);assert.equal(allocations,0);}
reset();assert.equal(functions.lookup_lazy([],ys),19);assert.deepEqual(reads,['y0','y1']);assert.equal(visits.plus,2);assert.equal(allocations,1);
reset();assert.equal(functions.div_lazy(xs,0),9);assert.deepEqual(reads,['x0','x1','x2']);assert.equal(visits.plus,3);assert.equal(allocations,1);
reset();assert.equal(functions.zero_repeat(xs,ys),9);assert.deepEqual(reads,['x0','x1','x2']);assert.equal(visits.plus,3);assert.equal(allocations,1);
reset();assert.equal(functions.initial_fold([],ys),19);assert.deepEqual(reads,['y0','y1']);assert.equal(visits.plus,2);assert.equal(allocations,1);
globalThis.Array=NativeArray;console.log('direct stage/read/allocation/order and lazy branch counters passed');
"#,
    );
}
