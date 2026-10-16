use ink_core::{core::CheckedModule,eval,syntax::parse};
use serde_json::{json,Value};
use std::{fs,process::Command};

#[test]
fn typed_state_equalities_match_reference_raw_float_bits() {
    let source=r#"module state_equalities;
record Row { bits:List<f32>, flag:Bool, }
fn scalar(a:f32,b:f32)->Bool {return a==b;}
fn lists(a:List<f32>,b:List<f32>)->Bool {return a==b;}
fn rows(a:Row,b:Row)->Bool {return a==b;}
query q_scalar(a:f32,b:f32)->Bool {return a==b;}
query q_lists(a:List<f32>,b:List<f32>)->Bool {return a==b;}
query q_rows(a:Row,b:Row)->Bool {return a==b;}
"#;
    let module=CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let mut cases=Vec::<Value>::new();
    for (a,b) in [(0u32,0x80000000u32),(0x7fc12345,0x7fc12345),(0x7fc12345,0x7fc12346),(0x3fc00000,0x3fc00000)] {
        let pair=[json!({"F32Bits":a}),json!({"F32Bits":b})];
        for name in ["scalar","lists","rows"] {
            let args=match name {"scalar"=>json!(pair),"lists"=>json!([[pair[0].clone()],[pair[1].clone()]]),_=>json!([{"bits":[pair[0].clone()],"flag":true},{"bits":[pair[1].clone()],"flag":true}])};
            let f=module.program().functions.iter().find(|f|f.name==name).unwrap();
            let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,module.program()).unwrap()).collect();
            let expected=eval::call(module.program(),name,values,&mut 1_000_000).unwrap().json();
            cases.push(json!({"name":name,"args":args,"expected":expected}));
        }
    }
    let emitted=ink_lowering_js::lower(&module).unwrap();
    assert!(emitted.javascript.contains("__stateValueEqual"));
    let root=std::env::temp_dir().join(format!("ink-state-equality-{}",std::process::id()));fs::create_dir_all(&root).unwrap();
    fs::write(root.join("program.mjs"),emitted.javascript).unwrap();fs::write(root.join("cases.json"),serde_json::to_vec(&cases).unwrap()).unwrap();
    fs::write(root.join("test.mjs"),r#"import assert from 'node:assert/strict';import fs from 'node:fs';import {createState,call}from './program.mjs';const state=createState();for(const c of JSON.parse(fs.readFileSync(new URL('cases.json',import.meta.url)))){assert.equal(call(c.name,c.args),c.expected);assert.equal((await state.invoke_json('q_'+c.name,c.args)).result,c.expected);}"#).unwrap();
    let output=Command::new("node").arg(root.join("test.mjs")).output().unwrap();fs::remove_dir_all(root).unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
}
