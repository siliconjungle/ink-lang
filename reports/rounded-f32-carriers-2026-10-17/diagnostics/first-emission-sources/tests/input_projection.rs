use ink_core::{core::CheckedModule, syntax};
use std::{fs, process::Command};
#[test]
fn pure_entry_conversion_uses_checked_fields_and_retains_whole_value_boundaries() {
    let source = r#"module Demand;
record Row{key:u32,value:f32,flag:Bool,}
pub fn key(r:Row)->u32{return r.key;}
pub fn total(xs:List<Row>)->u32{return sum(xs.map(fn(x)=>x.key));}
pub fn filtered(xs:List<Row>)->List<Row>{return xs.filter(fn(x)=>x.flag);}
pub fn identity(r:Row)->Row{return r;}
pub fn equal(r:Row,s:Row)->Bool{return r==s;}
pub fn indirect(r:Row)->u32{return key(r);}
"#;
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let emission = ink_lowering_js::lower(&m).unwrap();
    let root = std::env::temp_dir().join(format!("ink-input-projection-{}", std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("module.mjs"), emission.javascript).unwrap();
    fs::write(root.join("test.mjs"),r#"
import assert from 'node:assert/strict';import{functions as f,functionsInto,metadata}from'./module.mjs';
let gets=0;const row=Object.freeze({key:7,flag:true,get value(){gets++;return -0;}});
const type=metadata.functions.find(x=>x.name==='key').params[0].type;
assert.deepStrictEqual(type.fields.map(f=>f.name),['key','value','flag']);
assert.equal(f.key(row),7);assert.equal(f.total([row,row]),14);assert.equal(gets,0);
const visible=f.filtered([row,row]);assert.equal(gets,1);assert.deepStrictEqual(visible[0],visible[1]);assert.ok(Object.is(visible[0].value,-0));
assert.ok(Object.is(f.identity(row).value,-0));assert.equal(gets,2);
assert.equal(f.equal(row,row),true);assert.equal(gets,3);
assert.equal(f.indirect(row),7);assert.equal(gets,3);
const destination=new Array(2);assert.equal(functionsInto.filtered([row,row],destination),2);assert.equal(gets,4);assert.ok(Object.is(destination[0].value,-0));
"#).unwrap();
    let output = Command::new("node")
        .arg(root.join("test.mjs"))
        .output()
        .unwrap();
    fs::remove_dir_all(root).unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
}
