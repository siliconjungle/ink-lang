//! Distribution tooling for proof-checked database representations.
use crate::{
    core::CheckedModule,
    representation::{self, CheckedRepresentation, Request},
    LangResult,
};
use serde_json::{json, Value};
use std::{fs, path::Path};
fn read(path: &str) -> LangResult<Vec<u8>> {
    let size = fs::metadata(path).map_err(|e| e.to_string())?.len();
    if size > 16_000_000 {
        return Err("representation input byte limit".into());
    }
    fs::read(path).map_err(|e| e.to_string())
}
pub fn load(module: &CheckedModule, path: &str) -> LangResult<CheckedRepresentation> {
    let request: Request = serde_json::from_slice(&read(path)?).map_err(|e| e.to_string())?;
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
                serde_json::from_slice(&read(args.get(4).ok_or("missing bridge JSON")?)?)
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
            let output = value("-o").ok_or("emit-representation requires -o OUTPUT.rs")?;
            let source = crate::representation_native::lower(&[checked], &[])?;
            if let Some(parent) = Path::new(output).parent() {
                if !parent.as_os_str().is_empty() {
                    fs::create_dir_all(parent).map_err(|e| e.to_string())?;
                }
            }
            fs::write(output, source).map_err(|e| e.to_string())?;
        }
        "execute-representation" => {
            let script: Value =
                serde_json::from_slice(&read(args.get(3).ok_or("missing script JSON")?)?)
                    .map_err(|e| e.to_string())?;
            let mut session = if let Some(file) = value("--restore") {
                crate::runtime::representation::Session::restore(
                    checked,
                    &read(file)?,
                    crate::runtime::representation::Reference,
                )?
            } else {
                crate::runtime::representation::Session::new(
                    checked,
                    crate::runtime::representation::Reference,
                )?
            };
            let mut replies = vec![];
            for step in script.as_array().ok_or("script must be an array")? {
                if let Some(path) = step.get("migrate").and_then(Value::as_str) {
                    session.migrate(load(&module, path)?)?;
                    replies.push(
                        json!({"migrated":session.representation(),"version":session.version()}),
                    );
                } else {
                    replies.push(
                        session.invoke_json(
                            step["call"]
                                .as_str()
                                .ok_or("script step needs call or migrate")?,
                            step.get("args").ok_or("script step needs args")?,
                        )?,
                    );
                }
            }
            if let Some(file) = value("--snapshot-out") {
                fs::write(file, session.checkpoint()?).map_err(|e| e.to_string())?;
            }
            println!(
                "{}",
                serde_json::to_string_pretty(&replies).map_err(|e| e.to_string())?
            );
        }
        _ => return Err("unknown representation command".into()),
    }
    Ok(())
}
