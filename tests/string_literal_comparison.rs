use serde_json::json;
use verified_language::{stateful::Runtime, syntax::parse};

#[path = "support/parity.rs"]
mod parity;
use parity::conformance;

#[test]
fn string_literal_comparisons_preserve_values_without_copying_the_operand() {
    let source = r#"
module StringLabels;
record Label{ text:String, }
record Cell{ label:Label, data:List<u32>, }
state Selected:Bool = false;
fn matches_label(cell:Cell)->Bool{return cell.label.text == "雪";}
fn checked_label(cell:Cell)->Cell{
    if "雪" != cell.label.text {return Cell{..cell,data:[]};}
    return cell;
}
fn computed(a:String,b:String)->Bool{return "雪" == string_concat(a,b);}
change select_label(cell:Cell)->Result<Cell,String> writes(Selected){
    Selected = matches_label(cell);
    return Ok(checked_label(cell));
}
query selected()->Bool reads(Selected){return Selected;}
"#;
    let program = parse(source).unwrap();
    let emitted = verified_language::state_native::emit(&program).unwrap();
    let predicates = emitted
        .lines()
        .filter(|line| {
            line.contains("fn function_l_matches_label")
                || line.contains("fn function_l_checked_label")
        })
        .collect::<Vec<_>>();
    assert_eq!(predicates.len(), 2);
    assert!(predicates
        .iter()
        .all(|line| line.contains(".as_str()") && !line.contains("\"雪\".to_owned()")));
    let mut reference = Runtime::new(program.clone()).unwrap();
    let calls = [
        (
            "select_label",
            json!([{"label":{"text":"雪"},"data":[2,5,9]}]),
        ),
        ("selected", json!([])),
        (
            "select_label",
            json!([{"label":{"text":"雪\u{0000}"},"data":[2,5,9]}]),
        ),
        ("selected", json!([])),
    ];
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for (call, args) in calls {
        let result = reference.invoke_json(call, &args).unwrap();
        steps.push(json!({"call":call,"args":args}));
        expected.push(json!({"reply":{"outcome":result.json()},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    for value in ["雪", "雪景"] {
        let args = json!([value, ""]);
        steps.push(json!({"pure":"computed","args":args}));
        expected.push(json!({"reply":{"value":value == "雪"},"snapshot":reference.checkpoint_portable().unwrap()}));
    }
    conformance(
        "string-literal-comparisons",
        program,
        source,
        steps,
        expected,
    );
}
