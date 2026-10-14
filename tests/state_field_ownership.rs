//! Independent field moves must preserve whole reads, callbacks and rollback.
use serde_json::json;
use verified_language::{state_native, stateful::Runtime, syntax::parse};
#[path = "support/parity.rs"]
mod parity;

const SOURCE: &str = r#"module field_owners;
record Pair { left: List<u32>, right: List<u32>, }
enum Error { Failed, }
state Left: List<u32> = [];
state Right: List<u32> = [];
event changed: Pair;
change split(p: Pair, fail: Bool) -> Result<Unit, Error> writes(Left, Right) emits(changed) {
    let left = p.left;
    let right = p.right;
    Left = left;
    Right = right;
    emit changed(Pair { left: Left, right: Right });
    if fail { return Err(Error.Failed); }
    return Ok(());
}
change retained(p: Pair) -> Result<Pair, Error> writes(Left, Right) {
    Left = p.left;
    Right = p.right;
    return Ok(p);
}
change branch(p: Pair, flag: Bool) -> Result<Pair, Error> writes(Left, Right) {
    if flag { Left = p.left; } else { Right = p.right; }
    return Ok(p);
}
change captured(p: Pair) -> Result<Unit, Error> writes(Left, Right) {
    let copies = p.left.map(fn(x) => p.right);
    Left = p.left;
    Right = p.right;
    return Ok(());
}
query visible() -> Pair reads(Left, Right) { return Pair { left: Left, right: Right }; }
"#;

#[test]
fn disjoint_fields_move_without_breaking_aliases_or_transaction_rollback() {
    let p = parse(SOURCE).unwrap();
    let code = state_native::emit(&p).unwrap();
    let action = |name: &str| {
        code.split(&format!("fn action_l_{name}(")).nth(1).unwrap()
            .split("pub fn invoke_view_").next().unwrap().to_owned()
    };
    let split = action("split");
    assert!(split.contains("let l_left:Vec<u32>=l_p.l_left;"), "{split}");
    assert!(split.contains("let l_right:Vec<u32>=l_p.l_right;"), "{split}");
    for name in ["retained", "branch"] {
        let body = action(name);
        assert!(body.contains("l_p.l_left.clone()"), "{body}");
        assert!(body.contains("l_p.l_right.clone()"), "{body}");
    }
    let body = action("captured");
    assert!(body.contains("l_p.l_right.clone()"), "{body}");
    let mut reference = Runtime::new(p.clone()).unwrap();
    let mut steps = Vec::new();
    let mut expected = Vec::new();
    for n in [0, 1, 257] {
        let pair = json!({"left":(0..n).collect::<Vec<u32>>(),"right":[u32::MAX, 7, 0]});
        for (call,args) in [
            ("split",json!([pair,false])), ("split",json!([{"left":[99],"right":[]},true])),
            ("visible",json!([])), ("retained",json!([pair])),
            ("branch",json!([pair,true])), ("branch",json!([pair,false])),
            ("captured",json!([pair])), ("visible",json!([])),
        ] {
            let reply = reference.invoke_json(call, &args).unwrap().json();
            expected.push(json!({"reply":{"outcome":reply},"snapshot":reference.checkpoint_portable().unwrap()}));
            steps.push(json!({"call":call,"args":args}));
        }
    }
    parity::conformance("state-field-ownership-parity", p, SOURCE, steps, expected);
}
