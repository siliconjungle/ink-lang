use ink_core::{core::CheckedModule, syntax, tasks::Kind};

const SOURCE: &str = "module t;
effect get(x: u32) -> Result<u32, String>;
effect guess(x: u32) -> u32;
ordered effect send(x: u32) -> Unit;
state Total: u32 = 0;
change add(x: u32) -> Result<u32, String> writes(Total) { Total = Total + x; return Ok(Total); }
task run(n: u32) -> Result<u32, String> {
  let a = get(n)?;
  let b = guess(n) ensures b < 10 else 0;
  let c: u32 = a + b;
  let total = add(c)?;
  send(total);
  return Ok(total);
}
";

#[test]
fn tasks_lower_to_readonly_queries_and_a_checked_manifest() {
    let p = syntax::parse(SOURCE).unwrap();
    CheckedModule::from_source(p.clone()).unwrap();
    let t = &p.contracts.tasks.tasks[0];
    let kinds: Vec<Kind> = t.steps.iter().map(|s| s.kind.clone()).collect();
    assert_eq!(kinds, [Kind::Effect, Kind::Effect, Kind::Value, Kind::Change, Kind::Effect]);
    let after: Vec<Vec<u32>> = t.steps.iter().map(|s| s.after.clone()).collect();
    assert_eq!(after, [vec![], vec![], vec![0, 1], vec![0, 1, 2], vec![0, 1, 2, 3]]);
    assert!(p.actions.iter().filter(|a| a.name.starts_with("__task_")).all(|a| a.writes.is_empty()));
    // Modules without effects or tasks keep an empty manifest (unchanged identity).
    let plain = syntax::parse("module t;\nfn f(x: u32) -> u32 { return x; }\n").unwrap();
    assert!(plain.contracts.tasks.is_empty());
    let mut forged = p.clone();
    forged.contracts.tasks.tasks[0].steps[4].after = vec![3];
    assert!(CheckedModule::from_source(forged).is_err());
    for bad in [
        SOURCE.replace("let c: u32 = a + b;", "let c = a + b;"),
        SOURCE.replace("send(total);", "send(total)?;"),
        SOURCE.replace("  return Ok(total);\n", ""),
    ] {
        assert!(syntax::parse(&bad).and_then(|p| CheckedModule::from_source(p).map(|_| ())).is_err());
    }
}
