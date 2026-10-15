use ink_core::{core::CheckedModule, eval, semantic as s, syntax};
#[test]
fn empty_optional_carriers_keep_their_types_and_do_not_capture_free_names() {
    let source = r#"module Empty;
pub fn run(xs:List<u32>,__ink_empty:String)->String{let seed:Option<String>=None;return fold_until(xs,seed,fn(x)=>fn(acc)=>acc.fold(fn(value)=>true,fn(unit)=>false),fn(x)=>fn(acc)=>choose(x>0,Some(__ink_empty),acc)).fold(fn(value)=>value,fn(unit)=>__ink_empty);}
"#;
    let original = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let f = &original.program().functions[0];
    let term = s::elaborate(
        &f.body,
        &ink_core::check::params_env(&f.params).unwrap(),
        original.program(),
        &f.result,
    )
    .unwrap();
    let mut p = original.program().clone();
    p.functions[0].body = s::reify(&term, &p).unwrap();
    let reified = CheckedModule::from_source(p).unwrap();
    for xs in [vec![], vec![0], vec![0, 7, 9]] {
        let inputs = serde_json::json!([xs, "free-雪"]);
        let args = inputs
            .as_array()
            .unwrap()
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| eval::Value::from_program_json(v, t, original.program()).unwrap())
            .collect::<Vec<_>>();
        let expected = eval::call(original.program(), "run", args.clone(), &mut 100000).unwrap();
        assert_eq!(
            eval::call(reified.program(), "run", args, &mut 100000).unwrap(),
            expected
        );
    }
}
