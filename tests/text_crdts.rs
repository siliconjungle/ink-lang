use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;

fn atom(id:u64,left:u64,right:u64,stamp:u64,value:u32,deleted:bool)->Value{
 json!({"id":id,"left":left,"right":right,"stamp":stamp,"value":value,"deleted":deleted})
}
#[test]
fn sequence_variants_preserve_origins_tombstones_and_complete_target_values(){
 let p=modules::load("examples/crdts/main.ink").unwrap().program;
 let runtime=Runtime::new(p.clone()).unwrap();let snapshot=runtime.checkpoint_portable().unwrap();
 let a=(1u64<<32)+1;let b=(2u64<<32)+1;let c=a+1;
 let aa=atom(a,0,0,1,97,false);let bb=atom(b,0,0,1,98,false);let cc=atom(c,a,0,2,99,false);
 let insert=|a:Value|json!({"insert":true,"atom":a,"target":0});
 let ops=json!([insert(aa.clone()),insert(bb.clone()),insert(cc.clone()),{"insert":false,"atom":atom(0,0,0,0,0,true),"target":a}]);
 let dead=atom(a,0,0,1,97,true);let mut steps=vec![];let mut expected=vec![];
 for mode in 0..4{
  let atoms=if mode==2{json!([bb.clone(),dead.clone(),cc.clone()])}else{json!([dead.clone(),cc.clone(),bb.clone()])};
  let text=if mode==2{json!([98,99])}else{json!([99,98])};
  for (name,want) in [("indexed_replay",json!({"Ok":atoms})),("visible_text",json!({"Ok":text}))]{
   let args=json!([ops,mode]);let f=p.functions.iter().find(|f|f.name==name).unwrap();
   let vals=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();
   let value=eval::call(&p,name,vals,&mut 20_000_000).unwrap().json();assert_eq!(value,want,"{name} mode {mode}");
   steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
  }
 }
 parity::conformance("text-crdt-parity",p,include_str!("../examples/crdts/main.ink"),steps,expected);
}

#[test]
fn compressed_runs_preserve_split_origins_unicode_and_pending_deletions(){
 let p=modules::load("examples/crdts/run_graph.ink").unwrap().program;let rt=Runtime::new(p.clone()).unwrap();let snapshot=rt.checkpoint_portable().unwrap();
 let a=(1u64<<32)+1;let b=(2u64<<32)+1;let nil=atom(0,0,0,0,0,true);
 let values=[97,233,30000,128578];let mut inserts=vec![];
 for(i,value)in values.iter().enumerate(){inserts.push(json!({"insert":true,"atom":atom(a+i as u64,if i==0{0}else{a+i as u64-1},0,i as u64+1,*value,false),"target":0}));}
 let mut ops=inserts[..3].to_vec();ops.push(json!({"insert":false,"atom":nil,"target":a+3}));ops.push(inserts[3].clone());ops.push(json!({"insert":true,"atom":atom(b,a+1,a+2,10,120,false),"target":0}));ops.push(json!({"insert":false,"atom":nil,"target":a+2}));
 let want=json!({"Ok":[atom(a,0,0,1,97,false),atom(a+1,a,0,2,233,false),atom(b,a+1,a+2,10,120,false),atom(a+2,a+1,0,3,30000,true),atom(a+3,a+2,0,4,128578,true)]});let mut steps=vec![];let mut expected=vec![];
 for mode in 0..4{for(name,arguments,want)in [("replay",json!([ops,mode]),want.clone()),("run_count",json!([inserts,mode]),json!(1))]{
  let f=p.functions.iter().find(|f|f.name==name).unwrap();let input=arguments.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();assert_eq!(eval::call(&p,name,input,&mut 20_000_000).unwrap().json(),want);
  steps.push(json!({"pure":name,"args":arguments}));expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
 }}
 parity::conformance("run-crdt-parity",p,include_str!("../examples/crdts/run_graph.ink"),steps,expected);
}
