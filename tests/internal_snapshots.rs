use serde_json::{json, Value};
use std::{fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

fn validate(
    name: &str,
    p: verified_language::syntax::Program,
    source: &str,
    cases: Vec<(&str, Value, Value)>,
) {
    let runtime = Runtime::new(p.clone()).unwrap();
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for (name, args, want) in cases {
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
            .collect();
        assert_eq!(
            eval::call(&p, name, values, &mut 1_000_000).unwrap().json(),
            want,
            "{name}"
        );
        steps.push(json!({"pure": name, "args": args}));
        expected.push(
            json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance(name, p, source, steps, expected);
}
fn row(i: u32) -> Value {
    json!({"id":i,"x":i,"y":i,"score":i,"flags":i})
}
fn nested(bits: u32) -> Value {
    json!({"values":[1,2],"maybe":{"Some":[3,4]},"bits":{"F32Bits":bits}})
}
#[test]
fn final_snapshots_preserve_exact_values_across_targets() {
    let source = include_str!("../examples/internal-snapshots.ink");
    let p = modules::load("examples/internal-snapshots.ink")
        .unwrap()
        .program;
    validate(
        "internal-snapshots-parity",
        p,
        source,
        vec![
            ("reconcile", json!([[], []]), json!([])),
            (
                "reconcile",
                json!([[row(1), row(2)], [row(1), row(3), row(4)]]),
                json!([row(1), row(3), row(4)]),
            ),
            (
                "reconcile",
                json!([[row(1), row(2)], [row(1)]]),
                json!([row(1)]),
            ),
            (
                "reconcile",
                json!([[row(1), row(1)], [row(1), row(1)]]),
                json!([row(1), row(1)]),
            ),
            (
                "bits",
                json!([[{"F32Bits":2147483648u32},{"F32Bits":2143289345u32}],[0,{"F32Bits":2143289346u32}]]),
                json!([0.0,{"F32Bits":2143289346u32}]),
            ),
            (
                "nested",
                json!([[nested(2143289345)], [nested(2143289346)]]),
                json!([nested(2143289346)]),
            ),
            (
                "record_equal",
                json!([nested(2143289345), nested(2143289345)]),
                json!(true),
            ),
            (
                "record_equal",
                json!([nested(2143289345), nested(2143289346)]),
                json!(false),
            ),
            (
                "scalar_equal",
                json!([{"F32Bits":2143289345u32},{"F32Bits":2143289345u32}]),
                json!(false),
            ),
            (
                "scalar_equal",
                json!([0,{"F32Bits":2147483648u32}]),
                json!(true),
            ),
            (
                "schemas",
                json!([{"value":1.0,"other":2},{"value":1,"other":2.0}]),
                json!(true),
            ),
            (
                "schemas",
                json!([{"value":1.0,"other":2},{"value":2,"other":2.0}]),
                json!(false),
            ),
            ("eager", json!([row(1), row(2)]), json!(false)),
            (
                "selected",
                json!([[row(0), row(1)]]),
                json!([{"id":1,"x":2,"y":1,"score":1,"flags":1}]),
            ),
            (
                "shared_ranges",
                json!([
                    [nested(2143289345), nested(2143289346)],
                    1,
                    nested(2143289347)
                ]),
                json!([nested(2143289345), nested(2143289347), nested(2143289346)]),
            ),
        ],
    );
}
#[test]
fn private_field_deltas_cover_heterogeneous_fields_and_lengths() {
    let dir = Path::new("build/internal-field-parity");
    fs::create_dir_all(dir).unwrap();
    let source = dir.join("generated.ink");
    let out = Command::new("python3")
        .args([
            "knowledge/producers/field_snapshots.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--source",
            "examples/internal-snapshots.ink",
            "--record",
            "Nested",
            "-o",
        ])
        .arg(&source)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let bundle: verified_language::registry::Bundle =
        serde_json::from_slice(&fs::read(source.with_extension("laws.json")).unwrap()).unwrap();
    let catalogue = verified_language::registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(catalogue.roots.len(), 3);
    verified_language::laws::CheckedCatalogue::check(
        &catalogue,
        &verified_language::syntax::Program::default(),
    )
    .unwrap();
    for id in &catalogue.roots {
        let mut bad = catalogue.objects[id].clone();
        let verified_language::semantic::Node::Op(_, fields) = &mut bad.to.node else {
            panic!()
        };
        fields[0] = verified_language::semantic::op(
            fields[0].sort.clone(),
            &("field:".to_owned()
                + match &fields[0].sort {
                    verified_language::semantic::Sort::Value(
                        verified_language::syntax::Type::F32,
                    ) => "bits",
                    verified_language::semantic::Sort::Value(
                        verified_language::syntax::Type::Option(_),
                    ) => "maybe",
                    _ => "values",
                }),
            vec![verified_language::semantic::term(
                verified_language::semantic::value(verified_language::syntax::Type::Named(
                    "Nested".into(),
                )),
                verified_language::semantic::Node::Free("a".into()),
            )],
        );
        let key = verified_language::registry::identity(
            &verified_language::registry::Entry::from_law(&bad).unwrap(),
        )
        .unwrap();
        let bad = verified_language::laws::Catalogue {
            schema: 1,
            semantics: verified_language::laws::SEMANTICS.into(),
            roots: vec![key.clone()],
            objects: std::collections::BTreeMap::from([(key, bad)]),
        };
        assert!(verified_language::laws::CheckedCatalogue::check(
            &bad,
            &verified_language::syntax::Program::default()
        )
        .is_err());
    }
    let text = fs::read_to_string(&source).unwrap();
    let p = modules::load(&source).unwrap().program;
    let a = nested(2143289345);
    let b = json!({"values":[5,6,7],"maybe":{"None":null},"bits":{"F32Bits":2143289346u32}});
    validate(
        "internal-fields-parity",
        p,
        &text,
        vec![
            (
                "reconcile_fields",
                json!([[a.clone(), a.clone()], [a.clone(), b.clone()]]),
                json!([a.clone(), b.clone()]),
            ),
            (
                "reconcile_fields",
                json!([[], [b.clone()]]),
                json!([b.clone()]),
            ),
            (
                "reconcile_fields",
                json!([[a.clone(), b.clone()], []]),
                json!([]),
            ),
            (
                "reconcile_fields",
                json!([[b.clone(), a.clone()], [a.clone()]]),
                json!([a.clone()]),
            ),
            (
                "reconcile_fields",
                json!([[a.clone()], [a.clone(), b.clone()]]),
                json!([a, b]),
            ),
        ],
    );
}
#[test]
fn javascript_sharing_is_safe_and_patch_helpers_are_private() {
    let p = modules::load("examples/internal-snapshots.ink")
        .unwrap()
        .program;
    let m = CheckedModule::from_source(p).unwrap();
    let dir = Path::new("build/internal-sharing-js");
    fs::create_dir_all(dir).unwrap();
    let emitted = verified_language::javascript::lower(&m).unwrap();
    fs::write(dir.join("module.mjs"), emitted.javascript).unwrap();
    let out = Command::new("python3")
        .args([
            "knowledge/producers/field_snapshots.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--source",
            "bench/frontier-diff/workload.ink",
            "--record",
            "Row",
            "-o",
        ])
        .arg(dir.join("fields.ink"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let out = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["build"])
        .arg(dir.join("fields.ink"))
        .args(["--target", "javascript", "-o"])
        .arg(dir.join("fields.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let out = Command::new("python3")
        .args([
            "knowledge/producers/field_snapshots.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--source",
            "examples/internal-snapshots.ink",
            "--record",
            "Nested",
            "-o",
        ])
        .arg(dir.join("nested-fields.ink"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let out = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["build"])
        .arg(dir.join("nested-fields.ink"))
        .args(["--target", "javascript", "-o"])
        .arg(dir.join("nested-fields.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let state=verified_language::syntax::parse("module Capture;state Rows:Table<u32,List<u32>>=Table.empty();event seen:List<u32>;change put(xs:List<u32>)->Result<Unit,u32> writes(Rows) emits(seen){if Rows.contains(0){Rows.replace(0,xs);}else{Rows.insert(0,xs);}emit seen(xs);return Ok(());}query get()->Option<List<u32>> reads(Rows){return Rows.get(0);}").unwrap();
    let state = CheckedModule::from_source(state).unwrap();
    fs::write(
        dir.join("state.mjs"),
        verified_language::javascript::lower(&state)
            .unwrap()
            .javascript,
    )
    .unwrap();
    fs::write(dir.join("check.mjs"),r#"
import assert from 'node:assert/strict';
import {functions as f} from './module.mjs';
import {functions as g,call} from './fields.mjs';
import {createState} from './state.mjs';
import {functions as fieldNested} from './nested-fields.mjs';
const freeze=v=>{if(v&&typeof v==='object'){Object.values(v).forEach(freeze);Object.freeze(v);}return v;};
const a=freeze({id:1,x:2,y:3,score:4,flags:5}), b=freeze({id:2,x:3,y:4,score:5,flags:6});
const before=freeze([a,b]), change=freeze({...b,x:99});
for(const reconcile of [f.reconcile,g.reconcile_fields]){
 assert.equal(reconcile(before,before),before);
 const out=reconcile(before,[a,change]);assert.deepEqual(out,[a,change]);assert.equal(out[0],a);assert.notEqual(out,before);
 assert.equal(reconcile(before,[{...a},{...b}])[0],a);
 assert.equal(reconcile(before,[{...a},{...b}])[1],b);
 assert.deepEqual(before,[a,b]);
}
assert.deepEqual(Object.keys(g),['reconcile_fields']);
assert.throws(()=>call('build_fields0',[a,b]),/temporary storage is internal/);
assert.throws(()=>call('replay_fields0',[a,[]]),/temporary storage is internal/);
const oldNested={values:[1,2],maybe:{Some:[3]},bits:1},newNested={values:[1,2],maybe:{Some:[3]},bits:2};
const fieldResult=fieldNested.reconcile_fields([oldNested],[newNested])[0];
assert.equal(fieldResult.values,oldNested.values);assert.equal(fieldResult.maybe,oldNested.maybe);assert.equal(fieldResult.bits,2);
const nan={F32Bits:0x7fc00001};const n=freeze({values:[1],maybe:{Some:[2]},bits:nan});
assert.equal(f.record_equal(n,n),true);assert.equal(f.scalar_equal(nan,nan),false);
assert.equal(f.record_equal(n,{...n,bits:{F32Bits:0x7fc00002}}),false);
assert.equal(f.record_equal({...n,bits:0},{...n,bits:-0}),false);
assert(Object.is(f.bits([-0],[0])[0],0));assert(Object.is(f.bits([0],[-0])[0],-0));
const host={values:[1],maybe:{None:null},bits:1};
assert.equal(f.nested([host],[host])[0].bits,1);host.bits=2;
assert.equal(f.nested([host],[host])[0].bits,2); // no cache survives an invocation
assert.equal(f.schemas({value:1,other:2},{value:1,other:2}),true);
const sameHost={value:1,other:2};assert.equal(f.schemas(sameHost,sameHost),true);
let conversions=0,hostFloat=1;const counted={values:[1],maybe:{None:null},get bits(){conversions++;return hostFloat;}};
assert.equal(f.nested([counted],[counted])[0].bits,1);assert.equal(conversions,1);hostFloat=2;
assert.equal(f.nested([counted],[counted])[0].bits,2);assert.equal(conversions,2);
let eagerReads=0;const make=i=>({id:i,x:0,y:0,score:0,get flags(){eagerReads++;return 0;}});
assert.equal(f.eager(make(1),make(2)),false);assert.equal(eagerReads,2);
const state=createState(),input=[1,2];const reply=state.invoke('put',[input]);input[0]=8;reply.events[0].value[0]=9;
const result=state.invoke('get',[]);result.result.Some[0]=10;state.outbox[0].value[0]=11;
assert.deepEqual(state.invoke('get',[]).result,{Some:[1,2]});assert.deepEqual(state.outbox[0].value,[1,2]);
console.log('sharing, exact floats, frozen inputs, detached state and private helpers passed');
"#).unwrap();
    let out = Command::new("node")
        .arg(dir.join("check.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
}

#[test]
fn nominal_field_replay_proofs_bind_id_declarations_portably() {
    let dir = Path::new("build/internal-id-proof");
    fs::create_dir_all(dir).unwrap();
    let input = dir.join("schema.ink");
    fs::write(&input,"module Keys;id Tag;record Tagged{tag:Tag,count:u32,}fn identity(row:Tagged)->Tagged{return row;}").unwrap();
    let source = dir.join("fields.ink");
    let out = Command::new("python3")
        .args([
            "knowledge/producers/field_snapshots.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--source",
        ])
        .arg(&input)
        .args(["--record", "Tagged", "-o"])
        .arg(&source)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let bundle: verified_language::registry::Bundle =
        serde_json::from_slice(&fs::read(source.with_extension("laws.json")).unwrap()).unwrap();
    let catalogue = verified_language::registry::CheckedBundle::check(&bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(catalogue.roots.len(), 2);
    verified_language::laws::CheckedCatalogue::check(
        &catalogue,
        &verified_language::syntax::Program::default(),
    )
    .unwrap();
    for id in &catalogue.roots {
        let mut bad = catalogue.objects[id].clone();
        bad.definition_context.as_mut().unwrap().ids.clear();
        let key = verified_language::registry::identity(
            &verified_language::registry::Entry::from_law(&bad).unwrap(),
        )
        .unwrap();
        let bad = verified_language::laws::Catalogue {
            schema: 1,
            semantics: verified_language::laws::SEMANTICS.into(),
            roots: vec![key.clone()],
            objects: std::collections::BTreeMap::from([(key, bad)]),
        };
        assert!(verified_language::laws::CheckedCatalogue::check(
            &bad,
            &verified_language::syntax::Program::default()
        )
        .is_err());
    }
    let text = fs::read_to_string(&source).unwrap();
    let p = modules::load(&source).unwrap().program;
    let a = json!({"tag":"00000000000000000000000000000aaa","count":1});
    let b = json!({"tag":"00000000000000000000000000000bbb","count":2});
    validate(
        "internal-ids-parity",
        p,
        &text,
        vec![(
            "reconcile_fields",
            json!([[a.clone(), a.clone()], [a, b.clone()]]),
            json!([{"tag":"00000000000000000000000000000aaa","count":1},b]),
        )],
    );
}
