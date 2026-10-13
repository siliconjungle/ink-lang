use ink_core::{
    core::{CheckedModule, BORROW_RANGE_SEMANTICS},
    eval, syntax,
};
use serde_json::json;

const SOURCE:&str="module views;
 fn read(xs:List<u32>,start:u32,count:u32,index:u32)->u32 {
  let owner=buffer(xs);
  let value=owner.borrow_range(start,count,fn(view)=>view.at_or(index,99));
  return value+owner.len();
 }
 fn nested(xs:List<u32>)->u32 {let owner=buffer(xs);return owner.borrow_range(1,3,fn(view)=>view.borrow_range(1,2,fn(inner)=>inner.at_or(0,99)));}
 fn lazy(xs:List<u32>)->u32 {let owner=buffer(xs);return owner.borrow_range(0,1,fn(view)=>view.at_or(0,repeat(65536,0,fn(i)=>fn(acc)=>acc+1)));}";
#[test]
fn clipped_nested_readonly_borrows_retain_owners_lazy_fallbacks_and_versioning() {
    let module = CheckedModule::from_source(syntax::parse(SOURCE).unwrap()).unwrap();
    assert_eq!(module.semantics(), BORROW_RANGE_SEMANTICS);
    for (start, count, index, want) in [
        (0, 4, 0, 5),
        (1, 2, 1, 7),
        (1, 2, 2, 103),
        (u32::MAX, u32::MAX, 0, 103),
        (3, u32::MAX, 0, 8),
        (0, 0, 0, 103),
    ] {
        let args = vec![
            eval::Value::List(vec![1, 2, 3, 4].into_iter().map(eval::Value::U32).collect()),
            eval::Value::U32(start),
            eval::Value::U32(count),
            eval::Value::U32(index),
        ];
        assert_eq!(
            eval::call_checked(&module, "read", args, &mut 10000)
                .unwrap()
                .json(),
            json!(want)
        );
    }
    let arg = eval::Value::List(vec![1, 2, 3, 4].into_iter().map(eval::Value::U32).collect());
    assert_eq!(
        eval::call_checked(&module, "nested", vec![arg.clone()], &mut 10000)
            .unwrap()
            .json(),
        json!(3)
    );
    assert_eq!(
        eval::call_checked(&module, "lazy", vec![arg], &mut 1000)
            .unwrap()
            .json(),
        json!(1)
    );
    let mut bytes: serde_json::Value = serde_json::from_slice(&module.bytes().unwrap()).unwrap();
    bytes["semantics"] = json!("ink-executable-core-v3");
    assert!(CheckedModule::from_bytes(&serde_json::to_vec(&bytes).unwrap()).is_err());
}
#[test]
fn borrow_callbacks_reject_mutation_captured_writes_moves_and_escape() {
    for body in [
        "let value=owner.borrow_range(0,1,fn(view)=>view.set(0,7).len());return value;",
        "let value=owner.borrow_range(0,1,fn(view)=>owner.push(7).len());return value;",
        "let value=owner.borrow_range(owner.push(7).len(),1,fn(view)=>view.len());return value;",
        "let value=owner.borrow_range(0,owner.push(7).len(),fn(view)=>view.len());return value;",
        "let value=owner.borrow_range(0,1,fn(view)=>consume(view));return value;",
        "let value=owner.borrow_range(0,1,fn(view)=>view);return value.len();",
        "let value=owner.borrow_range(0,1,fn(view)=>view.freeze());return length(value);",
    ] {
        let source=format!("module invalid;fn consume(value:Buffer<u32>)->u32{{return value.len();}}fn run(xs:List<u32>)->u32{{let owner=buffer(xs);{body}}}");
        let parsed = syntax::parse(&source);
        assert!(
            parsed.and_then(CheckedModule::from_source).is_err(),
            "{source}"
        );
    }
}
#[test]
fn callback_contracts_bind_the_actual_view_and_execute_once_even_when_empty() {
    let header="module view_contracts;spec fn empty(size:u32)->u32 requires size==0;ensures result==7;implementation empty_impl for empty{return 7;}";
    let source=format!("{header}fn good(xs:List<u32>)->u32{{let owner=buffer(xs);return owner.borrow_range(0,0,fn(view)=>empty(view.len()));}}");
    let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let argument = eval::Value::List(vec![eval::Value::U32(99)]);
    assert_eq!(
        eval::call_checked(&module, "good", vec![argument], &mut 10000)
            .unwrap()
            .json(),
        json!(7)
    );
    let unsafe_source = source.replace("borrow_range(0,0", "borrow_range(0,1");
    assert!(CheckedModule::from_source(syntax::parse(&unsafe_source).unwrap()).is_err());
    let never="module never;spec fn forbidden(size:u32)->u32 requires false;ensures result==0;implementation forbidden_impl for forbidden{return 0;}fn run()->u32{let owner:Buffer<u32>=Buffer.empty();return owner.borrow_range(0,0,fn(view)=>forbidden(view.len()));}";
    assert!(
        CheckedModule::from_source(syntax::parse(never).unwrap()).is_err(),
        "an empty view must still check its single callback invocation"
    );
}
