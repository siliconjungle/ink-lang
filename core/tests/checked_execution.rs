use ink_core::{
    core::{CheckedModule, Type},
    eval::{self, Value},
    syntax,
};
use serde_json::json;
#[test]
fn sealed_execution_reuses_admission_but_validates_each_untrusted_input() {
    let source = "module checked;refined record Small{x:u32,} invariant value.x<10;
 fn make()->Small{return Small{x:3};}fn read(v:Small)->u32{return v.x;}";
    let p = syntax::parse(source).unwrap();
    let module = CheckedModule::from_source(p.clone()).unwrap();
    let ty = Type::Named("Small".into());
    for x in [0, 3, 9, 10, u32::MAX] {
        let input = Value::from_program_json(&json!({"x":x}), &ty, module.program()).unwrap();
        let raw = eval::call(&p, "read", vec![input.clone()], &mut 10000);
        let sealed = eval::call_checked(&module, "read", vec![input], &mut 10000);
        assert_eq!(sealed, raw);
        if x < 10 {
            assert_eq!(sealed.unwrap(), Value::U32(x));
        } else {
            assert_eq!(sealed.unwrap_err(), "contract precondition failed");
        }
    }
    assert!(eval::call_checked(&module, "read", vec![Value::U32(3)], &mut 10000).is_err());
    assert_eq!(
        eval::call_checked(&module, "make", vec![], &mut 0).unwrap_err(),
        "interpreter evaluation budget exhausted"
    );
    assert!(CheckedModule::from_source(
        syntax::parse(&source.replace("Small{x:3}", "Small{x:10}")).unwrap()
    )
    .is_err());
}
