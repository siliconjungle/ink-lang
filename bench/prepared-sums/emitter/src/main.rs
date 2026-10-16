fn main(){
 let a:Vec<_>=std::env::args().collect();
 assert_eq!(a.len(),4,"expected before|current CORE OUTPUT");
 let module=ink_core::core::CheckedModule::from_bytes(&std::fs::read(&a[2]).unwrap()).unwrap();
 let code=match a[1].as_str(){
  "before"=>js_before::lower(&module).unwrap().javascript,
  "current"=>js_current::lower(&module).unwrap().javascript,
  _=>panic!("expected before or current"),
 };
 std::fs::write(&a[3],code).unwrap();
}
