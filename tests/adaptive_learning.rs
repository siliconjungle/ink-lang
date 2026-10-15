use serde_json::json;
use verified_language::{core::CheckedModule, stateful::Runtime, syntax, training};
#[path="support/parity.rs"] mod parity;
const SOURCE:&str=include_str!("../examples/adaptive-layout.ink");

#[test]
fn learning_capabilities_are_checked_after_transport() {
    let p=syntax::parse(SOURCE).unwrap();
    let module=CheckedModule::from_source(p.clone()).unwrap();
    for modifier in ["private trainable state Model", "trainable private state Model"] {
        CheckedModule::from_source(syntax::parse(&SOURCE.replace("trainable state Model",modifier)).unwrap()).unwrap();
    }
    let roundtrip=CheckedModule::from_bytes(&module.bytes().unwrap()).unwrap();
    assert_eq!(roundtrip.program().contracts.learning.trainable,["Model"]);
    for source in [
        SOURCE.replace("learn change observe", "change observe"),
        SOURCE.replace("trainable state Model", "state Model"),
        SOURCE.replace("writes(Model)", "writes(Model,Authored)"),
        format!("{SOURCE}\nchange bypass()->Result<Unit,String> reads(Model) writes(Model) {{return observe(Context{{width:0.0,length:0.0}},0.2,0.1);}}"),
    ] { assert!(syntax::parse(&source).and_then(CheckedModule::from_source).is_err()); }
    let mut forged=p;
    forged.contracts.learning.learn.push("suggest".into());
    assert!(CheckedModule::from_source(forged).unwrap_err().contains("learning action"));
    let mut bytes:serde_json::Value=serde_json::from_slice(&module.bytes().unwrap()).unwrap();
    bytes["program"]["contracts"]["learning"]["learn"]=json!([]);
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&bytes).unwrap()).is_err());
}

fn trace()->training::Trace {
    let contexts=[(0.,0.,0.2),(1.,0.,0.7),(0.,1.,0.7),(1.,1.,0.2)];
    training::Trace{schema:1,epochs:400,observations:contexts.iter().map(|(w,l,t)|training::Observation{
        call:"observe".into(),args:json!([{"width":w,"length":l},t,0.1])}).collect()}
}
#[test]
fn offline_training_learns_interactions_and_restores_exactly() {
    let module=CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let result=training::replay(&module,&trace()).unwrap();
    let again=training::replay(&module,&trace()).unwrap();
    assert_eq!(result.snapshot,again.snapshot);
    let mut rt=Runtime::restore_portable(module.program().clone(),&result.snapshot).unwrap();
    for (w,l,target) in [(0.,0.,0.2),(1.,0.,0.7),(0.,1.,0.7),(1.,1.,0.2),(0.5,0.5,0.45),(0.25,0.75,0.5125)] {
        let value=rt.invoke_json("suggest",&json!([{"width":w,"length":l}])).unwrap().result.json().as_f64().unwrap();
        assert!((value-target).abs()<0.002,"{w},{l}: {value} != {target}");
    }
    assert_eq!(result.receipt["updates"],1600);
    for name in ["authored","suggest","missing"] {
        let mut bad=trace();bad.observations[0].call=name.into();
        assert!(training::replay(&module,&bad).is_err());
    }
    let mut bad=trace();bad.observations[0].args=json!([{"width":0.,"length":0.},0.3,1000.]);
    assert!(training::replay(&module,&bad).unwrap_err().contains("rejected"));
}

#[test]
fn online_learning_preserves_values_errors_events_and_snapshots_across_targets() {
    let source=format!("{SOURCE}\nlearn change rejected()->Result<Unit,String> writes(Model) emits(learned) {{Model=Weights{{bias:7.0,width:7.0,length:7.0,interaction:7.0}};emit learned(7.0);return Err(\"reject\");}}");
    let p=syntax::parse(&source).unwrap();let mut rt=Runtime::new(p.clone()).unwrap();
    let mut steps=vec![];let mut expected=vec![];
    let mut calls=vec![("suggest",json!([{"width":0.2,"length":0.8}])),("authored",json!([42]))];
    for _ in 0..4 {for o in trace().observations {calls.push(("observe",o.args));}}
    calls.extend([("suggest",json!([{"width":0.,"length":0.}])),("suggest",json!([{"width":1.,"length":1.}])),
        ("observe",json!([{"width":0.,"length":0.},0.3,1000.])),("rejected",json!([])),
        ("suggest",json!([{"width":0.,"length":0.}]))]);
    for (name,args) in calls {
        let before=rt.checkpoint_portable().unwrap();
        let result=rt.invoke_json(name,&args).unwrap();
        let snapshot=rt.checkpoint_portable().unwrap();
        if name=="rejected" || (name=="observe" && !result.committed) {assert_eq!(before,snapshot);}
        steps.push(json!({"call":name,"args":args}));expected.push(json!({"reply":{"outcome":result.json()},"snapshot":snapshot}));
    }
    let args=json!([[0.,0.5,1.,-1.],0.25]);
    steps.push(json!({"pure":"batch","args":args,"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.,0.0625,0.25,0.25]},"snapshot":rt.checkpoint_portable().unwrap()}));
    parity::conformance("adaptive-learning",p,&source,steps,expected);
}

#[test]
fn learning_metadata_survives_imports_and_generic_instantiation() {
    use std::fs;
    let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/adaptive-module-test");
    fs::create_dir_all(&dir).unwrap();
    fs::write(dir.join("model.ink"),SOURCE).unwrap();
    fs::write(dir.join("main.ink"),r#"module main; import "model.ink" as model;
        adaptive fn identity<T>(x:T)->T{return x;}
        fn used()->u32{return identity<u32>(7);}
        adaptive query prediction()->f32 reads(model.Model){return model.suggest(model.Context{width:0.5,length:0.5});}
    "#).unwrap();
    let program=verified_language::modules::load(dir.join("main.ink")).unwrap().program;
    let m=CheckedModule::from_source(program).unwrap();
    let d=&m.program().contracts.learning;
    assert_eq!(d.trainable.len(),1);assert_eq!(d.learn.len(),1);
    assert_eq!(d.adaptive.len(),5); // three imported, one query, one instantiated generic
    let mut rt=Runtime::from_checked(&m).unwrap();
    assert!(rt.invoke_json("prediction",&json!([])).is_ok());
}

#[test]
fn offline_cli_exports_a_portable_model_and_receipt() {
    use std::{fs,process::Command};
    let dir=std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/adaptive-cli-test");fs::create_dir_all(&dir).unwrap();
    let trace_path=dir.join("trace.json");let snapshot=dir.join("model.snapshot");
    fs::write(&trace_path,serde_json::to_vec(&trace()).unwrap()).unwrap();
    let out=Command::new(env!("CARGO_BIN_EXE_ink")).args(["train","examples/adaptive-layout.ink"])
        .arg(&trace_path).arg("-o").arg(&snapshot).output().unwrap();
    assert!(out.status.success(),"{}",String::from_utf8_lossy(&out.stderr));
    let receipt:serde_json::Value=serde_json::from_slice(&out.stdout).unwrap();assert_eq!(receipt["updates"],1600);
    // CLI module loading is used here too, so the exact module identity agrees.
    let p=verified_language::modules::load("examples/adaptive-layout.ink").unwrap().program;
    let mut rt=Runtime::restore_portable(p,&fs::read(snapshot).unwrap()).unwrap();
    let value=rt.invoke_json("suggest",&json!([{"width":0.5,"length":0.5}])).unwrap().result.json().as_f64().unwrap();
    assert!((value-0.45).abs()<0.002);
}
