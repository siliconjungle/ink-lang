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
        .args(["-m", "producers.maintained_folds", "--guarded-update", "--guard-zero", "--predicate-update"])
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
    assert_eq!(plan.maintained().unwrap().package().views.iter().filter(|v|v.row_update.is_some()).count(),1);
    // Rust executes maintained folds; dense prefixes remain JavaScript-only.
    assert!(verified_language::state_native::emit_planned(&plan)
        .unwrap_err()
        .contains("dense"));
    assert!(ink_lowering_c::complete::lower_planned(&plan)
        .err()
        .unwrap()
        .contains("maintained"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        p.knowledge.snapshot.root = "0".repeat(64);
    }
    assert!(planning::check(&module, &forged)
        .unwrap_err()
        .contains("pinned snapshot"));
    let mut forged = packet.clone();
    if let planning::Step::Maintained(ref mut p) = forged.steps[0] {
        p.views[0].replacement = Some(Proof::Refl(Term::U64(0)));
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
    let mut session = planning::Checker::new(module.clone());
    let map = session.check(&map_packet).unwrap();
    let mut wrong_membership = map_packet.clone();
    if let planning::Step::Maintained(ref mut p) = wrong_membership.steps[0] {
        p.knowledge.snapshot.root = "0".repeat(64);
    }
    assert!(session.check(&wrong_membership).unwrap_err().contains("pinned snapshot"));
    assert_eq!(session.reused_steps(), 0);
    assert!(session.check(&forged).is_err());
    assert_eq!(session.reused_steps(), 1);
    session.check(&packet).unwrap();
    assert_eq!(session.reused_steps(), 1);
    let mut other_dense = packet.clone();
    if let planning::Step::Physical(ref mut p) = other_dense.steps[1] {
        p.dense_prefixes[0].capacity = 65;
    }
    session.check(&other_dense).unwrap();
    assert_eq!(session.reused_steps(), 1);
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
    // The Rust lowering of the maintained-only plan replays the same history:
    // exact replies, snapshots after every request, and restore mid-history.
    let rust = dir.join("rust");
    verified_language::runtime::emit_rust_program(
        &verified_language::state_native::emit_planned(&map).unwrap(),
        &rust,
    )
    .unwrap();
    fs::write(rust.join("src/main.rs"), r#"use compiled_state::State;use serde_json::{json,Value};
fn normal(v:&Value)->Value{match v{Value::Number(n)=>Value::String(n.to_string()),Value::Array(a)=>Value::Array(a.iter().map(normal).collect()),Value::Object(o)=>Value::Object(o.iter().map(|(k,v)|(k.clone(),normal(v))).collect()),_=>v.clone()}}
fn main(){let history:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();
for(i,h)in history.iter().enumerate(){let reply=serde_json::to_value(state.invoke_json(h["name"].as_str().unwrap(),&h["args"]).unwrap()).unwrap();assert_eq!(normal(&reply),h["expected"],"observation {i}");
let snapshot=state.checkpoint().unwrap();assert_eq!(json!(snapshot),h["snapshot"],"snapshot {i}");if i%17==0{state=State::restore(&snapshot).unwrap();}}
let saved=state.checkpoint().unwrap();let total=state.invoke_json("weight",&json!([])).unwrap();state.begin_transaction().unwrap();state.invoke_json("write",&json!([2,{"amount":9,"weight":5,"included":true},false])).unwrap();state.rollback_transaction();
assert_eq!(serde_json::to_value(state.invoke_json("weight",&json!([])).unwrap()).unwrap(),serde_json::to_value(total).unwrap());assert_eq!(state.checkpoint().unwrap(),saved);
println!("rust maintained history {} steps passed",history.len());}"#).unwrap();
    let built = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--bin", "compiled-state", "--manifest-path"])
        .arg(rust.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(rust.join("target"))
        .output()
        .unwrap();
    assert!(built.status.success(), "{}", String::from_utf8_lossy(&built.stderr));
    let ran = Command::new(rust.join("target/debug/compiled-state"))
        .arg(dir.join("history.json"))
        .output()
        .unwrap();
    assert!(ran.status.success(), "{}{}", String::from_utf8_lossy(&ran.stdout), String::from_utf8_lossy(&ran.stderr));
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

/// Word maximum and minimum keeps become maintained extremum views on Rust:
/// the core checks that `combine` is the fixed word max/min, and the fixed
/// multiset controller follows every write, failed change, rollback and
/// restore exactly as recomputation would.
#[test]
fn word_extremum_views_follow_histories_and_reject_forged_orders() {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/maintained-extremum-conformance");
    let _ = fs::remove_dir_all(&dir);
    fs::create_dir_all(&dir).unwrap();
    let source_text = "module extrema;
enum Error{Rejected,}
record Order{price:u64,qty:u64,}
fn largest(xs:List<u64>)->u64{return foldr(xs,0,fn(x)=>fn(acc)=>choose(x>acc,x,acc));}
fn smallest(xs:List<u64>)->u64{return foldr(xs,18446744073709551615,fn(x)=>fn(acc)=>choose(x<acc,x,acc));}
state Orders:Table<u64,Order> = Table.empty();
keep highest:u64 = largest(Orders.values().map(fn(o)=>o.price));
keep lowest:u64 = smallest(Orders.values().map(fn(o)=>o.price));
change put(k:u64,o:Order,reject:Bool)->Result<Unit,Error> writes(Orders){Orders.put(k,o);if reject{return Err(Error.Rejected);}return Ok(());}
change erase(k:u64)->Unit writes(Orders){Orders.remove(k);return ();}
query top()->u64 reads(highest){return highest;}
query bottom()->u64 reads(lowest){return lowest;}
";
    let source = dir.join("source.ink");
    fs::write(&source, source_text).unwrap();
    let out = Command::new("python3")
        .args(["-m", "producers.maintained_folds", "--extrema"])
        .arg(&source)
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "-o"])
        .arg(dir.join("plan"))
        .env("PYTHONPATH", root.join("knowledge"))
        .output()
        .unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let module = CheckedModule::from_source(parse(source_text).unwrap()).unwrap();
    let packet: planning::Package =
        serde_json::from_slice(&fs::read(dir.join("plan/plan.json")).unwrap()).unwrap();
    let plan = planning::check(&module, &packet).unwrap();
    let views = &plan.maintained().unwrap().package().views;
    assert_eq!(views.len(), 2);
    assert!(views.iter().all(|v| v.extremum.is_some() && v.inverse.is_empty()));
    // JavaScript has no multiset controller and fails closed.
    assert!(verified_language::javascript::lower_planned(&plan).is_err());
    // A maximum claimed as a minimum, a missing order proof, and a group
    // field on an extremum view are all rejected.
    let mut flipped = packet.clone();
    if let planning::Step::Maintained(ref mut p) = flipped.steps[0] {
        let e = p.views[0].extremum.as_mut().unwrap();
        e.order = if e.order == verified_language::maintained::Order::Max {
            verified_language::maintained::Order::Min
        } else {
            verified_language::maintained::Order::Max
        };
    }
    assert!(planning::check(&module, &flipped).unwrap_err().contains("extremum"));
    let mut unordered = packet.clone();
    if let planning::Step::Maintained(ref mut p) = unordered.steps[0] {
        p.views[0].extremum = None;
    }
    assert!(planning::check(&module, &unordered).is_err());
    let mut mixed = packet.clone();
    if let planning::Step::Maintained(ref mut p) = mixed.steps[0] {
        p.views[0].deletion = Some(Proof::Refl(Term::U64(0)));
    }
    assert!(planning::check(&module, &mixed).unwrap_err().contains("group or a word extremum"));

    let order = |p: u64, q: u64| json!({"price":p,"qty":q});
    let mut calls = vec![
        ("top", json!([])),
        ("bottom", json!([])),
        ("put", json!([1, order(50, 1), false])),
        ("put", json!([2, order(50, 2), false])),
        ("put", json!([3, order(7, 3), false])),
        ("erase", json!([1])),
        ("put", json!([2, order(9, 2), true])),
        ("put", json!([4, order(u64::MAX, 1), false])),
        ("put", json!([5, order(0, 1), false])),
        ("erase", json!([4])),
        ("erase", json!([42])),
    ];
    let mut seed = 0x9e3779b97f4a7c15u64;
    for i in 0..60 {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        let key = seed % 12;
        calls.push(if i % 5 == 0 {
            ("erase", json!([key]))
        } else {
            ("put", json!([key, order(if i % 3 == 0 { seed } else { seed % 100 }, i), i % 7 == 0]))
        });
    }
    let mut oracle = Runtime::new(module.program().clone()).unwrap();
    let mut history = vec![];
    for (name, args) in calls {
        for (name, args) in [(name, args), ("top", json!([])), ("bottom", json!([]))] {
            let reply = oracle.invoke_json(name, &args).unwrap();
            history.push(json!({"name":name,"args":args,"expected":normal(&reply.json()),"snapshot":oracle.checkpoint_portable().unwrap()}));
        }
    }
    fs::write(dir.join("history.json"), serde_json::to_vec(&history).unwrap()).unwrap();
    let rust = dir.join("rust");
    verified_language::runtime::emit_rust_program(
        &verified_language::state_native::emit_planned(&plan).unwrap(),
        &rust,
    )
    .unwrap();
    fs::write(rust.join("src/main.rs"), r#"use compiled_state::State;use serde_json::{json,Value};
fn normal(v:&Value)->Value{match v{Value::Number(n)=>Value::String(n.to_string()),Value::Array(a)=>Value::Array(a.iter().map(normal).collect()),Value::Object(o)=>Value::Object(o.iter().map(|(k,v)|(k.clone(),normal(v))).collect()),_=>v.clone()}}
fn main(){let history:Vec<Value>=serde_json::from_slice(&std::fs::read(std::env::args().nth(1).unwrap()).unwrap()).unwrap();let mut state=State::new();
for(i,h)in history.iter().enumerate(){let reply=serde_json::to_value(state.invoke_json(h["name"].as_str().unwrap(),&h["args"]).unwrap()).unwrap();assert_eq!(normal(&reply),h["expected"],"observation {i}");
let snapshot=state.checkpoint().unwrap();assert_eq!(json!(snapshot),h["snapshot"],"snapshot {i}");if i%13==0{state=State::restore(&snapshot).unwrap();}}
let top=serde_json::to_value(state.invoke_json("top",&json!([])).unwrap()).unwrap();let bottom=serde_json::to_value(state.invoke_json("bottom",&json!([])).unwrap()).unwrap();
state.begin_transaction().unwrap();state.invoke_json("put",&json!([77,{"price":18446744073709551615u64,"qty":1},false])).unwrap();state.invoke_json("put",&json!([78,{"price":0,"qty":1},false])).unwrap();state.rollback_transaction();
assert_eq!(serde_json::to_value(state.invoke_json("top",&json!([])).unwrap()).unwrap(),top);assert_eq!(serde_json::to_value(state.invoke_json("bottom",&json!([])).unwrap()).unwrap(),bottom);
println!("rust extremum history {} steps passed",history.len());}"#).unwrap();
    let built = Command::new(env!("CARGO"))
        .args(["build", "--offline", "--quiet", "--bin", "compiled-state", "--manifest-path"])
        .arg(rust.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(rust.join("target"))
        .output()
        .unwrap();
    assert!(built.status.success(), "{}", String::from_utf8_lossy(&built.stderr));
    let ran = Command::new(rust.join("target/debug/compiled-state"))
        .arg(dir.join("history.json"))
        .output()
        .unwrap();
    assert!(ran.status.success(), "{}{}", String::from_utf8_lossy(&ran.stdout), String::from_utf8_lossy(&ran.stderr));
}
