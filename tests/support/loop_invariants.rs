use super::{parity,optimisation,syntax,CheckedModule,Runtime};
use serde_json::json;
use std::{fs,path::PathBuf,process::Command};

#[test]
fn guarded_loop_invariants_preserve_all_cpu_values() {
    let root=PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let output=root.join("build/loop-invariant-parity");
    fs::create_dir_all(&output).unwrap();
    let pythonpath=std::env::join_paths([root.join("knowledge"),root.join("planner")]).unwrap();
    for args in [vec!["-m","unittest","discover","-s","knowledge/tests","-p","test_guarded_hoist_search.py"],
        vec!["-m","unittest","discover","-s","knowledge/tests","-p","test_loop_invariants.py"],
        vec!["knowledge/tests/test_loop_invariants.py",output.to_str().unwrap()]] {
        let result=Command::new("python3").args(args).current_dir(&root)
            .env("PYTHONPATH",&pythonpath).env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")).output().unwrap();
        assert!(result.status.success(),"{}",String::from_utf8_lossy(&result.stderr));
    }
    let source=include_str!("../../knowledge/tests/fixtures/loop-invariants/source.ink");
    let input=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let packet:optimisation::Package=serde_json::from_slice(&fs::read(output.join("selection.json")).unwrap()).unwrap();
    let selected=optimisation::check(&input,&packet).unwrap();
    assert_eq!(packet.applications.len(),13);
    let snapshot=Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();
    let mut steps=vec![];let mut expected=vec![];
    use verified_language::eval::Value::{U32,U64,I32,F32,Bool,List};
    let mut push=|function:&str,args:Vec<verified_language::eval::Value>| {
        let value=verified_language::eval::call(input.program(),function,args.clone(),&mut 1_000_000).unwrap();
        steps.push(json!({"pure":function,"args":args.iter().map(|v|v.json()).collect::<Vec<_>>(),"cpu_only":true}));
        expected.push(json!({"reply":{"value":value.json()},"snapshot":snapshot}));
    };
    for xs in [vec![],vec![0,1,7,u32::MAX]] {
        for ys in [vec![],vec![u32::MAX,3,19]] {
            let base=vec![List(xs.iter().map(|x|U32(*x)).collect()),List(ys.iter().map(|x|U32(*x)).collect())];
            for name in ["mapped","filtered","booleans","captured","prepared","prepared_dependent"] {push(name,base.clone());}
            for name in ["folded","right","nested"] {let mut args=base.clone();args.push(U32(u32::MAX));push(name,args);}
            for c in [false,true] {let mut args=base.clone();args.push(Bool(c));push("whole_choice",args);}
            push("wide",vec![List(xs.iter().map(|x|U64(u64::MAX-*x as u64)).collect()),List(ys.iter().map(|x|U64(*x as u64)).collect())]);
            push("signed",vec![List(xs.iter().map(|x|I32(*x as i32)).collect()),List(ys.iter().map(|x|I32(*x as i32)).collect())]);
        }
    }
    for bits in [0,0x8000_0000,0x3fa0_0000,0x7f80_0000,0xff80_0000,0x7fc0_1234,0x7fa0_4321] {
        for indices in [vec![],vec![U32(0),U32(1),U32(2),U32(u32::MAX)]] {
            push("prepared_float",vec![List(indices),List(vec![F32(bits),F32(0x8000_0000),F32(0x3f80_0000)])]);
        }
        for xs in [vec![],vec![F32(bits),F32(0x8000_0000),F32(0x3f80_0000)]] {
            for ys in [vec![],vec![F32(bits),F32(0x3f80_0000)]] {
                push("floats",vec![List(xs.clone()),List(ys),F32(bits)]);
            }
        }
    }
    parity::conformance_selected("v8-loop-invariants",&selected,source,steps,expected);
}
