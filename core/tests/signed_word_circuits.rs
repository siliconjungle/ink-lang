use ink_core::{bitproof::{Certificate,Encoding,Problem,Step},core::{Program,Type},laws::{self,BitVectorSemantics as Mode,Catalogue,CheckedCatalogue,Equation,Proof},semantic as s};
use std::collections::BTreeMap;
fn checker(p:&Program)->CheckedCatalogue {
    CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},p).unwrap()
}
// Ground gate traces and shared constant identities need no solver. Record
// ordinary unit propagation hints; the independent production RUP checker
// replays the resulting refutation rather than trusting this test author.
fn unit_refutation(problem:&Problem)->Option<Vec<Step>> {
    let mut values=vec![0i8;problem.variables()+1];let mut hints=vec![];
    loop {
        let mut changed=false;
        for (index,clause) in problem.clauses().iter().enumerate() {
            if clause.iter().any(|lit|values[lit.unsigned_abs()as usize]==if *lit>0{1}else{-1}){continue;}
            let mut unassigned=clause.iter().filter(|lit|values[lit.unsigned_abs()as usize]==0);
            let first=unassigned.next();
            if first.is_none(){hints.push(index);return Some(vec![Step{clause:vec![],hints,hint_deltas_v1:None}]);}
            if unassigned.next().is_none(){let lit=*first.unwrap();values[lit.unsigned_abs()as usize]=if lit>0{1}else{-1};hints.push(index);changed=true;}
        }
        if !changed{return None;}
    }
}
fn prove(p:&Program,env:&s::Env,goal:&Equation,encoding:Encoding) {
    let problem=laws::bitvector_problem_with_encoding(p,env,&[],goal,Mode::FixedScalarsV4,encoding).unwrap();
    let proof=Proof::BitVector{semantics:Mode::FixedScalarsV4,hypotheses:vec![],certificate:Certificate{encoding,problem_sha256:problem.identity().into(),steps:unit_refutation(&problem).expect("ground circuit refutation")}};
    checker(p).prove(p,env,&[],goal,&proof,&mut s::Budget::new(),0).unwrap();
}
#[test]
fn signed_word_mode_is_explicit_and_replays_existing_rup() {
    let p=Program::default();let ty=s::value(Type::I32);let x=s::free(ty.clone(),"x");
    let env=BTreeMap::from([("x".into(),ty.clone())]);
    let goal=Equation{from:s::op(ty,"binary:+",vec![x.clone(),s::word(Type::I32,0)]),to:x};
    for mode in [Mode::OpaqueV1,Mode::FixedWordsV2,Mode::FixedScalarsV3]{assert!(laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,mode,Encoding::SharedV2).is_err());}
    prove(&p,&env,&goal,Encoding::SharedV2);
}
#[test]
fn source_quotients_remainders_and_lazy_defaults_match_checked_integer_meanings() {
    let p=Program::default();
    for (ty,pairs) in [(Type::U32,vec![(0,0),(u32::MAX as u64,0),(u32::MAX as u64,7),(1<<31,2)]),
        (Type::U64,vec![(0,0),(u64::MAX,0),(u64::MAX,7),(1<<63,3)]),
        (Type::I32,vec![(0,0),(0x80000000,0xffffffff),(0x80000000,2),(0xffffffff,2),(0x7fffffff,0xfffffffd),(0xfffffffd,0xffffffff)])] {
        for (a,b) in pairs {for operation in ["quot_or","rem_or"] {
            let fallback=73;
            let expected=match ty {
                Type::I32=>{let (a,b)=(a as u32 as i32,b as u32 as i32);if operation=="quot_or"{a.checked_div(b)}else{a.checked_rem(b)}.unwrap_or(fallback)as u32 as u64},
                Type::U32=>{let (a,b)=(a as u32,b as u32);if operation=="quot_or"{a.checked_div(b)}else{a.checked_rem(b)}.unwrap_or(fallback as u32)as u64},
                _=>if operation=="quot_or"{a.checked_div(b)}else{a.checked_rem(b)}.unwrap_or(fallback as u64),
            };
            let from=s::op(s::value(ty.clone()),&format!("call:{operation}"),vec![s::word(ty.clone(),a),s::word(ty.clone(),b),s::word(ty.clone(),fallback as u64)]);
            let goal=Equation{from,to:s::word(ty.clone(),expected)};
            for encoding in [Encoding::LiteralV1,Encoding::SharedV2]{prove(&p,&BTreeMap::new(),&goal,encoding);}
        }}
    }
}
#[test]
fn signed_order_overflow_and_resource_boundaries_are_not_unsigned_assumptions() {
    let p=Program::default();let ty=s::value(Type::I32);let bool_=s::value(Type::Bool);
    let negative=s::word(Type::I32,0x80000000);let zero=s::word(Type::I32,0);
    let from=s::op(bool_.clone(),"binary:<",vec![negative,zero]);
    prove(&p,&BTreeMap::new(),&Equation{from:from.clone(),to:s::term(bool_.clone(),s::Node::Bool(true))},Encoding::SharedV2);
    let false_goal=Equation{from,to:s::term(bool_,s::Node::Bool(false))};
    let problem=laws::bitvector_problem_with_encoding(&p,&BTreeMap::new(),&[],&false_goal,Mode::FixedScalarsV4,Encoding::SharedV2).unwrap();assert!(unit_refutation(&problem).is_none());
    let mut nested=s::free(ty.clone(),"x");
    for _ in 0..28{nested=s::op(ty.clone(),"call:quot_or",vec![nested,s::word(Type::I32,3),s::word(Type::I32,0)]);}
    let env=BTreeMap::from([("x".into(),ty)]);let goal=Equation{from:nested.clone(),to:nested};
    assert!(laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV4,Encoding::SharedV2).is_err());
}
#[test]
fn scalar_mode_extension_preserves_existing_float_images_and_binary64_refusal() {
    let p=Program::default();let f=s::value(Type::F32);let x=s::free(f.clone(),"x");
    let env=BTreeMap::from([("x".into(),f.clone())]);let goal=Equation{from:s::op(f.clone(),"neg",vec![s::op(f,"neg",vec![x.clone()])]),to:x};
    let old=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV3,Encoding::SharedV2).unwrap();
    let new=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV4,Encoding::SharedV2).unwrap();assert_eq!(old.identity(),new.identity());
    let wide=s::word(Type::F64,0);let goal=Equation{from:wide.clone(),to:wide};
    assert!(laws::bitvector_problem_with_encoding(&p,&BTreeMap::new(),&[],&goal,Mode::FixedScalarsV4,Encoding::SharedV2).unwrap_err().contains("binary64 source proof domain"));
}
#[test]
fn word_extensionality_checks_all_masks_endpoints_scopes_and_shared_work() {
    let p=Program::default();let c=checker(&p);
    for ty in [Type::U32,Type::I32,Type::U64] {
        let sort=s::value(ty.clone());let x=s::free(sort.clone(),"x");let env=BTreeMap::from([("x".into(),sort.clone())]);
        let goal=Equation{from:s::op(sort.clone(),"binary:+",vec![x.clone(),s::word(ty.clone(),0)]),to:x.clone()};
        let width=if ty==Type::U64{64}else{32};let mut parts=vec![];
        for index in 0..width/8 {
            let mask=255u64<<(index*8);
            let masked=|t:&s::Term|s::op(sort.clone(),"call:word_and",vec![t.clone(),s::word(ty.clone(),mask)]);
            let subgoal=Equation{from:masked(&goal.from),to:masked(&goal.to)};
            let problem=laws::bitvector_problem_with_encoding(&p,&env,&[],&subgoal,Mode::FixedScalarsV4,Encoding::SharedV2).unwrap();
            parts.push((mask,Proof::BitVector{semantics:Mode::FixedScalarsV4,hypotheses:vec![],certificate:Certificate{encoding:Encoding::SharedV2,problem_sha256:problem.identity().into(),steps:unit_refutation(&problem).unwrap()}}));
        }
        let proof=Proof::WordExtensionality{parts:parts.clone()};
        c.prove(&p,&env,&[],&goal,&proof,&mut s::Budget::new(),0).unwrap();
        let opened=laws::open_proof(&proof,&[],&mut s::Budget::new()).unwrap();
        c.prove(&p,&env,&[],&goal,&opened,&mut s::Budget::new(),0).unwrap();
        assert!(c.prove(&p,&env,&[],&goal,&Proof::WordExtensionality{parts:parts[..parts.len()-1].to_vec()},&mut s::Budget::new(),0).is_err());
        let mut budget=s::Budget::new();budget.bit_work=1;
        assert!(c.prove(&p,&env,&[],&goal,&proof,&mut budget,0).is_err());
        let false_goal=Equation{from:x.clone(),to:s::op(sort.clone(),"call:word_and",vec![x,s::word(ty.clone(),0x7fffffff)])};
        assert!(c.prove(&p,&env,&[],&false_goal,&proof,&mut s::Budget::new(),0).is_err());
        let high_bit=Equation{from:s::word(ty.clone(),0),to:s::word(ty.clone(),1u64<<(width-1))};
        let false_parts=Proof::WordExtensionality{parts:parts.iter().map(|(mask,_)|(*mask,Proof::Normalize)).collect()};
        assert!(c.prove(&p,&BTreeMap::new(),&[],&high_bit,&false_parts,&mut s::Budget::new(),0).is_err());
        for masks in [vec![0],vec![1;65],if width==32{vec![u64::MAX]}else{vec![]}]{
            let proof=Proof::WordExtensionality{parts:masks.into_iter().map(|m|(m,Proof::Normalize)).collect()};
            assert!(c.prove(&p,&env,&[],&goal,&proof,&mut s::Budget::new(),0).is_err());
        }
    }
    for ty in [Type::Bool,Type::F32] {
        let sort=s::value(ty);let x=s::free(sort.clone(),"x");let env=BTreeMap::from([("x".into(),sort)]);
        assert!(c.prove(&p,&env,&[],&Equation{from:x.clone(),to:x},&Proof::WordExtensionality{parts:vec![(u64::MAX,Proof::Normalize)]},&mut s::Budget::new(),0).is_err());
    }
}
