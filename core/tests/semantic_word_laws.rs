use ink_core::{bitproof, core::{Program, Type}, laws::{self, Catalogue, CheckedCatalogue, Equation, Law, Proof},
    registry, semantic::{self as s, Budget}, semantic_word};
use std::collections::BTreeMap;

fn fixtures() -> Vec<(String, Law)> {
    let rows: Vec<serde_json::Value> = serde_json::from_str(include_str!("fixtures/semantic-word-laws.json")).unwrap();
    rows.into_iter().map(|row|(row["name"].as_str().unwrap().into(),serde_json::from_value(row["law"].clone()).unwrap())).collect()
}
fn check(law: Law) -> Result<CheckedCatalogue,String> {
    let id=registry::identity(&registry::Entry::from_law(&law)?).unwrap();
    CheckedCatalogue::check(&Catalogue {schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:BTreeMap::from([(id,law)])},&Program::default())
}
fn fixture(name:&str)->Law {fixtures().into_iter().find(|(n,_)|n==name).unwrap().1}

#[test]
fn word_certificates_replay_unsigned_wrapping_ranges_conditions_and_booleans(){
    for (name,law) in fixtures(){check(law).unwrap_or_else(|e|panic!("{name}: {e}"));}
}
#[test]
fn source_rehashing_or_false_premises_do_not_repair_a_false_word_certificate(){
    let mut law=fixture("case_ranges");law.to=s::term(s::value(Type::Bool),s::Node::Bool(false));
    let Proof::Word{hypotheses,certificate}=&mut law.proof else{panic!()};
    let problem=semantic_word::problem(&Program::default(),&law.params,&law.conditions,
        &Equation{from:law.from.clone(),to:law.to.clone()},hypotheses,certificate.encoding,&mut Budget::new()).unwrap();
    certificate.problem_sha256=problem.identity().into();
    assert!(check(law).is_err());
    let mut law=fixture("conditional_increment");law.conditions.clear();
    assert!(check(law.clone()).is_err());
    let Proof::Word{hypotheses,certificate}=&mut law.proof else{panic!()};hypotheses.clear();
    let problem=semantic_word::problem(&Program::default(),&law.params,&law.conditions,
        &Equation{from:law.from.clone(),to:law.to.clone()},hypotheses,certificate.encoding,&mut Budget::new()).unwrap();
    certificate.problem_sha256=problem.identity().into();
    assert!(check(law).is_err());
    let mut law=fixture("wrap_intermediate");
    let Proof::Word{certificate,..}=&mut law.proof else{panic!()};certificate.steps.clear();
    assert!(check(law).is_err());
}
#[test]
fn word_certificate_inputs_are_typed_scoped_and_resource_bounded(){
    let base=fixture("wrap_intermediate");
    // Re-labeling all U32 terms as U64 changes the wrapping proposition.
    let text=serde_json::to_string(&base).unwrap().replace("U32","U64");
    let mut law:Law=serde_json::from_str(&text).unwrap();
    let Proof::Word{hypotheses,certificate}=&mut law.proof else{panic!()};
    let problem=semantic_word::problem(&Program::default(),&law.params,&law.conditions,
        &Equation{from:law.from.clone(),to:law.to.clone()},hypotheses,certificate.encoding,&mut Budget::new()).unwrap();
    certificate.problem_sha256=problem.identity().into();assert!(check(law).is_err());
    for ty in [Type::I32,Type::Int,Type::F32,Type::List(Box::new(Type::U32))]{
        let x=s::free(s::value(ty),"x");let env=BTreeMap::from([("x".into(),x.sort.clone())]);
        assert!(semantic_word::problem(&Program::default(),&env,&[],&Equation{from:x.clone(),to:x},&[],bitproof::Encoding::SharedV2,&mut Budget::new()).is_err());
    }
    let x=s::free(s::value(Type::U32),"x");let env=BTreeMap::from([("x".into(),x.sort.clone())]);
    let goal=Equation{from:x.clone(),to:x};
    assert!(semantic_word::problem(&Program::default(),&env,&[goal.clone()],&goal,&[0,0],bitproof::Encoding::SharedV2,&mut Budget::new()).is_err());
    assert!(semantic_word::problem(&Program::default(),&env,&[],&goal,&[],bitproof::Encoding::SharedV2,&mut Budget{remaining:1,..Budget::new()}).is_err());
    let renamed=serde_json::to_string(&base).unwrap().replace("\"x\"","\"renamed\"");
    check(serde_json::from_str(&renamed).unwrap()).unwrap();
    let mut law=base;law.semantics=laws::SEMANTICS.into();assert!(check(law).is_err());
}
