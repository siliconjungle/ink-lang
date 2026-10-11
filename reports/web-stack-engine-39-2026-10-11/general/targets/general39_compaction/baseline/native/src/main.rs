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
    if let Some(path) = option("--script") {
        let script = read(path)?;
        for call in script.as_array().ok_or("script must be an array")? {
            let b = call["backend"]
                .as_str()
                .map(Backend::parse)
                .transpose()?
                .unwrap_or(backend);
            let r = if let Some(p) = call.get("pipeline") {
                engine.pipeline(p, b)
            } else {
                engine.call(
                    call["call"].as_str().ok_or("missing function")?,
                    &call["args"],
                    b,
                )
            };
            println!(
                "{}",
                match r {
                    Ok(v) => v,
                    Err(e) => serde_json::json!({"error":e}),
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
        let name=args.first().ok_or("usage: program FUNCTION ARGS.json [--backend auto|cpu|gpu] or --pipeline PLAN.json or --script CALLS.json")?;
        let path = args.get(1).ok_or("missing arguments file")?;
        let values = read(path)?;
        for _ in 0..repeat {
            println!("{}", engine.call(name, &values, backend)?);
        }
    }
    Ok(())
}
