use ink_runtime::adaptive::{CompiledState, Factories, Host};
use serde_json::{json, Value};
use std::{cell::Cell, rc::Rc};
struct Instance {
    value: u64,
    calls: Rc<Cell<u64>>,
}
impl CompiledState for Instance {
    type Reply = u64;
    fn call(&mut self, name: &str, args: &Value) -> Result<u64, String> {
        self.calls.set(self.calls.get() + 1);
        if name == "fail" {
            return Err("failure".into());
        }
        if name == "write" {
            self.value = args[0].as_u64().unwrap();
        }
        Ok(self.value)
    }
    fn checkpoint(&self) -> Result<Vec<u8>, String> {
        Ok(self.value.to_le_bytes().to_vec())
    }
}
struct Factory {
    calls: Rc<Cell<u64>>,
    corrupt: bool,
}
impl Factories for Factory {
    type Instance = Instance;
    fn create(&self, _: &str) -> Result<Instance, String> {
        Ok(Instance {
            value: 0,
            calls: self.calls.clone(),
        })
    }
    fn restore(&self, _: &str, bytes: &[u8]) -> Result<Instance, String> {
        Ok(Instance {
            value: if self.corrupt {
                999
            } else {
                u64::from_le_bytes(bytes.try_into().unwrap())
            },
            calls: self.calls.clone(),
        })
    }
}
#[test]
fn native_switch_retains_reply_state_and_never_repeats_effects() {
    for corrupt in [false, true] {
        let calls = Rc::new(Cell::new(0));
        let binding = json!({"source":"a".repeat(64),"compiler":"b".repeat(64),"target":"native-test","boundary":"owned-serial-state-v1","variants":{"a":"c".repeat(64),"b":"d".repeat(64)}});
        let profile = json!({"binding":binding,"variants":{"a":{"cells":{"action:read@s":{"low_ns":1000,"high_ns":1000}},"peak_bytes":10},"b":{"cells":{"action:read@s":{"low_ns":1,"high_ns":1}},"peak_bytes":20}},"migrations":[{"from":"a","to":"b","high_ns":1,"max_pause_ns":1,"peak_bytes":40,"min_state_elements":0,"max_state_elements":100}]});
        let policy = json!({"horizon_calls":100,"min_residence_calls":4,"stable_windows":2,"min_gain":0.1,"migration_margin":2,"memory_limit_bytes":100,"max_pause_ns":1000000000,"max_switches":2});
        let mut host = Host::new(
            Factory {
                calls: calls.clone(),
                corrupt,
            },
            serde_json::from_value(binding).unwrap(),
            serde_json::from_value(profile).unwrap(),
            serde_json::from_value(policy).unwrap(),
            "a".into(),
            2,
            2,
            1024,
        )
        .unwrap();
        assert_eq!(host.call("write", &json!([7]), "s", 1).unwrap(), 7);
        for _ in 0..8 {
            assert_eq!(host.call("read", &json!([]), "s", 1).unwrap(), 7);
        }
        assert_eq!(host.current(), if corrupt { "a" } else { "b" });
        assert_eq!(host.disabled, corrupt);
        assert_eq!(calls.get(), 9);
        assert!(host.call("fail", &json!([]), "s", 1).is_err());
        assert_eq!(calls.get(), 10);
        assert_eq!(host.checkpoint().unwrap(), 7u64.to_le_bytes());
        assert!(host.recent().len() <= 4);
        host.disable_recording();
        let count = host.recent().len();
        assert_eq!(host.call("read", &json!([]), "unknown", 0).unwrap(), 7);
        assert_eq!(host.recent().len(), count);
        let mut group = ink_runtime::adaptive::Collections::default();
        group.insert("one".into(), host).unwrap();
        assert_eq!(
            group.get_mut("one").unwrap().checkpoint().unwrap(),
            7u64.to_le_bytes()
        );
        assert!(group.get_mut("missing").is_err());
    }
}

#[test]
fn native_authored_goals_retarget_without_replaying_actions_or_resetting_budgets() {
    use ink_abi::objective::{Direction, Goal, Score};
    use ink_runtime::adaptive::Objective;
    let calls = Rc::new(Cell::new(0));
    let binding = json!({"source":"a".repeat(64),"compiler":"b".repeat(64),"target":"native-goal-test","boundary":"owned-serial-state-v1","variants":{"a":"c".repeat(64),"b":"d".repeat(64)}});
    let cells = |ns| json!({"action:read@s":{"low_ns":ns,"high_ns":ns}});
    let profile = json!({"binding":binding,"variants":{"a":{"cells":cells(100),"peak_bytes":400},"b":{"cells":cells(200),"peak_bytes":80}},"migrations":[{"from":"a","to":"b","high_ns":1,"max_pause_ns":1,"peak_bytes":500,"min_state_elements":0,"max_state_elements":100},{"from":"b","to":"a","high_ns":1,"max_pause_ns":1,"peak_bytes":500,"min_state_elements":0,"max_state_elements":100}]});
    let policy = json!({"horizon_calls":100,"min_residence_calls":1,"stable_windows":2,"min_gain":0.1,"migration_margin":2,"memory_limit_bytes":1000,"max_pause_ns":1000000000,"max_switches":2});
    let mut host = Host::new(
        Factory {
            calls: calls.clone(),
            corrupt: false,
        },
        serde_json::from_value(binding).unwrap(),
        serde_json::from_value(profile).unwrap(),
        serde_json::from_value(policy).unwrap(),
        "a".into(),
        2,
        1,
        1024,
    )
    .unwrap();
    let goal = |revision| Goal {
        source: "e".repeat(64),
        entry: "rank".into(),
        revision,
        context: format!("{:064x}", revision),
    };
    let objective = |revision, memory| {
        Objective::new(
            goal(revision),
            Direction::Minimize,
            0.0,
            move |candidates| {
                Ok(candidates
                    .iter()
                    .map(|c| {
                        let (low, high) = if memory {
                            (c.peak_bytes as f64, c.peak_bytes as f64)
                        } else {
                            (c.total_low_ns, c.total_high_ns)
                        };
                        (c.variant.clone(), Score { low, high })
                    })
                    .collect())
            },
        )
        .unwrap()
    };
    host.retarget(Some(objective(1, true)), None).unwrap();
    for _ in 0..2 {
        host.call("read", &json!([]), "s", 0).unwrap();
    }
    assert_eq!(host.current(), "a");
    assert!(host
        .retarget(Some(objective(2, false)), Some(&goal(99)))
        .is_err());
    assert_eq!(host.objective(), Some(&goal(1)));
    for _ in 0..2 {
        host.call("read", &json!([]), "s", 0).unwrap();
    }
    assert_eq!(host.current(), "b");
    host.call("read", &json!([]), "s", 0).unwrap();
    host.retarget(Some(objective(2, false)), Some(&goal(1)))
        .unwrap();
    assert!(host.recent().is_empty());
    for _ in 0..3 {
        host.call("read", &json!([]), "s", 0).unwrap();
    }
    assert_eq!(host.current(), "b", "old partial windows must be discarded");
    host.call("read", &json!([]), "s", 0).unwrap();
    assert_eq!(host.current(), "a");
    host.retarget(Some(objective(3, true)), Some(&goal(2)))
        .unwrap();
    for _ in 0..4 {
        host.call("read", &json!([]), "s", 0).unwrap();
    }
    assert_eq!(
        host.current(),
        "a",
        "goal updates must preserve the switch cap"
    );
    assert_eq!(calls.get(), 13);
    assert_eq!(host.checkpoint().unwrap(), 0u64.to_le_bytes());
    host.disable_recording();
    host.retarget(None, Some(&goal(3))).unwrap();
    assert!(host.disabled);
}

#[test]
fn emitted_adaptive_state_preserves_reference_histories() {
    use std::{path::Path, process::Command};
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let output = root.join(format!(
        "build/adaptive-state-conformance-{}",
        std::process::id()
    ));
    if output.exists() {
        std::fs::remove_dir_all(&output).unwrap();
    }
    let prepare = Command::new("python3")
        .current_dir(root)
        .args([
            "bench/adaptive-state/prepare.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--point",
            "--target-key",
            "conformance-node",
            "-o",
        ])
        .arg(&output)
        .output()
        .unwrap();
    assert!(
        prepare.status.success(),
        "{}",
        String::from_utf8_lossy(&prepare.stderr)
    );
    let run = Command::new("node")
        .current_dir(root)
        .arg("bench/adaptive-state/run.mjs")
        .arg(output.join("bundle"))
        .arg(env!("CARGO_BIN_EXE_ink"))
        .arg(root)
        .arg(output.join("results.json"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let goal = output.join("objective.mjs");
    let build = Command::new(env!("CARGO_BIN_EXE_ink"))
        .current_dir(root)
        .args([
            "build",
            "examples/programmable-objective.ink",
            "--target",
            "javascript",
            "-o",
        ])
        .arg(&goal)
        .output()
        .unwrap();
    assert!(
        build.status.success(),
        "{}",
        String::from_utf8_lossy(&build.stderr)
    );
    let run = Command::new("node")
        .current_dir(root)
        .arg("tests/fixtures/programmable-objective.mjs")
        .arg(output.join("bundle"))
        .arg(goal)
        .arg(output.join("objective-results.json"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
}

#[test]
fn optional_json_index_matches_compiled_source_and_reference() {
    use std::{path::Path, process::Command};
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let dir = root.join(format!(
        "build/json-lookup-conformance-{}",
        std::process::id()
    ));
    std::fs::create_dir_all(&dir).unwrap();
    let module = dir.join("program.mjs");
    let build = Command::new(env!("CARGO_BIN_EXE_ink"))
        .current_dir(root)
        .args([
            "build",
            "examples/json/main.ink",
            "--target",
            "javascript",
            "-o",
        ])
        .arg(&module)
        .output()
        .unwrap();
    assert!(
        build.status.success(),
        "{}",
        String::from_utf8_lossy(&build.stderr)
    );
    let script = r#"import assert from 'node:assert/strict';import * as m from './program.mjs';
for(const text of ['{}','{"title":null}','{"title":-0}','{"title":1.2300e+1000}','{"title":[1,"日本語",{"a":false}],"__proto__":null}']){
 const v=m.createJsonLookup(text,{stepEntries:1,minReads:1});
 for(let i=0;i<8;i++){const actual=v.lookup(['title']),expected=m.call('title',[m.parseJson(v.stringify())]);assert.deepEqual(expected,{Ok:actual.found?{Some:actual.value}:{None:null}});}
 const expected=m.call('mark_received',[m.parseJson(text)]);v.set([],'received','true');assert.deepEqual(m.parseJson(v.stringify()),expected.Ok);
}
"#;
    std::fs::write(dir.join("run.mjs"), script).unwrap();
    let run = Command::new("node")
        .arg(dir.join("run.mjs"))
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    // The independent evaluator, rather than another emitted implementation,
    // establishes the observed source result for exact-token lookup and set.
    let value = ink_abi::json_value::parse(
        "{\"title\":1.2300e+1000}",
        ink_abi::value_wire::Limits::default(),
    )
    .unwrap()
    .to_ink();
    let calls = dir.join("calls.json");
    std::fs::write(&calls, serde_json::to_vec(&json!([value])).unwrap()).unwrap();
    let reference = Command::new(env!("CARGO_BIN_EXE_ink"))
        .current_dir(root)
        .args(["run", "examples/json/main.ink", "title"])
        .arg(calls)
        .output()
        .unwrap();
    assert!(
        reference.status.success(),
        "{}",
        String::from_utf8_lossy(&reference.stderr)
    );
    let replies: Value = serde_json::from_slice(&reference.stdout).unwrap();
    assert_eq!(
        replies,
        json!({"Ok":{"Some":ink_abi::json_value::parse("1.2300e+1000",ink_abi::value_wire::Limits::default()).unwrap().to_ink()}})
    );
}

#[test]
fn offline_hindsight_analysis_and_native_usage_windows() {
    let run = std::process::Command::new("python3")
        .current_dir(env!("CARGO_MANIFEST_DIR"))
        .env("PYTHONPATH", "planner")
        .args([
            "-m",
            "unittest",
            "discover",
            "-s",
            "planner/tests",
            "-p",
            "test_lifecycle_analysis.py",
        ])
        .output()
        .unwrap();
    assert!(
        run.status.success(),
        "{}",
        String::from_utf8_lossy(&run.stderr)
    );
    let mut usage = ink_runtime::usage::Recorder::new(4, 1, 2, 1).unwrap();
    for _ in 0..4 {
        usage
            .observe(Some(
                serde_json::from_value(json!({"kind":"read","key":1})).unwrap(),
            ))
            .unwrap();
    }
    assert!(usage.recent()[0].summary.saturated);
    assert_eq!(usage.recent()[0].summary.samples, 2);
    for _ in 0..4 {
        usage.observe(None).unwrap();
    }
    assert_eq!(usage.recent().len(), 1);
    assert_eq!(usage.snapshot()["total_calls"], 8);
    assert!(usage.recent()[0].operation_mix_drift.is_none());
}
