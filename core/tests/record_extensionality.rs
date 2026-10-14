use ink_core::{law_author,syntax};
use std::collections::BTreeMap;

fn authored(source:&str)->Result<law_author::Authored,String>{
 law_author::compile_source(syntax::parse_law_source(source)?,BTreeMap::new(),None)
}

#[test]
fn complete_lexical_record_reconstruction_preserves_nested_and_owned_values(){
 for source in [
  "module trial;record Row{a:u32,b:u64,}law eta(r:Row){Row{b:r.b,a:r.a}==r;proof by normalize;}",
  "module trial;record Frame{data:Buffer<u32>,tag:u64,}law eta(r:Frame){Frame{data:r.data,tag:r.tag}==r;proof by normalize;}",
  "module trial;record Inner{a:u32,b:u32,}record Outer{inner:Inner,tag:u64,}law eta(r:Outer){Outer{inner:Inner{a:r.inner.a,b:r.inner.b},tag:r.tag}==r;proof by normalize;}",
  "module trial;record Row{a:u32,b:u32,}law mapped(xs:List<Row>){xs.map(fn(r)=>Row{a:r.a,b:r.b})==xs;proof by induction xs;}",
 ]{assert!(authored(source).is_ok(),"{}",authored(source).err().unwrap_or_default());}
}

#[test]
fn changed_fields_and_distinct_roots_cannot_claim_record_identity(){
 for source in [
  "module trial;record Row{a:u32,b:u32,}law wrong(r:Row){Row{a:r.b,b:r.a}==r;proof by normalize;}",
  "module trial;record Row{a:u32,b:u32,}law wrong(r:Row){Row{a:r.a,b:r.b+1}==r;proof by normalize;}",
  "module trial;record Row{a:u32,b:u32,}law wrong(r:Row,s:Row){Row{a:r.a,b:s.b}==r;proof by normalize;}",
  "module trial;record Frame{data:Buffer<u32>,tag:u64,}law wrong(r:Frame){Frame{data:r.data.push(1),tag:r.tag}==r;proof by normalize;}",
 ]{assert!(authored(source).is_err(),"accepted {source}");}
}
