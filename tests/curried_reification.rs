use ink_core::{
    core::{CheckedModule, Expr, Type},
    eval,
    semantic::{self as s, Node, Sort},
    syntax,
};
fn applications(t: &s::Term) -> usize {
    usize::from(matches!(&t.node,Node::Op(n,_) if n=="apply"))
        + s::children(t).into_iter().map(applications).sum::<usize>()
}
#[test]
fn curried_known_callbacks_bind_arguments_once_and_preserve_capture() {
    let source = r#"module Curried;
pub fn run(__ink_bound_0:u32,x:u32,y:u32,z:u32)->u32{
 return foldr(list(x,y),z,fn(a)=>fn(acc)=>a*__ink_bound_0-acc);
}"#;
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let scalar = s::value(Type::U32);
    let t:s::Term=serde_json::from_value(serde_json::json!({"sort":scalar,"node":{"Op":["apply",[
      {"sort":{"Arrow":[scalar.clone(),scalar.clone()]},"node":{"Op":["apply",[
        {"sort":{"Arrow":[scalar.clone(),{"Arrow":[scalar.clone(),scalar.clone()]}]},"node":{"Lambda":{"sort":{"Arrow":[scalar.clone(),scalar.clone()]},"node":{"Lambda":{"sort":scalar.clone(),"node":{"Op":["binary:-",[
          {"sort":scalar.clone(),"node":{"Op":["binary:*",[{"sort":scalar.clone(),"node":{"Bound":1}},{"sort":scalar.clone(),"node":{"Free":"__ink_bound_0"}}]]}},
          {"sort":scalar.clone(),"node":{"Bound":0}}]]}}}}}},
        {"sort":scalar.clone(),"node":{"Op":["binary:+",[{"sort":scalar.clone(),"node":{"Free":"x"}},{"sort":scalar.clone(),"node":{"Free":"y"}}]]}}]]}},
      {"sort":scalar.clone(),"node":{"Free":"z"}}]]}})).unwrap();
    assert_eq!(applications(&t), 2);
    let params = m.program().functions[0].params.clone();
    let env = params
        .iter()
        .map(|(n, t)| (n.clone(), s::value(t.clone())))
        .collect();
    s::validate(&t, &env, m.program(), &mut s::Budget::new()).unwrap();
    let body = s::reify(&t, m.program()).unwrap();
    let Expr::Let(a, _, initial, inner) = &body else {
        panic!()
    };
    assert_ne!(a, "__ink_bound_0");
    assert!(matches!(initial.as_ref(),Expr::Binary(n,_,_) if n=="+"));
    let Expr::Let(b, _, _, _) = inner.as_ref() else {
        panic!()
    };
    assert_ne!(a, b);
    let mut p = m.program().clone();
    p.functions[0].body = body;
    let rebuilt = CheckedModule::from_source(p).unwrap();
    for values in [[3, 17, 23, 91], [u32::MAX, 1, 2, u32::MAX], [0, 0, 0, 0]] {
        let args = values.into_iter().map(|x| eval::Value::U32(x)).collect();
        let actual = eval::call(rebuilt.program(), "run", args, &mut 10000).unwrap();
        assert_eq!(
            actual.json(),
            serde_json::json!(values[1]
                .wrapping_add(values[2])
                .wrapping_mul(values[0])
                .wrapping_sub(values[3]))
        );
    }
    let dynamic = s::op(
        scalar.clone(),
        "apply",
        vec![
            s::free(
                Sort::Arrow(Box::new(scalar.clone()), Box::new(scalar.clone())),
                "unknown",
            ),
            s::word(Type::U32, 7),
        ],
    );
    assert!(s::reify(&dynamic, m.program())
        .unwrap_err()
        .contains("unresolved function hole"));
}
