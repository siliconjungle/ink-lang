fn main() {
    let result = (|| -> Result<(), String> {
        let path = std::env::args().nth(1).ok_or("expected exported view")?;
        let raw = std::fs::read(path).map_err(|e| e.to_string())?;
        let bundle = serde_json::from_slice(&raw).map_err(|e| e.to_string())?;
        let checked = ink_core::registry::CheckedBundle::check(&bundle)?;
        let module = ink_core::core::CheckedModule::from_source(ink_core::syntax::parse("module review; fn identity(x:u64)->u64 { return x; }")?)?;
        let entries = checked.verify(module.program())?;
        println!("{}", serde_json::json!({"verified":entries.len(),"snapshot":checked.snapshot_id()}));
        Ok(())
    })();
    if let Err(error) = result { eprintln!("{error}"); std::process::exit(1); }
}
