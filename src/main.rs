use sha2::{Digest, Sha256};
use std::{
    env, fs,
    io::Read,
    path::Path,
    process::{Command, ExitCode},
};
use verified_language::{
    aggregate, check, core, eval, knowledge, native, state_native, stateful, syntax, LangResult,
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
fn write(path: &str, text: &str) -> LangResult<()> {
    if let Some(p) = Path::new(path).parent() {
        if !p.as_os_str().is_empty() {
            fs::create_dir_all(p).map_err(|e| e.to_string())?;
        }
    }
    fs::write(path, text).map_err(|e| e.to_string())
}
fn read_bounded(path: &str, limit: usize) -> LangResult<Vec<u8>> {
    let mut bytes = Vec::new();
    fs::File::open(path)
        .map_err(|e| e.to_string())?
        .take((limit + 1) as u64)
        .read_to_end(&mut bytes)
        .map_err(|e| e.to_string())?;
    if bytes.len() > limit {
        return Err("input exceeds size limit".into());
    }
    Ok(bytes)
}
fn run() -> LangResult<()> {
    let args: Vec<String> = env::args().skip(1).collect();
    let cmd = args.first().map(String::as_str).unwrap_or("help");
    if cmd == "model-row" || cmd == "verify-row-model" {
        let p = source(args.get(1).ok_or("row model requires SOURCE")?)?;
        let cert_path = arg_value(&args, "--maintenance")?.ok_or("missing --maintenance")?;
        let bytes = read_bounded(&cert_path, 4_000_000)?;
        let cert: aggregate::Certificate =
            serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        if cmd == "model-row" {
            let keep = args.get(2).ok_or("model-row requires KEEP")?;
            let model = verified_language::row_model::export(&p, keep, &cert)?;
            let output = arg_value(&args, "-o")?.ok_or("missing -o")?;
            write(
                &output,
                &serde_json::to_string_pretty(&model).map_err(|e| e.to_string())?,
            )?;
            println!("wrote {output}; logical source rows/projection, not native representation admission");
        } else {
            let path = args.get(2).ok_or("verify-row-model requires MODEL.json")?;
            let bytes = read_bounded(path, 16_000_000)?;
            let model = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            verified_language::row_model::verify(&p, &cert, &model)?;
            println!("verified logical source rows and projection; native correspondence remains separate");
        }
        return Ok(());
    }
    if cmd == "bitvector-obligation" {
        #[derive(serde::Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Goal {
            params: Vec<(String, verified_language::logic::Sort)>,
            conditions: Vec<verified_language::logic::Equation>,
            from: verified_language::logic::Term,
            to: verified_language::logic::Term,
        }
        let path = args
            .get(1)
            .ok_or("bitvector-obligation requires GOAL.json")?;
        let mut bytes = Vec::new();
        fs::File::open(path)
            .map_err(|e| e.to_string())?
            .take(4_000_001)
            .read_to_end(&mut bytes)
            .map_err(|e| e.to_string())?;
        if bytes.len() > 4_000_000 {
            return Err("bitvector goal exceeds 4 MB".into());
        }
        let goal: Goal = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        let context = if let Some(path) = arg_value(&args, "--library")? {
            verified_language::library::load(Path::new(&path))?.context
        } else {
            verified_language::logic::Context::default()
        };
        let problem =
            context.bitvector_problem(&goal.params, &goal.conditions, &goal.from, &goal.to)?;
        let output = arg_value(&args, "-o")?.ok_or("missing -o")?;
        write(
            &output,
            &serde_json::to_string(&problem).map_err(|e| e.to_string())?,
        )?;
        println!("wrote {output}; solver output requires a checked hinted-RUP certificate");
        return Ok(());
    }
    if cmd == "project-library" {
        let path = args.get(1).ok_or("project-library requires LOCK.json")?;
        let roots_path = args.get(2).ok_or("project-library requires ROOTS.json")?;
        let roots: Vec<String> = serde_json::from_slice(&read_bounded(roots_path, 64_000)?)
            .map_err(|e| e.to_string())?;
        let bundle = verified_language::library::bundle(Path::new(path))?;
        let projected = verified_language::library::project(&bundle, &roots)?;
        let output = arg_value(&args, "-o")?.ok_or("missing -o")?;
        write(
            &output,
            &serde_json::to_string_pretty(&projected).map_err(|e| e.to_string())?,
        )?;
        println!("wrote {output}; checked dependency selection, not optimization admission");
        return Ok(());
    }
    if cmd == "verify-library" {
        let path = args.get(1).ok_or("verify-library requires LOCK.json")?;
        let library = verified_language::library::load(std::path::Path::new(path))?;
        println!(
            "{}",
            serde_json::json!({"status":"verified","semantics":library.lock.semantics,"roots":library.lock.objects,"closure":library.closure,"scope":"first-order inductive mathematical definitions and theorems; source compilation requires separate --implementation correspondence proof"})
        );
        return Ok(());
    }
    if cmd == "verify-database" {
        let path = args.get(1).ok_or("verify-database requires LOCK.json")?;
        let database = knowledge::load(Path::new(path))?;
        println!(
            "verified {} historical proof-term objects; {} root theorems (verification only)",
            database.closure.len(),
            database.theorems.len()
        );
        return Ok(());
    }
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
        println!(
            "verified maintenance certificate {} ({})",
            c.id, c.semantics
        );
        return Ok(());
    }
    if cmd == "prove-maintenance" {
        let path = args.get(1).ok_or("prove-maintenance requires SOURCE")?;
        let text = fs::read_to_string(path).map_err(|e| e.to_string())?;
        let program = syntax::parse(&text)?;
        let c = if let Some(file) = arg_value(&args, "--evidence")? {
            let mut bytes = Vec::new();
            fs::File::open(file)
                .map_err(|e| e.to_string())?
                .take(4_000_001)
                .read_to_end(&mut bytes)
                .map_err(|e| e.to_string())?;
            if bytes.len() > 4_000_000 {
                return Err("maintenance evidence exceeds 4 MB limit".into());
            }
            let evidence = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            aggregate::prove_database(&program, evidence)?
        } else {
            aggregate::prove(&program)?
        };
        let out = arg_value(&args, "-o")?.ok_or("prove-maintenance requires -o PACKAGE.json")?;
        write(
            &out,
            &serde_json::to_string_pretty(&c).map_err(|e| e.to_string())?,
        )?;
        println!(
            "checked maintenance update expressions; wrote certificate {} ({})",
            c.id, c.semantics
        );
        return Ok(());
    }
    if cmd == "help" || cmd == "--help" {
        println!("ink emit-core SOURCE -o CORE.json\nink check-core CORE.json\nExecution/lowering commands also accept --core to read a checked CORE.json instead of source.\nChecked replacement packages: build/emit-c ... --replacement PACKAGE.json");
        println!("ink bitvector-obligation GOAL.json [--library LOCK.json] -o CNF.json\nink verify-library LOCK.json\nink project-library LOCK.json ROOTS.json -o BUNDLE.json\nink model-row SOURCE KEEP --maintenance PACKAGE.json -o MODEL.json\nink verify-row-model SOURCE MODEL.json --maintenance PACKAGE.json\nink verify-database LOCK.json\nink check SOURCE\nink prove-maintenance SOURCE [--evidence EVIDENCE.json] -o PACKAGE.json\nink verify-maintenance PACKAGE.json\nink execute SOURCE SCRIPT.json [--maintenance PACKAGE.json] [--restore SNAPSHOT] [--snapshot-out SNAPSHOT] [--portable]\nink run SOURCE FUNCTION ARGS.json\nink build SOURCE -o OUTPUT.o [--implementation PROPOSAL.json] [--cc clang] [--native-cpu]\nink build SOURCE --target wasm32 --zig PATH -o OUTPUT.wasm\nink build SOURCE --target webgpu --zig PATH -o DIRECTORY (also emits native wgpu crate)\nink emit-c SOURCE -o OUTPUT.c [--implementation PROPOSAL.json]\nink emit-state SOURCE -o DIRECTORY [--maintenance PACKAGE.json] [--bounded-totals] [--wasm-abi]");
        return Ok(());
    }
    if cmd == "prove" || cmd == "knowledge" || args.iter().any(|arg| arg == "--knowledge") {
        return Err("legacy polynomial generation/certificates were retired; use the external ink-knowledge/tools/rewrite_search.py producer and --replacement, or verify-library for proof objects".into());
    }
    if args.iter().any(|arg| arg == "--database") {
        return Err("built-in scalar rewrite search was retired; use external ink-knowledge/tools/rewrite_search.py and --replacement; verify-database still checks historical libraries".into());
    }
    let path = args.get(1).ok_or("missing source path")?;
    let mut p = if cmd == "check-core" || args.iter().any(|arg| arg == "--core") {
        core::CheckedModule::from_bytes(&read_bounded(path, core::MAX_BYTES)?)?.into_program()
    } else {
        source(path)?
    };
    match cmd {
        "emit-core" | "check-core" => {
            let module = core::CheckedModule::from_source(p)?;
            if cmd == "emit-core" {
                let out = arg_value(&args, "-o")?.ok_or("emit-core requires -o CORE.json")?;
                write(
                    &out,
                    &String::from_utf8(module.bytes()?).map_err(|e| e.to_string())?,
                )?;
            }
            println!(
                "{}",
                serde_json::json!({"status":"checked", "semantics":core::SEMANTICS,
                "core_sha256":module.identity()?, "functions":module.program().functions.len(),
                "actions":module.program().actions.len(), "trust":"Rust structural/type/effect checks; no proof of checker or backend correctness"})
            );
        }
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
            let bounded = args.iter().any(|s| s == "--bounded-totals");
            if bounded && certificate.is_none() {
                return Err("--bounded-totals requires a verified --maintenance package".into());
            }
            let wasm_abi = args.iter().any(|s| s == "--wasm-abi");
            let storage = if let Some(file) = arg_value(&args, "--storage")? {
                let mut bytes = Vec::new();
                fs::File::open(&file)
                    .map_err(|e| e.to_string())?
                    .take(64001)
                    .read_to_end(&mut bytes)
                    .map_err(|e| e.to_string())?;
                if bytes.len() > 64000 {
                    return Err("storage policy exceeds 64 KB limit".into());
                }
                let policy: verified_language::storage::Policy =
                    serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
                policy.check(&p, certificate.as_ref())?;
                Some((policy, format!("{:x}", Sha256::digest(bytes))))
            } else {
                None
            };
            let mut code = state_native::emit_with_storage(
                &p,
                certificate.as_ref(),
                bounded,
                storage.as_ref().map(|s| &s.0),
            )?;
            if wasm_abi {
                code.push_str(state_native::WASM_ABI);
            }
            write(&format!("{out}/src/lib.rs"), &code)?;
            write(&format!("{out}/src/main.rs"), state_native::RUNNER)?;
            write(&format!("{out}/Cargo.toml"), "[package]\nname = \"compiled-state\"\nversion = \"0.1.0\"\nedition = \"2021\"\n[lib]\ncrate-type = [\"rlib\", \"cdylib\"]\n[dependencies]\nnum-bigint = \"=0.4.8\"\nsha2 = \"=0.10.9\"\nserde_json = \"=1.0.151\"\n[profile.release]\nlto = \"thin\"\ncodegen-units = 1\n")?;
            let bounds = if bounded {
                state_native::bounded_caches_with_certificate(&p, certificate.as_ref().unwrap())
            } else {
                Default::default()
            };
            let authority = match certificate.as_ref().map(|c|c.version) {
                Some(4) => "generic generalized induction, exact source updates and keyed contribution-table write traces; row projection/native map abstraction/transaction protocol remains trusted",
                Some(3) => "generic induction kernel, exact source updates and reversible cache journal proofs; table projection/transaction protocol remains trusted",
                Some(2) => "generic induction kernel and exact source-update correspondence; table projection/transaction protocol remains trusted",
                Some(1) => "legacy polynomial checker and finite-map induction schema",
                _ => "recomputation; no maintenance certificate",
            };
            let plan = serde_json::json!({"source":path,"module":p.module,"backend":"typed Rust; no AST evaluator","wasm_host_abi":if wasm_abi {Some(1)} else {None},"maintenance_certificate":certificate.as_ref().map(|c|&c.id),"maintenance_semantics":certificate.as_ref().map(|c|&c.semantics),"maintenance_authority":authority,"maintenance_library_closure":certificate.as_ref().and_then(|c|c.evidence.as_ref()).map(|e|e.library.objects.keys().collect::<Vec<_>>()),"bounded_cache_evidence":bounds,"trusted":["frontend","row-local table projection and transactional cache protocol","finite-domain range analysis","modular representation lowering","typed Rust lowering","num-bigint","Rust/LLVM backend"],"limitations":["portable snapshots supported; no live native migration or durable WAL","collection scans currently materialise lists","no native execution fuel limit"]});
            let mut plan = plan;
            plan["storage_policy"] =
                serde_json::to_value(storage.as_ref().map(|s| &s.0)).map_err(|e| e.to_string())?;
            plan["storage_policy_sha256"] =
                serde_json::to_value(storage.as_ref().map(|s| &s.1)).map_err(|e| e.to_string())?;
            plan["storage_authority"]=serde_json::json!("typed external policy; ordered storage primitives and promotion remain trusted native lowering, not database-proved physical refinement");
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
                let bytes = fs::read(snapshot).map_err(|e| e.to_string())?;
                if bytes.starts_with(b"VLSTATE\0") {
                    stateful::Runtime::restore_portable(p.clone(), &bytes)?
                } else {
                    stateful::Runtime::restore(p.clone(), &bytes)?
                }
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
                let bytes = if args.iter().any(|s| s == "--portable") {
                    runtime.checkpoint_portable()?
                } else {
                    runtime.checkpoint()?
                };
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
            core::CheckedModule::from_source(p.clone())?;
            println!(
                "checked {} functions; {} states, {} derived values, {} changes/queries",
                p.functions.len(),
                p.states.len(),
                p.keeps.len(),
                p.actions.len()
            );
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
                .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p))
                .collect::<LangResult<Vec<_>>>()?;
            println!("{}", eval::call(&p, name, vs, &mut 100_000_000)?.json());
        }
        "build" | "emit-c" => {
            let input_core = core::CheckedModule::from_source(p.clone())?;
            input_core.pure_program()?;
            let input_core_sha256 = input_core.identity()?;
            let input_program_sha256 = format!(
                "{:x}",
                Sha256::digest(serde_json::to_vec(&p).map_err(|e| e.to_string())?)
            );
            let replacement = arg_value(&args, "--replacement")?
                .map(|path| {
                    verified_language::implementation::apply_replacement(&mut p, Path::new(&path))
                })
                .transpose()?;
            let implementation = arg_value(&args, "--implementation")?
                .map(|path| verified_language::implementation::apply(&mut p, Path::new(&path)))
                .transpose()?;
            let used: Vec<String> = Vec::new();
            let implementation_count = implementation
                .as_ref()
                .map_or(0, |e| e.checked_proposals.len())
                + replacement
                    .as_ref()
                    .map_or(0, |e| e.equality.checked_proposals.len());
            check::check(&p)?;
            let selected_core_sha256 = core::CheckedModule::from_source(p.clone())?.identity()?;
            let out = arg_value(&args, "-o")?.ok_or("build requires -o OUTPUT.o")?;
            let target = arg_value(&args, "--target")?.unwrap_or_else(|| "native".into());
            if target == "webgpu" || target == "gpu" {
                if args.iter().any(|a| a == "--native-cpu") {
                    return Err("--native-cpu is not a GPU bundle option".into());
                }
                verified_language::gpu::emit(&p, Path::new(&out))?;
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
                    .arg(Path::new(&out).join("cpu.c"))
                    .arg("-o")
                    .arg(Path::new(&out).join("cpu.wasm"))
                    .output()
                    .map_err(|e| format!("GPU bundle CPU fallback requires Zig ({zig}): {e}"))?;
                if !result.status.success() {
                    return Err(String::from_utf8_lossy(&result.stderr).into_owned());
                }
                let plan = serde_json::json!({"source":path,"target":target,"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"database_lock":serde_json::Value::Null,"database_closure":serde_json::Value::Null,"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"trust":"GPU backend remains trusted; see manifest.json"});
                write(
                    &format!("{out}/plan.json"),
                    &serde_json::to_string_pretty(&plan).map_err(|e| e.to_string())?,
                )?;
                println!("wrote WebGPU/Wasm bundle and native wgpu project to {out}; GPU selection is measured by the host runtime");
                return Ok(());
            }
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
            let generated_c = native::emit(&p)?;
            write(&cpath, &generated_c)?;
            let generated_c_sha256 = format!("{:x}", Sha256::digest(generated_c.as_bytes()));
            let selected_program_sha256 = format!(
                "{:x}",
                Sha256::digest(serde_json::to_vec(&p).map_err(|e| e.to_string())?)
            );
            let manifest = serde_json::json!({"source":path,"module":p.module,"target":target,"core_semantics":core::SEMANTICS,"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"input_program_sha256":input_program_sha256,"selected_program_sha256":selected_program_sha256,"generated_c_sha256":generated_c_sha256,"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"database_lock":serde_json::Value::Null,"database_closure":serde_json::Value::Null,"verified_fragment":"whole-function inductive collection equality; total-scalar equality proof terms","trusted":["Rust checker implementation","source semantics correspondence","literal collection lowering and allocation","generated C","Clang/LLVM backend","host ABI"],"unsupported_spec_features":"see PLAN.md and STATUS.md"});
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
                    println!("wrote {out}; {} checked rule applications; {implementation_count} checked implementation replacements", used.len());
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
            println!("wrote {out}; {} checked rule applications; {implementation_count} checked implementation replacements", used.len());
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
