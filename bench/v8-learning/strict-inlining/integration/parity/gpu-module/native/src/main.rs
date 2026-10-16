use ink_gpu_program::{Backend, Engine};
fn main() {
    if let Err(e) = run() {
        eprintln!("{e}");
        std::process::exit(1)
    }
}
fn run() -> Result<(), String> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    let option = |name: &str| {
        args.iter()
            .position(|s| s == name)
            .and_then(|i| args.get(i + 1))
    };
    let backend = Backend::parse(option("--backend").map(String::as_str).unwrap_or("auto"))?;
    let read = |path: &str| -> Result<serde_json::Value, String> {
        serde_json::from_str(&std::fs::read_to_string(path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())
    };
    let mut engine = Engine::new();
    let cost_profile=if let Some(path)=option("--cost-profile").map(String::as_str){serde_json::from_slice::<serde_json::Value>(&std::fs::read(path).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?}else{serde_json::Value::Null};
    engine.configure_selection(serde_json::json!({"cost_profile":cost_profile,"target_key":option("--target-key").map(String::as_str).unwrap_or(""),"policy":option("--policy").map(String::as_str).unwrap_or("adaptive"),"static_backend":option("--static-backend").map(String::as_str).unwrap_or("cpu")}))?;
    if let Some(path) = option("--script") {
        let script = read(path)?;
        let mut sessions = std::collections::BTreeMap::new();
        for call in script.as_array().ok_or("script must be an array")? {
            let b = call["backend"]
                .as_str()
                .map(Backend::parse)
                .transpose()?
                .unwrap_or(backend);
            let started = std::time::Instant::now();
            let r = if let Some(p) = call.get("pipeline") {
                engine.pipeline(p, b)
            } else if let Some(p) = call.get("open") {
                // {"open": PLAN, "as": NAME}: a resident session.
                engine.open(p, b).map(|v| {
                    let name = call["as"].as_str().unwrap_or("session").to_string();
                    sessions.insert(name, v["session"].as_u64().unwrap());
                    v
                })
            } else if let Some(name) = call.get("session").and_then(|n| n.as_str()) {
                let id = *sessions.get(name).ok_or("unknown session name")?;
                // Every session operation may also wait for completion so
                // its time includes device execution.
                let r = if let Some(n) = call.get("step") {
                    engine.step(id, n.as_u64().ok_or("step must be a count")?)
                } else if let Some(q) = call.get("read") {
                    engine.read(id, q)
                } else if let Some(w) = call.get("write") {
                    engine.write(id, w["input"].as_str().ok_or("write requires input")?, &w["value"])
                } else if call.get("close").is_some() {
                    engine.close(id).map(|_| serde_json::json!({"closed": name}))
                } else {
                    engine.finish(id).map(|_| serde_json::json!({"finished": name}))
                };
                if call["wait"].as_bool() == Some(true) && call.get("close").is_none() {
                    r.and_then(|v| engine.finish(id).map(|_| v))
                } else {
                    r
                }
            } else {
                engine.call(
                    call["call"].as_str().ok_or("missing function")?,
                    &call["args"],
                    b,
                )
            };
            let seconds = started.elapsed().as_secs_f64();
            println!(
                "{}",
                match r {
                    Ok(mut v) => {
                        if v.is_object() {
                            v["seconds"] = serde_json::json!(seconds);
                        }
                        v
                    }
                    Err(e) => serde_json::json!({"error":e,"seconds":seconds}),
                }
            );
        }
        return Ok(());
    }
    let repeat = option("--repeat")
        .map(|s| s.parse::<usize>())
        .transpose()
        .map_err(|e| e.to_string())?
        .unwrap_or(1);
    if let Some(path) = option("--pipeline") {
        let plan = read(path)?;
        for _ in 0..repeat {
            println!("{}", engine.pipeline(&plan, backend)?);
        }
    } else {
        let name=args.first().ok_or("usage: program FUNCTION ARGS.json [--backend auto|cpu|gpu] or --pipeline PLAN.json or --script CALLS.json (calls, pipelines and resident sessions)")?;
        let path = args.get(1).ok_or("missing arguments file")?;
        let values = read(path)?;
        for _ in 0..repeat {
            println!("{}", engine.call(name, &values, backend)?);
        }
    }
    Ok(())
}
