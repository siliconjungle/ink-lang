include!("state-cli.rs");
fn main() -> std::process::ExitCode {
    match run_with_pure(|state, step| {
        state.pure(step["pure"].as_str().ok_or("missing pure")?, &step["args"])
    }) {
        Ok(()) => std::process::ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            std::process::ExitCode::FAILURE
        }
    }
}
