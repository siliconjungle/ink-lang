use serde_json::{json,Value};
use std::{fs, process::Command};

#[test]
fn explicit_reference_budget_is_bounded_and_preserves_results() {
    let dir = std::env::temp_dir().join(format!("ink-reference-budget-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let source = dir.join("main.ink");
    let args = dir.join("args.json");
    fs::write(&source, "module reference_budget; fn f(x:u32)->u32{return x+x;}").unwrap();
    fs::write(&args, "[7]").unwrap();
    let invoke = |budget: Option<&str>| {
        let mut command = Command::new(env!("CARGO_BIN_EXE_ink"));
        command.arg("run").arg(&source).arg("f").arg(&args);
        if let Some(value) = budget { command.args(["--evaluation-budget", value]); }
        command.output().unwrap()
    };
    let baseline = invoke(None);
    assert!(baseline.status.success());
    assert_eq!(String::from_utf8_lossy(&baseline.stdout).trim(), "14");
    let explicit = invoke(Some("1000"));
    assert!(explicit.status.success());
    assert_eq!(explicit.stdout, baseline.stdout);
    let exhausted_receipt=Command::new(env!("CARGO_BIN_EXE_ink")).arg("run").arg(&source).arg("f").arg(&args)
        .args(["--input-receipt","--evaluation-budget","1"]).output().unwrap();
    assert!(!exhausted_receipt.status.success());assert!(exhausted_receipt.stdout.is_empty());
    assert!(String::from_utf8_lossy(&exhausted_receipt.stderr).contains("evaluation budget exhausted"));
    let exhausted = invoke(Some("1"));
    assert!(!exhausted.status.success());
    assert!(String::from_utf8_lossy(&exhausted.stderr).contains("evaluation budget exhausted"));
    for invalid in ["0", "-1", "invalid", "10000000001"] {
        let result = invoke(Some(invalid));
        assert!(!result.status.success(), "accepted {invalid}");
        assert!(String::from_utf8_lossy(&result.stderr).contains("evaluation budget"));
    }
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn reference_receipts_bind_decoded_values_and_source_without_changing_plain_run() {
    let dir=std::env::temp_dir().join(format!("ink-reference-input-receipt-{}",std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let source=dir.join("source.ink");let args=dir.join("args.json");
    let text="module receipt_inputs; record Row { sample:f32, word:u64, }\n\
        fn floating(x:f32)->f32{return x;} fn other(x:f32)->f32{return x;}\n\
        fn word(x:u64)->u64{return x;}\n\
        fn nested(xs:List<Row>,lanes:Vec2<f32>,option:Option<f32>)->Bool{return true;}";
    fs::write(&source,text).unwrap();
    let invoke=|name:&str,input:Value,receipt:bool| {
        fs::write(&args,serde_json::to_vec(&input).unwrap()).unwrap();
        let mut c=Command::new(env!("CARGO_BIN_EXE_ink"));c.arg("run").arg(&source).arg(name).arg(&args);
        if receipt{c.arg("--input-receipt");}
        c.output().unwrap()
    };
    let observe=|name:&str,input:Value| {
        let plain=invoke(name,input.clone(),false);let observed=invoke(name,input,true);
        assert!(plain.status.success(),"{}",String::from_utf8_lossy(&plain.stderr));
        assert!(observed.status.success(),"{}",String::from_utf8_lossy(&observed.stderr));
        let plain:Value=serde_json::from_slice(&plain.stdout).unwrap();let receipt:Value=serde_json::from_slice(&observed.stdout).unwrap();
        assert_eq!(receipt["schema"],1);assert_eq!(receipt["semantics"],"ink-reference-call-v1");
        assert_eq!(receipt["function"],name);assert_eq!(receipt["value"],plain);
        assert_eq!(receipt["input_core_sha256"],receipt["selected_core_sha256"]);
        assert_eq!(receipt["input_sha256"].as_str().unwrap().len(),64);
        receipt
    };
    let first=observe("floating",json!([1.1]));
    let core=dir.join("core.json");
    let emitted=Command::new(env!("CARGO_BIN_EXE_ink")).arg("emit-core").arg(&source).arg("-o").arg(&core).output().unwrap();
    assert!(emitted.status.success(),"{}",String::from_utf8_lossy(&emitted.stderr));
    fs::write(&args,"[1.1]").unwrap();
    let from_core=Command::new(env!("CARGO_BIN_EXE_ink")).arg("run").arg(&core).arg("floating").arg(&args)
        .args(["--core","--input-receipt"]).output().unwrap();
    assert!(from_core.status.success(),"{}",String::from_utf8_lossy(&from_core.stderr));
    assert_eq!(serde_json::from_slice::<Value>(&from_core.stdout).unwrap(),first);
    for alias in [json!([1.10000001]),json!([{"F32Bits":0x3f8ccccdu32}])] {
        assert_eq!(first["input_sha256"],observe("floating",alias)["input_sha256"]);
    }
    assert_ne!(first["input_sha256"],observe("floating",json!([1.2]))["input_sha256"]);
    assert_ne!(first["input_sha256"],observe("other",json!([1.1]))["input_sha256"]);
    assert_ne!(observe("floating",json!([0.0]))["input_sha256"],observe("floating",json!([-0.0]))["input_sha256"]);
    assert_ne!(observe("floating",json!([{"F32Bits":0x7fc12345u32}]))["input_sha256"],
               observe("floating",json!([{"F32Bits":0x7fc12346u32}]))["input_sha256"]);
    assert_ne!(observe("word",json!([1u64<<53]))["input_sha256"],observe("word",json!([(1u64<<53)+1]))["input_sha256"]);
    observe("word",json!([u64::MAX]));
    let nested=observe("nested",json!([[{"sample":1.1,"word":u64::MAX}],[1.1,-0.0],{"Some":1.1}]));
    assert_eq!(nested["input_sha256"],observe("nested",json!([[{"word":u64::MAX,"sample":{"F32Bits":0x3f8ccccdu32}}],
        [{"F32Bits":0x3f8ccccdu32},{"F32Bits":0x80000000u32}],{"Some":{"F32Bits":0x3f8ccccdu32}}]))["input_sha256"]);
    fs::write(&source,text.replace("module receipt_inputs;","module receipt_inputs_changed;")).unwrap();
    assert_ne!(first["input_core_sha256"],observe("floating",json!([1.1]))["input_core_sha256"]);
    assert_ne!(first["input_sha256"],observe("floating",json!([1.1]))["input_sha256"]);
    for input in [json!([1.0,2.0]),json!([{"F32Bits":4294967296u64}]),json!([{"F32Bits":0,"extra":1}])] {
        let plain=invoke("floating",input.clone(),false);let observed=invoke("floating",input,true);
        assert!(!plain.status.success());assert!(!observed.status.success());assert!(observed.stdout.is_empty());
    }
    let bad=Command::new(env!("CARGO_BIN_EXE_ink")).arg("check").arg(&source).arg("--input-receipt").output().unwrap();
    assert!(!bad.status.success());assert!(String::from_utf8_lossy(&bad.stderr).contains("only for reference run"));
    fs::remove_dir_all(dir).unwrap();
}
