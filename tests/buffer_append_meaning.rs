use ink_core::{law_author,syntax};
use std::collections::BTreeMap;
fn check(source:&str)->Result<law_author::Authored,String>{law_author::compile_source(syntax::parse_law_source(source)?,BTreeMap::new(),None)}
#[test]
fn append_is_ordered_concatenation_of_both_logical_owners(){
 assert!(check("module append;law ordered<T>(a:Buffer<T>,b:Buffer<T>){a.append(b).freeze()==a.freeze().concat(b.freeze());proof by normalize;}").is_ok());
 assert!(check("module append;law concrete(a:Buffer<u32>,b:Buffer<u32>){a.append(b).freeze()==a.freeze().concat(b.freeze());proof by normalize;}").is_ok());
}
#[test]
fn dropping_reversing_or_mismatching_append_inputs_is_rejected(){
 for source in [
 "module append;law bad<T>(a:Buffer<T>,b:Buffer<T>){a.append(b).freeze()==b.freeze().concat(a.freeze());proof by normalize;}",
 "module append;law bad<T>(a:Buffer<T>,b:Buffer<T>){a.append(b).freeze()==a.freeze();proof by normalize;}",
 "module append;law bad(a:Buffer<u32>,b:Buffer<u64>){a.append(b).freeze()==a.freeze();proof by normalize;}",
 ]{assert!(check(source).is_err(),"accepted {source}");}
}
