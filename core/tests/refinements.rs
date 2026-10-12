use ink_core::{
    core::CheckedModule,
    laws::{self, Catalogue, CheckedCatalogue, Equation, Law, Proof},
    registry,
    semantic::{self as s, Budget, Node},
    syntax::{parse, Type},
};
use std::collections::BTreeMap;
#[test]
fn database_cardinality_refinements_check_with_generic_kernel() {
    let module = CheckedModule::from_source(
        parse("module refinement; fn id(x:u32)->u32{return x;}").unwrap(),
    )
    .unwrap();
    let laws: Vec<Law> =
        serde_json::from_str(include_str!("fixtures/refinement-laws.json")).unwrap();
    assert_eq!(laws.len(), 35);
    for law in laws {
        let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        let catalogue = Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![id.clone()],
            objects: BTreeMap::from([(id, law.clone())]),
        };
        CheckedCatalogue::check(&catalogue, module.program())
            .unwrap_or_else(|e| panic!("refinement {:?}: {e}", law.from));
    }
}
#[test]
fn integer_certificates_reject_wrapping_forgery_and_false_conclusions() {
    let module = CheckedModule::from_source(
        parse("module arithmetic;fn id(x:Int)->Int{return x;}").unwrap(),
    )
    .unwrap();
    let p = module.program();
    let checked = CheckedCatalogue::check(
        &Catalogue {
            schema: 1,
            semantics: laws::SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        },
        p,
    )
    .unwrap();
    let proposition = |a, b| Equation {
        from: s::op(s::value(Type::Bool), "binary:<=", vec![a, b]),
        to: s::term(s::value(Type::Bool), Node::Bool(true)),
    };
    let x = s::free(s::value(Type::Int), "x");
    let y = s::free(s::value(Type::Int), "y");
    let env = BTreeMap::from([("x".into(), x.sort.clone()), ("y".into(), y.sort.clone())]);
    let hyp = vec![proposition(x.clone(), y.clone())];
    let proof = Proof::Linear {
        premises: vec![(0, 1)],
    };
    let plus = s::op(
        s::value(Type::Int),
        "binary:+",
        vec![y.clone(), s::word(Type::Int, 1)],
    );
    checked
        .prove(
            p,
            &env,
            &hyp,
            &proposition(x.clone(), plus),
            &proof,
            &mut Budget::new(),
            0,
        )
        .unwrap();
    assert!(checked
        .prove(
            p,
            &env,
            &hyp,
            &proposition(y, x),
            &proof,
            &mut Budget::new(),
            0
        )
        .is_err());
    assert!(checked
        .prove(
            p,
            &BTreeMap::new(),
            &[],
            &proposition(s::word(Type::Int, 2), s::word(Type::Int, 1)),
            &Proof::Linear { premises: vec![] },
            &mut Budget::new(),
            0
        )
        .is_err());
    assert!(checked
        .prove(
            p,
            &BTreeMap::new(),
            &[],
            &proposition(s::word(Type::U32, u32::MAX as u64), s::word(Type::U32, 0)),
            &Proof::Linear { premises: vec![] },
            &mut Budget::new(),
            0
        )
        .is_err());
}
#[test]
fn capacity_contract_binds_record_projection_and_rejects_unrelated_or_stale_facts() {
    let module=CheckedModule::from_source(parse("module projection;record Input{rows:List<u32>,}fn select(input:Input)->List<u32>{return input.rows.filter(fn(x)=>x>3);}").unwrap()).unwrap();
    let f = &module.program().functions[0];
    let body = s::elaborate(
        &f.body,
        &ink_core::check::params_env(&f.params).unwrap(),
        module.program(),
        &f.result,
    )
    .unwrap();
    let Node::Op(_, args) = &body.node else {
        panic!()
    };
    let law: Law = serde_json::from_str::<Vec<Law>>(include_str!("fixtures/refinement-laws.json"))
        .unwrap()
        .into_iter()
        .find(|l| {
            l.params.get("xs") == Some(&s::value(Type::List(Box::new(Type::U32))))
                && l.params.contains_key("p")
        })
        .unwrap();
    let id = registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    let knowledge = registry::from_catalogue(&Catalogue {
        schema: 1,
        semantics: laws::SEMANTICS.into(),
        roots: vec![id.clone()],
        objects: BTreeMap::from([(id.clone(), law)]),
    })
    .unwrap();
    let count = |v| s::op(s::value(Type::Int), "call:count", vec![v]);
    let fact = ink_core::property::Fact {
        function: "select".into(),
        subject_variable: "subject".into(),
        context: s::op(
            s::value(Type::Bool),
            "binary:<=",
            vec![
                count(s::free(body.sort.clone(), "subject")),
                count(args[0].clone()),
            ],
        ),
        value: s::term(s::value(Type::Bool), Node::Bool(true)),
        proof: Proof::Use {
            types: Default::default(),
            assumptions: vec![],
            law: id,
            arguments: BTreeMap::from([
                ("xs".into(), args[0].clone()),
                ("p".into(), args[1].clone()),
            ]),
            premises: vec![],
        },
    };
    let evidence = ink_core::property::Package {
        schema: 1,
        semantics: ink_core::property::SEMANTICS.into(),
        input_core_sha256: module.identity().unwrap(),
        knowledge,
        facts: vec![fact],
    };
    let mut plan:ink_core::physical::Plan=serde_json::from_value(serde_json::json!({"schema":1,"semantics":ink_core::physical::SEMANTICS,"input_core_sha256":module.identity().unwrap(),"reservations":[{"function":"select","parameter":"input","fields":["rows"],"evidence":evidence}]})).unwrap();
    ink_core::physical::check(&module, None, &plan).unwrap();
    plan.reservations[0].fields = vec![];
    assert!(ink_core::physical::check(&module, None, &plan).is_err());
    plan.reservations[0].fields = vec!["missing".into()];
    assert!(ink_core::physical::check(&module, None, &plan).is_err());
    plan.reservations[0].fields = vec!["rows".into()];
    plan.reservations[0].evidence.input_core_sha256 = "0".repeat(64);
    assert!(ink_core::physical::check(&module, None, &plan).is_err());
}

#[test]
fn database_allocation_formulas_are_universal_across_carriers(){
 let module=CheckedModule::from_source(parse("module allocation;fn id(x:u32)->u32{return x;}").unwrap()).unwrap();
 let laws:Vec<Law>=serde_json::from_str(include_str!("fixtures/allocation-laws.json")).unwrap();assert_eq!(laws.len(),8);
 for law in laws{
  let id=registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();let catalogue=Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])};CheckedCatalogue::check(&catalogue,module.program()).unwrap();
 }
}
