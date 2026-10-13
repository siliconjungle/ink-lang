//! Strictly sorted tables as a checked inductive invariant of the projection.
//!
//! The derived predicates must accept exactly strictly ascending rows, and a
//! replacement may assume them only with checked preservation proofs. With
//! them, removing one key and inserting another commute: false on arbitrary
//! row lists, true on every state a source table can reach.
use serde_json::Value as Json;
use std::{fs, path::Path, process::Command};
use verified_language::{
    action_model::Projection,
    core::CheckedModule,
    logic::{Declaration, Term},
    optimisation::{self, Package},
    syntax::parse,
};

const SOURCE: &str = "module sorted_tables;
enum Error{Failed,}
state Rows:Table<u64,u64> = Table.empty();
state Flags:Table<Bool,u64> = Table.empty();
change put(key:u64,value:u64)->Result<Unit,Error> writes(Rows){if Rows.contains(key){Rows.replace(key,value);}else{Rows.insert(key,value);}return Ok(());}
change erase(key:u64)->Result<Unit,Error> writes(Rows){Rows.remove(key);return Ok(());}
query get(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}
";

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(parse(source).unwrap()).unwrap()
}

fn rows(datatype: &str, keys: &[Term]) -> Term {
    keys.iter().rev().fold(
        Term::Construct {
            datatype: datatype.into(),
            constructor: 0,
            arguments: vec![],
        },
        |tail, key| Term::Construct {
            datatype: datatype.into(),
            constructor: 1,
            arguments: vec![key.clone(), Term::U64(7), tail],
        },
    )
}

#[test]
fn derived_predicates_accept_exactly_strictly_ascending_rows() {
    let projection = Projection::derive(&module(SOURCE)).unwrap();
    let sorted = projection.sorted_tables().unwrap();
    assert_eq!(sorted.predicates.len(), projection.tables.len());
    let mut context = projection.context().unwrap();
    // Declare dependencies first: each `sorted` calls its table's `above`.
    let mut pending = sorted.objects.clone();
    while !pending.is_empty() {
        let ready: Vec<String> = pending
            .iter()
            .filter(|(_, e)| e.dependencies.iter().all(|d| !pending.contains_key(d)))
            .map(|(i, _)| i.clone())
            .collect();
        for i in ready {
            let e = pending.remove(&i).unwrap();
            let d: Declaration = serde_json::from_value(e.payload["declaration"].clone()).unwrap();
            context.declare(i, &d).unwrap();
        }
    }
    let holds = |table: usize, keys: &[Term]| {
        let term = Term::Call {
            function: sorted.predicates[table].clone(),
            arguments: vec![rows(&projection.tables[table].datatype, keys)],
        };
        context.evaluate(&[], &term).unwrap() == Term::Bool(true)
    };
    let w = Term::U64;
    assert!(holds(0, &[]));
    assert!(holds(0, &[w(3)]));
    assert!(holds(0, &[w(1), w(2), w(u64::MAX)]));
    assert!(!holds(0, &[w(2), w(1)]));
    assert!(!holds(0, &[w(1), w(1)]));
    assert!(!holds(0, &[w(1), w(3), w(2)]));
    // Bool keys use the projection's own order: false before true.
    let b = Term::Bool;
    assert!(holds(1, &[b(false), b(true)]));
    assert!(!holds(1, &[b(true), b(false)]));
    assert!(!holds(1, &[b(true), b(true)]));
}

/// The commutation tool's conditional certificate, then tampering with it.
#[test]
fn removal_and_insertion_of_different_keys_commute_only_under_the_checked_invariant() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let work = root.join("build/sorted-tables");
    let _ = fs::remove_dir_all(&work);
    fs::create_dir_all(&work).unwrap();
    let source = work.join("a.ink");
    fs::write(&source, SOURCE).unwrap();
    let script = format!(
        "import json,sys;sys.path.insert(0,'tools');from action_algebra import certify\n\
         print(json.dumps(certify({:?},{:?},'erase','put','knowledge',{:?},[[0,0]])))",
        env!("CARGO_BIN_EXE_ink"),
        source.to_str().unwrap(),
        work.join("certificates").to_str().unwrap(),
    );
    let out = Command::new("python3")
        .args(["-c", &script])
        .current_dir(root)
        .output()
        .unwrap();
    assert!(out.status.success(), "{}", String::from_utf8_lossy(&out.stderr));
    let result: Json = serde_json::from_slice(&out.stdout).unwrap();
    assert_eq!(result["certificate"], "checked when keys differ", "{result}");

    let pair = work.join("certificates/erase--put--keys-differ");
    let original = CheckedModule::from_bytes(&fs::read(pair.join("ab-core.json")).unwrap()).unwrap();
    let selection: Package = serde_json::from_slice(&fs::read(result["selection"].as_str().unwrap()).unwrap()).unwrap();
    optimisation::check(&original, &selection).unwrap();

    // Without the invariant the equality is false (unsorted rows), and its
    // proof cannot cite the sortedness hypotheses.
    let mut unassumed = selection.clone();
    unassumed.action_replacement.as_mut().unwrap().sorted_tables = None;
    assert!(optimisation::check(&original, &unassumed).is_err());

    // A preservation proof that proves nothing is rejected.
    let mut unproved = selection.clone();
    let invariant = unproved
        .action_replacement
        .as_mut()
        .unwrap()
        .sorted_tables
        .as_mut()
        .unwrap();
    invariant.actions.get_mut("put").unwrap()[0] = verified_language::logic::Proof::Refl(Term::Bool(true));
    assert!(optimisation::check(&original, &unproved)
        .unwrap_err()
        .contains("sortedness"));

    // Missing an action's preservation proofs is rejected.
    let mut missing = selection.clone();
    missing
        .action_replacement
        .as_mut()
        .unwrap()
        .sorted_tables
        .as_mut()
        .unwrap()
        .actions
        .remove("erase");
    assert!(optimisation::check(&original, &missing).is_err());

    // The unguarded swap is false when the keys are equal.
    let unguarded = fs::read_to_string(pair.join("ab.ink"))
        .unwrap()
        .replace(
            "let first=erase(first_key);let second=put(second_key,second_value);",
            "let second=put(second_key,second_value);let first=erase(first_key);",
        );
    let mut swapped = selection.clone();
    swapped.action_replacement.as_mut().unwrap().selected =
        serde_json::from_slice(&module(&unguarded).bytes().unwrap()).unwrap();
    assert!(optimisation::check(&original, &swapped).is_err());
}
