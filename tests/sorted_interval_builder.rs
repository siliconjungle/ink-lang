//! Cartesian construction must retain exact stable handles, links and errors.
use serde_json::json;
use std::{fs,path::Path};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;

#[test]
fn ordered_construction_matches_complete_incremental_interval_images(){
 let directory=Path::new(env!("CARGO_MANIFEST_DIR")).join("build/sorted-interval-builder-parity");fs::create_dir_all(&directory).unwrap();
 let source=r#"module sorted_interval_builder_parity;
import "../../knowledge/libraries/sorted_interval_builder.ink" as builder;
import "../../knowledge/libraries/interval_index.ink" as intervals;
record Image{nodes:List<intervals.Node>,root:u32,valid:Bool,}
record Pair{fast:Image,slow:Image,}
fn image(index:intervals.Index)->Image{return Image{nodes:index.nodes.freeze(),root:index.root,valid:index.valid};}
fn exercise(entries:List<builder.Entry>)->Pair{return Pair{fast:image(builder.build(entries)),slow:image(builder.ordinary(entries))};}
"#;
 fs::write(directory.join("source.ink"),source).unwrap();let p=modules::load(directory.join("source.ink")).unwrap().program;
 let mut cases=vec![];
 for n in [0u64,1,2,3,16,31,32,33,64,257]{
  for offset in [0,123, u64::MAX-10_000]{cases.push((0..n).map(|i|json!({"start":offset+3*i,"end":offset+3*i+1,"value":i+1})).collect::<Vec<_>>());}
 }
 for entries in [vec![(1,0,1)],vec![(1,3,1),(3,0,2)],vec![(1,0,1),(3,4,2)],vec![(5,6,1),(1,2,2)],vec![(1,4,1),(3,5,2)],vec![(1,3,0)],vec![(3,2,1)],vec![(3,3,1)],vec![(1,2,1),(1,2,2)]]{
  cases.push(entries.into_iter().map(|(start,end,value)|json!({"start":start,"end":end,"value":value})).collect());
 }
 cases.push(vec![json!({"start":u64::MAX,"end":0,"value":1})]);
 let snapshot=Runtime::new(p.clone()).unwrap().checkpoint_portable().unwrap();let f=p.functions.iter().find(|f|f.name=="exercise").unwrap();let mut steps=vec![];let mut expected=vec![];
 for entries in cases{
  let args=json!([entries]);let values=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
  let result=eval::call(&p,"exercise",values,&mut 100_000_000).unwrap().json();assert_eq!(result["fast"],result["slow"],"{args}");
  steps.push(json!({"pure":"exercise","args":args}));expected.push(json!({"reply":{"value":result},"snapshot":snapshot}));
 }
 parity::conformance("sorted-interval-builder-parity",p,source,steps,expected);
}
