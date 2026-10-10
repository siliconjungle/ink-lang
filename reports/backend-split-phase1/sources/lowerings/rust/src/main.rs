use std::{env, fs, io::Read, process::ExitCode};
fn run() -> Result<(), String> {
    let args: Vec<_> = env::args().skip(1).collect();
    if args.len() != 3 || args[1] != "-o" {
        return Err("usage: ink-lowering-rust DEFINITIONS.json -o OUTPUT.rs".into());
    }
    let mut bytes = Vec::new();
    fs::File::open(&args[0])
        .map_err(|e| e.to_string())?
        .take(16_000_001)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    let checked = ink_core::definition::Request::from_bytes(&bytes)?;
    let emission = ink_lowering_rust::definition_native::lower(&checked)?;
    fs::write(&args[2], emission.source).map_err(|e| e.to_string())?;
    println!(
        "{}",
        serde_json::to_string(&emission.receipt).map_err(|e| e.to_string())?
    );
    Ok(())
}
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("{e}");
            ExitCode::FAILURE
        }
    }
}
