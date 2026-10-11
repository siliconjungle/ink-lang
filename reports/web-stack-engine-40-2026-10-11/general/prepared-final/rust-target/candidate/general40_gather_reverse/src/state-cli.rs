use compiled_state::{
    durable::{FileStore, Host},
    State,
};
use serde_json::Value;
enum Instance {
    Memory(State),
    Durable(Host<State, FileStore>),
}
impl Instance {
    fn live(&self) -> Result<(), String> {
        match self {
            Self::Memory(_) => Ok(()),
            Self::Durable(host) => host.version().map(|_| ()),
        }
    }
    fn invoke(&mut self, step: &Value) -> Result<Value, String> {
        let call = step["call"].as_str().ok_or("missing call")?;
        match self {
            Self::Memory(state) => state.invoke_json(call, &step["args"]),
            Self::Durable(host) => host.invoke(
                step["id"]
                    .as_str()
                    .ok_or("durable actions require a request id")?,
                call,
                &step["args"],
            ),
        }
    }
    fn pure(&mut self, call: &str, args: &Value) -> Result<Value, String> {
        match self {
            Self::Memory(s) => s.call_json(call, args),
            Self::Durable(h) => h.pure(call, args),
        }
    }
    fn checkpoint(&self) -> Result<Vec<u8>, String> {
        match self {
            Self::Memory(s) => s.checkpoint(),
            Self::Durable(h) => h.checkpoint(),
        }
    }
    fn acknowledge(&mut self, commit: u64, position: u64) -> Result<(), String> {
        match self {
            Self::Memory(s) => {
                s.acknowledge_through(commit, position);
                Ok(())
            }
            Self::Durable(h) => h.acknowledge(commit, position),
        }
    }
}
fn run_with_pure(
    mut pure: impl FnMut(&mut Instance, &Value) -> Result<Value, String>,
) -> Result<(), String> {
    let mut args = std::env::args().skip(1);
    let file = args.next().ok_or("expected SCRIPT.json")?;
    let mut restore = None;
    let mut snapshot_out = None;
    let mut durable = None;
    while let Some(flag) = args.next() {
        let value = args.next().ok_or("missing option value")?;
        match flag.as_str() {
            "--restore" => restore = Some(value),
            "--snapshot-out" => snapshot_out = Some(value),
            "--durable" => durable = Some(value),
            _ => return Err(format!("unknown option {flag}")),
        }
    }
    if durable.is_some() && restore.is_some() {
        return Err(
            "--durable opens its stored state; --restore is for in-memory execution".into(),
        );
    }
    let script: Value = serde_json::from_slice(&std::fs::read(file).map_err(|e| e.to_string())?)
        .map_err(|e| e.to_string())?;
    let steps = script.as_array().ok_or("expected script array")?;
    if durable.is_some() && steps.iter().any(|s| s.get("restore").is_some()) {
        return Err("durable histories cannot replace committed state with a restore step".into());
    }
    let mut state = if let Some(path) = durable {
        Instance::Durable(Host::open(FileStore::open(path)?, 256)?)
    } else {
        Instance::Memory(if let Some(path) = restore {
            State::restore(&std::fs::read(path).map_err(|e| e.to_string())?)?
        } else {
            State::new()
        })
    };
    let mut output = vec![];
    for step in steps {
        if let Some(bytes) = step.get("restore") {
            let bytes: Vec<u8> =
                serde_json::from_value(bytes.clone()).map_err(|e| e.to_string())?;
            state = Instance::Memory(State::restore(&bytes)?);
            continue;
        }
        if let Some(ack) = step.get("acknowledge").or_else(|| step.get("ack")) {
            state.acknowledge(
                ack[0].as_u64().ok_or("commit")?,
                ack[1].as_u64().ok_or("position")?,
            )?;
            continue;
        }
        let value = if step.get("pure").and_then(Value::as_str).is_some() {
            state.live().and_then(|()| pure(&mut state, step))
        } else {
            state.invoke(step)
        };
        output.push(match value {
            Ok(v) => v,
            Err(e) => serde_json::json!({"host_error":e}),
        });
    }
    if let Some(path) = snapshot_out {
        std::fs::write(path, state.checkpoint()?).map_err(|e| e.to_string())?;
    }
    println!(
        "{}",
        serde_json::to_string(&output).map_err(|e| e.to_string())?
    );
    Ok(())
}
