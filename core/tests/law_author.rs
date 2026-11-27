use ink_core::{
    core::{CheckedModule, Program},
    law_author,
    laws::{Catalogue, CheckedCatalogue, Equation, Proof},
    registry::CheckedBundle,
    semantic as s, syntax,
};
use std::collections::BTreeMap;
#[test]
fn external_authoring_replays_independently_and_source_never_grants_authority() {
    let source = "module laws;rewrite twice(x:Int){from x+x;to x*2;proof by normalize;}";
    let program = syntax::parse(source).unwrap();
    assert!(CheckedModule::from_source(program.clone()).is_err());
    let authored = law_author::compile(program, BTreeMap::new(), None).unwrap();
    assert_eq!(authored.names.len(), 1);
    CheckedCatalogue::check(
        &CheckedBundle::check(&authored.bundle)
            .unwrap()
            .catalogue()
            .unwrap(),
        &Program::default(),
    )
    .unwrap();
    for source in [
      "module bad;rewrite wrong(x:Int){from x+1;to x;proof by normalize;}",
      "module bad;rewrite wrong(x:u32){from x;to true;proof by normalize;}",
      "module bad;rewrite claim(x:u32){from x;to x;proof by trusted;}",
      "module bad;rewrite claim(x:u32){from x;to x;proof by provided;}",
      "module bad;rewrite a(x:u32){from x;to x;proof by normalize;}rewrite a(x:u32){from x;to x;proof by normalize;}",
    ]{assert!(syntax::parse(source).and_then(|p|law_author::compile(p,BTreeMap::new(),None)).is_err(),"accepted {source}");}
}
#[test]
fn supplied_proofs_keep_conditions_and_exact_definition_context() {
    let source="module laws;fn inc(x:u32)->u32{return x+1;}rewrite unwrap(x:u32){from inc(x);to x+1;proof by normalize;}";
    let authored =
        law_author::compile(syntax::parse(source).unwrap(), BTreeMap::new(), None).unwrap();
    let catalogue = CheckedBundle::check(&authored.bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    CheckedCatalogue::check(&catalogue, &Program::default()).unwrap();
    assert!(catalogue
        .objects
        .values()
        .any(|law| law.definition_context.is_some()));
    let source = "module conditional;rewrite known_zero(x:Int){from x;to 0;proof by provided;}";
    let equation = Equation {
        from: s::free(s::value(ink_core::core::Type::Int), "x"),
        to: s::word(ink_core::core::Type::Int, 0),
    };
    let evidence = BTreeMap::from([(
        "known_zero".into(),
        law_author::Evidence {
            proof: Proof::Hypothesis(0),
            conditions: vec![equation],
        },
    )]);
    let authored = law_author::compile(syntax::parse(source).unwrap(), evidence, None).unwrap();
    let c: Catalogue = CheckedBundle::check(&authored.bundle)
        .unwrap()
        .catalogue()
        .unwrap();
    assert_eq!(c.objects.values().next().unwrap().conditions.len(), 1);
    let evidence = BTreeMap::from([(
        "known_zero".into(),
        law_author::Evidence {
            proof: Proof::Hypothesis(0),
            conditions: vec![],
        },
    )]);
    assert!(law_author::compile(syntax::parse(source).unwrap(), evidence, None).is_err());
}
