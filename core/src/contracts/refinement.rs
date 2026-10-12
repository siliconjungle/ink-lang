//! Contract refinement changes only named specification bodies. The complete
//! resulting module is checked again, including every caller and state invariant.
use super::*;
#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Body { Pure(Expr), Action(Vec<Statement>) }
#[derive(Clone,Debug,Serialize,Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Refinement {
    pub bodies:BTreeMap<String,Body>,
    pub evidence:Evidence,
}
pub fn prepare(module:&CheckedModule,bodies:&BTreeMap<String,Body>)->LangResult<Program>{
    if bodies.is_empty()||bodies.len()>256{return Err("contract refinement body limit".into());}
    let mut p=module.program().clone();
    p.contracts.proofs.clear();p.contracts.state_proofs.clear();p.contracts.knowledge=None;p.contracts.state_knowledge=None;
    for (name,body) in bodies{
        let s=p.contracts.specifications.iter().find(|s|&s.name==name).ok_or("refinement target is not a specification")?;
        match (&s.kind,body) {
            (None,Body::Pure(body))=>p.functions.iter_mut().find(|f|&f.name==name).ok_or("missing pure specification body")?.body=body.clone(),
            (Some(_),Body::Action(body))=>p.actions.iter_mut().find(|a|&a.name==name).ok_or("missing action specification body")?.body=body.clone(),
            _=>return Err("refinement changes specification kind".into()),
        }
    }
    crate::check::check(&p)?;
    Ok(p)
}
pub fn check_refinement(module:&CheckedModule,refinement:&Refinement)->LangResult<CheckedModule>{
    let mut p=prepare(module,&refinement.bodies)?;
    attach(&mut p,refinement.evidence.clone())?;
    CheckedModule::from_source(p)
}
