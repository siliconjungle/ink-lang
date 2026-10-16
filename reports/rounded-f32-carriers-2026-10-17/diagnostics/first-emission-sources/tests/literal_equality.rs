use ink_core::{core::CheckedModule,eval,syntax::parse};
use serde_json::{json,Value};
use std::{fs,process::Command};

#[test]
fn literal_lists_preserve_structural_bits_nested_values_and_operand_evaluation() {
 let source=r#"module LiteralEquality;
record Row{value:u32,}
fn floats(a:f32,b:f32)->Bool{return [a]==[b];}
fn different(a:f32,b:f32)->Bool{return [a]!=[b];}
fn scalar(a:f32,b:f32)->Bool{return a==b;}
fn nested(a:List<f32>,b:List<f32>)->Bool{return [a]==[b];}
fn rows(a:Row,b:Row)->Bool{return [a]==[b];}
fn ordered(a:Row,b:Row,c:Row,d:Row)->Bool{return [a.value,b.value]==[c.value,d.value];}
fn unequal(a:Row,b:Row,c:Row)->Bool{return [a.value]==[b.value,c.value];}
"#;
 let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
 let mut cases=Vec::<Value>::new();
 let mut add=|name:&str,args:Value|{
  let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
  let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
  let expected=eval::call(module.program(),name,values,&mut 1_000_000).unwrap().json();
  cases.push(json!({"name":name,"args":args,"expected":expected}));
 };
 for (a,b) in [(0u32,0x80000000u32),(0x7fc12345,0x7fc12345),(0x7fc12345,0x7fc12346),(0x7f812345,0x7f812345),(0xffc12345,0x7fc12345),(0x3fc00000,0x3fc00000)]{
  let pair=[json!({"F32Bits":a}),json!({"F32Bits":b})];
  for name in ["floats","different","scalar"]{add(name,json!(pair));}
  add("nested",json!([[pair[0].clone()],[pair[1].clone()]]));
 }
 add("rows",json!([{"value":1},{"value":1}]));add("rows",json!([{"value":1},{"value":2}]));
 add("ordered",json!([{"value":1},{"value":2},{"value":1},{"value":2}]));
 add("unequal",json!([{"value":1},{"value":1},{"value":2}]));
 let emitted=ink_lowering_js::lower(&module).unwrap();
 let root=std::env::temp_dir().join(format!("ink-literal-equality-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
 fs::write(root.join("program.mjs"),emitted.javascript).unwrap();fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
 fs::write(root.join("test.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import {call,callBinary,callCompact,valueCodecs} from './program.mjs';
for(const c of JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)))){
 assert.deepEqual(call(c.name,c.args),c.expected);
 const codec=valueCodecs[c.name],fields=codec.arguments.descriptor.root.fields,args=Object.fromEntries(fields.map((f,i)=>[f.name,c.args[i]]));
 assert.deepEqual(callBinary(c.name,codec.arguments.encode(args)),codec.result.encode(c.expected));
 assert.deepEqual(callCompact(c.name,codec.arguments.compact().encode(args)),codec.result.compact().encode(c.expected));
}
// Even a false first comparison or unequal extents must evaluate every item
// in the left operand, then every item in the right operand, exactly once.
let reads=[];const row=(label,value)=>({get value(){reads.push(label);return value;}});
assert.equal(call('ordered',[row('a',1),row('b',2),row('c',3),row('d',4)]),false);assert.deepEqual(reads,['a','b','c','d']);
reads=[];assert.equal(call('unequal',[row('a',1),row('b',1),row('c',2)]),false);assert.deepEqual(reads,['a','b','c']);
"#).unwrap();
 let result=Command::new("node").arg(root.join("test.mjs")).output().unwrap();fs::remove_dir_all(root).unwrap();
 assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
}
