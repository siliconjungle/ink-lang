//! Exercise the actual generated C/native bridge, including allocation accounting.
use std::{fs, process::Command};
use verified_language::{core::CheckedModule, syntax};

#[test]
fn generated_readonly_primitives_borrow_operands_and_preserve_contracts() {
    let module = CheckedModule::from_source(
        syntax::parse("module reads;fn size(xs:List<u32>)->u32{return length(xs);}").unwrap(),
    )
    .unwrap();
    let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("build/borrowed-native-reads");
    verified_language::runtime::emit_c_program(&module, &root).unwrap();
    let path = root.join("src/lib.rs");
    let mut source = fs::read_to_string(&path).unwrap();
    source.push_str(include_str!("borrowed-native-reads.rs.txt"));
    fs::write(path, source).unwrap();
    let output = Command::new(env!("CARGO"))
        .args(["test", "--offline", "--quiet", "--lib", "--manifest-path"])
        .arg(root.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(root.join("target"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
    println!("{}", String::from_utf8_lossy(&output.stdout));
}
