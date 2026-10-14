use serde_json::{json, Value};
use std::{fs, path::Path};
use verified_language::{eval, modules, stateful::Runtime};
#[path = "support/parity.rs"]
mod parity;

fn node(items: Value, children: Vec<Value>) -> Value {
    json!({"payload":{"items":items},"children":children})
}

#[test]
fn recursive_interfaces_validate_nested_payloads_and_preserve_values_on_complete_targets() {
    let root = Path::new(env!("CARGO_MANIFEST_DIR"));
    let file = root.join("tests/fixtures/checked-trees/main.ink");
    let p = modules::load(&file).unwrap().program;
    let snapshot = Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();
    let leaf = node(json!(["é", "😀", ""]), vec![]);
    let tree = node(json!(["root"]), vec![leaf.clone(), node(json!([]), vec![leaf.clone()])]);
    let words = node(json!([0,u32::MAX]), vec![node(json!([7]),vec![])]);
    let item = json!({"name":"é","weights":[0,u32::MAX]});
    let records = node(json!([item]), vec![]);
    let replacement = json!({"items":["replacement"]});
    let mut cases = vec![
        ("copy",json!([tree.clone()]),tree.clone(),false),
        ("payload",json!([tree.clone()]),json!(["root"]),false),
        ("children",json!([tree.clone()]),tree["children"].clone(),false),
        ("node",json!([{"items":["root"]},tree["children"].clone()]),tree.clone(),false),
        ("replace",json!([tree.clone(),replacement]),node(json!(["replacement"]),tree["children"].as_array().unwrap().clone()),false),
        ("prune",json!([tree.clone()]),node(json!(["root"]),vec![]),false),
        ("word_copy",json!([words.clone()]),words,false),
        ("record_copy",json!([records.clone()]),records,false),
        ("numeric",json!([[0,u32::MAX]]),json!([1,0]),false),
    ];
    let bad_leaf = node(json!(["duplicate","duplicate"]),vec![]);
    let invalid = node(json!(["root"]),vec![node(json!([]),vec![bad_leaf.clone()])]);
    for name in ["copy","payload","children","prune"] {
        cases.push((name,json!([invalid.clone()]),json!(null),true));
    }
    cases.push(("node",json!([{"items":["root"]},[bad_leaf]]),json!(null),true));
    cases.push(("replace",json!([tree,{"items":["duplicate","duplicate"]}]),json!(null),true));
    cases.push(("word_copy",json!([node(json!([]),vec![node(json!([u32::MAX,u32::MAX]),vec![])])]),json!(null),true));
    cases.push(("record_copy",json!([node(json!([item.clone(),item]),vec![])]),json!(null),true));
    let mut steps = vec![];
    let mut expected = vec![];
    for (name,args,want,reject) in cases {
        let f = p.functions.iter().find(|f| f.name==name).unwrap();
        let inputs = args.as_array().unwrap().iter().zip(&f.params)
            .map(|(v,(_,t))| eval::Value::from_program_json(v,t,&p).unwrap()).collect();
        let result = eval::call(&p,name,inputs,&mut 10_000_000);
        let reply = if reject {
            assert_eq!(result.unwrap_err(),"contract precondition failed", "{name}");
            json!({"host_error":"contract precondition failed"})
        } else {
            assert_eq!(result.unwrap().json(),want,"{name}");
            json!({"value":want})
        };
        let mut step=json!({"pure":name,"args":args,"cpu_only":name!="numeric"});
        if name=="numeric" {step["expect_gpu"]=json!(true);}
        steps.push(step);expected.push(json!({"reply":reply,"snapshot":snapshot}));
    }
    parity::conformance("recursive-value-validation",p,&fs::read_to_string(file).unwrap(),steps,expected);
}
