use ink_core::{law_author, laws::Proof, registry::CheckedBundle, syntax};
use std::collections::BTreeMap;
const SOURCE:&str=include_str!("fixtures/source-bitvector-laws.ink");
fn evidence()->BTreeMap<String,law_author::Evidence>{serde_json::from_str(include_str!("fixtures/source-bitvector-evidence.json")).unwrap()}
fn admit(source:&str,evidence:BTreeMap<String,law_author::Evidence>)->Result<law_author::Authored,String>{
 law_author::compile_source(syntax::parse_law_source(source)?,evidence,None)
}
#[test]
fn scalar_certificates_bind_source_functions_fields_widths_and_conditions(){
 let authored=admit(SOURCE,evidence()).unwrap();assert_eq!(authored.names.len(),9);
 CheckedBundle::check(&authored.bundle).unwrap();
 for name in authored.names.keys(){law_author::source_bitvector_problem(syntax::parse_law_source(SOURCE).unwrap(),name).unwrap();}
}
#[test]
fn rehashing_false_conclusions_or_definitions_does_not_grant_authority(){
 for (name,bad) in [
  ("packed_high",SOURCE.replace("high(pack(a,b))==a;","high(pack(a,b))==a+1;")),
  ("packed_high",SOURCE.replace("wrapping_shr(value,32)","wrapping_shr(value,31)")),
  ("increment_u32",SOURCE.replace("value<4294967295","value<=4294967295")),
  ("bounded_field",SOURCE.replace("(r.value+1>r.value)","(r.tag+1>r.tag)")),
 ]{
  let mut forged=evidence();
  let problem=law_author::source_bitvector_problem(syntax::parse_law_source(&bad).unwrap(),name).unwrap();
  let Proof::BitVector{certificate,..}=&mut forged.get_mut(name).unwrap().proof else{panic!()};
  certificate.problem_sha256=problem.identity().to_owned();
  assert!(admit(&bad,forged).is_err(),"accepted changed {name}");
 }
}
#[test]
fn missing_hypotheses_empty_hints_and_corrupt_circuit_ids_are_rejected(){
 let mut forged=evidence();
 let Proof::BitVector{hypotheses,..}=&mut forged.get_mut("high_namespace").unwrap().proof else{panic!()};
 hypotheses.clear();assert!(admit(SOURCE,forged).is_err());
 let mut forged=evidence();
 let Proof::BitVector{certificate,..}=&mut forged.get_mut("packed_high").unwrap().proof else{panic!()};
 certificate.steps.last_mut().unwrap().hints.clear();assert!(admit(SOURCE,forged).is_err());
 let mut forged=evidence();
 let Proof::BitVector{certificate,..}=&mut forged.get_mut("packed_high").unwrap().proof else{panic!()};
 certificate.problem_sha256="0".repeat(64);assert!(admit(SOURCE,forged).is_err());
 let bad=SOURCE.replace(" requires room: value<4294967295;","");
 assert!(admit(&bad,evidence()).is_err());
}
#[test]
fn signed_floating_and_collection_endpoints_are_not_unsigned_circuits(){
 for source in [
  "module bad;law x(v:i32){v==v;proof by provided;}",
  "module bad;law x(v:f32){v==v;proof by provided;}",
  "module bad;law x(v:List<u32>){v==v;proof by provided;}",
 ]{
  assert!(law_author::source_bitvector_problem(syntax::parse_law_source(source).unwrap(),"x").is_err());
 }
}
#[test]
fn exhausted_circuit_work_cannot_reach_certificate_admission(){
 use ink_core::{core::{Program,Type},laws::{Catalogue,CheckedCatalogue,Equation},semantic as s};
 let p=Program::default();
 let c=Catalogue{schema:1,semantics:ink_core::laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()};
 let checked=CheckedCatalogue::check(&c,&p).unwrap();
 let x=s::free(s::value(Type::U64),"value");let env=BTreeMap::from([("value".into(),x.sort.clone())]);
 let mut budget=s::Budget{bit_work:0,..s::Budget::new()};
 let error=checked.prove(&p,&env,&[],&Equation{from:x.clone(),to:x},&evidence()["masked_cap"].proof,&mut budget,0).unwrap_err();
 assert!(error.contains("bit circuit work limit"),"{error}");
}
