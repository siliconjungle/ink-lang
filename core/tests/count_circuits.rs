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
fn count(name:&str, argument:s::Term)->s::Term {
    s::op(s::value(Type::U32), &format!("call:{name}"), vec![argument])
}
fn prove(p:&Program, env:&s::Env, goal:&Equation, encoding:Encoding)->Proof {
    let problem=laws::bitvector_problem_with_encoding(p,env,&[],goal,Mode::FixedCountsV5,encoding).unwrap();
    let proof=Proof::BitVector{semantics:Mode::FixedCountsV5,hypotheses:vec![],certificate:Certificate{
        encoding,problem_sha256:problem.identity().into(),steps:unit_refutation(&problem).unwrap_or_else(||panic!("unit refutation: {encoding:?} {goal:?}"))}};
    checker(p).prove(p,env,&[],goal,&proof,&mut s::Budget::new(),0).unwrap();proof
}
#[test]
fn fixed_counts_are_explicit_and_legacy_count_atoms_remain_opaque() {
    let p=Program::default();
    for ty in [Type::U32,Type::I32,Type::U64] {
        let sort=s::value(ty.clone());let x=s::free(sort.clone(),"x");
        let env=BTreeMap::from([("x".into(),sort.clone())]);
        let zero=s::op(sort.clone(),"call:word_and",vec![x,s::word(ty.clone(),0)]);
        for name in ["popcount","leading_zeros","trailing_zeros"] {
            let width=if ty==Type::U64{64}else{32};
            let goal=Equation{from:count(name,zero.clone()),to:s::word(Type::U32,if name=="popcount"{0}else{width})};
            for encoding in [Encoding::LiteralV1,Encoding::SharedV2,Encoding::SharedSelectV3] {
                let proof=prove(&p,&env,&goal,encoding);
                if ty!=Type::I32 {
                    let old=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV4,encoding).unwrap();
                    assert!(unit_refutation(&old).is_none());
                }
                let mut old_proof=proof.clone();if let Proof::BitVector{semantics,..}=&mut old_proof{*semantics=Mode::FixedScalarsV4;}
                assert!(checker(&p).prove(&p,&env,&[],&goal,&old_proof,&mut s::Budget::new(),0).is_err());
                let mut bad=goal.clone();bad.to=s::word(Type::U32,if name=="popcount"{1}else{width-1});
                let problem=laws::bitvector_problem_with_encoding(&p,&env,&[],&bad,Mode::FixedCountsV5,encoding).unwrap();
                assert!(unit_refutation(&problem).is_none());
                let mut forged=proof.clone();if let Proof::BitVector{certificate,..}=&mut forged{certificate.problem_sha256=problem.identity().into();}
                assert!(checker(&p).prove(&p,&env,&[],&bad,&forged,&mut s::Budget::new(),0).is_err());
                let mut budget=s::Budget::new();budget.bit_work=1;
                assert!(checker(&p).prove(&p,&env,&[],&goal,&proof,&mut budget,0).is_err());
            }
        }
    }
}
#[test]
fn reflected_counts_match_signed_high_bits_zero_and_all_ones() {
    let p=Program::default();
    for ty in [Type::U32,Type::I32,Type::U64] {
        for raw in [0,1,2,0x80000000,0xffffffff,1<<63,u64::MAX] {
            let raw=if ty==Type::U64{raw}else{raw&0xffffffff};
            for name in ["popcount","leading_zeros","trailing_zeros"] {
                let expected=if ty==Type::U64 {match name {"popcount"=>raw.count_ones(),"leading_zeros"=>raw.leading_zeros(),_=>raw.trailing_zeros()}}
                    else {let x=raw as u32;match name {"popcount"=>x.count_ones(),"leading_zeros"=>x.leading_zeros(),_=>x.trailing_zeros()}};
                let goal=Equation{from:count(name,s::word(ty.clone(),raw)),to:s::word(Type::U32,expected as u64)};
                for encoding in [Encoding::LiteralV1,Encoding::SharedV2,Encoding::SharedSelectV3]{prove(&p,&BTreeMap::new(),&goal,encoding);}
                // Literal computation is shared by Normalize and every older
                // circuit mode, so test the fixed reification independently.
                checker(&p).prove(&p,&BTreeMap::new(),&[],&goal,&Proof::Normalize,&mut s::Budget::new(),0).unwrap();
                let bad=Equation{from:goal.from.clone(),to:s::word(Type::U32,expected as u64+1)};
                assert!(checker(&p).prove(&p,&BTreeMap::new(),&[],&bad,&Proof::Normalize,&mut s::Budget::new(),0).is_err());
            }
        }
    }
}
#[test]
fn count_mode_preserves_noncount_images_and_refuses_wrong_domains() {
    let p=Program::default();
    for ty in [Type::U32,Type::U64,Type::I32,Type::F32] {
        let sort=s::value(ty.clone());let x=s::free(sort.clone(),"x");let env=BTreeMap::from([("x".into(),sort.clone())]);
        let goal=Equation{from:if ty==Type::F32{s::op(sort,"neg",vec![x.clone()])}else{s::op(sort,"binary:+",vec![x.clone(),s::word(ty,0)])},to:x};
        for encoding in [Encoding::LiteralV1,Encoding::SharedV2,Encoding::SharedSelectV3] {
            let old=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedScalarsV4,encoding).unwrap();
            let new=laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedCountsV5,encoding).unwrap();assert_eq!(old.identity(),new.identity());
        }
    }
    for arguments in [vec![],vec![s::word(Type::U32,0),s::word(Type::U32,0)]] {
        let malformed=s::op(s::value(Type::U32),"call:popcount",arguments);
        assert!(s::reify(&malformed,&p).is_err());
    }
    for ty in [Type::Bool,Type::F32,Type::F64,Type::Int] {
        let sort=s::value(ty);let x=s::free(sort.clone(),"x");let env=BTreeMap::from([("x".into(),sort)]);
        let goal=Equation{from:count("popcount",x),to:s::word(Type::U32,0)};
        assert!(laws::bitvector_problem_with_encoding(&p,&env,&[],&goal,Mode::FixedCountsV5,Encoding::SharedV2).is_err());
    }
}
#[test]
fn reified_overloaded_count_arguments_preserve_width_and_lexical_names() {
    use ink_core::{core::Expr,eval};
    let p=Program::default();let name="__ink_count_argument";
    for ty in [Type::U32,Type::I32,Type::U64] {
        let sort=s::value(ty.clone());let env=BTreeMap::from([(name.into(),sort.clone())]);
        let argument=s::op(sort.clone(),"call:word_or",vec![s::word(ty.clone(),0),s::free(sort,name)]);
        for operation in ["popcount","leading_zeros","trailing_zeros"] {
            let term=count(operation,argument.clone());let expression=s::reify(&term,&p).unwrap();
            let back=s::elaborate(&expression,&BTreeMap::from([(name.into(),ty.clone())]),&p,&Type::U32).unwrap();
            checker(&p).prove(&p,&env,&[],&Equation{from:term,to:back},&Proof::Normalize,&mut s::Budget::new(),0).unwrap();
            for raw in [0u64,1,0x80000000,0xffffffff] {
                let expected=if ty==Type::U64{match operation{"popcount"=>raw.count_ones(),"leading_zeros"=>raw.leading_zeros(),_=>raw.trailing_zeros()}}
                    else{let x=raw as u32;match operation{"popcount"=>x.count_ones(),"leading_zeros"=>x.leading_zeros(),_=>x.trailing_zeros()}};
                let closed=Expr::Let(name.into(),Some(Box::new(ty.clone())),Box::new(s::reify(&s::word(ty.clone(),raw),&p).unwrap()),Box::new(expression.clone()));
                let mut program=p.clone();program.functions.push(ink_core::core::Function{name:"count_test".into(),params:vec![],result:Type::U32,body:closed});
                let result=eval::call(&program,"count_test",vec![],&mut 10000).unwrap();
                assert!(matches!(result,eval::Value::U32(n) if n==expected),"{ty:?} {operation} {raw} {result:?}");
            }
        }
    }
}
