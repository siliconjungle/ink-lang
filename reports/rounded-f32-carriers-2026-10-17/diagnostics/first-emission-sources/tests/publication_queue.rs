use std::{fs, process::Command};

#[test]
fn reusable_publication_slots_preserve_order_reentry_disposal_and_nested_boundaries() {
    let dir = std::env::temp_dir().join(format!("ink-publication-queue-{}", std::process::id()));
    fs::create_dir_all(&dir).unwrap();
    let code = format!("{}\n{}", include_str!("../src/observers.mjs"), include_str!("fixtures/publication_queue.mjs"));
    fs::write(dir.join("run.mjs"), code).unwrap();
    let output = Command::new("node").arg(dir.join("run.mjs")).output().unwrap();
    fs::remove_dir_all(dir).unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
}
