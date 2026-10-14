use serde_json::json;
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;

#[test]
fn narrowed_leaf_indexing_preserves_complete_valid_and_malformed_tree_images(){
 let path="examples/libraries/leaf_indexed_images.ink";let program=modules::load(path).unwrap().program;
 let runtime=Runtime::new(program.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for leaf in [true,false]{for count in [0,1,4,33]{for block in [0,1,999]{
  let node=|value|json!({"value":value,"previous":5,"next":6,"leaf":19,"index":23,"extent":2,"weight":1,"weight2":3});
  let b=|leaf|json!({"start":1,"count":count,"parent":7,"index":8,"leaf":leaf,"size":90,"live":80,"second":70});
  let image=json!({"nodes":[node(10),node(11),node(12),node(13)],"blocks":[b(leaf),b(!leaf)],"children":[1,3,2,1,0,99,1],"root":1,"first":3,"last":2,"fallback":29});
  let run=|fast|{let args=json!([image,block,fast]);let f=program.functions.iter().find(|f|f.name=="indexed").unwrap();let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();eval::call(&program,"indexed",values,&mut 2_000_000).unwrap().json()};
  let want=run(false);assert_eq!(run(true),want,"leaf {leaf}, count {count}, block {block}");
  for fast in [false,true]{steps.push(json!({"pure":"indexed","args":[image,block,fast]}));expected.push(json!({"reply":{"value":want},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 }}}
 parity::conformance("leaf-indexed-sequence-parity",program,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
