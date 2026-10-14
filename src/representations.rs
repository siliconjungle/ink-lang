//! Distribution tooling for proof-checked database representations.
use crate::{
    core::CheckedModule,
    representation::{self, CheckedRepresentation, Request},
    LangResult,
};
use serde_json::{json, Value};
use std::{fs, io::Read, path::Path};
fn read_bounded(path: &str, limit: usize) -> LangResult<Vec<u8>> {
    let mut bytes = Vec::new();
    fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take((limit + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > limit {
        return Err("representation input byte limit".into());
    }
    Ok(bytes)
}
fn read(path: &str) -> LangResult<Vec<u8>> {
    read_bounded(path, 16_000_000)
}
fn read_knowledge(path: &str) -> LangResult<Vec<u8>> {
    read_bounded(path, crate::registry::MAX_VIEW_BYTES)
}
pub fn load(module: &CheckedModule, path: &str) -> LangResult<CheckedRepresentation> {
    let request: Request =
        serde_json::from_slice(&read_knowledge(path)?).map_err(|e| e.to_string())?;
    representation::check(module, &request)
}
pub fn run(cmd: &str, module: CheckedModule, args: &[String]) -> LangResult<()> {
    let package = args.get(2).ok_or("missing representation request JSON")?;
    let checked = load(&module, package)?;
    let value = |key: &str| {
        args.iter()
            .position(|a| a == key)
            .and_then(|i| args.get(i + 1))
    };
    match cmd {
        "check-migration" => {
            let to = load(
                &module,
                args.get(3).ok_or("missing target representation request")?,
            )?;
            let bridge: Value =
                serde_json::from_slice(&read_knowledge(args.get(4).ok_or("missing bridge JSON")?)?)
                    .map_err(|e| e.to_string())?;
            let bundle =
                serde_json::from_value(bridge["knowledge"].clone()).map_err(|e| e.to_string())?;
            let root = bridge["root"].as_str().ok_or("missing bridge root")?;
            let migration = representation::check_migration(&checked, &to, &bundle, root)?;
            println!(
                "{}",
                json!({"status":"checked","migration":root,"from":migration.endpoints().0,"to":migration.endpoints().1,"obligations":migration.obligations()})
            );
        }
        "check-representation" => println!(
            "{}",
            json!({"status":"checked","representation":checked.request().representation,"source":module.identity()?,"obligations":checked.obligations(),"trust":["fixed source semantics","general equality checker","literal backend","host and snapshot codecs"]})
        ),
        "emit-representation" => {
            let output = value("-o").ok_or("emit-representation requires -o OUTPUT")?;
            emit(
                &checked,
                value("--target").map(String::as_str).unwrap_or("rust"),
                Path::new(output),
            )?;
        }
        "execute-representation" => {
            if value("--target").is_some_and(|target| target != "rust") {
                return Err("execute-representation compiles standalone Rust; use emit-representation --target for other standalone applications".into());
            }
            if value("--zig").is_some() || value("--build-dir").is_some() {
                return Err(
                    "standalone execute-representation does not use --zig or --build-dir".into(),
                );
            }
            let script: Value =
                serde_json::from_slice(&read(args.get(3).ok_or("missing script JSON")?)?)
                    .map_err(|e| e.to_string())?;
            let output = execute_compiled(
                &module,
                checked,
                &script,
                value("--restore").map(String::as_str),
                value("--snapshot-out").map(String::as_str),
            )?;
            print!("{output}");
        }
        _ => return Err("unknown representation command".into()),
    }
    Ok(())
}

/// Fixed compiled variants, not a proof-aware runtime. Proofs and source models
/// remain in this compiler process; the emitted application imports no Ink crate.
pub fn compiled_bundle(plans: &[CheckedRepresentation]) -> LangResult<String> {
    if plans.is_empty() || plans.len() > 16 {
        return Err("compiled representation bundle limit".into());
    }
    let source = plans[0].module().identity()?;
    if plans
        .iter()
        .any(|p| p.module().identity().ok().as_ref() != Some(&source))
    {
        return Err("compiled bundle changes source".into());
    }
    let mut code = String::from("use serde_json::{Value as Json,json};\n");
    for (i, plan) in plans.iter().enumerate() {
        code.push_str(&format!(
            "mod representation_{i}{{\n{}\n}}\n",
            ink_lowering_rust::representation_program::lower(plan)?
        ));
    }
    code.push_str("enum Program{\n");
    for i in 0..plans.len() {
        code.push_str(&format!("R{i}(representation_{i}::State),\n"));
    }
    code.push_str("}\nimpl Program{\nfn new(index:usize)->Result<Self,String>{match index{\n");
    for i in 0..plans.len() {
        code.push_str(&format!(
            "{i}=>Ok(Self::R{i}(representation_{i}::State::new()?)),\n"
        ));
    }
    code.push_str("_=>Err(\"unknown compiled representation\".into())}}\nfn restore(index:usize,bytes:&[u8])->Result<Self,String>{match index{\n");
    for i in 0..plans.len() {
        code.push_str(&format!(
            "{i}=>Ok(Self::R{i}(representation_{i}::State::restore(bytes)?)),\n"
        ));
    }
    code.push_str("_=>Err(\"unknown compiled representation\".into())}}\n");
    for (signature, call) in [
        (
            "invoke_json(&mut self,name:&str,args:&Json)->Result<Json,String>",
            "invoke_json(name,args)",
        ),
        ("checkpoint(&self)->Result<Vec<u8>,String>", "checkpoint()"),
    ] {
        code.push_str(&format!("fn {signature}{{match self{{\n"));
        for i in 0..plans.len() {
            code.push_str(&format!("Self::R{i}(state)=>state.{call},\n"));
        }
        code.push_str("}}\n");
    }
    code.push_str("fn version(&self)->u64{match self{\n");
    for i in 0..plans.len() {
        code.push_str(&format!("Self::R{i}(state)=>state.version(),\n"));
    }
    code.push_str("}}\nfn acknowledge_through(&mut self,commit:u64,position:u64){match self{\n");
    for i in 0..plans.len() {
        code.push_str(&format!(
            "Self::R{i}(state)=>state.acknowledge_through(commit,position),\n"
        ));
    }
    code.push_str("}}\nfn switch(&mut self,index:usize)->Result<(),String>{let bytes=self.checkpoint()?;let next=Self::restore(index,&bytes)?;*self=next;Ok(())}\n}\n");
    Ok(code)
}

fn bounded_input(value: &crate::stateful::Value, depth: usize) -> LangResult<()> {
    use crate::stateful::Value as V;
    if depth > 32 {
        return Err("source value depth limit".into());
    }
    match value {
        V::Int(n) if n.bits() > 4090 => Err("representation Int magnitude limit".into()),
        V::List(xs) | V::Vector(xs) => {
            if xs.len() > 4096 {
                return Err("source collection limit".into());
            }
            for x in xs {
                bounded_input(x, depth + 1)?;
            }
            Ok(())
        }
        V::Record(_, xs) => {
            for x in xs.values() {
                bounded_input(x, depth + 1)?;
            }
            Ok(())
        }
        V::Option(Some(x)) | V::Result(_, x) => bounded_input(x, depth + 1),
        _ => Ok(()),
    }
}

fn execute_compiled(
    module: &CheckedModule,
    first: CheckedRepresentation,
    script: &Value,
    restore: Option<&str>,
    snapshot: Option<&str>,
) -> LangResult<String> {
    // Validate every external argument and check every target before compiling
    // or executing anything. The generated entrypoints require typed inputs.
    let steps = script.as_array().ok_or("script must be an array")?;
    if steps.len() > 100_000 {
        return Err("representation script step limit".into());
    }
    let mut plans = vec![first];
    let mut calls = vec![];
    for step in steps {
        if let Some(path) = step.get("migrate").and_then(Value::as_str) {
            let plan = load(module, path)?;
            let index = if let Some(i) = plans
                .iter()
                .position(|p| p.request().representation == plan.request().representation)
            {
                i
            } else {
                plans.push(plan);
                plans.len() - 1
            };
            if plans.len() > 16 {
                return Err("compiled representation bundle limit".into());
            }
            calls.push(
                json!({"migrate":index,"representation":plans[index].request().representation}),
            );
        } else {
            let name = step["call"]
                .as_str()
                .ok_or("script step needs call or migrate")?;
            let action = module
                .program()
                .actions
                .iter()
                .find(|a| a.name == name)
                .ok_or("unknown source action")?;
            let args = step
                .get("args")
                .and_then(Value::as_array)
                .ok_or("script step needs args array")?;
            if args.len() != action.params.len() {
                return Err("action argument count mismatch".into());
            }
            for (value, (_, ty)) in args.iter().zip(&action.params) {
                bounded_input(
                    &crate::stateful::Value::from_json(value, ty, module.program())?,
                    0,
                )?;
            }
            calls.push(json!({"call":name,"args":args}));
        }
    }
    let initial = restore.map(read).transpose()?;
    let mut code = compiled_bundle(&plans)?;
    let calls = serde_json::to_string(&calls).map_err(|e| e.to_string())?;
    code.push_str(&format!("\nconst CALLS:&str={calls:?};\nconst INITIAL:Option<&[u8]>={};\nconst SNAPSHOT:Option<&str>={snapshot:?};\n", initial.as_ref().map(|b|format!("Some(&{b:?})")).unwrap_or_else(||"None".into())));
    code.push_str(include_str!("representation-runner.rs.txt"));
    static NEXT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
    let directory = std::env::temp_dir().join(format!(
        "ink-compiled-run-{}-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos(),
        NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    ));
    fs::create_dir(&directory).map_err(|e| e.to_string())?;
    struct Scratch(std::path::PathBuf);
    impl Drop for Scratch {
        fn drop(&mut self) {
            let _ = fs::remove_dir_all(&self.0);
        }
    }
    let scratch = Scratch(directory);
    write(&scratch.0.join("src/main.rs"), &code)?;
    write(&scratch.0.join("Cargo.toml"),"[package]\nname=\"ink-compiled-run\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\n[dependencies]\nserde_json={version=\"1\",features=[\"float_roundtrip\"]}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n")?;
    let cargo = std::env::var_os("INK_CARGO").unwrap_or_else(|| "cargo".into());
    let compiled = std::process::Command::new(cargo)
        .args([
            "build",
            "--offline",
            "--release",
            "--quiet",
            "--manifest-path",
        ])
        .arg(scratch.0.join("Cargo.toml"))
        .arg("--target-dir")
        .arg(scratch.0.join("target"))
        .output()
        .map_err(|e| format!("standalone execution requires a Rust toolchain: {e}"))?;
    if !compiled.status.success() {
        return Err(format!(
            "standalone compilation failed: {}",
            String::from_utf8_lossy(&compiled.stderr)
        ));
    }
    let result = std::process::Command::new(scratch.0.join(format!(
        "target/release/ink-compiled-run{}",
        std::env::consts::EXE_SUFFIX
    )))
    .output()
    .map_err(|e| e.to_string())?;
    if !result.status.success() {
        return Err(format!(
            "compiled execution failed: {}",
            String::from_utf8_lossy(&result.stderr)
        ));
    }
    String::from_utf8(result.stdout).map_err(|e| e.to_string())
}

/// Compile-time target selection. Every emitted artifact is standalone and
/// carries the same checked program's portable snapshot namespace.
pub fn emit(checked: &CheckedRepresentation, target: &str, output: &Path) -> LangResult<()> {
    match target {
        "rust" => write(
            output,
            &ink_lowering_rust::representation_program::lower(checked)?,
        ),
        "rust-memo" => write(output,&ink_lowering_rust::representation_program::lower_memo(checked)?),
        "rust-wasm-memo" => project(output,&ink_lowering_rust::representation_program::lower_memo(checked)?,None,target),
        "rust-packed" => write(
            output,
            &ink_lowering_rust::representation_program::lower_packed(checked)?,
        ),
        "rust-wasm-packed" => project(
            output,
            &ink_lowering_rust::representation_program::lower_packed(checked)?,
            None,
            target,
        ),
        "javascript" | "js" => write(
            output,
            &ink_lowering_js::representation_program::lower(checked)?,
        ),
        "webgpu" => write(
            output,
            &ink_lowering_gpu::lower_representation_web(checked)?,
        ),
        "rust-wasm" => project(
            output,
            &ink_lowering_rust::representation_program::lower(checked)?,
            None,
            target,
        ),
        "wgpu" | "gpu" => project(
            output,
            &ink_lowering_gpu::lower_representation(checked)?,
            None,
            target,
        ),
        "c" | "wasm" | "wasm32" | "c-wasm" => {
            let emitted = match target {
                "wasm" | "wasm32" | "c-wasm" => ink_lowering_wasm::lower_representation(checked)?,
                _ => ink_lowering_c::representation_program::lower(checked)?,
            };
            project(output, &emitted.rust, Some(&emitted.c), target)
        }
        _ => Err(format!("unknown representation target {target}")),
    }
}
fn write(output: &Path, source: &str) -> LangResult<()> {
    if let Some(parent) = output.parent().filter(|p| !p.as_os_str().is_empty()) {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    fs::write(output, source).map_err(|e| e.to_string())
}
pub(crate) fn project(output: &Path, source: &str, c: Option<&str>, target: &str) -> LangResult<()> {
    let mut source = source.to_owned();
    source.push_str(crate::runtime::REPRESENTATION_ABI_SOURCE);
    write(&output.join("src/lib.rs"), &source)?;
    write(&output.join("Cargo.toml"), "[package]\nname=\"ink-compiled-representation\"\nversion=\"0.1.0\"\nedition=\"2021\"\n[workspace]\n[lib]\ncrate-type=[\"rlib\",\"cdylib\"]\n[dependencies]\nserde_json={version=\"1\",features=[\"float_roundtrip\"]}\nsha2=\"0.10\"\nnum-bigint=\"0.4\"\n")?;
    if let Some(c) = c {
        write(&output.join("representation.c"), c)?;
        write(
            &output.join("build.rs"),
            include_str!("representation-build.rs.txt"),
        )?;
    } else {
        write(&output.join("build.rs"), "fn main(){if std::env::var(\"TARGET\").unwrap().starts_with(\"wasm32\"){println!(\"cargo:rustc-link-arg=-zstack-size=8388608\");}}\n")?;
    }
    write(
        &output.join("state-wasm.mjs"),
        include_str!("../runtime/hosts/state-wasm.mjs"),
    )?;
    write(&output.join("state-abi.h"), ink_abi::STATE_C_HEADER)?;
    write(&output.join("README.md"), &format!("Standalone {target} representation. Build with `cargo build --offline`. For Wasm add `--target wasm32-unknown-unknown` (the project declares an 8 MiB stack); set INK_CC and INK_AR to cross-compiler wrappers for C/Wasm. Exports the ordinary handle/buffer state ABI. C and GPU host projects use literal C functions and typed Rust storage; browser WebGPU uses literal JavaScript host code. Recursive representations execute on the host. No Ink runtime, proof package or checker dependency is linked. Caller arguments must have declared types, arity, shapes and canonical ranges. Generated calls do not type-check input; bad data is unsafe, may crash or produce wrong results, and raw native pointer APIs may corrupt memory. JSON parsing/representation conversion and explicit portable checkpoint integrity checks remain. Source and proof checks happen during compilation.\n"))
}
