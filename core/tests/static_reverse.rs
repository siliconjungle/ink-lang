use ink_core::{
    analysis,
    core::CheckedModule,
    eval::{self, Value},
    syntax::{self, Expr, Type},
};
use serde_json::{json, Value as Json};

fn module(source: &str) -> CheckedModule {
    CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap()
}
fn run(m: &CheckedModule, name: &str, args: Json) -> Value {
    let fun = m
        .program()
        .functions
        .iter()
        .find(|f| f.name == name)
        .unwrap();
    let args = args
        .as_array()
        .unwrap()
        .iter()
        .zip(&fun.params)
        .map(|(v, (_, t))| Value::from_program_json(v, t, m.program()).unwrap())
        .collect();
    eval::call(m.program(), name, args, &mut 30_000_000).unwrap()
}
fn bits(v: Value) -> Json {
    match v {
        Value::F32(b) => json!({"f32":b}),
        Value::F64(b) => json!({"f64":b.to_string()}),
        Value::Record(_, fs) => fs.into_iter().map(|(n, v)| (n, bits(v))).collect(),
        Value::List(xs) => xs.into_iter().map(bits).collect(),
        v => v.json(),
    }
}
fn has_tape(m: &CheckedModule, root: &str) -> bool {
    let deps = analysis::function_dependencies(m.program(), root, 1_000_000).unwrap();
    m.program().functions.iter().filter(|f| deps.functions.contains(&f.name)).any(|f| {
        let mut owned = false;
        analysis::walk(&f.body, |e| if matches!(e, Expr::Method(x,n,_) if matches!(x.as_ref(),Expr::Var(v) if v=="Buffer")&&n=="empty") { owned=true; });
        owned || f.params.iter().any(|(_, t)| matches!(t, Type::Buffer(_)))
    })
}

#[test]
fn shared_primals_keep_distinct_tape_nodes_and_ordered_reverse_edges() {
    let m=module("module sharing;fn square(x:f32)->f32{return x*x;}fn objective(x:f32)->f32{return square(x)+square(x);}fn derivative(x:f32,maximum:u32)->Result<f32,String>{return reverse_gradient(objective,x,maximum,false);}fn primal(x:f32,maximum:u32)->Result<f32,String>{return reverse_linearize(objective,x,maximum,false).map(fn(r)=>r.value);}");
    let deps = analysis::function_dependencies(m.program(), "derivative", 100_000).unwrap();
    let mut products = 0;
    for fun in m
        .program()
        .functions
        .iter()
        .filter(|f| deps.functions.contains(&f.name))
    {
        analysis::walk(&fun.body, |e| {
            if matches!(e,Expr::Binary(n,_,_)if n=="*") {
                products += 1;
            }
        });
    }
    // One shared primal multiply, four separate reverse contributions.
    assert_eq!(products, 5);
    let linear = analysis::function_dependencies(m.program(), "primal", 100_000).unwrap();
    assert!(
        deps.functions
            .intersection(&linear.functions)
            .any(|n| n.starts_with("__ink_reverse")),
        "both interfaces must execute the same generated kernel"
    );
    assert_eq!(
        run(&m, "derivative", json!([3.0, 4])).json(),
        json!({"Ok":12.0})
    );
    assert_eq!(
        run(&m, "derivative", json!([3.0, 3])).json(),
        json!({"Err":"reverse differentiation tape capacity exceeded"})
    );
}

#[test]
fn static_tape_matches_dynamic_order_capacity_and_exceptional_bits() {
    for wide in [false, true] {
        // The list adapter intentionally retains the independently implemented
        // dynamic tape. Its two parameter seeds have the same order as Pair.
        let source = r#"module static_check;
record Pair{a:f32,b:f32,}
fn helper(a:f32,b:f32)->f32{let square=a*a;return f32_div(square,b)+sqrt(b*b);}
fn objective(w:Pair,c:f32)->f32{let unused=w.b*0.0;return helper(w.a,w.b)-helper(w.a,w.b)+(-w.a*w.a)*c;}
fn dynamic_objective(w:List<f32>,c:f32)->f32{return objective(Pair{a:w.at_or(0,0.0),b:w.at_or(1,0.0)},c);}
fn direct(w:Pair,c:f32,maximum:u32,stop:Bool)->Result<Pair,String>{return reverse_gradient(objective,w,maximum,stop,c);}
fn dynamic(w:List<f32>,c:f32,maximum:u32,stop:Bool)->Result<Pair,String>{return reverse_gradient(dynamic_objective,w,maximum,stop,c).map(fn(g)=>Pair{a:g.at_or(0,0.0),b:g.at_or(1,0.0)});}
fn primal(w:Pair,c:f32,maximum:u32,stop:Bool)->Result<f32,String>{return reverse_linearize(objective,w,maximum,stop,c).map(fn(g)=>g.value);}
fn dynamic_primal(w:List<f32>,c:f32,maximum:u32,stop:Bool)->Result<f32,String>{return reverse_linearize(dynamic_objective,w,maximum,stop,c).map(fn(g)=>g.value);}
"#;
        let source = if wide {
            source.replace("f32", "f64").replace("0.0", "0.0f64")
        } else {
            source.to_owned()
        };
        let m = module(&source);
        assert!(!has_tape(&m, "direct"));
        assert!(has_tape(&m, "dynamic"));
        let mut words = if wide {
            vec![
                0,
                1,
                1u64 << 63,
                (1u64 << 63) + 1,
                0x0010000000000000,
                0x3ff0000000000001,
                0xbff0000000000001,
                0x7fefffffffffffff,
                0x7ff0000000000000,
                0xfff0000000000000,
                0x7ff0000000001234,
                0xfff8000000005678,
            ]
        } else {
            vec![
                0, 1, 0x80000000, 0x80000001, 0x00800000, 0x3f800001, 0xbf800001, 0x7f7fffff,
                0x7f800000, 0xff800000, 0x7f800001, 0xffc12345,
            ]
        };
        let mut seed = 107u64;
        for _ in 0..16 {
            seed = seed.wrapping_mul(6364136223846793005).wrapping_add(1);
            words.push(if wide { seed } else { seed as u32 as u64 });
        }
        let scalar = |b: u64| {
            if wide {
                json!({"F64Bits":b.to_string()})
            } else {
                json!({"F32Bits":b})
            }
        };
        for i in 0..words.len() {
            let a = scalar(words[i]);
            let b = scalar(words[(i + 5) % words.len()]);
            let c = scalar(words[(i + 9) % words.len()]);
            for stop in [false, true] {
                // Every capacity edge on the first input, full exceptional-bit
                // histories on the rest, and the early hard cap throughout.
                let capacities = if i == 0 {
                    (0..24).chain([1_000_000, 1_000_001]).collect::<Vec<_>>()
                } else {
                    vec![1, 24, 1_000_001]
                };
                for maximum in capacities {
                    for (direct, dynamic) in [("direct", "dynamic"), ("primal", "dynamic_primal")] {
                        assert_eq!(
                            bits(run(&m, direct, json!([{"a":a,"b":b},c,maximum,stop]))),
                            bits(run(&m, dynamic, json!([[a, b], c, maximum, stop]))),
                            "wide={wide} input={i} maximum={maximum} stop={stop} {direct}"
                        );
                    }
                }
            }
        }
        assert_eq!(
            CheckedModule::from_bytes(&m.bytes().unwrap())
                .unwrap()
                .identity(),
            m.identity()
        );
    }
}

#[test]
fn bounded_static_scheduling_covers_sixty_four_parameters_and_keeps_fallback() {
    let slots = (0..8).map(|i| format!("w{i}")).collect::<Vec<_>>();
    let blocks = (0..8).map(|i| format!("b{i}")).collect::<Vec<_>>();
    let mut source = format!(
        "module large;record Block{{{},}}record Weights{{{},}}",
        slots
            .iter()
            .map(|n| format!("{n}:f32"))
            .collect::<Vec<_>>()
            .join(","),
        blocks
            .iter()
            .map(|n| format!("{n}:Block"))
            .collect::<Vec<_>>()
            .join(",")
    );
    source+=&format!("fn block(w:Block)->f32{{return {};}}fn objective(w:Weights)->f32{{return {};}}fn derivative(w:Weights)->Result<Weights,String>{{return reverse_gradient(objective,w,4096,true);}}",
        slots.iter().map(|n|format!("w.{n}*w.{n}")).collect::<Vec<_>>().join("+"),
        blocks.iter().map(|n|format!("block(w.{n})")).collect::<Vec<_>>().join("+"));
    let m = module(&source);
    assert!(!has_tape(&m, "derivative"));
    let weights: Json = blocks
        .iter()
        .enumerate()
        .map(|(i, b)| {
            (
                b.clone(),
                slots
                    .iter()
                    .enumerate()
                    .map(|(j, n)| (n.clone(), json!((i * 8 + j) as f32 / 16.0)))
                    .collect::<Json>(),
            )
        })
        .collect();
    let expected: Json = blocks
        .iter()
        .enumerate()
        .map(|(i, b)| {
            (
                b.clone(),
                slots
                    .iter()
                    .enumerate()
                    .map(|(j, n)| (n.clone(), json!((i * 8 + j) as f32 / 8.0)))
                    .collect::<Json>(),
            )
        })
        .collect();
    assert_eq!(
        run(&m, "derivative", json!([weights])).json(),
        json!({"Ok":expected})
    );
    // Too much statically expanded work and dynamic control keep owned tapes.
    for objective in ["repeat(300,x,fn(i)=>fn(a)=>a*a)", "choose(x>0.0,x*x,-x)"] {
        let m=module(&format!("module fallback;fn objective(x:f32)->f32{{return {objective};}}fn derivative(x:f32)->Result<f32,String>{{return reverse_gradient_piecewise(objective,x,4096,true);}}"));
        assert!(has_tape(&m, "derivative"));
    }
}
