fn main(){
 let a:Vec<_>=std::env::args().collect();
 let core=std::fs::read(&a[1]).unwrap();let m=ink_core::core::CheckedModule::from_bytes(&core).unwrap();
 let js=ink_lowering_js::lower(&m).unwrap().javascript;std::fs::write(&a[2],js).unwrap();
}
