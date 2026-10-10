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
    Ok(verified_language::modules::load(path)?.program)
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
fn prove_views(
    args: &[String],
    p: &syntax::Program,
    certificate: &aggregate::Certificate,
    out: Option<&str>,
) -> LangResult<Vec<serde_json::Value>> {
    let tool = if let Some(path) = arg_value(args, "--view-tool")? {
        std::path::PathBuf::from(path)
    } else {
        verified_language::distribution::resource("knowledge/producers/view_decomposition.py")?
    };
    let temp = env::temp_dir().join(format!(
        "ink-views-{}-{}",
        std::process::id(),
        std::time::SystemTime::now()
            .duration_since(std::time::UNIX_EPOCH)
            .map_err(|e| e.to_string())?
            .as_nanos()
    ));
    fs::create_dir(&temp).map_err(|e| e.to_string())?;
    let result = (|| {
        let mut checked = vec![];
        for keep in &p.keeps {
            if aggregate::plan_with_certificate(p, keep, certificate).is_none() {
                continue;
            }
            let name = &keep.name;
            let fail = |e: String| {
                format!("maintained keep {name}: view decomposition not established: {e}")
            };
            let view =
                verified_language::row_model::export_view(p, name, certificate).map_err(fail)?;
            let input = temp.join(format!("{name}.view.json"));
            let output = temp.join(format!("{name}.evidence.json"));
            fs::write(
                &input,
                serde_json::to_vec(&view).map_err(|e| e.to_string())?,
            )
            .map_err(|e| e.to_string())?;
            let python = arg_value(args, "--python")?.unwrap_or_else(|| "python3".into());
            let run = Command::new(&python)
                .arg(&tool)
                .arg(&input)
                .arg("-o")
                .arg(&output)
                .output()
                .map_err(|e| {
                    fail(format!(
                        "cannot start {python} for {}: {e}; use --python PATH",
                        tool.display()
                    ))
                })?;
            if !run.status.success() {
                return Err(fail(
                    String::from_utf8_lossy(&run.stderr).trim().to_string(),
                ));
            }
            let bytes = read_bounded(&output.to_string_lossy(), 16_000_000)?;
            let evidence: verified_language::row_model::ViewEvidence =
                serde_json::from_slice(&bytes).map_err(|e| fail(e.to_string()))?;
            if &evidence.keep != name {
                return Err(fail("producer answered for a different keep".into()));
            }
            let description = verified_language::row_model::verify_view(p, certificate, &evidence)
                .map_err(fail)?;
            if let Some(out) = out {
                write(
                    &format!("{out}/views/{name}.evidence.json"),
                    &String::from_utf8_lossy(&bytes),
                )?;
            }
            checked.push(serde_json::json!({
                "keep": name,
                "aggregate": description.aggregate,
                "stages": description.stages.iter().map(|s| &s.kind).collect::<Vec<_>>(),
                "pipeline": description.pipeline,
                "decomposed": description.decomposed,
                "evidence_sha256": format!("{:x}", Sha256::digest(&bytes)),
            }));
        }
        Ok(checked)
    })();
    let _ = fs::remove_dir_all(&temp);
    result
}
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
            let budget = arg_value(args, "--search-budget")?.unwrap_or_else(|| "128".into());
            let python = arg_value(args, "--python")?.unwrap_or_else(|| "python3".into());
            let result = Command::new(&python)
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
                .arg(&output)
                .output()
                .map_err(|e| {
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
fn run() -> LangResult<()> {
    let args: Vec<String> = env::args().skip(1).collect();
    let cmd = args.first().map(String::as_str).unwrap_or("help");
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
    if cmd == "selection-session" {
        if args.len() != 3 {
            return Err("selection-session requires CORE.json VIEW.json".into());
        }
        let module = core::CheckedModule::from_bytes(&read_bounded(&args[1], core::MAX_BYTES)?)?;
        let catalogue = serde_json::from_slice(&read_bounded(&args[2], 16_000_000)?)
            .map_err(|e| e.to_string())?;
        let checker = verified_language::optimisation::SelectionChecker::new(module, catalogue)?;
        use std::io::{BufRead, Write};
        let stdin = std::io::stdin();
        let mut reader = stdin.lock();
        println!("{}", serde_json::json!({"ready":true}));
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
        let bundle: verified_language::registry::Bundle =
            serde_json::from_slice(&read_bounded(&args[2], 16_000_000)?)
                .map_err(|e| e.to_string())?;
        let checked = verified_language::registry::CheckedBundle::check(&bundle)?;
        let entries = checked.verify(module.program())?;
        println!(
            "{}",
            serde_json::json!({"status":"checked","snapshot_sha256":checked.snapshot_id(),"entries":entries})
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
    if cmd == "model-view" || cmd == "verify-view" {
        let p = source(args.get(1).ok_or("view model requires SOURCE")?)?;
        let cert_path = arg_value(&args, "--maintenance")?.ok_or("missing --maintenance")?;
        let cert: aggregate::Certificate =
            serde_json::from_slice(&read_bounded(&cert_path, 4_000_000)?)
                .map_err(|e| e.to_string())?;
        if cmd == "model-view" {
            let keep = args.get(2).ok_or("model-view requires KEEP")?;
            let model = verified_language::row_model::export_view(&p, keep, &cert)?;
            let output = arg_value(&args, "-o")?.ok_or("missing -o")?;
            write(
                &output,
                &serde_json::to_string_pretty(&model).map_err(|e| e.to_string())?,
            )?;
            println!("wrote {output}; obligation: pipeline(rows) = sum of row projections");
        } else {
            let path = args.get(2).ok_or("verify-view requires EVIDENCE.json")?;
            let evidence = serde_json::from_slice(&read_bounded(path, 16_000_000)?)
                .map_err(|e| e.to_string())?;
            let checked = verified_language::row_model::verify_view(&p, &cert, &evidence)?;
            println!(
                "verified {} view decomposition for keep {} ({} stages); table enumeration and native lowering remain separate",
                checked.aggregate,
                checked.row.keep,
                checked.stages.len()
            );
        }
        return Ok(());
    }
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
        println!("ink --version\nink doctor [--python PATH]\nink explain SOURCE [--core] [--selection PACKAGE.json | --optimise SNAPSHOT.json]\nink modules SOURCE");
        println!("ink emit-semantic SOURCE [--core] -o SUBJECT.json\nink check-selection CORE.json PACKAGE.json\nExecution, lowering and core emission accept --optimise KNOWLEDGE_DIRECTORY or SNAPSHOT.json (external search) or --selection PACKAGE.json (checked replay). Optional --search-tool PATH, --search-budget N and --python PATH. INK_DISTRIBUTION locates an optional installed tool bundle.");
        println!("ink check-source-route CORE.json ROUTING.json\nink emit-action-model SOURCE -o MODEL.json (restricted whole-action transition projection)");
        println!("ink emit-source-syntax SOURCE --roles ROLES.json -o EXPECTED.json\nink check-source-syntax SOURCE --roles ROLES.json --view VIEW.json (complete code-data binding only)");
        println!("ink check-action-values SOURCE --syntax-roles SYNTAX.json --value-roles VALUES.json --view VIEW.json\nink emit-action-values SOURCE ACTION ARGS.json --syntax-roles SYNTAX.json --value-roles VALUES.json --view VIEW.json -o IMAGE.json (typed value data only)");
        println!("ink emit-machine LOCK.json PACKAGE.json -o SOURCE.rs");
        println!(
            "ink emit-definition LOCK.json EXPORTS.json [--select PACKAGE.json] -o DEFINITION.rs"
        );
        println!("ink emit-core SOURCE -o CORE.json\nink check-core CORE.json\nink emit-actions SOURCE -o ACTIONS.json\nink check-actions SOURCE ACTIONS.json\nink emit-effects SOURCE -o EFFECTS.json\nink check-effects SOURCE EFFECTS.json\nExecution/lowering commands also accept --core to read a checked CORE.json instead of source.\nChecked replacement packages: build/emit-c ... --replacement PACKAGE.json");
        println!("ink bitvector-obligation GOAL.json [--library LOCK.json] -o CNF.json\nink verify-library LOCK.json\nink project-library LOCK.json ROOTS.json -o BUNDLE.json\nink model-row SOURCE KEEP --maintenance PACKAGE.json -o MODEL.json\nink model-view SOURCE KEEP --maintenance PACKAGE.json -o VIEW.json\nink verify-view SOURCE EVIDENCE.json --maintenance PACKAGE.json\nink verify-row-model SOURCE MODEL.json --maintenance PACKAGE.json\nink verify-database LOCK.json\nink check SOURCE\nink prove-maintenance SOURCE [--evidence EVIDENCE.json] -o PACKAGE.json\nink verify-maintenance PACKAGE.json\nink execute SOURCE SCRIPT.json [--maintenance PACKAGE.json] [--restore SNAPSHOT] [--snapshot-out SNAPSHOT] [--portable]\nink run SOURCE FUNCTION ARGS.json\nink build SOURCE -o EXECUTABLE [--cargo cargo]\nink build SOURCE --target object -o OUTPUT.o [--implementation PROPOSAL.json] [--cc clang] [--native-cpu]\nink build SOURCE --target c -o PROJECT\nink build SOURCE --target rust -o PROJECT\nink build SOURCE --target javascript -o OUTPUT.mjs\nink build SOURCE --target wasm32 --zig PATH -o OUTPUT.wasm\nink build SOURCE --target webgpu --zig PATH [--route PACKAGE.json] -o DIRECTORY (also emits native wgpu crate)\nink emit-c SOURCE -o OUTPUT.c [--implementation PROPOSAL.json]\nink emit-state SOURCE -o DIRECTORY [--maintenance PACKAGE.json [--prove-views|--require-views [--view-tool PATH]]] [--bounded-totals] [--wasm-abi]");

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
    let source_program_sha256 = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(&p).map_err(|e| e.to_string())?)
    );
    let input_module = if cmd == "explain" {
        Some(core::CheckedModule::from_source(p.clone())?)
    } else {
        None
    };
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
            let view = serde_json::from_slice(&read_bounded(&file, 16_000_000)?)
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
                let bundle: verified_language::registry::Bundle =
                    serde_json::from_slice(&read_bounded(&file, 16_000_000)?)
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
        "emit-action-model" => {
            let module = core::CheckedModule::from_source(p)?;
            let model = verified_language::action_model::Projection::derive(&module)?;
            let out = arg_value(&args, "-o")?.ok_or("emit-action-model requires -o MODEL.json")?;
            write(
                &out,
                &serde_json::to_string_pretty(&model).map_err(|e| e.to_string())?,
            )?;
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
            // Checked view decompositions. Without a proof for every maintained
            // keep, fall back explicitly to the recomputing baseline (or fail
            // with --require-views); never rely on an unchecked decomposition.
            let require_views = args.iter().any(|s| s == "--require-views");
            let mut view_fallback = None;
            let views = if require_views || args.iter().any(|s| s == "--prove-views") {
                let checked_certificate = certificate
                    .as_ref()
                    .ok_or("--prove-views requires a verified --maintenance package")?;
                match prove_views(&args, &p, checked_certificate, Some(&out)) {
                    Ok(views) => Some(views),
                    Err(e) if !require_views => {
                        eprintln!(
                            "warning: {e}; emitting the recomputing baseline without maintenance"
                        );
                        view_fallback = Some(e);
                        Some(vec![])
                    }
                    Err(e) => return Err(e),
                }
            } else {
                None
            };
            let certificate = if view_fallback.is_some() {
                None
            } else {
                certificate
            };
            let bounded = bounded && view_fallback.is_none();
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
            let mut code = if let Some(selected) = &semantic_selection {
                state_native::emit_selected_with_storage(
                    selected,
                    certificate.as_ref(),
                    bounded,
                    storage.as_ref().map(|s| &s.0),
                )?
            } else {
                state_native::emit_with_storage(
                    &p,
                    certificate.as_ref(),
                    bounded,
                    storage.as_ref().map(|s| &s.0),
                )?
            };
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
            plan["semantic_selection"] =
                serde_json::to_value(semantic_selection.as_ref().map(|s| s.evidence()))
                    .map_err(|e| e.to_string())?;
            plan["semantic_package"] =
                serde_json::to_value(semantic_selection.as_ref().map(|s| s.package()))
                    .map_err(|e| e.to_string())?;
            plan["storage_policy"] =
                serde_json::to_value(storage.as_ref().map(|s| &s.0)).map_err(|e| e.to_string())?;
            plan["storage_policy_sha256"] =
                serde_json::to_value(storage.as_ref().map(|s| &s.1)).map_err(|e| e.to_string())?;
            if let Some(reason) = &view_fallback {
                plan["view_fallback"] =
                    serde_json::json!({"baseline":"recomputation; no maintenance","reason":reason});
            } else if let Some(views) = &views {
                plan["view_decompositions"] = serde_json::json!(views);
                plan["trusted"] = serde_json::json!([
                    "frontend",
                    "stored table enumerated as the logical row list",
                    "native contribution lowering and transactional cache protocol",
                    "finite-domain range analysis",
                    "modular representation lowering",
                    "typed Rust lowering",
                    "num-bigint",
                    "Rust/LLVM backend"
                ]);
                plan["view_authority"] = serde_json::json!("each maintained keep's sum/count pipeline is checked equal to the sum of its row projections by the general kernel; the proof is externally produced");
            }
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
        "build" | "emit-c" | "emit-c-project" | "emit-rust" => {
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
            if cmd == "emit-c-project" {
                if let Some(selected) = &semantic_selection {
                    verified_language::runtime::emit_c_program_selected(selected, Path::new(&out))?;
                } else {
                    verified_language::runtime::emit_c_program(
                        &core::CheckedModule::from_source(p.clone())?,
                        Path::new(&out),
                    )?;
                }
                println!("wrote complete C program and primitive runtime to {out}");
                return Ok(());
            }
            if cmd == "emit-rust" {
                let code = if let Some(selected) = &semantic_selection {
                    state_native::emit_selected(selected, None)?
                } else {
                    state_native::emit(&p, None)?
                };
                write(&out, &code)?;
                return Ok(());
            }
            if cmd == "build" && matches!(target.as_str(), "c" | "rust") {
                if arg_value(&args, "--route")?.is_some() {
                    return Err("explicit routes require the GPU bundle target".into());
                }
                let module = core::CheckedModule::from_source(p.clone())?;
                if target == "c" {
                    if let Some(selected) = &semantic_selection {
                        verified_language::runtime::emit_c_program_selected(
                            selected,
                            Path::new(&out),
                        )?;
                    } else {
                        verified_language::runtime::emit_c_program(&module, Path::new(&out))?;
                    }
                } else {
                    verified_language::runtime::emit_rust_program(
                        &if let Some(selected) = &semantic_selection {
                            state_native::emit_selected(selected, None)?
                        } else {
                            state_native::emit(&p, None)?
                        },
                        Path::new(&out),
                    )?;
                }
                write(&format!("{out}/plan.json"),&serde_json::to_string_pretty(&serde_json::json!({"target":target,"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"trust":"literal emission and target runtimes/toolchains remain trusted"})).map_err(|e|e.to_string())?)?;
                println!("wrote complete {target} project to {out}");
                return Ok(());
            }
            if cmd == "build" && matches!(target.as_str(), "native" | "wasm32") {
                if arg_value(&args, "--route")?.is_some() {
                    return Err("explicit routes require the GPU bundle target".into());
                }
                let module = core::CheckedModule::from_source(p.clone())?;
                let project = std::path::PathBuf::from(format!("{out}.project"));
                if let Some(selected) = &semantic_selection {
                    verified_language::runtime::emit_c_program_selected(selected, &project)?;
                } else {
                    verified_language::runtime::emit_c_program(&module, &project)?;
                }
                let cargo = arg_value(&args, "--cargo")?
                    .or_else(|| std::env::var("INK_CARGO").ok())
                    .unwrap_or_else(|| "cargo".into());
                if let Some(cc) = arg_value(&args, "--cc")? {
                    std::env::set_var("INK_CC", cc);
                }
                verified_language::runtime::toolchain::complete_program(
                    &project,
                    target == "wasm32",
                    Path::new(&out),
                    &cargo,
                    arg_value(&args, "--zig")?.as_deref(),
                )?;
                write(&format!("{out}.plan.json"),&serde_json::to_string_pretty(&serde_json::json!({"target":target,"abi":"ink-values-v1","artifact_kind":if target=="native"{"executable"}else{"wasm_module"},"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"trust":"literal C emission and shared Rust primitive runtime; toolchains remain trusted"})).map_err(|e|e.to_string())?)?;
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
                let zig = arg_value(&args, "--zig")?.unwrap_or_else(|| "zig".into());
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
                        Some(&zig),
                    )?;
                    for f in manifest["functions"].as_array().unwrap() {
                        if let Some(folder) = f["bundle"].as_str() {
                            let dir = Path::new(&out).join(folder);
                            let module = core::CheckedModule::from_bytes(
                                &fs::read(dir.join("core.json")).map_err(|e| e.to_string())?,
                            )?;
                            verified_language::runtime::toolchain::wasm(
                                &module,
                                &dir.join("cpu.c"),
                                &dir.join("cpu.wasm"),
                                &zig,
                            )?;
                        }
                    }
                } else {
                    verified_language::runtime::toolchain::wasm(
                        &core::CheckedModule::from_source(p.clone())?,
                        &Path::new(&out).join("cpu.c"),
                        &Path::new(&out).join("cpu.wasm"),
                        &zig,
                    )?;
                }
                let plan = serde_json::json!({"source":path,"target":target,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"database_lock":serde_json::Value::Null,"database_closure":serde_json::Value::Null,"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"checked_source_route":route.as_ref().map(|r|r.package()),"source_route_equivalence":route.as_ref().and_then(|r|r.equivalence()),"trust":"GPU backend and physical routing remain trusted; see manifest.json"});
                write(
                    &format!("{out}/plan.json"),
                    &serde_json::to_string_pretty(&plan).map_err(|e| e.to_string())?,
                )?;
                if route.is_some() {
                    println!("wrote checked source graph, Wasm/WebGPU and native C/wgpu hosts to {out}; placements supplied externally, GPU failures retain compiled CPU fallback");
                } else {
                    println!("wrote WebGPU/Wasm bundle and native wgpu project to {out}; GPU selection is measured by the host runtime");
                }
                return Ok(());
            }
            if !["native", "object", "wasm32"].contains(&target.as_str()) {
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
            let generated_c = match native::emit(&p) {
                Ok(c) => c,
                Err(_) if cmd == "emit-c" => {
                    let module = core::CheckedModule::from_source(p.clone())?;
                    let project = std::path::PathBuf::from(format!("{out}.project"));
                    verified_language::runtime::emit_c_program(&module, &project)?;
                    let c =
                        fs::read_to_string(project.join("program.c")).map_err(|e| e.to_string())?;
                    write(&out, &c)?;
                    println!(
                        "wrote C source {out} and required primitive runtime to {}",
                        project.display()
                    );
                    return Ok(());
                }
                Err(e) => return Err(e),
            };
            write(&cpath, &generated_c)?;
            let generated_c_sha256 = format!("{:x}", Sha256::digest(generated_c.as_bytes()));
            let selected_program_sha256 = format!(
                "{:x}",
                Sha256::digest(serde_json::to_vec(&p).map_err(|e| e.to_string())?)
            );
            let manifest = serde_json::json!({"source":path,"module":p.module,"target":target,"core_semantics":core::CheckedModule::from_source(p.clone())?.semantics(),"input_core_sha256":input_core_sha256,"selected_core_sha256":selected_core_sha256,"input_program_sha256":input_program_sha256,"selected_program_sha256":selected_program_sha256,"generated_c_sha256":generated_c_sha256,"semantic_selection":semantic_selection.as_ref().map(|s|s.evidence()),"semantic_package":semantic_selection.as_ref().map(|s|s.package()),"checked_replacement":replacement,"checked_implementation":implementation,"applied_rule_ids":used,"database_lock":serde_json::Value::Null,"database_closure":serde_json::Value::Null,"verified_fragment":"whole-function inductive collection equality; total-scalar equality proof terms","trusted":["Rust checker implementation","source semantics correspondence","literal collection lowering and allocation","generated C","Clang/LLVM backend","host ABI"],"unsupported_spec_features":"see PLAN.md and STATUS.md"});
            write(
                &format!("{out}.plan.json"),
                &serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?,
            )?;
            if cmd == "build" {
                if target == "wasm32" {
                    let zig = arg_value(&args, "--zig")?.unwrap_or_else(|| "zig".into());
                    verified_language::runtime::toolchain::wasm(
                        &core::CheckedModule::from_source(p.clone())?,
                        Path::new(&cpath),
                        Path::new(&out),
                        &zig,
                    )?;
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
