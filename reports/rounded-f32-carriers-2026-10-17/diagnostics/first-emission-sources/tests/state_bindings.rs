use ink_core::{core::CheckedModule, stateful::Runtime, syntax::{self, Expr, Statement, Type}};
use serde_json::json;
use std::{fs, process::Command};

#[test]
fn expression_binding_blocks_preserve_snapshots_shadowing_strict_order_and_lazy_failure() {
    let source = r#"module scoped_actions;
state Values:Table<u64,f64>=Table.empty();
state Count:Table<u64,u64>=Table.empty();
event Seen:f64;
change tick(value:f64,fail:Bool)->Result<f64,u32> reads(Count) writes(Values,Count) emits(Seen) {
 Values.put(0,value);Count.put(0,Count.get(0).unwrap_or(0)+1);emit Seen(value);
 if fail {return Err(9);}return Ok(value);
}
change operate(x:f64,y:f64,first:Bool,second:Bool,flag:Bool)->Result<List<u64>,u32>
 reads(Count) writes(Values,Count) emits(Seen) {return Ok([]);}
change nudge(value:f64)->f64 reads(Count) writes(Values,Count) emits(Seen) {
 Values.put(0,value);Count.put(0,Count.get(0).unwrap_or(0)+1);emit Seen(value);return value;
}
change remember(value:f64)->Bool reads(Count) writes(Values,Count) emits(Seen) {nudge(value);return true;}
change ordered(x:f64,y:f64)->f64 reads(Count) writes(Values,Count) emits(Seen) {return x;}
change lazy(x:f64,y:f64,flag:Bool)->Bool reads(Count) writes(Values,Count) emits(Seen) {return flag;}
"#;
    let mut p = syntax::parse(source).unwrap();
    let var = |name: &str| Expr::Var(name.into());
    let tick = |value, fail| Expr::Try(Box::new(Expr::Call("tick".into(), vec![value, fail])));
    let bits = |value| Expr::Call("f64_bits".into(), vec![value]);
    let sum = Expr::Binary("+".into(), Box::new(var("copy")), Box::new(var("value")));
    let chosen = Expr::Call("choose".into(), vec![var("flag"),
        Expr::Call("Ok".into(), vec![Expr::Call("list".into(), vec![bits(var("copy")), bits(var("value")), bits(sum)])]),
        Expr::Call("Ok".into(), vec![Expr::Call("list".into(), vec![bits(tick(var("y"), Expr::Bool(true)))])]),
    ]);
    let bind = |name: &str, value, body| Expr::Let(name.into(), Some(Box::new(Type::F64)), Box::new(value), Box::new(body));
    p.actions.iter_mut().find(|a| a.name == "operate").unwrap().body = vec![Statement::Return(
        bind("value", tick(var("x"), var("first")),
            bind("copy", var("value"), bind("value", tick(var("y"), var("second")), chosen))))];
    let nudge = |name: &str| Expr::Call("nudge".into(),vec![var(name)]);
    let left = bind("value", nudge("x"), bind("copy", var("value"), bind("value", nudge("y"),
        Expr::Binary("+".into(),Box::new(var("copy")),Box::new(var("value"))))));
    p.actions.iter_mut().find(|a|a.name=="ordered").unwrap().body=vec![Statement::Return(
        Expr::Binary("+".into(),Box::new(left),Box::new(nudge("x"))))];
    p.actions.iter_mut().find(|a|a.name=="lazy").unwrap().body=vec![Statement::Return(
        Expr::Binary("&&".into(),Box::new(bind("unused",nudge("x"),var("flag"))),
            Box::new(Expr::Call("remember".into(),vec![var("y")]))))];
    let module = CheckedModule::from_source(p).unwrap();
    let mut reference = Runtime::from_checked(&module).unwrap();
    let numbers = [0u64, 1 << 63, 1, 0x3ff0000000000001, 0x7ff0000000000000, 0x7ff0000000001234];
    let mut cases = vec![];
    for (i, bits) in numbers.into_iter().enumerate() {
        for (first, second, flag) in [(false,false,true),(true,false,true),(false,true,true),(false,false,false)] {
            let x=json!({"F64Bits":bits.to_string()});let y=json!({"F64Bits":numbers[(i+1)%numbers.len()].to_string()});
            for (name,args) in [("operate",json!([x,y,first,second,flag])),("ordered",json!([x,y])),("lazy",json!([x,y,flag]))] {
            let reply = reference.invoke_json(name, &args).unwrap();
            let mut expected = reply.json();
            if let Some(words) = expected.get_mut("result").and_then(|r|r.get_mut("Ok")).and_then(|v|v.as_array_mut()) {
                for word in words { *word = json!(word.as_u64().unwrap().to_string()); }
            }
            cases.push(json!({"call":name,"args":args,"reply":expected,"snapshot":reference.checkpoint_portable().unwrap()}));
            }
        }
    }
    let root = std::env::temp_dir().join(format!("ink-state-bindings-{}",std::process::id()));
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"), ink_lowering_js::lower(&module).unwrap().javascript).unwrap();
    fs::write(root.join("cases.json"), serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(root.join("test.mjs"), r#"
import assert from 'node:assert/strict';import fs from 'node:fs';import * as m from './program.mjs';
const cases=JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)));
const normalize=v=>typeof v==='bigint'?String(v):typeof v==='number'&&Number.isInteger(v)?(Object.is(v,-0)?'negative zero':String(v)):Array.isArray(v)?v.map(normalize):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normalize(x)])):v;
for(const prepared of [false,true]){
 const state=m.createState();
 for(const entry of cases){
  const reply=prepared?state.invokePrepared(state.prepare(entry.call,entry.args)):state.invoke(entry.call,entry.args);
  assert.deepEqual(normalize(reply),normalize(entry.reply));
  assert.deepEqual([...await state.checkpoint()],entry.snapshot);
 }
}
console.log(`${cases.length} complete histories per call mode; raw bits, event order, rollback and snapshots`);
"#).unwrap();
    let output = Command::new("node").arg(root.join("test.mjs")).output().unwrap();
    assert!(output.status.success(), "{}{}",String::from_utf8_lossy(&output.stdout),String::from_utf8_lossy(&output.stderr));
    println!("{}",String::from_utf8_lossy(&output.stdout));
}
