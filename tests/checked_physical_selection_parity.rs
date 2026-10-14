//! Existing content-bound DB proof replayed before lowering the selected body.
//! Offline diagnostic prices/features do not supply this semantic authority.
use serde_json::{json, Value};
use verified_language::{core::CheckedModule, eval, optimisation, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;
const ORIGINAL_CORE: &[u8] = include_bytes!("fixtures/checked-physical-selection/literal.core.json");
const SELECTED_CORE: &[u8] = include_bytes!("fixtures/checked-physical-selection/checked.core.json");
const SOURCE: &str = include_str!("fixtures/checked-physical-selection/source.ink");
const PACKAGE: &[u8] = include_bytes!("fixtures/checked-physical-selection/checked.selection.json");
const FIXTURES: &str = include_str!("fixtures/checked-physical40.json");
#[test]
fn checked_helper_composition_matches_every_portable_target() {
    let input = CheckedModule::from_bytes(ORIGINAL_CORE).unwrap();
    let package: optimisation::Package = serde_json::from_slice(PACKAGE).unwrap();
    let selected = optimisation::check(&input, &package).unwrap();
    assert_eq!(selected.module().bytes().unwrap(), SELECTED_CORE);
    assert_eq!(selected.evidence().applied_laws.len(), 1);
    assert_eq!(
        selected.evidence().snapshot_sha256,
        "8d1f3460cc2aa16bfd176081e2b7fab552e9ec8ea858755c566b3708107c80ef"
    );
    let reference = Runtime::new_selected(&selected).unwrap();
    let p = selected.module().program();
    let fixtures: Vec<Value> = serde_json::from_str(FIXTURES).unwrap();
    assert_eq!(fixtures.len(), 20);
    let mut steps = vec![];
    let mut expected = vec![];
    for row in fixtures {
        let name = row["entry"].as_str().unwrap();
        let args = row["args"].clone();
        let f = p.functions.iter().find(|f| f.name == name).unwrap();
        let values = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
            .collect();
        let actual = eval::call(p, name, values, &mut 100000000).unwrap().json();
        assert_eq!(actual, row["expected"], "independent oracle {}", row["id"]);
        steps.push(json!({"pure":name,"args":args,"expect_gpu":true}));
        expected.push(json!({"reply":{"value":row["expected"]},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    parity::conformance_selected(
        "generated-parity-checked-physical40",
        &selected,
        SOURCE,
        steps,
        expected,
    );
}
