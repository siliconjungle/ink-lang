//! Primitive correspondence on literal emitted functions, never a state session.
use ink_core::{definition::CheckedDefinition, logic::Term};
use serde_json::json;
use std::{fs, path::Path, process::Command};
// Exercise the production literal ES emitter without adding a public adapter
// solely for the test. Its source is pinned with the backend submodule.
#[path = "../../lowerings/js/src/definition_literal.rs"]
mod literal_js;
fn run(command: &mut Command) {
    let output = command.output().unwrap();
    assert!(
        output.status.success(),
        "{}\n{}",
        String::from_utf8_lossy(&output.stdout),
        String::from_utf8_lossy(&output.stderr)
    );
}
pub fn check(checked: &CheckedDefinition, functions: &[(&str, String)], work: &Path) {
    let zig = std::env::var("INK_TEST_ZIG").ok();
    if std::env::var_os("INK_PARITY_REQUIRE_ALL").is_some() {
        assert!(
            zig.is_some(),
            "required numerical parity forbids skipping Wasm"
        );
    }
    let mut cases = vec![];
    for a in [
        0u64,
        1,
        0x80000000,
        0x7f800000,
        0xff800000,
        0x7fc12345,
        0xff812345,
        0x3f800001,
        u64::MAX,
    ] {
        for b in [0u64, 1, 0x80000000, 0x7f800000, 0x7f812345, 0x3f800000] {
            for (index, (op, _)) in functions.iter().enumerate() {
                let expected = match *op {
                    "quot" => Term::U64(if b == 0 { 0 } else { a / b }),
                    "rem" => Term::U64(if b == 0 { 0 } else { a % b }),
                    "&" => Term::U64(a & b),
                    _ => ink_core::logic::f32_primitive(op, a, b).unwrap(),
                };
                let (word, boolean) = match expected {
                    Term::U64(n) => (n, false),
                    Term::Bool(n) => (u64::from(n), true),
                    _ => unreachable!(),
                };
                cases.push((index, a, b, word, boolean));
            }
        }
    }
    fs::create_dir_all(work).unwrap();
    fs::write(
        work.join("oracle.json"),
        serde_json::to_vec(
            &cases
                .iter()
                .map(|&(i, a, b, w, boolean)| {
                    json!([i, a.to_string(), b.to_string(), w.to_string(), boolean])
                })
                .collect::<Vec<_>>(),
        )
        .unwrap(),
    )
    .unwrap();
    let mut rust = ink_lowering_rust::definition_native::lower(checked)
        .unwrap()
        .source;
    rust.push_str("\n#[no_mangle] pub extern \"C\" fn numeric(i:u32,x:u64,y:u64)->u64{match i{\n");
    let mut c = ink_lowering_c::definition::lower(checked).unwrap().source;
    c.push_str("\nuint64_t numeric(uint32_t i,uint64_t x,uint64_t y){ink_def_reset();V* a=ink_def_u64(x);V* b=ink_def_u64(y);V* r;switch(i){\n");
    let mut js = literal_js::lower(checked, &Default::default()).unwrap();
    js.push_str("\nconst functions=[");
    for (i, (op, id)) in functions.iter().enumerate() {
        let boolean =
            matches!(*op,"f32:=="|"f32:!="|"f32:<"|"f32:<="|"f32:>"|"f32:>="|"f32:is_nan"|"f32:is_finite");
        rust.push_str(&format!("{i}=>f_{id}(x,y) as u64,\n"));
        c.push_str(&format!(
            "case {i}:r=f_{id}(a,b);if(ink_def_kind(r)!={})__builtin_trap();break;\n",
            usize::from(!boolean)
        ));
        js.push_str(&format!("f_{id},"));
        // Return-domain assertions are independent of result value equality.
        assert_eq!(
            matches!(
                checked.executable_declarations().unwrap()[id],
                ink_core::logic::Declaration::Function {
                    result: ink_core::logic::Sort::Bool,
                    ..
                }
            ),
            boolean
        );
    }
    rust.push_str("_=>panic!(\"function index\")}}\n");
    c.push_str(
        "default:__builtin_trap();}if(ink_def_error())__builtin_trap();return ink_def_word(r);}\n",
    );
    js.push_str("];");
    assert!(!js.contains("const image="));
    js.push_str("\nimport fs from 'node:fs';import assert from 'node:assert/strict';const cases=JSON.parse(fs.readFileSync(new URL('oracle.json',import.meta.url),'utf8'));for(const [i,a,b,w,boolean] of cases){const value=functions[i](BigInt(a),BigInt(b));assert.equal(typeof value,boolean?'boolean':'bigint');assert.equal(BigInt(value),BigInt(w),`${i}/${a}/${b}`);}console.log(`${cases.length} literal JS primitive checks passed`);\n");
    fs::write(work.join("check.mjs"), js).unwrap();
    run(Command::new("node").arg(work.join("check.mjs")));
    let mut native_rust = rust.clone();
    native_rust.push_str("fn main(){\n");
    let mut native_c = c.clone();
    native_c.push_str("int main(void){\n");
    for &(i, a, b, w, _) in &cases {
        native_rust.push_str(&format!("assert_eq!(numeric({i},{a},{b}),{w});\n"));
        native_c.push_str(&format!(
            "if(numeric({i},UINT64_C({a}),UINT64_C({b}))!=UINT64_C({w}))return 1;\n"
        ));
    }
    native_rust.push_str("}\n");
    native_c.push_str("return 0;}\n");
    fs::write(work.join("check.rs"), native_rust).unwrap();
    fs::write(work.join("check.c"), native_c).unwrap();
    run(Command::new("rustc")
        .args(["--edition=2021", "-O"])
        .arg(work.join("check.rs"))
        .arg("-o")
        .arg(work.join("rust-check")));
    run(&mut Command::new(work.join("rust-check")));
    run(Command::new("cc")
        .args(["-std=c11", "-O2", "-ffp-contract=off"])
        .arg(work.join("check.c"))
        .arg("-o")
        .arg(work.join("c-check"))
        // Generated binary32 primitives call sqrtf and friends; glibc keeps
        // them in libm, which must follow the object on the link line.
        .arg("-lm"));
    run(&mut Command::new(work.join("c-check")));
    if let Some(zig) = zig {
        fs::write(work.join("wasm.rs"), rust).unwrap();
        fs::write(work.join("wasm.c"), c).unwrap();
        run(Command::new("rustc")
            .args([
                "--edition=2021",
                "-O",
                "--target",
                "wasm32-unknown-unknown",
                "--crate-type",
                "cdylib",
                "-C",
                "panic=abort",
            ])
            .arg(work.join("wasm.rs"))
            .arg("-o")
            .arg(work.join("rust.wasm")));
        run(Command::new(zig)
            .args([
                "cc",
                "-target",
                "wasm32-freestanding",
                "-std=c11",
                "-O2",
                "-ffp-contract=off",
                "-nostdlib",
                "-Wl,--no-entry",
                "-Wl,--export=numeric",
                "-Wl,--initial-memory=33554432",
            ])
            .arg(work.join("wasm.c"))
            .arg("-o")
            .arg(work.join("c.wasm")));
        fs::write(work.join("check-wasm.mjs"),"import fs from 'node:fs';import assert from 'node:assert/strict';const cases=JSON.parse(fs.readFileSync(new URL('oracle.json',import.meta.url),'utf8'));for(const backend of ['c','rust']){const {instance}=await WebAssembly.instantiate(fs.readFileSync(new URL(backend+'.wasm',import.meta.url)),{});for(const [i,a,b,w] of cases){assert.equal(BigInt.asUintN(64,instance.exports.numeric(i,BigInt(a),BigInt(b))),BigInt(w),`${backend}/${i}/${a}/${b}`);}console.log(`${cases.length} literal ${backend}-Wasm primitive checks passed`);}").unwrap();
        run(Command::new("node").arg(work.join("check-wasm.mjs")));
    }
    println!("{} literal numeric comparisons per CPU target", cases.len());
}
