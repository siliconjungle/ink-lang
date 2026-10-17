use serde_json::json;
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, planning, stateful::Runtime, syntax};
#[path = "support/parity.rs"]
mod parity;

#[test]
fn mutable_graph_specialization_preserves_live_code_weights_and_transactions() {
    check_mutable_graph_specialization(false);
}

#[test]
fn generated_guard_preserves_live_code_weights_and_transactions() {
    check_mutable_graph_specialization(true);
}

fn check_mutable_graph_specialization(generated_guard: bool) {
    let literal = (0..32).map(|i| format!("Node{{kind:Kind.{},wire:{i},weight:{}}}",
        if i%2==0 {"Add"} else {"Multiply"},i%2)).collect::<Vec<_>>().join(",");
    let mut source = include_str!("../knowledge/tests/fixtures/owned-frozen-source.ink").to_owned();
    if generated_guard {
        source = source.replace("state Code:", "trainable state Code:");
    }
    if !generated_guard {
        source = source.replace("return evaluate(Code.get", "return adaptive(Code.get")
            .replace("let result=evaluate(Code.get", "let result=adaptive(Code.get");
        source += &format!("\nfn chosen(weights:List<f32>,input:List<f32>)->List<f32>{{return evaluate([{literal}],weights,input);}}\n");
        source += &format!("fn adaptive(code:List<Node>,weights:List<f32>,input:List<f32>)->List<f32>{{return choose(code==[{literal}],chosen(weights,input),evaluate(code,weights,input));}}\n");
    }
    source += if generated_guard {"learn change recode(code:List<Node>)->Unit writes(Code){Code.put(0,code);return ();}\n"}
        else {"change recode(code:List<Node>)->Unit writes(Code){Code.put(0,code);return ();}\n"};
    let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    assert!(module.program().frozen.is_empty());
    if generated_guard {
        assert!(module.program().contracts.learning.trainable.iter().any(|name|name=="Code"));
        assert!(module.program().contracts.learning.learn.iter().any(|name|name=="recode"));
    }
    let distribution = std::env::var_os("INK_DISTRIBUTION").map(std::path::PathBuf::from)
        .unwrap_or_else(||Path::new(env!("CARGO_MANIFEST_DIR")).to_path_buf());
    let label = if generated_guard {"generated-guard-specialization"} else {"mutable-function-specialization"};
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build").join(label);
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("core.json"),module.bytes().unwrap()).unwrap();
    let compiler=std::env::var_os("INK_COMPILER").map(std::path::PathBuf::from)
        .unwrap_or_else(||Path::new(env!("CARGO_BIN_EXE_ink")).to_path_buf());
    let graph=(0..32).map(|i|json!({"kind":if i%2==0 {"Kind.Add"} else {"Kind.Multiply"},
        "wire":i,"weight":i%2})).collect::<Vec<_>>();
    fs::write(root.join("configuration.json"),serde_json::to_vec(&graph).unwrap()).unwrap();
    let mut producer = Command::new("python3");
    producer.arg(distribution.join(if generated_guard {"knowledge/producers/guarded_specialization.py"}
        else {"knowledge/producers/function_specialization.py"})).arg(root.join("core.json"));
    if generated_guard {
        producer.args(["--function","evaluate","--parameter","code","--value"])
            .arg(root.join("configuration.json"));
    } else {
        producer.args(["--functions","chosen"]);
    }
    let output = producer.arg("--ink")
        .arg(compiler).arg("-o").arg(root.join("plan.json"))
        .env("PYTHONPATH",format!("{}:{}",distribution.join("knowledge").display(),distribution.join("planner").display()))
        .output().unwrap();
    assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
    eprintln!("{label}: load checked proposal");
    let package=planning::from_bytes(&fs::read(root.join("plan.json")).unwrap()).unwrap();
    eprintln!("{label}: replay plan");
    let selected=planning::check(&module,&package).unwrap();
    assert_eq!(package.steps.len(),if generated_guard {4} else {2});
    assert!(selected.module().program().frozen.is_empty());
    let mut changed=graph.clone();changed[0]["kind"]=json!("Kind.Multiply");
    let mut runtime=Runtime::new(module.program().clone()).unwrap();
    let mut steps=vec![json!({"restore":runtime.checkpoint_portable().unwrap()})];
    let mut expected=vec![];
    for graph in [graph.clone(),vec![],vec![json!({"kind":"Kind.Add","wire":u32::MAX,"weight":0})],changed,graph] {
        let mut calls=vec![("recode",json!([graph]))];
        for weights in [json!([]),json!([0.5,2.0]),json!([{"F32Bits":2147483648u32},{"F32Bits":2141196852u32}])] {
            calls.push(("retune",json!([weights])));
            for input in [json!([]),json!([1.0]),json!([{"F32Bits":2147483648u32}]),
                json!([{"F32Bits":1}]),json!([{"F32Bits":2139095040u32}]),
                json!([{"F32Bits":2139095041u32}]),json!([{"F32Bits":4290777652u32}])] {
                calls.extend([("serve",json!([input])),("frame",json!([input,false])),("frame",json!([input,true]))]);
            }
        }
        for (name,args) in calls {
            let before=runtime.checkpoint_portable().unwrap();
            let outcome=runtime.invoke_json(name,&args).unwrap();
            let snapshot=runtime.checkpoint_portable().unwrap();
            if name=="frame" {
                assert_eq!(outcome.committed,args[1]==false);
                if args[1]==true {assert_eq!(before,snapshot);assert!(outcome.events.is_empty());}
                else {assert_eq!(outcome.events.len(),1);}
            }
            steps.push(json!({"call":name,"args":args}));
            expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":snapshot}));
        }
        let snapshot=runtime.checkpoint_portable().unwrap();
        steps.push(json!({"restore":snapshot}));
        runtime=Runtime::restore_portable_checked(&module,&snapshot).unwrap();
    }
    assert_eq!(expected.len(),335);
    assert_eq!(steps.len(),341);
    eprintln!("{label}: initialize selected JavaScript");
    let seed=runtime.checkpoint_portable().unwrap();
    verified_language::compiled_plans::build_initialized(&selected,"javascript",&root.join("initialized.mjs"),&seed,None).unwrap();
    fs::write(root.join("check-initialized.mjs"),r#"import assert from 'node:assert/strict';
import fs from 'node:fs';import {createState} from './initialized.mjs';
const state=await createState();
assert.deepEqual(Array.from(await state.checkpoint()),Array.from(fs.readFileSync(new URL('./initialized.mjs.initial.snapshot',import.meta.url))));
"#).unwrap();
    let initialized=Command::new("node").arg(root.join("check-initialized.mjs")).output().unwrap();
    assert!(initialized.status.success(),"{}",String::from_utf8_lossy(&initialized.stderr));
    eprintln!("{label}: compare complete reference/native/JavaScript/Wasm histories");
    parity::conformance_planned(&format!("{label}-parity"),&selected,&source,steps,expected);
}
