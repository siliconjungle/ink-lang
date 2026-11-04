//! Process-local mathematical proof units. Content IDs locate sealed witnesses;
//! every new unit checks its declaration with only its declared checked imports.
use crate::{logic::Context, registry::{self, Bundle, Entry, Kind, Membership, Snapshot}, LangResult};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Scope {
    pub schema: u32,
    pub snapshot: Snapshot,
    pub roots: Vec<String>,
    pub objects: Vec<String>,
    pub membership: BTreeMap<String, usize>,
    pub witnesses:Vec<Membership>,
}
struct Unit { dependencies: Vec<String>, executable: Option<Entry>, bytes: usize }
/// Not serializable. A fresh checker has no admitted units. Proof bodies are
/// discarded after replay; opaque Context entries retain checked conclusions.
#[derive(Default)]
pub struct Checker { context: Context, units: BTreeMap<String,Unit>, bytes: usize }
impl Checker {
    pub fn admit_bytes(&mut self,id:&str,bytes:&[u8])->LangResult<()> {
        if bytes.len()>registry::MAX_ENTRY_BYTES {return Err("proof unit byte limit".into());}
        let entry:Entry=crate::bounded_json::decode(bytes)?;
        self.admit(id,&entry)
    }
    pub fn contains(&self,id:&str)->bool { self.units.contains_key(id) }
    pub fn len(&self)->usize {self.units.len()}
    pub fn bytes(&self)->usize {self.bytes}
    pub fn admit(&mut self,id:&str,entry:&Entry)->LangResult<()> {
        let bytes=registry::canonical(entry)?.len();
        if self.contains(id) {return Err("proof unit already admitted".into());}
        if self.units.len()>=registry::MAX_VIEW_ENTRIES || self.bytes+bytes>32*1024*1024
            || bytes>registry::MAX_ENTRY_BYTES || entry.schema!=1 || entry.semantics!=crate::library::SEMANTICS
            || entry.dependencies.len()>128 || !entry.dependencies.windows(2).all(|w|w[0]<w[1])
            || registry::identity(entry)?!=id {return Err("proof unit identity/domain/budget mismatch".into());}
        // This performs interface checks, dependency restriction, type/totality
        // checks and theorem replay before the opaque result can be imported.
        registry::admit_first_order(&mut self.context,id,entry)?;
        self.units.insert(id.into(),Unit{dependencies:entry.dependencies.clone(),executable:if entry.kind==Kind::Definition {Some(entry.clone())}else{None},bytes});
        self.bytes+=bytes;
        Ok(())
    }
    pub(crate) fn scope(&self,scope:&Scope)->LangResult<(Bundle,Context)> {
        if scope.schema!=1 || scope.objects.len()>registry::MAX_VIEW_ENTRIES
            || scope.objects.windows(2).any(|w|w[0]>=w[1]) || scope.roots.windows(2).any(|w|w[0]>=w[1])
            || scope.witnesses.len()>scope.objects.len() || scope.membership.keys().ne(scope.objects.iter()) {return Err("proof unit scope inventory mismatch".into());}
        let selected:BTreeSet<_>=scope.objects.iter().cloned().collect();
        let mut reachable=BTreeSet::new();let mut work=scope.roots.clone();let mut bytes=0;
        while let Some(id)=work.pop(){
            if !selected.contains(&id){return Err("missing proof unit dependency".into());}
            if !reachable.insert(id.clone()){continue;}
            let unit=self.units.get(&id).ok_or("proof unit has not been checked in this session")?;
            bytes+=unit.bytes;work.extend(unit.dependencies.iter().cloned());
        }
        if reachable!=selected || bytes>registry::MAX_VIEW_BYTES {return Err("unreferenced or oversized proof unit scope".into());}
        let used:BTreeSet<_>=scope.membership.values().copied().collect();
        if used.len()!=scope.witnesses.len(){return Err("unreferenced proof membership witnesses".into());}
        for id in &scope.objects {registry::authenticate_membership(id,scope.witnesses.get(scope.membership[id]).ok_or("missing proof unit membership witness")?,&scope.snapshot)?;}
        let bundle=Bundle{schema:1,snapshot:scope.snapshot.clone(),roots:scope.roots.clone(),membership:BTreeMap::new(),objects:scope.objects.iter().filter_map(|id|self.units[id].executable.clone().map(|e|(id.clone(),e))).collect()};
        Ok((bundle,self.context.subset(&scope.objects)?))
    }
}

#[cfg(test)]
mod tests {
 use super::*;
 use crate::logic::{Declaration,Proof,Term};
 use serde_json::json;
 #[test]
 fn independent_checked_units_reuse_dependencies_but_never_hashes_or_false_claims() {
  let declaration=Declaration::Theorem{params:vec![],conditions:vec![],from:Term::U64(7),to:Term::U64(7),proof:Proof::Refl(Term::U64(7))};
  let entry=Entry::from_declaration(&declaration,vec![]).unwrap();let id=registry::identity(&entry).unwrap();
  let mut checker=Checker::default();checker.admit(&id,&entry).unwrap();assert!(checker.admit(&id,&entry).is_err());
  let next=Declaration::Theorem{params:vec![],conditions:vec![],from:Term::U64(7),to:Term::U64(7),proof:Proof::Use{theorem:id.clone(),arguments:vec![],premises:vec![]}};
  let user=Entry::from_declaration(&next,vec![id.clone()]).unwrap();let user_id=registry::identity(&user).unwrap();
  assert!(Checker::default().admit(&user_id,&user).is_err());checker.admit(&user_id,&user).unwrap();assert_eq!(checker.len(),2);
  let bad=Entry::from_declaration(&Declaration::Theorem{params:vec![],conditions:vec![],from:Term::U64(7),to:Term::U64(8),proof:Proof::Use{theorem:id.clone(),arguments:vec![],premises:vec![]}},vec![id.clone()]).unwrap();
  assert!(checker.admit(&"0".repeat(64),&bad).is_err());
  assert!(checker.admit(&registry::identity(&bad).unwrap(),&bad).is_err());assert_eq!(checker.len(),2);
  let mut objects=vec![id.clone(),user_id.clone()];objects.sort();
  let root=registry::identity(&json!({"schema":1,"entries":objects})).unwrap();
  let mut scope=Scope{schema:1,snapshot:Snapshot{schema:1,semantics:registry::SNAPSHOT_SEMANTICS.into(),root},roots:vec![user_id.clone()],membership:objects.iter().map(|id|(id.clone(),0)).collect(),witnesses:vec![Membership{entries:objects.clone(),path:vec![]}],objects};
  let (definition,context)=checker.scope(&scope).unwrap();assert!(definition.objects.is_empty()); // no theorem proof body survives admission
  context.check(&[],&[],&Term::U64(7),&Term::U64(7),&Proof::Use{theorem:user_id,arguments:vec![],premises:vec![]}).unwrap();
  assert!(Checker::default().scope(&scope).is_err());scope.snapshot.root="0".repeat(64);assert!(checker.scope(&scope).is_err());
 }
}
