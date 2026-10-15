use ink_core::{contracts, core::CheckedModule, syntax};

const HEADER: &str = "module callbacks;
refined record Checked { item:u32, valid:Bool, } invariant value.valid;
fn observe(v:Checked)->u32 {return v.item;}
";
fn checked(body: &str) -> Result<CheckedModule, String> {
    CheckedModule::from_source(syntax::parse(&format!("{HEADER}{body}"))?)
}

#[test]
fn list_callbacks_receive_validated_elements_without_arbitrary_element_premises() {
    let module =
        checked("fn items(xs:List<Checked>)->List<u32>{return xs.map(fn(v)=>observe(v));}")
            .unwrap();
    let goals = contracts::obligations(module.program()).unwrap();
    let goal = goals
        .iter()
        .find(|g| g.name.starts_with("items:call:"))
        .unwrap();
    assert_eq!(goal.params.len(), 1);
    assert!(goal.params.contains_key("xs"));
    assert!(!goal
        .params
        .keys()
        .any(|k| k.starts_with("__contract_binder")));
    checked("fn items(xs:List<Checked>)->List<List<u32>>{return xs.map(fn(v)=>[v].map(fn(x)=>observe(x)));}").unwrap();
    checked("fn keep(xs:List<Checked>)->u32{return length(xs.filter(fn(v)=>observe(v)==0));}")
        .unwrap();
}

#[test]
fn variant_callbacks_have_only_the_selected_branch_domain() {
    checked("fn item(v:Option<Checked>)->u32{return v.fold(fn(x)=>observe(x),fn(_)=>0);}").unwrap();
    checked("fn item(v:Result<Checked,u32>)->u32{return v.fold(fn(x)=>observe(x),fn(x)=>x);}")
        .unwrap();
    checked(
        "fn absent()->u32{let v:Option<Checked>=None;return v.fold(fn(x)=>observe(x),fn(_)=>0);}",
    )
    .unwrap();
}

#[test]
fn raw_validation_does_not_assume_its_own_result_or_a_nominal_element_invariant() {
    // An ordinary record has no validity guarantee. A spec must prove validity
    // before its observer can be called, including inside an iteration.
    let source = "module raw; record Raw{valid:Bool,}
      spec fn read(v:Raw)->Bool requires v.valid; ensures result;
      implementation read_impl for read {return v.valid;}
      fn unchecked(xs:List<Raw>)->List<Bool>{return xs.map(fn(v)=>read(v));}";
    assert!(CheckedModule::from_source(syntax::parse(source).unwrap()).is_err());
    // A valid Checked value still does not imply an unrelated numeric property.
    let source = format!(
        "{HEADER}
      spec fn zero(v:Checked)->u32 requires v.item==0; ensures result==0;
      implementation zero_impl for zero {{return v.item;}}
      fn unchecked(xs:List<Checked>)->List<u32>{{return xs.map(fn(v)=>zero(v));}}"
    );
    assert!(CheckedModule::from_source(syntax::parse(&source).unwrap()).is_err());
}

#[test]
fn empty_callback_domains_do_not_require_an_arbitrary_element_to_be_valid() {
    let source = "module empty;
      spec fn positive(x:u32)->u32 requires x>0; ensures result==x;
      implementation positive_impl for positive {return x;}
      fn empty()->List<u32>{let xs:List<u32>=[];return xs.map(fn(v)=>positive(v));}";
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let bad = source.replace("List<u32>=[]", "List<u32>=[0]");
    assert!(CheckedModule::from_source(syntax::parse(&bad).unwrap()).is_err());
}

const POSITIVE: &str = "module loops;
  spec fn positive(x:u32)->u32 requires x>0; ensures result==x;
  implementation positive_impl for positive {return x;}";
fn loop_checked(body: &str) -> Result<CheckedModule, String> {
    CheckedModule::from_source(syntax::parse(&format!("{POSITIVE}{body}"))?)
}
#[test]
fn folds_check_actual_accumulators_in_both_directions() {
    loop_checked(
        "fn f()->u32{let xs:List<u32>=[1,2];return foldl(xs,1,fn(x)=>fn(a)=>positive(a)+x);}",
    )
    .unwrap();
    assert!(loop_checked(
        "fn f()->u32{let xs:List<u32>=[1,2];return foldl(xs,1,fn(x)=>fn(a)=>positive(a)-1);}"
    )
    .is_err());
    loop_checked(
        "fn f()->u32{let xs:List<u32>=[0,1];return foldr(xs,1,fn(x)=>fn(a)=>positive(a)-x);}",
    )
    .unwrap_err();
    loop_checked(
        "fn f()->u32{let xs:List<u32>=[1,0];return foldr(xs,1,fn(x)=>fn(a)=>positive(a)-x);}",
    )
    .unwrap();
    loop_checked("fn f()->u32{let xs:List<u32>=[];return foldl(xs,0,fn(x)=>fn(a)=>positive(a));}")
        .unwrap();
}
#[test]
fn bounded_loops_check_each_reachable_accumulator() {
    loop_checked("fn f()->u32{return repeat(0,0,fn(i)=>fn(a)=>positive(a));}").unwrap();
    loop_checked("fn f()->u32{return repeat(1,1,fn(i)=>fn(a)=>positive(a)-1);}").unwrap();
    assert!(loop_checked("fn f()->u32{return repeat(2,1,fn(i)=>fn(a)=>positive(a)-1);}").is_err());
    loop_checked("fn f()->u32{return repeat_until(3,0,fn(a)=>true,fn(i)=>fn(a)=>positive(a));}")
        .unwrap();
    loop_checked("fn f()->u32{return repeat_until(3,1,fn(a)=>a==0,fn(i)=>fn(a)=>positive(a)-1);}")
        .unwrap();
    assert!(loop_checked(
        "fn f()->u32{return repeat_until(3,1,fn(a)=>false,fn(i)=>fn(a)=>positive(a)-1);}"
    )
    .is_err());
    loop_checked("fn f()->u32{return repeat_until(0,0,fn(a)=>positive(a)==0,fn(i)=>fn(a)=>a);}")
        .unwrap();
    assert!(loop_checked(
        "fn f()->u32{return repeat_until(1,0,fn(a)=>positive(a)==0,fn(i)=>fn(a)=>a);}"
    )
    .is_err());
}
#[test]
fn stopping_fold_still_checks_the_step_of_the_stopping_element() {
    loop_checked(
        "fn f()->u32{return fold_until([1,0],1,fn(x)=>fn(a)=>true,fn(x)=>fn(a)=>positive(a)-1);}",
    )
    .unwrap();
    assert!(loop_checked(
        "fn f()->u32{return fold_until([1,0],0,fn(x)=>fn(a)=>true,fn(x)=>fn(a)=>positive(a));}"
    )
    .is_err());
    assert!(loop_checked(
        "fn f()->u32{return fold_until([1],0,fn(x)=>fn(a)=>positive(a)==0,fn(x)=>fn(a)=>a);}"
    )
    .is_err());
    assert!(loop_checked(
        "fn f()->u32{return fold_until([1,0],1,fn(x)=>fn(a)=>false,fn(x)=>fn(a)=>positive(a)-1);}"
    )
    .is_err());
}
#[test]
fn indexed_and_zip_callbacks_check_only_their_real_indices_and_pairs() {
    loop_checked("fn f()->List<u32>{let xs:List<u32>=[0,0];return xs.map_indexed(fn(i)=>fn(x)=>positive(i+1));}").unwrap();
    assert!(loop_checked("fn f()->List<u32>{let xs:List<u32>=[0,0];return xs.map_indexed(fn(i)=>fn(x)=>positive(i));}").is_err());
    loop_checked("fn f()->List<u32>{let xs:List<u32>=[1,0];let ys:List<u32>=[1];return xs.zip(ys,fn(x)=>fn(y)=>positive(x));}").unwrap();
    assert!(loop_checked("fn f()->List<u32>{let xs:List<u32>=[1,0];let ys:List<u32>=[1,1];return xs.zip(ys,fn(x)=>fn(y)=>positive(x));}").is_err());
}
