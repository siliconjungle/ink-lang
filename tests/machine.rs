use sha2::{Digest, Sha256};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    library::{self, Bundle, Object},
    logic::{Declaration, Proof, Term},
    machine,
};
fn fixture(rep: &str) -> (Bundle, machine::Package, BTreeMap<String, String>) {
    let path = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("knowledge/research/machine-candidates")
        .join(format!("counter-{rep}"));
    (
        library::bundle(&path.join("lock.json")).unwrap(),
        serde_json::from_slice(&fs::read(path.join("machine.json")).unwrap()).unwrap(),
        serde_json::from_slice(&fs::read(path.join("names.json")).unwrap()).unwrap(),
    )
}
#[test]
fn machine_admission_rejects_missing_evidence_and_rehashed_false_replies() {
    let (mut b, p, _) = fixture("alternative");
    machine::check(&b, &p).unwrap();
    let mut bad = p.clone();
    bad.snapshot = Proof::Refl(Term::Bool(true));
    assert!(machine::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.initialisation.clear();
    assert!(machine::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.operations[0].preservation.clear();
    assert!(machine::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.operations.push(bad.operations[0].clone());
    assert!(machine::check(&b, &bad).is_err());
    let mut bad = p.clone();
    bad.observations = "profile-usually-valid".into();
    assert!(machine::check(&b, &bad).is_err());
    let mut object: Object =
        serde_json::from_str(&b.objects[&p.operations[0].physical_reply]).unwrap();
    if let Declaration::Function { result, body, .. } = &mut object.declaration {
        let verified_language::logic::Sort::Data(id) = result else {
            panic!()
        };
        *body = Term::Construct {
            datatype: id.clone(),
            constructor: 1,
            arguments: vec![],
        };
        object.dependencies = vec![id.clone()];
    } else {
        panic!()
    }
    let raw = serde_json::to_string(&object).unwrap();
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    b.objects.insert(id.clone(), raw);
    b.lock.objects.push(id.clone());
    let mut bad = p;
    bad.operations[0].physical_reply = id;
    bad.bundle_sha256 = format!("{:x}", Sha256::digest(serde_json::to_vec(&b).unwrap()));
    assert!(machine::check(&b, &bad).is_err()); // Valid signature and pin do not prove reply agreement.
}
#[test]
fn sealed_native_and_wasm_machines_preserve_future_calls_abort_events_and_migration() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/machine-protocol-tests");
    fs::create_dir_all(&dir).unwrap();
    let (a, pa, n) = fixture("original");
    let (b, pb, _) = fixture("alternative");
    fs::write(dir.join("a.rs"), machine::emit(&a, &pa).unwrap().source).unwrap();
    fs::write(dir.join("b.rs"), machine::emit(&b, &pb).unwrap().source).unwrap();
    let driver = r#"
mod a { include!("a.rs"); }
mod b { include!("b.rs"); }
fn da(id:&str,c:usize,v:Vec<a::Value>)->a::Value {a::Value::Data{datatype:id.into(),constructor:c,arguments:v}}
fn db(v:&a::Value)->b::Value {match v {a::Value::Bool(x)=>b::Value::Bool(*x),a::Value::U64(x)=>b::Value::U64(*x),a::Value::Data{datatype,constructor,arguments}=>b::Value::Data{datatype:datatype.clone(),constructor:*constructor,arguments:arguments.iter().map(db).collect()}}}
fn events(log:&[(u64,u64)])->a::Value {let mut out=da("EVENTS",0,vec![]);for &(c,s) in log.iter().rev(){out=da("EVENTS",1,vec![da("EVENT",0,vec![a::Value::U64(c),a::Value::U64(s)]),out])}out}
fn state(count:u64,commit:u64,log:&[(u64,u64)])->a::Value{da("LOGICAL",0,vec![a::Value::U64(count),a::Value::U64(commit),events(log)])}
pub fn checks(){
 for seed in 0..32u64 {
  let mut count=if seed%2==0 {u64::MAX-3}else{seed};let mut commit=if seed%3==0 {u64::MAX-2}else{0};let mut log=vec![];
  let initial=state(count,commit,&log);let mut aa=a::Machine::new(&initial).unwrap();let mut bb=b::Machine::new(&db(&initial)).unwrap();
  for i in 0..24u64 {
   let abort=(seed+i)%5==0;let amount=seed.wrapping_mul(0xd1342543de82ef95).wrapping_add(i);
   let tag=if abort {1}else if commit==u64::MAX {2}else{0};
   let expected=if tag==0 {count=count.wrapping_add(amount);commit+=1;log.push((count,commit));da("REPLY",0,vec![a::Value::U64(count),a::Value::U64(commit)])}else{da("REPLY",tag,vec![])};
   let args=vec![a::Value::Bool(abort),a::Value::U64(amount)];
   assert_eq!(aa.apply("change",&args).unwrap(),expected);assert_eq!(bb.apply("change",&args.iter().map(db).collect::<Vec<_>>()).unwrap(),db(&expected));
   let expected_state=state(count,commit,&log);assert_eq!(aa.snapshot(),expected_state);assert_eq!(bb.snapshot(),db(&expected_state));
   assert_eq!(aa.query("count",&[]).unwrap(),a::Value::U64(count));assert_eq!(bb.query("commit",&[]).unwrap(),b::Value::U64(commit));assert_eq!(bb.query("events",&[]).unwrap(),db(&events(&log)));
   if i%8==0 {bb.restore(&db(&aa.snapshot())).unwrap();aa.restore(&expected_state).unwrap();}
   assert!(aa.apply("change",&[a::Value::Bool(false)]).is_err());assert!(bb.apply("change",&[b::Value::U64(0),b::Value::U64(1)]).is_err());
   assert!(aa.restore(&a::Value::Bool(false)).is_err());assert!(bb.restore(&b::Value::U64(0)).is_err());
   assert_eq!(aa.snapshot(),expected_state);assert_eq!(bb.snapshot(),db(&expected_state));
  }
 }
}
fn main(){checks()}
#[no_mangle] pub extern "C" fn run_checks()->u32 {checks();1}
"#;
    let mut code = driver.to_owned();
    for (label, name) in [
        ("EVENTS", "MachineEvents"),
        ("EVENT", "MachineEvent"),
        ("LOGICAL", "LogicalCounter"),
        ("REPLY", "MachineReply"),
    ] {
        code = code.replace(&format!("\"{label}\""), &format!("{:?}", n[name]));
    }
    // include! cannot contain a generated crate-level inner attribute.
    for name in ["a.rs", "b.rs"] {
        let p = dir.join(name);
        let source = fs::read_to_string(&p).unwrap();
        fs::write(
            p,
            source
                .lines()
                .filter(|l| !l.starts_with("#!"))
                .collect::<Vec<_>>()
                .join("\n"),
        )
        .unwrap();
    }
    fs::write(dir.join("driver.rs"), code).unwrap();
    let output = Command::new("rustc")
        .current_dir(&dir)
        .args(["-O", "-A", "warnings", "driver.rs", "-o", "checks"])
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    assert!(Command::new(dir.join("checks")).status().unwrap().success());
    fs::write(dir.join("private.rs"),"mod a {include!(\"a.rs\");} fn corrupt(x:&mut a::Machine){ let _ = &mut x.state; } fn main(){}").unwrap();
    let private = Command::new("rustc")
        .current_dir(&dir)
        .args(["-A", "warnings", "private.rs", "-o", "private"])
        .output()
        .unwrap();
    assert!(!private.status.success());
    assert!(String::from_utf8_lossy(&private.stderr).contains("private"));
    if std::env::var_os("INK_MACHINE_WASM").is_some() {
        let output = Command::new("rustc")
            .current_dir(&dir)
            .args([
                "-O",
                "-A",
                "warnings",
                "--target",
                "wasm32-unknown-unknown",
                "--crate-type",
                "cdylib",
                "-C",
                "panic=abort",
                "driver.rs",
                "-o",
                "checks.wasm",
            ])
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        assert!(Command::new("node").current_dir(&dir).args(["-e","const fs=require('fs'); WebAssembly.instantiate(fs.readFileSync('checks.wasm'),{}).then(({instance})=>{if(instance.exports.run_checks()!==1)process.exit(1)}).catch(e=>{console.error(e);process.exit(1)})"]).status().unwrap().success());
    }
}
