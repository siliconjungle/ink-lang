use ink_core::{core::CheckedModule, laws::{self, Catalogue, Equation, Law, Proof},
    optimisation::{self, Package, Site}, registry, semantic::{self as s, Node}, syntax::{self, Type}};
use std::collections::BTreeMap;

fn selection(module: &CheckedModule, function: &str, path: Vec<usize>,
    from: s::Term, to: s::Term, conditions: Vec<Equation>, arguments: BTreeMap<String,s::Term>) -> Package {
    let law = Law {schema:1, semantics:laws::SEMANTICS.into(), params:arguments.iter()
        .map(|(n,t)|(n.clone(),t.sort.clone())).collect(), conditions:conditions.clone(),
        from, to, proof:Proof::Hypothesis(0), dependencies:vec![], definition_context:None,
        types:vec![], assumptions:vec![]};
    let id=registry::identity(&registry::Entry::from_law(&law).unwrap()).unwrap();
    Package { schema:1, semantics:optimisation::SEMANTICS.into(), input_core_sha256:module.identity().unwrap(),
        knowledge:registry::from_catalogue(&Catalogue {schema:1,semantics:laws::SEMANTICS.into(),
            roots:vec![id.clone()],objects:BTreeMap::from([(id.clone(),law)])}).unwrap(),
        applications:vec![Site {function:function.into(),path,law:id,arguments,
            premises:conditions.iter().map(|_|Proof::Normalize).collect()}],
        action_replacement:None,contract_refinement:None }
}

#[test]
fn function_preconditions_authorise_conditional_database_rewrites() {
    let module=CheckedModule::from_source(syntax::parse("module facts; spec fn zero(x:u32)->u32 requires x==0; ensures result==0; implementation original for zero{return x;}").unwrap()).unwrap();
    let x=s::free(s::value(Type::U32),"x"); let zero=s::word(Type::U32,0);
    let package=selection(&module,"zero",vec![],x.clone(),zero.clone(),
        vec![Equation{from:x.clone(),to:zero}],BTreeMap::from([("x".into(),x)]));
    let selected=optimisation::check(&module,&package).unwrap();
    assert_eq!(selected.module().program().functions.iter().find(|f|f.name=="zero").unwrap().body,syntax::Expr::Num(0));
    assert!(!optimisation::subject(&module).unwrap().contexts["zero"].is_empty());
    let unguarded=CheckedModule::from_source(syntax::parse("module facts;fn zero(x:u32)->u32{return x;}").unwrap()).unwrap();
    let mut forged=package; forged.input_core_sha256=unguarded.identity().unwrap();
    assert!(optimisation::check(&unguarded,&forged).is_err());
}

fn classified(extra: &str) -> Result<CheckedModule,String> {
    let source=format!("module composition;spec fn classify(x:u32)->u32 ensures result==1 || result==2;implementation branches for classify{{return choose(x==0,1,2);}}{extra}");
    let mut program=syntax::parse(&source)?;
    let condition=s::op(s::value(Type::Bool),"binary:==",vec![s::free(s::value(Type::U32),"x"),s::word(Type::U32,0)]);
    let proof=Proof::Cases{condition,on_false:Box::new(Proof::Normalize),on_true:Box::new(Proof::Normalize)};
    for name in ["classify","branches"] {program.contracts.proofs.insert(format!("{name}:ensures:0"),proof.clone());}
    CheckedModule::from_source(program)
}

#[test]
fn postconditions_travel_through_lexical_bindings_into_callee_preconditions() {
    classified("spec fn consume(y:u32)->Bool requires y==1 || y==2;ensures result;implementation accepted for consume{return true;}fn run(x:u32)->Bool{let y=classify(x);return consume(y);}").unwrap();
    assert!(classified("spec fn consume(y:u32)->Bool requires y==1;ensures result;implementation accepted for consume{return true;}fn run(x:u32)->Bool{let y=classify(x);return consume(y);}").is_err());
}

#[test]
fn checked_postconditions_remove_a_composed_observation() {
    let module=classified("fn valid(x:u32)->Bool{let y=classify(x);return y==1 || y==2;}").unwrap();
    let subject=optimisation::subject(&module).unwrap();
    let body=&subject.functions["valid"];
    let target=s::children(s::children(body)[0])[0].clone();
    let q=s::free(s::value(Type::Bool),"q");let yes=s::term(s::value(Type::Bool),Node::Bool(true));
    let package=selection(&module,"valid",vec![0,0],q.clone(),yes.clone(),
        vec![Equation{from:q,to:yes}],BTreeMap::from([("q".into(),target.clone())]));
    let selected=optimisation::check(&module,&package).unwrap();
    let selected_body=s::elaborate(&selected.module().program().functions.iter().find(|f|f.name=="valid").unwrap().body,
        &BTreeMap::from([("x".into(),Type::U32)]),selected.module().program(),&Type::Bool).unwrap();
    assert!(format!("{selected_body:?}").contains("Bool(true)"));
    assert!(subject.contexts["valid"].iter().any(|c|c.path==vec![0,0] && c.conditions.len()>=2));
}

#[test]
fn arbitrary_callbacks_do_not_inherit_a_let_argument_fact() {
    let module=CheckedModule::from_source(syntax::parse("module capture;fn values(xs:List<u32>,x:u32)->List<u32>{let saved=x;return xs.map(fn(x)=>x);}").unwrap()).unwrap();
    let subject=optimisation::subject(&module).unwrap();
    for site in subject.contexts.get("values").into_iter().flatten() {
        assert!(!site.conditions.iter().any(|f|matches!(&f.from.node,Node::Free(n)if n=="__ink_scope_1") && matches!(&f.to.node,Node::Free(n)if n=="x")));
    }
}

#[test]
fn conjunctions_and_branch_facts_remain_scoped_and_source_bound() {
    let source="module scoped;spec fn guarded(x:u32,p:Bool)->u32 requires x==0 && p;ensures result==0;implementation original for guarded{return choose(p,x,0);}";
    let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    let subject=optimisation::subject(&module).unwrap();
    assert!(subject.contexts["guarded"].iter().any(|site|site.path.is_empty()&&site.conditions.len()>=3));
    let unguarded=CheckedModule::from_source(syntax::parse("module scoped;fn guarded(x:u32,p:Bool)->u32{return choose(p,x,0);}").unwrap()).unwrap();
    let subject=optimisation::subject(&unguarded).unwrap();
    assert!(!subject.contexts["guarded"].iter().any(|site|site.path.is_empty()));
    assert!(subject.contexts["guarded"].iter().any(|site|site.path==vec![1]&&site.conditions.iter().any(|fact|fact.to.node==Node::Bool(true))));
    assert!(subject.contexts["guarded"].iter().any(|site|site.path==vec![2]&&site.conditions.iter().any(|fact|fact.to.node==Node::Bool(false))));
}

#[test]
fn an_unreachable_false_precondition_cannot_launder_a_postcondition() {
    let source="module unreachable;spec fn impossible()->Bool requires false;ensures result;implementation absent for impossible{return false;}fn safe(p:Bool)->Bool{return choose(p,false,false);}";
    let module=CheckedModule::from_source(syntax::parse(source).unwrap()).unwrap();
    assert!(optimisation::subject(&module).unwrap().contexts.get("safe").into_iter().flatten().all(|site|!site.conditions.iter().any(|fact|format!("{:?}",fact.from).contains("call:impossible"))));
    assert!(CheckedModule::from_source(syntax::parse(&source.replace("choose(p,false,false)","impossible()")).unwrap()).is_err());
}
