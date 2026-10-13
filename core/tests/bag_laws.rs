use ink_core::{core::Program,laws::{self,Catalogue,CheckedCatalogue,Law,Proof},registry,
    semantic::{self as s,Budget,Node},syntax::Type};
use std::collections::BTreeMap;

#[test]
fn insertion_sort_preserves_every_word_multiplicity_and_observer() {
    let laws:Vec<Law>=serde_json::from_str(include_str!("fixtures/bag-laws.json")).unwrap();
    assert_eq!(laws.len(),9);
    let mut objects=BTreeMap::new();
    for law in laws {
        let id=registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
        objects.insert(id,law);
    }
    let mut ordered=objects.iter().collect::<Vec<_>>();
    ordered.sort_by_key(|(_,law)|if law.params.contains_key("x"){0}else if law.params.contains_key("item"){1}else{2});
    for (id,law) in ordered {
        let role=if law.params.contains_key("x"){"insert"}else if law.params.contains_key("item"){"sort"}else{"observer"};
        CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![id.clone()],objects:objects.clone()},&Program::default())
            .unwrap_or_else(|e|panic!("{role} {:?}: {e}",law.params));
    }
}

#[test]
fn named_extensionality_rejects_capture_false_bodies_and_nonfunctions() {
    let p=Program::default();
    let catalogue=CheckedCatalogue::check(&Catalogue{schema:1,semantics:laws::SEMANTICS.into(),roots:vec![],objects:BTreeMap::new()},&p).unwrap();
    let sort=s::value(Type::U32);let left=s::lambda(sort.clone(),s::term(sort.clone(),Node::Bound(0)));
    let right=s::lambda(sort.clone(),s::op(sort.clone(),"binary:+",vec![s::term(sort.clone(),Node::Bound(0)),s::word(Type::U32,0)]));
    let proof=Proof::Forall{parameter:"item".into(),body:Box::new(Proof::Normalize)};
    let goal=laws::Equation{from:left.clone(),to:right};
    catalogue.prove(&p,&BTreeMap::new(),&[],&goal,&proof,&mut Budget::new(),0).unwrap();
    assert!(catalogue.prove(&p,&BTreeMap::from([("item".into(),sort.clone())]),&[],&goal,&proof,&mut Budget::new(),0).is_err());
    let false_goal=laws::Equation{from:left,to:s::lambda(sort,s::word(Type::U32,0))};
    assert!(catalogue.prove(&p,&BTreeMap::new(),&[],&false_goal,&proof,&mut Budget::new(),0).is_err());
    let nonfunction=laws::Equation{from:s::word(Type::U32,0),to:s::word(Type::U32,0)};
    assert!(catalogue.prove(&p,&BTreeMap::new(),&[],&nonfunction,&proof,&mut Budget::new(),0).is_err());
}
