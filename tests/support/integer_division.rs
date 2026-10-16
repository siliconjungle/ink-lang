use super::{optimisation,parity,syntax,CheckedModule,Runtime};
use serde_json::json;
use std::{fs,path::Path,process::Command};
#[test]
fn signed_and_unsigned_division_refinements_keep_exact_values_strict_work_and_device_execution(){
    let root=Path::new(env!("CARGO_MANIFEST_DIR"));let output=root.join("build/v8-integer-input");fs::create_dir_all(&output).unwrap();
    let checked=Command::new("python3").arg(root.join("knowledge/tests/test_v8_integer_laws.py")).arg(&output)
        .env("PYTHONPATH",std::env::join_paths([root.join("knowledge"),root.join("planner")]).unwrap())
        .env("INK_COMPILER",env!("CARGO_BIN_EXE_ink")).current_dir(root).output().unwrap();
    assert!(checked.status.success(),"{}",String::from_utf8_lossy(&checked.stderr));
    let source=include_str!("../../knowledge/tests/fixtures/v8-integer/source.ink");let original=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let package=serde_json::from_slice(&fs::read(output.join("selection.json")).unwrap()).unwrap();let selected=optimisation::check(&original,&package).unwrap();
    let snapshot=Runtime::new_selected(&selected).unwrap().checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
    use verified_language::eval::Value::{I32,U32,U64,List};
    let mut push=|name:&str,args:Vec<verified_language::eval::Value>,gpu:bool|{
        let result=verified_language::eval::call(original.program(),name,args.clone(),&mut 1_000_000).unwrap();
        steps.push(json!({"pure":name,"args":args.iter().map(|x|x.json()).collect::<Vec<_>>(),"cpu_only":!gpu,"expect_gpu":gpu}));
        expected.push(json!({"reply":{"value":result.json()},"snapshot":snapshot}));
    };
    for x in [i32::MIN,-9,0,9,i32::MAX]{for name in ["strict_zero","strict_self","lazy_default"]{push(name,vec![I32(x)],false);}}
    for n in [0,4,257]{
        let values=[i32::MIN,i32::MIN+1,-1073741825,-9,-8,-7,-1,0,1,7,8,9,i32::MAX];
        let signed=List((0..n).map(|i|I32(values[i%values.len()])).collect());
        for fallback in [i32::MIN,-73,0,73,i32::MAX]{
            for name in ["signed_quot","signed_rem","negative_quot","negative_rem","minus_quot","minus_rem","minimum_quot","minimum_rem"]{
                push(name,vec![signed.clone(),I32(fallback)],n!=0);
            }
        }
        push("sign_fill",vec![signed],n!=0);
        for name in ["unsigned_quot","unsigned_rem"]{push(name,vec![List((0..n).map(|i|U32([0,1,7,8,1<<31,u32::MAX][i%6])).collect())],n!=0);}
        for name in ["wide_quot","wide_rem"]{push(name,vec![List((0..n).map(|i|U64([0,1,7,8,u32::MAX as u64,1<<32,1<<63,u64::MAX][i%8])).collect())],n!=0);}
    }
    assert_eq!(steps.len(),150);parity::conformance_selected("v8-integer-parity",&selected,source,steps,expected);
}
