use ink_core::{action_ir::CheckedActions, action_shape, core::CheckedModule, syntax::parse};
#[test]
fn cell_bounds_follow_branches_nested_actions_and_reject_unbounded_bulk_writes() {
    let p = parse(
        r#"module cells;
 state A:Table<u64,u64> = Table.empty();
 change one(k:u64,v:u64)->Unit writes(A){A.put(k,v);return ();}
 change branch(k:u64,v:u64,b:Bool)->Unit writes(A){if b{A.put(k,v);}else{A.remove(k);}return ();}
 change twice(k:u64,v:u64)->Unit writes(A){one(k,v);one(k+1,v);return ();}
 change bulk(keys:List<u64>)->Unit writes(A){A.remove_many(keys);return ();}
 query get(k:u64)->Option<u64> reads(A){return A.get(k);}
 "#,
    )
    .unwrap();
    let m = CheckedModule::from_source(p).unwrap();
    let ir = CheckedActions::elaborate(&m).unwrap();
    for (name, want) in [
        ("one", Some(1)),
        ("branch", Some(1)),
        ("twice", Some(2)),
        ("bulk", None),
        ("get", Some(0)),
    ] {
        let i = m
            .program()
            .actions
            .iter()
            .position(|a| a.name == name)
            .unwrap();
        assert_eq!(action_shape::maximum_cell_writes(&ir, i), want, "{name}");
    }
}

#[test]
fn fresh_results_require_native_scalars_and_detached_flat_containers() {
    let p = parse(
        r#"module fresh;
 record Row{value:u64,flag:Bool,}
 record Nested{items:List<u64>,}
 state Rows:Table<u64,Row> = Table.empty();
 query word()->u64{return 7;}
 query flat(v:u64)->Row{return Row{value:v,flag:true};}
 query stored(k:u64)->Option<Row> reads(Rows){return Rows.get(k);}
 query wrapped(v:u64)->Result<u64,String>{return Ok(v);}
 query mutable_error(v:Row)->Result<Unit,Row>{return Err(v);}
 query nested(v:List<u64>)->Nested{return Nested{items:v};}
 query wide(v:Int)->Int{return v;}
 query float(v:f32)->f32{return v;}
 query local(v:u64)->Row{let row:Row=Row{value:v,flag:true};return row;}
 "#,
    )
    .unwrap();
    let m = CheckedModule::from_source(p).unwrap();
    let ir = CheckedActions::elaborate(&m).unwrap();
    for (name, want) in [
        ("word", true),
        ("flat", true),
        ("stored", false),
        ("wrapped", true),
        ("mutable_error", false),
        ("nested", false),
        ("wide", false),
        ("float", false),
        ("local", false),
    ] {
        let i = m
            .program()
            .actions
            .iter()
            .position(|a| a.name == name)
            .unwrap();
        assert_eq!(action_shape::fresh_native_result(&ir, i), want, "{name}");
    }
}
