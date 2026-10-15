use ink_core::{
    core::CheckedModule,
    eval::{self, Value},
    syntax,
};
#[test]
fn a_selected_variant_arm_can_consume_a_capture_once() {
    let source="module a;fn run(x:Option<u32>)->List<u32>{let b:Buffer<u32>=buffer([1]);return x.fold(fn(v)=>b.push(v),fn(u)=>b.push(9)).freeze();}";
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    for (input, expected) in [
        (serde_json::json!({"Some":2}), serde_json::json!([1, 2])),
        (serde_json::json!({"None":null}), serde_json::json!([1, 9])),
    ] {
        let t = &m
            .program()
            .functions
            .iter()
            .find(|f| f.name == "run")
            .unwrap()
            .params[0]
            .1;
        let x = Value::from_program_json(&input, t, m.program()).unwrap();
        assert_eq!(
            eval::call(m.program(), "run", vec![x], &mut 100000)
                .unwrap()
                .json(),
            expected
        );
    }
}
#[test]
fn branch_capture_moves_remain_affine_and_do_not_escape_loops_or_loans() {
    for body in [
        "let a=x.fold(fn(v)=>b.push(v),fn(u)=>b);return b.freeze();",
        "return repeat(2,0,fn(i)=>fn(n)=>x.fold(fn(v)=>b.push(v).len(),fn(u)=>n));",
        "return b.borrow_range(0,1,fn(view)=>x.fold(fn(v)=>view.freeze(),fn(u)=>[]));",
    ] {
        let source = format!(
            "module bad;fn run(x:Option<u32>)->{}{{let b:Buffer<u32>=buffer([1]);{body}}}",
            if body.contains("repeat") {
                "u32"
            } else {
                "List<u32>"
            }
        );
        let error = syntax::parse(&source)
            .and_then(CheckedModule::from_source)
            .unwrap_err();
        assert!(
            error.contains("after move") || error.contains("callback cannot consume"),
            "{source}: {error}"
        );
    }
}
