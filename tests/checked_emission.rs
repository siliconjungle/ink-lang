use verified_language::{core::CheckedModule, state_native::{self,TableStorage}, syntax};

#[test]
fn checked_and_raw_emission_have_identical_bytes_and_raw_false_contracts_reject() {
    let source="module admission;state Current:u32=0;event Seen:u32;
      change set(x:u32,fail:Bool)->Result<Unit,String> writes(Current) emits(Seen){Current=x;emit Seen(x);if fail{return Err(\"rollback\");}return Ok(());}
      query read()->u32 reads(Current){return Current;}
      spec fn identity(x:u32)->u32 ensures result==x;implementation same for identity{return x;}";
    let p=syntax::parse(source).unwrap();
    let checked=CheckedModule::from_source(p.clone()).unwrap();
    let literal=state_native::emit(&p).unwrap();
    assert_eq!(literal,state_native::emit_checked(&checked).unwrap());
    assert_eq!(literal,ink_lowering_wasm::lower(&checked).unwrap().rust);
    assert_eq!(literal,ink_lowering_wasm::lower_complete(&checked).unwrap());
    for storage in [TableStorage::Ordered,TableStorage::IndexedSlots] {
        assert_eq!(state_native::emit_with_table_storage(&p,storage).unwrap(),state_native::emit_checked_with_table_storage(&checked,storage).unwrap());
    }
    let mut changed=p;
    changed.functions.iter_mut().find(|f|f.name=="same").unwrap().body=syntax::Expr::Num(0);
    assert!(state_native::emit(&changed).is_err());
    assert!(state_native::emit_with_table_storage(&changed,TableStorage::IndexedSlots).is_err());
    assert_eq!(state_native::emit_checked(&checked).unwrap(),state_native::emit(checked.program()).unwrap());
}
