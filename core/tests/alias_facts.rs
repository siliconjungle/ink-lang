use ink_core::{
    core::{CheckedModule, Type},
    laws::{self, Catalogue, CheckedCatalogue, Equation, Proof},
    semantic::{self as s, Budget, Node},
    syntax,
};
use std::collections::BTreeMap;

#[test]
fn facts_follow_typed_alias_chains_and_cyclic_facts_do_not_prove_arbitrary_values() {
    let module = CheckedModule::from_source(
        syntax::parse("module aliases;record Box{valid:Bool,}").unwrap(),
    )
    .unwrap();
    let p = module.program();
    let checker = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        p,
    )
    .unwrap();
    let sort = s::value(Type::Named("Box".into()));
    let names = (0..12).map(|i| format!("alias{i}")).collect::<Vec<_>>();
    let env = names.iter().map(|n| (n.clone(), sort.clone())).collect();
    let values = names
        .iter()
        .map(|n| s::free(sort.clone(), n))
        .collect::<Vec<_>>();
    let yes = s::term(s::value(Type::Bool), Node::Bool(true));
    let valid = |v: s::Term| s::op(s::value(Type::Bool), "field:valid", vec![v]);
    let mut facts = vec![Equation {
        from: valid(values[0].clone()),
        to: yes.clone(),
    }];
    facts.extend(values.windows(2).map(|pair| Equation {
        from: pair[1].clone(),
        to: pair[0].clone(),
    }));
    let goal = Equation {
        from: valid(values[11].clone()),
        to: yes.clone(),
    };
    checker
        .prove(
            p,
            &env,
            &facts,
            &goal,
            &Proof::Normalize,
            &mut Budget::new(),
            0,
        )
        .unwrap();
    facts.remove(0);
    assert!(checker
        .prove(
            p,
            &env,
            &facts,
            &goal,
            &Proof::Normalize,
            &mut Budget::new(),
            0
        )
        .is_err());
    let cyclic = vec![
        Equation {
            from: values[0].clone(),
            to: values[1].clone(),
        },
        Equation {
            from: values[1].clone(),
            to: values[0].clone(),
        },
    ];
    let false_goal = Equation {
        from: valid(values[0].clone()),
        to: yes,
    };
    assert!(checker
        .prove(
            p,
            &env,
            &cyclic,
            &false_goal,
            &Proof::Normalize,
            &mut Budget::new(),
            0
        )
        .is_err());
}

#[test]
fn established_structural_relations_transport_exact_identity_but_ieee_equality_does_not() {
    let p=ink_core::core::Program::default();
    let checker=CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},&p).unwrap();
    let sort=s::value(Type::List(Box::new(Type::F32)));
    let x=s::free(sort.clone(),"xs");let y=s::free(sort.clone(),"ys");
    let env=BTreeMap::from([("xs".into(),sort.clone()),("ys".into(),sort.clone())]);
    let boolean=s::value(Type::Bool);let yes=s::term(boolean.clone(),Node::Bool(true));
    // The equality is established through an instantiated relation callback.
    let callback=s::lambda(sort.clone(),s::op(boolean.clone(),"value:equal",vec![s::term(sort.clone(),Node::Bound(0)),y.clone()]));
    let relation=s::op(boolean.clone(),"apply",vec![callback,x.clone()]);
    let goal=Equation{from:x.clone(),to:y.clone()};
    checker.prove(&p,&env,&[Equation{from:relation,to:yes.clone()}],&goal,&Proof::Normalize,&mut Budget::new(),0).unwrap();
    assert!(checker.prove(&p,&env,&[],&goal,&Proof::Normalize,&mut Budget::new(),0).is_err());
    let sort=s::value(Type::F32);let x=s::free(sort.clone(),"x");let y=s::free(sort.clone(),"y");
    let env=BTreeMap::from([("x".into(),sort.clone()),("y".into(),sort.clone())]);
    let goal=Equation{from:x.clone(),to:y.clone()};
    let ieee=s::op(boolean,"binary:==",vec![x,y]);
    assert!(checker.prove(&p,&env,&[Equation{from:ieee,to:yes}],&goal,&Proof::Normalize,&mut Budget::new(),0).is_err());
}
