use std::{
    env, fs,
    path::Path,
    process::{Command, ExitCode},
};
use verified_language::{
    aggregate, check, eval, native, proof, state_native, stateful, syntax, LangResult,
};

fn arg_value(args: &[String], flag: &str) -> LangResult<Option<String>> {
    if let Some(i) = args.iter().position(|a| a == flag) {
        Ok(Some(
            args.get(i + 1)
                .ok_or_else(|| format!("missing value for {flag}"))?
                .clone(),
        ))
    } else {
        Ok(None)
    }
}
fn source(path: &str) -> LangResult<syntax::Program> {
    let s = fs::read_to_string(path).map_err(|e| format!("{path}: {e}"))?;
    let p = syntax::parse(&s)?;
    check::check(&p)?;
    Ok(p)
}
fn package(path: &str) -> LangResult<Vec<proof::Certificate>> {
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    if bytes.len() > 4_000_000 {
        return Err("knowledge package exceeds 4 MB limit".into());
    }
    let certs: Vec<proof::Certificate> =
        serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
    if certs.len() > 1024 {
        return Err("knowledge package exceeds rule count limit".into());
    }
    for c in &certs {
        proof::verify(c)?;
    }
    Ok(certs)
}
fn write(path: &str, text: &str) -> LangResult<()> {
    if let Some(p) = Path::new(path).parent() {
        if !p.as_os_str().is_empty() {
            fs::create_dir_all(p).map_err(|e| e.to_string())?;
        }
    }
    fs::write(path, text).map_err(|e| e.to_string())
}
fn run() -> LangResult<()> {
    let args: Vec<String> = env::args().skip(1).collect();
    let cmd = args.first().map(String::as_str).unwrap_or("help");
    if cmd == "verify-maintenance" {
        let path = args
            .get(1)
            .ok_or("verify-maintenance requires PACKAGE.json")?;
        let bytes = fs::read(path).map_err(|e| e.to_string())?;
        if bytes.len() > 4_000_000 {
            return Err("maintenance package exceeds 4 MB limit".into());
        }
        let c: aggregate::Certificate =
            serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        aggregate::verify(&c)?;
        println!("verified finite-map maintenance certificate {}", c.id);
        return Ok(());
    }
    if cmd == "prove-maintenance" {
        let path = args.get(1).ok_or("prove-maintenance requires SOURCE")?;
        let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let c = aggregate::prove(&syntax::parse(&text)?)?;
        let out = arg_value(&args, "-o")?.ok_or("prove-maintenance requires -o PACKAGE.json")?;
        write(
            &out,
            &serde_json::to_string_pretty(&c).map_err(|e| e.to_string())?,
        )?;
        println!(
            "checked finite-map sum premises; wrote certificate {}",
            c.id
        );
        return Ok(());
    }
    if cmd == "help" || cmd == "--help" {
        println!("lang check SOURCE\nlang prove RULES -o PACKAGE.json\nlang knowledge verify PACKAGE.json\nlang prove-maintenance SOURCE -o PACKAGE.json\nlang verify-maintenance PACKAGE.json\nlang execute SOURCE SCRIPT.json [--maintenance PACKAGE.json] [--restore SNAPSHOT] [--snapshot-out SNAPSHOT]\nlang run SOURCE FUNCTION ARGS.json\nlang build SOURCE -o OUTPUT.o [--knowledge PACKAGE.json] [--cc clang] [--native-cpu]\nlang build SOURCE --target wasm32 --zig PATH -o OUTPUT.wasm\nlang emit-c SOURCE -o OUTPUT.c [--knowledge PACKAGE.json]\nlang emit-state SOURCE -o DIRECTORY [--maintenance PACKAGE.json]");
        return Ok(());
    }
    if cmd == "knowledge" {
        if args.get(1).map(String::as_str) != Some("verify") {
            return Err("expected knowledge verify PACKAGE.json".into());
        }
        let cs = package(args.get(2).ok_or("missing package path")?)?;
        println!("verified {} modular arithmetic certificates", cs.len());
        return Ok(());
    }
    let path = args.get(1).ok_or("missing source path")?;
    let mut p = source(path)?;
    match cmd {
        "emit-state" => {
            let out = arg_value(&args, "-o")?.ok_or("emit-state requires -o DIRECTORY")?;
            let certificate = if let Some(file) = arg_value(&args, "--maintenance")? {
                let bytes = fs::read(file).map_err(|e| e.to_string())?;
                if bytes.len() > 4_000_000 {
                    return Err("maintenance package exceeds 4 MB limit".into());
                }
                Some(
                    serde_json::from_slice::<aggregate::Certificate>(&bytes)
                        .map_err(|e| e.to_string())?,
                )
            } else {
                None
            };
            let code = state_native::emit(&p, certificate.as_ref())?;
            write(&format!("{out}/src/lib.rs"), &code)?;
            write(&format!("{out}/src/main.rs"), state_native::RUNNER)?;
            write(&format!("{out}/Cargo.toml"), "[package]\nname = \"compiled-state\"\nversion = \"0.1.0\"\nedition = \"2021\"\n[dependencies]\nnum-bigint = \"=0.4.8\"\nserde_json = \"=1.0.151\"\n[profile.release]\nlto = \"thin\"\ncodegen-units = 1\n")?;
            let plan = serde_json::json!({"source":path,"module":p.module,"backend":"typed Rust; no AST evaluator","maintenance_certificate":certificate.as_ref().map(|c|&c.id),"trusted":["frontend","finite-map induction schema","typed Rust lowering","num-bigint","Rust/LLVM backend"],"limitations":["no native snapshot or runtime migration yet","collection scans currently materialise lists","no native execution fuel limit"]});
            write(
                &format!("{out}/plan.json"),
                &serde_json::to_string_pretty(&plan).map_err(|e| e.to_string())?,
            )?;
            println!("wrote native state project to {out}");
        }
        "execute" => {
            let script_path = args.get(2).ok_or("execute requires SCRIPT.json")?;
            let script: serde_json::Value =
                serde_json::from_slice(&fs::read(script_path).map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            let mut runtime = if let Some(snapshot) = arg_value(&args, "--restore")? {
                stateful::Runtime::restore(
                    p.clone(),
                    &fs::read(snapshot).map_err(|e| e.to_string())?,
                )?
            } else {
                stateful::Runtime::new(p.clone())?
            };
            if let Some(file) = arg_value(&args, "--maintenance")? {
                let bytes = fs::read(file).map_err(|e| e.to_string())?;
                if bytes.len() > 4_000_000 {
                    return Err("maintenance package exceeds 4 MB limit".into());
                }
                let c: aggregate::Certificate =
                    serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
                let selected = runtime.enable_maintenance(c)?;
                eprintln!("maintained derived values: {}", selected.join(", "));
            }
            let mut output = Vec::new();
            for step in script
                .as_array()
                .ok_or("script must be an array of calls")?
            {
                let name = step
                    .get("call")
                    .and_then(|v| v.as_str())
                    .ok_or("each script step needs call")?;
                let arguments = step.get("args").ok_or("each script step needs args")?;
                output.push(runtime.invoke_json(name, arguments)?.json());
            }
            if let Some(file) = arg_value(&args, "--snapshot-out")? {
                let bytes = runtime.checkpoint()?;
                if let Some(dir) = Path::new(&file).parent() {
                    if !dir.as_os_str().is_empty() {
                        fs::create_dir_all(dir).map_err(|e| e.to_string())?;
                    }
                }
                fs::write(file, bytes).map_err(|e| e.to_string())?;
            }
            println!(
                "{}",
                serde_json::to_string_pretty(&output).map_err(|e| e.to_string())?
            );
        }
        "check" => {
            for r in &p.rules {
                proof::prove(r)?;
            }
            println!(
                "checked {} functions and {} arithmetic rewrites; {} states, {} derived values, {} changes/queries",
                p.functions.len(),
                p.rules.len(),p.states.len(),p.keeps.len(),p.actions.len()
            );
        }
        "prove" => {
            let certs = p
                .rules
                .iter()
                .map(proof::prove)
                .collect::<LangResult<Vec<_>>>()?;
            let out = arg_value(&args, "-o")?.ok_or("prove requires -o PACKAGE.json")?;
            write(
                &out,
                &serde_json::to_string_pretty(&certs).map_err(|e| e.to_string())?,
            )?;
            println!("stored {} checked certificates in {out}", certs.len());
        }
        "run" => {
            let name = args.get(2).ok_or("missing function name")?;
            let values = args.get(3).ok_or("missing arguments JSON file")?;
            let json: serde_json::Value =
                serde_json::from_slice(&fs::read(values).map_err(|e| e.to_string())?)
                    .map_err(|e| e.to_string())?;
            let vals = json.as_array().ok_or("arguments must be a JSON array")?;
            let f = p
                .functions
                .iter()
                .find(|f| &f.name == name)
                .ok_or("function not found")?;
            if vals.len() != f.params.len() {
                return Err("argument count mismatch".into());
            }
            let vs = vals
                .iter()
                .zip(&f.params)
                .map(|(v, (_, t))| eval::Value::from_json(v, t))
                .collect::<LangResult<Vec<_>>>()?;
            println!("{}", eval::call(&p, name, vs, &mut 100_000_000)?.json());
        }
        "build" | "emit-c" => {
            let mut certs = p
                .rules
                .iter()
                .map(proof::prove)
                .collect::<LangResult<Vec<_>>>()?;
            if let Some(k) = arg_value(&args, "--knowledge")? {
                certs.extend(package(&k)?);
            }
            let mut used = Vec::new();
            for f in &mut p.functions {
                f.body = proof::optimise(&f.body, &certs, &mut used, &mut 100_000);
            }
            check::check(&p)?;
            let out = arg_value(&args, "-o")?.ok_or("build requires -o OUTPUT.o")?;
            let target = arg_value(&args, "--target")?.unwrap_or_else(|| "native".into());
            if !["native", "wasm32"].contains(&target.as_str()) {
                return Err(format!("unsupported target {target}"));
            }
            if target == "wasm32" && args.iter().any(|a| a == "--native-cpu") {
                return Err("--native-cpu cannot be used with wasm32".into());
            }
            let cpath = if cmd == "emit-c" {
                out.clone()
            } else {
                format!("{out}.c")
            };
            write(&cpath, &native::emit(&p)?)?;
            let manifest = serde_json::json!({"source":path,"module":p.module,"target":target,"applied_rule_ids":used,"verified_fragment":"u64 modular polynomial rewrite certificates","trusted":["Rust checker implementation","collection lowering","generated C","Clang/LLVM backend","host ABI"],"unsupported_spec_features":"see PLAN.md and STATUS.md"});
            write(
                &format!("{out}.plan.json"),
                &serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?,
            )?;
            if cmd == "build" {
                if target == "wasm32" {
                    let zig = arg_value(&args, "--zig")?.unwrap_or_else(|| "zig".into());
                    let mut command = Command::new(&zig);
                    command.args([
                        "cc",
                        "-target",
                        "wasm32-freestanding",
                        "-O3",
                        "-msimd128",
                        "-std=c11",
                        "-ffreestanding",
                        "-nostdlib",
                        "-Wl,--no-entry",
                        "-Wl,--export=__heap_base",
                        "-Wl,--export-memory",
                    ]);
                    for f in &p.functions {
                        command.arg(format!("-Wl,--export=lang_fn_{}", f.name));
                    }
                    let result = command
                        .arg(&cpath)
                        .arg("-o")
                        .arg(&out)
                        .output()
                        .map_err(|e| format!("{zig}: {e}"))?;
                    if !result.status.success() {
                        return Err(String::from_utf8_lossy(&result.stderr).into_owned());
                    }
                    println!("wrote {out}; {} checked rule applications", used.len());
                    return Ok(());
                }
                let cc = arg_value(&args, "--cc")?.unwrap_or_else(|| "clang".into());
                for (mode, target) in [("object", out.clone()), ("llvm", format!("{out}.ll"))] {
                    let mut c = Command::new(&cc);
                    c.args([
                        "-O3",
                        "-std=c11",
                        "-fno-math-errno",
                        "-Wall",
                        "-Wextra",
                        "-Werror",
                    ]);
                    if args.iter().any(|a| a == "--native-cpu") {
                        c.arg(if std::env::consts::ARCH == "aarch64" {
                            "-mcpu=native"
                        } else {
                            "-march=native"
                        });
                    }
                    if mode == "llvm" {
                        c.args(["-S", "-emit-llvm"]);
                    } else {
                        c.arg("-c");
                    }
                    let result = c
                        .arg(&cpath)
                        .arg("-o")
                        .arg(&target)
                        .output()
                        .map_err(|e| format!("{cc}: {e}"))?;
                    if !result.status.success() {
                        return Err(String::from_utf8_lossy(&result.stderr).into_owned());
                    }
                }
            }
            println!("wrote {out}; {} checked rule applications", used.len());
        }
        _ => return Err(format!("unknown command {cmd}")),
    }
    Ok(())
}
fn main() -> ExitCode {
    match run() {
        Ok(()) => ExitCode::SUCCESS,
        Err(e) => {
            eprintln!("error: {e}");
            ExitCode::FAILURE
        }
    }
}
