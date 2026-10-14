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
    }
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
}
