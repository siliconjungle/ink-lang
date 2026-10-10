use serde_json::{json, Value as Json};
use std::{collections::BTreeMap, path::Path, process::Command};
use verified_language::{
    core::{CheckedModule, Type},
    laws::{Catalogue, Proof},
    optimisation::{self, Package, Site},
    semantic::{self as s, Node},
    stateful::Runtime,
    syntax::parse,
};
#[path = "support/parity.rs"]
mod parity;
const APP: &str = r#"module action_rules;
id Key; enum Error{Missing,Failed,}
record Row{n:u32,}
state Rows:Table<Key,Row> = Table.empty();
keep __ink_slot_0:Bool = count(Rows.values()) == 0;
event seen:u32;
change put(key:Key,x:u32)->Result<Unit,Error> writes(Rows) emits(seen){
 let n:u32=x+0;
 if Rows.contains(key){Rows.replace(key,Row{n:n+0});}else{Rows.insert(key,Row{n:n+0});}
 emit seen(n+0);return Ok(());
}
change fail(x:u32)->Result<Unit,Error> emits(seen){emit seen(x+0);return Err(Error.Failed);}
change nested(key:Key,x:u32)->Result<Unit,Error> writes(Rows) emits(seen){put(key,x)?;fail(x)?;return Ok(());}
query get(key:Key)->Option<Row> reads(Rows){return Rows.get(key);}
query echo(xs:List<u32>)->List<u32>{return xs.map(fn(x)=>x+0).map(fn(y)=>y+0);}
query captured(__ink_bound_0:u32,xs:List<u32>)->List<u32>{return xs.map(fn(z)=>z+0+__ink_bound_0);}
query shadow(x:u32,xs:List<u32>)->List<u32>{let z:u32=x+0;return xs.map(fn(x)=>x+0+z);}
query guarded(x:u32,y:u32)->u32{if y==0{return x+y;}return x;}
query unguarded(x:u32,y:u32)->u32{return x+y;}
query stale_guard(x:u32,y:u32,xs:List<u32>)->List<u32>{if y==0{return xs.map(fn(y)=>x+y);}return xs;}
query alias(x:Bool)->Bool reads(__ink_slot_0){return __ink_slot_0||false;}
"#;
fn module() -> CheckedModule {
    CheckedModule::from_source(parse(APP).unwrap()).unwrap()
}
fn catalogue() -> Catalogue {
    let b = serde_json::from_slice(&std::fs::read("knowledge/store/rewrite-view.json").unwrap())
        .unwrap();
    verified_language::registry::CheckedBundle::check(&b)
        .unwrap()
        .catalogue()
        .unwrap()
}
fn pack(m: &CheckedModule, c: &Catalogue, applications: Vec<Site>) -> Package {
    Package {
        schema: 1,
        semantics: optimisation::SEMANTICS.into(),
        input_core_sha256: m.identity().unwrap(),
        knowledge: verified_language::registry::from_catalogue(c).unwrap(),
        applications,
    }
}
fn conditional(m: &CheckedModule, name: &str) -> Site {
    let c = catalogue();
    let subject = optimisation::subject(m).unwrap();
    fn find(t: &s::Term, path: &mut Vec<usize>) -> Option<(Vec<usize>, Vec<s::Term>)> {
        if matches!(&t.node,Node::Op(op,args) if op=="binary:+"&&matches!(args[1].node,Node::Free(_)|Node::Bound(_)))
        {
            let Node::Op(_, args) = &t.node else {
                unreachable!()
            };
            return Some((path.clone(), args.clone()));
        }
        for (i, t) in s::children(t).iter().enumerate() {
            path.push(i);
            let found = find(t, path);
            path.pop();
            if found.is_some() {
                return found;
            }
        }
        None
    }
    let (key, path, args) = subject
        .functions
        .iter()
        .filter(|(key, _)| key.starts_with(&format!("@action/{name}/")))
        .find_map(|(key, t)| find(t, &mut vec![]).map(|(path, args)| (key.clone(), path, args)))
        .unwrap();
    let law = c
        .roots
        .iter()
        .find(|id| {
            !c.objects[*id].conditions.is_empty() && c.objects[*id].from.sort == s::value(Type::U32)
        })
        .unwrap()
        .clone();
    Site {
        function: key,
        path,
        law,
        arguments: BTreeMap::from([("x".into(), args[0].clone()), ("y".into(), args[1].clone())]),
        premises: vec![Proof::Normalize],
    }
}
#[test]
fn lexical_branch_facts_are_exact_and_do_not_escape_or_follow_shadowed_slots() {
    let m = module();
    let c = catalogue();
    let selected =
        optimisation::check(&m, &pack(&m, &c, vec![conditional(&m, "guarded")])).unwrap();
    for y in [0, 1, u32::MAX] {
        let input = json!([u32::MAX, y]);
        let mut original = Runtime::new(m.program().clone()).unwrap();
        let mut changed = Runtime::new_selected(&selected).unwrap();
        assert_eq!(
            original.invoke_json("guarded", &input).unwrap().json(),
            changed.invoke_json("guarded", &input).unwrap().json()
        );
    }
    for name in ["unguarded", "stale_guard"] {
        assert!(optimisation::check(&m, &pack(&m, &c, vec![conditional(&m, name)])).is_err());
    }
    let subject = optimisation::subject(&m).unwrap();
    assert!(!subject
        .functions
        .iter()
        .any(|(key, t)| key.starts_with("@action/alias/")
            && matches!(&t.node,Node::Op(op,_) if op=="binary:||")));
    let mut wrong = conditional(&m, "guarded");
    wrong.function = "@action/guarded/999999".into();
    assert!(optimisation::check(&m, &pack(&m, &c, vec![wrong])).is_err());
    let empty = optimisation::check(&m, &pack(&m, &c, vec![])).unwrap();
    assert_eq!(empty.module().bytes().unwrap(), m.bytes().unwrap());
}
#[test]
fn a_single_checked_database_law_rewrites_a_real_change_region() {
    let m = module();
    let c = catalogue();
    let subject = optimisation::subject(&m).unwrap();
    let (key,t)=subject.functions.iter().find(|(key,t)|key.starts_with("@action/put/")&&matches!(&t.node,Node::Op(op,args) if op=="binary:+"&&matches!(args[1].node,Node::Word(0)))).unwrap();
    let Node::Op(_, args) = &t.node else {
        unreachable!()
    };
    let law=c.roots.iter().find(|id|c.objects[*id].from.sort==s::value(Type::U32)&&c.objects[*id].params.len()==1&&matches!(&c.objects[*id].from.node,Node::Op(op,args) if op=="binary:+"&&matches!(args[1].node,Node::Word(0)))).unwrap().clone();
    let selection = optimisation::check(
        &m,
        &pack(
            &m,
            &c,
            vec![Site {
                function: key.clone(),
                path: vec![],
                law,
                arguments: BTreeMap::from([("x".into(), args[0].clone())]),
                premises: vec![],
            }],
        ),
    )
    .unwrap();
    assert_ne!(
        selection.module().identity().unwrap(),
        m.identity().unwrap()
    );
    let layout = verified_language::snapshot::selected_layout(&selection).unwrap();
    assert_eq!(
        layout,
        verified_language::snapshot::layout(m.program()).unwrap()
    );
    let mut original = Runtime::new(m.program().clone()).unwrap();
    let mut changed = Runtime::new_selected(&selection).unwrap();
    for step in script() {
        assert_eq!(
            original
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json(),
            changed
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json()
        );
        assert_eq!(
            original.checkpoint_portable().unwrap(),
            changed.checkpoint_portable().unwrap()
        );
        assert_eq!(
            original.checkpoint().unwrap(),
            changed.checkpoint().unwrap()
        );
        changed = Runtime::restore_portable_selected(
            &selection,
            &original.checkpoint_portable().unwrap(),
        )
        .unwrap();
        original = Runtime::restore(m.program().clone(), &changed.checkpoint().unwrap()).unwrap();
    }
    let bytes = original.checkpoint_portable().unwrap();
    assert!(Runtime::restore_portable(selection.module().program().clone(), &bytes).is_err());
    let mut unrelated = m.program().clone();
    unrelated.module = "another_application".into();
    let unrelated = Runtime::new(unrelated)
        .unwrap()
        .checkpoint_portable()
        .unwrap();
    assert!(Runtime::restore_portable_selected(&selection, &unrelated).is_err());
    let mut corrupted = bytes;
    corrupted[20] ^= 1;
    assert!(Runtime::restore_portable_selected(&selection, &corrupted).is_err());
}
fn selected_by_database(m: &CheckedModule, dir: &Path, budget: usize) -> Package {
    std::fs::create_dir_all(dir).unwrap();
    let input = dir.join("core.json");
    let output = dir.join("selection.json");
    std::fs::write(&input, m.bytes().unwrap()).unwrap();
    let out = Command::new("python3")
        .env(
            "PYTHONPATH",
            format!(
                "{}:{}",
                Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("planner")
                    .display(),
                Path::new(env!("CARGO_MANIFEST_DIR"))
                    .join("knowledge")
                    .display()
            ),
        )
        .args([
            "-m",
            "ink_planner.semantic_search",
            "--compiler",
            env!("CARGO_BIN_EXE_ink"),
            "--core",
            input.to_str().unwrap(),
            "--snapshot",
            "knowledge/store/snapshot.json",
            "-o",
            output.to_str().unwrap(),
            "--budget",
            &budget.to_string(),
        ])
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    std::fs::write(dir.join("search.log"), out.stdout).unwrap();
    serde_json::from_slice(&std::fs::read(output).unwrap()).unwrap()
}
fn script() -> Vec<Json> {
    let id = "00000000000000000000000000000001";
    vec![
        json!({"call":"put","args":[id,u32::MAX]}),
        json!({"call":"get","args":[id]}),
        json!({"call":"fail","args":[7]}),
        json!({"call":"nested","args":[id,9]}),
        json!({"call":"get","args":[id]}),
        json!({"call":"echo","args":[[0,1,u32::MAX]]}),
        json!({"call":"captured","args":[u32::MAX,[0,1,2]]}),
        json!({"call":"shadow","args":[99,[0,1,u32::MAX]]}),
        json!({"call":"guarded","args":[u32::MAX,0]}),
        json!({"call":"guarded","args":[u32::MAX,1]}),
        json!({"call":"stale_guard","args":[4,0,[1,2]]}),
        json!({"call":"alias","args":[true]}),
    ]
}
#[test]
fn unchanged_query_engine_discovers_action_rules_and_frozen_selection_replays() {
    let m = module();
    let root = Path::new("build/action-rule-search");
    let p = selected_by_database(&m, root, 512);
    let selected = optimisation::check(&m, &p).unwrap();
    assert!(p
        .applications
        .iter()
        .any(|s| s.function.starts_with("@action/put/")));
    assert!(p
        .applications
        .iter()
        .any(|s| s.function.starts_with("@action/echo/")));
    assert!(p
        .applications
        .iter()
        .any(|s| s.function.starts_with("@action/guarded/")));
    let replay: Package = serde_json::from_slice(&serde_json::to_vec(&p).unwrap()).unwrap();
    assert_eq!(
        optimisation::check(&m, &replay)
            .unwrap()
            .module()
            .identity()
            .unwrap(),
        selected.module().identity().unwrap()
    );
    let second = selected_by_database(&m, &root.join("repeat"), 512);
    assert_eq!(
        serde_json::to_vec(&p).unwrap(),
        serde_json::to_vec(&second).unwrap()
    );
    let fallback = selected_by_database(&m, &root.join("exhausted"), 0);
    assert!(fallback.applications.is_empty());
    assert_eq!(
        optimisation::check(&m, &fallback)
            .unwrap()
            .module()
            .identity()
            .unwrap(),
        m.identity().unwrap()
    );
    let mut original = Runtime::new(m.program().clone()).unwrap();
    let mut changed = Runtime::new_selected(&selected).unwrap();
    for step in script() {
        assert_eq!(
            original
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json(),
            changed
                .invoke_json(step["call"].as_str().unwrap(), &step["args"])
                .unwrap()
                .json()
        );
        assert_eq!(
            original.checkpoint_portable().unwrap(),
            changed.checkpoint_portable().unwrap()
        );
    }
    std::fs::write(
        root.join("script.json"),
        serde_json::to_vec(&script()).unwrap(),
    )
    .unwrap();
    std::fs::write(root.join("empty.json"), b"[]").unwrap();
    let execute = |selected: bool, input: &str, restore: Option<&str>, output: &str| {
        let mut command = Command::new(env!("CARGO_BIN_EXE_ink"));
        command.args([
            "execute",
            root.join("core.json").to_str().unwrap(),
            root.join(input).to_str().unwrap(),
            "--core",
            "--portable",
            "--snapshot-out",
            root.join(output).to_str().unwrap(),
        ]);
        if selected {
            command.args(["--selection", root.join("selection.json").to_str().unwrap()]);
        }
        if let Some(file) = restore {
            command.args(["--restore", root.join(file).to_str().unwrap()]);
        }
        let out = command.output().unwrap();
        assert!(
            out.status.success(),
            "{}",
            String::from_utf8_lossy(&out.stderr)
        );
        serde_json::from_slice::<Json>(&out.stdout).unwrap()
    };
    assert_eq!(
        execute(false, "script.json", None, "baseline.snapshot"),
        execute(true, "script.json", None, "selected.snapshot")
    );
    execute(
        true,
        "empty.json",
        Some("baseline.snapshot"),
        "continued-selected.snapshot",
    );
    execute(
        false,
        "empty.json",
        Some("selected.snapshot"),
        "continued-baseline.snapshot",
    );
    let baseline = std::fs::read(root.join("baseline.snapshot")).unwrap();
    for file in [
        "selected.snapshot",
        "continued-selected.snapshot",
        "continued-baseline.snapshot",
    ] {
        assert_eq!(baseline, std::fs::read(root.join(file)).unwrap());
    }
    let mut wrong = p;
    wrong.input_core_sha256 = "0".repeat(64);
    assert!(optimisation::check(&m, &wrong).is_err());
}
#[test]
fn selected_action_regions_preserve_all_compiled_values_aborts_events_and_snapshots() {
    let m = module();
    let package = selected_by_database(&m, Path::new("build/action-rule-native-search"), 512);
    let selected = optimisation::check(&m, &package).unwrap();
    let mut reference = Runtime::new(m.program().clone()).unwrap();
    let mut expected = vec![];
    let mut steps = script();
    for step in &steps {
        let outcome = reference
            .invoke_json(step["call"].as_str().unwrap(), &step["args"])
            .unwrap()
            .json();
        expected.push(json!({"reply":{"outcome":outcome},
            "snapshot":reference.checkpoint_portable().unwrap()}));
    }
    let snapshot = reference.checkpoint_portable().unwrap();
    steps.push(json!({"restore":snapshot}));
    steps.push(json!({"call":"put","args":["00000000000000000000000000000001",3]}));
    let outcome = reference
        .invoke_json("put", &steps.last().unwrap()["args"])
        .unwrap()
        .json();
    expected.push(json!({"reply":{"outcome":outcome},
        "snapshot":reference.checkpoint_portable().unwrap()}));
    parity::conformance_selected("action-rule-parity", &selected, APP, steps, expected);
}
