//! General (parametric) laws: stated once over abstract sorts, functions and
//! assumptions, checked once, and reachable by concrete obligations only
//! through `Proof::Instance`, which interprets every abstract symbol, checks
//! each mapped definition against the instantiated one, and requires a proof
//! of every assumption.
use serde_json::{json, Value};
use std::{collections::BTreeMap, path::Path};
use verified_language::{
    library,
    logic::{Context, Declaration, Proof, Sort, Term},
};

fn laws() -> (Context, BTreeMap<String, String>) {
    let root = Path::new(env!("CARGO_MANIFEST_DIR")).join("knowledge/research/general-laws");
    let names: BTreeMap<String, String> =
        serde_json::from_slice(&std::fs::read(root.join("names.json")).unwrap()).unwrap();
    let library = library::load(&root.join("lock.json")).unwrap();
    (library.context, names)
}
fn term(v: Value) -> Term {
    serde_json::from_value(v).unwrap()
}
fn proof(v: Value) -> Proof {
    serde_json::from_value(v).unwrap()
}
fn declare(c: &mut Context, id: &str, v: Value) -> Result<(), String> {
    c.declare(id.into(), &serde_json::from_value::<Declaration>(v).unwrap())
}
fn var(n: &str) -> Value {
    json!({"Var": n})
}
fn call(f: &str, args: Vec<Value>) -> Value {
    json!({"Call": {"function": f, "arguments": args}})
}
fn ctor(d: &str, i: usize, args: Vec<Value>) -> Value {
    json!({"Construct": {"datatype": d, "constructor": i, "arguments": args}})
}
fn bin(op: &str, l: Value, r: Value) -> Value {
    json!({"Binary": {"op": op, "left": l, "right": r}})
}
fn list_fn(item: Value) -> Value {
    // match xs { Nil => Nil, Cons(head, tail) => Cons(item, self(tail)) }
    json!({"Function": {"params": [["xs", {"Data": "u64_list"}]], "result": {"Data": "u64_list"},
        "recursive": 0, "body": {"Match": {"scrutinee": var("xs"), "branches": [
            {"bindings": [], "body": ctor("u64_list", 0, vec![])},
            {"bindings": ["head", "tail"], "body": ctor("u64_list", 1, vec![item, json!({"SelfCall": [var("tail")]})])}]}}}})
}
fn fold_fn(source: &str, result: Value, empty: Value, step: Value) -> Value {
    json!({"Function": {"params": [["xs", {"Data": source}]], "result": result, "recursive": 0,
        "body": {"Match": {"scrutinee": var("xs"), "branches": [
            {"bindings": [], "body": empty},
            {"bindings": ["head", "tail"], "body": step}]}}}})
}
fn self_tail() -> Value {
    json!({"SelfCall": [var("tail")]})
}
fn lambda(params: &[&str], body: Value) -> Value {
    json!({"params": params, "body": body})
}

/// Concrete U64 world: increment map, Σ 2x over images, Σ 2(x+1) over elements.
fn sum_map_world() -> (Context, BTreeMap<String, String>) {
    let (mut c, names) = laws();
    declare(&mut c, "u64_list", json!({"Datatype": {"constructors": [
        {"name": "Nil", "fields": []}, {"name": "Cons", "fields": ["U64", "SelfType"]}]}})).unwrap();
    declare(&mut c, "inc_map", list_fn(bin("+", var("head"), json!({"U64": 1})))).unwrap();
    declare(&mut c, "inc2_map", list_fn(bin("+", var("head"), json!({"U64": 2})))).unwrap();
    declare(&mut c, "sum_double", fold_fn("u64_list", json!("U64"), json!({"U64": 0}),
        bin("+", self_tail(), bin("*", var("head"), json!({"U64": 2}))))).unwrap();
    declare(&mut c, "inc_double", json!({"Function": {"params": [["value", "U64"]], "result": "U64",
        "recursive": null, "body": bin("*", bin("+", var("value"), json!({"U64": 1})), json!({"U64": 2}))}})).unwrap();
    declare(&mut c, "sum_inc_double", fold_fn("u64_list", json!("U64"), json!({"U64": 0}),
        bin("+", self_tail(), call("inc_double", vec![var("head")])))).unwrap();
    (c, names)
}
fn sum_map_instance(n: &BTreeMap<String, String>) -> Value {
    json!({"Instance": {
        "theorem": n["sum_map"],
        "sorts": {n["Element"].clone(): "U64", n["Image"].clone(): "U64", n["Total"].clone(): "U64"},
        "functions": {
            n["plus"].clone(): lambda(&["a", "b"], bin("+", var("a"), var("b"))),
            n["zero"].clone(): lambda(&[], json!({"U64": 0})),
            n["map_function"].clone(): lambda(&["head"], bin("+", var("head"), json!({"U64": 1}))),
            n["image_weight"].clone(): lambda(&["head"], bin("*", var("head"), json!({"U64": 2}))),
        },
        "definitions": {
            n["ElementList"].clone(): "u64_list", n["ImageList"].clone(): "u64_list",
            n["map"].clone(): "inc_map", n["sum_images"].clone(): "sum_double",
            n["weight_after_map"].clone(): "inc_double", n["sum_weight_after_map"].clone(): "sum_inc_double",
        },
        "assumptions": {}, "arguments": [var("xs")], "premises": []}})
}
fn check_sum_map(c: &Context, p: Value) -> Result<(), String> {
    let list = vec![("xs".to_string(), Sort::Data("u64_list".into()))];
    c.check(
        &list,
        &[],
        &term(call("sum_double", vec![call("inc_map", vec![var("xs")])])),
        &term(call("sum_inc_double", vec![var("xs")])),
        &proof(p),
    )
}

#[test]
fn general_law_instantiates_for_a_concrete_program() {
    let (c, n) = sum_map_world();
    check_sum_map(&c, sum_map_instance(&n)).unwrap();
}

#[test]
fn instance_rejects_wrong_or_incomplete_interpretations() {
    let (c, n) = sum_map_world();
    let base = sum_map_instance(&n);
    let edit = |f: &dyn Fn(&mut Value)| {
        let mut v = base.clone();
        f(&mut v["Instance"]);
        check_sum_map(&c, v).unwrap_err()
    };
    // The mapped definition computes x + 2, not the interpreted f(x) = x + 1.
    let err = edit(&|i| i["definitions"][&n["map"]] = json!("inc2_map"));
    assert!(err.contains("body differs"), "{err}");
    // Missing and extra abstract interpretations.
    let err = edit(&|i| {
        i["functions"].as_object_mut().unwrap().remove(&n["zero"]);
    });
    assert!(err.contains("exactly"), "{err}");
    let err = edit(&|i| i["sorts"][&n["Source"]] = json!("U64"));
    assert!(err.contains("exactly"), "{err}");
    // An open lambda and an ill-typed lambda.
    let err = edit(&|i| i["functions"][&n["map_function"]] = lambda(&["head"], var("other")));
    assert!(err.contains("unbound"), "{err}");
    let err = edit(&|i| i["functions"][&n["map_function"]] = lambda(&["head"], json!({"Bool": true})));
    assert!(err.contains("type"), "{err}");
    // An unmapped parametric definition reached by the statement.
    let err = edit(&|i| {
        i["definitions"].as_object_mut().unwrap().remove(&n["sum_images"]);
    });
    assert!(err.contains("parametric"), "{err}");
    // Only parametric definitions can be mapped.
    let err = edit(&|i| i["definitions"]["u64_list"] = json!("u64_list"));
    assert!(err.contains("only parametric"), "{err}");
    // A wrongly sorted datatype interpretation.
    let err = edit(&|i| i["sorts"][&n["Image"]] = json!("Bool"));
    assert!(!err.is_empty());
}

#[test]
fn general_laws_never_reach_a_conclusion_directly() {
    let (c, n) = laws();
    let list = Sort::Data(n["ElementList"].clone());
    let err = c
        .check(
            &[("xs".into(), list)],
            &[],
            &term(call(&n["sum"], vec![call(&n["filter"], vec![var("xs")])])),
            &term(call(&n["sum_guarded_weight"], vec![var("xs")])),
            &proof(json!({"Use": {"theorem": n["sum_filter"], "arguments": [var("xs")], "premises": []}})),
        )
        .unwrap_err();
    assert!(err.contains("abstract parameters or assumptions"), "{err}");
}

/// Peano naturals with addition recursing on its second argument, so
/// `add(a, Zero) = a` holds by computation.
fn counting_world(zero: Value) -> (Context, BTreeMap<String, String>) {
    let (mut c, names) = laws();
    declare(&mut c, "u64_list", json!({"Datatype": {"constructors": [
        {"name": "Nil", "fields": []}, {"name": "Cons", "fields": ["U64", "SelfType"]}]}})).unwrap();
    declare(&mut c, "nat", json!({"Datatype": {"constructors": [
        {"name": "Zero", "fields": []}, {"name": "Succ", "fields": ["SelfType"]}]}})).unwrap();
    declare(&mut c, "nat_add", json!({"Function": {"params": [["a", {"Data": "nat"}], ["b", {"Data": "nat"}]],
        "result": {"Data": "nat"}, "recursive": 1, "body": {"Match": {"scrutinee": var("b"), "branches": [
            {"bindings": [], "body": var("a")},
            {"bindings": ["p"], "body": ctor("nat", 1, vec![json!({"SelfCall": [var("a"), var("p")]})])}]}}}})).unwrap();
    let one = ctor("nat", 1, vec![ctor("nat", 0, vec![])]);
    let small = bin("<", var("head"), json!({"U64": 10}));
    declare(&mut c, "small", json!({"Function": {"params": [["xs", {"Data": "u64_list"}]],
        "result": {"Data": "u64_list"}, "recursive": 0, "body": {"Match": {"scrutinee": var("xs"), "branches": [
            {"bindings": [], "body": ctor("u64_list", 0, vec![])},
            {"bindings": ["head", "tail"], "body": {"If": {"condition": small,
                "on_true": ctor("u64_list", 1, vec![var("head"), self_tail()]), "on_false": self_tail()}}}]}}}})).unwrap();
    declare(&mut c, "count", fold_fn("u64_list", json!({"Data": "nat"}), zero.clone(),
        call("nat_add", vec![self_tail(), one.clone()]))).unwrap();
    declare(&mut c, "small_one", json!({"Function": {"params": [["head", "U64"]], "result": {"Data": "nat"},
        "recursive": null, "body": {"If": {"condition": small, "on_true": one, "on_false": zero.clone()}}}})).unwrap();
    declare(&mut c, "count_small", fold_fn("u64_list", json!({"Data": "nat"}), zero,
        call("nat_add", vec![self_tail(), call("small_one", vec![var("head")])]))).unwrap();
    (c, names)
}
fn sum_filter_instance(n: &BTreeMap<String, String>, zero: Value, discharge: Option<Value>) -> Value {
    let mut assumptions = serde_json::Map::new();
    if let Some(p) = discharge {
        assumptions.insert(n["zero_right"].clone(), p);
    }
    json!({"Instance": {
        "theorem": n["sum_filter"],
        "sorts": {n["Element"].clone(): "U64", n["Total"].clone(): {"Data": "nat"}},
        "functions": {
            n["plus"].clone(): lambda(&["a", "b"], call("nat_add", vec![var("a"), var("b")])),
            n["zero"].clone(): lambda(&[], zero),
            n["predicate"].clone(): lambda(&["head"], bin("<", var("head"), json!({"U64": 10}))),
            n["weight"].clone(): lambda(&["head"], ctor("nat", 1, vec![ctor("nat", 0, vec![])])),
        },
        "definitions": {
            n["ElementList"].clone(): "u64_list", n["filter"].clone(): "small", n["sum"].clone(): "count",
            n["guarded_weight"].clone(): "small_one", n["sum_guarded_weight"].clone(): "count_small",
        },
        "assumptions": assumptions, "arguments": [var("xs")], "premises": []}})
}
fn check_count(c: &Context, p: Value) -> Result<(), String> {
    c.check(
        &[("xs".into(), Sort::Data("u64_list".into()))],
        &[],
        &term(call("count", vec![call("small", vec![var("xs")])])),
        &term(call("count_small", vec![var("xs")])),
        &proof(p),
    )
}

#[test]
fn assumptions_must_be_proved_for_the_interpretation() {
    let zero = ctor("nat", 0, vec![]);
    let (c, n) = counting_world(zero.clone());
    let discharge = json!({"Convert": {"from": call("nat_add", vec![var("a"), zero.clone()]), "to": var("a")}});
    check_count(&c, sum_filter_instance(&n, zero.clone(), Some(discharge))).unwrap();
    let err = check_count(&c, sum_filter_instance(&n, zero.clone(), None)).unwrap_err();
    assert!(err.contains("exactly"), "{err}");

    // With "zero" interpreted as one, sum_filter is false: count([20]) under
    // the filter is 1 but the guarded count is 2. The assumption cannot be
    // discharged, so the instance is refused.
    let one = ctor("nat", 1, vec![zero.clone()]);
    let (c, n) = counting_world(one.clone());
    for discharge in [
        json!({"Convert": {"from": call("nat_add", vec![var("a"), one.clone()]), "to": var("a")}}),
        json!({"Refl": var("a")}),
    ] {
        let err = check_count(&c, sum_filter_instance(&n, one.clone(), Some(discharge))).unwrap_err();
        assert!(err.contains("discharge") || err.contains("computation"), "{err}");
    }
    assert_eq!(
        c.evaluate(&[], &term(call("count", vec![call("small", vec![ctor("u64_list", 1, vec![json!({"U64": 20}), ctor("u64_list", 0, vec![])])])]))).unwrap(),
        term(one.clone())
    );
    assert_eq!(
        c.evaluate(&[], &term(call("count_small", vec![ctor("u64_list", 1, vec![json!({"U64": 20}), ctor("u64_list", 0, vec![])])]))).unwrap(),
        term(ctor("nat", 1, vec![one]))
    );
}

#[test]
fn assumption_dependence_is_tracked_even_without_abstract_symbols() {
    let mut c = Context::default();
    declare(&mut c, "bogus", json!({"Assumption": {"params": [], "conditions": [],
        "from": {"U64": 0}, "to": {"U64": 1}}})).unwrap();
    declare(&mut c, "zero_is_one", json!({"Theorem": {"params": [], "conditions": [],
        "from": {"U64": 0}, "to": {"U64": 1},
        "proof": {"Use": {"theorem": "bogus", "arguments": [], "premises": []}}}})).unwrap();
    let goal = |p: Value| c.check(&[], &[], &term(json!({"U64": 0})), &term(json!({"U64": 1})), &proof(p));
    for p in [
        json!({"Use": {"theorem": "zero_is_one", "arguments": [], "premises": []}}),
        json!({"Use": {"theorem": "bogus", "arguments": [], "premises": []}}),
    ] {
        assert!(goal(p).unwrap_err().contains("abstract parameters or assumptions"));
    }
    let instance = |assumptions: Value| {
        json!({"Instance": {"theorem": "zero_is_one", "sorts": {}, "functions": {}, "definitions": {},
            "assumptions": assumptions, "arguments": [], "premises": []}})
    };
    assert!(goal(instance(json!({}))).unwrap_err().contains("exactly"));
    assert!(goal(instance(json!({"bogus": {"Refl": {"U64": 0}}}))).is_err());
    assert!(goal(instance(json!({"bogus": {"Convert": {"from": {"U64": 0}, "to": {"U64": 1}}}}))).is_err());
    // Proving a discharge with the very same assumption cannot close it.
    let circular = instance(json!({"bogus": {"Use": {
        "theorem": "bogus", "arguments": [], "premises": []
    }}}));
    assert!(goal(circular).unwrap_err().contains("abstract parameters or assumptions"));
}

#[test]
fn abstract_symbols_cannot_be_inspected_or_computed() {
    let mut c = Context::default();
    declare(&mut c, "opaque", json!({"AbstractSort": {"name": "opaque"}})).unwrap();
    declare(&mut c, "h", json!({"AbstractFunction": {"name": "h", "params": [["x", "U64"]], "result": "U64"}})).unwrap();
    // No match, construction or induction on an abstract sort.
    let err = declare(&mut c, "inspect", json!({"Function": {"params": [["x", {"Data": "opaque"}]], "result": "U64",
        "recursive": null, "body": {"Match": {"scrutinee": var("x"), "branches": []}}}})).unwrap_err();
    assert!(err.contains("datatype"), "{err}");
    let err = declare(&mut c, "build", json!({"Function": {"params": [], "result": {"Data": "opaque"},
        "recursive": null, "body": ctor("opaque", 0, vec![])}})).unwrap_err();
    assert!(err.contains("datatype"), "{err}");
    let err = declare(&mut c, "loop", json!({"Function": {"params": [["x", {"Data": "opaque"}]], "result": "U64",
        "recursive": 0, "body": {"U64": 0}}})).unwrap_err();
    assert!(err.contains("datatype"), "{err}");
    let err = declare(&mut c, "everything", json!({"Theorem": {"params": [["x", {"Data": "opaque"}]], "conditions": [],
        "from": {"U64": 0}, "to": {"U64": 1},
        "proof": {"Induction": {"variable": "x", "from": {"U64": 0}, "to": {"U64": 1}, "cases": []}}}})).unwrap_err();
    assert!(err.contains("datatype"), "{err}");
    // Abstract calls never compute.
    let err = declare(&mut c, "computes", json!({"Theorem": {"params": [], "conditions": [],
        "from": call("h", vec![json!({"U64": 0})]), "to": {"U64": 0},
        "proof": {"Convert": {"from": call("h", vec![json!({"U64": 0})]), "to": {"U64": 0}}}}})).unwrap_err();
    assert!(err.contains("computation"), "{err}");
    // Only Bool/U64/datatype/abstract sorts are sorts.
    let err = declare(&mut c, "bad", json!({"AbstractFunction": {"name": "bad", "params": [["x", {"Data": "h"}]], "result": "U64"}})).unwrap_err();
    assert!(err.contains("datatype"), "{err}");
}

#[test]
fn instantiated_lemmas_are_closed_and_reusable() {
    let (mut c, n) = sum_map_world();
    let list = json!({"Data": "u64_list"});
    declare(&mut c, "program_lemma", json!({"Theorem": {"params": [["xs", list]], "conditions": [],
        "from": call("sum_double", vec![call("inc_map", vec![var("xs")])]),
        "to": call("sum_inc_double", vec![var("xs")]), "proof": sum_map_instance(&n)}})).unwrap();
    check_sum_map(&c, json!({"Use": {"theorem": "program_lemma", "arguments": [var("xs")], "premises": []}})).unwrap();
    // A concrete value check of the instantiated law.
    let xs = ctor("u64_list", 1, vec![json!({"U64": 3}), ctor("u64_list", 1, vec![json!({"U64": 4}), ctor("u64_list", 0, vec![])])]);
    assert_eq!(
        c.evaluate(&[], &term(call("sum_double", vec![call("inc_map", vec![xs.clone()])]))).unwrap(),
        term(json!({"U64": 18}))
    );
    assert_eq!(c.evaluate(&[], &term(call("sum_inc_double", vec![xs]))).unwrap(), term(json!({"U64": 18})));
}

#[test]
fn canonical_store_admits_the_general_laws_and_rejects_a_false_one() {
    use verified_language::{core::CheckedModule, registry::CheckedBundle, syntax::parse};
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    // sum_filter without its zero_right assumption is false (zero = 1).
    let script = r#"
import json,copy,tempfile
from pathlib import Path
from ink_knowledge import Store,identity
s=Store('.'); names=json.loads(Path('store/names.json').read_text())
roots=[i for n,i in names.items() if n.startswith('general-laws/')]
accepted=s.bundle(roots)
old=names['general-laws/sum_filter']; small=s.bundle([old])
false=copy.deepcopy(small['objects'][old])
theorem=false['payload']['declaration']['Theorem']
theorem['to']={'Call':{'function':names['general-laws/sum'],'arguments':[{'Var':'xs'}]}}
with tempfile.TemporaryDirectory() as directory:
    objects=[false if i==old else o for i,o in small['objects'].items()]
    store=Store.publish(directory,objects)
    rejected=store.bundle([identity(false)])
    print(json.dumps({'accepted':accepted,'rejected':rejected,'count':len(roots)}))
"#;
    let output = std::process::Command::new("python3")
        .args(["-c", script])
        .current_dir(root.join("knowledge"))
        .output()
        .unwrap();
    assert!(output.status.success(), "{}", String::from_utf8_lossy(&output.stderr));
    let value: Value = serde_json::from_slice(&output.stdout).unwrap();
    let module = CheckedModule::from_source(
        parse("module review; fn identity(x:u64)->u64 { return x; }").unwrap(),
    )
    .unwrap();
    let accepted = serde_json::from_value(value["accepted"].clone()).unwrap();
    let checked = CheckedBundle::check(&accepted).unwrap();
    assert_eq!(checked.verify(module.program()).unwrap().len(), 46);
    assert_eq!(value["count"], 46);
    let rejected = serde_json::from_value(value["rejected"].clone()).unwrap();
    let error = CheckedBundle::check(&rejected)
        .unwrap()
        .verify(module.program())
        .unwrap_err();
    assert!(error.contains("different statement"), "{error}");
}
