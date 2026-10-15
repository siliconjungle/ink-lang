use serde_json::{json,Value};
use verified_language::{core::CheckedModule,eval,stateful::Runtime,syntax};
use super::parity;

// Ordinary source algorithms. The independent oracle below matches sequences
// directly, without bit-state recurrences or the compiler's generated helpers.
#[test]
fn packed_literal_algorithms_match_direct_search_across_targets() {
 let library=include_str!("../../knowledge/libraries/bit_automata.ink").split_once('\n').unwrap().1;
 let source=format!(r#"module bit_parity;
{library}
fn compile_literal(pattern:List<u32>)->Option<bits.Literal>{{return bits.literal(pattern);}}
fn scalar_count(symbols:List<u32>,masks:List<u32>,accept:u32)->u32{{return bits.count_symbols(symbols,masks,accept);}}
fn columns(words:List<u32>,ids:List<u32>,rows:u32,masks:List<u32>,accept:u32)->List<u32>{{return bits.counts_columns<64>(words,ids,rows,masks,accept);}}
fn octets(words:List<u32>,lane:u32)->List<u32>{{return words.map(fn(word)=>bits.octet(word,lane));}}
"#).replace("bits.","");
 let program=syntax::parse(&source).unwrap();
 CheckedModule::from_source(program.clone()).unwrap();
 let runtime=Runtime::new(program.clone()).unwrap();
 let snapshot=runtime.checkpoint_portable().unwrap();
 let mut steps=vec![];let mut expected=vec![];
 let mut add=|name:&str,args:Value,want:Value,gpu:bool|{
  let function=program.functions.iter().find(|f|f.name==name).unwrap();
  let inputs=args.as_array().unwrap().iter().zip(&function.params).map(|(v,(_,t))|eval::Value::from_program_json(v,t,&program).unwrap()).collect();
  assert_eq!(eval::call(&program,name,inputs,&mut 50_000_000).unwrap().json(),want,"{name}");
  steps.push(json!({"pure":name,"args":args,"expect_gpu":gpu,"cpu_only":!gpu}));
  expected.push(json!({"reply":{"value":want},"snapshot":snapshot}));
 };
 for pattern in [vec![],vec![1;33],vec![256],vec![u32::MAX]] {
  add("compile_literal",json!([pattern]),json!({"None":null}),false);
 }
 let mut patterns=vec![vec![0],vec![1],vec![1,1],vec![1,2,1],vec![255],vec![1;31],vec![1;32],(0..32).collect()];
 for n in 1..=4 {for bits in 0..(1<<n) {patterns.push((0..n).map(|i|1+((bits>>i)&1)).collect());}}
 let mut rows=vec![vec![0;64],vec![1;64],vec![255;64],(0..64).map(|i|i%32).collect()];
 for n in 0..64 {rows.push((0..64).map(|i|1+((n>>(i%6))&1)).collect::<Vec<_>>());}
 let count=rows.len();let mut packed=vec![0u32;count*16];
 for (row,symbols) in rows.iter().enumerate(){for(i,symbol)in symbols.iter().enumerate(){packed[(i/4)*count+row]|=symbol<<((i%4)*8);}}
 let ids:Vec<_>=(0..count as u32).collect();
 for pattern in patterns {
  let mut masks=vec![0u32;256];for(i,symbol)in pattern.iter().enumerate(){masks[*symbol as usize]|=1<<i;}
  let accept=1u32<<(pattern.len()-1);
  add("compile_literal",json!([pattern]),json!({"Some":{"masks":masks,"accept":accept,"width":pattern.len()}}),false);
  let want:Vec<_>=rows.iter().map(|symbols|{
   let mut matches=0u32;let mut at=0;
   while at+pattern.len()<=symbols.len(){if symbols[at..at+pattern.len()]==pattern[..]{matches+=1;at+=pattern.len();}else{at+=1;}}
   matches
  }).collect();
  add("columns",json!([packed,ids,count,masks,accept]),json!(want),true);
  add("scalar_count",json!([rows[3],masks,accept]),json!(want[3]),false);
 }
 // Lane counts are masked, zero-filled missing words, nonmatching tables and
 // arbitrary accept masks retain their literal meanings at the physical API.
 for lane in [0u32,1,2,3,4,31,32,u32::MAX] {
  let words=vec![0,1,0x12345678,u32::MAX,0x80000000];
  let want:Vec<_>=words.iter().map(|word|(word>>((lane&3)*8))&255).collect();
  add("octets",json!([words,lane]),json!(want),true);
 }
 add("columns",json!([[],[0,1,u32::MAX],0,[1],1]),json!([64,64,64]),true);
 add("columns",json!([[],[],0,[],0]),json!([]),true);
 parity::conformance("generated-parity-bit-automata",program,&source,steps,expected);
}
