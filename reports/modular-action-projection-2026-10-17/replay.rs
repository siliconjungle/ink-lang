use ink_core::{core::CheckedModule,optimisation,planning,action_model::Projection,registry};
use std::{env,fs,path::Path};
fn main(){let args=env::args().skip(1).collect::<Vec<_>>();
 if args.first().map(String::as_str)==Some("--model"){
  let source=CheckedModule::from_bytes(&fs::read(&args[1]).unwrap()).unwrap();let model=Projection::derive(&source).unwrap();
  let wire=registry::canonical(&model).unwrap();fs::write(&args[2],&wire).unwrap();
  println!("{}",serde_json::json!({"source":source.identity().unwrap(),"definitions":model.objects.len(),"canonical_bytes":wire.len(),"canonical_sha256":registry::identity(&model).unwrap()}));return;
 }
 for folder in args{let folder=Path::new(&folder);
  let source=CheckedModule::from_bytes(&fs::read(folder.join("compiled.core.json")).unwrap()).unwrap();
  let expected=if folder.join("selected.core.json").exists(){folder.join("selected.core.json")}else{folder.join("compiled.core.json")};
  let expected=CheckedModule::from_bytes(&fs::read(expected).unwrap()).unwrap();
  let selection=folder.join("selection.json");
  let selected=if selection.exists(){let bytes=fs::read(selection).unwrap();let value:serde_json::Value=serde_json::from_slice(&bytes).unwrap();
   if value["semantics"]==planning::SEMANTICS{planning::check(&source,&serde_json::from_value(value).unwrap()).unwrap().module().identity().unwrap()}
   else{optimisation::check(&source,&serde_json::from_value(value).unwrap()).unwrap().module().identity().unwrap()}
  }else{source.identity().unwrap()};
  assert_eq!(selected,expected.identity().unwrap());println!("checked {} {}",folder.display(),selected);
 }
}