use serde_json::{json,Value};
use verified_language::{modules,stateful::Runtime};
#[path="support/parity.rs"]mod parity;
#[path="support/varint_oracle.rs"]mod oracle;
#[test]
fn document_log_codec_preserves_future_merges_and_rejects_invalid_loads_atomically(){
 let path="examples/crdts/persistent_causal_batches_document.ink";let p=modules::load(path).unwrap().program;
 let a=4294967297u64;let b=8589934593u64;let c=12884901889u64;
 let change=|id,parents:Vec<u64>,position,remove,text:Vec<u32>|json!({"id":id,"parents":parents,"position":position,"remove":remove,"text":text});
 let first=change(a,vec![],0,0,vec![65,128578]);let branch=change(b,vec![a+1],1,0,vec![66]);let concurrent=change(c,vec![a+1],1,0,vec![233]);let deletion=change(c+1,vec![b,c],1,1,vec![]);
 let initial=vec![first.clone(),branch.clone()];let full=vec![first.clone(),branch.clone(),concurrent.clone(),deletion.clone()];
 let initial_packet=oracle::document(&initial);let packet=oracle::document(&full);let mut corrupt=packet.clone();*corrupt.last_mut().unwrap()^=1;
 let duplicate=oracle::document(&[first.clone(),branch.clone(),first]);let invalid=oracle::document(&[change(a,vec![],0,0,vec![55296])]);
 let extreme=change(u64::MAX,vec![],0,0,vec![1114111]);let extreme_packet=oracle::document(&[extreme.clone()]);
 let calls:Vec<(&str,Value,Option<Value>,bool)>=vec![
  ("merge",json!([initial]),None,false),("save",json!([]),Some(json!({"Ok":initial_packet})),false),
  ("merge",json!([[concurrent.clone(),deletion.clone()]]),None,false),
  ("load",json!([initial_packet]),None,false),("history",json!([]),Some(json!(initial)),false),
  ("merge",json!([[concurrent,deletion]]),None,false),("visible",json!([]),Some(json!({"Ok":[65,233,128578]})),false),
  ("save",json!([]),Some(json!({"Ok":packet})),false),
  ("load",json!([corrupt]),None,true),("load",json!([duplicate]),None,true),("load",json!([invalid]),None,true),
  ("history",json!([]),Some(json!(full)),false),("load",json!([oracle::document(&[])]),None,false),
  ("visible",json!([]),Some(json!({"Ok":[]})),false),("load",json!([extreme_packet]),None,false),
  ("history",json!([]),Some(json!([extreme])),false),
  ("merge",json!([[change(b,vec![u64::MAX],1,0,vec![65])]]),None,false),
  ("visible",json!([]),Some(json!({"Ok":[1114111,65]})),false),
 ];
 let mut runtime=Runtime::new(p.clone()).unwrap();let mut steps=vec![];let mut expected=vec![];
 for(call,args,want,rejected)in calls{let before=runtime.checkpoint_portable().unwrap();let reply=runtime.invoke_json(call,&args).unwrap();if ["load","merge"].contains(&call){assert_eq!(reply.committed,!rejected,"{call} {args}");}if rejected{assert_eq!(runtime.checkpoint_portable().unwrap(),before);}if let Some(want)=want{assert_eq!(reply.result.json(),want,"{call}");}steps.push(json!({"call":call,"args":args}));expected.push(json!({"reply":{"outcome":reply.json()},"snapshot":runtime.checkpoint_portable().unwrap()}));}
 parity::conformance("crdt-document-snapshot-parity",p,&std::fs::read_to_string(path).unwrap(),steps,expected);
}
