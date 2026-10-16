use ink_core::{core::CheckedModule,syntax::{parse,Expr,Statement}};
use serde_json::json;
use std::{fs,process::Command};

#[test]
fn binary64_literals_round_trip_raw_bits_in_pure_and_action_emission() {
    let mut bits=vec![0,1,2,0x000fffffffffffff,0x0010000000000000,0x0010000000000001,
        0x3ff0000000000000,0x3ff0000000000001,0x7fefffffffffffff,0x7ff0000000000000,
        0x7ff0000000000001,0x7ff8000000000000,0x7ff8123456789abc];
    let positive=bits.clone();bits.extend(positive.into_iter().map(|x|x|0x8000000000000000));
    for exponent in [1u64,2,3,16,32,64,128,256,512,1022,1023,1024,1025,1536,2000,2045,2046] {
        for mantissa in [0,1,0x7ffffffffffff,0xfffffffffffff] {
            let b=(exponent<<52)|mantissa;bits.push(b);bits.push(b|0x8000000000000000);
        }
    }
    let mut seed=0xc49f0e5194b37da1u64;
    for _ in 0..2048 {seed^=seed<<13;seed^=seed>>7;seed^=seed<<17;bits.push(seed);}
    // Checked literal nodes admit finite values only. Exercise nonfinite
    // payloads through their ordinary explicit bit constructor alongside them.
    let values=Expr::Call("list".into(),bits.iter().copied().map(|b|
        if f64::from_bits(b).is_finite(){Expr::Double(b)}
        else {Expr::Call("f64_from_bits".into(),vec![Expr::Num(b)])}).collect());
    let mut program=parse("module constants;fn values()->List<f64>{return [];}query observed()->List<f64>{return [];}").unwrap();
    program.functions[0].body=values.clone();program.actions[0].body=vec![Statement::Return(values)];
    let module=CheckedModule::from_source(program).unwrap();
    let root=std::env::temp_dir().join(format!("ink-double-literals-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"),ink_lowering_js::lower(&module).unwrap().javascript).unwrap();
    fs::write(root.join("expected.json"),serde_json::to_vec(&json!(bits.iter().map(|x|x.to_string()).collect::<Vec<_>>())).unwrap()).unwrap();
    fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const expected=JSON.parse(fs.readFileSync(new URL('expected.json',import.meta.url)));
const dv=new DataView(new ArrayBuffer(8));const bits=x=>{if(typeof x==='object')return x.F64Bits;dv.setFloat64(0,x,true);return dv.getBigUint64(0,true).toString();};
const check=xs=>assert.deepEqual(xs.map(bits),expected);
check(m.functions.values());
const e=m.compiledValues.values,t=m.prepareCompiled('values',[]);
check(e.result.materialize(m.callCompiled('values',[])));
check(e.result.materialize(m.callPreparedCompiled(t,[])));
const state=m.createState();check(state.invoke('observed',[]).result);
// Detached public NaN wrappers must not mutate subsequent literal observations.
const first=m.functions.values(),nan=first.find(x=>typeof x==='object');nan.F64Bits='0';check(m.functions.values());
console.log(`${expected.length} binary64 constants retain exact bits across pure/prepared/action calls`);
"#).unwrap();
    let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    assert!(result.status.success(),"{}{}",String::from_utf8_lossy(&result.stdout),String::from_utf8_lossy(&result.stderr));
    println!("{}",String::from_utf8_lossy(&result.stdout));fs::remove_dir_all(root).unwrap();
}
