use serde_json::json;
use std::{fs, path::Path, process::Command};
use verified_language::{snapshot, state_native, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;
#[test]
fn direct_writer_preserves_all_finite_forms_exact_bytes_and_limits() {
    let source = r#"module typed_snapshots;
 id Identity;
 enum Choice{A,B,}
 record Data{unit:Unit,flag:Bool,small:u32,wide:u64,signed:i32,float:f32,vector:Vec3<f32>,integer:Int,text:String,id:Identity,choice:Choice,list:List<u64>,option:Option<String>,result:Result<u32,String>,}
 state Rows:Table<u64,Data>=Table.empty();event changed:Data;
 change put(key:u64,value:Data)->Unit writes(Rows) emits(changed){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}emit changed(value);return ();}
 "#;
    let program = parse(source).unwrap();
    let mut rt = Runtime::new(program.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for (key, option, result) in [
        (0, json!({"None":null}), json!({"Err":"failure"})),
        (u64::MAX, json!({"Some":"🌍"}), json!({"Ok":u32::MAX})),
    ] {
        let data = json!({"unit":null,"flag":true,"small":u32::MAX,"wide":u64::MAX,"signed":i32::MIN,"float":{"F32Bits":2143289345u32},"vector":[{"F32Bits":2147483648u32},1.25,{"F32Bits":2139095040u32}],"integer":{"Int":"-184467440737095516170"},"text":"héllo 🌍\u{0000}","id":"ffffffffffffffffffffffffffffffff","choice":"Choice.B","list":[0,u64::MAX],"option":option,"result":result});
        let request = json!({"call":"put","args":[key,data]});
        let out = rt.invoke_json("put", &request["args"]).unwrap();
        steps.push(request);
        expected.push(
            json!({"reply":{"outcome":out.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance(
        "typed-snapshot-parity",
        program.clone(),
        source,
        steps.clone(),
        expected,
    );
    let mut code = state_native::emit(&program).unwrap();
    assert!(code.contains("writer.list_length"));
    code.push_str(r#"impl State{pub fn check_json_codec(&self)->Result<(),String>{let layout=snapshot_layout();let tables=vec![self.l_Rows.iter().map(|(k,v)|(k.to_json(),v.to_json())).collect()];let outbox=self.outbox.iter().map(|e|{let EventData::l_changed(ref v)=e.data;portable::Event{commit:e.commit,position:e.position,channel:0,value:v.to_json()}}).collect();let logical=portable::Logical{version:self.version,tables,outbox};for values in 0..120{for depth in 0..8{let limits=SnapshotLimits{values,depth,..SnapshotLimits::default()};let direct=self.checkpoint_with_limits(limits);let reference=portable::encode(&layout,&logical,limits);assert_eq!(direct,reference,"limits {values}/{depth}");}}for values in 0..80{for bytes in 0..160{let limits=SnapshotLimits{values,bytes,..SnapshotLimits::default()};assert_eq!(self.checkpoint_with_limits(limits),portable::encode(&layout,&logical,limits),"combined limits {values}/{bytes}");}}let full=self.checkpoint()?;for values in 0..120{for depth in 0..8{let limits=SnapshotLimits{values,depth,..SnapshotLimits::default()};let direct=State::restore_with_limits(&full,limits).map(|s|s.checkpoint().unwrap());let reference=portable::decode(&layout,&full,limits).map(|s|portable::encode(&layout,&s,SnapshotLimits::default()).unwrap());assert_eq!(direct,reference,"restore limits {values}/{depth}");}}for i in 0..full.len(){let mut bad=full.clone();bad[i]^=1;assert!(State::restore(&bad).is_err());}for end in 0..full.len(){assert!(State::restore(&full[..end]).is_err());}for i in 84..full.len()-32{use sha2::{Digest,Sha256};let mut bad=full.clone();bad[i]^=255;let end=bad.len()-32;let digest=Sha256::digest(&bad[..end]);bad[end..].copy_from_slice(&digest);let direct=State::restore(&bad).map(|s|s.checkpoint().unwrap());let reference=portable::decode(&layout,&bad,SnapshotLimits::default()).map(|s|portable::encode(&layout,&s,SnapshotLimits::default()).unwrap());assert_eq!(direct,reference,"resealed corrupt payload {i}");}for bytes in [0,83,115,full.len()-1,full.len(),full.len()+1]{let limits=SnapshotLimits{bytes,..SnapshotLimits::default()};assert_eq!(self.checkpoint_with_limits(limits),portable::encode(&layout,&logical,limits));}let mut bad=State::restore(&full)?;bad.outbox[0].commit=0;let EventData::l_changed(ref first)=bad.outbox[0].data;let events=bad.outbox.iter().map(|e|{let EventData::l_changed(ref v)=e.data;portable::Event{commit:e.commit,position:e.position,channel:0,value:v.to_json()}}).collect();let bad_logical=portable::Logical{version:bad.version,tables:logical.tables.clone(),outbox:events};assert_eq!(bad.checkpoint(),portable::encode(&layout,&bad_logical,SnapshotLimits::default()));let _=first;let mut huge=State::restore(&full)?;huge.l_Rows.get_mut(&0).unwrap().l_integer=BigInt::from(1u32)<<32769usize;assert!(huge.checkpoint().unwrap_err().contains("Int exceeds"));Ok(())}}"#);
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/typed-snapshot-oracle");
    fs::create_dir_all(root.join("src")).unwrap();
    fs::write(root.join("src/lib.rs"), code).unwrap();
    fs::write(root.join("src/main.rs"),r#"use compiled_state::State;use serde_json::Value;fn main(){let rows:Vec<Value>=serde_json::from_slice(&std::fs::read("script.json").unwrap()).unwrap();let mut state=State::new();for row in rows{state.invoke_json("put",&row["args"]).unwrap();state.check_json_codec().unwrap();}}"#).unwrap();
    fs::write(
        root.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(root.join("Cargo.toml"),"[package]\nname=\"compiled-state\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[dependencies]\nnum-bigint=\"=0.4.8\"\nsha2=\"=0.10.9\"\nserde_json=\"=1.0.151\"\n[workspace]\n").unwrap();
    let out = Command::new(env!("CARGO"))
        .args(["run", "--offline", "--quiet"])
        .current_dir(&root)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let _ = snapshot::layout(&program).unwrap();
}
#[test]
fn recursive_schema_uses_the_shared_checked_codec() {
    let p = parse(include_str!("../examples/recursive-indexed.ink")).unwrap();
    let code = state_native::emit(&p).unwrap();
    let checkpoint = code
        .split("pub fn checkpoint_with_limits")
        .nth(1)
        .unwrap()
        .split("pub fn restore")
        .next()
        .unwrap();
    assert!(checkpoint.contains("portable::encode"));
    assert!(!checkpoint.contains("TypedSnapshotWriter::new"));
    let restore = code
        .split("pub fn restore_with_limits")
        .nth(1)
        .unwrap()
        .split("fn set_")
        .next()
        .unwrap();
    assert!(restore.contains("portable::decode"));
    assert!(!restore.contains("TypedSnapshotReader::new"));
}
