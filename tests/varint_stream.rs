use serde_json::{json,Value};
use verified_language::{eval,modules,stateful::Runtime,syntax::Type};
#[path="support/parity.rs"]mod parity;
fn packed(bytes:&[u8])->Vec<u32>{
 let mut words=Vec::new();for chunk in bytes.chunks(4){let mut word=0u32;for(i,b)in chunk.iter().enumerate(){word|=u32::from(*b)<<(i*8);}words.push(word);}
 let hash=words.iter().fold(14695981039346656037u64,|h,w|(h^u64::from(*w)).wrapping_mul(1099511628211));
 [vec![1229867830,bytes.len()as u32,hash as u32,(hash>>32)as u32],words].concat()
}
fn encoded(values:&[u64])->(Vec<u32>,usize){
 let mut bytes=Vec::new();for &value in values{let mut x=value;loop{let low=(x&127)as u8;x>>=7;bytes.push(low|if x==0{0}else{128});if x==0{break}}}
 (packed(&bytes),bytes.len())
}
#[test]
fn canonical_varint_words_match_an_independent_byte_codec_on_every_cpu_target(){
 let source=include_str!("../examples/libraries/varints.ink");let p=modules::load("examples/libraries/varints.ink").unwrap().program;
 let Type::Result(_,error)=&p.functions.iter().find(|f|f.name=="encode").unwrap().result else{panic!()};let Type::Named(error)=error.as_ref()else{panic!()};
 let invalid=json!({"Err":format!("{error}.Invalid")});let limit=json!({"Err":format!("{error}.Limit")});
 let mut vectors=vec![vec![],vec![0],vec![0,1,127,128,129,16383,16384,u32::MAX as u64,1u64<<32,1u64<<63,u64::MAX]];
 let mut seed=729821u64;for n in 0..40{let mut xs=vec![];for _ in 0..n{seed=seed.wrapping_mul(6364136223846793005).wrapping_add(1);xs.push(seed);}vectors.push(xs);}
 let mut cases:Vec<(&str,Value,Value)>=vec![];
 for values in vectors{let(words,n)=encoded(&values);cases.push(("encode",json!([values]),json!({"Ok":words})));cases.push(("decode",json!([words,values.len(),n]),json!({"Ok":values})));if !values.is_empty(){cases.push(("decode",json!([words,values.len()-1,n]),limit.clone()));cases.push(("decode",json!([words,values.len(),n-1]),limit.clone()));}}
 for bytes in [vec![128,0],vec![129],vec![128;10],[vec![255;9],vec![2]].concat()]{cases.push(("decode",json!([packed(&bytes),100,100]),invalid.clone()));}
 let (mut corrupt,_)=encoded(&[u64::MAX]);corrupt[2]^=1;cases.push(("decode",json!([corrupt,100,100]),invalid.clone()));
 let mut padding=packed(&[1]);padding[4]|=256;cases.push(("decode",json!([padding,100,100]),invalid.clone()));
 for words in [vec![],vec![0,0,0,0],vec![1229867830,9,0,0]]{cases.push(("decode",json!([words,100,100]),invalid.clone()));}
 let rt=Runtime::new(p.clone()).unwrap();let snapshot=rt.checkpoint_portable().unwrap();let mut steps=vec![];let mut expected=vec![];
 for(name,args,want)in cases{let f=p.functions.iter().find(|f|f.name==name).unwrap();let input=args.as_array().unwrap().iter().zip(&f.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&p).unwrap()).collect();let got=eval::call(&p,name,input,&mut 1000000).unwrap().json();assert_eq!(got,want,"{name} {args}");steps.push(json!({"pure":name,"args":args}));expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));}
 parity::conformance("varint-stream-parity",p,source,steps,expected);
}
