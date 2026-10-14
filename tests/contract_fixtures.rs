//! Check committed source-bound evidence before expensive backend conformance.
//! Every fixture/example directory containing proofs.json participates. The termination
//! bundle uses termination admission rather than contract attachment.
use std::{fs, path::Path};
use verified_language::{contracts, core::CheckedModule, modules};

#[test]
fn committed_contract_fixtures_replay_against_current_source() {
    // Match storage_regions' debug proof-checking stack; semantic resource
    // budgets and the actual checker are unchanged.
    std::thread::Builder::new()
        .stack_size(16 * 1024 * 1024)
        .spawn(check_fixtures)
        .unwrap()
        .join()
        .unwrap();
}

fn check_fixtures() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    fn collect(directory: &Path, fixtures: &mut Vec<std::path::PathBuf>) {
        if directory.join("proofs.json").is_file() { fixtures.push(directory.to_owned()); }
        for entry in fs::read_dir(directory).unwrap() {
            let entry = entry.unwrap();
            // Do not follow directory links outside the committed fixture trees.
            if entry.file_type().unwrap().is_dir() { collect(&entry.path(), fixtures); }
        }
    }
    let mut fixtures = Vec::new();
    for directory in ["tests/fixtures", "examples"] { collect(&root.join(directory), &mut fixtures); }
    fixtures.sort();
    let mut checked = 0;
    let mut failures = Vec::new();
    for fixture in fixtures {
        let name = fixture.strip_prefix(root).unwrap().display().to_string();
        let result = (|| -> Result<(), String> {
            let evidence: serde_json::Value = serde_json::from_slice(
                &fs::read(fixture.join("proofs.json")).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            if fixture == root.join("tests/fixtures/authored-measures") {
                let mut program = modules::load_for_termination(fixture.join("main.ink"))?.program;
                program.termination.knowledge =
                    Some(serde_json::from_value(evidence).map_err(|e| e.to_string())?);
                CheckedModule::from_source(program)?;
                println!("{name}: checked termination evidence");
                return Ok(());
            }
            let evidence: contracts::Evidence =
                serde_json::from_value(evidence).map_err(|e| e.to_string())?;
            let mut program = modules::load(fixture.join("main.ink"))?.program;
            contracts::attach(&mut program, evidence)?;
            CheckedModule::from_source(program)?;
            checked += 1;
            println!("{name}: checked exact-source contract evidence");
            Ok(())
        })();
        if let Err(error) = result {
            failures.push(format!("{name}: {error}"));
        }
    }
    assert!(checked > 0, "no contract fixtures checked");
    assert!(failures.is_empty(), "{}", failures.join("\n"));
    println!("{checked} committed contract fixtures checked");
}
