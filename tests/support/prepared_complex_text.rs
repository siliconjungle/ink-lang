use serde_json::{json, Value};
use std::{path::Path, process::Command, sync::OnceLock};
use verified_language::{core::CheckedModule, eval, modules, stateful::Runtime};

fn module() -> &'static CheckedModule {
    static MODULE: OnceLock<CheckedModule> = OnceLock::new();
    MODULE.get_or_init(|| {
        CheckedModule::from_source(
            modules::load("examples/prepared-complex-text.ink")
                .unwrap()
                .program,
        )
        .unwrap()
    })
}

fn fixture() -> &'static Value {
    static FIXTURE: OnceLock<Value> = OnceLock::new();
    FIXTURE.get_or_init(|| {
        let output = Command::new("python3")
            .args([
                "-c",
                "import gzip,sys;sys.stdout.buffer.write(gzip.open(sys.argv[1],'rb').read())",
            ])
            .arg(
                Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("tests/fixtures/prepared-text/complex-oracle.json.gz"),
            )
            .output()
            .unwrap();
        assert!(
            output.status.success(),
            "{}",
            String::from_utf8_lossy(&output.stderr)
        );
        serde_json::from_slice(&output.stdout).unwrap()
    })
}

// The upstream-only fixture uses source enum suffixes. Bind them to this checked
// module's actual nominal names; no generated implementation supplies the oracle.
fn data(case: &Value) -> Value {
    let mut value = case["data"].clone();
    for field in ["hyphenRetreat", "openingFit", "hardBreakRetreat"] {
        let suffix = value["profile"][field].as_str().unwrap();
        let matches: Vec<_> = module()
            .program()
            .enums
            .iter()
            .filter(|(_, variants)| variants.iter().any(|variant| variant == suffix))
            .map(|(name, _)| format!("{name}.{suffix}"))
            .collect();
        assert_eq!(matches.len(), 1, "unique nominal enum variant {suffix}");
        value["profile"][field] = json!(matches[0]);
    }
    value
}

fn evaluate(name: &str, args: &Value) -> eval::Value {
    let p = module().program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    let args = args.as_array().unwrap();
    assert_eq!(args.len(), f.params.len());
    let values = args
        .iter()
        .zip(&f.params)
        .map(|(v, (_, ty))| eval::Value::from_program_json(v, ty, p).unwrap())
        .collect();
    eval::call_checked(module(), name, values, &mut 100_000_000)
        .unwrap_or_else(|error| panic!("{name}: {error}"))
}

fn expected(name: &str, value: &Value) -> eval::Value {
    let p = module().program();
    let f = p.functions.iter().find(|f| f.name == name).unwrap();
    eval::Value::from_program_json(value, &f.result, p).unwrap()
}

#[test]
fn complete_complex_geometry_matches_upstream_and_compiled_targets() {
    let fixture = fixture();
    assert_eq!(
        fixture["revision"],
        "0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8"
    );
    let cases = fixture["cases"].as_array().unwrap();
    assert_eq!(cases.len(), 1680);
    let snapshot = Runtime::from_checked(module())
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    let mut steps = vec![];
    let mut values = vec![];
    for (index, case) in cases.iter().enumerate() {
        let data = data(case);
        for name in ["count_lines", "lines", "stats", "layout"] {
            let args = if name == "layout" {
                json!([data, case["width"], 19.25])
            } else {
                json!([data, case["width"]])
            };
            let actual = evaluate(name, &args);
            assert_eq!(
                actual,
                expected(name, &case[name]),
                "{} / {name}",
                case["name"]
            );
            steps.push(json!({"pure":name,"args":args}));
            values.push(json!({"reply":{"value":actual.json()},"snapshot":snapshot}));
        }
        for continuation in case["continuations"].as_array().unwrap() {
            let args = json!([data, continuation["cursor"], case["width"]]);
            let actual = evaluate("line", &args);
            assert_eq!(
                actual,
                expected("line", &continuation["expected"]),
                "{} / cursor {}",
                case["name"],
                continuation["cursor"]
            );
            steps.push(json!({"pure":"line","args":args}));
            values.push(json!({"reply":{"value":actual.json()},"snapshot":snapshot}));
        }
        if index % 200 == 0 {
            eprintln!("complex geometry: {index}/{} reference cases", cases.len());
        }
    }
    assert_eq!(steps.len(), 13001);
    steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));
    values.push(json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":snapshot}));
    super::parity::conformance_checked(
        "prepared-complex-geometry",
        module(),
        include_str!("../../examples/prepared-complex-text.ink"),
        steps,
        values,
    );
}

#[test]
fn complex_prepared_boundaries_reject_forged_data_budgets_and_cursors() {
    let case = fixture()["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["name"] == "blink:rich-trimmed:5")
        .unwrap();
    let good = data(case);
    for (field, bad) in [
        ("flags", json!([])),
        ("flags", json!([256, 4, 9, 8, 16])),
        ("flags", json!([10, 4, 9, 8, 16])),
        ("advances", json!([])),
        (
            "advances",
            json!([{"Some":[]},{"None":null},{"None":null},{"None":null},{"None":null}]),
        ),
        ("startExtras", json!({"Some":[]})),
        ("graphemeStartExtras", json!({"Some":[{"Some":[1.]}]})),
        (
            "widths",
            json!([{"F64Bits":"9218868437227405312"},2.,0.,0.,8.]),
        ),
    ] {
        let mut bad_data = good.clone();
        bad_data["base"][field] = bad;
        assert!(
            evaluate("prepare", &json!([bad_data, 100]))
                .json()
                .get("Err")
                .is_some(),
            "{field}"
        );
    }
    for (field, bad) in [
        ("hyphenRooms", json!({"Some":[0.,0.,0.,0.,0.]})),
        ("openingEdges", json!({"Some":[]})),
        ("emptyObjectSpaces", json!({"Some":[0.,0.,0.,0.,0.]})),
        ("emptyObjectReturns", json!({"Some":[0,0,2,0,0]})),
        (
            "tabStops",
            json!({"Some":[0.,0.,{"F64Bits":"9221120237041090560"},0.,0.]}),
        ),
    ] {
        let mut bad_data = good.clone();
        bad_data["items"]["Some"][field] = bad;
        assert!(
            evaluate("prepare", &json!([bad_data, 100]))
                .json()
                .get("Err")
                .is_some(),
            "{field}"
        );
    }
    let mut no_items = good.clone();
    no_items["items"] = json!({"None":null});
    assert!(evaluate("prepare", &json!([no_items, 100]))
        .json()
        .get("Err")
        .is_some());
    for maximum in [0, 1, 9, 1000001] {
        assert!(evaluate("prepare", &json!([good, maximum]))
            .json()
            .get("Err")
            .is_some());
    }
    for epsilon in [json!(-1.), json!({"F64Bits":"9221120237041090560"})] {
        let mut bad_data = good.clone();
        bad_data["profile"]["epsilon"] = epsilon;
        assert!(evaluate("prepare", &json!([bad_data, 100]))
            .json()
            .get("Err")
            .is_some());
    }
    let mut forged = evaluate("prepare", &json!([good, 100])).json()["Ok"].clone();
    forged["budget"] = json!(0);
    assert!(evaluate("count_prepared", &json!([forged, 8.]))
        .json()
        .get("Err")
        .is_some());
    for cursor in [
        json!({"segment":6,"grapheme":0}),
        json!({"segment":5,"grapheme":1}),
        json!({"segment":1,"grapheme":1}),
        json!({"segment":0,"grapheme":3}),
    ] {
        assert!(evaluate("line", &json!([good, cursor, 8.]))
            .json()
            .get("Err")
            .is_some());
    }
}

#[test]
fn complex_prepared_state_resizes_edits_rolls_back_and_restores() {
    let mut runtime = Runtime::from_checked(module()).unwrap();
    let mut steps = vec![];
    let mut values = vec![];
    for engine in ["blink", "gecko", "webkit"] {
        for kind in ["soft-hyphen", "tabs", "rich-hyphen-object", "rich-trimmed"] {
            let name = format!("{engine}:{kind}:5");
            let case = fixture()["cases"]
                .as_array()
                .unwrap()
                .iter()
                .find(|case| case["name"] == name)
                .unwrap();
            let data = data(case);
            for (name, args) in [
                ("install", json!([data])),
                ("resize", json!([case["width"]])),
                ("current", json!([19.25])),
            ] {
                let reply = runtime.invoke_json(name, &args).unwrap();
                if name == "current" {
                    assert_eq!(
                        eval::Value::Opaque(reply.result.clone()),
                        expected("layout", &case["layout"])
                    );
                }
                steps.push(json!({"call":name,"args":args}));
                values.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
            }
            let saved = runtime.checkpoint_portable().unwrap();
            steps.push(json!({"restore":saved}));
            runtime = Runtime::restore_portable_checked(module(), &saved).unwrap();
            let mut invalid = data.clone();
            invalid["base"]["flags"] = json!([]);
            let before = runtime.checkpoint_portable().unwrap();
            let args = json!([invalid]);
            let reply = runtime.invoke_json("install", &args).unwrap();
            assert_eq!(runtime.checkpoint_portable().unwrap(), before);
            assert!(reply.json()["events"].as_array().unwrap().is_empty());
            assert!(reply.json()["result"].get("Err").is_some());
            steps.push(json!({"call":"install","args":args}));
            values.push(json!({"reply":{"outcome":reply.json()},"snapshot":before}));
        }
    }
    let case = fixture()["cases"]
        .as_array()
        .unwrap()
        .iter()
        .find(|case| case["name"] == "blink:rich-trimmed:5")
        .unwrap();
    let good = data(case);
    let mut forged = evaluate("prepare", &json!([good, 100])).json()["Ok"].clone();
    forged["budget"] = json!(0);
    let mut invalid = good.clone();
    invalid["profile"]["epsilon"] = json!(-1.0);
    for (name, args) in [
        ("prepare", json!([good, 9])),
        ("prepare", json!([invalid, 100])),
        ("count_prepared", json!([forged, 8.])),
        ("line", json!([good,{"segment":5,"grapheme":1},8.])),
    ] {
        let actual = evaluate(name, &args);
        assert!(actual.json().get("Err").is_some());
        steps.push(json!({"pure":name,"args":args}));
        values.push(json!({"reply":{"value":actual.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));
    }
    steps.push(json!({"pure":"numeric","args":[[0.0,0.5,1.0]],"expect_gpu":true}));
    values.push(
        json!({"reply":{"value":[0.5,0.75,1.5]},"snapshot":runtime.checkpoint_portable().unwrap()}),
    );
    super::parity::conformance_checked(
        "prepared-complex-lifecycle",
        module(),
        include_str!("../../examples/prepared-complex-text.ink"),
        steps,
        values,
    );
}
