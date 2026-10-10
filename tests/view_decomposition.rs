//! Automatic, checked decomposition of maintained views.
//!
//! For every `keep` that is a `sum`/`count` over any chain of `map`/`filter`
//! stages on a table, the compiler exports the literal pipeline meaning; the
//! external producer `knowledge/producers/view_decomposition.py` proves it
//! equals the sum of row projections, with no per-program input; the general
//! kernel checks the proof. These tests cover many pipeline shapes, compare
//! the logical pipeline with the reference runtime on concrete rows, and check
//! that wrong, stale or tampered evidence is rejected.
use serde_json::{json, Value as Json};
use std::{path::Path, process::Command};
use verified_language::{
    aggregate::Certificate,
    core::CheckedModule,
    library,
    logic::{Proof, Term},
    row_model::{self, ViewEvidence, ViewModel},
    source_values::{Limits, SourceValues},
    stateful::{Runtime, Value},
    syntax::{parse, Program},
};

const KEEPS: &[(&str, &str)] = &[
    ("k_sum_int", "sum(Rows.values().map(fn(r) => r.a))"),
    ("k_sum_u32", "sum(Rows.values().map(fn(r) => Int(r.b)))"),
    ("k_count_flag", "count(Rows.values().filter(fn(r) => r.flag))"),
    ("k_filter_map_mixed", "sum(Rows.values().filter(fn(r) => r.flag).map(fn(r) => r.a + Int(r.b)))"),
    ("k_nested", "sum(Rows.values().filter(fn(r) => r.detail.on).map(fn(r) => r.detail.c - r.a))"),
    ("k_two_filters", "count(Rows.values().filter(fn(r) => r.flag).filter(fn(r) => r.detail.on))"),
    ("k_map_record", "sum(Rows.values().map(fn(r) => r.detail).filter(fn(d) => d.on).map(fn(d) => d.c))"),
    ("k_u32_compare", "sum(Rows.values().filter(fn(r) => r.b > 3).map(fn(r) => Int(r.b) + Int(r.b)))"),
    ("k_count_all", "count(Rows.values())"),
];

fn source(keeps: &[(&str, &str)]) -> String {
    let mut s = String::from(
        "module views;\nrecord Detail { c: Int, on: Bool, }\nrecord Row { a: Int, b: u32, flag: Bool, detail: Detail, }\nenum Error { Failed, }\nstate Rows: Table<u64, Row> = Table.empty();\n",
    );
    for (k, v) in keeps {
        s.push_str(&format!("keep {k}: Int = {v};\n"));
    }
    s.push_str("change put(key: u64, row: Row) -> Result<Unit, Error> writes(Rows) {\n    if Rows.contains(key) { Rows.replace(key, row); } else { Rows.insert(key, row); }\n    return Ok(());\n}\n");
    for (k, _) in keeps {
        s.push_str(&format!("query q_{k}() -> Int reads({k}) {{ return {k}; }}\n"));
    }
    s
}
fn certificate() -> Certificate {
    serde_json::from_str(include_str!("../knowledge/research/table-maintenance/table.json")).unwrap()
}
fn produce(view: &ViewModel, name: &str) -> ViewEvidence {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/view-decomposition");
    std::fs::create_dir_all(&dir).unwrap();
    let input = dir.join(format!("{name}.view.json"));
    let output = dir.join(format!("{name}.evidence.json"));
    std::fs::write(&input, serde_json::to_vec(view).unwrap()).unwrap();
    let run = Command::new("python3")
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/producers/view_decomposition.py"))
        .arg(&input)
        .arg("-o")
        .arg(&output)
        .output()
        .unwrap();
    assert!(run.status.success(), "{}", String::from_utf8_lossy(&run.stderr));
    serde_json::from_slice(&std::fs::read(&output).unwrap()).unwrap()
}
fn construct(datatype: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct { datatype: datatype.into(), constructor, arguments }
}
/// Canonical exact integer: 0, Positive(n) = n+1, Negative(n) = -(n+1).
fn integer(c: &Certificate, n: i64) -> Term {
    let exact = &c.evidence.as_ref().unwrap().model;
    let natural = (1..n.unsigned_abs()).fold(construct(&exact["Natural"], 0, vec![]), |t, _| {
        construct(&exact["Natural"], 1, vec![t])
    });
    match n.signum() {
        0 => construct(&exact["Integer"], 0, vec![]),
        1 => construct(&exact["Integer"], 1, vec![natural]),
        _ => construct(&exact["Integer"], 2, vec![natural]),
    }
}

#[test]
fn every_supported_pipeline_shape_is_decomposed_automatically() {
    let p = parse(&source(KEEPS)).unwrap();
    let c = certificate();
    for (keep, _) in KEEPS {
        let view = row_model::export_view(&p, keep, &c).unwrap();
        let evidence = produce(&view, keep);
        let checked = row_model::verify_view(&p, &c, &evidence)
            .unwrap_or_else(|e| panic!("{keep}: {e}"));
        assert_eq!(checked, view.description);
    }
}

#[test]
fn logical_pipeline_agrees_with_reference_runtime_on_concrete_rows() {
    let p: Program = parse(&source(KEEPS)).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let c = certificate();
    let row_type = verified_language::syntax::Type::Named("Row".into());
    let mut seed = 0x2545_f491_4f6c_dd1du64;
    let mut next = move |m: u64| {
        seed ^= seed << 13;
        seed ^= seed >> 7;
        seed ^= seed << 17;
        seed % m
    };
    for (keep, _) in KEEPS {
        let view = row_model::export_view(&p, keep, &c).unwrap();
        let evidence = produce(&view, keep);
        row_model::verify_view(&p, &c, &evidence).unwrap();
        let model = row_model::export(&p, keep, &c).unwrap();
        let values = SourceValues::bind(&module, &c, &model).unwrap();
        let context = library::load_bundle(&evidence.library).unwrap().context;
        let Some(list) = (match &view.description.rows {
            verified_language::logic::Sort::Data(id) => Some(id.clone()),
            _ => None,
        }) else {
            panic!("rows sort")
        };
        for trial in 0..6 {
            // Small values keep unary exact integers within kernel depth.
            let mut runtime = Runtime::new(p.clone()).unwrap();
            let mut rows = construct(&list, 0, vec![]);
            for key in 0..(1 + next(4)) {
                let row = json!({"a": {"Int": (next(16) as i64 - 5).to_string()}, "b": next(8),
                                 "flag": next(2) == 0, "detail": {"c": {"Int": (next(12) as i64 - 3).to_string()}, "on": next(2) == 0}});
                runtime.invoke_json("put", &json!([key, row])).unwrap();
                let value = Value::from_json(&row, &row_type, &p).unwrap();
                rows = construct(&list, 1, vec![values.encode_row(&value, Limits::default()).unwrap(), rows]);
            }
            let out = runtime.invoke_json(&format!("q_{keep}"), &json!([])).unwrap().json();
            let expected: i64 = out["result"]["Int"].as_str().unwrap().parse().unwrap();
            let got = context
                .evaluate(&[], &Term::Call { function: view.description.pipeline.clone(), arguments: vec![rows.clone()] })
                .unwrap_or_else(|e| panic!("{keep} trial {trial}: {e}"));
            assert_eq!(got, integer(&c, expected), "{keep} trial {trial}");
            let decomposed = context
                .evaluate(&[], &Term::Call { function: view.description.decomposed.clone(), arguments: vec![rows] })
                .unwrap();
            assert_eq!(decomposed, got, "{keep} trial {trial}");
        }
    }
}

#[test]
fn wrong_stale_or_tampered_view_evidence_is_rejected() {
    let p = parse(&source(KEEPS)).unwrap();
    let c = certificate();
    let view = row_model::export_view(&p, "k_filter_map_mixed", &c).unwrap();
    let good = produce(&view, "k_filter_map_mixed");
    row_model::verify_view(&p, &c, &good).unwrap();

    // Evidence for one keep cannot stand in for another.
    let mut other = good.clone();
    other.keep = "k_nested".into();
    assert!(row_model::verify_view(&p, &c, &other).is_err());

    // A proof of something else is not a proof of the obligation.
    let mut wrong = good.clone();
    let rows = Term::Var("rows".into());
    wrong.proof = Proof::Refl(Term::Call { function: view.description.pipeline.clone(), arguments: vec![rows] });
    assert!(row_model::verify_view(&p, &c, &wrong).is_err());

    // Changing an exported definition's bytes breaks its content identity.
    let mut tampered = good.clone();
    let stage = &view.description.stages[0].function;
    let raw = tampered.library.objects[stage].replace("\"Var\":\"head\"", "\"Var\":\"tail\"");
    tampered.library.objects.insert(stage.clone(), raw);
    assert!(row_model::verify_view(&p, &c, &tampered).is_err());

    // Dropping an exported definition is rejected before kernel checking.
    let mut missing = good.clone();
    missing.library.objects.remove(&view.description.decomposed);
    assert!(row_model::verify_view(&p, &c, &missing).is_err());

    // Stale evidence: the same keep name with a different filter.
    let changed: Vec<(&str, &str)> = KEEPS
        .iter()
        .map(|(k, v)| {
            if *k == "k_filter_map_mixed" {
                (*k, "sum(Rows.values().filter(fn(r) => r.detail.on).map(fn(r) => r.a + Int(r.b)))")
            } else {
                (*k, *v)
            }
        })
        .collect();
    let q = parse(&source(&changed)).unwrap();
    assert!(row_model::verify_view(&q, &c, &good).is_err());

    // A lemma claiming a different projection fails in the kernel.
    let mut false_lemma = good.clone();
    let target = false_lemma
        .library
        .objects
        .iter()
        .find(|(_, raw)| raw.contains("\"name\":\"view_k_filter_map_mixed_proj_3\""))
        .map(|(id, raw)| (id.clone(), raw.clone()))
        .unwrap();
    let zero = serde_json::to_string(&integer(&c, 0)).unwrap();
    let mut object: Json = serde_json::from_str(&target.1).unwrap();
    object["declaration"]["Function"]["body"] = serde_json::from_str(&zero).unwrap();
    let raw = serde_json::to_string(&object).unwrap();
    use sha2::{Digest, Sha256};
    let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
    let text = serde_json::to_string(&false_lemma).unwrap().replace(&target.0, &id);
    let mut false_lemma: ViewEvidence = serde_json::from_str(&text).unwrap();
    false_lemma.library.objects.remove(&target.0);
    false_lemma.library.objects.insert(id, raw);
    assert!(row_model::verify_view(&p, &c, &false_lemma).is_err());
}

#[test]
fn unsigned_fields_cast_to_int_faithfully() {
    let p = parse(&source(&[("k_sum_u32", "sum(Rows.values().map(fn(r) => Int(r.b)))")])).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let c = certificate();
    let model = row_model::export(&p, "k_sum_u32", &c).unwrap();
    let values = SourceValues::bind(&module, &c, &model).unwrap();
    let row_type = verified_language::syntax::Type::Named("Row".into());
    // Every bit position is exercised symbolically by the proofs; concrete
    // evaluation is bounded by unary exact-integer depth, so values stay small.
    for b in [0u64, 1, 2, 3, 5, 7, 8, 15, 16, 31, 32, 40] {
        let row = json!({"a": {"Int": "0"}, "b": b, "flag": true, "detail": {"c": {"Int": "0"}, "on": true}});
        let encoded = values
            .encode_row(&Value::from_json(&row, &row_type, &p).unwrap(), Limits::default())
            .unwrap();
        let got = values
            .context()
            .evaluate(&[], &Term::Call { function: model.description.projection.clone(), arguments: vec![encoded] })
            .unwrap_or_else(|e| panic!("b = {b}: {e}"));
        assert_eq!(got, integer(&c, b as i64), "b = {b}");
    }
}

#[test]
fn emit_state_proves_every_maintained_view_automatically() {
    let dir = Path::new(env!("CARGO_MANIFEST_DIR")).join("build/view-decomposition-emit");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let program = dir.join("views.ink");
    std::fs::write(&program, source(KEEPS)).unwrap();
    let out = dir.join("project");
    let run = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-state")
        .arg(&program)
        .arg("-o")
        .arg(&out)
        .arg("--maintenance")
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/table-maintenance/table.json"))
        .arg("--prove-views")
        .output()
        .unwrap();
    assert!(run.status.success(), "{}", String::from_utf8_lossy(&run.stderr));
    let plan: Json = serde_json::from_slice(&std::fs::read(out.join("plan.json")).unwrap()).unwrap();
    let views = plan["view_decompositions"].as_array().unwrap();
    assert_eq!(views.len(), KEEPS.len());
    for (keep, _) in KEEPS {
        assert!(out.join(format!("views/{keep}.evidence.json")).exists());
    }
    // A producer that answers wrongly never yields maintenance: --prove-views
    // falls back explicitly to the recomputing baseline, --require-views fails.
    let bad = dir.join("bad_producer.py");
    std::fs::write(&bad, "import json,sys\nv=json.load(open(sys.argv[1]))\njson.dump({'schema':1,'semantics':'source-view-pipeline-decomposition-v1','keep':v['description']['row']['keep'],'library':v['library'],'proof':{'Refl':{'Var':'rows'}}},open(sys.argv[3],'w'))\n").unwrap();
    let run = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-state")
        .arg(&program)
        .arg("-o")
        .arg(dir.join("bad"))
        .arg("--maintenance")
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/table-maintenance/table.json"))
        .arg("--prove-views")
        .arg("--view-tool")
        .arg(&bad)
        .output()
        .unwrap();
    assert!(run.status.success(), "{}", String::from_utf8_lossy(&run.stderr));
    let plan: Json = serde_json::from_slice(&std::fs::read(dir.join("bad/plan.json")).unwrap()).unwrap();
    assert!(plan["view_fallback"]["reason"].as_str().unwrap().contains("view decomposition not established"));
    assert!(plan["maintenance_certificate"].is_null());
    let code = std::fs::read_to_string(dir.join("bad/src/lib.rs")).unwrap();
    assert!(!code.contains("cache_l_"), "fallback must not maintain caches");
    let run = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-state")
        .arg(&program)
        .arg("-o")
        .arg(dir.join("bad-required"))
        .arg("--maintenance")
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/table-maintenance/table.json"))
        .arg("--require-views")
        .arg("--view-tool")
        .arg(&bad)
        .output()
        .unwrap();
    assert!(!run.status.success());
    assert!(String::from_utf8_lossy(&run.stderr).contains("view decomposition not established"));
}
