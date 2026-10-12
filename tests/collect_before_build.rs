use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    laws::{Catalogue, CheckedCatalogue},
    optimisation::{self, Package, Site},
    registry, semantic as s, syntax,
};
#[path = "support/parity.rs"]
mod parity;
const SOURCE:&str="module unrelated;record Stamp{stamp:u32,weight:u32,}fn selected(xs:List<Stamp>)->List<Stamp>{return xs.map(fn(item)=>Stamp{stamp:item.stamp,weight:item.weight+1}).filter(fn(item)=>item.weight!=1);}";
#[test]
fn database_moves_selection_before_record_construction_and_rejects_false_proof() {
    let m = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    let dir = Path::new("build/collect-before-build-proof");
    fs::create_dir_all(dir).unwrap();
    fs::write(dir.join("core.json"), m.bytes().unwrap()).unwrap();
    fs::write(
        dir.join("subject.json"),
        serde_json::to_vec(&optimisation::subject(&m).unwrap()).unwrap(),
    )
    .unwrap();
    let script = r#"
import json,sys
from pathlib import Path
from producers.collect_before_build import specialize
from producers.definition_context28 import bind
from ink_knowledge import Store,semantic_entry,identity,canonical
root=Path(sys.argv[1]);core=json.loads((root/'core.json').read_text());subject=json.loads((root/'subject.json').read_text())
rows=specialize(subject,core);assert len(rows)==1,rows
law=bind(rows[0][1],core,subject);entry=semantic_entry(law);key=identity(entry)
store=Store.publish(root/'knowledge',[entry],{'select-before-build':key})
(root/'view.json').write_bytes(canonical(store.bundle([key])))
"#;
    let out = Command::new("python3")
        .env("PYTHONPATH", "knowledge:planner")
        .args(["-c", script])
        .arg(dir)
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let view: registry::Bundle =
        serde_json::from_slice(&fs::read(dir.join("view.json")).unwrap()).unwrap();
    let c = registry::CheckedBundle::check(&view)
        .unwrap()
        .catalogue()
        .unwrap();
    CheckedCatalogue::check(&c, m.program()).unwrap();
    let id = c.roots[0].clone();
    let mut bad = c.objects[&id].clone();
    let s::Node::Op(_, args) = &mut bad.to.node else {
        panic!()
    };
    let s::Node::Op(_, args) = &mut args[0].node else {
        panic!()
    };
    args[1] = s::lambda(
        s::value(Type::Named("Stamp".into())),
        s::term(s::value(Type::Bool), s::Node::Bool(true)),
    );
    let bad_id = registry::identity(&registry::Entry::from_law(&bad).unwrap()).unwrap();
    let false_catalogue = Catalogue {
        schema: 1,
        semantics: verified_language::laws::SEMANTICS.into(),
        roots: vec![bad_id.clone()],
        objects: BTreeMap::from([(bad_id, bad)]),
    };
    assert!(CheckedCatalogue::check(&false_catalogue, m.program()).is_err());
    let package = Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: view,
        action_replacement: None,
        contract_refinement: None,
        applications: vec![Site {
            function: "selected".into(),
            path: vec![],
            law: id,
            premises: vec![],
            arguments: BTreeMap::from([(
                "collect_sequence".into(),
                s::term(
                    s::value(Type::List(Box::new(Type::Named("Stamp".into())))),
                    s::Node::Free("xs".into()),
                ),
            )]),
        }],
    };
    let selected = optimisation::check(&m, &package).unwrap();
    let js = verified_language::javascript::lower_selected(&selected).unwrap();
    fs::write(dir.join("selected.mjs"), &js.javascript).unwrap();
    fs::write(
        dir.join("allocation.mjs"),
        r#"
import assert from 'node:assert/strict';
import {functions} from './selected.mjs';
let constructions=0;
const input=Array.from({length:64},(_,i)=>({weight:0,get stamp(){constructions++;return i;}}));
assert.deepEqual(functions.selected(input),[]);
assert.equal(constructions,0); // rejected records never read their build-only field
console.log('rejected records were not constructed');
"#,
    )
    .unwrap();
    let out = Command::new("node")
        .arg(dir.join("allocation.mjs"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let mut steps = vec![];
    let mut expected = vec![];
    let runtime = verified_language::stateful::Runtime::new(m.program().clone()).unwrap();
    for weights in [
        vec![],
        vec![0],
        vec![1],
        vec![u32::MAX],
        vec![0, 1, 2, u32::MAX, 0],
    ] {
        let input: Vec<Value> = weights
            .iter()
            .enumerate()
            .map(|(i, &w)| json!({"stamp":i,"weight":w}))
            .collect();
        let want: Vec<Value> = weights
            .iter()
            .enumerate()
            .filter(|(_, w)| w.wrapping_add(1) != 1)
            .map(|(i, w)| json!({"stamp":i,"weight":w.wrapping_add(1)}))
            .collect();
        steps.push(json!({"pure":"selected","args":[input],"expect_gpu":true}));
        expected.push(
            json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}),
        );
    }
    parity::conformance_selected(
        "collect-before-build-parity",
        &selected,
        SOURCE,
        steps,
        expected,
    );
}
