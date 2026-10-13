//! Derive invariant and relational postconditions from the fixed source
//! transition model. Proof producers never supply the state transition meaning.
use super::*;
use crate::{
    action_model::Projection,
    logic::{self, Branch, Equation as Eqn, Sort, Term},
};
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StateObligation {
    pub name: String,
    pub params: Vec<(String, Sort)>,
    pub conditions: Vec<Eqn>,
    pub goal: Eqn,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct StateObligations {
    pub semantics: String,
    pub objects: BTreeMap<String, crate::registry::Entry>,
    pub obligations: Vec<StateObligation>,
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(n: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: n.into(),
        arguments: args,
    }
}
fn yes(t: Term) -> Eqn {
    Eqn {
        from: t,
        to: Term::Bool(true),
    }
}
struct Ghosts {
    p: Program,
    next: usize,
}
impl Ghosts {
    /// Pure proof observations use the ordinary pure-function correspondence.
    /// Capture state reads as arguments at the ghost query, rather than adding
    /// collection primitives or callback assumptions to the action language.
    fn observation_query(
        &mut self,
        params: Vec<(String, Type)>,
        value: Expr,
        observations: &Option<Vec<(String, Type, Expr)>>,
    ) -> LangResult<String> {
        let Some(observations) = observations else {
            return self.query(params, Type::Bool, value);
        };
        let mut parameters = params.clone();
        parameters.extend(observations.iter().map(|(n, t, _)| (n.clone(), t.clone())));
        let query = self.query(params, Type::Bool, Expr::Bool(true))?;
        let mut function = format!("{query}_value");
        while self.p.functions.iter().any(|f| f.name == function)
            || self.p.actions.iter().any(|a| a.name == function)
            || self
                .p
                .states
                .iter()
                .chain(&self.p.keeps)
                .any(|s| s.name == function)
        {
            function.push('_');
        }
        let mut args = parameters[..parameters.len() - observations.len()]
            .iter()
            .map(|(n, _)| Expr::Var(n.clone()))
            .collect::<Vec<_>>();
        args.extend(observations.iter().map(|(_, _, e)| e.clone()));
        self.p.functions.push(Function {
            name: function.clone(),
            params: parameters,
            result: Type::Bool,
            body: value,
        });
        self.p
            .actions
            .iter_mut()
            .find(|a| a.name == query)
            .unwrap()
            .body = vec![Statement::Return(Expr::Call(function, args))];
        Ok(query)
    }
    fn query(
        &mut self,
        params: Vec<(String, Type)>,
        result: Type,
        value: Expr,
    ) -> LangResult<String> {
        let mut name = format!("__ink_contract_{}", self.next);
        self.next += 1;
        while self.p.actions.iter().any(|a| a.name == name)
            || self.p.functions.iter().any(|a| a.name == name)
            || self
                .p
                .states
                .iter()
                .chain(&self.p.keeps)
                .any(|s| s.name == name)
        {
            name.push('_');
        }
        self.p.actions.push(Action {
            name: name.clone(),
            kind: ActionKind::Query,
            params,
            result,
            reads: self
                .p
                .states
                .iter()
                .chain(&self.p.keeps)
                .map(|s| s.name.clone())
                .collect(),
            writes: vec![],
            emits: vec![],
            body: vec![Statement::Return(value)],
        });
        Ok(name)
    }
}
/// Before expressions are typed as readonly observations of the original state.
/// Captures have fresh names and cannot depend on result or nested before.
fn captures(
    e: &Expr,
    p: &Program,
    params: &[(String, Type)],
    out: &mut Vec<(String, Type, Expr)>,
    depth: usize,
) -> LangResult<Expr> {
    if depth > 128 || out.len() > 128 {
        return Err("before expression budget".into());
    }
    if let Expr::Call(n, args) = e {
        if n == "before" {
            if args.len() != 1 {
                return Err("before expects one expression".into());
            }
            let mut forbidden = false;
            crate::analysis::walk(&args[0], |e| {
                forbidden |= matches!(e,Expr::Call(n,_)if n=="before")
                    || matches!(e,Expr::Var(n)if n=="result");
            });
            if forbidden {
                return Err("before cannot contain result or another before".into());
            }
            let ty = crate::statecheck::expression_type(
                p,
                &args[0],
                &crate::check::params_env(params)?,
            )?;
            if matches!(ty, Type::Table(..) | Type::Buffer(..)) {
                return Err("before must capture a value observation".into());
            }
            let mut name = format!("__ink_before_{}", out.len());
            while params.iter().any(|(n, _)| n == &name)
                || out.iter().any(|(n, _, _)| n == &name)
                || crate::analysis::references_free(e, &name)
            {
                name.push('_');
            }
            out.push((name.clone(), ty, args[0].clone()));
            return Ok(Expr::Var(name));
        }
    }
    let recurse = |e: &Expr, out: &mut Vec<_>| captures(e, p, params, out, depth + 1);
    Ok(match e {
        Expr::Neg(x) => Expr::Neg(Box::new(recurse(x, out)?)),
        Expr::Try(_) => return Err("contract predicates cannot propagate errors".into()),
        Expr::Let(n, t, x, b) => Expr::Let(
            n.clone(),
            t.clone(),
            Box::new(recurse(x, out)?),
            Box::new(recurse(b, out)?),
        ),
        Expr::Binary(n, a, b) => Expr::Binary(
            n.clone(),
            Box::new(recurse(a, out)?),
            Box::new(recurse(b, out)?),
        ),
        Expr::Call(n, args) => Expr::Call(
            n.clone(),
            args.iter()
                .map(|a| recurse(a, out))
                .collect::<LangResult<_>>()?,
        ),
        Expr::Method(x, n, args) => Expr::Method(
            Box::new(recurse(x, out)?),
            n.clone(),
            args.iter()
                .map(|a| recurse(a, out))
                .collect::<LangResult<_>>()?,
        ),
        Expr::Lambda(n, b) => Expr::Lambda(n.clone(), Box::new(recurse(b, out)?)),
        Expr::Field(x, n) => Expr::Field(Box::new(recurse(x, out)?), n.clone()),
        Expr::Record(n, fs) => Expr::Record(
            n.clone(),
            fs.iter()
                .map(|(n, x)| Ok((n.clone(), recurse(x, out)?)))
                .collect::<LangResult<_>>()?,
        ),
        e => e.clone(),
    })
}
fn query_value(
    model: &Projection,
    cx: &logic::Context,
    name: &str,
    params: &[(String, Sort)],
    state: Term,
    version: Term,
    args: Vec<Term>,
) -> LangResult<Term> {
    let action = &model.actions[name];
    let mut actual = vec![state, version];
    actual.extend(args);
    let value = cx.evaluate(params, &call(&action.function, actual))?;
    let value = crate::action_model::public_normal(&value, &BTreeMap::new(), &mut 0);
    fn extract(t: Term, observation: &Sort) -> LangResult<Term> {
        match t {
            Term::Construct {
                datatype,
                constructor: 0,
                mut arguments,
            } if *observation == Sort::Data(datatype.clone()) && arguments.len() == 5 => {
                Ok(arguments.remove(0))
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => Ok(Term::If {
                condition,
                on_true: Box::new(extract(*on_true, observation)?),
                on_false: Box::new(extract(*on_false, observation)?),
            }),
            Term::Match {
                scrutinee,
                branches,
            } => Ok(Term::Match {
                scrutinee,
                branches: branches
                    .into_iter()
                    .map(|b| {
                        Ok(Branch {
                            bindings: b.bindings,
                            body: extract(b.body, observation)?,
                        })
                    })
                    .collect::<LangResult<_>>()?,
            }),
            _ => Err("contract observation must be total and readonly".into()),
        }
    }
    extract(value, &action.result)
}
/// Exact logical-state constraints from source predicates. Structural equality
/// is projected as equality of values; scalar IEEE float equality remains a
/// Boolean predicate and cannot grant equality of bit representations.
pub(crate) fn source_domain(source: &Program) -> LangResult<(BTreeMap<String,crate::registry::Entry>,Vec<Eqn>)> {
    if source.contracts.invariants.is_empty() { return Ok((BTreeMap::new(),vec![])) }
    let mut p=source.clone();p.contracts=Contracts::default();
    let mut ghosts=Ghosts{p,next:0};let mut observations=vec![];
    fn predicates(e:&Expr,out:&mut Vec<Expr>){
        if let Expr::Binary(op,a,b)=e {
            if op=="&&" {predicates(a,out);predicates(b,out);return}
        }
        out.push(e.clone());
    }
    let mut values=vec![];
    for invariant in &source.contracts.invariants {predicates(invariant,&mut values)}
    for predicate in values {
        if let Expr::Binary(op,left,right)=&predicate {
            if op=="==" {
                let ty=crate::statecheck::expression_type(&ghosts.p,left,&BTreeMap::new())?;
                if ty!=Type::F32 {
                    let a=ghosts.query(vec![],ty.clone(),(**left).clone())?;
                    let z=ghosts.query(vec![],ty,(**right).clone())?;
                    observations.push((a,Some(z)));continue
                }
            }
        }
        observations.push((ghosts.query(vec![],Type::Bool,predicate)?,None));
    }
    let checked=CheckedModule::from_source(ghosts.p)?;
    let model=Projection::derive(&checked)?;let cx=model.context()?;
    let params=vec![("logical".into(),Sort::Data(model.state.clone()))];
    let mut equations=vec![];
    for (a,z) in observations {
        let value=|name:&str|query_value(&model,&cx,name,&params,var("logical"),Term::U64(0),vec![]);
        equations.push(Eqn{from:value(&a)?,to:match z{Some(z)=>value(&z)?,None=>Term::Bool(true)}});
    }
    Ok((model.objects,equations))
}
pub(super) fn derive(source: &Program) -> LangResult<StateObligations> {
    let contracts = &source.contracts;
    let mut p = source.clone();
    p.contracts = Contracts::default();
    let original_names: Vec<String> = p.actions.iter().map(|a| a.name.clone()).collect();
    let mut ghosts = Ghosts { p, next: 0 };
    let mut invariants = vec![];
    for e in &contracts.invariants {
        invariants.push(ghosts.query(vec![], Type::Bool, e.clone())?);
    }
    let mut specs = vec![];
    for spec in specifications(source).iter().filter(|s| s.kind.is_some()) {
        if spec.params.iter().any(|(n, _)| n == "result") {
            return Err("result is reserved in specifications".into());
        }
        let mut requires = vec![];
        for e in &spec.requires {
            requires.push(ghosts.query(spec.params.clone(), Type::Bool, e.clone())?);
        }
        let mut post = vec![];
        for e in &spec.ensures {
            let mut old = vec![];
            let value = captures(e, &ghosts.p, &spec.params, &mut old, 0)?;
            let mut params = spec.params.clone();
            params.push(("result".into(), spec.result.clone()));
            params.extend(old.iter().map(|(n, t, _)| (n.clone(), t.clone())));
            let name = ghosts.query(params, Type::Bool, value)?;
            let mut before = vec![];
            for (_, t, e) in old {
                before.push(ghosts.query(spec.params.clone(), t, e)?);
            }
            post.push((name, before));
        }
        let names = std::iter::once(spec.name.clone())
            .chain(
                contracts
                    .implementations
                    .iter()
                    .filter(|i| i.specification == spec.name)
                    .map(|i| i.name.clone()),
            )
            .collect::<Vec<_>>();
        if names.len() < 2 && !contracts.inferred.contains_key(&spec.name) {
            return Err(format!("specification {} has no implementation", spec.name));
        }
        for name in &names {
            let a = ghosts
                .p
                .actions
                .iter()
                .find(|a| &a.name == name)
                .ok_or("missing action implementation")?;
            if Some(&a.kind) != spec.kind.as_ref()
                || a.params != spec.params
                || a.result != spec.result
                || a.reads != spec.reads
                || a.writes != spec.writes
                || a.emits != spec.emits
            {
                return Err("action implementation contract signature mismatch".into());
            }
        }
        specs.push((names, requires, post));
    }
    let mut call_checks = vec![];
    let mut guarantee_checks = vec![];
    let mut prefix_checks = vec![];
    for g in super::calls::actions(source)? {
        let stable_state = source.actions.iter()
            .any(|a| a.name == g.owner && a.writes.is_empty());
        if let Some(guarantee)=g.guarantee {
            let spec=super::specification(source,&guarantee.callee).ok_or("missing result guarantee specification")?;
            if source.actions.iter().any(|a|a.name==g.owner) {
                // Bind the postcondition to the actual captured value and the
                // lexical arguments at this source site. Local facts will be
                // established by the prefix, not assumed at arbitrary state.
                let mut names=BTreeMap::new();
                for (i,name) in spec.params.iter().map(|(n,_)|n.as_str())
                    .chain(std::iter::once("result")).enumerate() {
                    let mut fresh=format!("__ink_observed_{i}");
                    while g.params.iter().any(|(n,_)|n==&fresh)
                        || crate::analysis::references_free(&guarantee.ensure,&fresh)
                        || guarantee.arguments.iter().any(|e|crate::analysis::references_free(e,&fresh))
                        || names.values().any(|n|n==&fresh) {fresh.push('_');}
                    names.insert(name.to_owned(),fresh);
                }
                let mut predicate=crate::syntax::rename_expression(&guarantee.ensure,&names);
                for ((name,ty),argument) in spec.params.iter().zip(&guarantee.arguments).rev() {
                    predicate=Expr::Let(names[name].clone(),Some(Box::new(ty.clone())),
                        Box::new(argument.clone()),Box::new(predicate));
                }
                let locals=g.params.iter().filter(|(n,_)|crate::analysis::references_free(&predicate,n))
                    .cloned().collect::<Vec<_>>();
                let mut params=locals.clone();params.push((names["result"].clone(),spec.result.clone()));
                let post=ghosts.query(params,Type::Bool,predicate)?;
                prefix_checks.push((g.name,g.owner,guarantee.site,locals,post));
                continue;
            }
            let anchor=ghosts.query(g.params.clone(),Type::Bool,Expr::Bool(true))?;
            let mut arguments=vec![];
            for ((_,ty),value) in spec.params.iter().zip(guarantee.arguments) {
                arguments.push(ghosts.query(g.params.clone(),ty.clone(),value)?);
            }
            let mut requires=vec![];
            for predicate in &spec.requires {
                requires.push(ghosts.query(spec.params.clone(),Type::Bool,predicate.clone())?);
            }
            let mut parameters=spec.params.clone();
            parameters.push(("result".into(),spec.result.clone()));
            let post=ghosts.query(parameters,Type::Bool,guarantee.ensure)?;
            let mut conditions=vec![];
            for predicate in g.conditions {
                conditions.push(ghosts.query(g.params.clone(),Type::Bool,predicate)?);
            }
            guarantee_checks.push((g.name,anchor,guarantee.callee,arguments,requires,post,conditions,stable_state));
            continue;
        }
        let name = ghosts.observation_query(g.params.clone(), g.predicate, &g.observations)?;
        let mut conditions = vec![];
        for e in g.conditions {
            conditions.push(ghosts.observation_query(g.params.clone(), e, &g.observations)?);
        }
        // Invariants hold at a checked invocation boundary. A source action
        // with no write capability observes that same state throughout, so its
        // call-site goals may use the boundary invariant. Mutating actions and
        // synthetic keep-initializer checks do not receive this assumption.
        // Use separate zero-argument ghosts: a local/parameter named like a
        // state slot must not capture the invariant's global observation.
        call_checks.push((g.name, name, conditions, stable_state));
    }
    let checked = CheckedModule::from_source(ghosts.p)?;
    let typed=crate::action_ir::CheckedActions::elaborate(&checked)?;
    let mut requests=vec![];
    let mut site_maps=BTreeMap::new();
    for (_,owner,site,locals,post) in &prefix_checks {
        let index=source.actions.iter().position(|a|&a.name==owner).ok_or("missing observed caller")?;
        if !site_maps.contains_key(owner) {
            site_maps.insert(owner.clone(),typed.action(index).ok_or("missing observed caller tree")?
                .source_sites(&source.actions[index])?);
        }
        let (node,env)=site_maps[owner].get(site).ok_or("missing captured result source site")?;
        let slots=locals.iter().map(|(name,_)|env.get(name).copied().ok_or("missing captured lexical slot"))
            .collect::<Result<Vec<_>,_>>()?;
        requests.push(crate::action_model::ValueObservation{action:owner.clone(),node:*node,
            predicate:post.clone(),slots});
    }
    let (model,observations) = Projection::derive_observations(&checked,&requests)?;
    let cx = model.context()?;
    let initial = Term::Construct {
        datatype: model.state.clone(),
        constructor: 0,
        arguments: model
            .tables
            .iter()
            .map(|t| Term::Construct {
                datatype: t.datatype.clone(),
                constructor: 0,
                arguments: vec![],
            })
            .collect(),
    };
    let mut goals = vec![];
    for ((label,owner,_,_,_),observation) in prefix_checks.iter().zip(&observations) {
        let params=&observation.params;
        let args=params[2..].iter().map(|(n,_)|var(n)).collect::<Vec<_>>();
        let mut conditions=vec![];
        for invariant in &invariants {
            conditions.push(yes(query_value(&model,&cx,invariant,params,
                var("initial"),var("version"),vec![])?));
        }
        if let Some((_,requires,_))=specs.iter().find(|(names,_,_)|names.contains(owner)) {
            for predicate in requires {
                conditions.push(yes(query_value(&model,&cx,predicate,params,
                    var("initial"),var("version"),args.clone())?));
            }
        }
        let term=call(&observation.function,params.iter().map(|(n,_)|var(n)).collect());
        let goal=crate::action_model::public_normal(&cx.evaluate(params,&term)?,&BTreeMap::new(),&mut 0);
        goals.push(StateObligation{name:label.clone(),params:params.clone(),conditions,goal:yes(goal)});
    }
    for (label, name, conditions, stable_state) in call_checks {
        let a = &model.actions[&name];
        let params = &a.params;
        let args = params[2..].iter().map(|(n, _)| var(n)).collect::<Vec<_>>();
        let goal = yes(query_value(
            &model,
            &cx,
            &name,
            params,
            var("initial"),
            var("version"),
            args.clone(),
        )?);
        let mut conditions = conditions
            .iter()
            .map(|n| {
                Ok(yes(query_value(
                    &model,
                    &cx,
                    n,
                    params,
                    var("initial"),
                    var("version"),
                    args.clone(),
                )?))
            })
            .collect::<LangResult<Vec<_>>>()?;
        if stable_state {
            for invariant in &invariants {
                conditions.push(yes(query_value(&model, &cx, invariant, params,
                    var("initial"), var("version"), vec![])?));
            }
        }
        goals.push(StateObligation {
            name: label,
            params: params.clone(),
            conditions,
            goal,
        });
    }
    for (label,anchor,callee,arguments,requires,post,conditions,stable_state) in guarantee_checks {
        let params=&model.actions[&anchor].params;
        let local_args=params[2..].iter().map(|(n,_)|var(n)).collect::<Vec<_>>();
        let values=arguments.iter().map(|name|query_value(&model,&cx,name,params,
            var("initial"),var("version"),local_args.clone())).collect::<LangResult<Vec<_>>>()?;
        let mut conditions=conditions.iter().map(|name|Ok(yes(query_value(&model,&cx,name,params,
            var("initial"),var("version"),local_args.clone())?))).collect::<LangResult<Vec<_>>>()?;
        // These requirements have separate call obligations. The result clause
        // is conditional on the same actual arguments and current state.
        for name in requires {
            conditions.push(yes(query_value(&model,&cx,&name,params,var("initial"),var("version"),values.clone())?));
        }
        if stable_state {
            for invariant in &invariants {
                conditions.push(yes(query_value(&model,&cx,invariant,params,var("initial"),var("version"),vec![])?));
            }
        }
        let action=&model.actions[&callee];
        let observation=match &action.result {Sort::Data(name)=>name,_=>return Err("result guarantee observation sort".into())};
        let declaration:logic::Declaration=serde_json::from_value(model.objects[observation].payload["declaration"].clone()).map_err(|e|e.to_string())?;
        let logic::Declaration::Datatype{constructors}=declaration else{return Err("result guarantee observation datatype".into())};
        let bindings=(0..5).map(|i|format!("__guarantee_reply_{i}")).collect::<Vec<_>>();
        let mut local=params.clone();local.extend(bindings.iter().cloned().zip(constructors[0].fields.clone()));
        let mut post_args=values.clone();post_args.push(var(&bindings[0]));
        let body=query_value(&model,&cx,&post,&local,var(&bindings[3]),var(&bindings[2]),post_args)?;
        let mut args=vec![var("initial"),var("version")];args.extend(values);
        let goal=Term::Match{scrutinee:Box::new(call(&action.function,args)),branches:vec![
            Branch{bindings,body},
            Branch{bindings:vec!["__guarantee_host_code".into(),"__guarantee_host_version".into(),"__guarantee_host_state".into()],body:Term::Bool(true)},
        ]};
        goals.push(StateObligation{name:label,params:params.clone(),conditions,goal:yes(goal)});
    }
    for (i, n) in invariants.iter().enumerate() {
        goals.push(StateObligation {
            name: format!("invariant:{i}:initial"),
            params: vec![],
            conditions: vec![],
            goal: yes(query_value(
                &model,
                &cx,
                n,
                &[],
                initial.clone(),
                Term::U64(0),
                vec![],
            )?),
        })
    }
    for name in original_names {
        let a = &model.actions[&name];
        let params = &a.params;
        let args = params[2..].iter().map(|(n, _)| var(n)).collect::<Vec<_>>();
        let mut conditions = vec![];
        for n in &invariants {
            conditions.push(yes(query_value(
                &model,
                &cx,
                n,
                params,
                var("initial"),
                var("version"),
                vec![],
            )?));
        }
        let spec = specs.iter().find(|(names, _, _)| names.contains(&name));
        if let Some((_, requires, _)) = spec {
            for n in requires {
                conditions.push(yes(query_value(
                    &model,
                    &cx,
                    n,
                    params,
                    var("initial"),
                    var("version"),
                    args.clone(),
                )?));
            }
        }
        let action_call = call(&a.function, params.iter().map(|(n, _)| var(n)).collect());
        let bindings = (0..5)
            .map(|i| format!("__contract_reply_{i}"))
            .collect::<Vec<_>>();
        let mut local = params.clone();
        // Obtain constructor field sorts from the authenticated declaration.
        let Sort::Data(observation) = &a.result else {
            return Err("invalid action observation".into());
        };
        let declaration: logic::Declaration =
            serde_json::from_value(model.objects[observation].payload["declaration"].clone())
                .map_err(|e| e.to_string())?;
        let logic::Declaration::Datatype { constructors } = declaration else {
            return Err("invalid observation datatype".into());
        };
        local.extend(bindings.iter().cloned().zip(constructors[0].fields.clone()));
        let transition_goal = |body: Term| Term::Match {
            scrutinee: Box::new(action_call.clone()),
            branches: vec![
                Branch {
                    bindings: bindings.clone(),
                    body,
                },
                Branch {
                    bindings: vec![
                        "__host_code".into(),
                        "__host_version".into(),
                        "__host_state".into(),
                    ],
                    body: Term::Bool(true),
                },
            ],
        };
        for (i, n) in invariants.iter().enumerate() {
            let body = query_value(
                &model,
                &cx,
                n,
                &local,
                var(&bindings[3]),
                var(&bindings[2]),
                vec![],
            )?;
            goals.push(StateObligation {
                name: format!("{name}:invariant:{i}"),
                params: params.clone(),
                conditions: conditions.clone(),
                goal: yes(transition_goal(body)),
            });
        }
        if let Some((_, _, post)) = spec {
            for (i, (n, before)) in post.iter().enumerate() {
                let mut values = args.clone();
                values.push(var(&bindings[0]));
                for old in before {
                    values.push(query_value(
                        &model,
                        &cx,
                        old,
                        &local,
                        var("initial"),
                        var("version"),
                        args.clone(),
                    )?);
                }
                let body = query_value(
                    &model,
                    &cx,
                    n,
                    &local,
                    var(&bindings[3]),
                    var(&bindings[2]),
                    values,
                )?;
                goals.push(StateObligation {
                    name: format!("{name}:ensures:{i}"),
                    params: params.clone(),
                    conditions: conditions.clone(),
                    goal: yes(transition_goal(body)),
                });
            }
        }
    }
    Ok(StateObligations {
        semantics: SEMANTICS.into(),
        objects: model.objects,
        obligations: goals,
    })
}
pub(super) fn context(
    derived: &StateObligations,
    bundle: Option<&crate::registry::Bundle>,
) -> LangResult<logic::Context> {
    let mut cx = if let Some(b) = bundle {
        crate::registry::CheckedBundle::check(b)?.first_order_context()?
    } else {
        logic::Context::default()
    };
    let mut pending = derived.objects.clone();
    while !pending.is_empty() {
        let ready = pending
            .iter()
            .filter(|(_, e)| e.dependencies.iter().all(|d| !pending.contains_key(d)))
            .map(|(i, _)| i.clone())
            .collect::<Vec<_>>();
        if ready.is_empty() {
            return Err("cyclic contract definitions".into());
        }
        for id in ready {
            let entry = pending.remove(&id).unwrap();
            let d: logic::Declaration =
                serde_json::from_value(entry.payload["declaration"].clone())
                    .map_err(|e| e.to_string())?;
            if cx.matches_definition(&id, &d).is_err() {
                cx.declare(id, &d)?;
            }
        }
    }
    Ok(cx)
}
pub(super) fn check(module: &CheckedModule) -> LangResult<()> {
    let c = &module.program().contracts;
    if c.invariants.is_empty()
        && !specifications(module.program()).iter().any(|s| s.kind.is_some())
        && super::calls::actions(module.program())?.is_empty()
    {
        if !c.state_proofs.is_empty() || c.state_knowledge.is_some() {
            return Err("state evidence without state contracts".into());
        }
        return Ok(());
    }
    let derived = derive(module.program())?;
    let cx = context(&derived, c.state_knowledge.as_ref())?;
    let mut used = BTreeSet::new();
    for g in derived.obligations {
        let default = logic::Proof::Convert {
            from: g.goal.from.clone(),
            to: g.goal.to.clone(),
        };
        let result = if let Some(proof) = c.state_proofs.get(&g.name) {
            cx.check(&g.params, &g.conditions, &g.goal.from, &g.goal.to, proof)
        } else {
            let direct = cx.check(&g.params, &g.conditions, &g.goal.from, &g.goal.to, &default);
            if direct.is_ok()
                || !(0..g.conditions.len()).any(|i| {
                    cx.check(
                        &g.params,
                        &g.conditions,
                        &g.goal.from,
                        &g.goal.to,
                        &logic::Proof::Hypothesis(i),
                    )
                    .is_ok()
                })
            {
                direct
            } else {
                Ok(())
            }
        };
        result.map_err(|e| format!("contract {}: {e}", g.name))?;
        used.insert(g.name);
    }
    if c.state_proofs.keys().any(|n| !used.contains(n)) {
        return Err("state proof for unknown obligation".into());
    }
    Ok(())
}
