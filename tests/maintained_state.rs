use serde_json::{json, Value};
use std::{fs, path::PathBuf, process::Command};
use verified_language::{
    core::CheckedModule,
    logic::{Proof, Term},
    planning,
    stateful::Runtime,
    syntax::parse,
};
#[path = "support/parity.rs"]
mod parity;
const SOURCE: &str = include_str!("../examples/maintained-ledger.ink");
#[test]
fn general_source_controller_preserves_native_js_wasm_and_gpu_host_observations() {
    let source =
        format!("{SOURCE}\nfn paint(xs:List<u32>)->List<u32>{{return xs.map(fn(v)=>v*3+1);}}");
    let p = parse(&source).unwrap();
    let mut rt = Runtime::new(p.clone()).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let values = json!([0, 1, u32::MAX]);
    let f = p.functions.iter().find(|f| f.name == "paint").unwrap();
    let argument =
        verified_language::eval::Value::from_program_json(&values, &f.params[0].1, &p).unwrap();
    let result = verified_language::eval::call(&p, "paint", vec![argument], &mut 1000000)
        .unwrap()
        .json();
    steps.push(json!({"pure":"paint","args":[values],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":result},"snapshot":rt.checkpoint_portable().unwrap()}));
    let row = |n: u64| json!({"amount":n,"weight":17,"included":true});
    for (name, args) in [
        ("write", json!([0, row(u64::MAX), false])),
        ("observed", json!([0, row(13), false])),
        ("observed", json!([2, row(19), false])),
        ("observed", json!([1, row(99), true])),
        ("two", json!([3, row(11), true])),
        ("two", json!([3, row(11), false])),
        ("erase", json!([0])),
        ("weight", json!([])),
        ("selected", json!([])),
        ("write_other", json!([9, row(7)])),
        ("other_total", json!([])),
        ("rows", json!([])),
    ] {
        let reply = rt.invoke_json(name, &args).unwrap().json();
        steps.push(json!({"call":name,"args":args}));
        expected
            .push(json!({"reply":{"outcome":reply},"snapshot":rt.checkpoint_portable().unwrap()}));
    }
    // Exercise the planned baseline as well as literal state support, including
    // the actual required GPU lane for paint when complete parity is requested.
    let module = CheckedModule::from_source(p).unwrap();
    let packet = planning::Package { schema:1, semantics:planning::SEMANTICS.into(),
        input_core_sha256:module.identity().unwrap(), steps:vec![] };
    let plan=planning::check(&module,&packet).unwrap();
    parity::conformance_planned("maintained-source-controller", &plan, &source, steps, expected);
}
fn normal(v: &Value) -> Value {
    match v {
        Value::Number(n) => Value::String(n.to_string()),
        Value::Array(a) => Value::Array(a.iter().map(normal).collect()),
        Value::Object(o) => Value::Object(o.iter().map(|(k, v)| (k.clone(), normal(v))).collect()),
        _ => v.clone(),
    }
}
#[test]
fn arbitrary_schema_products_preserve_histories_rollback_and_portable_state_and_reject_forged_proofs(
) {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/maintained-fold-conformance");
    fs::create_dir_all(&dir).unwrap();
    let source = dir.join("source.ink");
    fs::write(&source, SOURCE).unwrap();
    let out = Command::new("python3")
        .args(["-m", "producers.maintained_folds"])
        .arg(&source)
        .args([
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--dense-capacity",
            "64",
            "-o",
        ])
        .arg(&dir)
        .env("PYTHONPATH", root.join("knowledge"))
        .env("INK_PROOF_DEBUG", "1")
        .output()
        .unwrap();
    fs::write(
        dir.join("authoring.log"),
        [out.stdout.as_slice(), out.stderr.as_slice()].concat(),
    )
    .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let module = CheckedModule::from_source(parse(SOURCE).unwrap()).unwrap();
    let packet: planning::Package =
        serde_json::from_slice(&fs::read(dir.join("plan.json")).unwrap()).unwrap();
    let plan = planning::check(&module, &packet).unwrap();
    assert_eq!(plan.maintained().unwrap().package().views.len(), 3);
    assert!(verified_language::state_native::emit_planned(&plan)
        .unwrap_err()
        .contains("maintained"));
    assert!(ink_lowering_c::complete::lower_planned(&plan)
        .err()
        .unwrap()
        .contains("maintained"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        p.views[0].replacement = Proof::Refl(Term::U64(0));
    }
    assert!(planning::check(&module, &forged)
        .unwrap_err()
        .contains("replacement"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        p.views[0].update.as_mut().unwrap().proof = Proof::Refl(Term::U64(0));
    }
    assert!(planning::check(&module, &forged).unwrap_err().contains("update"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        let choice = p.views.iter_mut().find_map(|v|v.contribution_choice.as_mut()).unwrap();
        choice.proof = Proof::Refl(Term::U64(0));
    }
    assert!(planning::check(&module, &forged).unwrap_err().contains("contribution choice"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        p.views[0].factorisation = Proof::Refl(Term::U64(0));
    }
    assert!(planning::check(&module, &forged)
        .unwrap_err()
        .contains("factorisation"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        p.views[0].table = "Other".into();
    }
    assert!(planning::check(&module, &forged).is_err());
    let mut forged = packet.clone();
    if let planning::Step::Physical(ref mut p) = forged.steps[1] {
        p.dense_prefixes[0].capacity = u32::MAX;
    }
    assert!(planning::check(&module, &forged).is_err());
    let mut map_packet = packet.clone();
    map_packet.steps.pop();
    let map = planning::check(&module, &map_packet).unwrap();
    fs::write(
        dir.join("dense.mjs"),
        verified_language::javascript::lower_planned(&plan)
            .unwrap()
            .javascript,
    )
    .unwrap();
    fs::write(
        dir.join("map.mjs"),
        verified_language::javascript::lower_planned(&map)
            .unwrap()
            .javascript,
    )
    .unwrap();
    let generated = fs::read_to_string(dir.join("map.mjs")).unwrap();
    let native = generated.split("const __compiledMaintained=").nth(1).unwrap()
        .split("export function createState").next().unwrap();
    assert!(!native.contains("__node("), "flat native contributions must erase constructors");
    assert!(!native.contains("__deepCall"), "bounded native definitions must erase recursion wrappers");
    fs::write(dir.join("instrumented.mjs"),generated.replacen(
        "function __viewValue(view,value,key,oldValue,newValue){",
        "function __viewValue(view,value,key,oldValue,newValue){globalThis.__viewWork=(globalThis.__viewWork||0)+1;",1)).unwrap();
    fs::write(
        dir.join("baseline.mjs"),
        verified_language::javascript::lower(&module)
            .unwrap()
            .javascript,
    )
    .unwrap();
    let row = |a: u64, w: u64, b: bool| json!({"amount":a,"weight":w,"included":b});
    let mut calls = vec![
        ("write", json!([0, row(u64::MAX, 2, true), false])),
        ("write_other", json!([0, row(3, 5, false)])),
        ("two", json!([3, row(13, 7, true), true])),
        ("two", json!([3, row(13, 7, true), false])),
        ("write", json!([u64::MAX, row(u64::MAX, 9, false), false])),
        ("observed", json!([4, row(22, 11, true), false])),
        ("observed", json!([4, row(99, 19, true), true])),
        ("erase", json!([0])),
        ("erase", json!([9999])),
    ];
    let mut seed = 0x123456789abcdefu64;
    for i in 0..40 {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let key = if i % 3 == 0 { seed } else { seed % 16 };
        calls.push(if i % 7 == 0 {
            ("erase", json!([key]))
        } else {
            (
                "write",
                json!([
                    key,
                    row(seed, seed.rotate_left(17), i % 2 == 0),
                    i % 11 == 0
                ]),
            )
        });
    }
    let mut oracle = Runtime::new(module.program().clone()).unwrap();
    let mut history = vec![];
    for (name, args) in calls {
        for (name, args) in [
            (name, args),
            ("weight", json!([])),
            ("selected", json!([])),
            ("other_total", json!([])),
            ("rows", json!([])),
        ] {
            let reply = oracle.invoke_json(name, &args).unwrap();
            history.push(json!({"name":name,"args":args,"expected":normal(&reply.json()),"snapshot":oracle.checkpoint_portable().unwrap()}));
        }
    }
    fs::write(
        dir.join("history.json"),
        serde_json::to_vec(&history).unwrap(),
    )
    .unwrap();
    let mut exhausted: Value = serde_json::from_slice(&oracle.checkpoint().unwrap()).unwrap();
    exhausted["version"] = json!(u64::MAX);
    let exhausted = Runtime::restore(
        module.program().clone(),
        &serde_json::to_vec(&exhausted).unwrap(),
    )
    .unwrap();
    fs::write(
        dir.join("exhausted.bin"),
        exhausted.checkpoint_portable().unwrap(),
    )
    .unwrap();
    fs::write(
        dir.join("json.mjs"),
        include_str!("../runtime/hosts/state-wasm.mjs"),
    )
    .unwrap();
    fs::write(dir.join("run.mjs"),r#"
import fs from 'node:fs';import assert from 'node:assert/strict';
import {parseExactJSON}from './json.mjs';
const history=parseExactJSON(fs.readFileSync(new URL('history.json',import.meta.url),'utf8'));
const norm=v=>typeof v==='bigint'?String(v):typeof v==='number'?String(v):Array.isArray(v)?v.map(norm):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,v])=>[k,norm(v)])):v;
for(const name of ['baseline','map','dense']){
 const {createState}=await import('./'+name+'.mjs'),state=createState();
 for(const [i,h]of history.entries()){
  assert.deepEqual(norm(state.invoke(h.name,h.args)),h.expected,name+' observation '+i);
  assert.deepEqual([...await state.checkpoint()],h.snapshot.map(Number),name+' snapshot '+i);
  if(i%17===0)await state.restore(new Uint8Array(h.snapshot.map(Number)));
 }
 const saved=await state.checkpoint(),total=state.bind('weight',{resultOnly:true})();
 state.beginTransaction();state.bind('write',{resultOnly:true})(2n,{amount:9n,weight:5n,included:true},false);state.rollbackTransaction();
 assert.equal(state.bind('weight',{resultOnly:true})(),total);assert.deepEqual(await state.checkpoint(),saved);
 await assert.rejects(state.restore(new Uint8Array([0])));assert.deepEqual(await state.checkpoint(),saved);
 const published=[];state.subscribe('weight',[],v=>published.push(v));const len=published.length;
 state.batch(()=>{state.bind('write',{resultOnly:true})(2n,{amount:1n,weight:1n,included:false},false);state.bind('erase',{resultOnly:true})(2n);});
 // The callbacks own results and observe only the final changed fold.
 assert(published.length<=len+1);
 await state.restore(new Uint8Array(fs.readFileSync(new URL('exhausted.bin',import.meta.url))));
 const exhausted=await state.checkpoint(),unchanged=state.bind('weight',{resultOnly:true})();
 assert.throws(()=>state.bind('write',{resultOnly:true})(2n,{amount:7n,weight:11n,included:true},false),/commit sequence exhausted/);
 assert.equal(state.bind('weight',{resultOnly:true})(),unchanged);assert.deepEqual(await state.checkpoint(),exhausted);
 assert.deepEqual(state.bind('write',{resultOnly:true})(2n,{amount:99n,weight:11n,included:true},true),{Err:'Error.Cancelled'});
 assert.deepEqual(await state.checkpoint(),exhausted);
}
console.log('3 source/maintained-map/dense variants: exact histories, wrapping, nested failures, cache reads, host rollback, restore, subscriptions and portable snapshots passed');
const {createState}=await import('./instrumented.mjs'),state=createState();
const row={amount:18446744073709551615n,weight:17n,included:true};
globalThis.__viewWork=0;
assert.deepEqual(state.bind('write',{resultOnly:true})(1n,row,true),{Err:'Error.Cancelled'});
assert.equal(globalThis.__viewWork,0,'aborted single-cell action must skip auxiliary maintenance');
assert.equal(state.bind('weight',{resultOnly:true})(),0n);
assert.deepEqual(state.bind('observed',{resultOnly:true})(1n,row,true),{Err:'Error.Cancelled'});
assert.equal(globalThis.__viewWork,1,'a staged keep read evaluates only the requested view');
assert.equal(state.bind('weight',{resultOnly:true})(),0n);
"#).unwrap();
    let out = Command::new("node")
        .arg(dir.join("run.mjs"))
        .output()
        .unwrap();
    fs::write(
        dir.join("run.log"),
        [out.stdout.as_slice(), out.stderr.as_slice()].concat(),
    )
    .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}
