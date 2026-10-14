use serde_json::json;
use std::{fs, path::Path, process::Command};
use verified_language::{eval, stateful::Runtime, syntax};
// All child suites share this module and its GPU artifact mutex. Defining a
// separate parity module in each child gives each one a separate lock.
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../core/tests/fixtures/physical-capabilities.ink");
#[test]
fn nested_column_owners_compile_and_preserve_integer_and_float_payloads() {
    use verified_language::{core::CheckedModule, physical, planning, registry};
    let source = format!("{SOURCE}\nrecord Owner {{data:Buffer<Particle>,}}\nrecord FloatOwner {{data:Buffer<Signal>,}}\nfn nested(xs:List<Particle>)->List<Particle>{{let owner=Owner{{data:buffer(xs)}};return owner.data.freeze();}}\nfn nested_float(xs:List<Signal>)->List<Signal>{{let owner=FloatOwner{{data:buffer(xs)}};return owner.data.freeze();}}\n");
    let m=CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let package:planning::Package=serde_json::from_slice(include_bytes!("../core/tests/fixtures/physical-capabilities.plan.json")).unwrap();
    let planning::Step::Physical(mut p)=package.steps.into_iter().next().unwrap()else{panic!()};
    p.input_core_sha256=m.identity().unwrap();p.bounds=None;p.column_maps=None;
    physical::check(&m,None,&p).unwrap();
    let package=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:m.identity().unwrap(),steps:vec![planning::Step::Physical(p)]};
    let root=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/nested-column-owner-conformance");fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"),&source).unwrap();fs::write(root.join("plan.json"),registry::canonical(&package).unwrap()).unwrap();
    let mut rt=Runtime::new(m.program().clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
    for(name,args)in [("nested",json!([[{"position":u32::MAX,"velocity":256,"active":true}]])),("nested_float",json!([[{"value":{"F32Bits":0x80000000u32},"stamp":u64::MAX},{"value":{"F32Bits":0x7fc01234u32},"stamp":0}]]))]{
        let f=m.program().functions.iter().find(|f|f.name==name).unwrap();let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,m.program()).unwrap()).collect();
        let value=eval::call(m.program(),name,input,&mut 1000000).unwrap().json();steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    fs::write(root.join("script.json"),serde_json::to_vec(&steps).unwrap()).unwrap();fs::write(root.join("expected.json"),serde_json::to_vec(&expected).unwrap()).unwrap();
    let output=Command::new("python3").arg("tools/physical_capability_conformance.py").args(["--compiler",env!("CARGO_BIN_EXE_ink"),"--root"]).arg(&root).arg("--source").arg(root.join("source.ink")).arg("--plan").arg(root.join("plan.json")).output().unwrap();
    fs::write(root.join("run.log"),[output.stdout.as_slice(),output.stderr.as_slice()].concat()).unwrap();assert!(output.status.success(),"{}",String::from_utf8_lossy(&output.stderr));
}
#[test]
fn physical_carriers_preserve_values_raw_bits_snapshots_and_baseline_targets() {
    let p = syntax::parse(SOURCE).unwrap();
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/physical-capability-conformance");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"), SOURCE).unwrap();
    fs::write(
        root.join("plan.json"),
        include_bytes!("../core/tests/fixtures/physical-capabilities.plan.json"),
    )
    .unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut cases = vec![];
    for xs in [
        json!([]),
        json!([0]),
        json!([u32::MAX, 1, 255, 256, 65536, 0]),
    ] {
        for i in [0, 1, u32::MAX] {
            for n in ["guarded", "shadow", "wrap", "buffer_guarded"] {
                cases.push((n, json!([xs, i])));
            }
        }
        cases.push(("total", json!([xs])));
        cases.push(("signed", json!([xs, -1])));
        cases.push(("typed_alias", json!([xs])));
        for (a, b, n) in [(0, 1, 99), (2, 0, 3), (u32::MAX, 1, u32::MAX)] {
            cases.push(("bulk", json!([xs, a, b, n])));
        }
    }
    let rows = json!([{"position":u32::MAX,"velocity":1,"active":true},{"position":255,"velocity":256,"active":false}]);
    for xs in [json!([]), rows.clone()] {
        for n in ["particles", "snapshot", "projected", "reduced", "batched"] {
            cases.push((n, json!([xs])));
        }
    }
    for len in [0, 1, 63, 64, 65, 257] {
        cases.push((
            "flags",
            json!([(0..len).map(|i| i % 3 == 0).collect::<Vec<_>>()]),
        ));
    }
    cases.push(("signals",json!([[{"value":{"F32Bits":0x80000000u32},"stamp":u64::MAX},{"value":{"F32Bits":0x7fc01234u32},"stamp":256},{"value":{"F32Bits":1},"stamp":0}]])));
    let mut steps = vec![];
    let mut expected = vec![];
    for (name, args) in cases {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        let value = eval::call(&p, name, values, &mut 1000000).unwrap().json();
        steps.push(json!({"pure":name,"args":args,"cpu_only":name!="particles","expect_gpu":name=="particles"}));
        expected
            .push(json!({"reply":{"value":value},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    for (name, args) in [
        ("all", json!([])),
        ("put", json!([3, rows[0]])),
        ("put", json!([1, rows[1]])),
        ("all", json!([])),
        ("updated", json!([])),
    ] {
        let reply = rt.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":reply.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
    }
    fs::write(
        root.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    let out = Command::new("python3")
        .arg("tools/physical_capability_conformance.py")
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&root)
        .arg("--source")
        .arg(root.join("source.ink"))
        .arg("--plan")
        .arg(root.join("plan.json"))
        .output()
        .unwrap();
    fs::write(
        root.join("run.log"),
        [out.stdout.as_slice(), out.stderr.as_slice()].concat(),
    )
    .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    fs::write(
        root.join("plan.json"),
        include_bytes!("../core/tests/fixtures/composed-capabilities.plan.json"),
    )
    .unwrap();
    let out = Command::new("python3")
        .arg("tools/physical_capability_conformance.py")
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&root)
        .arg("--source")
        .arg(root.join("source.ink"))
        .arg("--plan")
        .arg(root.join("plan.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    parity::conformance(
        "generated-parity-physical-capabilities",
        p,
        SOURCE,
        steps,
        expected,
    );
}
#[test]
fn column_values_inside_state_preserve_rollback_restore_and_codec_boundaries() {
    column_state_conformance(None);
}
#[test]
fn paged_column_state_preserves_point_edits_rollback_restore_and_all_baseline_targets() {
    column_state_conformance(Some(256));
}
fn column_state_conformance(page_size: Option<u16>) {
    use verified_language::{core::CheckedModule, physical, planning, registry};
    let source = r#"module column_state;
record Particle {position:u32,velocity:u32,active:Bool,}
record Batch {rows:List<Particle>,}
record Signal {value:f32,stamp:u64,}
enum Error {Missing,Rejected,}
state Groups:Table<u32,Batch> = Table.empty();
state Signals:List<Signal> = [];
fn edited(rows:List<Particle>,index:u32,row:Particle)->List<Particle>{return buffer(rows).set(index,row).freeze();}
fn edited_signal(rows:List<Signal>,index:u32,row:Signal)->List<Signal>{return buffer(rows).set(index,row).freeze();}
change store(k:u32,rows:List<Particle>,fail:Bool)->Result<Unit,Error> writes(Groups){
 let value=Batch{rows:rows};if Groups.contains(k){Groups.replace(k,value);}else{Groups.insert(k,value);}if fail{return Err(Error.Rejected);}return Ok(());}
change edit(k:u32,index:u32,row:Particle,fail:Bool)->Result<Unit,Error> reads(Groups) writes(Groups){
 let old=Groups.get(k).ok_or(Error.Missing)?;Groups.replace(k,Batch{rows:edited(old.rows,index,row)});if fail{return Err(Error.Rejected);}return Ok(());}
query read(k:u32)->Result<Batch,Error> reads(Groups){return Groups.get(k).ok_or(Error.Missing);}
change seed_signals(rows:List<Signal>)->Unit writes(Signals){Signals=rows;return ();}
change set_signal(index:u32,row:Signal,fail:Bool)->Result<Unit,Error> reads(Signals) writes(Signals){
 Signals=edited_signal(Signals,index,row);if fail{return Err(Error.Rejected);}return Ok(());}
query read_signals()->List<Signal> reads(Signals){return Signals;}
change append_signals(rows:List<Signal>)->Unit reads(Signals) writes(Signals){Signals=Signals.concat(rows);return ();}
"#;
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let p: planning::Package = serde_json::from_slice(include_bytes!(
        "../core/tests/fixtures/physical-capabilities.plan.json"
    ))
    .unwrap();
    let planning::Step::Physical(mut p) = p.steps.into_iter().next().unwrap() else {
        panic!()
    };
    p.input_core_sha256 = m.identity().unwrap();
    p.bounds = None;
    p.column_maps = None;
    p.columns.retain(|l| l.record == "Particle" || l.record == "Signal");
    if let Some(size) = page_size {
        for column in &mut p.columns { column.packing.clear(); column.page_size = Some(size); }
    }
    physical::check(&m, None, &p).unwrap();
    let plan = planning::Package {
        schema: 1,
        semantics: planning::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        steps: vec![planning::Step::Physical(p)],
    };
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join(if page_size.is_some() {"build/paged-column-state-conformance"} else {"build/column-state-conformance"});
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("source.ink"), source).unwrap();
    fs::write(root.join("plan.json"), registry::canonical(&plan).unwrap()).unwrap();
    let mut rt = Runtime::new(m.program().clone()).unwrap();
    let rows = json!([{"position":u32::MAX,"velocity":256,"active":true},{"position":0,"velocity":7,"active":false}]);
    let mut steps = vec![];
    let mut expected = vec![];
    let mut calls = vec![
        ("read", json!([1])),
        ("store", json!([1, rows, false])),
        ("read", json!([1])),
        ("store", json!([1, [], true])),
        ("read", json!([1])),
        ("store", json!([2, rows, true])),
        ("read", json!([2])),
    ];
    if page_size.is_some() {
        let many:Vec<_>=(0..519).map(|i|json!({"position":i,"velocity":u32::MAX-i,"active":i%2==0})).collect();
        calls.push(("store",json!([3,many,false])));
        for index in [0,15,16,255,256,518,u32::MAX] {
            for fail in [false,true] {
                calls.push(("edit",json!([3,index,{"position":u32::MAX,"velocity":17,"active":false},fail])));
                calls.push(("read",json!([3])));
            }
        }
        calls.push(("seed_signals",json!([[{"value":{"F32Bits":0},"stamp":u64::MAX},{"value":{"F32Bits":0x7fc01234u32},"stamp":0}]])));
        calls.push(("append_signals",json!([[{"value":{"F32Bits":0x80000000u32},"stamp":1}]])));
        calls.push(("read_signals",json!([])));
        for (index,bits,stamp) in [(0u32,0u32, u64::MAX),(0,0x80000000, u64::MAX),(1,0x7fc01234,0),(1,0x7fc05678,0),(1,0x7fc05678,1)] {
            for fail in [true,false] {
                calls.push(("set_signal",json!([index,{"value":{"F32Bits":bits},"stamp":stamp},fail])));
                calls.push(("read_signals",json!([])));
            }
        }
    }
    for (name, args) in calls {
        let before = rt.checkpoint_portable().unwrap();
        let reply = rt.invoke_json(name, &args).unwrap();
        if args.as_array().unwrap().last() == Some(&json!(true)) {
            assert_eq!(rt.checkpoint_portable().unwrap(), before);
        }
        steps.push(json!({"call":name,"args":args}));
        expected.push(
            json!({"reply":{"outcome":reply.json()},"snapshot":rt.checkpoint_portable().unwrap()}),
        );
        if name == "read" && args == json!([1]) && steps.len() == 3 {
            let snapshot = rt.checkpoint_portable().unwrap();
            steps.push(json!({"restore":snapshot}));
            rt = Runtime::restore_portable(m.program().clone(), &snapshot).unwrap();
        }
    }
    fs::write(
        root.join("script.json"),
        serde_json::to_vec(&steps).unwrap(),
    )
    .unwrap();
    fs::write(
        root.join("expected.json"),
        serde_json::to_vec(&expected).unwrap(),
    )
    .unwrap();
    let out = Command::new("python3")
        .arg("tools/physical_capability_conformance.py")
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--root"])
        .arg(&root)
        .arg("--source")
        .arg(root.join("source.ink"))
        .arg("--plan")
        .arg(root.join("plan.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    if page_size.is_some() {
        parity::conformance("generated-parity-paged-column-state",m.program().clone(),source,steps,expected);
    }
}

// The cross-domain kernels exercise the same checked bounds and ownership
// machinery; keep them in the mandatory physical-capability CI suite.
#[path = "support/cross_domain_workloads.rs"]
mod cross_domain_workloads;

#[path="support/ecs_lifecycle.rs"] mod ecs_lifecycle;
#[path="support/lexer_runs.rs"] mod lexer_runs;
#[path="support/semantic_word_parity.rs"] mod semantic_word_parity;

#[path="support/matmul_tiles.rs"] mod matmul_tiles;

#[path = "support/broadphase.rs"]
mod broadphase;

#[path = "support/projected_list_reads.rs"]
mod projected_list_reads;

#[path = "support/boolean_maintenance.rs"]
mod boolean_maintenance;
