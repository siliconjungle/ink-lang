use ink_core::{core::CheckedModule, eval, syntax};
fn result(body: &str, args: serde_json::Value) -> serde_json::Value {
    let p = CheckedModule::from_source(syntax::parse(&format!("module loops;{body}")).unwrap())
        .unwrap()
        .into_program();
    let function = p.functions.iter().find(|f| f.name == "run").unwrap();
    let values = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&function.params)
        .map(|(v, (_, t))| eval::Value::from_program_json(v, t, &p).unwrap())
        .collect();
    eval::call(&p, "run", values, &mut 1_000_000)
        .unwrap()
        .json()
}
#[test]
fn nested_loops_do_not_move_unrelated_partially_consumed_owners() {
    let source = "record Pair{words:Buffer<u32>,sizes:Buffer<u32>,}
 fn run(rows:List<List<u32>>)->List<u32>{
 var pair:Pair=Pair{words:Buffer.empty(),sizes:Buffer.empty()};
 for row in rows {var words:Buffer<u32>=pair.words;for word in row {words=words.push(word);}
 pair=Pair{words:words,sizes:pair.sizes.push(length(row))};}
 let words=pair.words.freeze();let sizes=pair.sizes.freeze();return words.concat(sizes);}";
    assert_eq!(
        result(source, serde_json::json!([[[1, 2], [], [3]]])),
        serde_json::json!([1, 2, 3, 2, 0, 1])
    );
    assert_eq!(
        result(source, serde_json::json!([[]])),
        serde_json::json!([])
    );
}
#[test]
fn unmodified_mutable_locals_remain_lexical_captures() {
    let source="fn run(xs:List<u32>)->u32{var scale:u32=3;var total:u32=0;for x in xs {total=total+x*scale;}return total+scale;}";
    assert_eq!(
        result(source, serde_json::json!([[1, 2]])),
        serde_json::json!(12)
    );
}
#[test]
fn bounded_loops_use_only_their_assigned_owners() {
    let source = "record Pair{left:Buffer<u32>,right:Buffer<u32>,}
 fn run()->List<u32>{var pair:Pair=Pair{left:buffer([1]),right:buffer([2])};
 let left=pair.left.freeze();var n:u32=0;while n<2 limit 3 {n=n+1;}
 return left.concat(pair.right.freeze()).concat([n]);}";
    assert_eq!(
        result(source, serde_json::json!([])),
        serde_json::json!([1, 2, 2])
    );
}
#[test]
fn consuming_an_uncarried_capture_still_rejects() {
    let source="module bad;fn run(xs:List<u32>)->List<u32>{var buffer:Buffer<u32>=Buffer.empty();for x in xs {let moved=buffer.push(x);}return buffer.freeze();}";
    assert!(CheckedModule::from_source(syntax::parse(source).unwrap()).is_err());
}
#[test]
fn conditional_assignment_and_shadowed_names_keep_their_lexical_scope() {
    let source = "fn run(xs:List<u32>)->u32{var total:u32=1;
 for x in xs {if x==0 {var total:u32=100;total=total+1;}else {total=total+x;}}
 return total;}";
    assert_eq!(
        result(source, serde_json::json!([[0, 2, 0, 3]])),
        serde_json::json!(6)
    );
}
#[test]
fn loop_state_limit_applies_to_carried_locals() {
    let declarations = (0..17)
        .map(|i| format!("var v{i}:u32={i};"))
        .collect::<String>();
    let source=format!("fn run(xs:List<u32>)->u32{{{declarations}var total:u32=0;for x in xs{{total=total+x+v16;}}return total;}}");
    assert_eq!(
        result(&source, serde_json::json!([[1, 2]])),
        serde_json::json!(35)
    );
    let assignments = (0..17).map(|i| format!("v{i}=v{i}+x;")).collect::<String>();
    let rejected=format!("module many;fn run(xs:List<u32>)->u32{{{declarations}for x in xs{{{assignments}}}return v0;}}");
    assert!(syntax::parse(&rejected)
        .unwrap_err()
        .contains("loop state exceeds 16 mutable locals"));
}
