use std::{env, fs, process::ExitCode};
fn run() -> Result<(), String> {
    let args: Vec<_> = env::args().skip(1).collect();
    if args.len() != 3 || args[1] != "-o" {
        return Err("usage: ink-lowering-c CORE.json -o OUTPUT.c".into());
    }
    let file = fs::File::open(&args[0]).map_err(|e| e.to_string())?;
    use std::io::Read;
    let mut bytes = Vec::new();
    file.take(16_000_001)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    let module = ink_core::core::CheckedModule::from_bytes(&bytes)?;
    let source = ink_lowering_c::native::lower(&module)?;
    fs::write(&args[2], source).map_err(|e| e.to_string())
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
