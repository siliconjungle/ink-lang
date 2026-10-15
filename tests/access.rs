use ink_core::{
    access::{CheckedAccess, Mode, Scope, Symbol},
    action_ir::CheckedActions,
    core::CheckedModule,
    syntax::parse,
};

fn actions(source: &str) -> CheckedActions {
    CheckedActions::elaborate(&CheckedModule::from_source(parse(source).unwrap()).unwrap()).unwrap()
}
const SOURCE: &str = r#"module access;
record Key { id:u64, }
enum Error { Failed, Missing, }
state Items:Table<u64,u64> = Table.empty();
state Keys:Table<u64,u64> = Table.empty();
fn identity(key:u64)->u64 { let alias=key; return alias; }
change put(key:u64,value:u64)->Result<Unit,Error> writes(Items) {
    let alias=identity(key); Items.put(alias,value); return Ok(());
}
change nested(key:Key,value:u64,enabled:Bool)->Result<Unit,Error> writes(Items) {
    let alias=key.id;
    if enabled { put(alias,value)?; } else { return Err(Error.Failed); }
    Items.remove(alias); return Ok(());
}
change shadow(key:u64,value:u64)->Result<Unit,Error> writes(Items) {
    let alias=key; let key=7; put(alias,value)?; put(key,value)?; return Ok(());
}
change dependent(key:u64)->Result<Unit,Error> reads(Keys) writes(Items) {
    let target=Keys.get(key).ok_or(Error.Missing)?;
    Items.put(target,1); return Ok(());
}
change invalidated(key:u64)->Result<Unit,Error> writes(Items) {
    if Items.get(key).unwrap_or(0)==1 { Items.put(key,2); }
    Items.put(key,3); return Ok(());
}
query point()->Option<u64> reads(Items) { return Items.get(identity(0)); }
query scan()->List<u64> reads(Items) { return Items.values(); }
query callback()->List<u64> reads(Items,Keys) {
    return Keys.values().map(fn(key)=>Items.get(key).unwrap_or(0));
}
keep total:Int = sum(Items.values().map(fn(x)=>Int(x)));
query kept()->Int reads(total) { return total; }
"#;

#[test]
fn aliases_helpers_fields_and_branch_guards_keep_parameter_identity() {
    let ir = actions(SOURCE);
    let checked = CheckedAccess::derive(&ir).unwrap();
    let put = checked.action("put").unwrap();
    assert_eq!(put.accesses.len(), 2);
    assert!(put.accesses.iter().all(|a| a.scope
        == Scope::Point {
            key_type: ink_core::syntax::Type::U64,
            key: Symbol::Parameter(0)
        }));
    let nested = checked.action("nested").unwrap();
    assert!(nested.accesses.iter().all(|a| a.conditions.len() == 1
        && a.conditions[0].expression == Symbol::Parameter(2)
        && a.conditions[0].value));
    assert!(nested.accesses.iter().all(|a|matches!(&a.scope,Scope::Point{key,..}if *key==Symbol::Field(Box::new(Symbol::Parameter(0)),"id".into()))));
    let shadow = checked.action("shadow").unwrap();
    let keys: Vec<_> = shadow
        .accesses
        .iter()
        .filter(|a| a.mode == Mode::Write)
        .map(|a| &a.scope)
        .collect();
    assert_eq!(keys.len(), 2);
    assert!(keys.iter().any(|k| matches!(
        k,
        Scope::Point {
            key: Symbol::Parameter(0),
            ..
        }
    )));
    assert!(keys.iter().any(|k| matches!(
        k,
        Scope::Point {
            key: Symbol::Number(7),
            ..
        }
    )));
    assert!(matches!(
        &checked.action("point").unwrap().accesses[0].scope,
        Scope::Point {
            key: Symbol::Number(0),
            ..
        }
    ));
}

#[test]
fn state_derived_keys_scans_callbacks_and_keeps_are_conservative() {
    let checked = CheckedAccess::derive(&actions(SOURCE)).unwrap();
    assert!(checked
        .action("dependent")
        .unwrap()
        .accesses
        .iter()
        .any(|a| a.root == "Keys"
            && matches!(
                &a.scope,
                Scope::Point {
                    key: Symbol::Parameter(0),
                    ..
                }
            )));
    assert!(checked
        .action("dependent")
        .unwrap()
        .accesses
        .iter()
        .any(|a| a.root == "Items"
            && a.mode == Mode::Write
            && matches!(a.scope, Scope::Whole { .. })));
    for name in ["scan", "kept"] {
        assert!(checked
            .action(name)
            .unwrap()
            .accesses
            .iter()
            .any(|a| a.root == "Items" && matches!(a.scope, Scope::Whole { .. })));
    }
    let callback = checked.action("callback").unwrap();
    for root in ["Items", "Keys"] {
        assert!(callback
            .accesses
            .iter()
            .any(|a| a.root == root && matches!(a.scope, Scope::Whole { .. })));
    }
    // State-derived conditions are deliberately not retained across writes.
    assert!(checked
        .action("invalidated")
        .unwrap()
        .accesses
        .iter()
        .all(|a| a.conditions.is_empty()));
}

#[test]
fn artifacts_reject_forged_keys_guards_source_and_missing_accesses() {
    let ir = actions(SOURCE);
    let checked = CheckedAccess::derive(&ir).unwrap();
    let bytes = checked.bytes().unwrap();
    CheckedAccess::from_bytes(&ir, &bytes).unwrap();
    let original: serde_json::Value = serde_json::from_slice(&bytes).unwrap();
    for mutate in [0, 1, 2, 3] {
        let mut value = original.clone();
        match mutate {
            0 => {
                value["actions"]["put"]["accesses"][0]["scope"]["Point"]["key"] =
                    serde_json::json!({"Number":99})
            }
            1 => value["actions"]["nested"]["accesses"][0]["conditions"] = serde_json::json!([]),
            2 => value["source"] = serde_json::json!("0".repeat(64)),
            _ => value["actions"]["put"]["accesses"] = serde_json::json!([]),
        }
        assert!(CheckedAccess::from_bytes(&ir, &serde_json::to_vec(&value).unwrap()).is_err());
    }
}

#[test]
fn early_returns_and_literal_lazy_branches_do_not_invent_accesses() {
    let source = r#"module lazy;enum Error{No,}state Items:Table<u64,u64> = Table.empty();
    change put(key:u64,enabled:Bool)->Result<Unit,Error> writes(Items){
        if enabled {return Err(Error.No);} Items.put(key,1);return Ok(());
    }
    query lazy()->Bool reads(Items){return false && Items.contains(1);}
    query skipped()->u64 reads(Items){return choose(true,7,Items.get(1).unwrap_or(0));}"#;
    let checked = CheckedAccess::derive(&actions(source)).unwrap();
    let put = checked.action("put").unwrap();
    assert!(put
        .accesses
        .iter()
        .all(|a| a.conditions.len() == 1 && !a.conditions[0].value));
    assert!(checked.action("lazy").unwrap().accesses.is_empty());
    assert!(checked.action("skipped").unwrap().accesses.is_empty());
}

#[test]
fn helper_arithmetic_retains_its_word_width() {
    let source = r#"module widths;enum Error{No,}state Items:Table<u64,u64> = Table.empty();
    fn small()->u32{return 4294967295+1;}
    fn large()->u64{return 4294967295+1;}
    change a()->Result<Unit,Error> writes(Items){if small()==0{Items.put(0,1);}return Ok(());}
    change b()->Result<Unit,Error> writes(Items){if large()==0{Items.put(0,1);}return Ok(());}"#;
    let checked = CheckedAccess::derive(&actions(source)).unwrap();
    let a = &checked.action("a").unwrap().accesses[0].conditions[0].expression;
    let b = &checked.action("b").unwrap().accesses[0].conditions[0].expression;
    assert_ne!(a, b);
    assert!(matches!(
        a,
        Symbol::Binary(ink_core::syntax::Type::U32, _, _, _)
    ));
    assert!(matches!(
        b,
        Symbol::Binary(ink_core::syntax::Type::U64, _, _, _)
    ));
}

#[test]
fn boolean_helper_guards_are_typed_and_unsupported_enum_symbols_widen() {
    let source = r#"module guards;enum Error{No,}enum Flag{On,Off,}state Items:Table<u64,u64>=Table.empty();
    fn enabled(value:Bool)->Bool{return value==true;}
    fn on(value:Flag)->Bool{return value==Flag.On;}
    change boolean(key:u64,value:Bool)->Result<Unit,Error> writes(Items){
        if enabled(value){Items.put(key,1);}return Ok(());
    }
    change nominal(key:u64,value:Flag)->Result<Unit,Error> writes(Items){
        if on(value){Items.put(key,1);}return Ok(());
    }"#;
    let checked = CheckedAccess::derive(&actions(source)).unwrap();
    let guard = &checked.action("boolean").unwrap().accesses[0].conditions[0].expression;
    assert!(matches!(
        guard,
        Symbol::Binary(ink_core::syntax::Type::Bool, _, _, _)
    ));
    assert!(checked
        .action("nominal")
        .unwrap()
        .accesses
        .iter()
        .all(|a| a.conditions.is_empty()));
}
