use ink_core::{core::CheckedModule, stateful::Runtime, syntax};
use serde_json::json;

fn checked(source: &str) -> Result<CheckedModule, String> {
    CheckedModule::from_source(syntax::parse(source)?)
}

#[test]
fn constant_keep_defaults_retain_mutability_and_complete_state() {
    let m = checked(r#"module defaults;
      keep Seed:List<u32>=[2,3];
      keep Prepared:List<u32>=Seed.map(fn(x)=>x*3);
      trainable state Current:List<u32>=Prepared;
      query read()->List<u32> reads(Current){return Current;}
      learn change set(xs:List<u32>)->Result<Unit,String> writes(Current){Current=xs;return Ok(());}
      learn change cancel()->Result<Unit,String> reads(Current) writes(Current){Current=[99];return Err("cancel");}
    "#).unwrap();
    CheckedModule::from_bytes(&m.bytes().unwrap()).unwrap();
    let mut r = Runtime::from_checked(&m).unwrap();
    assert_eq!(
        r.invoke_json("read", &json!([])).unwrap().result.json(),
        json!([6, 9])
    );
    assert!(r.invoke_json("set", &json!([[7, 8]])).unwrap().committed);
    let snapshot = r.checkpoint_portable().unwrap();
    assert!(!r.invoke_json("cancel", &json!([])).unwrap().committed);
    assert_eq!(r.checkpoint_portable().unwrap(), snapshot);
    assert_eq!(
        r.invoke_json("read", &json!([])).unwrap().result.json(),
        json!([7, 8])
    );
    assert_eq!(
        Runtime::restore_portable_checked(&m, &snapshot)
            .unwrap()
            .invoke_json("read", &json!([]))
            .unwrap()
            .result
            .json(),
        json!([7, 8])
    );
}

#[test]
fn preparation_cannot_hide_transitive_state_actions_or_cycles() {
    for source in [
        "module bad;state Rows:Table<u32,u32>=Table.empty();keep Seed:List<u32>=Rows.values();state X:List<u32>=Seed;",
        "module bad;state Rows:Table<u32,u32>=Table.empty();keep A:List<u32>=Rows.values();keep B:List<u32>=A;state X:List<u32>=B;",
        "module bad;query constant()->u32{return 3;}keep A:u32=constant();state X:u32=A;",
        "module bad;keep A:u32=B;keep B:u32=A;state X:u32=A;",
        "module bad;keep A:u32=X;state X:u32=A;",
        "module bad;state X:u32=Y;state Y:u32=3;",
        "module bad;fn hidden()->u32{return X;}keep Seed:u32=hidden();state X:u32=Seed;",
        "module bad;keep Seed:u32=3;state X:u32=Seed;query forbidden()->u32{return X;}",
    ] { assert!(checked(source).is_err(), "{source}"); }
}

#[test]
fn lexical_initializers_can_shadow_state_names_without_reading_them() {
    let m=checked("module lexical;state Current:List<u64>=[1,2].map(fn(Current)=>Current+1);query read()->List<u64> reads(Current){return Current;}").unwrap();
    assert_eq!(
        Runtime::from_checked(&m)
            .unwrap()
            .invoke_json("read", &json!([]))
            .unwrap()
            .result
            .json(),
        json!([2, 3])
    );
}

#[test]
fn default_keep_names_are_not_captured_by_callback_or_generated_name_collisions() {
    let m = checked(r#"module scope;
      keep Seed:u32=7;
      state Current:u32=Seed;
      query values(xs:List<u32>)->List<u32> reads(Current){return xs.map(fn(Seed)=>Current);}
      query generated(xs:List<u32>)->List<u32> reads(Current){return xs.map(fn(__ink_prepared_initializer_0)=>Current);}
    "#).unwrap();
    let mut r = Runtime::from_checked(&m).unwrap();
    for name in ["values", "generated"] {
        assert_eq!(
            r.invoke_json(name, &json!([[1, 2]])).unwrap().result.json(),
            json!([7, 7])
        );
    }
}

#[test]
fn ordinary_pure_typing_and_preconditions_still_guard_preparation() {
    assert!(checked("module bad;keep Seed:Bool=true;state X:u32=Seed;").is_err());
    let source="module contract;spec fn zero(n:u32)->u32 requires n==0;ensures result==n;implementation direct for zero{return n;}keep Seed:u32=zero(1);state X:u32=Seed;query read()->u32 reads(X){return X;}";
    assert!(checked(source).is_err());
    checked(&source.replace("zero(1)", "zero(0)")).unwrap();
}

#[test]
fn existing_query_initializers_and_prepared_specification_interfaces_remain_valid() {
    let m=checked("module old;query default()->u32{return 7;}state X:u32=default();query read()->u32 reads(X){return X;}").unwrap();
    assert!(m.program().keeps.is_empty());
    assert_eq!(
        Runtime::from_checked(&m)
            .unwrap()
            .invoke_json("read", &json!([]))
            .unwrap()
            .result
            .json(),
        json!(7)
    );
    checked("module spec;keep Seed:u32=7;state X:u32=Seed;spec query read()->u32 reads(X) ensures result==7;implementation constant for read{return 7;}").unwrap();
    checked("module invariant;keep Seed:u32=7;state X:u32=Seed;invariant X<10;query read()->u32 reads(X){return X;}").unwrap();
    assert!(checked("module invariant;keep Seed:u32=11;state X:u32=Seed;invariant X<10;query read()->u32 reads(X){return X;}").is_err());
}
