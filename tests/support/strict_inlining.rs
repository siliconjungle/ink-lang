use super::{optimisation, parity, syntax, CheckedModule, Runtime};
use serde_json::json;
use std::{fs,path::Path,process::Command};

#[test]
fn strict_inlining_preserves_complete_arguments_values_and_device_work() {
    let root=Path::new(env!("CARGO_MANIFEST_DIR"));
    let output=root.join("build/strict-inlining-input");fs::create_dir_all(&output).unwrap();
    let result=Command::new("python3").arg(root.join("knowledge/tests/test_strict_inlining.py")).arg(&output)
        .env("PYTHONPATH",std::env::join_paths([root.join("knowledge"),root.join("planner")]).unwrap())
        .env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")).current_dir(root).output().unwrap();
    assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    let source=include_str!("../../knowledge/tests/fixtures/strict-inlining/source.ink");
    let input=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let package=serde_json::from_slice(&fs::read(output.join("selection.json")).unwrap()).unwrap();
    let selected=optimisation::check(&input,&package).unwrap();
    let snapshot=Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
    let mut steps=vec![];let mut expected=vec![];
    use verified_language::eval::Value::{U32,U64,F32,Bool,List};
    let mut push=|name:&str,args:Vec<verified_language::eval::Value>,gpu:bool|{
        let value=verified_language::eval::call(input.program(),name,args.clone(),&mut 1_000_000).unwrap();
        steps.push(json!({"pure":name,"args":args.iter().map(|v|v.json()).collect::<Vec<_>>(),"cpu_only":!gpu,"expect_gpu":gpu}));
        expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
    };
    for seed in [0,1,u32::MAX as u64,1u64<<32,1u64<<63,u64::MAX-1,u64::MAX] {
        push("tail",vec![U64(seed)],false);
        for gate in [false,true] {
            push("strict",vec![U64(seed),Bool(gate)],false);
            push("lazy",vec![U32(seed as u32),Bool(gate)],false);
        }
    }
    for n in [0,4,513] {
        let xs=(0..n).map(|i|U64([0,1,1u64<<63,u64::MAX][i%4])).collect::<Vec<_>>();
        for offset in [0,1,u64::MAX] {push("nested",vec![List(xs.clone()),U64(offset)],n!=0);}
        push("converted",vec![List(xs)],n!=0);
        let bits=[0,0x80000000,1,0x80000001,0x007fffff,0x00800000,0x7f7fffff,0xff7fffff,0x7f800000,0xff800000,0x7f800001,0xff800001,0x7fc01234,0xffc04321];
        push("untouched",vec![List((0..n).map(|i|F32(bits[i%bits.len()])).collect())],n!=0);
    }
    assert_eq!(steps.len(),50);
    parity::conformance_selected("strict-inlining-parity",&selected,source,steps,expected);
}
