use ink_core::{logic::{Declaration, Proof, Term}, registry};
use serde_json::json;
use std::collections::BTreeMap;

fn snapshot(entries: &[String]) -> (String,BTreeMap<String,registry::Membership>) {
    if entries.len() <= 64 {
        let root=registry::identity(&json!({"schema":1,"entries":entries})).unwrap();
        return (root,entries.iter().map(|id|(id.clone(),registry::Membership{entries:entries.to_vec(),path:vec![]})).collect());
    }
    let mid=entries.len()/2;
    let (left,mut a)=snapshot(&entries[..mid]);let (right,b)=snapshot(&entries[mid..]);
    for proof in a.values_mut() {proof.path.push(registry::Sibling{left:false,sibling:right.clone()});}
    for (id,mut proof) in b {proof.path.push(registry::Sibling{left:true,sibling:left.clone()});a.insert(id,proof);}
    (registry::identity(&json!({"schema":1,"left":left,"right":right})).unwrap(),a)
}

#[test]
fn long_theorem_dags_replay_every_step_and_reject_an_authentic_false_leaf() {
    let mut objects=BTreeMap::new();let mut previous:Option<String>=None;
    for _ in 0..160 {
        let proof=match &previous {
            None=>Proof::Refl(Term::U64(7)),
            Some(theorem)=>Proof::Use{theorem:theorem.clone(),arguments:vec![],premises:vec![]},
        };
        let declaration=Declaration::Theorem{params:vec![],conditions:vec![],from:Term::U64(7),to:Term::U64(7),proof};
        let entry=registry::Entry::from_declaration(&declaration,previous.iter().cloned().collect()).unwrap();
        let id=registry::identity(&entry).unwrap();objects.insert(id.clone(),entry);previous=Some(id);
    }
    let root=previous.unwrap();let entries=objects.keys().cloned().collect::<Vec<_>>();
    let (snapshot_root,membership)=snapshot(&entries);
    let bundle=registry::Bundle{schema:1,snapshot:registry::Snapshot{schema:1,semantics:registry::SNAPSHOT_SEMANTICS.into(),root:snapshot_root},roots:vec![root.clone()],objects,membership};
    let context=registry::CheckedBundle::check(&bundle).unwrap().first_order_context().unwrap();
    context.check(&[],&[],&Term::U64(7),&Term::U64(7),&Proof::Use{theorem:root.clone(),arguments:vec![],premises:vec![]}).unwrap();
    let mut bad=bundle;
    let declaration=Declaration::Theorem{params:vec![],conditions:vec![],from:Term::U64(7),to:Term::U64(8),
        proof:Proof::Use{theorem:root.clone(),arguments:vec![],premises:vec![]}};
    let entry=registry::Entry::from_declaration(&declaration,vec![root]).unwrap();let id=registry::identity(&entry).unwrap();
    bad.objects.insert(id.clone(),entry);bad.roots=vec![id];
    let entries=bad.objects.keys().cloned().collect::<Vec<_>>();let (root,membership)=snapshot(&entries);
    bad.snapshot.root=root;bad.membership=membership;
    assert!(registry::CheckedBundle::check(&bad).unwrap().first_order_context().is_err());
}
