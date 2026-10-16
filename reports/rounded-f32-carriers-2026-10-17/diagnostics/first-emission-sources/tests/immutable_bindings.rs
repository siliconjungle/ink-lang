use ink_core::{core::CheckedModule, eval, syntax::parse};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn immutable_aliases_and_mutable_snapshots_preserve_every_binary64_bit() {
    let source = r#"module carriers;
record R { x:f64,y:f64, }
fn chain(x:f64,y:f64)->List<f64> {
 let a=x+y;let alias=a;let a=alias*y-0f64;
 return [a,alias,(x+y)*y+(-x),choose(a<alias,x,y),choose(a==alias,x,y)];
}
fn primitives(x:f64,y:f64)->List<f64> {
 let a=sqrt(x);let b=floor(y);let c=ceil(x);let d=trunc(y);let e=round_ties_even(x);
 let f=f64_div(x,y);let g=f64_from_u32(4294967295);let h=f64_from_i32(-2147483648);
 let i=f64_from_u64(9007199254740995);let j=f64_from_int(Int(9007199254740995));
 let k=f64_from_f32(0.1);
 return [a+y,b+x,c+y,d+x,e+y,f+x,g+x,h+x,i+x,j+x,k+x];
}
fn branch(x:f64,y:f64)->List<f64> {
 let a=choose(x==0f64,x+y,y);let b=choose(x!=0f64,x*y,y);
 return [a,b,a+b,-a,-b];
}
fn records(x:f64,y:f64)->List<f64> {
 let r=R{x:x+0f64,y:y};let alias=r;let r=R{x:alias.y,y:alias.x};
 return [r.x*r.y,alias.y,-alias.y];
}
fn mutable(xs:List<f64>,y:f64)->List<f64> {
 let a=foldl(xs,1f64,fn(x)=>fn(s)=>choose(x==0f64,s*2f64,x));
 let b=repeat_until(length(xs),1f64,fn(s)=>false,
   fn(i)=>fn(s)=>choose(i==0,s+2f64,xs.at_or(i,0f64)));
 return [a,b,-b,sum(xs),a+y,b+y];
}
fn mapped(xs:List<f64>,y:f64)->List<f64> {return xs.map(fn(x)=>(x+y)*y);}
fn swapped(x:f64,y:f64)->List<f64> {
 var a:f64=x;var b:f64=y;
 for i in 0..9 {let previous=a;a=b;b=previous;}
 return [a,b];
}
fn tail(xs:List<f64>,a:f64,b:f64)->List<f64> {
 return choose(length(xs)==0,[a,b],tail(xs.drop(1),b,a));
}
fn recursive(x:f64,y:f64)->List<f64> {return tail([0f64,0f64,0f64],x,y);}
"#;
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut bits = vec![0u64, 1 << 63, 1, 0x8000000000000001, 0x000fffffffffffff,
        0x0010000000000000, 0x3ff0000000000001, 0x4340000000000000,
        0x7fefffffffffffff, 0xffefffffffffffff, 0x7ff0000000000000,
        0xfff0000000000000, 0x7ff0000000001234, 0xfff8000000005678];
    let mut seed = 0x9e3779b97f4a7c15u64;
    for _ in 0..256 { seed ^= seed << 13; seed ^= seed >> 7; seed ^= seed << 17; bits.push(seed); }
    let mut cases = vec![];
    for (i, &x) in bits.iter().enumerate() {
        let y = bits[(i + 1) % bits.len()];
        for name in ["chain", "primitives", "branch", "records", "mutable", "mapped", "swapped", "recursive"] {
            let x = json!({"F64Bits":x.to_string()});
            let y = json!({"F64Bits":y.to_string()});
            let args = if matches!(name, "mutable" | "mapped") {
                json!([[0.0, x, y, {"F64Bits":"9223372036854775808"}], y])
            } else { json!([x, y]) };
            let p = module.program();
            let f = p.functions.iter().find(|f| f.name == name).unwrap();
            let values = args.as_array().unwrap().iter().zip(&f.params)
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap()).collect();
            let eval::Value::List(expected) = eval::call(p, name, values, &mut 1_000_000).unwrap() else { panic!() };
            let expected = expected.iter().map(|v| {
                let eval::Value::F64(bits) = v else { panic!() }; bits.to_string()
            }).collect::<Vec<_>>();
            cases.push(json!({"name":name,"args":args,"expected":expected}));
        }
    }
    let root = std::env::temp_dir().join(format!("ink-double-carriers-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"), ink_lowering_js::lower(&module).unwrap().javascript).unwrap();
    fs::write(root.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(root.join("test.mjs"), r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const dv=new DataView(new ArrayBuffer(8));
const bits=x=>{if(typeof x==='object')return x.F64Bits;dv.setFloat64(0,x,true);return dv.getBigUint64(0,true).toString();};
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
for(const {name,args,expected} of cases){
 const before=structuredClone(args),check=xs=>assert.deepEqual(xs.map(bits),expected,name);
 check(m.call(name,args));check(m.functions[name](...args));
 const e=m.compiledValues[name],values=args.map((v,i)=>e.params[i].capture(v));
 check(e.result.materialize(m.callCompiled(name,values)));
 const token=m.prepareCompiled(name,[[0,values[0]]]);
 check(e.result.materialize(m.callPreparedCompiled(token,[values[1]])));
 assert.deepEqual(args,before,'inputs unchanged');
}
console.log(`${cases.length} binary64 alias/snapshot cases; checked/trusted/compiled/prepared calls; exact bits`);
"#).unwrap();
    let result = Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    assert!(result.status.success(), "{}{}", String::from_utf8_lossy(&result.stdout), String::from_utf8_lossy(&result.stderr));
    println!("{}", String::from_utf8_lossy(&result.stdout));
    fs::remove_dir_all(root).unwrap();
}
