use ink_gpu_program::{Backend, Engine};
fn run() -> Result<(), String> {
    let args: Vec<_> = std::env::args().skip(1).collect();
    if args.len() < 2 {
        return Err(
            "usage: ink-gpu-program FUNCTION ARGS.json [--backend auto|cpu|gpu] [--repeat N]"
                .into(),
        );
    }
    let option = |flag: &str| -> Result<Option<&str>, String> {
        match args.iter().position(|a| a == flag) {
            Some(i) => args
                .get(i + 1)
                .map(|s| Some(s.as_str()))
                .ok_or_else(|| format!("missing value for {flag}")),
            None => Ok(None),
        }
    };
    let backend = Backend::parse(option("--backend")?.unwrap_or("auto"))?;
    let repeat: usize = option("--repeat")?
        .unwrap_or("1")
        .parse()
        .map_err(|_| "invalid repeat count")?;
    if !(1..=100000).contains(&repeat) {
        return Err("repeat outside 1..100000".into());
    }
    let input = std::fs::read(&args[1]).map_err(|e| e.to_string())?;
    let input: serde_json::Value = serde_json::from_slice(&input).map_err(|e| e.to_string())?;
    let mut engine = Engine::new();
    if args[0] == "--script" {
        let mut results = Vec::new();
        for step in input.as_array().ok_or("script must be an array")? {
            let mode = Backend::parse(step["backend"].as_str().unwrap_or("auto"))?;
            results.push(engine.call(
                step["call"].as_str().ok_or("script step requires call")?,
                &step["args"],
                mode,
            )?);
        }
        println!("{}", serde_json::Value::Array(results));
        return Ok(());
    }
    for _ in 0..repeat {
        println!("{}", engine.call(&args[0], &input, backend)?);
    }
    Ok(())
}
fn main() -> std::process::ExitCode {
    match run() {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            std::process::ExitCode::FAILURE
        }
    }
}
