use std::{
    env, fs,
    path::Path,
    process::{Command, ExitCode},
};
use verified_language::{check, eval, native, proof, syntax, LangResult};

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
    if cmd == "help" || cmd == "--help" {
        println!("lang check SOURCE\nlang prove RULES -o PACKAGE.json\nlang knowledge verify PACKAGE.json\nlang run SOURCE FUNCTION ARGS.json\nlang build SOURCE -o OUTPUT.o [--knowledge PACKAGE.json] [--cc clang]\nlang emit-c SOURCE -o OUTPUT.c [--knowledge PACKAGE.json]");
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
        "check" => {
            for r in &p.rules {
                proof::prove(r)?;
            }
            println!(
                "checked {} functions and {} arithmetic rewrites",
                p.functions.len(),
                p.rules.len()
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
            let cpath = if cmd == "emit-c" {
                out.clone()
            } else {
                format!("{out}.c")
            };
            write(&cpath, &native::emit(&p)?)?;
            let manifest = serde_json::json!({"source":path,"module":p.module,"applied_rule_ids":used,"verified_fragment":"u64 modular polynomial rewrite certificates","trusted":["Rust checker implementation","collection lowering","generated C","Clang/LLVM backend","host ABI"],"unsupported_spec_features":"see PLAN.md and STATUS.md"});
            write(
                &format!("{out}.plan.json"),
                &serde_json::to_string_pretty(&manifest).map_err(|e| e.to_string())?,
            )?;
            if cmd == "build" {
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
