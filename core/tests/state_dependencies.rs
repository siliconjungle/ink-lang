use ink_core::{
    core::{CheckedModule, Expr},
    syntax,
};
#[test]
fn local_parameters_lambdas_and_branch_bindings_do_not_invent_state_cycles() {
    let source = r#"module lexical;
 state Rows:Table<u32,u32>=Table.empty();
 keep Ready:List<u32>=Rows.values().map(fn(value)=>value+1);
 query value()->List<u32> reads(Ready){return Ready;}
 change put(value:u32)->Result<Unit,String> writes(Rows) {
  let value=value+1;Rows.put(0,value);return Ok(());
 }
 query branch(flag:Bool)->u32 {
  if flag {let branch:u32=1;return branch;}
  let value:u32=2;return value;
 }
 "#;
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
}
#[test]
fn dependency_edges_inside_negation_and_lexical_initializers_cannot_hide_cycles() {
    for expression in [
        Expr::Neg(Box::new(Expr::Var("B".into()))),
        Expr::Let(
            "local".into(),
            None,
            Box::new(Expr::Var("B".into())),
            Box::new(Expr::Num(0)),
        ),
    ] {
        let mut p = syntax::parse("module cycle;keep A:i32=0;keep B:i32=A;").unwrap();
        p.keeps[0].value = expression;
        assert!(CheckedModule::from_source(p).unwrap_err().contains("cycle"));
    }
}
#[test]
fn a_local_value_does_not_hide_a_named_action_call_cycle() {
    let source =
        "module calls;keep A:u32=read();query read()->u32 reads(A){let read:u32=7;return A;}";
    assert!(CheckedModule::from_source(syntax::parse(source).unwrap()).is_err());
}

#[test]
fn an_expression_local_shadows_an_action_only_inside_its_body() {
    let mut p = syntax::parse(
        "module scope;keep A:i32=0;keep B:i32=A;query value()->i32 reads(B){return B;}",
    )
    .unwrap();
    p.keeps[0].value = Expr::Let(
        "value".into(),
        Some(Box::new(ink_core::core::Type::I32)),
        Box::new(Expr::Num(0)),
        Box::new(Expr::Var("value".into())),
    );
    CheckedModule::from_source(p).unwrap();
}
