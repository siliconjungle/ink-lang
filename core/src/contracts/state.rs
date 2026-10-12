//! Derive invariant and relational postconditions from the fixed source
//! transition model. Proof producers never supply the state transition meaning.
use super::*;
use crate::{action_model::Projection,logic::{self,Term,Sort,Branch,Equation as Eqn}};
#[derive(Clone,Debug,Serialize,Deserialize)]
pub struct StateObligation {
    pub name:String,
    pub params:Vec<(String,Sort)>,
    pub conditions:Vec<Eqn>,
    pub goal:Eqn,
}
#[derive(Clone,Debug,Serialize,Deserialize)]
pub struct StateObligations {
    pub semantics:String,
    pub objects:BTreeMap<String,crate::registry::Entry>,
    pub obligations:Vec<StateObligation>,
}
fn var(n:&str)->Term{Term::Var(n.into())}
fn call(n:&str,args:Vec<Term>)->Term{Term::Call{function:n.into(),arguments:args}}
fn yes(t:Term)->Eqn{Eqn{from:t,to:Term::Bool(true)}}
struct Ghosts {p:Program,next:usize}
impl Ghosts {
    fn query(&mut self,params:Vec<(String,Type)>,result:Type,value:Expr)->LangResult<String>{
        let mut name=format!("__ink_contract_{}",self.next);self.next+=1;
        while self.p.actions.iter().any(|a|a.name==name)||self.p.functions.iter().any(|a|a.name==name)||self.p.states.iter().chain(&self.p.keeps).any(|s|s.name==name){name.push('_');}
        self.p.actions.push(Action{name:name.clone(),kind:ActionKind::Query,params,result,reads:self.p.states.iter().chain(&self.p.keeps).map(|s|s.name.clone()).collect(),writes:vec![],emits:vec![],body:vec![Statement::Return(value)]});
        Ok(name)
    }
}
/// Before expressions are typed as readonly observations of the original state.
/// Captures have fresh names and cannot depend on result or nested before.
fn captures(e:&Expr,p:&Program,params:&[(String,Type)],out:&mut Vec<(String,Type,Expr)>,depth:usize)->LangResult<Expr>{
    if depth>128||out.len()>128{return Err("before expression budget".into());}
    if let Expr::Call(n,args)=e {
        if n=="before" {
            if args.len()!=1{return Err("before expects one expression".into());}
            let mut forbidden=false;
            crate::analysis::walk(&args[0],|e|{forbidden|=matches!(e,Expr::Call(n,_)if n=="before")||matches!(e,Expr::Var(n)if n=="result");});
            if forbidden{return Err("before cannot contain result or another before".into());}
            let ty=crate::statecheck::expression_type(p,&args[0],&crate::check::params_env(params)?)?;
            if matches!(ty,Type::Table(..)|Type::Buffer(..)){return Err("before must capture a value observation".into());}
            let mut name=format!("__ink_before_{}",out.len());
            while params.iter().any(|(n,_)|n==&name)||out.iter().any(|(n,_,_)|n==&name)||crate::analysis::references_free(e,&name){name.push('_');}
            out.push((name.clone(),ty,args[0].clone()));return Ok(Expr::Var(name));
        }
    }
    let recurse=|e:&Expr,out:&mut Vec<_>|captures(e,p,params,out,depth+1);
    Ok(match e {
        Expr::Neg(x)=>Expr::Neg(Box::new(recurse(x,out)?)),
        Expr::Try(_)=>return Err("contract predicates cannot propagate errors".into()),
        Expr::Let(n,t,x,b)=>Expr::Let(n.clone(),t.clone(),Box::new(recurse(x,out)?),Box::new(recurse(b,out)?)),
        Expr::Binary(n,a,b)=>Expr::Binary(n.clone(),Box::new(recurse(a,out)?),Box::new(recurse(b,out)?)),
        Expr::Call(n,args)=>Expr::Call(n.clone(),args.iter().map(|a|recurse(a,out)).collect::<LangResult<_>>()?),
        Expr::Method(x,n,args)=>Expr::Method(Box::new(recurse(x,out)?),n.clone(),args.iter().map(|a|recurse(a,out)).collect::<LangResult<_>>()?),
        Expr::Lambda(n,b)=>Expr::Lambda(n.clone(),Box::new(recurse(b,out)?)),
        Expr::Field(x,n)=>Expr::Field(Box::new(recurse(x,out)?),n.clone()),
        Expr::Record(n,fs)=>Expr::Record(n.clone(),fs.iter().map(|(n,x)|Ok((n.clone(),recurse(x,out)?))).collect::<LangResult<_>>()?),
        e=>e.clone(),
    })
}
fn query_value(model:&Projection,cx:&logic::Context,name:&str,params:&[(String,Sort)],state:Term,version:Term,args:Vec<Term>)->LangResult<Term>{
    let action=&model.actions[name];let mut actual=vec![state,version];actual.extend(args);
    let value=cx.evaluate(params,&call(&action.function,actual))?;
    let value=crate::action_model::public_normal(&value,&BTreeMap::new(),&mut 0);
    fn extract(t:Term,observation:&Sort)->LangResult<Term>{
        match t {
            Term::Construct{datatype,constructor:0,mut arguments} if *observation==Sort::Data(datatype.clone())&&arguments.len()==5=>Ok(arguments.remove(0)),
            Term::If{condition,on_true,on_false}=>Ok(Term::If{condition,on_true:Box::new(extract(*on_true,observation)?),on_false:Box::new(extract(*on_false,observation)?)}),
            Term::Match{scrutinee,branches}=>Ok(Term::Match{scrutinee,branches:branches.into_iter().map(|b|Ok(Branch{bindings:b.bindings,body:extract(b.body,observation)?})).collect::<LangResult<_>>()?}),
            _=>Err("contract observation must be total and readonly".into()),
        }
    }
    extract(value,&action.result)
}
pub(super) fn derive(source:&Program)->LangResult<StateObligations>{
    let contracts=&source.contracts;
    let mut p=source.clone();p.contracts=Contracts::default();
    let original_names:Vec<String>=p.actions.iter().map(|a|a.name.clone()).collect();
    let mut ghosts=Ghosts{p,next:0};
    let mut invariants=vec![];
    for e in &contracts.invariants {invariants.push(ghosts.query(vec![],Type::Bool,e.clone())?);}
    let mut specs=vec![];
    for spec in contracts.specifications.iter().filter(|s|s.kind.is_some()){
        if spec.params.iter().any(|(n,_)|n=="result"){return Err("result is reserved in specifications".into());}
        let mut requires=vec![];for e in &spec.requires{requires.push(ghosts.query(spec.params.clone(),Type::Bool,e.clone())?);}
        let mut post=vec![];
        for e in &spec.ensures{
            let mut old=vec![];let value=captures(e,&ghosts.p,&spec.params,&mut old,0)?;
            let mut params=spec.params.clone();params.push(("result".into(),spec.result.clone()));
            params.extend(old.iter().map(|(n,t,_)|(n.clone(),t.clone())));
            let name=ghosts.query(params,Type::Bool,value)?;
            let mut before=vec![];for (_,t,e) in old{before.push(ghosts.query(spec.params.clone(),t,e)?);}
            post.push((name,before));
        }
        let names=std::iter::once(spec.name.clone()).chain(contracts.implementations.iter().filter(|i|i.specification==spec.name).map(|i|i.name.clone())).collect::<Vec<_>>();
        if names.len()<2{return Err(format!("specification {} has no implementation",spec.name));}
        for name in &names{
            let a=ghosts.p.actions.iter().find(|a|&a.name==name).ok_or("missing action implementation")?;
            if Some(&a.kind)!=spec.kind.as_ref()||a.params!=spec.params||a.result!=spec.result||a.reads!=spec.reads||a.writes!=spec.writes||a.emits!=spec.emits{return Err("action implementation contract signature mismatch".into());}
        }
        specs.push((names,requires,post));
    }
    let mut call_checks=vec![];
    for g in super::calls::actions(source)? {
        let name=ghosts.query(g.params.clone(),Type::Bool,g.predicate)?;
        let mut conditions=vec![];
        for e in g.conditions{conditions.push(ghosts.query(g.params.clone(),Type::Bool,e)?);}
        call_checks.push((g.name,name,conditions));
    }
    let checked=CheckedModule::from_source(ghosts.p)?;
    let model=Projection::derive(&checked)?;let cx=model.context()?;
    let initial=Term::Construct{datatype:model.state.clone(),constructor:0,arguments:model.tables.iter().map(|t|Term::Construct{datatype:t.datatype.clone(),constructor:0,arguments:vec![]}).collect()};
    let mut goals=vec![];
    for (label,name,conditions) in call_checks {
        let a=&model.actions[&name];let params=&a.params;
        let args=params[2..].iter().map(|(n,_)|var(n)).collect::<Vec<_>>();
        let goal=yes(query_value(&model,&cx,&name,params,var("initial"),var("version"),args.clone())?);
        let conditions=conditions.iter().map(|n|Ok(yes(query_value(&model,&cx,n,params,var("initial"),var("version"),args.clone())?))).collect::<LangResult<Vec<_>>>()?;
        goals.push(StateObligation{name:label,params:params.clone(),conditions,goal});
    }
    for (i,n) in invariants.iter().enumerate(){goals.push(StateObligation{name:format!("invariant:{i}:initial"),params:vec![],conditions:vec![],goal:yes(query_value(&model,&cx,n,&[],initial.clone(),Term::U64(0),vec![])?)})}
    for name in original_names{
        let a=&model.actions[&name];let params=&a.params;
        let args=params[2..].iter().map(|(n,_)|var(n)).collect::<Vec<_>>();
        let mut conditions=vec![];
        for n in &invariants{conditions.push(yes(query_value(&model,&cx,n,params,var("initial"),var("version"),vec![])?));}
        let spec=specs.iter().find(|(names,_,_)|names.contains(&name));
        if let Some((_,requires,_))=spec{for n in requires{conditions.push(yes(query_value(&model,&cx,n,params,var("initial"),var("version"),args.clone())?));}}
        let action_call=call(&a.function,params.iter().map(|(n,_)|var(n)).collect());
        let bindings=(0..5).map(|i|format!("__contract_reply_{i}")).collect::<Vec<_>>();
        let mut local=params.clone();
        // Obtain constructor field sorts from the authenticated declaration.
        let Sort::Data(observation)=&a.result else{return Err("invalid action observation".into());};
        let declaration:logic::Declaration=serde_json::from_value(model.objects[observation].payload["declaration"].clone()).map_err(|e|e.to_string())?;
        let logic::Declaration::Datatype{constructors}=declaration else{return Err("invalid observation datatype".into());};
        local.extend(bindings.iter().cloned().zip(constructors[0].fields.clone()));
        let transition_goal=|body:Term|Term::Match{scrutinee:Box::new(action_call.clone()),branches:vec![Branch{bindings:bindings.clone(),body},Branch{bindings:vec!["__host_code".into(),"__host_version".into(),"__host_state".into()],body:Term::Bool(true)}]};
        for (i,n) in invariants.iter().enumerate(){
            let body=query_value(&model,&cx,n,&local,var(&bindings[3]),var(&bindings[2]),vec![])?;
            goals.push(StateObligation{name:format!("{name}:invariant:{i}"),params:params.clone(),conditions:conditions.clone(),goal:yes(transition_goal(body))});
        }
        if let Some((_,_,post))=spec{for (i,(n,before)) in post.iter().enumerate(){
            let mut values=args.clone();values.push(var(&bindings[0]));
            for old in before{values.push(query_value(&model,&cx,old,&local,var("initial"),var("version"),args.clone())?);}
            let body=query_value(&model,&cx,n,&local,var(&bindings[3]),var(&bindings[2]),values)?;
            goals.push(StateObligation{name:format!("{name}:ensures:{i}"),params:params.clone(),conditions:conditions.clone(),goal:yes(transition_goal(body))});
        }}
    }
    Ok(StateObligations{semantics:SEMANTICS.into(),objects:model.objects,obligations:goals})
}
pub(super) fn context(derived:&StateObligations,bundle:Option<&crate::registry::Bundle>)->LangResult<logic::Context>{
    let mut cx=if let Some(b)=bundle{crate::registry::CheckedBundle::check(b)?.first_order_context()?}else{logic::Context::default()};
    let mut pending=derived.objects.clone();
    while !pending.is_empty(){
        let ready=pending.iter().filter(|(_,e)|e.dependencies.iter().all(|d|!pending.contains_key(d))).map(|(i,_)|i.clone()).collect::<Vec<_>>();
        if ready.is_empty(){return Err("cyclic contract definitions".into());}
        for id in ready{
            let entry=pending.remove(&id).unwrap();
            let d:logic::Declaration=serde_json::from_value(entry.payload["declaration"].clone()).map_err(|e|e.to_string())?;
            if cx.matches_definition(&id,&d).is_err(){cx.declare(id,&d)?;}
        }
    }
    Ok(cx)
}
pub(super) fn check(module:&CheckedModule)->LangResult<()> {
    let c=&module.program().contracts;
    if c.invariants.is_empty()&&!c.specifications.iter().any(|s|s.kind.is_some())&&super::calls::actions(module.program())?.is_empty(){
        if !c.state_proofs.is_empty()||c.state_knowledge.is_some(){return Err("state evidence without state contracts".into());}
        return Ok(());
    }
    let derived=derive(module.program())?;
    let cx=context(&derived,c.state_knowledge.as_ref())?;
    let mut used=BTreeSet::new();
    for g in derived.obligations{
        let default=logic::Proof::Convert{from:g.goal.from.clone(),to:g.goal.to.clone()};
        let result=if let Some(proof)=c.state_proofs.get(&g.name){cx.check(&g.params,&g.conditions,&g.goal.from,&g.goal.to,proof)}else{
            let direct=cx.check(&g.params,&g.conditions,&g.goal.from,&g.goal.to,&default);
            if direct.is_ok() || !(0..g.conditions.len()).any(|i|cx.check(&g.params,&g.conditions,&g.goal.from,&g.goal.to,&logic::Proof::Hypothesis(i)).is_ok()){direct}else{Ok(())}
        };
        result.map_err(|e|format!("contract {}: {e}",g.name))?;
        used.insert(g.name);
    }
    if c.state_proofs.keys().any(|n|!used.contains(n)){return Err("state proof for unknown obligation".into());}
    Ok(())
}
