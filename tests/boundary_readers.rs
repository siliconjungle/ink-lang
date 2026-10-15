use ink_core::{core::CheckedModule,physical,planning,syntax};
use serde_json::json;
fn module()->CheckedModule {
 CheckedModule::from_source(syntax::parse("module packets; record Node { text:String, children:List<Node>, } fn copy(value:Node)->Node{return value;} fn build(values:List<u32>)->Buffer<u32>{return buffer(values);}").unwrap()).unwrap()
}
fn plan(m:&CheckedModule, readers:serde_json::Value)->physical::Plan {
 serde_json::from_value(json!({"schema":1,"semantics":physical::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"boundary_readers":readers})).unwrap()
}
#[test]
fn reader_choices_bind_complete_first_order_interfaces_and_target_support(){
 let m=module();let chosen=plan(&m,json!([{"function":"copy","format":"compact"},{"function":"copy","format":"portable"}]));
 physical::check(&m,None,&chosen).unwrap();
 let package=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:m.identity().unwrap(),steps:vec![planning::Step::Physical(chosen)]};
 let checked=planning::check(&m,&package).unwrap();
 checked.require_source_layout_and_boundary_capabilities(true,true,true).unwrap();
 assert!(checked.require_source_layout_capabilities(true,true).unwrap_err().contains("boundary readers"));
 for choices in [json!([{"function":"missing","format":"compact"}]),json!([{"function":"build","format":"compact"}]),json!([{"function":"copy","format":"compact"},{"function":"copy","format":"compact"}]),json!([{"function":"copy","format":"portable"},{"function":"copy","format":"compact"}])] {
  assert!(physical::check(&m,None,&plan(&m,choices)).is_err());
 }
 let mut wrong=plan(&m,json!([{"function":"copy","format":"compact"}]));wrong.input_core_sha256="0".repeat(64);assert!(physical::check(&m,None,&wrong).is_err());
}

#[test]
fn boundary_readers_and_state_protocols_compose_in_either_order(){
 let m=CheckedModule::from_source(syntax::parse("module packets; record Packet { text:String, values:List<u32>, } fn copy(value:Packet)->Packet{return value;} state Rows:Table<u32,u32> = Table.empty(); change put(key:u32,value:u32)->Unit writes(Rows){Rows.put(key,value);return ();}").unwrap()).unwrap();
 let physical=plan(&m,json!([{"function":"copy","format":"compact"},{"function":"copy","format":"portable"}]));
 let protocol:ink_core::protocol::Plan=serde_json::from_value(json!({"schema":1,"semantics":ink_core::protocol::SEMANTICS,"input_core_sha256":m.identity().unwrap(),"actions":[{"action":"put","execution":"preflight"}]})).unwrap();
 for steps in [vec![planning::Step::Physical(physical.clone()),planning::Step::Protocol(protocol.clone())],vec![planning::Step::Protocol(protocol.clone()),planning::Step::Physical(physical.clone())]] {
  let package=planning::Package{schema:1,semantics:planning::SEMANTICS.into(),input_core_sha256:m.identity().unwrap(),steps};
  let checked=planning::check(&m,&package).unwrap();
  assert_eq!(checked.physical().unwrap().plan().boundary_readers.len(),2);
  assert_eq!(checked.protocol().unwrap().plan().actions.len(),1);
  checked.require_source_storage_capabilities(true,true,true).unwrap();
  checked.require_source_layout_and_boundary_capabilities(true,true,true).unwrap();
  assert!(checked.require_source_storage_capabilities(false,true,true).unwrap_err().contains("protocol"));
  assert!(checked.require_source_layout_capabilities(true,true).unwrap_err().contains("boundary readers"));
 }
}
