use ink_core::{core::CheckedModule, eval, syntax};
use serde_json::json;
const NODE: &str = "module trees;record Node{value:u32,children:List<Node>,}";
#[test]
fn immutable_record_list_and_variant_subvalues_support_total_source_traversals() {
    let source=format!("{NODE}fn total(node:Node)->u32{{return node.value+foldl(node.children,0,fn(child)=>fn(acc)=>acc+total(child));}}");
    let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
    let input = json!({"value":1,"children":[{"value":2,"children":[]},{"value":3,"children":[{"value":4,"children":[]}]}]});
    let argument = eval::Value::from_program_json(
        &input,
        &syntax::Type::Named("Node".into()),
        module.program(),
    )
    .unwrap();
    assert_eq!(
        eval::call_checked(&module, "total", vec![argument], &mut 100000)
            .unwrap()
            .json(),
        json!(10)
    );
    let source="module chains;record Node{next:Option<Node>,}fn depth(node:Node)->u32{return node.next.fold(fn(child)=>depth(child)+1,fn(empty)=>1);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let argument = eval::Value::from_program_json(
        &json!({"next":{"Some":{"next":{"Some":{"next":{"None":null}}}}}}),
        &syntax::Type::Named("Node".into()),
        module.program(),
    )
    .unwrap();
    assert_eq!(
        eval::call_checked(&module, "depth", vec![argument], &mut 100000)
            .unwrap()
            .json(),
        json!(3)
    );
}
#[test]
fn ancestors_rebuilt_values_loop_accumulators_shadowing_and_unknown_callback_domains_reject() {
    for body in [
  "return total(node);",
  "return foldl(node.children,0,fn(child)=>fn(acc)=>acc+total(node));",
  "let initial:Node=node;return foldl(node.children,initial,fn(child)=>fn(acc)=>Node{value:total(acc),children:[]}).value;",
  "return foldl(node.children,0,fn(child)=>fn(acc)=>total(Node{value:child.value,children:[node]}));",
  "return foldl(node.children,0,fn(child)=>fn(acc)=>total(choose(child.value>0,child,node)));",
  "return foldl(node.children,node,fn(child)=>fn(node)=>Node{value:total(node),children:[]}).value;",
  "return repeat(1,0,fn(i)=>fn(acc)=>total(node));",
 ] {
  let source=format!("{NODE}fn total(node:Node)->u32{{{body}}}");
  assert!(CheckedModule::from_source(syntax::parse(&source).unwrap()).is_err(),"accepted {source}");
 }
    // Descending at only one call site cannot excuse another unchanged call.
    let source=format!("{NODE}fn total(node:Node)->u32{{return foldl(node.children,0,fn(child)=>fn(acc)=>total(child))+total(node);}}");
    assert!(syntax::parse(&source)
        .and_then(CheckedModule::from_source)
        .is_err());
}

#[test]
fn mutually_recursive_functions_must_descend_on_every_component_edge() {
    let source = "module mutual;
      record Branch{children:List<Branch>,value:u32,}
      fn branch(x:Branch)->u32{return x.value+children(x.children);}
      fn children(xs:List<Branch>)->u32{return foldl(xs,0,fn(x)=>fn(acc)=>acc+branch(x));}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let f = module.program().functions.iter().find(|f| f.name=="branch").unwrap();
    let arg = eval::Value::from_program_json(&json!({"value":1,"children":[{"value":2,"children":[]}]}), &f.params[0].1, module.program()).unwrap();
    assert_eq!(eval::call_checked(&module,"branch",vec![arg], &mut 100000).unwrap().json(), json!(3));
    for source in [
        "module bad;record N{child:Option<N>,}fn a(x:N)->u32{return b(x);}fn b(x:N)->u32{return a(x);}",
        "module bad;record N{child:Option<N>,}fn a(x:N)->u32{return x.child.fold(fn(y)=>b(x),fn(u)=>0);}fn b(x:N)->u32{return x.child.fold(fn(y)=>a(y),fn(u)=>0);}",
        "module bad;record N{children:List<N>,}fn a(x:N)->u32{return b(x.children);}fn b(xs:List<N>)->u32{return foldl(xs,0,fn(x)=>fn(acc)=>a(N{children:xs}));}",
    ] {
        assert!(syntax::parse(source).and_then(CheckedModule::from_source).is_err(), "accepted {source}");
    }
    // Parameter positions are inferred independently, including shadowed captures.
    let source = "module mutual;record N{next:Option<N>,}
      fn a(ignored:u32,x:N)->u32{return x.next.fold(fn(y)=>b(y,ignored)+1,fn(u)=>0);}
      fn b(x:N,ignored:u32)->u32{return x.next.fold(fn(y)=>a(ignored,y)+1,fn(u)=>0);}";
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
}
