use ink_core::{
    core::CheckedModule,
    eval::{self, Value},
    syntax,
};
use serde_json::{json, Value as Json};

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()
}
fn run(m: &CheckedModule, name: &str, arguments: Json) -> Json {
    let function = m
        .program()
        .functions
        .iter()
        .find(|f| f.name == name)
        .unwrap();
    let arguments = arguments
        .as_array()
        .unwrap()
        .iter()
        .zip(&function.params)
        .map(|(v, (_, t))| Value::from_program_json(v, t, m.program()).unwrap())
        .collect();
    eval::call(m.program(), name, arguments, &mut 30_000_000)
        .unwrap()
        .json()
}

#[test]
fn both_precisions_share_transforms_without_sharing_carriers_or_helpers() {
    let m = module(
        r#"module precision;
fn square32(x:f32)->f32{return x*x;}
fn square64(x:f64)->f64{return x*x;}
fn forward32(x:f32)->f32{return gradient(square32,x);}
fn forward64(x:f64)->f64{return gradient(square64,x);}
fn reverse32(x:f32)->Result<f32,String>{return reverse_gradient(square32,x,16,true);}
fn reverse64(x:f64)->Result<f64,String>{return reverse_gradient(square64,x,16,true);}
fn tangent64(x:f64,direction:f64)->f64{return jvp(square64,x,direction);}
fn primal64(x:f64,direction:f64)->f64{return linearize(square64,x,direction).value;}
"#,
    );
    let x = 1.0 + 2.0f64.powi(-40);
    assert_ne!(x, (x as f32) as f64);
    assert_eq!(run(&m, "forward32", json!([x])), json!(2.0));
    assert_eq!(run(&m, "reverse32", json!([x])), json!({"Ok":2.0}));
    assert_eq!(run(&m, "forward64", json!([x])), json!(2.0 * x));
    assert_eq!(run(&m, "reverse64", json!([x])), json!({"Ok":2.0*x}));
    assert_eq!(run(&m, "tangent64", json!([x, 0.25])), json!(0.5 * x));
    assert_eq!(run(&m, "primal64", json!([x, 0.25])), json!(x * x));
    assert!(m
        .program()
        .records
        .keys()
        .any(|n| n.starts_with("__ink_differential64_")));
    assert!(m
        .program()
        .records
        .keys()
        .any(|n| n.starts_with("__ink_reverse64_")));
    assert_eq!(
        CheckedModule::from_bytes(&m.bytes().unwrap())
            .unwrap()
            .identity()
            .unwrap(),
        m.identity().unwrap()
    );
}

#[test]
fn analytic_division_and_square_root_keep_binary64_primal_and_chain_order() {
    let m = module(
        r#"module smooth;
fn objective(x:f64,scale:f64)->f64{return sqrt(x)+f64_div(x*x,scale);}
fn primal(x:f64,scale:f64)->Result<f64,String>{return reverse_linearize(objective,x,32,true,scale).map(fn(r)=>r.value);}
fn forward(x:f64,scale:f64)->f64{return gradient(objective,x,scale);}
fn reverse(x:f64,scale:f64)->Result<f64,String>{return reverse_gradient(objective,x,32,true,scale);}
"#,
    );
    for x in [0.25f64, 1.0 + 2.0f64.powi(-40), 9.0] {
        let scale = 2.0;
        let expected = 1.0 / (2.0 * x.sqrt()) + (x + x) / scale;
        assert_eq!(run(&m, "forward", json!([x, scale])), json!(expected));
        let actual = run(&m, "reverse", json!([x, scale]))["Ok"]
            .as_f64()
            .unwrap();
        assert!((actual - expected).abs() <= 2.0 * f64::EPSILON * expected.abs());
        assert_eq!(
            run(&m, "primal", json!([x, scale])),
            json!({"Ok":x.sqrt()+x*x/scale})
        );
    }
}

#[test]
fn records_dynamic_lists_context_and_tape_failures_use_the_selected_precision() {
    let m = module(
        r#"module shapes;
record W{bias:f64,values:List<f64>,}
record Context{scale:f64,legacy:f32,}
fn objective(w:W,c:Context)->f64{return w.bias*w.bias*c.scale+sum(w.values.map(fn(x)=>x*w.bias))+f64_from_f32(c.legacy);}
fn reverse(w:W,c:Context,maximum:u32)->Result<W,String>{return reverse_gradient(objective,w,maximum,true,c);}
fn squares(xs:List<f64>)->f64{return sum(xs.map(fn(x)=>x*x));}
fn many(xs:List<f64>)->Result<List<f64>,String>{return reverse_gradient(squares,xs,1024,true);}
"#,
    );
    let w = json!({"bias":3.0,"values":[2.0,4.0]});
    let c = json!({"scale":2.0,"legacy":0.25});
    assert_eq!(
        run(&m, "reverse", json!([w, c, 128])),
        json!({"Ok":{"bias":18.0,"values":[3.0,3.0]}})
    );
    assert_eq!(
        run(&m, "reverse", json!([w, c, 1])),
        json!({"Err":"reverse differentiation tape capacity exceeded"})
    );
    assert_eq!(
        run(&m, "reverse", json!([w, c, 1000001])),
        json!({"Err":"reverse differentiation capacity exceeds one million nodes"})
    );
    let values = (0..100)
        .map(|i| i as f64 - 50.0 + 2.0f64.powi(-40))
        .collect::<Vec<_>>();
    assert_eq!(
        run(&m, "many", json!([values])),
        json!({"Ok":values.iter().map(|x|2.0*x).collect::<Vec<_>>()})
    );
}

#[test]
fn record_forward_directions_are_binary64_and_context_remains_untracked() {
    let m = module(
        r#"module directions;
record W{a:f64,b:f64,}
fn objective(w:W,scale:f64)->f64{return (w.a*w.a+w.a*w.b)*scale;}
fn forward(w:W,scale:f64)->W{return gradient(objective,w,scale);}
fn direction(w:W,d:W,scale:f64)->f64{return jvp(objective,w,d,scale);}
"#,
    );
    let w = json!({"a":3.0,"b":4.0});
    assert_eq!(
        run(&m, "forward", json!([w, 2.0])),
        json!({"a":20.0,"b":6.0})
    );
    assert_eq!(
        run(&m, "direction", json!([w,{"a":0.25,"b":-0.5},2.0])),
        json!(2.0)
    );
}

#[test]
fn raw_primal_bits_zero_cotangent_policy_and_unused_singularities_remain_explicit() {
    let m = module(
        r#"module singular;
fn identity(x:f64)->f64{return x;}
fn primal(x:f64)->Result<f64,String>{return reverse_linearize(identity,x,16,true).map(fn(r)=>r.value);}
fn objective(x:f64)->f64{let unused=sqrt(x);return x;}
fn reverse(x:f64,stop:Bool)->Result<f64,String>{return reverse_gradient(objective,x,32,stop);}
"#,
    );
    for bits in [
        0u64,
        1,
        1 << 63,
        0x7ff0000000000000,
        0x7ff0000000001234,
        0xfff8000000005678,
    ] {
        let input = json!({"F64Bits":bits.to_string()});
        assert_eq!(
            run(&m, "primal", json!([input])),
            json!({"Ok":ink_core::float64::json_bits(bits)})
        );
    }
    assert_eq!(run(&m, "reverse", json!([0.0, true])), json!({"Ok":1.0}));
    assert_eq!(
        run(&m, "reverse", json!([0.0, false])),
        json!({"Ok":{"F64Bits":ink_core::float64::CANONICAL_NAN.to_string()}})
    );
}

#[test]
fn numeric_branches_and_precision_conversions_require_explicit_piecewise_policy() {
    for kind in ["gradient", "reverse_gradient"] {
        let args = if kind.starts_with("reverse") {
            "objective,x,32,true"
        } else {
            "objective,x"
        };
        let result = if kind.starts_with("reverse") {
            "Result<f64,String>"
        } else {
            "f64"
        };
        let source=format!("module policy;fn objective(x:f64)->f64{{return choose(x>0.0f64,x*x,-x);}}fn derivative(x:f64)->{result}{{return {kind}({args});}}");
        assert!(syntax::parse(&source)
            .unwrap_err()
            .contains("numeric decisions"));
        let admitted = module(&source.replace(&format!("{kind}("), &format!("{kind}_piecewise(")));
        let expected = if kind.starts_with("reverse") {
            json!({"Ok":-1.0})
        } else {
            json!(-1.0)
        };
        assert_eq!(run(&admitted, "derivative", json!([-2.0])), expected);
        let conversion = source.replace("choose(x>0.0f64,x*x,-x)", "f64_from_f32(f32_from_f64(x))");
        assert!(syntax::parse(&conversion)
            .unwrap_err()
            .contains("piecewise"));
    }
    let mixed="module mixed;record W{a:f64,b:f32,}fn objective(w:W)->f64{return w.a;}fn derivative(w:W)->W{return gradient(objective,w);}";
    assert!(syntax::parse(mixed)
        .unwrap_err()
        .contains("objective scalar precision"));
}

#[test]
fn reverse_exclusive_and_inclusive_terminal_steps_are_preserved_in_binary64() {
    for (body, expected) in [
        (
            "repeat_until(10,x,fn(s)=>s>=8.0f64,fn(i)=>fn(s)=>s*2.0f64)",
            4.0,
        ),
        (
            "fold_until(list(1,2,3,4),x,fn(i)=>fn(s)=>s>=4.0f64,fn(i)=>fn(s)=>s*2.0f64)",
            4.0,
        ),
        ("repeat_until(10,x,fn(s)=>true,fn(i)=>fn(s)=>s*2.0f64)", 1.0),
        (
            "fold_until(list(1,2,3),x,fn(i)=>fn(s)=>true,fn(i)=>fn(s)=>s*2.0f64)",
            2.0,
        ),
    ] {
        let m=module(&format!("module terminal;fn objective(x:f64)->f64{{return {body};}}fn reverse(x:f64)->Result<f64,String>{{return reverse_gradient_piecewise(objective,x,128,true);}}"));
        assert_eq!(run(&m, "reverse", json!([2.0])), json!({"Ok":expected}));
    }
}

#[test]
fn neither_precision_nor_ad_mode_can_drop_a_helper_proof_precondition() {
    for (ty, literal) in [("f32", "0.0"), ("f64", "0.0f64")] {
        for (kind, result, args) in [
            ("gradient", ty, "objective,x"),
            (
                "reverse_gradient",
                &format!("Result<{ty},String>"),
                "objective,x,32,true",
            ),
        ] {
            let source=format!("module contracts;spec fn constrained(x:{ty})->{ty} requires x>{literal};implementation selected for constrained{{return x*x;}}fn objective(x:{ty})->{ty}{{return constrained(x);}}fn derivative(x:{ty})->{result}{{return {kind}({args});}}");
            assert!(syntax::parse(&source)
                .unwrap_err()
                .contains("cannot transport proof preconditions"));
        }
    }
}

#[test]
fn binary64_names_are_hygienic_and_raw_core_does_not_gain_source_privileges() {
    let m = module(
        r#"module hygiene;
record __ink_reverse64_0_Node{value:f64,}
fn square(x:f64)->f64{return x*x;}
fn forward(__ink_differential64_0:f64)->f64{return gradient(square,__ink_differential64_0);}
fn reverse(x:f64)->Result<f64,String>{return reverse_gradient(square,x,16,true);}
"#,
    );
    assert_eq!(run(&m, "forward", json!([3.0])), json!(6.0));
    assert_eq!(run(&m, "reverse", json!([3.0])), json!({"Ok":6.0}));
    assert_eq!(
        m.program().records["__ink_reverse64_0_Node"],
        vec![("value".into(), syntax::Type::F64)]
    );
    let custom=module("module custom;fn gradient(x:f64)->f64{return x+1.0f64;}fn reverse_gradient(x:f64)->f64{return x+2.0f64;}fn run(x:f64)->f64{return gradient(x)+reverse_gradient(x);}");
    assert_eq!(custom.program().functions.len(), 3);
    assert_eq!(run(&custom, "run", json!([3.0])), json!(9.0));
    let mut raw = syntax::parse("module raw;fn run(x:f64)->f64{return x;}").unwrap();
    raw.functions[0].body =
        syntax::Expr::Call("gradient".into(), vec![syntax::Expr::Var("x".into())]);
    assert!(CheckedModule::from_source(raw).is_err());
}
