use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::PathBuf, process::Command};
use verified_language::{
    logic::{Context, Equation, Proof, Sort, Term},
    registry::{Bundle, CheckedBundle},
};
fn variable(name: &str) -> Value {
    json!({"Var":name})
}
fn double(name: &str) -> Value {
    json!({"Binary":{"op":"+","left":variable(name),"right":variable(name)}})
}
fn term(value: Value) -> Term {
    serde_json::from_value(value).unwrap()
}
fn fixture() -> (Context, BTreeMap<String, String>) {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!(
        "build/reactive-dependency-tests-{}",
        std::process::id()
    ));
    fs::create_dir_all(&root).unwrap();
    let output = Command::new("python3")
        .arg("knowledge/producers/reactive_dependencies.py")
        .arg(root.join("database"))
        .arg("--view")
        .arg(root.join("view.json"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let bundle: Bundle =
        serde_json::from_slice(&fs::read(root.join("view.json")).unwrap()).unwrap();
    let context = CheckedBundle::check(&bundle)
        .unwrap()
        .first_order_context()
        .unwrap();
    let names =
        serde_json::from_slice(&fs::read(root.join("database/store/names.json")).unwrap()).unwrap();
    (context, names)
}
#[test]
fn dependency_reuse_requires_concrete_factorisation_and_exact_site_equality() {
    let (context, names) = fixture();
    let functions = json!({
     names["read_dependencies"].clone():{"params":["s"],"body":variable("s")},
     names["compute_dependencies"].clone():{"params":["d"],"body":double("d")},
     names["observe_reactive_state"].clone():{"params":["s"],"body":double("s")}
    });
    let proof = json!({"Instance":{
     "theorem":names["observation_reuse_from_equal_dependencies"],
     "sorts":{names["ReactiveState"].clone():"U64",names["DependencySnapshot"].clone():"U64",names["ReactiveValue"].clone():"U64"},
     "functions":functions,"definitions":{},
     "assumptions":{names["dependencies_determine_observation"].clone():{"Refl":double("state")}},
     "arguments":[variable("previous"),variable("following")],"premises":[{"Hypothesis":0}]
    }});
    let params = vec![
        ("previous".into(), Sort::U64),
        ("following".into(), Sort::U64),
    ];
    let premises = vec![Equation {
        from: term(variable("previous")),
        to: term(variable("following")),
    }];
    context
        .check(
            &params,
            &premises,
            &term(double("previous")),
            &term(double("following")),
            &serde_json::from_value::<Proof>(proof.clone()).unwrap(),
        )
        .unwrap();
    let mut missing = proof.clone();
    missing["Instance"]["assumptions"] = json!({});
    assert!(context
        .check(
            &params,
            &premises,
            &term(double("previous")),
            &term(double("following")),
            &serde_json::from_value(missing).unwrap()
        )
        .is_err());
    let mut wrong = proof.clone();
    wrong["Instance"]["functions"][&names["compute_dependencies"]]["body"] =
        json!({"Binary":{"op":"+","left":variable("d"),"right":{"U64":1}}});
    assert!(context
        .check(
            &params,
            &premises,
            &term(double("previous")),
            &term(double("following")),
            &serde_json::from_value(wrong).unwrap()
        )
        .is_err());
    assert!(context
        .check(
            &params,
            &[],
            &term(double("previous")),
            &term(double("following")),
            &serde_json::from_value(proof).unwrap()
        )
        .is_err());
}
