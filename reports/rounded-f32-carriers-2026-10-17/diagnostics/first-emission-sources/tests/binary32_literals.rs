use ink_core::{core::CheckedModule, syntax::{parse, Expr, Statement}};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn binary32_literals_retain_every_sampled_bit_in_both_carriers() {
    let mut bits = vec![0, 1, 2, 0x007fffff, 0x00800000, 0x00800001, 0x3dcccccd,
        0x3f7fffff, 0x3f800000, 0x3f800001, 0x4b7fffff, 0x4b800000,
        0x7f7fffff, 0x7f800000, 0x7f800001, 0x7fc00000, 0x7fc12345];
    let positive = bits.clone();
    bits.extend(positive.into_iter().map(|x| x | 0x80000000));
    for exponent in [0u32, 1, 2, 3, 16, 32, 64, 100, 126, 127, 128, 129, 200, 252, 253, 254] {
        for mantissa in [0, 1, 0x003fffff, 0x007fffff] {
            let value = (exponent << 23) | mantissa;
            bits.extend([value, value | 0x80000000]);
        }
    }
    let mut seed = 0xc49f0e51u32;
    for _ in 0..4096 {
        seed ^= seed << 13; seed ^= seed >> 17; seed ^= seed << 5;
        bits.push(seed);
    }
    let mut expressions = bits.iter().map(|&value| {
        if f32::from_bits(value).is_finite() { Expr::Float(value) }
        else { Expr::Call("f32_from_bits".into(), vec![Expr::Num(value as u64)]) }
    }).collect::<Vec<_>>();
    // Contextual integer literals must themselves be exact in f32; explicit
    // lossy conversions are a separate source operation.
    for value in [0u64, 1, 16777215, 16777216, 1u64 << 32, 1u64 << 63, (1u64 << 63) + (1u64 << 40)] {
        expressions.push(Expr::Num(value)); bits.push((value as f32).to_bits());
    }
    let values = Expr::Call("list".into(), expressions);
    let folder = std::env::temp_dir().join(format!("ink-single-literals-{}", std::process::id()));
    fs::create_dir_all(&folder).unwrap();
    for (name, source) in [
        ("pure", "module constants;fn values()->List<f32>{return [];}"),
        ("stateful", "module constants;fn values()->List<f32>{return [];}query observed()->List<f32>{return [];}")
    ] {
        let mut program = parse(source).unwrap();
        program.functions[0].body = values.clone();
        if !program.actions.is_empty() { program.actions[0].body = vec![Statement::Return(values.clone())]; }
        let module = CheckedModule::from_source(program).unwrap();
        let emitted = ink_lowering_js::lower(&module).unwrap();
        fs::write(folder.join(format!("{name}.mjs")), emitted.javascript).unwrap();
    }
    fs::write(folder.join("expected.json"), serde_json::to_vec(&json!(bits)).unwrap()).unwrap();
    fs::write(folder.join("test.mjs"), r#"
import assert from 'node:assert/strict';import fs from 'node:fs';
const expected=JSON.parse(fs.readFileSync(new URL('expected.json',import.meta.url)));
const view=new DataView(new ArrayBuffer(4));
const bits=x=>{if(typeof x==='object')return x.F32Bits;view.setFloat32(0,x,true);return view.getUint32(0,true);};
const check=xs=>assert.deepEqual(xs.map(bits),expected);
for(const name of ['pure','stateful']){
 const m=await import('./'+name+'.mjs');check(m.functions.values());
 const entry=m.compiledValues.values,token=m.prepareCompiled('values',[]);
 check(entry.result.materialize(m.callCompiled('values',[])));
 check(entry.result.materialize(m.callPreparedCompiled(token,[])));
 if(name==='stateful')check(m.createState().invoke('observed',[]).result);
 // Public NaN wrappers remain detached from future literal observations.
 const first=m.functions.values(),nan=first.find(x=>typeof x==='object');
 nan.F32Bits=0;check(m.functions.values());
}
console.log(`${expected.length} binary32 constants match exact bits across both carriers`);
"#).unwrap();
    let result = Command::new("node").arg(folder.join("test.mjs")).output().unwrap();
    assert!(result.status.success(), "{}{}", String::from_utf8_lossy(&result.stdout), String::from_utf8_lossy(&result.stderr));
    println!("{}", String::from_utf8_lossy(&result.stdout));
    fs::remove_dir_all(folder).unwrap();
}
