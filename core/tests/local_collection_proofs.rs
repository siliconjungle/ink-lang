use ink_core::{
    check,
    core::{CheckedModule, Type},
    eval,
    laws::{Catalogue, CheckedCatalogue, Equation, Proof},
    semantic::{self as s, Budget, Node},
    syntax::parse,
};
use std::collections::BTreeMap;

fn empty(module: &CheckedModule) -> CheckedCatalogue {
    CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: ink_core::laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        module.program(),
    )
    .unwrap()
}

#[test]
fn stopping_operational_meaning_matches_reference_indices_and_timing() {
    let module = CheckedModule::from_source(parse("module P; fn run(n:u32,x:u32,goal:u32)->u32{return repeat_until(n,x,fn(a)=>a>=goal,fn(i)=>fn(a)=>a+i+1);}").unwrap()).unwrap();
    let p = module.program();
    let f = &p.functions[0];
    let term = s::elaborate(
        &f.body,
        &check::params_env(&f.params).unwrap(),
        p,
        &f.result,
    )
    .unwrap();
    for (n, x, goal) in [
        (0, 0, 6),
        (1, 0, 6),
        (2, 0, 6),
        (10, 0, 6),
        (u32::MAX, 7, 6),
        (4, u32::MAX - 2, u32::MAX),
    ] {
        let got = eval::call(
            p,
            "run",
            vec![
                eval::Value::U32(n),
                eval::Value::U32(x),
                eval::Value::U32(goal),
            ],
            &mut 10000,
        )
        .unwrap();
        let eval::Value::U32(got) = got else { panic!() };
        let args = BTreeMap::from([
            ("n".into(), s::word(Type::U32, n as u64)),
            ("x".into(), s::word(Type::U32, x as u64)),
            ("goal".into(), s::word(Type::U32, goal as u64)),
        ]);
        let from = s::substitute(&term, &args, &mut Budget::new()).unwrap();
        empty(&module)
            .prove(
                p,
                &BTreeMap::new(),
                &[],
                &Equation {
                    from,
                    to: s::word(Type::U32, got as u64),
                },
                &Proof::Normalize,
                &mut Budget::new(),
                0,
            )
            .unwrap();
    }
}

#[test]
fn buffer_observations_preserve_float_bits_and_lazy_fallback() {
    let module = CheckedModule::from_source(
        parse("module P; fn get(xs:List<f32>,i:u32,f:f32)->f32{return buffer(xs).at_or(i,f);}")
            .unwrap(),
    )
    .unwrap();
    let p = module.program();
    let f = &p.functions[0];
    let term = s::elaborate(
        &f.body,
        &check::params_env(&f.params).unwrap(),
        p,
        &f.result,
    )
    .unwrap();
    let scalar = s::value(Type::F32);
    let sequence = s::value(Type::List(Box::new(Type::F32)));
    let bits = [0x80000000, 0x7fc01234, 0x7f800000];
    let xs = bits
        .iter()
        .rev()
        .fold(s::term(sequence.clone(), Node::Nil), |tail, &bits| {
            s::term(
                sequence.clone(),
                Node::Cons(
                    Box::new(s::term(scalar.clone(), Node::Float(bits))),
                    Box::new(tail),
                ),
            )
        });
    for i in [0, 1, 2, 3, u32::MAX] {
        let fallback = s::term(scalar.clone(), Node::Float(0x7fc05678));
        let args = BTreeMap::from([
            ("xs".into(), xs.clone()),
            ("i".into(), s::word(Type::U32, i as u64)),
            ("f".into(), fallback),
        ]);
        let from = s::substitute(&term, &args, &mut Budget::new()).unwrap();
        let to = s::term(
            scalar.clone(),
            Node::Float(bits.get(i as usize).copied().unwrap_or(0x7fc05678)),
        );
        empty(&module)
            .prove(
                p,
                &BTreeMap::new(),
                &[],
                &Equation { from, to },
                &Proof::Normalize,
                &mut Budget::new(),
                0,
            )
            .unwrap();
    }
}

#[test]
fn malformed_owned_semantic_terms_fail_closed() {
    let module =
        CheckedModule::from_source(parse("module P; fn id(x:u32)->u32{return x;}").unwrap())
            .unwrap();
    let p = module.program();
    let buf = s::value(Type::Buffer(Box::new(Type::U32)));
    let b = s::free(buf.clone(), "b");
    let env = BTreeMap::from([("b".into(), buf.clone())]);
    for t in [
        s::op(
            buf.clone(),
            "method:push",
            vec![b.clone(), s::word(Type::U64, 1)],
        ),
        s::op(
            s::value(Type::List(Box::new(Type::U32))),
            "method:freeze",
            vec![s::word(Type::U32, 0)],
        ),
    ] {
        assert!(s::validate(&t, &env, p, &mut Budget::new()).is_err());
    }
    let source=CheckedModule::from_source(parse("module P; fn edit(xs:List<u32>)->List<u32>{let b=buffer(xs);return b.push(7).freeze();} fn loop(xs:List<u32>)->List<u32>{let b=buffer(xs);let b=repeat_until(3,b,fn(b)=>false,fn(i)=>fn(b)=>b);return b.freeze();}").unwrap()).unwrap();
    let subject = ink_core::optimisation::subject(&source).unwrap();
    assert!(subject.functions.contains_key("edit"));
    assert!(subject.functions.contains_key("loop"));
}

#[test]
fn larger_in_memory_catalogues_use_bounded_authenticated_leaves() {
    use ink_core::{
        laws::{self, Law},
        registry,
    };
    let module =
        CheckedModule::from_source(parse("module P; fn id(x:u32)->u32{return x;}").unwrap())
            .unwrap();
    let mut catalogue = Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![],
        objects: BTreeMap::new(),
    };
    for n in 0..1025 {
        if [0, 1, 64, 65, 128, 129, 1024].contains(&n) {
            let bundle = registry::from_catalogue(&catalogue).unwrap();
            assert!(bundle
                .membership
                .values()
                .all(|m| m.entries.len() <= 64 && m.path.len() <= 4));
            registry::CheckedBundle::check(&bundle)
                .unwrap()
                .verify(module.program())
                .unwrap();
            if n > 64 {
                let mut bad = bundle.clone();
                bad.membership.values_mut().next().unwrap().path[0].sibling = "0".repeat(64);
                assert!(registry::CheckedBundle::check(&bad).is_err());
            }
        }
        let x = s::free(s::value(Type::U32), "x");
        let from = s::op(
            s::value(Type::U32),
            "binary:+",
            vec![x, s::word(Type::U32, n as u64)],
        );
        let law = Law {
            types: vec![],
            assumptions: vec![],
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            params: BTreeMap::from([("x".into(), s::value(Type::U32))]),
            conditions: vec![],
            from: from.clone(),
            to: from,
            proof: Proof::Normalize,
            dependencies: vec![],
            definition_context: None,
        };
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        catalogue.roots.push(id.clone());
        catalogue.objects.insert(id, law);
    }
    assert!(registry::from_catalogue(&catalogue).is_err());
}
