use ink_core::{
    core::CheckedModule,
    eval::{self, Value},
    syntax,
};
#[test]
fn scalar_reverse_smoke() {
    let source="module r;fn objective(x:f32)->f32{return x*x;} fn derivative(x:f32)->Result<f32,String>{return reverse_gradient(objective,x,32,true);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let result = eval::call(
        module.program(),
        "derivative",
        vec![Value::F32(3.0f32.to_bits())],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(result.json(), serde_json::json!({"Ok":6.0}));
}
#[test]
fn reverse_tracks_dynamic_lists_beyond_forward_coordinate_limit() {
    let source="module r;fn objective(xs:List<f32>)->f32{return sum(xs.map(fn(x)=>x*x));} fn derivative(xs:List<f32>)->Result<List<f32>,String>{return reverse_gradient(objective,xs,512,true);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let input = (0..100)
        .map(|i| Value::F32(((i as f32) - 50.0).to_bits()))
        .collect();
    let result = eval::call(
        module.program(),
        "derivative",
        vec![Value::List(input)],
        &mut 20_000_000,
    )
    .unwrap();
    assert_eq!(
        result.json(),
        serde_json::json!({"Ok":(0..100).map(|i|2.0*((i as f32)-50.0)).collect::<Vec<_>>()})
    );
}
#[test]
fn reverse_context_is_untracked_and_capacity_failure_is_explicit() {
    let source="module r;fn objective(x:f32,scale:f32)->f32{return x*x*scale;} fn derivative(x:f32,capacity:u32,scale:f32)->Result<f32,String>{return reverse_gradient(objective,x,capacity,true,scale);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let result = eval::call(
        module.program(),
        "derivative",
        vec![
            Value::F32(3.0f32.to_bits()),
            Value::U32(32),
            Value::F32(4.0f32.to_bits()),
        ],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(result.json(), serde_json::json!({"Ok":24.0}));
    let result = eval::call(
        module.program(),
        "derivative",
        vec![
            Value::F32(3.0f32.to_bits()),
            Value::U32(1),
            Value::F32(4.0f32.to_bits()),
        ],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(
        result.json(),
        serde_json::json!({"Err":"reverse differentiation tape capacity exceeded"})
    );
}

#[test]
fn reverse_literal_repeat_retains_the_static_loop_bound() {
    let source="module r;fn objective(x:f32)->f32{return repeat(4,x,fn(i)=>fn(s)=>s*2.0);} fn derivative(x:f32)->Result<f32,String>{return reverse_gradient(objective,x,32,true);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let result = eval::call(
        module.program(),
        "derivative",
        vec![Value::F32(3.0f32.to_bits())],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(result.json(), serde_json::json!({"Ok":16.0}));
}
#[test]
fn reverse_record_parameters_flow_through_helpers_and_context() {
    let source="module r;record Weights{a:f32,bs:List<f32>,} fn square(x:f32)->f32{return x*x;} fn objective(w:Weights,scale:f32)->f32{return square(w.a)*scale+sum(w.bs.map(fn(x)=>x*w.a));} fn derivative(w:Weights,scale:f32)->Result<Weights,String>{return reverse_gradient(objective,w,256,true,scale);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let w = Value::Record(
        "Weights".into(),
        vec![
            ("a".into(), Value::F32(3.0f32.to_bits())),
            (
                "bs".into(),
                Value::List(vec![
                    Value::F32(2.0f32.to_bits()),
                    Value::F32(4.0f32.to_bits()),
                ]),
            ),
        ]
        .into_iter()
        .collect(),
    );
    let result = eval::call(
        module.program(),
        "derivative",
        vec![w, Value::F32(2.0f32.to_bits())],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(
        result.json(),
        serde_json::json!({"Ok":{"a":18.0,"bs":[3.0,3.0]}})
    );
}
#[test]
fn zero_cotangent_policy_is_explicit_for_nonfinite_primals() {
    let source="module r;fn objective(x:f32)->f32{return x*x*0.0;} fn derivative(x:f32,stop:Bool)->Result<f32,String>{return reverse_gradient(objective,x,32,stop);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let stopped = eval::call(
        module.program(),
        "derivative",
        vec![Value::F32(f32::INFINITY.to_bits()), Value::Bool(true)],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(stopped.json(), serde_json::json!({"Ok":0.0}));
    let propagated = eval::call(
        module.program(),
        "derivative",
        vec![Value::F32(f32::INFINITY.to_bits()), Value::Bool(false)],
        &mut 1_000_000,
    )
    .unwrap();
    assert!(propagated.json()["Ok"]["F32Bits"]
        .as_u64()
        .map(|x| f32::from_bits(x as u32).is_nan())
        .unwrap_or(false));
}

#[test]
fn until_contracts_preserve_exclusive_and_inclusive_terminal_steps() {
    for (name, objective, expected) in [
        (
            "repeat",
            "repeat_until(10,x,fn(s)=>s>=8.0,fn(i)=>fn(s)=>s*2.0)",
            4.0,
        ),
        (
            "fold",
            "fold_until(list(1,2,3,4),x,fn(i)=>fn(s)=>s>=4.0,fn(i)=>fn(s)=>s*2.0)",
            4.0,
        ),
        (
            "first_repeat",
            "repeat_until(10,x,fn(s)=>true,fn(i)=>fn(s)=>s*2.0)",
            1.0,
        ),
        (
            "first_fold",
            "fold_until(list(1,2,3),x,fn(i)=>fn(s)=>true,fn(i)=>fn(s)=>s*2.0)",
            2.0,
        ),
        (
            "zero_repeat",
            "repeat_until(0,x,fn(s)=>false,fn(i)=>fn(s)=>s*2.0)",
            1.0,
        ),
    ] {
        let source=format!("module r;fn objective(x:f32)->f32{{return {objective};}} fn derivative(x:f32)->Result<f32,String>{{return reverse_gradient_piecewise(objective,x,128,true);}}");
        let module = CheckedModule::from_source(syntax::parse(&source).unwrap()).unwrap();
        let result = eval::call(
            module.program(),
            "derivative",
            vec![Value::F32(2.0f32.to_bits())],
            &mut 1_000_000,
        )
        .unwrap();
        assert_eq!(result.json(), serde_json::json!({"Ok":expected}), "{name}");
    }
}

#[test]
fn variant_context_and_branch_helpers_preserve_lazy_paths() {
    let source="module r;fn objective(x:f32,c:Option<f32>,r:Result<f32,String>)->f32{return c.map(fn(v)=>v*x).fold(fn(v)=>v,fn(u)=>x*x)+r.map(fn(v)=>v*x).map_err(fn(e)=>e).fold(fn(v)=>v,fn(e)=>x);} fn derivative(x:f32,c:Option<f32>,r:Result<f32,String>)->Result<f32,String>{return reverse_gradient(objective,x,64,true,c,r);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    for (c, r, want) in [
        (
            serde_json::json!({"Some":2.0}),
            serde_json::json!({"Ok":3.0}),
            5.0,
        ),
        (
            serde_json::json!({"None":null}),
            serde_json::json!({"Err":"no"}),
            7.0,
        ),
    ] {
        let p = module.program();
        let f = p.functions.iter().find(|f| f.name == "derivative").unwrap();
        let args = [serde_json::json!(3.0), c, r]
            .into_iter()
            .zip(&f.params)
            .map(|(v, (_, t))| Value::from_program_json(&v, t, p).unwrap())
            .collect();
        let result = eval::call(p, "derivative", args, &mut 1_000_000).unwrap();
        assert_eq!(result.json(), serde_json::json!({"Ok":want}));
    }
}
#[test]
fn zip_uses_the_shorter_length_and_accumulates_reused_inputs() {
    let source="module r;fn objective(w:List<f32>,xs:List<f32>)->f32{return sum(w.zip(xs,fn(a)=>fn(b)=>a*b));} fn derivative(w:List<f32>,xs:List<f32>)->Result<List<f32>,String>{return reverse_gradient(objective,w,128,true,xs);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let value = |xs: &[f32]| Value::List(xs.iter().map(|x| Value::F32(x.to_bits())).collect());
    let result = eval::call(
        module.program(),
        "derivative",
        vec![value(&[2.0, 3.0, 4.0]), value(&[5.0, 6.0])],
        &mut 1_000_000,
    )
    .unwrap();
    assert_eq!(result.json(), serde_json::json!({"Ok":[5.0,6.0,0.0]}));
}
#[test]
fn reverse_linearize_retains_primal_rounding_and_lazy_fallbacks() {
    let source="module r;fn objective(x:f32,xs:List<f32>)->f32{return choose(true,xs.at_or(0,x*x*x),x*x*x*x);} fn primal(x:f32,xs:List<f32>)->f32{return reverse_linearize(objective,x,2,true,xs).fold(fn(v)=>v.value,fn(e)=>-1.0);} fn derivative(x:f32,xs:List<f32>)->f32{return reverse_linearize(objective,x,2,true,xs).fold(fn(v)=>v.gradient,fn(e)=>-1.0);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let args = vec![
        Value::F32(3.0f32.to_bits()),
        Value::List(vec![Value::F32((-0.0f32).to_bits())]),
    ];
    assert_eq!(
        eval::call(module.program(), "primal", args.clone(), &mut 1_000_000).unwrap(),
        Value::F32((-0.0f32).to_bits())
    );
    assert_eq!(
        eval::call(module.program(), "derivative", args, &mut 1_000_000).unwrap(),
        Value::F32(0.0f32.to_bits())
    );
}
#[test]
fn proof_preconditions_cannot_disappear_during_reverse_translation() {
    let source="module r;spec fn positive(x:f32)->f32 requires x>0.0; ensures result==x; implementation identity for positive{return x;} fn derivative(x:f32)->Result<f32,String>{return reverse_gradient(positive,x,64,true);}";
    assert!(syntax::parse(source).unwrap_err().contains("preconditions"));
}

#[test]
fn nonlinear_gradients_agree_with_a_separate_real_arithmetic_oracle() {
    let source="module r;fn objective(x:f32)->f32{return sqrt(x*x+1.0)/(x+2.0);} fn derivative(x:f32)->Result<f32,String>{return reverse_gradient(objective,x,64,true);} fn forward(x:f32)->f32{return reverse_linearize(objective,x,64,true).fold(fn(v)=>v.value,fn(e)=>0.0);}";
    let module = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    for x in [-1.0f32, 0.0, 1.0, 3.0] {
        let result = eval::call(
            module.program(),
            "derivative",
            vec![Value::F32(x.to_bits())],
            &mut 1_000_000,
        )
        .unwrap()
        .json()["Ok"]
            .as_f64()
            .unwrap();
        let x = x as f64;
        let root = (x * x + 1.0).sqrt();
        let expected = x / (root * (x + 2.0)) - root / ((x + 2.0) * (x + 2.0));
        assert!(
            (result - expected).abs() < 2e-6 * (1.0 + expected.abs()),
            "{x}: {result} != {expected}"
        );
    }
    for x in [-3.0f32, -1.0, 0.0, 1.0, 3.0, f32::INFINITY, f32::NAN] {
        let args = vec![Value::F32(x.to_bits())];
        assert_eq!(
            eval::call(module.program(), "forward", args.clone(), &mut 1_000_000).unwrap(),
            eval::call(module.program(), "objective", args, &mut 1_000_000).unwrap()
        );
    }
}
#[test]
fn lexical_names_and_normal_user_functions_cannot_be_captured_by_intrinsics() {
    let source="module r;fn reverse_gradient(x:f32)->f32{return x+1.0;} fn run(x:f32)->f32{return reverse_gradient(x);}";
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    assert_eq!(m.program().functions.len(), 2);
    assert_eq!(
        eval::call(
            m.program(),
            "run",
            vec![Value::F32(3.0f32.to_bits())],
            &mut 100000
        )
        .unwrap()
        .json(),
        serde_json::json!(4.0)
    );
    let source="module r;fn __ink_reverse_0(x:f32)->f32{return x*x;} fn run(__ink_reverse_1:f32)->Result<f32,String>{let __ink_reverse_2=__ink_reverse_1;return reverse_gradient(__ink_reverse_0,__ink_reverse_2,16,true);}";
    let m = CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    assert_eq!(
        eval::call(
            m.program(),
            "run",
            vec![Value::F32(3.0f32.to_bits())],
            &mut 100000
        )
        .unwrap()
        .json(),
        serde_json::json!({"Ok":6.0})
    );
    let bad="module r;fn objective(x:f32)->f32{return x*x;} fn run(objective:f32)->Result<f32,String>{return reverse_gradient(objective,1.0,16,true);}";
    assert!(syntax::parse(bad).unwrap_err().contains("shadowed"));
}
#[test]
fn raw_executable_calls_do_not_acquire_source_elaboration_privileges() {
    use ink_core::core::Expr;
    let mut p = syntax::parse("module r;fn f(x:f32)->Result<f32,String>{return Ok(x);}").unwrap();
    p.functions[0].body = Expr::Call("reverse_gradient".into(), vec![Expr::Var("x".into())]);
    assert!(CheckedModule::from_source(p).is_err());
    let source="module r;fn objective(x:f32)->f32{return choose(x>0.0,x*x,-x);} fn run(x:f32)->Result<f32,String>{return reverse_gradient(objective,x,16,true);}";
    assert!(syntax::parse(source)
        .unwrap_err()
        .contains("numeric decisions"));
}
