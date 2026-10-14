use std::collections::BTreeMap;
use ink_core::{law_author,syntax,laws::CheckedCatalogue,registry::CheckedBundle,core::Program};
fn check(src:&str)->Result<(),String>{let a=law_author::compile_source(syntax::parse_law_source(src)?,BTreeMap::new(),None)?;let c=CheckedBundle::check(&a.bundle)?.catalogue()?;CheckedCatalogue::check(&c,&Program::default())?;Ok(())}
#[test]
fn external_unsigned_recurrence_and_generalized_state_replay(){
 for (ty,max) in [("u32","4294967295"),("u64","18446744073709551615")]{
  check(&format!("module wordlaws;law constant(n:{ty},f:fn({ty})->{ty}){{assume adjacent(item:{ty}) requires item<{max}:f(item+1)==f(item);f(n)==f(0);proof by induction n{{zero=>normalize;succ(previous)=>calc{{_==f(previous) by assumption adjacent(previous);==_ by ih;}};}};}}")).unwrap();
  check(&format!("module wordlaws;law shift(n:{ty},x:{ty},f:fn({ty},{ty})->{ty}){{assume adjacent(item:{ty},value:{ty}) requires item<{max}:f(item+1,value)==f(item,value+1);f(n,x)==f(0,x+n);proof by induction n generalizing(x){{zero=>normalize;succ(previous)=>calc{{_==f(previous,x+1) by assumption adjacent(previous,x);==_ by ih(x=x+1);}};}};}}")).unwrap();
 }
}
#[test]
fn word_authoring_rejects_wrong_shape_capture_and_escaping_guard(){
 for src in [
 "module bad;law wrong(n:u32){n==n;proof by induction n{zero=>normalize;cons(h,t)=>normalize;};}",
 "module bad;law wrong(n:List<u32>){n==n;proof by induction n{nil=>normalize;succ(previous)=>normalize;};}",
 "module bad;law wrong(n:u32){n==n;proof by induction n{zero=>normalize;succ(n)=>normalize;};}",
 "module bad;law wrong(n:u32){n==0;proof by induction n{zero=>hypothesis successor_bound;succ(previous)=>normalize;};}",
 "module bad;law wrong(n:i32){n==n;proof by induction n;}",
 ]{assert!(check(src).is_err(),"accepted {src}");}
}
