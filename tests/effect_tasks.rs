//! External effects and tasks: lowering, manifest checking, sequential
//! reference execution, and replay of traces recorded by the concurrent
//! JavaScript host (runtime/hosts/tasks.mjs). See docs/effect-tasks.md.
use ink_core::tasks::Kind;
use serde_json::{json, Value};
use std::{collections::BTreeMap, path::Path, process::Command};
use verified_language::{
    core::CheckedModule,
    stateful::Runtime,
    syntax,
    tasks::{replay, run, run_concurrent, Cancel, Trace},
};

const SOURCE: &str = include_str!("../examples/effect-tasks.ink");

fn rejects(change: (&str, &str), message: &str) {
    assert!(SOURCE.contains(change.0), "fixture text missing: {}", change.0);
    let source = SOURCE.replacen(change.0, change.1, 1);
    let error = syntax::parse(&source).and_then(|p| CheckedModule::from_source(p).map(|_| ())).unwrap_err();
    assert!(error.contains(message), "expected {message:?}, got {error}");
}

#[test]
fn lowering_fixes_dependencies_and_rejects_ill_formed_tasks() {
    let p = syntax::parse(SOURCE).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let m = &p.contracts.tasks;
    assert_eq!(
        m.effects.iter().map(|e| (e.name.as_str(), e.ordered)).collect::<Vec<_>>(),
        [
            ("fetch_ticket", false),
            ("lookup_customer", false),
            ("classify", false),
            ("summarise", false),
            ("notify", true)
        ]
    );
    assert_eq!(m.effects[2].declarations, "enum Label { Bug, Billing, Question, Other, }");
    let t = &m.tasks[0];
    let kinds: Vec<Kind> = t.steps.iter().map(|s| s.kind.clone()).collect();
    assert_eq!(
        kinds,
        [Kind::Effect, Kind::Effect, Kind::Effect, Kind::Effect, Kind::Value, Kind::Change, Kind::Effect]
    );
    // Customer lookup, classification and summary use only the ticket, so they
    // may run together; the change and the ordered effect wait for everything.
    let after: Vec<Vec<u32>> = t.steps.iter().map(|s| s.after.clone()).collect();
    assert_eq!(after, [vec![], vec![0], vec![0], vec![0], vec![1], vec![0, 1, 2, 3, 4], vec![0, 1, 2, 3, 4, 5]]);
    assert_eq!(t.steps[2].uses, ["ticket"]);
    assert!(t.steps[2].fallback.is_some() && t.steps[1].fallback.is_none());
    assert!(t.steps[0].propagate && t.steps[5].propagate && t.steps[6].propagate);
    // Every generated declaration is an ordinary readonly query.
    for s in &t.steps {
        for q in s.args.iter().chain(&s.accept).chain(&s.fallback) {
            let a = p.actions.iter().find(|a| &a.name == q).unwrap();
            assert!(a.reads.is_empty() && a.writes.is_empty());
        }
    }

    // A manifest that lets a change overtake an earlier effect is rejected.
    let mut forged = p.clone();
    forged.contracts.tasks.tasks[0].steps[5].after = vec![2];
    assert!(CheckedModule::from_source(forged).unwrap_err().contains("wait for every earlier step"));
    let mut forged = p.clone();
    forged.contracts.tasks.tasks[0].steps[2].after.clear();
    assert!(CheckedModule::from_source(forged).unwrap_err().contains("invalid dependencies"));
    let mut forged = p.clone();
    forged.contracts.tasks.tasks[0].steps[2].accept = Some("__task_triage_3_accept".into());
    assert!(CheckedModule::from_source(forged).unwrap_err().contains("wrong signature"));

    rejects(
        ("let plan: String = plan_of(customer);", "let plan = plan_of(customer);"),
        "needs a type annotation",
    );
    rejects(("let plan: String = plan_of(customer);", "let plan: u32 = plan_of(customer);"), "");
    rejects(
        (
            "let customer = lookup_customer(ticket.customer);",
            "let customer = lookup_customer(ticket.customer)?;",
        ),
        "`?` needs a Result",
    );
    rejects(
        ("let count = record(id, label)?;", "let count = record(id, label) ensures count > 0 else 0;"),
        "guards a bound effect result",
    );
    rejects(
        (
            "ensures string_byte_len(summary) <= 140 else \"\"",
            "ensures string_byte_len(summary) <= 140 else 3",
        ),
        "",
    );
    rejects(("let plan: String", "let ticket: String"), "already bound");
    rejects(
        ("task triage(id: u32) -> Result<Label, String>", "task triage(id: u32) -> Result<Label, u32>"),
        "`?` needs the task to return Result<_, String>",
    );
    rejects(("effect summarise(text: String)", "effect rule_label(text: String)"), "collides");
    rejects(("  return Ok(label);\n}", "}"), "a task ends with `return EXPR;`");
    rejects(
        ("let summary = summarise(ticket.text)", "let summary = summarise(ticket.text, 1)"),
        "takes 1 arguments",
    );
}

fn reference(p: &ink_core::core::Program, id: u32, replies: &BTreeMap<&str, Result<Value, String>>) -> (Trace, Runtime) {
    let mut rt = Runtime::new(p.clone()).unwrap();
    let trace = run(&mut rt, &p.contracts.tasks, "triage", &[json!(id)], &mut |_, effect, _| replies[effect].clone()).unwrap();
    (trace, rt)
}

#[test]
fn sequential_reference_applies_types_contracts_and_fallbacks() {
    let p = syntax::parse(SOURCE).unwrap();
    let ticket = json!({"Ok": {"id": 1, "customer": "c1", "text": "export crashes"}});
    let mut replies: BTreeMap<&str, Result<Value, String>> = BTreeMap::from([
        ("fetch_ticket", Ok(ticket)),
        ("lookup_customer", Ok(json!({"Some": {"name": "c1", "plan": "enterprise"}}))),
        ("classify", Ok(json!("Label.Billing"))),
        ("summarise", Ok(json!("crash on export"))),
        ("notify", Ok(json!({"Ok": null}))),
    ]);
    let (trace, mut rt) = reference(&p, 1, &replies);
    assert_eq!(trace.result, Some(json!({"Ok": "Label.Billing"})));
    assert_eq!(trace.effects[4].args, [json!("priority"), json!("crash on export")]);
    assert_eq!(rt.invoke_json("label_of", &json!([1])).unwrap().result.json(), json!({"Some": "Label.Billing"}));

    // Rejected by `ensures`, by the declared type, or failed: the authored value.
    for reply in [Ok(json!("Label.Other")), Ok(json!("Label.Urgent")), Ok(json!(3)), Err("timeout".to_string())] {
        replies.insert("classify", reply);
        replies.insert("summarise", Ok(json!("x".repeat(141))));
        let (trace, _) = reference(&p, 1, &replies);
        assert_eq!(trace.result, Some(json!({"Ok": "Label.Question"})));
        assert_eq!(trace.effects[2].outcome, "fallback");
        assert_eq!(trace.effects[3].outcome, "fallback");
        assert_eq!(trace.effects[4].args, [json!("priority"), json!("")]);
    }
    // `?` ends the task with the effect's error before any change.
    replies.insert("fetch_ticket", Ok(json!({"Err": "missing"})));
    let (trace, mut rt) = reference(&p, 1, &replies);
    assert_eq!((trace.result, trace.effects.len()), (Some(json!({"Err": "missing"})), 1));
    assert_eq!(rt.invoke_json("triaged", &json!([])).unwrap().result.json(), json!(0));
    // An unguarded effect of the wrong type fails the task as a host error.
    replies.insert("fetch_ticket", Ok(json!({"Ok": {"id": 1}})));
    let (trace, _) = reference(&p, 1, &replies);
    assert!(trace.result.is_none() && trace.error.unwrap().contains("rejects"));
}

#[test]
fn concurrent_javascript_traces_replay_on_the_reference_evaluator() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join("build/effect-tasks");
    let _ = std::fs::remove_dir_all(&dir);
    std::fs::create_dir_all(&dir).unwrap();
    let ink = env!("CARGO_BIN_EXE_ink");
    let example = root.join("examples/effect-tasks.ink");
    for args in [
        vec![
            "build".into(),
            example.display().to_string(),
            "--target".into(),
            "javascript".into(),
            "-o".into(),
            dir.join("program.mjs").display().to_string(),
        ],
        vec![
            "emit-tasks".into(),
            example.display().to_string(),
            "-o".into(),
            dir.join("tasks.json").display().to_string(),
        ],
    ] {
        let out = Command::new(ink).args(&args).output().unwrap();
        assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    }
    for mode in ["interpreted", "compiled"] {
        let out = Command::new("node")
            .arg(root.join("tests/fixtures/effect-tasks-host.mjs"))
            .arg(dir.join("program.mjs"))
            .arg(dir.join("tasks.json"))
            .arg(mode)
            .output()
            .unwrap();
        assert!(out.status.success(), "{mode}: {}", String::from_utf8_lossy(&out.stderr));
        let report: Value = serde_json::from_slice(&out.stdout).unwrap();
        let runs = report["traces"].as_array().unwrap();
        // The three requests that depend only on the ticket overlapped.
        assert!(runs[0]["peak"].as_u64().unwrap() >= 3, "peak concurrency {}", runs[0]["peak"]);
        assert!(report["prompt"]
            .as_str()
            .unwrap()
            .contains("classify(text: String, labels: List<Label>) -> Label"));

        let p = syntax::parse(SOURCE).unwrap();
        let mut rt = Runtime::new(p.clone()).unwrap();
        let mut results = vec![];
        for (i, r) in runs.iter().enumerate() {
            let trace: Trace = serde_json::from_value(r["trace"].clone()).unwrap();
            let checked = replay(&mut rt, &p.contracts.tasks, &trace).unwrap_or_else(|e| panic!("run {}: {e}", i + 1));
            results.push(checked.result.clone().unwrap_or_else(|| json!({"host_error": checked.error.is_some()})));
            // Tampering with a recorded reply changes the replayed result or is rejected.
            if i == 0 {
                let k = trace.effects.iter().position(|e| e.effect == "classify" && e.outcome == "accepted").unwrap();
                let mut forged = trace.clone();
                forged.effects[k].reply = Some(json!("Label.Question"));
                let mut scratch = Runtime::new(p.clone()).unwrap();
                assert!(replay(&mut scratch, &p.contracts.tasks, &forged).is_err());
            }
        }
        assert_eq!(
            results,
            [
                json!({"Ok": "Label.Bug"}),
                json!({"Ok": "Label.Question"}),
                json!({"Ok": "Label.Question"}),
                json!({"Err": "no such ticket"}),
                json!({"Err": "channel closed"}),
                json!({"host_error": true}),
            ]
        );
        // Speculative requests after the failing lookup were discarded, not replayed.
        let failed: Trace = serde_json::from_value(runs[5]["trace"].clone()).unwrap();
        assert!(failed.effects.iter().any(|e| e.outcome == "failed" && e.effect == "lookup_customer"));
        assert!(failed.effects.iter().all(|e| e.step <= 1 || e.outcome == "discarded"));
        // Ordered notifications were sent only for tasks whose change committed.
        assert_eq!(report["sent"], json!([["priority", ""], ["queue", ""], ["queue", "short"], ["queue", "s"]]));
        // Final state agrees between the JavaScript host and the reference replay.
        let labels: Vec<Value> = (1..=6).map(|id| rt.invoke_json("label_of", &json!([id])).unwrap().result.json()).collect();
        assert_eq!(
            json!({"triaged": rt.invoke_json("triaged", &json!([])).unwrap().result.json(), "labels": labels}),
            report["final"]
        );
        assert_eq!(report["final"]["triaged"], json!(4));

        // The native concurrent runner, given the same replies, records the same
        // requests, outcomes and results, ends in the same state, and its
        // traces replay on the reference evaluator.
        if mode == "interpreted" {
            let mut native = Runtime::new(p.clone()).unwrap();
            for (i, r) in runs.iter().enumerate() {
                let recorded: Trace = serde_json::from_value(r["trace"].clone()).unwrap();
                let active = std::sync::atomic::AtomicUsize::new(0);
                let peak = std::sync::atomic::AtomicUsize::new(0);
                let reply = |step: u32, effect: &str, args: &[Value], _cancel: &Cancel| {
                    use std::sync::atomic::Ordering::SeqCst;
                    let now = active.fetch_add(1, SeqCst) + 1;
                    peak.fetch_max(now, SeqCst);
                    std::thread::sleep(std::time::Duration::from_millis(30));
                    active.fetch_sub(1, SeqCst);
                    let r = recorded.effects.iter().find(|e| e.step == step).ok_or("not started in the recording")?;
                    assert_eq!((r.effect.as_str(), r.args.as_slice()), (effect, args), "run {}: request", i + 1);
                    r.reply.clone().ok_or_else(|| r.error.clone().unwrap_or_default())
                };
                let id = recorded.args[0].clone();
                let trace = run_concurrent(
                    &mut |name, args| Ok(native.invoke_json(name, &Value::Array(args))?.result.json()),
                    &p.contracts.tasks,
                    "triage",
                    &[id],
                    &reply,
                    8,
                )
                .unwrap();
                let kept = |t: &Trace| {
                    t.effects
                        .iter()
                        .filter(|e| e.outcome != "discarded")
                        .map(|e| (e.step, e.effect.clone(), e.args.clone(), e.reply.clone(), e.error.clone(), e.outcome.clone()))
                        .collect::<Vec<_>>()
                };
                assert_eq!(kept(&trace), kept(&recorded), "run {}: kept effects", i + 1);
                assert_eq!((trace.result.clone(), trace.error.is_some()), (recorded.result.clone(), recorded.error.is_some()), "run {}", i + 1);
                if i == 0 {
                    assert!(peak.load(std::sync::atomic::Ordering::SeqCst) >= 3, "native peak concurrency");
                }
                let mut scratch = Runtime::new(p.clone()).unwrap();
                for earlier in &runs[..i] {
                    let t: Trace = serde_json::from_value(earlier["trace"].clone()).unwrap();
                    replay(&mut scratch, &p.contracts.tasks, &t).unwrap();
                }
                replay(&mut scratch, &p.contracts.tasks, &trace).unwrap_or_else(|e| panic!("native run {}: {e}", i + 1));
            }
            let labels: Vec<Value> = (1..=6).map(|id| native.invoke_json("label_of", &json!([id])).unwrap().result.json()).collect();
            assert_eq!(json!({"triaged": native.invoke_json("triaged", &json!([])).unwrap().result.json(), "labels": labels}), report["final"]);
        }

        // With the state compiled to Wasm, the concurrent JavaScript host given the
        // recorded replies produces the same traces and final state.
        if mode == "interpreted" && std::env::var_os("INK_TEST_WASM").is_some() {
            let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
            let project = dir.join("rust");
            ink_runtime::emit_rust_program(&ink_lowering_rust::state_native::emit(module.program()).unwrap(), &project).unwrap();
            ink_runtime::toolchain::complete_program(&project, true, &project.join("program.wasm"), "cargo").unwrap();
            std::fs::write(dir.join("state-wasm.mjs"), ink_runtime::STATE_WASM_HOST).unwrap();
            let recorded: Vec<Value> = runs.iter().map(|r| r["trace"].clone()).collect();
            std::fs::write(dir.join("recorded.json"), serde_json::to_vec(&recorded).unwrap()).unwrap();
            let out = Command::new("node")
                .arg(root.join("tests/fixtures/effect-tasks-wasm.mjs"))
                .arg(&dir)
                .arg(dir.join("tasks.json"))
                .arg(dir.join("recorded.json"))
                .output()
                .unwrap();
            assert!(out.status.success(), "wasm: {}", String::from_utf8_lossy(&out.stderr));
            let wasm: Value = serde_json::from_slice(&out.stdout).unwrap();
            for (i, (w, r)) in wasm["traces"].as_array().unwrap().iter().zip(runs).enumerate() {
                let (w, r): (Trace, Trace) = (serde_json::from_value(w["trace"].clone()).unwrap(), serde_json::from_value(r["trace"].clone()).unwrap());
                let kept = |t: &Trace| t.effects.iter().filter(|e| e.outcome != "discarded").map(|e| (e.step, e.args.clone(), e.reply.clone(), e.outcome.clone())).collect::<Vec<_>>();
                assert_eq!(kept(&w), kept(&r), "wasm run {}", i + 1);
                assert_eq!((w.result, w.error.is_some()), (r.result, r.error.is_some()), "wasm run {}", i + 1);
            }
            assert!(wasm["traces"][0]["peak"].as_u64().unwrap() >= 3, "wasm peak concurrency");
            assert_eq!(wasm["final"], report["final"]);
        }

        if mode == "interpreted" {
            // The CLI replays a saved trace too.
            std::fs::write(dir.join("trace.json"), serde_json::to_vec(&runs[1]["trace"]).unwrap()).unwrap();
        }
    }
    let out = Command::new(ink).arg("replay-task").arg(&example).arg(dir.join("trace.json")).output().unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let replayed: Value = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(replayed["result"], json!({"Ok": "Label.Question"}));
}
