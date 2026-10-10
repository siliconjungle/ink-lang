use serde_json::{json, Value as Json};
use sha2::{Digest, Sha256};
use std::{collections::BTreeSet, fs, path::Path, process::Command};
use verified_language::{core::CheckedModule, eval, implementation, syntax};

fn write_entry(database: &Path, object: &Json) -> String {
    let raw = serde_json::to_vec(object).unwrap();
    let id = format!("{:x}", Sha256::digest(&raw));
    fs::create_dir_all(database.join("objects")).unwrap();
    fs::write(database.join("objects").join(format!("{id}.json")), raw).unwrap();
    id
}

fn add(database: &Path, library: &str, name: &str) -> String {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"))
        .join("knowledge/research")
        .join(library);
    let names: Json = serde_json::from_slice(&fs::read(root.join("names.json")).unwrap()).unwrap();
    let id = names[name].as_str().unwrap().to_owned();
    let mut pending = vec![id.clone()];
    let mut copied = BTreeSet::new();
    fs::create_dir_all(database.join("objects")).unwrap();
    while let Some(next) = pending.pop() {
        if !copied.insert(next.clone()) {
            continue;
        }
        let raw = fs::read(root.join("objects").join(format!("{next}.json"))).unwrap();
        let object: Json = serde_json::from_slice(&raw).unwrap();
        pending.extend(
            object["dependencies"]
                .as_array()
                .unwrap()
                .iter()
                .map(|id| id.as_str().unwrap().to_owned()),
        );
        fs::write(database.join("objects").join(format!("{next}.json")), raw).unwrap();
    }
    id
}

fn run(source: &Path, database: &Path, out: &Path, budget: usize) -> std::process::Output {
    Command::new("python3")
        .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("planner/research/rewrite_search.py"))
        .arg(source)
        .args(["--database"])
        .arg(database)
        .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--output-dir"])
        .arg(out)
        .args(["--budget", &budget.to_string()])
        .output()
        .unwrap()
}

fn checked_run(source: &Path, database: &Path, out: &Path, budget: usize) -> Json {
    let result = run(source, database, out, budget);
    assert!(
        result.status.success(),
        "{}",
        String::from_utf8_lossy(&result.stderr)
    );
    serde_json::from_slice(&fs::read(out.join("search.json")).unwrap()).unwrap()
}

fn temporary(name: &str) -> std::path::PathBuf {
    let dir = std::env::temp_dir().join(format!("ink-db-query-{name}-{}", std::process::id()));
    if dir.exists() {
        fs::remove_dir_all(&dir).unwrap();
    }
    fs::create_dir_all(&dir).unwrap();
    dir
}

#[test]
fn individual_entries_enable_checked_rewrites_without_an_index_or_compiler_change() {
    let dir = temporary("entries");
    let database = dir.join("database");
    fs::create_dir(&database).unwrap();
    let source = dir.join("source.ink");
    fs::write(&source, "module discover;\nfn plus(x:u64)->u64{return x+0+0;}\nfn same(x:u64)->u64{return x-x;}\nfn different(x:u64,y:u64)->u64{return x-y;}\nfn narrow(x:u32)->u32{return x+0;}\n").unwrap();
    let original = syntax::parse(&fs::read_to_string(&source).unwrap()).unwrap();
    let compiler_hash = Sha256::digest(fs::read(env!("CARGO_BIN_EXE_ink")).unwrap());
    let first = checked_run(&source, &database, &dir.join("empty"), 10000);
    assert_eq!(first["database"]["scalar_rules"], 0);
    assert!(first["database"]["selected_rules"]
        .as_array()
        .unwrap()
        .is_empty());
    let plus = add(&database, "bitvector", "add_zero");
    let second = checked_run(&source, &database, &dir.join("one"), 10000);
    assert_eq!(second["database"]["selected_rules"], json!([plus]));
    assert_eq!(second["attempts"][0]["rules"].as_array().unwrap().len(), 2);
    assert_eq!(second["attempts"][1]["status"], "original");
    add(&database, "bitvector", "subtract_self");
    let third = checked_run(&source, &database, &dir.join("two"), 10000);
    assert_ne!(
        second["database"]["snapshot_sha256"],
        third["database"]["snapshot_sha256"]
    );
    assert_eq!(
        third["database"]["selected_rules"]
            .as_array()
            .unwrap()
            .len(),
        2
    );
    assert_eq!(third["attempts"][2]["status"], "original"); // repeated metavariables must agree
    assert_eq!(third["attempts"][3]["status"], "original"); // u64 evidence cannot rewrite u32
    let exhausted = dir.join("exhausted");
    let receipt = checked_run(&source, &database, &exhausted, 0);
    assert!(receipt["database"]["selected_rules"]
        .as_array()
        .unwrap()
        .is_empty());
    let mut fallback = original.clone();
    implementation::apply_replacement(&mut fallback, &exhausted.join("replacement.json")).unwrap();
    assert_eq!(
        CheckedModule::from_source(original.clone())
            .unwrap()
            .identity()
            .unwrap(),
        CheckedModule::from_source(fallback)
            .unwrap()
            .identity()
            .unwrap()
    );
    assert_eq!(
        compiler_hash,
        Sha256::digest(fs::read(env!("CARGO_BIN_EXE_ink")).unwrap())
    );
    // The frozen build remains checkable after the discovery database is gone.
    fs::remove_dir_all(database).unwrap();
    let mut selected = original.clone();
    let evidence =
        implementation::apply_replacement(&mut selected, &dir.join("two/replacement.json"))
            .unwrap();
    assert_eq!(evidence.equality.checked_proposals.len(), 2);
    for (name, arguments) in [
        ("plus", vec![eval::Value::U64(u64::MAX)]),
        ("same", vec![eval::Value::U64(u64::MAX)]),
        (
            "different",
            vec![eval::Value::U64(0), eval::Value::U64(u64::MAX)],
        ),
        ("narrow", vec![eval::Value::U32(u32::MAX)]),
    ] {
        assert_eq!(
            eval::call(&original, name, arguments.clone(), &mut 10000).unwrap(),
            eval::call(&selected, name, arguments, &mut 10000).unwrap()
        );
    }
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn query_order_is_reproducible_and_conditional_evidence_cannot_escape_its_branch() {
    let dir = temporary("conditions");
    let database = dir.join("database");
    let reverse = dir.join("relocated");
    fs::create_dir(&database).unwrap();
    fs::create_dir(&reverse).unwrap();
    for name in ["and_when_true", "and_false"] {
        add(&database, "scalar-logic", name);
    }
    for name in ["and_false", "and_when_true"] {
        add(&reverse, "scalar-logic", name);
    }
    let source = dir.join("source.ink");
    fs::write(&source, "module conditions;\nfn guarded(a:Bool,b:Bool)->Bool{return a && (a && b);}\nfn unguarded(a:Bool,b:Bool)->Bool{return a && b;}\n").unwrap();
    let a = dir.join("a");
    let b = dir.join("b");
    let receipt = checked_run(&source, &database, &a, 10000);
    checked_run(&source, &reverse, &b, 10000);
    for file in [
        "core.json",
        "database-snapshot.json",
        "lock.json",
        "replacement.json",
        "checked.c",
        "search.json",
    ] {
        assert_eq!(
            fs::read(a.join(file)).unwrap(),
            fs::read(b.join(file)).unwrap(),
            "{file}"
        );
    }
    assert_eq!(receipt["attempts"][0]["status"], "candidate");
    assert_eq!(receipt["attempts"][1]["status"], "original");
    let original = syntax::parse(&fs::read_to_string(&source).unwrap()).unwrap();
    let mut selected = original.clone();
    implementation::apply_replacement(&mut selected, &a.join("replacement.json")).unwrap();
    for a in [false, true] {
        for b in [false, true] {
            for name in ["guarded", "unguarded"] {
                let args = vec![eval::Value::Bool(a), eval::Value::Bool(b)];
                assert_eq!(
                    eval::call(&original, name, args.clone(), &mut 10000).unwrap(),
                    eval::call(&selected, name, args, &mut 10000).unwrap()
                );
            }
        }
    }
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn discovering_a_well_hashed_false_rule_does_not_give_it_transformation_authority() {
    let dir = temporary("false");
    let database = dir.join("database");
    fs::create_dir(&database).unwrap();
    let source = dir.join("source.ink");
    fs::write(&source, "module rejected;fn f(x:u64)->u64{return x*0;}").unwrap();
    let false_rule = json!({"schema":1,"semantics":"first-order-inductive-equality-v1",
        "name":"any_name_is_allowed","dependencies":[],"declaration":{"Theorem":{
        "params":[["x","U64"]],"conditions":[],"from":{"Binary":{"op":"*","left":{"Var":"x"},"right":{"U64":0}}},
        "to":{"Var":"x"},"proof":{"Refl":{"Var":"x"}}}}});
    let id = write_entry(&database, &false_rule);
    let result = run(&source, &database, &dir.join("rejected"), 10000);
    assert!(!result.status.success());
    assert!(!dir.join("rejected/checked.c").exists());
    // Changing bytes while retaining a filename also fails discovery, before checking.
    let mut changed = false_rule.clone();
    changed["name"] = json!("changed-but-still-the-same-supported-format");
    fs::write(
        database.join("objects").join(format!("{id}.json")),
        serde_json::to_vec(&changed).unwrap(),
    )
    .unwrap();
    let result = run(&source, &database, &dir.join("changed"), 10000);
    assert!(!result.status.success());
    assert!(String::from_utf8_lossy(&result.stderr).contains("content hash mismatch"));
    assert!(!dir.join("changed/checked.c").exists());
    fs::remove_dir_all(dir).unwrap();
}

#[test]
fn general_typed_query_discovers_individual_laws_and_replays_after_database_removal() {
    let dir = temporary("typed");
    let database = dir.join("database");
    let relocated = dir.join("relocated");
    fs::create_dir(&database).unwrap();
    fs::create_dir(&relocated).unwrap();
    let source = dir.join("source.ink");
    fs::write(
        &source,
        "module typed;fn f(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x*1+0);}",
    )
    .unwrap();
    let module =
        CheckedModule::from_source(syntax::parse(&fs::read_to_string(&source).unwrap()).unwrap())
            .unwrap();
    let core = dir.join("core.json");
    fs::write(&core, module.bytes().unwrap()).unwrap();
    let publish = |db: &Path, objects: &Vec<verified_language::registry::Entry>| {
        let input = db.join("authoring.json");
        fs::write(&input, serde_json::to_vec(objects).unwrap()).unwrap();
        let result=Command::new("python3").env("PYTHONPATH",Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge"))
            .arg("-c").arg("import sys,json;from ink_knowledge import Store;Store.publish(sys.argv[1],json.load(open(sys.argv[2]))).rebuild()")
            .arg(db).arg(input).output().unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
    };
    publish(&database, &vec![]);
    let run_typed = |db: &Path, out: &Path| {
        let result = Command::new("python3")
            .arg(Path::new(env!("CARGO_MANIFEST_DIR")).join("planner/plan.py"))
            .args(["--compiler", env!("CARGO_BIN_EXE_ink"), "--knowledge-root"])
            .arg(db)
            .arg("--snapshot")
            .arg(db.join("store/snapshot.json"))
            .arg("--core")
            .arg(&core)
            .arg("-o")
            .arg(out)
            .output()
            .unwrap();
        assert!(
            result.status.success(),
            "{}",
            String::from_utf8_lossy(&result.stderr)
        );
        let package: verified_language::optimisation::Package =
            serde_json::from_slice(&fs::read(out).unwrap()).unwrap();
        (
            package,
            serde_json::from_slice::<Json>(&result.stdout).unwrap(),
        )
    };
    let (empty, _) = run_typed(&database, &dir.join("empty.json"));
    assert!(empty.applications.is_empty());
    let catalogue: Json = serde_json::from_str(include_str!(
        "../knowledge/research/semantic/catalogue.json"
    ))
    .unwrap();
    let mut laws = Vec::new();
    let mut objects = Vec::new();
    for op in ["binary:+", "binary:*"] {
        let literal = if op == "binary:+" { 0 } else { 1 };
        let law = catalogue["objects"]
            .as_object()
            .unwrap()
            .values()
            .find(|law| {
                law["params"] == json!({"x":{"Value":"U32"}})
                    && law["from"]["node"]["Op"][0] == op
                    && law["from"]["node"]["Op"][1][1]["node"]["Word"] == literal
            })
            .unwrap();
        let typed: verified_language::laws::Law = serde_json::from_value(law.clone()).unwrap();
        let entry = verified_language::registry::Entry::from_law(&typed).unwrap();
        let id = verified_language::registry::identity(&entry).unwrap();
        objects.push(entry);
        laws.push(id);
    }
    publish(&database, &objects);
    publish(&relocated, &objects);
    let selected_path = dir.join("selection.json");
    let (package, receipt) = run_typed(&database, &selected_path);
    let (_, again) = run_typed(&relocated, &dir.join("again.json"));
    assert_eq!(receipt, again);
    assert_eq!(
        fs::read(&selected_path).unwrap(),
        fs::read(dir.join("again.json")).unwrap()
    );
    assert_eq!(receipt["database"]["entries"], 2);
    assert!(package.applications.len() >= 2);
    assert!(package
        .applications
        .iter()
        .all(|step| laws.contains(&step.law)));
    let cli = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-core")
        .arg(&source)
        .arg("--optimise")
        .arg(&database)
        .arg("-o")
        .arg(dir.join("cli.json"))
        .output()
        .unwrap();
    assert!(
        cli.status.success(),
        "{}",
        String::from_utf8_lossy(&cli.stderr)
    );
    // Immutable snapshot paths work without relying on the active pointer.
    let pinned = database.join("store/snapshots").join(format!(
        "{}.json",
        receipt["database"]["snapshot_sha256"].as_str().unwrap()
    ));
    let cli_pinned = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-core")
        .arg(&source)
        .arg("--optimise")
        .arg(pinned)
        .arg("-o")
        .arg(dir.join("cli-pinned.json"))
        .output()
        .unwrap();
    assert!(
        cli_pinned.status.success(),
        "{}",
        String::from_utf8_lossy(&cli_pinned.stderr)
    );
    assert_eq!(
        fs::read(dir.join("cli.json")).unwrap(),
        fs::read(dir.join("cli-pinned.json")).unwrap()
    );
    let mut false_law: verified_language::laws::Law = serde_json::from_value(
        catalogue["objects"]
            .as_object()
            .unwrap()
            .values()
            .find(|law| {
                law["params"] == json!({"x":{"Value":"U32"}})
                    && law["from"]["node"]["Op"][0] == "binary:+"
                    && law["from"]["node"]["Op"][1][1]["node"]["Word"] == 0
            })
            .unwrap()
            .clone(),
    )
    .unwrap();
    false_law.to = verified_language::semantic::word(verified_language::core::Type::U32, 1);
    objects.push(verified_language::registry::Entry::from_law(&false_law).unwrap());
    publish(&database, &objects);
    let untouched = dir.join("untouched.json");
    fs::write(&untouched, "existing-output").unwrap();
    let rejected = Command::new(env!("CARGO_BIN_EXE_ink"))
        .arg("emit-core")
        .arg(&source)
        .arg("--optimise")
        .arg(&database)
        .arg("-o")
        .arg(&untouched)
        .output()
        .unwrap();
    assert!(!rejected.status.success());
    assert_eq!(fs::read_to_string(&untouched).unwrap(), "existing-output");
    fs::remove_dir_all(&database).unwrap();
    fs::remove_dir_all(&relocated).unwrap();
    let selected = verified_language::optimisation::check(&module, &package).unwrap();
    for xs in [vec![], vec![0, 1, u32::MAX, 1 << 31]] {
        let argument = eval::Value::List(xs.into_iter().map(eval::Value::U32).collect());
        assert_eq!(
            eval::call(module.program(), "f", vec![argument.clone()], &mut 10000).unwrap(),
            eval::call(selected.module().program(), "f", vec![argument], &mut 10000).unwrap()
        );
    }
    fs::remove_dir_all(dir).unwrap();
}
