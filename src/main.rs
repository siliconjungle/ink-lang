use sha2::{Digest, Sha256};
use std::{
    env, fs,
    io::Read,
    path::Path,
    process::{Command, ExitCode},
};
use verified_language::{check, core, eval, native, state_native, stateful, syntax, LangResult};

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
    Ok(verified_language::modules::load(path)?.program)
}
fn source_with_evidence(path:&str,args:&[String])->LangResult<syntax::Program> {
    let termination=arg_value(args,"--termination-proofs")?;
    let mut p=if termination.is_some() {verified_language::modules::load_for_termination(path)?.program} else {source(path)?};
    if let Some(file)=termination {
        p.termination.knowledge=Some(serde_json::from_slice(&read_bounded(&file,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?);
    }
    if let Some(file)=arg_value(args,"--contract-proofs")? {
        verified_language::contracts::attach(&mut p,serde_json::from_slice(&read_bounded(&file,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?)?;
    }
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
/// For each maintained keep, export the literal pipeline meaning, run the
/// external (untrusted) decomposition producer, and check its proof with the
/// general kernel. Any keep without a checked decomposition is an error, so a
/// build never silently relies on the trusted row-local decomposition.
fn prepare_selection(
    args: &[String],
    p: &syntax::Program,
) -> LangResult<Option<verified_language::optimisation::CheckedSelection>> {
    let selection = arg_value(args, "--selection")?;
    let catalogue = arg_value(args, "--optimise")?.map(|path| {
        let p = Path::new(&path);
        if p.is_dir() {
            p.join("store/snapshot.json").to_string_lossy().into_owned()
        } else {
            path
        }
    });
    if selection.is_some() && catalogue.is_some() {
        return Err("choose --selection or --optimise".into());
    }
    if selection.is_none() && catalogue.is_none() {
        return Ok(None);
    }
    let module = core::CheckedModule::from_source(p.clone())?;
    let package = if let Some(path) = selection {
        serde_json::from_slice::<verified_language::optimisation::Package>(&read_bounded(
            &path, 16_000_000,
        )?)
        .map_err(|e| e.to_string())?
    } else {
        // The producer is external and untrusted. Only its bounded data output
        // enters the checker; a catalogue cannot nominate executable scripts.
        let temp = env::temp_dir().join(format!(
            "ink-search-{}-{}",
            std::process::id(),
            std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .map_err(|e| e.to_string())?
                .as_nanos()
        ));
        fs::create_dir(&temp).map_err(|e| e.to_string())?;
        let result = (|| {
            let input = temp.join("core.json");
            let output = temp.join("selection.json");
            fs::write(&input, module.bytes()?).map_err(|e| e.to_string())?;
            let tool = if let Some(path) = arg_value(args, "--search-tool")? {
                std::path::PathBuf::from(path)
            } else {
                verified_language::distribution::resource("planner/plan.py")?
            };
            let budget = arg_value(args, "--search-budget")?.unwrap_or_else(|| "4096".into());
            let python = arg_value(args, "--python")?.unwrap_or_else(|| "python3".into());
            let mut command = Command::new(&python);
            command
                .arg(&tool)
                .arg("--compiler")
                .arg(env::current_exe().map_err(|e| e.to_string())?)
                .arg("--core")
                .arg(&input)
                .arg("--snapshot")
                .arg(catalogue.as_ref().unwrap())
                .arg("--budget")
                .arg(budget)
                .arg("-o")
                .arg(&output);
            if let Some(cache) = arg_value(args, "--plan-cache")? {
                command.arg("--cache-dir").arg(cache);
                if let Some(context) = arg_value(args, "--plan-cache-context")? {
                    command.arg("--cache-context").arg(context);
                }
            }
            let result = command.output().map_err(|e| {
                format!(
                    "cannot start {python} for {}: {e}; use --python PATH",
                    tool.display()
                )
            })?;
            if !result.status.success() {
                return Err(format!(
                    "external search failed: {}",
                    String::from_utf8_lossy(&result.stderr)
                ));
            }
            eprintln!("{}", String::from_utf8_lossy(&result.stdout).trim());
            serde_json::from_slice::<verified_language::optimisation::Package>(&read_bounded(
                output.to_str().ok_or("invalid output path")?,
                16_000_000,
            )?)
            .map_err(|e| e.to_string())
        })();
        let _ = fs::remove_dir_all(&temp);
        result?
    };
    verified_language::optimisation::check(&module, &package).map(Some)
}
fn planning_state(
    checked: &verified_language::planning::CheckedPlan,
) -> LangResult<serde_json::Value> {
    Ok(
        serde_json::json!({"source":checked.module().identity()?,"core":serde_json::from_slice::<serde_json::Value>(&checked.module().bytes()?).map_err(|e|e.to_string())?,
        "representation":checked.representation().map(|r|r.request()),
        "definition_choices":checked.representation().map(|r|r.definition().choices()),
        "definitions":checked.representation().map(|r|r.definition().reachable_executable_declarations()).transpose()?,
        "protocol":checked.protocol().map(|p|p.plan()),"protocol_capabilities":ink_core::protocol::capabilities(checked.module())?,"physical":checked.physical().map(|p|p.plan()),"properties":checked.properties().iter().map(|p|p.package()).collect::<Vec<_>>(),
        "resources":checked.resources().map(|r|r.plan()),"route":checked.route().map(|r|r.package()),
        "maintained":checked.maintained().map(|v|Ok::<_,String>(serde_json::json!({"package_sha256":verified_language::registry::identity(v.package())?,"keeps":v.package().views.iter().map(|v|&v.keep).collect::<Vec<_>>()}))).transpose()?}),
    )
}
fn planning_capability(
    checked: &verified_language::planning::CheckedPlan,
    target: &str,
) -> LangResult<()> {
    let scratch = env::temp_dir().join(format!(
        "ink-capability-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos()
    ));
    fs::create_dir_all(&scratch).map_err(|e| e.to_string())?;
    let result = verified_language::compiled_plans::emit(checked, target, &scratch.join("program"));
    let _ = fs::remove_dir_all(scratch);
    result
}
fn emit_state_rust(
    p: &syntax::Program,
    selected: Option<&verified_language::optimisation::CheckedSelection>,
    args: &[String],
) -> LangResult<String> {
    let storage = match arg_value(args, "--table-storage")?.as_deref() {
        None | Some("ordered") => state_native::TableStorage::Ordered,
        Some("indexed-slots") => state_native::TableStorage::IndexedSlots,
        _ => return Err("--table-storage must be ordered or indexed-slots".into()),
    };
    match selected {
        Some(s) => state_native::emit_selected_with_table_storage(s, storage),
        None => state_native::emit_with_table_storage(p, storage),
    }
}
fn run() -> LangResult<()> {
    let args: Vec<String> = env::args().skip(1).collect();
    let cmd = args.first().map(String::as_str).unwrap_or("help");
    const OPTIONS: &[&str] = &[
        "--budget",
        "--plan",
        "--registry",
        "--state-limit",
        "--planning-seconds",
        "--semantic-budget",
        "--semantic-seconds",
        "--recipe-workers",
        "--planning-effort",
        "--profile",
        "--workload",
        "--target-profile",
        "--measure-workload",
        "--measure-holdout",
        "--minimum-measured-gain-ppm",
        "--measure-processes",
        "--measure-timeout",
        "--measurement-mode",
        "--planning-cache",
        "--cargo",
        "--cc",
        "--compiler",
        "--core",
        "--help",
        "--implementation",
        "--entry",
        "--lean",
        "--library",
        "--circuit",
        "--native-cpu",
        "--optimise",
        "--plan-cache",
        "--plan-cache-context",
        "--portable",
        "--proofs",
        "--python",
        "--replacement",
        "--restore",
        "--roles",
        "--route",
        "--route-proof",
        "--search-budget",
        "--search-tool",
        "--select",
        "--selection",
        "--contract-proofs",
        "--termination-proofs",
        "--refinement-bodies",
        "--snapshot",
        "--snapshot-out",
        "--sorted-tables",
        "--state-out",
        "--physical-plan",
        "--representation",
        "--syntax-roles",
        "--table-storage",
        "--lowering",
        "--target",
        "--value-roles",
        "--version",
        "--view",
        "--wasm-abi",
        "--zig",
    ];
    for arg in &args {
        if arg.starts_with("--") && !OPTIONS.contains(&arg.as_str()) {
            return Err(format!("unknown option {arg}"));
        }
    }
    if cmd == "--version" || cmd == "version" {
        println!("ink {} ({})", env!("CARGO_PKG_VERSION"), core::SEMANTICS);
        return Ok(());
    }
    if cmd == "doctor" {
        let python = arg_value(&args, "--python")?.unwrap_or_else(|| "python3".into());
        println!(
            "{}",
            serde_json::to_string_pretty(&verified_language::distribution::doctor(&python))
                .map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    if cmd == "compile" {
        let input = args.get(1).ok_or("compile requires SOURCE")?;
        let output = arg_value(&args, "-o")?.ok_or("compile requires -o OUTPUT")?;
        let target = arg_value(&args, "--target")?.unwrap_or_else(|| "rust".into());
        if let Some(packet) = arg_value(&args, "--plan")? {
            let module = if args.iter().any(|a| a == "--core") {
                core::CheckedModule::from_bytes(&read_bounded(input, core::MAX_BYTES)?)?
            } else {
                core::CheckedModule::from_source(source_with_evidence(input,&args)?)?
            };
            let package = serde_json::from_slice(&read_bounded(
                &packet,
                verified_language::registry::MAX_VIEW_BYTES,
            )?)
            .map_err(|e| e.to_string())?;
            let plan = verified_language::planning::check(&module, &package)?;
            return verified_language::compiled_plans::emit(&plan, &target, Path::new(&output));
        }
        let knowledge = arg_value(&args, "--optimise")?
            .ok_or("compile requires --optimise KNOWLEDGE_DIRECTORY or --plan PACKET.json")?;
        let tool = verified_language::distribution::resource("planner/compile_plan.py")?;
        let python = arg_value(&args, "--python")?.unwrap_or_else(|| "python3".into());
        let mut command = Command::new(python);
        command
            .arg(tool)
            .arg("--compiler")
            .arg(env::current_exe().map_err(|e| e.to_string())?)
            .arg("--source")
            .arg(input)
            .arg("--knowledge-root")
            .arg(knowledge)
            .arg("--target")
            .arg(target)
            .arg("--emit")
            .arg(&output)
            .arg("-o")
            .arg(format!("{output}.planning.json"));
        for (flag, option) in [
            ("--search-budget", "--budget"),
            ("--state-limit", "--state-limit"),
            ("--planning-seconds", "--time-seconds"),
            ("--semantic-budget", "--semantic-budget"),
            ("--semantic-seconds", "--semantic-seconds"),
            ("--recipe-workers", "--recipe-workers"),
            ("--planning-effort", "--planning-effort"),
            ("--registry", "--registry"),
            ("--snapshot", "--snapshot"),
            ("--contract-proofs", "--contract-proofs"),
            ("--termination-proofs", "--termination-proofs"),
            ("--profile", "--profile"),
            ("--workload", "--workload"),
            ("--target-profile", "--target-profile"),
            ("--measure-workload", "--measure-workload"),
            ("--measure-holdout", "--measure-holdout"),
            ("--minimum-measured-gain-ppm", "--minimum-measured-gain-ppm"),
            ("--measure-processes", "--measure-processes"),
            ("--measure-timeout", "--measure-timeout"),
            ("--measurement-mode", "--measurement-mode"),
            ("--planning-cache", "--cache"),
        ] {
            if let Some(value) = arg_value(&args, flag)? {
                command.arg(option).arg(value);
            }
        }
        if args.iter().any(|a| a == "--core") {
            command.arg("--core");
        }
        let result = command.output().map_err(|e| e.to_string())?;
        if !result.status.success() {
            return Err(format!(
                "compiled planning failed: {}",
                String::from_utf8_lossy(&result.stderr)
            ));
        }
        println!("{}", String::from_utf8_lossy(&result.stdout).trim());
        return Ok(());
    }
    if cmd == "modules" {
        let path = args.get(1).ok_or("modules requires SOURCE")?;
        let loaded = verified_language::modules::load(path)?;
        let output = serde_json::json!({"entry":loaded.files[0].module,"files":loaded.files.iter().map(|f|serde_json::json!({"path":f.path,"module":f.module,"sha256":f.sha256})).collect::<Vec<_>>()});
        println!(
            "{}",
            serde_json::to_string_pretty(&output).map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    if cmd == "plan-session" {
        let input = args.get(1).ok_or("plan-session requires CORE.json")?;
        let module = core::CheckedModule::from_bytes(&read_bounded(input, core::MAX_BYTES)?)?;
        let mut checker = verified_language::planning::Checker::new(module);
        let target = arg_value(&args, "--target")?;
        use std::io::{BufRead, Write};
        let stdin = std::io::stdin();
        let mut input = stdin.lock();
        println!("{}", serde_json::json!({"ready":true}));
        std::io::stdout().flush().map_err(|e| e.to_string())?;
        loop {
            let mut line = Vec::new();
            let count = input
                .by_ref()
                .take((verified_language::registry::MAX_VIEW_BYTES + 1) as u64)
                .read_until(b'\n', &mut line)
                .map_err(|e| e.to_string())?;
            if count == 0 {
                break;
            }
            if count > verified_language::registry::MAX_VIEW_BYTES {
                return Err("plan session request byte limit".into());
            }
            let result = (|| {
                let packet: verified_language::planning::Package =
                    serde_json::from_slice(&line).map_err(|e| e.to_string())?;
                let request: serde_json::Value = serde_json::from_slice(&line).map_err(|e|e.to_string())?;
                let checked = checker.check(&packet)?;
                let capability =
                    target
                        .as_ref()
                        .map(|target| match planning_capability(&checked, target) {
                            Ok(()) => serde_json::json!({"emittable":true}),
                            Err(reason) => serde_json::json!({"emittable":false,"reason":reason}),
                        });
                Ok::<_, String>(
                    serde_json::json!({"status":"checked","request_sha256":verified_language::registry::identity(&request)?,"plan_sha256":verified_language::registry::identity(&packet)?,"state":planning_state(&checked)?,"reused_steps":checker.reused_steps(),"capability":capability}),
                )
            })();
            println!(
                "{}",
                match result {
                    Ok(value) => value,
                    Err(error) => serde_json::json!({"error":error}),
                }
            );
            std::io::stdout().flush().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    if cmd == "selection-session" {
        if args.len() != 3 {
            return Err("selection-session requires CORE.json VIEW.json".into());
        }
        let module = core::CheckedModule::from_bytes(&read_bounded(&args[1], core::MAX_BYTES)?)?;
        let catalogue = serde_json::from_slice(&read_bounded(&args[2], 16_000_000)?)
            .map_err(|e| e.to_string())?;
        let mut checker =
            verified_language::optimisation::SelectionChecker::new(module, catalogue)?;
        use std::io::{BufRead, Write};
        let stdin = std::io::stdin();
        let mut reader = stdin.lock();
        println!("{}", serde_json::json!({"ready":true,"incremental":true}));
        std::io::stdout().flush().map_err(|e| e.to_string())?;
        for _ in 0..4098 {
            let mut line = Vec::new();
            let count = reader
                .by_ref()
                .take(16_000_001)
                .read_until(b'\n', &mut line)
                .map_err(|e| e.to_string())?;
            if count == 0 {
                break;
            }
            if count > 16_000_000 {
                return Err("checker session request byte limit".into());
            }
            #[derive(serde::Deserialize)]
            #[serde(deny_unknown_fields)]
            struct Admission {
                admit: verified_language::registry::Bundle,
            }
            if let Ok(admission) = serde_json::from_slice::<Admission>(&line) {
                let response = match checker.extend(admission.admit) {
                    Ok(added) => serde_json::json!({"admitted":true,"added":added}),
                    Err(error) => serde_json::json!({"admitted":false,"error":error}),
                };
                println!("{response}");
                std::io::stdout().flush().map_err(|e| e.to_string())?;
                continue;
            }
            let result =
                serde_json::from_slice::<Vec<verified_language::optimisation::Site>>(&line)
                    .map_err(|e| e.to_string())
                    .and_then(|apps| checker.check(apps));
            println!(
                "{}",
                match result {
                    Ok(s) => serde_json::json!({"checked":true,"evidence":s.evidence()}),
                    Err(e) => serde_json::json!({"checked":false,"error":e}),
                }
            );
            std::io::stdout().flush().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    if cmd == "knowledge-check" {
        if args.len() != 3 {
            return Err("knowledge-check requires CORE.json VIEW.json".into());
        }
        let module = core::CheckedModule::from_bytes(&read_bounded(&args[1], core::MAX_BYTES)?)?;
        let bundle: verified_language::registry::Bundle = serde_json::from_slice(&read_bounded(
            &args[2],
            verified_language::registry::MAX_VIEW_BYTES,
        )?)
        .map_err(|e| e.to_string())?;
        let checked = verified_language::registry::CheckedBundle::check(&bundle)?;
        let entries = checked.verify(module.program())?;
        println!(
            "{}",
            serde_json::json!({"status":"checked","snapshot_sha256":checked.snapshot_id(),"entries":entries})
        );
        return Ok(());
    }
    if cmd == "check-boolean-verdict" {
        let input = args
            .get(1)
            .ok_or("check-boolean-verdict requires THEOREM.json --lean PATH -o CERTIFICATE.lean")?;
        let bytes = read_bounded(input, 1_000_000)?;
        let obj: serde_json::Value = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        let params: Vec<(String, syntax::Type)> =
            serde_json::from_value(obj["params"].clone()).map_err(|e| e.to_string())?;
        let from: syntax::Expr =
            serde_json::from_value(obj["from"].clone()).map_err(|e| e.to_string())?;
        let to: syntax::Expr =
            serde_json::from_value(obj["to"].clone()).map_err(|e| e.to_string())?;
        let proof: verified_language::equality::Proof =
            serde_json::from_value(obj["proof"].clone()).map_err(|e| e.to_string())?;
        verified_language::equality::verify(&params, &from, &to, &proof)?;
        let output = arg_value(&args, "-o")?.ok_or("provide -o CERTIFICATE.lean")?;
        let lean = arg_value(&args, "--lean")?.unwrap_or_else(|| "lean".into());
        let python = arg_value(&args, "--python")?.unwrap_or_else(|| "python3".into());
        let tool =
            verified_language::distribution::resource("knowledge/producers/boolean_verdict.py")?;
        let mut producer = Command::new(python)
            .arg(tool)
            .arg("-")
            .arg("-o")
            .arg(&output)
            .stdin(std::process::Stdio::piped())
            .stdout(std::process::Stdio::piped())
            .stderr(std::process::Stdio::piped())
            .spawn()
            .map_err(|e| e.to_string())?;
        // Translate exactly the bytes checked above, without reopening the input.
        use std::io::Write;
        producer
            .stdin
            .take()
            .ok_or("producer stdin")?
            .write_all(&bytes)
            .map_err(|e| e.to_string())?;
        let generated = producer.wait_with_output().map_err(|e| e.to_string())?;
        if !generated.status.success() {
            return Err(String::from_utf8_lossy(&generated.stderr).into());
        }
        let checked = Command::new(&lean)
            .arg(&output)
            .output()
            .map_err(|e| format!("cannot run Lean: {e}"))?;
        if !checked.status.success() {
            return Err(format!(
                "independent Lean verdict failed: {}{}",
                String::from_utf8_lossy(&checked.stdout),
                String::from_utf8_lossy(&checked.stderr)
            ));
        }
        let report: serde_json::Value =
            serde_json::from_slice(&generated.stdout).map_err(|e| e.to_string())?;
        println!(
            "{}",
            serde_json::json!({"status":"checked","scope":"Boolean equality only; translator and source correspondence are not verified","identity":report,"lean":lean,"axioms":String::from_utf8_lossy(&checked.stdout)})
        );
        return Ok(());
    }
    if cmd == "check-selection" {
        if args.len() != 3 {
            return Err("check-selection requires CORE.json PACKAGE.json".into());
        }
        let module = core::CheckedModule::from_bytes(&read_bounded(&args[1], core::MAX_BYTES)?)?;
        let package: verified_language::optimisation::Package =
            serde_json::from_slice(&read_bounded(&args[2], 16_000_000)?)
                .map_err(|e| e.to_string())?;
        let selected = verified_language::optimisation::check(&module, &package)?;
        println!(
            "{}",
            serde_json::to_string(selected.evidence()).map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    if cmd == "check-source-route" {
        if args.len() != 3 && args.len() != 5 {
            return Err(
                "check-source-route requires CORE.json ROUTING.json [--route-proof EVIDENCE.json]"
                    .into(),
            );
        }
        let module = core::CheckedModule::from_bytes(&read_bounded(&args[1], core::MAX_BYTES)?)?;
        let package: verified_language::source_routing::Package =
            serde_json::from_slice(&read_bounded(&args[2], 16_000_000)?)
                .map_err(|e| e.to_string())?;
        let checked = if let Some(file) = arg_value(&args, "--route-proof")? {
            let evidence =
                serde_json::from_slice::<verified_language::source_routing::Equivalence>(
                    &read_bounded(&file, 16_000_000)?,
                )
                .map_err(|e| e.to_string())?;
            verified_language::source_routing::check_equivalent(&module, &package, &evidence)?
        } else {
            verified_language::source_routing::check(&module, &package)?
        };
        println!(
            "{}",
            serde_json::json!({"status":"checked", "semantics":package.semantics,"core_sha256":package.input_core_sha256,"entry":package.entry,"stages":package.stages,"stage_types":checked.stage_types(),"scope":"checked pure source call composition; target availability, physical transport, host failures and code generation remain trusted"})
        );
        return Ok(());
    }
    if cmd == "check-route" {
        if args.len() != 3 {
            return Err("check-route requires LOCK.json ROUTING.json".into());
        }
        let bundle = verified_language::library::bundle(Path::new(&args[1]))?;
        let package: verified_language::routing::Package =
            serde_json::from_slice(&read_bounded(&args[2], 16_000_000)?)
                .map_err(|e| e.to_string())?;
        let checked = verified_language::routing::check(&bundle, &package)?;
        println!(
            "{}",
            serde_json::json!({"status":"checked", "semantics":verified_language::routing::SEMANTICS,"bundle_sha256":package.bundle_sha256,"entry":package.entry,"stages":package.stages,"stage_sorts":checked.stage_sorts(),"result":checked.result(),"scope":"pure mathematical composition only; physical bridges, scheduling and backend execution remain trusted; placement labels do not establish availability or performance"})
        );
        return Ok(());
    }
    if cmd == "emit-machine" {
        let lock = args.get(1).ok_or("emit-machine requires LOCK.json")?;
        let package = args.get(2).ok_or("emit-machine requires PACKAGE.json")?;
        if args.len() != 5 || args[3] != "-o" {
            return Err("emit-machine requires exactly -o SOURCE.rs".into());
        }
        let bundle = verified_language::library::bundle(Path::new(lock))?;
        let package: verified_language::machine::Package =
            serde_json::from_slice(&read_bounded(package, 16_000_000)?)
                .map_err(|e| e.to_string())?;
        let emitted = verified_language::machine::emit(&bundle, &package)?;
        write(&args[4], &emitted.source)?;
        println!(
            "{}",
            serde_json::to_string(&emitted.evidence).map_err(|e| e.to_string())?
        );
        return Ok(());
    }
    if cmd == "emit-definition" {
        let path = args.get(1).ok_or("emit-definition requires LOCK.json")?;
        let exports = args.get(2).ok_or("emit-definition requires EXPORTS.json")?;
        let mut options = std::collections::BTreeSet::new();
        let pairs = args[3..].chunks_exact(2);
        if !pairs.remainder().is_empty() {
            return Err("emit-definition requires a value for each option".into());
        }
        for pair in pairs {
            if !matches!(pair[0].as_str(), "-o" | "--select") || !options.insert(&pair[0]) {
                return Err("unknown or duplicate emit-definition option".into());
            }
        }
        let exports: Vec<String> =
            serde_json::from_slice(&read_bounded(exports, 64_000)?).map_err(|e| e.to_string())?;
        let bundle = verified_language::library::bundle(Path::new(path))?;
        let selection: Option<verified_language::definition_native::SelectionPackage> =
            arg_value(&args, "--select")?
                .map(|path| {
                    serde_json::from_slice(&read_bounded(&path, 16_000_000)?)
                        .map_err(|e| e.to_string())
                })
                .transpose()?;
        let emission = verified_language::definition_native::emit_selected(
            &bundle,
            &exports,
            selection.as_ref(),
        )?;
        let output = arg_value(&args, "-o")?.ok_or("missing -o")?;
        write(&output, &emission.source)?;
        println!(
            "{}",
            serde_json::to_string(&emission.receipt).map_err(|e| e.to_string())?
        );
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
        let encoding = match arg_value(&args, "--circuit")?.as_deref() {
            None | Some("literal-v1") => verified_language::bitproof::Encoding::LiteralV1,
            Some("shared-v2") => verified_language::bitproof::Encoding::SharedV2,
            _ => return Err("unsupported bit circuit encoding".into()),
        };
        let problem = context.bitvector_problem_with_encoding(
            &goal.params, &goal.conditions, &goal.from, &goal.to, encoding,
        )?;
        let output = arg_value(&args, "-o")?.ok_or("missing -o")?;
        write(
            &output,
            &serde_json::to_string(&problem).map_err(|e| e.to_string())?,
        )?;
        println!("wrote {output}; solver output requires a checked hinted-RUP certificate");
        return Ok(());
    }
    if cmd == "emit-laws" {
        let path = args
            .get(1)
            .ok_or("emit-laws requires an external theorem SOURCE")?;
        let bytes = read_bounded(path, 1_000_000)?;
        let text = std::str::from_utf8(&bytes).map_err(|e| e.to_string())?;
        let source = syntax::parse_law_source(text)?;
        let proofs = arg_value(&args, "--proofs")?
            .map(|p| {
                read_bounded(&p, 4_000_000)
                    .and_then(|b| serde_json::from_slice(&b).map_err(|e| e.to_string()))
            })
            .transpose()?
            .unwrap_or_default();
        let deps = arg_value(&args, "--view")?
            .map(|p| {
                read_bounded(&p, verified_language::registry::MAX_VIEW_BYTES)
                    .and_then(|b| serde_json::from_slice(&b).map_err(|e| e.to_string()))
            })
            .transpose()?;
        let authored =
            verified_language::law_author::compile_source(source, proofs, deps.as_ref())?;
        let output = arg_value(&args, "-o")?.ok_or("emit-laws requires -o BUNDLE.json")?;
        write(
            &output,
            &serde_json::to_string_pretty(&authored.bundle).map_err(|e| e.to_string())?,
        )?;
        println!(
            "{}",
            serde_json::json!({"status":"checked","names":authored.names,"snapshot":authored.bundle.snapshot,"scope":"External laws (law and rewrite declarations) checked by the semantic law kernel; source declarations do not grant optimisation authority."})
        );
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

    if cmd == "help" || cmd == "--help" {
        println!("ink compile SOURCE --optimise KNOWLEDGE_DIRECTORY [--snapshot SNAPSHOT.json] --target rust|c|javascript|rust-wasm|c-wasm|wgpu|webgpu -o OUTPUT\nink compile SOURCE --plan PACKET.json --target TARGET -o OUTPUT\nink check-plan SOURCE PACKET.json [--core]\nink --version\nink doctor [--python PATH]\nink explain SOURCE [--core] [--selection PACKAGE.json | --optimise SNAPSHOT.json]\nink modules SOURCE");
        println!("ink check-boolean-verdict THEOREM.json --lean PATH -o CERTIFICATE.lean");
        println!("ink emit-contract-obligations SOURCE -o OBLIGATIONS.json\nink check-contract-proof-stream SOURCE (bounded NDJSON authoring attempts)\nink check-contracts SOURCE [--contract-proofs EVIDENCE.json]\nAll source build/execution commands accept --contract-proofs EVIDENCE.json.");
        println!("ink emit-termination-obligations SOURCE -o GOALS.json\nink check-termination SOURCE --termination-proofs BUNDLE.json\nSource compilation/execution accepts --termination-proofs BUNDLE.json; measures grant no authority without checked evidence.");
        println!("ink emit-laws THEOREMS.ink [--proofs EVIDENCE.json] [--view DEPENDENCIES.json] -o BUNDLE.json");
        println!("ink emit-semantic SOURCE [--core] -o SUBJECT.json\nink check-selection CORE.json PACKAGE.json\nExecution, lowering and core emission accept --optimise KNOWLEDGE_DIRECTORY or SNAPSHOT.json (external search) or --selection PACKAGE.json (checked replay). Optional --search-tool PATH, --search-budget N, --python PATH and --plan-cache DIRECTORY [--plan-cache-context FILE]. INK_DISTRIBUTION locates an optional installed tool bundle.");
        println!("ink check-representation SOURCE REQUEST.json\nink emit-representation SOURCE REQUEST.json [--target rust|rust-packed|rust-memo|c|javascript|wasm32|c-wasm|rust-wasm|rust-wasm-packed|rust-wasm-memo|wgpu|webgpu] -o OUTPUT\nink execute-representation SOURCE REQUEST.json SCRIPT.json [--restore SNAPSHOT] [--snapshot-out SNAPSHOT] (compiles standalone Rust; requires Cargo; script supports call and portable migrate steps)");
        println!("ink check-source-route CORE.json ROUTING.json\nink emit-action-model SOURCE -o MODEL.json (restricted whole-action transition projection)");
        println!("ink emit-source-syntax SOURCE --roles ROLES.json -o EXPECTED.json\nink check-source-syntax SOURCE --roles ROLES.json --view VIEW.json (complete code-data binding only)");
        println!("ink check-action-values SOURCE --syntax-roles SYNTAX.json --value-roles VALUES.json --view VIEW.json\nink emit-action-values SOURCE ACTION ARGS.json --syntax-roles SYNTAX.json --value-roles VALUES.json --view VIEW.json -o IMAGE.json (typed value data only)");
        println!("ink emit-machine LOCK.json PACKAGE.json -o SOURCE.rs");
        println!(
            "ink emit-definition LOCK.json EXPORTS.json [--select PACKAGE.json] -o DEFINITION.rs"
        );
        println!("ink emit-core SOURCE -o CORE.json\nink check-core CORE.json\nink extend-core SOURCE REQUEST.json [--core] -o CORE.json\nink emit-actions SOURCE -o ACTIONS.json\nink check-actions SOURCE ACTIONS.json\nink emit-effects SOURCE -o EFFECTS.json\nink check-effects SOURCE EFFECTS.json\nink emit-access SOURCE -o ACCESS.json\nink check-access SOURCE ACCESS.json\nExecution/lowering commands also accept --core to read a checked CORE.json instead of source.\nChecked replacement packages: build ... --replacement PACKAGE.json");
        println!("ink check SOURCE\nink execute SOURCE SCRIPT.json [--restore SNAPSHOT] [--snapshot-out SNAPSHOT] [--portable]\nink run SOURCE FUNCTION ARGS.json\nink build SOURCE [--target native|wasm32|rust|javascript|webgpu] -o OUTPUT (native and wasm32 use typed Rust)\nink emit-state SOURCE -o DIRECTORY [--wasm-abi] [--table-storage ordered|indexed-slots]\nink check-representation SOURCE REQUEST.json\nink verify-library LOCK.json");

        return Ok(());
    }
    let path = args.get(1).ok_or("missing source path")?;
    let mut p = if cmd == "check-core" || args.iter().any(|arg| arg == "--core") {
        core::CheckedModule::from_bytes(&read_bounded(path, core::MAX_BYTES)?)?.into_program()
    } else if cmd=="emit-termination-obligations" || arg_value(&args,"--termination-proofs")?.is_some() {
        verified_language::modules::load_for_termination(path)?.program
    } else {
        source(path)?
    };
    if let Some(file)=arg_value(&args,"--termination-proofs")? {
        p.termination.knowledge=Some(serde_json::from_slice(&read_bounded(&file,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?);
    }
    if let Some(file)=arg_value(&args,"--contract-proofs")? {
        let evidence=serde_json::from_slice(&read_bounded(&file,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?;
        verified_language::contracts::attach(&mut p,evidence)?;
    }
    if cmd=="emit-termination-obligations" {
        let output=arg_value(&args,"-o")?.ok_or("emit-termination-obligations requires -o FILE.json")?;
        let goals=verified_language::termination::obligations(&p)?;
        write(&output,&serde_json::to_string_pretty(&serde_json::json!({"schema":1,"semantics":verified_language::termination::SEMANTICS,"source":verified_language::termination::subject_identity(&p)?,"obligations":goals})).map_err(|e|e.to_string())?)?;
        println!("wrote {output}; every recursive call requires a checked certificate");return Ok(());
    }
    if cmd=="check-termination" {
        verified_language::termination::check(&p)?;
        println!("checked universal descent; source contracts still require their own admission");return Ok(());
    }
    if let Some(file)=arg_value(&args,"--refinement-bodies")? {
        if !["emit-contract-obligations","check-contract-proof","check-contract-proof-stream"].contains(&cmd){return Err("refinement bodies are an authoring input; use checked selection to execute".into());}
        let bodies=serde_json::from_slice(&read_bounded(&file,core::MAX_BYTES)?).map_err(|e|e.to_string())?;
        p=verified_language::contracts::prepare(&core::CheckedModule::from_source(p)?,&bodies)?;
    }
    if cmd == "check-contract-proof-stream" {
        use std::io::{BufRead, Write};
        #[derive(serde::Deserialize)]
        #[serde(deny_unknown_fields)]
        struct Attempt {
            name: String,
            proof: serde_json::Value,
            knowledge: Option<verified_language::registry::Bundle>,
        }
        let mut context = verified_language::contracts::ProofContext::new(&p)?;
        let identity = context.source_identity()?;
        let input = std::io::stdin();
        let mut input = input.lock();
        let output = std::io::stdout();
        let mut output = output.lock();
        writeln!(
            output,
            "{}",
            serde_json::json!({"status":"ready","source_sha256":identity})
        )
        .map_err(|e| e.to_string())?;
        output.flush().map_err(|e| e.to_string())?;
        loop {
            let mut bytes = Vec::new();
            let size = (&mut input)
                .take((verified_language::registry::MAX_VIEW_BYTES + 1) as u64)
                .read_until(b'\n', &mut bytes)
                .map_err(|e| e.to_string())?;
            if size == 0 {
                break;
            }
            if size > verified_language::registry::MAX_VIEW_BYTES {
                return Err("contract proof request byte limit".into());
            }
            let answer = match serde_json::from_slice::<Attempt>(&bytes) {
                Ok(attempt) => {
                    match context.check(&attempt.name, attempt.proof, attempt.knowledge.as_ref()) {
                        Ok(()) => serde_json::json!({"status":"checked","name":attempt.name}),
                        Err(error) => {
                            serde_json::json!({"status":"rejected","name":attempt.name,"error":error})
                        }
                    }
                }
                Err(error) => serde_json::json!({"status":"rejected","error":error.to_string()}),
            };
            writeln!(output, "{answer}").map_err(|e| e.to_string())?;
            output.flush().map_err(|e| e.to_string())?;
        }
        return Ok(());
    }
    if cmd=="check-contract-proof" {
        let name=args.get(2).ok_or("missing obligation name")?;
        let file=args.get(3).ok_or("missing proof file")?;
        let v:serde_json::Value=serde_json::from_slice(&read_bounded(file,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?;
        let bundle=v.get("knowledge").filter(|v|!v.is_null()).map(|v|serde_json::from_value(v.clone()).map_err(|e|e.to_string())).transpose()?;
        verified_language::contracts::check_proof(&p,name,v.get("proof").ok_or("missing proof")?.clone(),bundle.as_ref())?;
        println!("checked contract obligation {name}");return Ok(());
    }
    if cmd=="emit-contract-obligations" {
        let pure=verified_language::contracts::obligations(&p)?;
        let state=if verified_language::contracts::needs_state(&p)? {Some(verified_language::contracts::state_obligations(&p)?)}else{None};
        let mut executable=p.clone();executable.contracts=verified_language::contracts::Contracts::default();
        let executable=core::CheckedModule::from_source(executable)?;
        fn called_helpers(value:&serde_json::Value,program:&syntax::Program,names:&mut std::collections::BTreeSet<String>){
            match value {
                serde_json::Value::String(value)=>if let Some(name)=value.strip_prefix("call:"){if program.functions.iter().any(|f|f.name==name){names.insert(name.into());}},
                serde_json::Value::Array(values)=>for value in values{called_helpers(value,program,names);},
                serde_json::Value::Object(fields)=>for value in fields.values(){called_helpers(value,program,names);},
                _=>(),
            }
        }
        let mut roots=std::collections::BTreeSet::new();
        called_helpers(&serde_json::to_value(&pure).map_err(|e|e.to_string())?,&p,&mut roots);
        let definition_context=verified_language::definition_context::DefinitionContext::capture(&executable,&roots.into_iter().collect::<Vec<_>>())?;
        let output=arg_value(&args,"-o")?.ok_or("emit-contract-obligations requires -o FILE.json")?;
        write(&output,&serde_json::to_string_pretty(&serde_json::json!({"schema":1,"semantics":verified_language::contracts::SEMANTICS,"source_sha256":verified_language::contracts::subject_identity(&p)?,"pure":pure,"state":state,"definition_context":definition_context})).map_err(|e|e.to_string())?)?;
        println!("wrote {output}; obligations are not accepted proofs");return Ok(());
    }
    if cmd=="check-contracts" {
        let module=core::CheckedModule::from_source(p)?;
        println!("{}",serde_json::json!({"status":"checked","semantics":verified_language::contracts::SEMANTICS,"core_sha256":module.identity()?,"specifications":module.program().contracts.specifications.len(),"invariants":module.program().contracts.invariants.len()}));return Ok(());
    }
    if cmd=="extend-core" {
        let module=core::CheckedModule::from_source(p)?;
        let file=args.get(2).ok_or("extend-core requires REQUEST.json")?;
        let request=serde_json::from_slice(&read_bounded(file,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?;
        let selected=verified_language::source_extension::check(&module,&request)?;
        let output=arg_value(&args,"-o")?.ok_or("extend-core requires -o CORE.json")?;
        write(&output,&String::from_utf8(selected.bytes()?).map_err(|e|e.to_string())?)?;
        println!("{}",serde_json::json!({"status":"checked","input":module.identity()?,"core_sha256":selected.identity()?,"scope":"Conservative typed definitions; no source replacement authority"}));return Ok(());
    }
    let source_program_sha256 = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(&p).map_err(|e| e.to_string())?)
    );
    let input_module = if cmd == "explain" {
        Some(core::CheckedModule::from_source(p.clone())?)
    } else {
        None
    };
    if matches!(
        cmd,
        "check-plan" | "emit-plan" | "check-properties" | "check-physical-plan" | "emit-maintained-subjects" | "emit-protocol-ir" | "plan-work"
    ) {
        let module = core::CheckedModule::from_source(p.clone())?;
        if cmd=="emit-protocol-ir" {
            let output=serde_json::to_string(&ink_core::protocol::graph(&module)?).map_err(|e|e.to_string())?;
            if let Some(path)=arg_value(&args,"-o")?{write(&path,&output)?;}else{println!("{output}");}
            return Ok(());
        }
        if cmd=="emit-maintained-subjects" {
            let subjects=verified_language::maintained::subjects(&module)?;
            let output=serde_json::to_string(&subjects).map_err(|e|e.to_string())?;
            if let Some(path)=arg_value(&args,"-o")? {write(&path,&output)?;} else {println!("{output}");}
            return Ok(());
        }
        let packet = args.get(2).ok_or("missing checked planning package")?;
        let bytes = read_bounded(packet, verified_language::registry::MAX_VIEW_BYTES)?;
        if cmd == "check-properties" {
            let package = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            let checked = verified_language::property::check(&module, &package)?;
            println!(
                "{}",
                serde_json::json!({"status":"checked","source":module.identity()?,"equations":checked.equations()})
            );
            return Ok(());
        }
        if cmd == "check-physical-plan" {
            let package = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
            let representation = arg_value(&args, "--representation")?
                .map(|path| verified_language::representations::load(&module, &path))
                .transpose()?;
            let checked =
                verified_language::physical::check(&module, representation.as_ref(), &package)?;
            println!(
                "{}",
                serde_json::json!({"status":"checked","source":module.identity()?,"physical":checked.plan()})
            );
            return Ok(());
        }
        let package = serde_json::from_slice(&bytes).map_err(|e| e.to_string())?;
        let checked = verified_language::planning::check(&module, &package)?;
        if cmd == "plan-work" {
            // Reference-interpreter work of the plan's checked selected module
            // on one call. Machine independent and deterministic; it measures
            // semantic work only, so representation and physical choices that
            // keep the selected module unchanged report the baseline's work.
            // CALLS.json: [{"function": name, "args": [...]}, ...], at most 512.
            let calls = args.get(3).ok_or("plan-work requires CALLS.json")?;
            let selected = checked.module().program();
            let json: serde_json::Value = serde_json::from_slice(&read_bounded(calls, 64_000_000)?)
                .map_err(|e| e.to_string())?;
            let rows = json.as_array().ok_or("calls must be a JSON array")?;
            if rows.is_empty() || rows.len() > 512 {
                return Err("plan-work takes 1..512 calls".into());
            }
            let mut fuels = vec![];
            let mut values = vec![];
            for row in rows {
                let name = row["function"].as_str().ok_or("call needs a function name")?;
                let vals = row["args"].as_array().ok_or("call needs an argument array")?;
                let f = selected
                    .functions
                    .iter()
                    .find(|f| f.name == name)
                    .ok_or("function not found")?;
                if vals.len() != f.params.len() {
                    return Err("argument count mismatch".into());
                }
                let vs = vals
                    .iter()
                    .zip(&f.params)
                    .map(|(v, (_, t))| eval::Value::from_program_json(v, t, selected))
                    .collect::<LangResult<Vec<_>>>()?;
                let limit = 4_000_000_000u64;
                let mut fuel = limit;
                values.push(eval::call(selected, name, vs, &mut fuel)?.json());
                fuels.push((limit - fuel).to_string());
            }
            println!(
                "{}",
                serde_json::json!({"status":"checked","semantics":"ink-reference-work-v1","input":module.identity()?,
                "selected":checked.module().identity()?,"plan_sha256":verified_language::registry::identity(checked.package())?,
                "fuel":fuels,"values":values,
                "scope":"Reference interpreter fuel of the checked selected module per call; not a target timing"})
            );
            return Ok(());
        }
        let state = planning_state(&checked)?;
        if let Some(out) = arg_value(&args, "--state-out")? {
            write(
                &out,
                &serde_json::to_string(&state).map_err(|e| e.to_string())?,
            )?;
        }
        if cmd == "check-plan" {
            if let Some(target) = arg_value(&args, "--target")? {
                planning_capability(&checked, &target)?;
            }
        }
        if cmd == "emit-plan" {
            let out = arg_value(&args, "-o")?.ok_or("emit-plan requires -o OUTPUT")?;
            let target = arg_value(&args, "--target")?.unwrap_or_else(|| "rust".into());
            verified_language::compiled_plans::emit(&checked, &target, Path::new(&out))?;
        }
        println!(
            "{}",
            serde_json::json!({"status":"checked","input":module.identity()?,"selected":checked.module().identity()?,
            "steps":checked.package().steps.len(),"plan_sha256":verified_language::registry::identity(checked.package())?,"state":state})
        );
        return Ok(());
    }
    let semantic_selection = prepare_selection(&args, &p)?;
    if let Some(selected) = &semantic_selection {
        p = selected.module().program().clone();
    }
    match cmd {
        "explain" => {
            let input = input_module.as_ref().unwrap();
            let selected = core::CheckedModule::from_source(p.clone())?;
            let subject = verified_language::optimisation::subject(input)?;
            let checkpoint = match &semantic_selection {
                Some(plan) => verified_language::snapshot::selected_layout(plan),
                None => verified_language::snapshot::layout(&p),
            }
            .map(|layout| {
                serde_json::json!({
                    "program":layout.program.iter().map(|b| format!("{b:02x}")).collect::<String>(),
                    "schema":layout.schema.iter().map(|b| format!("{b:02x}")).collect::<String>(),
                    "roots":layout.roots.iter().map(|r| &r.0).collect::<Vec<_>>(),
                    "events":layout.events.iter().map(|e| &e.0).collect::<Vec<_>>()
                })
            });
            println!("{}", serde_json::to_string_pretty(&serde_json::json!({
                "schema":1,"module":p.module,"semantics":selected.semantics(),
                "input_core_sha256":input.identity()?,"selected_core_sha256":selected.identity()?,
                "selection":semantic_selection.as_ref().map(|s| s.evidence()),
                "applications":semantic_selection.as_ref().map(|s| &s.package().applications),
                "whole_action_selection":semantic_selection.as_ref().and_then(|s| s.package().action_replacement.as_ref()).map(|r| serde_json::json!({
                    "semantics":verified_language::action_model::SEMANTICS,
                    "actions":r.proofs.keys().collect::<Vec<_>>(),
                    "scope":"Equal complete projected source transitions; fixed projection, codecs and native emission remain trusted. See the selection artifact for proof terms."
                })),
                "eligible_regions":subject.functions.keys().collect::<Vec<_>>(),"unavailable_regions":subject.unavailable,
                "functions":p.functions.iter().map(|f| serde_json::json!({"name":f.name,"params":f.params,"result":f.result})).collect::<Vec<_>>(),
                "actions":p.actions.iter().map(|a| serde_json::json!({"name":a.name,"kind":a.kind,"params":a.params,"result":a.result,"reads":a.reads,"writes":a.writes,"emits":a.emits})).collect::<Vec<_>>(),
                "checkpoint":match checkpoint {Ok(v)=>v,Err(e)=>serde_json::json!({"unavailable":e})},
                "trust":["Rust checker and source/primitive correspondence","target emission and toolchains","runtime adapters and device drivers"],
                "scope":"Checked source and selection inspection. This command neither executes actions nor proves generated machine code."
            })).map_err(|e| e.to_string())?);
        }
        "check-action-values" | "emit-action-values" => {
            let module = core::CheckedModule::from_source(p)?;
            let actions = verified_language::action_ir::CheckedActions::elaborate(&module)?;
            let file = arg_value(&args, "--syntax-roles")?
                .ok_or("action values require --syntax-roles SYNTAX.json")?;
            let syntax =
                serde_json::from_slice(&read_bounded(&file, 16_384)?).map_err(|e| e.to_string())?;
            let file = arg_value(&args, "--value-roles")?
                .ok_or("action values require --value-roles VALUES.json")?;
            let roles =
                serde_json::from_slice(&read_bounded(&file, 16_384)?).map_err(|e| e.to_string())?;
            let file =
                arg_value(&args, "--view")?.ok_or("action values require --view VIEW.json")?;
            let view = serde_json::from_slice(&read_bounded(
                &file,
                verified_language::registry::MAX_VIEW_BYTES,
            )?)
            .map_err(|e| e.to_string())?;
            let codec = verified_language::action_values::ActionValues::bind(
                &actions, &view, &syntax, &roles,
            )?;
            if cmd == "emit-action-values" {
                let name = args.get(2).ok_or("missing action name")?;
                let file = args.get(3).ok_or("missing ARGS.json")?;
                let raw: serde_json::Value =
                    serde_json::from_slice(&read_bounded(file, 1_048_576)?)
                        .map_err(|e| e.to_string())?;
                let raw = raw.as_array().ok_or("expected argument array")?;
                let action = module
                    .program()
                    .actions
                    .iter()
                    .find(|a| a.name == *name)
                    .ok_or("unknown bound source action")?;
                if raw.len() != action.params.len() {
                    return Err("action argument count mismatch".into());
                }
                let values = action
                    .params
                    .iter()
                    .zip(raw)
                    .map(|((_, ty), v)| {
                        verified_language::stateful::Value::from_json(v, ty, module.program())
                    })
                    .collect::<LangResult<Vec<_>>>()?;
                let terms = codec.encode_arguments(name, &values, Default::default())?;
                let out =
                    arg_value(&args, "-o")?.ok_or("emit-action-values requires -o IMAGE.json")?;
                write(
                    &out,
                    &serde_json::to_string_pretty(&serde_json::json!({
                        "schema":1,"semantics":verified_language::action_values::SEMANTICS,
                        "source":actions.source_identity(),"actions":actions.identity()?,
                        "action":name,"arguments":terms
                    }))
                    .map_err(|e| e.to_string())?,
                )?;
            }
            println!(
                "{}",
                serde_json::json!({"status":"checked",
                "semantics":verified_language::action_values::SEMANTICS,
                "source":actions.source_identity(),"actions":actions.identity()?,
                "trust":"Exact code and typed value data only; codecs remain trusted. No interpreter refinement or replacement authority."})
            );
        }
        "emit-source-syntax" | "check-source-syntax" => {
            let module = core::CheckedModule::from_source(p)?;
            let actions = verified_language::action_ir::CheckedActions::elaborate(&module)?;
            let file =
                arg_value(&args, "--roles")?.ok_or("source syntax requires --roles ROLES.json")?;
            let roles: verified_language::source_syntax::Roles =
                serde_json::from_slice(&read_bounded(&file, 16_384)?).map_err(|e| e.to_string())?;
            if cmd == "emit-source-syntax" {
                let declarations = verified_language::source_syntax::grammar(&roles);
                let program = verified_language::source_syntax::definition(&actions, &roles)?;
                let out = arg_value(&args, "-o")?
                    .ok_or("emit-source-syntax requires -o EXPECTED.json")?;
                write(
                    &out,
                    &serde_json::to_string_pretty(&serde_json::json!({
                        "schema":1,"semantics":verified_language::source_syntax::SEMANTICS,
                        "source":actions.source_identity(),"actions":actions.identity()?,
                        "grammar":declarations,"program":program
                    }))
                    .map_err(|e| e.to_string())?,
                )?;
            } else {
                let file = arg_value(&args, "--view")?
                    .ok_or("check-source-syntax requires --view VIEW.json")?;
                let bundle: verified_language::registry::Bundle = serde_json::from_slice(
                    &read_bounded(&file, verified_language::registry::MAX_VIEW_BYTES)?,
                )
                .map_err(|e| e.to_string())?;
                verified_language::source_syntax::BoundSyntax::bind(&actions, &bundle, &roles)?;
            }
            println!(
                "{}",
                serde_json::json!({"status":"checked",
                "semantics":verified_language::source_syntax::SEMANTICS,
                "source":actions.source_identity(),"actions":actions.identity()?,
                "trust":"Exact complete code-data binding only. Source checking, elaboration and codecs remain trusted; no interpreter refinement or replacement authority."})
            );
        }
        "emit-semantic" => {
            let module = core::CheckedModule::from_source(p)?;
            let out = arg_value(&args, "-o")?.ok_or("emit-semantic requires -o SUBJECT.json")?;
            write(
                &out,
                &serde_json::to_string_pretty(&verified_language::optimisation::subject(&module)?)
                    .map_err(|e| e.to_string())?,
            )?;
        }
        "check-representation"
        | "check-migration"
        | "emit-representation"
        | "execute-representation" => {
            verified_language::representations::run(
                cmd,
                core::CheckedModule::from_source(p)?,
                &args,
            )?;
        }
        "emit-action-model" => {
            let module = core::CheckedModule::from_source(p)?;
            let model = verified_language::action_model::Projection::derive(&module)?;
            let out = arg_value(&args, "-o")?.ok_or("emit-action-model requires -o MODEL.json")?;
            write(
                &out,
                &serde_json::to_string_pretty(&model).map_err(|e| e.to_string())?,
            )?;
            // Derived sortedness predicates, for producers that prove the
            // invariant; the checker recomputes them and grants nothing here.
            if let Some(path) = arg_value(&args, "--sorted-tables")? {
                write(
                    &path,
                    &serde_json::to_string_pretty(&model.sorted_tables()?)
                        .map_err(|e| e.to_string())?,
                )?;
            }
            println!(
                "{}",
                serde_json::json!({"status":"projected", "semantics":verified_language::action_model::SEMANTICS,
                "source":module.identity()?, "trust":"Checked source-to-transition projection; native lowering and host execution remain trusted."})
            );
        }
        "emit-actions" | "check-actions" => {
            let module = core::CheckedModule::from_source(p)?;
            let actions = if cmd == "check-actions" {
                let file = args
                    .get(2)
                    .ok_or("check-actions requires SOURCE ACTIONS.json")?;
                let mut bytes = Vec::new();
                fs::File::open(file)
                    .map_err(|e| e.to_string())?
                    .take(core::MAX_BYTES as u64 + 1)
                    .read_to_end(&mut bytes)
                    .map_err(|e| e.to_string())?;
                verified_language::action_ir::CheckedActions::from_bytes(&module, &bytes)?
            } else {
                verified_language::action_ir::CheckedActions::elaborate(&module)?
            };
            if cmd == "emit-actions" {
                let out = arg_value(&args, "-o")?.ok_or("emit-actions requires -o ACTIONS.json")?;
                write(
                    &out,
                    &String::from_utf8(actions.bytes()?).map_err(|e| e.to_string())?,
                )?;
            }
            println!(
                "{}",
                serde_json::json!({"status":"checked","semantics":verified_language::action_ir::SEMANTICS,"source":actions.source_identity(),"actions_sha256":actions.identity()?,"trust":"Source checking, typed elaboration and execution adapters remain trusted; no action-body refinement proof"})
            );
        }
        "emit-sum-codecs" => {
            let module=core::CheckedModule::from_source(p)?;
            let mut schemas=Vec::new();
            for ty in verified_language::sum_codec::source_types(&module)? {
                if let Ok(schema)=verified_language::sum_codec::schema(&module,&ty) { schemas.push(schema); }
            }
            let out=arg_value(&args,"-o")?.ok_or("emit-sum-codecs requires -o")?;
            write(&out,&serde_json::to_string(&schemas).map_err(|e|e.to_string())?)?;
            println!("{}",serde_json::json!({"status":"codec-semantics","sums":schemas.len()}));
        }
        "check-sum-codec" => {
            let module=core::CheckedModule::from_source(p)?;
            let path=args.get(2).ok_or("check-sum-codec requires LAYOUT.json")?;
            let layout=serde_json::from_slice(&read_bounded(path,verified_language::registry::MAX_VIEW_BYTES)?).map_err(|e|e.to_string())?;
            verified_language::sum_codec::check(&module,&layout)?;
            println!("{}",serde_json::json!({"status":"checked","source":module.identity()?}));
        }
        "emit-record-codec" => {
            let record=arg_value(&args,"--entry")?.ok_or("emit-record-codec requires --entry RECORD")?;
            let module=core::CheckedModule::from_source(p)?;
            let schema=verified_language::record_codec::schema(&module,&record)?;
            let out=arg_value(&args,"-o")?.ok_or("emit-record-codec requires -o")?;
            write(&out,&serde_json::to_string(&schema).map_err(|e|e.to_string())?)?;
            println!("{}",serde_json::json!({"status":"codec-semantics","field":schema.field}));
        }
        "emit-column-codec" => {
            let record=arg_value(&args,"--entry")?.ok_or("emit-column-codec requires --entry RECORD")?;
            let schema=verified_language::column_codec::schema(&p,&record)?;
            let out=arg_value(&args,"-o")?.ok_or("emit-column-codec requires -o")?;
            write(&out,&serde_json::to_string(&schema).map_err(|e|e.to_string())?)?;
            println!("{}",serde_json::json!({"status":"codec-semantics","fields":schema.fields.len()}));
        }
        "emit-bounds-obligations" => {
            let module=core::CheckedModule::from_source(p)?;
            let goals=verified_language::bounds::obligations(&module)?;
            let out=arg_value(&args,"-o")?.ok_or("emit-bounds-obligations requires -o")?;
            write(&out,&serde_json::to_string(&serde_json::json!({"schema":1,"semantics":verified_language::bounds::SEMANTICS,"source":module.identity()?,"map_obligations":verified_language::bounds::map_obligations(&module)?,"obligations":goals})).map_err(|e|e.to_string())?)?;
            println!("{}",serde_json::json!({"status":"source-bound","sites":goals.len()}));
        }
        "emit-access" | "check-access" => {
            let module = core::CheckedModule::from_source(p)?;
            let actions = verified_language::action_ir::CheckedActions::elaborate(&module)?;
            let access = if cmd == "check-access" {
                let file = args
                    .get(2)
                    .ok_or("check-access requires SOURCE ACCESS.json")?;
                let mut bytes = Vec::new();
                fs::File::open(file)
                    .map_err(|e| e.to_string())?
                    .take(core::MAX_BYTES as u64 + 1)
                    .read_to_end(&mut bytes)
                    .map_err(|e| e.to_string())?;
                verified_language::access::CheckedAccess::from_bytes(&actions, &bytes)?
            } else {
                verified_language::access::CheckedAccess::derive(&actions)?
            };
            if cmd == "emit-access" {
                let out = arg_value(&args, "-o")?.ok_or("emit-access requires -o ACCESS.json")?;
                write(
                    &out,
                    &String::from_utf8(access.bytes()?).map_err(|e| e.to_string())?,
                )?;
            }
            println!("{}", serde_json::json!({"status":"checked",
                "semantics":verified_language::access::SEMANTICS,
                "source":access.source_identity(), "actions_sha256":access.actions_identity(),
                "trust":"Conservative source-bound point accesses. No cache-retention, replacement or scheduling authority."}));
        }
        "emit-effects" | "check-effects" => {
            let module = core::CheckedModule::from_source(p)?;
            let actions = verified_language::action_ir::CheckedActions::elaborate(&module)?;
            let effects = if cmd == "check-effects" {
                let file = args
                    .get(2)
                    .ok_or("check-effects requires SOURCE EFFECTS.json")?;
                let mut bytes = Vec::new();
                fs::File::open(file)
                    .map_err(|e| e.to_string())?
                    .take(core::MAX_BYTES as u64 + 1)
                    .read_to_end(&mut bytes)
                    .map_err(|e| e.to_string())?;
                verified_language::effects::CheckedEffects::from_bytes(&actions, &bytes)?
            } else {
                verified_language::effects::CheckedEffects::derive(&actions)?
            };
            if cmd == "emit-effects" {
                let out = arg_value(&args, "-o")?.ok_or("emit-effects requires -o EFFECTS.json")?;
                write(
                    &out,
                    &String::from_utf8(effects.bytes()?).map_err(|e| e.to_string())?,
                )?;
            }
            println!(
                "{}",
                serde_json::json!({"status":"checked", "semantics":verified_language::effects::SEMANTICS,
                "source":effects.source_identity(), "actions_sha256":effects.actions_identity(), "effects_sha256":effects.identity()?,
                "trust":"Conservative source-body effects from trusted checking. Not a whole-action refinement proof or replacement authority"})
            );
        }
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
                serde_json::json!({"status":"checked", "semantics":module.semantics(),
                "core_sha256":module.identity()?, "functions":module.program().functions.len(),
                "actions":module.program().actions.len(), "trust":"Rust structural/type/effect checks; no proof of checker or backend correctness"})
            );
        }
        "emit-state" => {
            let out = arg_value(&args, "-o")?.ok_or("emit-state requires -o DIRECTORY")?;
            let wasm_abi = args.iter().any(|s| s == "--wasm-abi");
            let mut code = emit_state_rust(&p, semantic_selection.as_ref(), &args)?;
            if wasm_abi {
                code.push_str(state_native::WASM_ABI);
            }
            code.push_str(verified_language::runtime::NATIVE_STATE_ADAPTER);
            verified_language::runtime::emit_native_state_host(Path::new(&out))?;
            write(&format!("{out}/src/lib.rs"), &code)?;
            write(
                &format!("{out}/src/main.rs"),
                verified_language::runtime::COMPLETE_STATE_RUNNER,
            )?;
            write(&format!("{out}/Cargo.toml"), "[package]\nname = \"compiled-state\"\nversion = \"0.1.0\"\nedition = \"2021\"\n[lib]\ncrate-type = [\"rlib\", \"cdylib\"]\n[dependencies]\nnum-bigint = \"=0.4.8\"\nsha2 = \"=0.10.9\"\nserde_json = {version=\"=1.0.151\",features=[\"float_roundtrip\"]}\n[profile.release]\nlto = \"thin\"\ncodegen-units = 1\n")?;
            let plan = serde_json::json!({"schema":1,"core_sha256":core::CheckedModule::from_source(p.clone())?.identity()?,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"trust":["source checking","literal typed Rust lowering","primitive support","Rust/LLVM"]});
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
                if let Some(selected) = &semantic_selection {
                    if bytes.starts_with(b"VLSTATE\0") {
                        stateful::Runtime::restore_portable_selected(selected, &bytes)?
                    } else {
                        stateful::Runtime::restore_selected(selected, &bytes)?
                    }
                } else if bytes.starts_with(b"VLSTATE\0") {
                    stateful::Runtime::restore_portable(p.clone(), &bytes)?
                } else {
                    stateful::Runtime::restore(p.clone(), &bytes)?
                }
            } else if let Some(selected) = &semantic_selection {
                stateful::Runtime::new_selected(selected)?
            } else {
                stateful::Runtime::new(p.clone())?
            };

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
        "build" | "emit-rust" => {
            let input_core = core::CheckedModule::from_source(p.clone())?;

            let input_core_sha256 = semantic_selection
                .as_ref()
                .map(|s| s.evidence().input_core_sha256.clone())
                .unwrap_or(input_core.identity()?);
            let input_program_sha256 = source_program_sha256.clone();
            let replacement = arg_value(&args, "--replacement")?
                .map(|path| {
                    verified_language::implementation::apply_replacement(&mut p, Path::new(&path))
                })
                .transpose()?;
            let implementation = arg_value(&args, "--implementation")?
                .map(|path| verified_language::implementation::apply(&mut p, Path::new(&path)))
                .transpose()?;
            let used: Vec<String> = semantic_selection
                .as_ref()
                .map(|s| s.evidence().applied_laws.clone())
                .unwrap_or_default();
            let implementation_count = implementation
                .as_ref()
                .map_or(0, |e| e.checked_proposals.len())
                + replacement
                    .as_ref()
                    .map_or(0, |e| e.equality.checked_proposals.len());
            check::check(&p)?;
            if let Some(selected) = &semantic_selection {
                if core::CheckedModule::from_source(p.clone())?.identity()?
                    != selected.module().identity()?
                {
                    return Err("checked selection provenance cannot be reused after a separate implementation or replacement changes the program".into());
                }
            }
            let selected_core_sha256 = core::CheckedModule::from_source(p.clone())?.identity()?;
            let out = arg_value(&args, "-o")?.ok_or("build requires -o OUTPUT.o")?;
            let target = arg_value(&args, "--target")?.unwrap_or_else(|| "native".into());
            if cmd == "build"
                && !matches!(target.as_str(), "rust" | "native" | "wasm32")
                && arg_value(&args, "--table-storage")?.is_some()
            {
                return Err("--table-storage requires the Rust lowering".into());
            }
            if arg_value(&args, "--route-proof")?.is_some()
                && arg_value(&args, "--route")?.is_none()
            {
                return Err("--route-proof requires --route".into());
            }
            if arg_value(&args, "--route")?.is_some()
                && (cmd != "build" || !matches!(target.as_str(), "webgpu" | "gpu"))
            {
                return Err("explicit routes require the GPU bundle target".into());
            }
            if cmd == "build" && target != "object" && args.iter().any(|a| a == "--native-cpu") {
                return Err("--native-cpu requires the object target".into());
            }
            if cmd == "emit-rust" {
                let code = emit_state_rust(&p, semantic_selection.as_ref(), &args)?;
                write(&out, &code)?;
                return Ok(());
            }
            if cmd == "build" && target == "rust" {
                if arg_value(&args, "--route")?.is_some() {
                    return Err("explicit routes require the GPU bundle target".into());
                }
                verified_language::runtime::emit_rust_program(&emit_state_rust(&p, semantic_selection.as_ref(), &args)?,Path::new(&out))?;
                write(&format!("{out}/plan.json"),&serde_json::to_string_pretty(&serde_json::json!({"target":target,"table_storage":if target=="rust"{Some(arg_value(&args,"--table-storage")?.unwrap_or_else(||"ordered".into()))}else{None},"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"trust":"literal emission and target runtimes/toolchains remain trusted"})).map_err(|e|e.to_string())?)?;
                println!("wrote complete {target} project to {out}");
                return Ok(());
            }
            if cmd == "build" && matches!(target.as_str(), "native" | "wasm32") {
                if arg_value(&args, "--route")?.is_some() {
                    return Err("explicit routes require the GPU bundle target".into());
                }
                let project = std::path::PathBuf::from(format!("{out}.project"));
                let lowering = arg_value(&args,"--lowering")?.unwrap_or_else(||"rust".into());
                if lowering!="rust"{return Err("--lowering must be rust; the C backend has been removed".into());}
                verified_language::runtime::emit_rust_program(&emit_state_rust(&p,semantic_selection.as_ref(),&args)?,&project)?;
                let cargo = arg_value(&args, "--cargo")?
                    .or_else(|| std::env::var("INK_CARGO").ok())
                    .unwrap_or_else(|| "cargo".into());
                verified_language::runtime::toolchain::complete_program(
                    &project,
                    target == "wasm32",
                    Path::new(&out),
                    &cargo,
                    None,
                )?;
                write(&format!("{out}.plan.json"),&serde_json::to_string_pretty(&serde_json::json!({"target":target,"abi":verified_language::abi::VALUE_ABI,"artifact_kind":if target=="native"{"executable"}else{"wasm_module"},"lowering":lowering,"table_storage":if lowering=="rust"{Some(arg_value(&args,"--table-storage")?.unwrap_or_else(||"ordered".into()))}else{None},"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"trust":if lowering=="rust"{"literal typed Rust emission; Rust toolchain remains trusted"}else{"literal C emission and shared Rust primitive runtime; toolchains remain trusted"}})).map_err(|e|e.to_string())?)?;
                println!("wrote complete program to {out}");
                return Ok(());
            }
            let route = arg_value(&args, "--route")?
                .map(|file| {
                    let package = serde_json::from_slice::<
                        verified_language::source_routing::Package,
                    >(&read_bounded(&file, 16_000_000)?)
                    .map_err(|e| e.to_string())?;
                    let module = core::CheckedModule::from_source(p.clone())?;
                    if let Some(file) = arg_value(&args, "--route-proof")? {
                        let evidence = serde_json::from_slice::<
                            verified_language::source_routing::Equivalence,
                        >(&read_bounded(&file, 16_000_000)?)
                        .map_err(|e| e.to_string())?;
                        verified_language::source_routing::check_equivalent(
                            &module, &package, &evidence,
                        )
                    } else {
                        verified_language::source_routing::check(&module, &package)
                    }
                })
                .transpose()?;
            if route.is_none() && arg_value(&args, "--route-proof")?.is_some() {
                return Err("--route-proof requires --route".into());
            }
            if route.is_some() && (cmd != "build" || !matches!(target.as_str(), "webgpu" | "gpu")) {
                return Err("--route currently requires build --target webgpu or gpu".into());
            }
            if target == "javascript" {
                if cmd != "build" || args.iter().any(|a| a == "--native-cpu") {
                    return Err("JavaScript requires build --target javascript".into());
                }
                let module = core::CheckedModule::from_source(p.clone())?;
                let emission = if let Some(selected) = &semantic_selection {
                    verified_language::javascript::lower_selected(selected)?
                } else {
                    verified_language::javascript::lower(&module)?
                };
                write(&out, &emission.javascript)?;
                let plan = serde_json::json!({"source":path,"target":target,"backend":emission.manifest,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"trust":"checked transformations; JavaScript emission and engine remain trusted"});
                write(
                    &format!("{out}.plan.json"),
                    &serde_json::to_string_pretty(&plan).map_err(|e| e.to_string())?,
                )?;
                println!(
                    "wrote JavaScript module {out}; {} checked rule applications",
                    used.len()
                );
                return Ok(());
            }
            if target == "webgpu" || target == "gpu" {
                if args.iter().any(|a| a == "--native-cpu") {
                    return Err("--native-cpu is not a GPU bundle option".into());
                }
                if let Some(route) = &route {
                    verified_language::runtime::emit_routed(route, Path::new(&out))?;
                } else if let Some(selected) = &semantic_selection {
                    verified_language::runtime::emit_selected(selected, Path::new(&out))?;
                } else {
                    verified_language::runtime::emit_gpu(&p, Path::new(&out))?;
                }

                let manifest: serde_json::Value = serde_json::from_slice(
                    &fs::read(Path::new(&out).join("manifest.json")).map_err(|e| e.to_string())?,
                )
                .map_err(|e| e.to_string())?;
                if manifest["runtime_abi"] == "ink-module-v1" {
                    let cargo = arg_value(&args, "--cargo")?
                        .or_else(|| std::env::var("INK_CARGO").ok())
                        .unwrap_or_else(|| "cargo".into());
                    verified_language::runtime::toolchain::complete_program(
                        &Path::new(&out).join("cpu"),
                        true,
                        &Path::new(&out).join("cpu/compiled_state.wasm"),
                        &cargo,
                        None,
                    )?;
                    for f in manifest["functions"].as_array().unwrap() {
                        if let Some(folder) = f["bundle"].as_str() {
                            let dir = Path::new(&out).join(folder);
                            let module = core::CheckedModule::from_bytes(
                                &fs::read(dir.join("core.json")).map_err(|e| e.to_string())?,
                            )?;
                            verified_language::runtime::toolchain::wasm_with_abi(
                                &module,
                                &dir.join("cpu"),
                                &dir.join("cpu.wasm"),
                                "cargo",
                                verified_language::runtime::uses_packed_compute(module.program()),
                            )?;
                        }
                    }
                } else {
                    verified_language::runtime::toolchain::wasm_with_abi(
                        &core::CheckedModule::from_source(p.clone())?,
                        &Path::new(&out).join("cpu"),
                        &Path::new(&out).join("cpu.wasm"),
                        "cargo",
                        verified_language::runtime::uses_packed_compute(&p),
                    )?;
                }
                let plan = serde_json::json!({"source":path,"target":target,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"database_lock":serde_json::Value::Null,"database_closure":serde_json::Value::Null,"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"checked_source_route":route.as_ref().map(|r|r.package()),"source_route_equivalence":route.as_ref().and_then(|r|r.equivalence()),"trust":"GPU backend and physical routing remain trusted; see manifest.json"});
                write(
                    &format!("{out}/plan.json"),
                    &serde_json::to_string_pretty(&plan).map_err(|e| e.to_string())?,
                )?;
                if route.is_some() {
                    println!("wrote checked source graph, Wasm/WebGPU and native Rust/wgpu hosts to {out}; placements supplied externally, GPU failures retain compiled CPU fallback");
                } else {
                    println!("wrote WebGPU/Wasm bundle and native wgpu project to {out}; GPU selection is measured by the host runtime");
                }
                return Ok(());
            }
            return Err(format!("unsupported target {target}"));
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
