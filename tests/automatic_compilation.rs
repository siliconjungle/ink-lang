use serde_json::json;
use std::{fs,path::Path,process::Command};
use verified_language::{core::CheckedModule,eval,modules,planning,stateful::Runtime};
#[path="support/parity.rs"] mod parity;

#[test]
fn automatic_choices_preserve_wrapping_float_order_errors_and_snapshots() {
    let root=Path::new(env!("CARGO_MANIFEST_DIR"));
    let source=root.join("bench/automatic-planning/correctness.ink");
    let output=root.join("build/automatic-compilation-parity");
    let result=Command::new("python3").current_dir(root)
        .env("PYTHONPATH",format!("{}:{}",root.join("knowledge").display(),root.join("planner").display()))
        .arg(root.join("planner/tests/emit_automatic_fixture.py"))
        .arg(env!("CARGO_BIN_EXE_ink")).arg(&source).arg(&output).output().unwrap();
    assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    let program=modules::load(&source).unwrap().program;
    let module=CheckedModule::from_source(program.clone()).unwrap();
    let packet=serde_json::from_slice(&fs::read(output.join("plan.json")).unwrap()).unwrap();
    let plan=planning::check(&module,&packet).unwrap();
    let alternate_packet=serde_json::from_slice(&fs::read(output.join("conformance-plan.json")).unwrap()).unwrap();
    let alternate=planning::check(&module,&alternate_packet).unwrap();
    assert!(!alternate.package().steps.is_empty(),"automatic discovery must admit a checked alternative");
    let runtime=Runtime::new(program.clone()).unwrap();
    let mut steps=vec![];let mut expected=vec![];
    for (name,args) in [
        ("run",json!([[],0])),
        ("run",json!([[0,2,4294967295u32],0])),
        ("run",json!([[0,2,4294967295u32],2])),
        ("run",json!([[0,2,4294967295u32],4294967295u32])),
        ("ordered",json!([[16777216.0,1.0,-16777216.0]])),
        ("ordered",json!([[-0.0,0.0,-0.0]])),
        ("require_nonzero",json!([0])),
        ("require_nonzero",json!([4294967295u32])),
    ] {
        let function=program.functions.iter().find(|f|f.name==name).unwrap();
        let values=args.as_array().unwrap().iter().zip(&function.params)
            .map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
        let value=eval::call(&program,name,values,&mut 1000000).unwrap().json();
        if name=="ordered" {assert_eq!(value,json!(0.0));}
        if name=="require_nonzero"&&args==json!([0]) {assert_eq!(value,json!({"Err":"zero"}));}
        steps.push(json!({"pure":name,"args":args}));
        expected.push(json!({"reply":{"value":value},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    parity::conformance_planned("automatic-compilation-parity",&plan,&fs::read_to_string(source).unwrap(),steps.clone(),expected.clone());
    if packet!=alternate_packet {
        parity::conformance_planned("automatic-compilation-alternative",&alternate,&fs::read_to_string(source).unwrap(),steps,expected);
    }
}
