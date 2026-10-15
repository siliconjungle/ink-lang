use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    laws::{self, Catalogue, Law, Proof},
    optimisation::{self, Site},
    semantic as s, syntax,
};
#[path = "support/parity.rs"]
mod parity;

fn module(expression: &str) -> CheckedModule {
    let source=format!("module search_fixture;fn main(x:u32)->u32{{return {expression};}}fn device_control(xs:List<f32>)->List<f32>{{return xs.map(fn(x)=>x*x+0.5);}}");
    CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap()
}
fn step(from: &CheckedModule, to: &CheckedModule) -> Value {
    let sort = s::value(Type::U32);
    let x = s::free(sort.clone(), "x");
    let law = Law {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        params: BTreeMap::from([("x".into(), sort)]),
        conditions: vec![],
        from: optimisation::subject(from).unwrap().functions["main"].clone(),
        to: optimisation::subject(to).unwrap().functions["main"].clone(),
        proof: Proof::Normalize,
        dependencies: vec![],
        definition_context: None,
        types: vec![],
        assumptions: vec![],
    };
    let id = verified_language::registry::identity(
        &verified_language::registry::Entry::from_law(&law).unwrap(),
    )
    .unwrap();
    let catalogue = Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(id.clone(), law)]),
    };
    let packet = optimisation::Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: from.identity().unwrap(),
        knowledge: verified_language::registry::from_catalogue(&catalogue).unwrap(),
        applications: vec![Site {
            function: "main".into(),
            path: vec![],
            law: id,
            arguments: BTreeMap::from([("x".into(), x)]),
            premises: vec![],
        }],
        action_replacement: None,
        contract_refinement: None,
    };
    let checked = optimisation::check(from, &packet).unwrap();
    assert_eq!(checked.module().identity().unwrap(), to.identity().unwrap());
    json!({"kind":"rewrite","package":packet})
}
fn success(command: &mut Command) -> Vec<u8> {
    let output = command.output().unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    output.stdout
}

#[test]
fn learned_whole_structure_advice_changes_exploration_but_not_admission_or_selection() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join("build/learned-search/conformance");
    if output.exists() {
        fs::remove_dir_all(&output).unwrap();
    }
    fs::create_dir_all(&output).unwrap();
    let initial = module("(x+0)+0");
    let simple = module("x+0");
    let expanded = module("0+(x+0)");
    let final_module = module("x");
    let first = initial.identity().unwrap();
    let second = simple.identity().unwrap();
    let third = expanded.identity().unwrap();
    let last = final_module.identity().unwrap();
    fs::write(output.join("source.core.json"), initial.bytes().unwrap()).unwrap();
    let graph = json!({"initial":first,"final":last,"edges":{
  first.clone():[step(&initial,&simple),step(&initial,&expanded)],
  second:[step(&simple,&initial)],third:[step(&expanded,&final_module)]}});
    fs::write(
        output.join("graph.json"),
        serde_json::to_vec_pretty(&graph).unwrap(),
    )
    .unwrap();
    let source = output.join("search-policy.mjs");
    success(
        Command::new(env!("CARGO_BIN_EXE_ink"))
            .current_dir(root)
            .args([
                "build",
                "examples/search-policy.ink",
                "--target",
                "javascript",
                "-o",
            ])
            .arg(&source),
    );
    let empty =
        json!({"schema":1,"semantics":"ink-compiled-plan-v1","input_core_sha256":first,"steps":[]});
    fs::write(
        output.join("empty.plan.json"),
        serde_json::to_vec(&empty).unwrap(),
    )
    .unwrap();
    let checked: Value = serde_json::from_slice(&success(
        Command::new(env!("CARGO_BIN_EXE_ink"))
            .current_dir(root)
            .arg("check-plan")
            .arg(output.join("source.core.json"))
            .arg(output.join("empty.plan.json"))
            .args(["--core", "--target", "javascript"]),
    ))
    .unwrap();
    fs::write(
        output.join("checked-state.json"),
        serde_json::to_vec(&checked["state"]).unwrap(),
    )
    .unwrap();
    success(Command::new("python3").current_dir(root).env("PYTHONPATH",format!("{}:{}",root.join("planner").display(),root.join("knowledge").display()))
  .args(["-c","import json,sys;from pathlib import Path;from ink_planner.search_goal import document;p=Path(sys.argv[1]);s=json.loads(p.read_bytes());p.write_text(json.dumps(dict(source=s['source'],document=document(s))))"])
  .arg(output.join("checked-state.json")));
    success(
        Command::new("node")
            .current_dir(root)
            .arg("tests/fixtures/train-search-policy.mjs")
            .arg(source)
            .arg(output.join("checked-state.json"))
            .arg(&output),
    );
    success(
        Command::new("python3")
            .current_dir(root)
            .env(
                "PYTHONPATH",
                format!(
                    "{}:{}",
                    root.join("planner").display(),
                    root.join("knowledge").display()
                ),
            )
            .arg("planner/tests/search_goal_integration.py")
            .arg(env!("CARGO_BIN_EXE_ink"))
            .arg(&output),
    );
    let packet =
        serde_json::from_slice(&fs::read(output.join("selected.plan.json")).unwrap()).unwrap();
    let selected = verified_language::planning::check(&initial, &packet).unwrap();
    assert_eq!(
        selected.module().identity().unwrap(),
        final_module.identity().unwrap()
    );
    let reference = verified_language::stateful::Runtime::from_checked(&initial).unwrap();
    let snapshot = reference.checkpoint_portable().unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    for x in [0u32, 1, u32::MAX, 1 << 31] {
        steps.push(json!({"pure":"main","args":[x]}));
        expected.push(json!({"reply":{"value":x},"snapshot":snapshot}));
    }
    steps.push(json!({"pure":"device_control","args":[[0.0,0.5,1.0,-1.0]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5,1.5]},"snapshot":snapshot}));
    parity::conformance_planned(
        "learned-search-parity",
        &selected,
        "checked arithmetic search fixture",
        steps,
        expected,
    );
}

#[test]
fn search_model_training_context_and_failed_updates_match_reference_across_targets() {
    use verified_language::{eval, modules, stateful::Runtime};
    let mut program = modules::load("examples/search-policy.ink").unwrap().program;
    let control = syntax::parse(
        "module control;fn device_control(xs:List<f32>)->List<f32>{return xs.map(fn(x)=>x*x+0.5);}",
    )
    .unwrap();
    program.functions.extend(control.functions);
    let module = CheckedModule::from_source(program).unwrap();
    let p = module.program();
    let mut reference = Runtime::from_checked(&module).unwrap();
    let mut steps = vec![];
    let mut expected = vec![];
    let candidate = json!({"id":"a".repeat(64),"source":"b".repeat(64),"target":"javascript","default_priority":0.0,
  "frequencies":[{"entry":"call:main","calls":u64::MAX}],"state":{"root":0,"nodes":[
   {"kind":5,"value":"","edges":[{"key":"representation","node":1},{"key":"sentinel","node":2}]},
   {"kind":0,"value":"","edges":[]},{"kind":2,"value":u64::MAX.to_string(),"edges":[]}]}});
    let config = json!({"rate":0.25,"first_decay":0.0,"second_decay":0.0,"epsilon":0.00000001,"weight_decay":0.0,"norm_limit":0.0});
    for index in 0..10 {
        let (name, args) = if index == 0 || index == 9 {
            ("context", json!([]))
        } else {
            ("feedback", json!([candidate, -100.0, config]))
        };
        let outcome = reference.invoke_json(name, &args).unwrap();
        steps.push(json!({"call":name,"args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    for target in [
        json!({"F32Bits":2143289344u32}),
        json!({"F32Bits":2139095040u32}),
    ] {
        let saved = reference.checkpoint_portable().unwrap();
        let args = json!([candidate, target, config]);
        let outcome = reference.invoke_json("feedback", &args).unwrap();
        assert!(!outcome.committed);
        assert_eq!(reference.checkpoint_portable().unwrap(), saved);
        steps.push(json!({"call":"feedback","args":args}));
        expected.push(json!({"reply":{"outcome":outcome.json()},"snapshot":saved}));
    }
    let saved = reference.checkpoint_portable().unwrap();
    steps.push(json!({"restore":saved}));
    reference = Runtime::restore_portable_checked(&module, &saved).unwrap();
    let context = reference
        .invoke_json("context", &json!([]))
        .unwrap()
        .result
        .json()["Ok"]
        .clone();
    for value in [
        candidate.clone(),
        {
            let mut c = candidate.clone();
            c["state"]["nodes"][1]["kind"] = json!(5);
            c
        },
        {
            let mut c = candidate.clone();
            c["default_priority"] = json!({"F64Bits":"9221120237041095220"});
            c
        },
    ] {
        let args = json!([value, context]);
        let function = p.functions.iter().find(|f| f.name == "priority").unwrap();
        let inputs = args
            .as_array()
            .unwrap()
            .iter()
            .zip(&function.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, p).unwrap())
            .collect();
        let result = eval::call(p, "priority", inputs, &mut 10_000_000)
            .unwrap()
            .json();
        steps.push(json!({"pure":"priority","args":args}));
        expected.push(
            json!({"reply":{"value":result},"snapshot":reference.checkpoint_portable().unwrap()}),
        );
    }
    steps.push(json!({"pure":"device_control","args":[[0.0,0.5,1.0,-1.0]],"expect_gpu":true}));
    expected.push(json!({"reply":{"value":[0.5,0.75,1.5,1.5]},"snapshot":reference.checkpoint_portable().unwrap()}));
    parity::conformance_checked(
        "search-model-parity",
        &module,
        include_str!("../examples/search-policy.ink"),
        steps,
        expected,
    );
}
