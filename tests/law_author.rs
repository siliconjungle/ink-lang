use std::{fs, path::Path, process::Command};
use verified_language::{laws::CheckedCatalogue, registry::CheckedBundle, syntax::Program};
#[test]
fn external_source_publication_is_portable_and_application_source_rejects_it() {
    let dir = Path::new("build/source-law-authoring");
    fs::create_dir_all(dir).unwrap();
    let bundle = dir.join("bundle.json");
    let output = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["emit-laws", "knowledge/libraries/value-laws.ink", "-o"])
        .arg(&bundle)
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let bytes = fs::read(&bundle).unwrap();
    let bundle = serde_json::from_slice(&bytes).unwrap();
    let c = CheckedBundle::check(&bundle).unwrap().catalogue().unwrap();
    assert_eq!(c.roots.len(), 3);
    CheckedCatalogue::check(&c, &Program::default()).unwrap();
    let output = Command::new("python3")
        .args([
            "knowledge/producers/source_laws.py",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--source",
            "knowledge/libraries/value-laws.ink",
            "--output-store",
        ])
        .arg(dir.join("store"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let stored = fs::read(dir.join("store/store/source-law-view.json")).unwrap();
    let stored = serde_json::from_slice(&stored).unwrap();
    let c = CheckedBundle::check(&stored).unwrap().catalogue().unwrap();
    CheckedCatalogue::check(&c, &Program::default()).unwrap();
    let output = Command::new(env!("CARGO_BIN_EXE_ink"))
        .args(["emit-core", "knowledge/libraries/value-laws.ink", "-o"])
        .arg(dir.join("bad-core.json"))
        .output()
        .unwrap();
    assert!(!output.status.success());
}
