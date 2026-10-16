use ink_core::{bitproof::{Certificate,Encoding,Step},core::{Program,Type},laws::{self,BitVectorSemantics as Mode,Catalogue,CheckedCatalogue,Equation,Proof},semantic as s};
use std::collections::BTreeMap;
fn f32_roundtrip() -> (Program,s::Env,Equation) {
    let p=Program::default();let f=s::value(Type::F32);let u=s::value(Type::U32);
    let x=s::free(f.clone(),"x");
    let source=s::op(f,"call:f32_from_bits",vec![s::op(u,"call:f32_bits",vec![x.clone()])]);
    (p,BTreeMap::from([("x".into(),x.sort.clone())]),Equation{from:source,to:x})
}
fn checked(p:&Program)->CheckedCatalogue {
    CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},p).unwrap()
}
#[test]
fn exact_float_bits_have_explicit_mode_and_replay_ordinary_rup() {
    let (p,env,goal)=f32_roundtrip();
    for mode in [Mode::OpaqueV1,Mode::FixedWordsV2] {
        assert!(laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,mode,Encoding::SharedV2).is_err());
    }
    let problem=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV3,Encoding::SharedV2).unwrap();
    assert_eq!(problem.clauses().last().unwrap(),&vec![-1]);
    let certificate=Certificate{encoding:Encoding::SharedV2,problem_sha256:problem.identity().into(),steps:vec![Step{clause:vec![],hints:vec![0,problem.clauses().len()-1],hint_deltas_v1:None}]};
    let proof=Proof::BitVector{semantics:Mode::FixedScalarsV3,hypotheses:vec![],certificate:certificate.clone()};
    let c=checked(&p);c.prove(&p,&env,&[],&goal,&proof,&mut s::Budget::new(),0).unwrap();
    for mode in [Mode::OpaqueV1,Mode::FixedWordsV2] {
        let forged=Proof::BitVector{semantics:mode,hypotheses:vec![],certificate:certificate.clone()};
        assert!(c.prove(&p,&env,&[],&goal,&forged,&mut s::Budget::new(),0).is_err());
    }
    let mut budget=s::Budget{bit_work:0,..s::Budget::new()};
    assert!(c.prove(&p,&env,&[],&goal,&proof,&mut budget,0).unwrap_err().contains("bit circuit work limit"));
    let bytes=serde_json::to_value(&proof).unwrap();assert_eq!(bytes["BitVector"]["semantics"],"fixed-scalars-v3");
}
#[test]
fn float_arithmetic_is_not_mistaken_for_word_arithmetic_or_nan_reflexivity() {
    let (p,env,_)=f32_roundtrip();let f=s::value(Type::F32);let x=s::free(f.clone(),"x");
    let bool_=s::value(Type::Bool);
    for (from,to) in [
        (s::op(f.clone(),"binary:+",vec![x.clone(),s::term(f.clone(),s::Node::Float(0))]),x.clone()),
        (s::op(bool_.clone(),"binary:==",vec![x.clone(),x.clone()]),s::term(bool_.clone(),s::Node::Bool(true))),
        (x.clone(),s::op(f.clone(),"call:f32_from_bits",vec![s::word(Type::U32,0x7fc00000)])),
    ] {
        let goal=Equation{from,to};
        let problem=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV3,Encoding::SharedV2).unwrap();
        // A correctly bound digest does not turn an absent refutation into one.
        let proof=Proof::BitVector{semantics:Mode::FixedScalarsV3,hypotheses:vec![],certificate:Certificate{encoding:Encoding::SharedV2,problem_sha256:problem.identity().into(),steps:vec![Step{clause:vec![],hints:vec![0,problem.clauses().len()-1],hint_deltas_v1:None}]}};
        assert!(checked(&p).prove(&p,&env,&[],&goal,&proof,&mut s::Budget::new(),0).is_err());
    }
}
#[test]
fn binary64_remains_unsupported_even_in_closed_nested_terms() {
    let p=Program::default();let b=s::value(Type::Bool);let wide=s::term(s::value(Type::F64),s::Node::Word(0));
    let comparison=s::op(b.clone(),"binary:==",vec![wide.clone(),wide]);
    let goal=Equation{from:s::op(b.clone(),"call:choose",vec![s::term(b.clone(),s::Node::Bool(false)),comparison,s::term(b.clone(),s::Node::Bool(true))]),to:s::term(b,s::Node::Bool(true))};
    let error=laws::bitvector_problem_with_encoding(&p,&BTreeMap::new(),&[],&goal,Mode::FixedScalarsV3,Encoding::SharedV2).unwrap_err();
    assert!(error.contains("binary64 source proof domain"),"{error}");
}
