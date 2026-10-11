//! Checked mathematical foundations for state/query composition. These tests
//! deliberately instantiate abstract laws before claiming concrete authority.
use serde_json::{json, Value};
use std::{collections::BTreeMap, fs, path::PathBuf, process::Command};
use verified_language::{
    action_model::Projection,
    core::CheckedModule,
    logic::{Context, Proof, Sort, Term},
    registry::{Bundle, CheckedBundle},
    syntax::parse,
};
static NEXT: std::sync::atomic::AtomicUsize = std::sync::atomic::AtomicUsize::new(0);
fn fixture() -> (Context, BTreeMap<String, String>) {
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join(format!(
        "build/composable-state-laws-{}-{}",
        std::process::id(),
        NEXT.fetch_add(1, std::sync::atomic::Ordering::Relaxed)
    ));
    fs::create_dir_all(&root).unwrap();
    let output = Command::new("python3")
        .args(["knowledge/producers/state_calculus.py"])
        .arg(root.join("database"))
        .arg("--view")
        .arg(root.join("view.json"))
        .output()
        .unwrap();
    assert!(
        output.status.success(),
        "{}",
        String::from_utf8_lossy(&output.stderr)
    );
    let bundle: Bundle =
        serde_json::from_slice(&fs::read(root.join("view.json")).unwrap()).unwrap();
    let names =
        serde_json::from_slice(&fs::read(root.join("database/store/names.json")).unwrap()).unwrap();
    (
        CheckedBundle::check(&bundle)
            .unwrap()
            .first_order_context()
            .unwrap(),
        names,
    )
}
fn term(v: Value) -> Term {
    serde_json::from_value(v).unwrap()
}
fn call(f: &str, args: Vec<Value>) -> Value {
    json!({"Call":{"function":f,"arguments":args}})
}
fn var(s: &str) -> Value {
    json!({"Var":s})
}
#[test]
fn constructor_cases_substitute_premises_without_inventing_induction_hypotheses() {
    use verified_language::logic::Equation;
    let mut c = Context::default();
    c.declare(
        "pair".into(),
        &serde_json::from_value(
            json!({"Datatype":{"constructors":[{"name":"Pair","fields":["U64","U64"]}]}}),
        )
        .unwrap(),
    )
    .unwrap();
    c.declare("first".into(),&serde_json::from_value(json!({"Function":{"params":[["pair",{"Data":"pair"}]],"result":"U64","recursive":null,"body":{"Match":{"scrutinee":var("pair"),"branches":[{"bindings":["a","b"],"body":var("a")}]}}}})).unwrap()).unwrap();
    let from = term(call("first", vec![var("pair")]));
    let to = term(var("expected"));
    let params = vec![
        ("pair".into(), Sort::Data("pair".into())),
        ("expected".into(), Sort::U64),
    ];
    let conditions = vec![Equation {
        from: from.clone(),
        to: to.clone(),
    }];
    let proof = json!({"Cases":{"variable":"pair","from":from,"to":to,"cases":[{"bindings":["a","b"],"proof":{"Hypothesis":0}}]}});
    c.check(
        &params,
        &conditions,
        &from,
        &to,
        &serde_json::from_value(proof.clone()).unwrap(),
    )
    .unwrap();
    assert!(c
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value(proof.clone()).unwrap()
        )
        .is_err());
    let mut missing = proof.clone();
    missing["Cases"]["cases"] = json!([]);
    assert!(c
        .check(
            &params,
            &conditions,
            &from,
            &to,
            &serde_json::from_value(missing).unwrap()
        )
        .is_err());
    let mut shadowed = proof;
    shadowed["Cases"]["cases"][0]["bindings"] = json!(["expected", "b"]);
    assert!(c
        .check(
            &params,
            &conditions,
            &from,
            &to,
            &serde_json::from_value(shadowed).unwrap()
        )
        .is_err());
    c.declare("list".into(),&serde_json::from_value(json!({"Datatype":{"constructors":[{"name":"Nil","fields":[]},{"name":"Cons","fields":["U64","SelfType"]}]}})).unwrap()).unwrap();
    let nil = json!({"Construct":{"datatype":"list","constructor":0,"arguments":[]}});
    let forged = json!({"Cases":{"variable":"xs","from":var("xs"),"to":nil,"cases":[{"bindings":[],"proof":{"Refl":nil}},{"bindings":["head","tail"],"proof":{"Hypothesis":0}}]}});
    assert!(c
        .check(
            &[("xs".into(), Sort::Data("list".into()))],
            &[],
            &term(var("xs")),
            &term(nil),
            &serde_json::from_value(forged).unwrap()
        )
        .is_err());
}
#[test]
fn parameterized_key_locality_is_instantiated_and_false_key_mapping_is_rejected() {
    let (mut context, names) = fixture();
    let module=CheckedModule::from_source(parse("module keys;state Rows:Table<u64,u64> = Table.empty();query read(key:u64)->Option<u64> reads(Rows){return Rows.get(key);}").unwrap()).unwrap();
    let projection = Projection::derive(&module).unwrap();
    let source = projection.context().unwrap();
    for i in projection.objects.keys() {
        context.import(&source, i).unwrap();
    }
    let t = &projection.tables[0];
    let option = projection.objects[&t.get].payload["declaration"]["Function"]["result"]["Data"]
        .as_str()
        .unwrap();
    let params = vec![
        ("rows".into(), Sort::Data(t.datatype.clone())),
        ("key".into(), Sort::U64),
        ("query".into(), Sort::U64),
    ];
    let none = json!({"Construct":{"datatype":option,"constructor":0,"arguments":[]}});
    let condition = json!({"Binary":{"op":"==","left":var("query"),"right":var("key")}});
    let masked = |v: Value| json!({"If":{"condition":condition,"on_true":none,"on_false":v}});
    let from = term(masked(call(
        &t.get,
        vec![call(&t.remove, vec![var("rows"), var("key")]), var("query")],
    )));
    let to = term(masked(call(&t.get, vec![var("rows"), var("query")])));
    let proof = json!({"Instance":{"theorem":names["lookup_remove_other_key"],"sorts":{names["StateRow"].clone():"U64"},"functions":{},"definitions":{names["WordRows"].clone():t.datatype,names["RowOption"].clone():option,names["get"].clone():t.get,names["remove"].clone():t.remove},"assumptions":{},"arguments":[var("rows"),var("key"),var("query")],"premises":[]}});
    context
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value::<Proof>(proof.clone()).unwrap(),
        )
        .unwrap();
    let mut wrong = proof;
    wrong["Instance"]["definitions"][&names["remove"]] = json!(t.replace);
    assert!(context
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value(wrong).unwrap()
        )
        .is_err());
    // Deleting the disjointness guard makes the claimed equality false.
    let unconditional = term(call(
        &t.get,
        vec![call(&t.remove, vec![var("rows"), var("key")]), var("query")],
    ));
    assert!(context
        .check(
            &params,
            &[],
            &unconditional,
            &to,
            &Proof::Convert {
                from: unconditional.clone(),
                to: to.clone()
            }
        )
        .is_err());
}
#[test]
fn open_repair_assumptions_cannot_authorize_a_closed_conclusion() {
    let (context, names) = fixture();
    let mut functions = BTreeMap::new();
    for (name, args, result) in [
        ("apply", vec!["s", "d"], var("s")),
        ("query", vec!["s"], var("s")),
        ("repair", vec!["v", "s", "d"], var("v")),
    ] {
        functions.insert(names[name].clone(), json!({"params":args,"body":result}));
    }
    let proof = json!({"Instance":{"theorem":names["repair_two_changes"],"sorts":{names["State"].clone():"U64",names["Change"].clone():"U64",names["View"].clone():"U64"},"functions":functions,"definitions":{},"assumptions":{},"arguments":[var("state"),var("change"),var("next_change")],"premises":[]}});
    let params = vec![
        ("state".into(), Sort::U64),
        ("change".into(), Sort::U64),
        ("next_change".into(), Sort::U64),
    ];
    assert!(context
        .check(
            &params,
            &[],
            &term(var("state")),
            &term(var("state")),
            &serde_json::from_value(proof.clone()).unwrap()
        )
        .unwrap_err()
        .contains("abstract parameters"));
    let mut discharged = proof;
    discharged["Instance"]["assumptions"][&names["repair_exact"]] = json!({"Refl":var("state")});
    context
        .check(
            &params,
            &[],
            &term(var("state")),
            &term(var("state")),
            &serde_json::from_value(discharged).unwrap(),
        )
        .unwrap();
}

#[test]
fn field_frontier_requires_a_proof_for_the_actual_row_update() {
    let (mut context, n) = fixture();
    let declare = |c: &mut Context, name: &str, v: Value| {
        c.declare(name.into(), &serde_json::from_value(v).unwrap())
            .unwrap();
    };
    let ctor = |d: &str, tag: usize, args: Vec<Value>| json!({"Construct":{"datatype":d,"constructor":tag,"arguments":args}});
    let branch = |names: Vec<&str>, body: Value| json!({"bindings":names,"body":body});
    let matched = |scrutinee: Value, branches: Vec<Value>| json!({"Match":{"scrutinee":scrutinee,"branches":branches}});
    let row = ctor("concrete_row", 0, vec![var("left"), var("right")]);
    declare(
        &mut context,
        "concrete_row",
        json!({"Datatype":{"constructors":[{"name":"Pair","fields":["U64","U64"]}]}}),
    );
    declare(
        &mut context,
        "concrete_rows",
        json!({"Datatype":{"constructors":[{"name":"Nil","fields":[]},{"name":"Cons","fields":["U64",{"Data":"concrete_row"},"SelfType"]}]}}),
    );
    declare(
        &mut context,
        "field_option",
        json!({"Datatype":{"constructors":[{"name":"None","fields":[]},{"name":"Some","fields":["U64"]}]}}),
    );
    let observe = matched(var("row"), vec![branch(vec!["left", "right"], var("left"))]);
    let update = matched(
        var("row"),
        vec![branch(
            vec!["left", "right"],
            ctor("concrete_row", 0, vec![var("left"), var("change")]),
        )],
    );
    let observed_value = matched(
        var("value"),
        vec![branch(vec!["left", "right"], var("left"))],
    );
    let updated_value = matched(
        var("value"),
        vec![branch(
            vec!["left", "right"],
            ctor("concrete_row", 0, vec![var("left"), var("change")]),
        )],
    );
    let guard = |key: &str| json!({"Binary":{"op":"==","left":var(key),"right":var("head")}});
    let choose = |condition: Value, t: Value, f: Value| json!({"If":{"condition":condition,"on_true":t,"on_false":f}});
    declare(
        &mut context,
        "read_field",
        json!({"Function":{"params":[["rows",{"Data":"concrete_rows"}],["query","U64"]],"result":{"Data":"field_option"},"recursive":0,"body":matched(var("rows"),vec![branch(vec![],ctor("field_option",0,vec![])),branch(vec!["head","value","tail"],choose(guard("query"),ctor("field_option",1,vec![observed_value]),json!({"SelfCall":[var("tail"),var("query")]})))])}}),
    );
    declare(
        &mut context,
        "write_other",
        json!({"Function":{"params":[["rows",{"Data":"concrete_rows"}],["key","U64"],["change","U64"]],"result":{"Data":"concrete_rows"},"recursive":0,"body":matched(var("rows"),vec![branch(vec![],ctor("concrete_rows",0,vec![])),branch(vec!["head","value","tail"],ctor("concrete_rows",1,vec![var("head"),choose(guard("key"),updated_value,var("value")),json!({"SelfCall":[var("tail"),var("key"),var("change")]} )]))])}}),
    );
    let changed_observed = matched(
        update.clone(),
        vec![branch(vec!["left", "right"], var("left"))],
    );
    let preservation = json!({"Induction":{"variable":"row","from":changed_observed,"to":observe,"cases":[{"bindings":["left","right"],"proof":{"Refl":var("left")}}]}});
    let instance = json!({"Instance":{"theorem":n["other_field_does_not_invalidate_lookup"],"sorts":{n["DependencyRow"].clone():{"Data":"concrete_row"},n["ObservedField"].clone():"U64",n["OtherFieldChange"].clone():"U64"},"functions":{n["observe_field"].clone():{"params":["row"],"body":observe},n["change_other_field"].clone():{"params":["row","change"],"body":update}},"definitions":{n["DependencyRows"].clone():"concrete_rows",n["FieldOption"].clone():"field_option",n["lookup_observed_field"].clone():"read_field",n["write_other_field"].clone():"write_other"},"assumptions":{n["other_field_preserves_observation"].clone():preservation},"arguments":[var("rows"),var("key"),var("query"),var("change")],"premises":[]}});
    let params = vec![
        ("rows".into(), Sort::Data("concrete_rows".into())),
        ("key".into(), Sort::U64),
        ("query".into(), Sort::U64),
        ("change".into(), Sort::U64),
    ];
    let from = term(call(
        "read_field",
        vec![
            call("write_other", vec![var("rows"), var("key"), var("change")]),
            var("query"),
        ],
    ));
    let to = term(call("read_field", vec![var("rows"), var("query")]));
    context
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value(instance.clone()).unwrap(),
        )
        .unwrap();
    let mut unproved = instance;
    unproved["Instance"]["assumptions"] = json!({});
    assert!(context
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value(unproved).unwrap()
        )
        .is_err());
    let _ = row;
}

#[test]
fn parameterised_group_repair_is_bound_to_source_query_and_exact_contribution() {
    let source = include_str!("../examples/grouped-state.ink");
    let module = CheckedModule::from_source(parse(source).unwrap()).unwrap();
    let model = Projection::derive(&module).unwrap();
    let root = PathBuf::from(env!("CARGO_MANIFEST_DIR")).join("build/composable-source-groups");
    fs::create_dir_all(&root).unwrap();
    fs::write(root.join("model.json"), serde_json::to_vec(&model).unwrap()).unwrap();
    let out = Command::new("python3")
        .arg("knowledge/producers/source_grouped_laws.py")
        .arg(root.join("model.json"))
        .arg("-o")
        .arg(root.join("view.json"))
        .output()
        .unwrap();
    assert!(
        out.status.success(),
        "{}",
        String::from_utf8_lossy(&out.stderr)
    );
    let bundle: Bundle =
        serde_json::from_slice(&fs::read(root.join("view.json")).unwrap()).unwrap();
    let mut context = CheckedBundle::check(&bundle)
        .unwrap()
        .first_order_context()
        .unwrap();
    let names: BTreeMap<String, String> =
        serde_json::from_slice(&fs::read(root.join("grouped-database/store/names.json")).unwrap())
            .unwrap();
    let table = &model.tables[0];
    let rows = var("rows");
    let key = var("key");
    let query = var("query");
    let new = var("new");
    let total = &names["source_group_total"];
    let delta = &names["source_group_delta_replace"];
    let from = term(call(
        total,
        vec![
            call(&table.replace, vec![rows.clone(), key.clone(), new.clone()]),
            query.clone(),
        ],
    ));
    let to = term(
        json!({"Binary":{"op":"+","left":call(total,vec![rows.clone(),query.clone()]),"right":call(delta,vec![rows.clone(),key.clone(),query.clone(),new.clone()])}}),
    );
    let params = vec![
        ("rows".into(), Sort::Data(table.datatype.clone())),
        ("key".into(), Sort::U64),
        ("query".into(), Sort::U64),
        ("new".into(), Sort::U64),
    ];
    let definitions = json!({names["AggregateRows"].clone():table.datatype,names["group_source_remove"].clone():table.remove,names["group_source_replace"].clone():table.replace,names["group_total"].clone():total,names["group_delta_remove"].clone():names["source_group_delta_remove"],names["group_delta_replace"].clone():delta});
    let mut proof = json!({"Instance":{"theorem":names["group_replace_repair_exact"],"sorts":{names["AggregateRow"].clone():"U64"},"functions":{names["group_contribution"].clone():{"params":["value","query"],"body":bundle.objects[&names["source_group_contribution"]].payload["declaration"]["Function"]["body"]}},"definitions":definitions,"assumptions":{},"arguments":[rows,key,query,new],"premises":[]}});
    context
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value(proof.clone()).unwrap(),
        )
        .unwrap();
    context.declare("wrong_contribution".into(),&serde_json::from_value(json!({"Function":{"params":[["value","U64"],["query","U64"]],"result":"U64","recursive":null,"body":{"Binary":{"op":"+","left":var("value"),"right":{"U64":1}}}}})).unwrap()).unwrap();
    proof["Instance"]["functions"][&names["group_contribution"]] = json!({"params":["value","query"],"body":call("wrong_contribution",vec![var("value"),var("query")])});
    assert!(context
        .check(
            &params,
            &[],
            &from,
            &to,
            &serde_json::from_value(proof).unwrap()
        )
        .is_err());
}
