//! Export a reconstructed source-word equality CNF for an untrusted prover.
use ink_core::{bitproof, core::Program, laws::Equation, semantic, semantic_word};
use serde::Deserialize;

#[derive(Deserialize)]
#[serde(deny_unknown_fields)]
struct Request {
    params: semantic::Env,
    conditions: Vec<Equation>,
    from: semantic::Term,
    to: semantic::Term,
    hypotheses: Vec<usize>,
}
fn main() -> Result<(), String> {
    let args: Vec<_> = std::env::args().collect();
    if args.len() != 3 { return Err("usage: semantic-word-obligation REQUEST.json CNF.json".into()); }
    let request: Request = serde_json::from_slice(&std::fs::read(&args[1]).map_err(|e|e.to_string())?).map_err(|e|e.to_string())?;
    let goal = Equation { from: request.from, to: request.to };
    let problem = semantic_word::problem(&Program::default(), &request.params, &request.conditions,
        &goal, &request.hypotheses, bitproof::Encoding::SharedV2, &mut semantic::Budget::new())?;
    std::fs::write(&args[2], serde_json::to_vec_pretty(&problem).map_err(|e|e.to_string())?).map_err(|e|e.to_string())
}
