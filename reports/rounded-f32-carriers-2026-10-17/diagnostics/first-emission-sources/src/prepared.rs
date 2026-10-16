//! Literal residual functions over sealed immutable inputs. Dependencies and
//! readonly loans use core structural analyses, never an algorithm recogniser.
use super::{Emitter, Env};
use ink_core::{analysis, local_collections, recursion, syntax::*, LangResult};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd)]
struct Input { parameter: usize, path: Vec<String> }
type Origins = Option<BTreeSet<Input>>;

/// Provenance of an already evaluated immutable value, separate from the work
/// required to evaluate the expression producing it. Only inputs and literal
/// record structure admit field projection; opaque computations keep all inputs.
#[derive(Clone, Debug)]
enum Shape {
    Input(Input),
    Value(Origins),
    Record(BTreeMap<String, Shape>),
}
type Dependencies = BTreeMap<String, Shape>;
impl Shape {
    fn dynamic() -> Self { Self::Value(None) }
    fn record(fields: BTreeMap<String, Shape>) -> Self {
        // Repeated aliases can double a record's expanded summary at each let
        // despite a tiny source body. Bound the produced shape as well as the
        // traversal that discovers it, before cloning it into later bindings.
        let mut pending = fields.values().collect::<Vec<_>>();
        let mut count = 1;
        while let Some(shape) = pending.pop() {
            count += 1;
            if count > 512 { return Self::dynamic(); }
            if let Self::Record(fields) = shape { pending.extend(fields.values()); }
        }
        Self::Record(fields)
    }
    fn origins(&self) -> Origins {
        match self {
            Self::Input(input) => Some([input.clone()].into_iter().collect()),
            Self::Value(found) => found.clone(),
            Self::Record(fields) => fields.values().try_fold(BTreeSet::new(), |out, shape|
                merge(out, shape.origins())),
        }
    }
    fn field(&self, name: &str) -> Self {
        match self {
            Self::Input(input) if input.path.len() < 32 => {
                let mut input = input.clone(); input.path.push(name.into()); Self::Input(input)
            }
            Self::Record(fields) => fields.get(name).cloned().unwrap_or_else(Self::dynamic),
            Self::Value(found) => Self::Value(found.clone()),
            _ => Self::dynamic(),
        }
    }
    fn mask(&self, plan: &mut Preparation, emitter: &mut Emitter<'_>) -> String {
        let expression = match self {
            Self::Input(input) if input.path.is_empty() => return format!("fixed[{}]",input.parameter),
            Self::Input(input) => format!("__preparedPart(fixed[{}],{})", input.parameter,
                serde_json::to_string(&input.path).unwrap()),
            Self::Value(found) => eligibility(found),
            Self::Record(fields) => {
                let fields = fields.iter().map(|(name,value)| format!("[{}]:{}",
                    serde_json::to_string(name).unwrap(),value.mask(plan,emitter)))
                    .collect::<Vec<_>>().join(",");
                format!("{{all:{},fields:{{{fields}}}}}",eligibility(&self.origins()))
            }
        };
        plan.policy(expression,emitter)
    }
}
fn merge(mut out: BTreeSet<Input>, found: Origins) -> Origins {
    for input in found? {
        if out.iter().any(|old| old.parameter == input.parameter && input.path.starts_with(&old.path)) { continue; }
        out.retain(|old| old.parameter != input.parameter || !old.path.starts_with(&input.path));
        out.insert(input);
    }
    (out.len() <= 128).then_some(out)
}
fn eligibility(found: &Origins) -> String {
    match found {
        None => "false".into(),
        Some(found) if found.is_empty() => "true".into(),
        Some(found) => found.iter().map(|input| format!("__preparedStable(fixed[{}],{})", input.parameter,
            serde_json::to_string(&input.path).unwrap())).collect::<Vec<_>>().join("&&"),
    }
}

/// Field-sensitive evaluation dependencies only enter already evaluated lexical
/// projections. Binding forms use core free-variable analysis conservatively;
/// no local binder is mistaken for an outer variable with the same name.
fn dependencies(expression: &Expr, env: &Dependencies, p: &Program) -> Origins {
    fn projection(mut e: &Expr, env: &Dependencies) -> Option<Shape> {
        let mut fields = Vec::new();
        while let Expr::Field(receiver, field) = e {
            if fields.len() >= 32 { return None; }
            fields.push(field); e = receiver;
        }
        let Expr::Var(name) = e else { return None; };
        let mut shape = env.get(name)?.clone();
        for field in fields.into_iter().rev() { shape = shape.field(field); }
        Some(shape)
    }
    fn visit(e: &Expr, env: &Dependencies, p: &Program, work: &mut usize, depth: usize) -> Origins {
        if *work == 0 || depth >= 48 { return None; } *work -= 1;
        if let Some(shape) = projection(e,env) { return shape.origins(); }
        if matches!(e, Expr::Var(_) | Expr::Let(..) | Expr::Lambda(..)) {
            return analysis::free_variables(e).iter().try_fold(BTreeSet::new(), |out,name| {
                if let Some(shape) = env.get(name) { merge(out,shape.origins()) }
                else if matches!(name.as_str(), "None" | "Map" | "Buffer") || p.enums.contains_key(name) { Some(out) }
                else { None }
            });
        }
        analysis::children(e).iter().try_fold(BTreeSet::new(), |out,child|
            merge(out,visit(child,env,p,work,depth+1)))
    }
    visit(expression,env,p,&mut 512,0)
}

/// Summarize the returned value AFTER its expression executes. A dynamic guard
/// or unused argument may still throw on every call: this summary must never be
/// used as the evaluation dependencies of that call or record construction.
fn returned(expression: &Expr, env: &Dependencies, p: &Program) -> Shape {
    fn visit(e: &Expr, env: &Dependencies, p: &Program, work: &mut usize, depth: usize) -> Shape {
        if *work == 0 || depth >= 32 { return Shape::dynamic(); } *work -= 1;
        match e {
            Expr::Var(name) => env.get(name).cloned().unwrap_or_else(|| Shape::Value(dependencies(e,env,p))),
            Expr::Field(receiver,field) => visit(receiver,env,p,work,depth+1).field(field),
            Expr::Record(_,fields) if fields.len() <= 64 => Shape::record(fields.iter().map(|(name,value)|
                (name.clone(),visit(value,env,p,work,depth+1))).collect()),
            Expr::Let(name,_,value,rest) => {
                let value = visit(value,env,p,work,depth+1);
                let mut local = env.clone(); local.insert(name.clone(),value);
                visit(rest,&local,p,work,depth+1)
            }
            Expr::Call(name,args) => {
                if let Some(f) = p.functions.iter().find(|f| &f.name == name) {
                    if !recursion::recursive(f) && args.len() == f.params.len() {
                        let local = f.params.iter().zip(args).map(|((name,_),arg)|
                            (name.clone(),visit(arg,env,p,work,depth+1))).collect();
                        return visit(&f.body,&local,p,work,depth+1);
                    }
                }
                Shape::Value(dependencies(e,env,p))
            }
            _ => Shape::Value(dependencies(e,env,p)),
        }
    }
    visit(expression,env,p,&mut 512,0)
}

/// Iteration arguments change on every iteration, even when the enclosing
/// collection is fixed. Preserve only lexical captures' original provenance.
fn callback<'a>(expression: &'a Expr, env: &Env, deps: &Dependencies,
    params: &[(String, Type)]) -> LangResult<(&'a Expr, Env, Dependencies)> {
    let (body, local) = Emitter::callback(expression, env, params)?;
    let mut found = deps.clone();
    let mut binder = expression;
    for _ in params {
        let Expr::Lambda(name, rest) = binder else { return Err("prepared callback binding".into()) };
        found.insert(name.clone(), Shape::dynamic());
        binder = rest;
    }
    Ok((body, local, found))
}

fn shared_callback(expression: &Expr, env: &Env, p: &Program) -> bool {
    // The optional lane does not lend new cross-invocation caches to captured
    // mutable owners. Ordinary emission retains the existing loan analysis.
    analysis::free_variables(expression).iter().all(|n|
        env.get(n).is_none_or(|(_, ty)| !local_collections::owned(ty, p)))
}

/// A bounded structural work estimate for the explicit preparation lane. Tiny
/// scalar expressions stay literal; loops, collection construction and larger
/// helper computations can repay a retained binding. This is neither a source
/// fact nor measured profitability/automatic implementation-selection evidence.
fn retention_work(expression: &Expr, p: &Program) -> bool {
    let mut pending=vec![(expression,0)];let mut nodes=0;
    while let Some((e,depth))=pending.pop() {
        nodes+=1;if nodes>=32 {return true;}
        if depth>=16 {continue;}
        match e {
            Expr::Call(name,_) if matches!(name.as_str(),"foldl"|"foldr"|"fold_until"|"repeat_until"|"sum"|"count") => return true,
            Expr::Method(_,method,_) if matches!(method.as_str(),"map"|"map_indexed"|"filter"|"zip"|"scan"|"concat") => return true,
            Expr::Record(_,fields) if fields.len()>=4 => return true,
            Expr::Call(name,_) => {
                if let Some(f)=p.functions.iter().find(|f| &f.name==name) {
                    if !recursion::recursive(f) {pending.push((&f.body,depth+1));}
                }
            }
            _=>{},
        }
        pending.extend(analysis::children(e).into_iter().map(|e|(e,depth+1)));
    }
    false
}

/// Discover sufficient captured-input conditions for reusable work. Unlike the
/// old Boolean opportunity scan this retains all reached alternatives within its
/// budget, so a factory with an entirely changing mask can use its ordinary body.
/// Binding fallback remains conservative; these conditions grant no authority.
fn opportunities(expression: &Expr, env: &Dependencies, p: &Program, sums: &BTreeMap<usize,bool>) -> Vec<BTreeSet<Input>> {
    struct Search<'a> {p:&'a Program,sums:&'a BTreeMap<usize,bool>,work:usize,found:Vec<BTreeSet<Input>>}
    impl Search<'_> {
        fn retain(&mut self,e:&Expr,env:&Dependencies) {
            if !direct_read(e) && retention_work(e,self.p) {
                if let Some(origins)=dependencies(e,env,self.p) {
                    // A sufficient condition implied by an existing easier one
                    // adds no opportunity. Whole-input stability implies every
                    // descendant projection, in the same captured policy.
                    let implies=|a:&BTreeSet<Input>,b:&BTreeSet<Input>| b.iter().all(|needed|
                        a.iter().any(|have| have.parameter==needed.parameter && needed.path.starts_with(&have.path)));
                    if self.found.iter().any(|old|implies(&origins,old)) {return;}
                    self.found.retain(|old|!implies(old,&origins));
                    if self.found.len()<64 {self.found.push(origins);}
                }
            }
        }
        fn callback(&mut self,e:&Expr,env:&Dependencies,count:usize,shape:Shape,depth:usize) {
            let mut local=env.clone();let mut body=e;
            for _ in 0..count {
                let Expr::Lambda(name,rest)=body else {return;};
                local.insert(name.clone(),shape.clone());body=rest;
            }
            self.visit(body,&local,depth+1);
        }
        fn visit(&mut self,e:&Expr,env:&Dependencies,depth:usize) {
            if self.work==0 || depth>=32 {return;}self.work-=1;
            match e {
                Expr::Let(name,_,initial,rest)=>{
                    self.retain(initial,env);self.visit(initial,env,depth+1);
                    let mut local=env.clone();local.insert(name.clone(),returned(initial,env,self.p));
                    self.visit(rest,&local,depth+1);
                }
                Expr::Call(name,args) if name=="choose" && args.len()==3=>{
                    self.retain(&args[0],env);
                    for arg in args {self.visit(arg,env,depth+1);}
                }
                Expr::Call(name,args) if name=="repeat_until" && args.len()==4=>{
                    self.callback(&args[2],env,1,Shape::dynamic(),depth);
                    self.callback(&args[3],env,2,Shape::dynamic(),depth);
                }
                Expr::Call(name,args) if matches!(name.as_str(),"foldl"|"foldr"|"fold_until")=>{
                    for arg in &args[2..] {self.callback(arg,env,2,Shape::dynamic(),depth);}
                }
                Expr::Call(name,args)=>{
                    if let Some(f)=self.p.functions.iter().find(|f| &f.name==name) {
                        if !recursion::recursive(f) && !local_collections::owned(&f.result,self.p)
                            && f.params.iter().all(|(_,t)|!local_collections::owned(t,self.p)) {
                            let local=f.params.iter().zip(args).map(|((n,_),arg)|(n.clone(),returned(arg,env,self.p))).collect();
                            self.visit(&f.body,&local,depth+1);
                        }
                        for arg in args {self.visit(arg,env,depth+1);}
                    } else if matches!(name.as_str(),"list"|"Some"|"Ok"|"Err")
                        || ink_core::primitives::primitive(name) || ink_core::word::primitive(name) {
                        for arg in args {self.visit(arg,env,depth+1);}
                    }
                }
                Expr::Method(receiver,method,args) if matches!(method.as_str(),"map"|"map_indexed"|"filter"|"fold"|"map_err")=>{
                    let sum=self.sums.get(&(e as *const Expr as usize));
                    for (i,arg) in args.iter().enumerate() {
                        let shape=match sum {
                            Some(true) if method=="fold" && i==1=>Shape::Value(Some(BTreeSet::new())),
                            Some(_)=>Shape::Value(returned(receiver,env,self.p).origins()),
                            None=>Shape::dynamic(),
                        };
                        self.callback(arg,env,if method=="map_indexed" {2}else{1},shape,depth);
                    }
                    if sum.is_some() {self.visit(receiver,env,depth+1);}
                }
                Expr::Method(receiver,method,args) if method=="concat"=>{
                    self.visit(receiver,env,depth+1);for arg in args {self.visit(arg,env,depth+1);}
                }
                Expr::Method(receiver,_,_) if matches!(receiver.as_ref(),Expr::Call(..)|Expr::Let(..))=>self.visit(receiver,env,depth+1),
                Expr::Binary(_,a,b)=>{self.visit(a,env,depth+1);self.visit(b,env,depth+1);}
                Expr::Neg(a)|Expr::Field(a,_)=>self.visit(a,env,depth+1),
                Expr::Record(_,fields)=>for (_,e) in fields {self.visit(e,env,depth+1);},
                _=>{},
            }
        }
    }
    let mut search=Search{p,sums,work:512,found:Vec::new()};search.visit(expression,env,0);search.found
}
fn potential(expression:&Expr,env:&Dependencies,p:&Program,sums:&BTreeMap<usize,bool>)->bool {
    !opportunities(expression,env,p,sums).is_empty()
}
fn useful(f:&Function,shapes:&[Shape],p:&Program,sums:&BTreeMap<usize,bool>)->Vec<BTreeSet<Input>> {
    let env=f.params.iter().zip(shapes).map(|((n,_),shape)|(n.clone(),shape.clone())).collect();
    opportunities(&f.body,&env,p,sums)
}

#[derive(Default)]
struct Preparation {
    declarations: String,
    retained: usize,
    count: usize,
    delegated: usize,
    masks: BTreeMap<String, String>,
}
impl Preparation {
    fn policy(&mut self, expression: String, emitter: &mut Emitter<'_>) -> String {
        if matches!(expression.as_str(),"true"|"false") {return expression;}
        if let Some(name) = self.masks.get(&expression) {return name.clone();}
        let name = emitter.fresh();
        // This only reads the factory's private immutable policy, never source
        // values, guards or branches. Identical tests can share one binding.
        self.declarations.push_str(&format!("const {name}={expression};\n"));
        self.masks.insert(expression,name.clone());name
    }
}

/// Caching a literal or immutable lexical projection adds an avoidable branch.
/// Calls and computed receivers keep their original evaluation/cache behavior.
fn direct_read(mut expression: &Expr) -> bool {
    while let Expr::Field(receiver,_) = expression {expression=receiver;}
    matches!(expression,Expr::Var(_)|Expr::Num(_)|Expr::Float(_)|Expr::Double(_)|Expr::Bool(_)|Expr::String(_)|Expr::Unit)
}


fn ordinary(emitter: &mut Emitter<'_>, expression: &Expr, env: &Env, ty: &Type) -> LangResult<String> {
    let params = env.iter().map(|(n, (_, t))| (n.clone(), t.clone())).collect::<Vec<_>>();
    // Every residual cut treats previous values as shared, even when they came
    // from a fresh allocation in a preceding source call.
    emitter.in_place = ink_core::in_place::analyse_with_result(expression, &params, Some(ty), emitter.p);
    emitter.expr(expression, env, Some(ty))
}

#[allow(clippy::too_many_arguments)]
fn binding(emitter: &mut Emitter<'_>, expression: &Expr, env: &Env, deps: &Dependencies,
    ty: &Type, readonly: bool, plan: &mut Preparation, depth: usize) -> LangResult<String> {
    plan.count += 1;
    if plan.count > 64 { return Err("prepared residual binding budget".into()); }
    let var = emitter.fresh();
    if let Some(found) = dependencies(expression, deps, emitter.p).filter(|_| readonly && !direct_read(expression) && retention_work(expression,emitter.p)) {
        let cache = emitter.fresh(); let ready = emitter.fresh();
        let eligible = plan.policy(eligibility(&Some(found)),emitter);
        plan.declarations.push_str(&format!("let {ready}=false,{cache};\n"));
        emitter.line(format!("let {var};if({eligible}&&{ready}){{{var}={cache};}}else{{"));
        let value = residual(emitter, expression, env.clone(), deps.clone(), ty, plan, depth + 1)?;
        emitter.line(format!("{var}={value};if({eligible}){{{cache}={var};{ready}=true;}}}}"));
        plan.retained += 1;
    } else {
        let value = residual(emitter, expression, env.clone(), deps.clone(), ty, plan, depth + 1)?;
        emitter.line(format!("const {var}={value};"));
    }
    Ok(var)
}

#[allow(clippy::too_many_arguments)]
fn operand(emitter: &mut Emitter<'_>, expression: &Expr, env: &mut Env, deps: &mut Dependencies,
    ty: &Type, plan: &mut Preparation, depth: usize) -> LangResult<Expr> {
    let found = returned(expression, deps, emitter.p);
    let value = residual(emitter, expression, env.clone(), deps.clone(), ty, plan, depth + 1)?;
    let value = emitter.bind(&value);
    let name = loop {
        let n = emitter.fresh();
        if !env.contains_key(&n) && !emitter.p.enums.contains_key(&n) && !emitter.p.ids.contains(&n)
            && !emitter.p.states.iter().any(|s| s.name == n) && !emitter.p.keeps.iter().any(|s| s.name == n) { break n; }
    };
    env.insert(name.clone(), (value, ty.clone())); deps.insert(name.clone(), found);
    Ok(Expr::Var(name))
}

/// Enter strict subexpressions without lifting lazy operands or callbacks.
/// Reuse the ordinary emitter for the final operation and its exact carriers.
fn strict(emitter: &mut Emitter<'_>, expression: &Expr, mut env: Env, mut deps: Dependencies,
    result: &Type, plan: &mut Preparation, depth: usize) -> LangResult<String> {
    let rebound = match expression {
        Expr::Binary(op, a, b) if matches!(op.as_str(), "&&" | "||") => {
            let args = if op == "&&" { vec![*a.clone(), *b.clone(), Expr::Bool(false)] }
                else { vec![*a.clone(), Expr::Bool(true), *b.clone()] };
            return residual(emitter, &Expr::Call("choose".into(), args), env, deps, result, plan, depth + 1);
        }
        Expr::Binary(op, a, b) => {
            let ts = Emitter::types(&env);
            let context = if ink_core::check::is_numeric_value(result) {Some(result.clone())}
                else {ink_core::check::hint(a, &ts, emitter.p).or_else(|| ink_core::check::hint(b, &ts, emitter.p))};
            let ty = emitter.infer(a, &env, context.as_ref())?;
            let a = operand(emitter, a, &mut env, &mut deps, &ty, plan, depth)?;
            let b = operand(emitter, b, &mut env, &mut deps, &ty, plan, depth)?;
            Expr::Binary(op.clone(), Box::new(a), Box::new(b))
        }
        Expr::Neg(a) => Expr::Neg(Box::new(operand(emitter, a, &mut env, &mut deps, result, plan, depth)?)),
        Expr::Field(a, field) => {
            let ty = emitter.infer(a, &env, None)?;
            Expr::Field(Box::new(operand(emitter, a, &mut env, &mut deps, &ty, plan, depth)?), field.clone())
        }
        Expr::Record(name, fields) => {
            let types = emitter.p.records[name].clone(); let mut next = Vec::new();
            for (name, e) in fields {
                let ty = &types.iter().find(|(n, _)| n == name).ok_or("prepared record field")?.1;
                next.push((name.clone(), operand(emitter, e, &mut env, &mut deps, ty, plan, depth)?));
            }
            Expr::Record(name.clone(), next)
        }
        Expr::Call(name, args) => {
            let params = if let Some(f) = emitter.p.functions.iter().find(|f| &f.name == name) {
                f.params.iter().map(|(_, t)| t.clone()).collect()
            } else if ink_core::primitives::primitive(name) {
                let first = ink_core::primitives::input_type(name, args.first(), |a| emitter.infer(a, &env, None))?;
                ink_core::primitives::signature(name, first.as_ref())?.0
            } else if ink_core::word::primitive(name) {ink_core::word::arguments(name, result)}
            else {match (name.as_str(), result) {
                ("list", Type::List(t)) => vec![*t.clone(); args.len()],
                ("Some", Type::Option(t)) | ("Ok", Type::Result(t, _)) | ("Err", Type::Result(_, t)) => vec![*t.clone()],
                _ => return ordinary(emitter, expression, &env, result),
            }};
            let mut next = Vec::new();
            for (e, ty) in args.iter().zip(params) { next.push(operand(emitter, e, &mut env, &mut deps, &ty, plan, depth)?); }
            Expr::Call(name.clone(), next)
        }
        Expr::Method(xs, method, args) if method == "concat" && matches!(result, Type::List(_)) => {
            let xs = operand(emitter, xs, &mut env, &mut deps, result, plan, depth)?;
            let mut next = Vec::new();
            for e in args {next.push(operand(emitter, e, &mut env, &mut deps, result, plan, depth)?);}
            Expr::Method(Box::new(xs), method.clone(), next)
        }
        _ => return ordinary(emitter, expression, &env, result),
    };
    ordinary(emitter, &rebound, &env, result)
}

fn factory(emitter: &mut Emitter<'_>, f: &Function, index: usize) -> LangResult<(String, usize, usize)> {
    if recursion::recursive(f) || local_collections::owned(&f.result, emitter.p)
        || f.params.iter().any(|(_, t)| local_collections::owned(t, emitter.p))
        || analysis::node_count(&f.body, 4096).is_none() {
        return Err("prepared residual requires a bounded pure value entry".into());
    }
    let mut env = Env::new();
    let mut dependencies = Dependencies::new();
    let mut vars = Vec::new();
    for (i, (name, ty)) in f.params.iter().enumerate() {
        let var = emitter.fresh(); vars.push(var.clone());
        emitter.immutable_locals.insert(var.clone());
        env.insert(name.clone(), (var, ty.clone()));
        dependencies.insert(name.clone(), Shape::Input(Input{parameter:i,path:Vec::new()}));
    }
    let reusable=opportunities(&f.body,&dependencies,emitter.p,&emitter.prepared_sums);
    let reusable=reusable.iter().map(|origins|format!("({})",eligibility(&Some(origins.clone())))).collect::<Vec<_>>().join("||");
    if reusable.is_empty() {return Err("no reusable captured work".into());}
    let mut plan = Preparation::default();
    emitter.lines.clear();
    emitter.normalize_parameters(f,&vars);
    let value = residual(emitter, &f.body, env, dependencies, &f.result,
        &mut plan, 0)?;
    if plan.retained == 0 && plan.delegated == 0 { return Err("no reusable lexical bindings".into()); }
    let declarations = plan.declarations;
    let source = format!("function __prepareFn{index}(fixed,depth=0){{if(depth>=16||!({reusable}))return __fn{index};{declarations}return function({}){{{}return {value};}};}}\n", vars.join(","), emitter.lines);
    if source.len() > 131_072 { return Err("prepared residual source budget".into()); }
    Ok((source, plan.retained, plan.delegated))
}

fn residual(emitter: &mut Emitter<'_>, body: &Expr, mut env: Env,
    mut deps: Dependencies, result: &Type, plan: &mut Preparation, depth: usize,
) -> LangResult<String> {
    if depth >= 48 { return Err("prepared residual depth budget".into()); }
    if emitter.budget == 0 { return Err("prepared residual work budget".into()); }
    emitter.budget -= 1;
    if let Expr::Let(name, annotation, initializer, rest) = body {
        let ty = emitter.infer(initializer, &env, annotation.as_deref())?;
        let found = returned(initializer, &deps, emitter.p);
        let ts = Emitter::types(&env);
        let readonly = !local_collections::owned(&ty, emitter.p) || {
            let callback = Expr::Lambda(name.clone(), rest.clone());
            local_collections::callback_parameter_loans(&callback, &ts, emitter.p, &[ty.clone()], result)
                .is_ok_and(|loans| loans == [true])
        };
        let var = binding(emitter, initializer, &env, &deps, &ty, readonly, plan, depth)?;
        env.insert(name.clone(), (var, ty)); deps.insert(name.clone(), found);
        return residual(emitter, rest, env, deps, result, plan, depth + 1);
    }
    if let Expr::Call(name, args) = body {
        if name == "repeat_until" && args.len() == 4
            && !local_collections::owned(result, emitter.p)
            && args[2..].iter().all(|e| shared_callback(e, &env, emitter.p)) {
            let limit = ordinary(emitter, &args[0], &env, &Type::U32)?;
            let limit = emitter.bind(&limit);
            let initial = ordinary(emitter, &args[1], &env, result)?;
            let split = emitter.split_fields(result);
            let out = match &split {
                Some(fields) => emitter.split_state(&initial, fields),
                None => {
                    let out = emitter.fresh(); emitter.line(format!("let {out}={initial};")); out
                }
            };
            emitter.normalized_scalar_slot(&out,result);
            let index = emitter.fresh();
            emitter.line(format!("for(let {index}=0;{index}<{limit};{index}++){{"));
            let (stop, local, found) = callback(&args[2], &env, &deps, &[(out.clone(), result.clone())])?;
            let stop = residual(emitter, stop, local, found, &Type::Bool, plan, depth + 1)?;
            emitter.line(format!("if({stop})break;"));
            let idx = emitter.bind(&format!("({index}>>>0)"));
            let (step, local, found) = callback(&args[3], &env, &deps,
                &[(idx, Type::U32), (out.clone(), result.clone())])?;
            let value = residual(emitter, step, local, found, result, plan, depth + 1)?;
            if split.is_some() {
                emitter.split_update(&out, &value); emitter.line("}");
                let value = emitter.rebuild(&out); emitter.split.remove(&out); return Ok(value);
            }
            emitter.line(format!("{out}={value};}}")); return Ok(out);
        }
        if matches!(name.as_str(), "foldl" | "foldr" | "fold_until")
            && !local_collections::owned(result, emitter.p)
            && args[2..].iter().all(|e| shared_callback(e, &env, emitter.p)) {
            let Type::List(inner) = emitter.infer(&args[0], &env, None)? else { return Err("prepared fold input".into()) };
            let xs = ordinary(emitter, &args[0], &env, &Type::List(inner.clone()))?;
            let xs = emitter.bind(&xs);
            let initial = ordinary(emitter, &args[1], &env, result)?;
            let out = emitter.fresh(); emitter.line(format!("let {out}={initial};"));
            emitter.normalized_scalar_slot(&out,result);
            let index = emitter.fresh();
            emitter.line(if name == "foldr" {format!("for(let {index}={xs}.length-1;{index}>=0;{index}--){{")}
                else {format!("for(let {index}=0;{index}<{xs}.length;{index}++){{")});
            let element = emitter.bind(&super::word_load(&format!("{xs}[{index}]"), &inner));
            let params = [(element, *inner), (out.clone(), result.clone())];
            let stop = if name == "fold_until" {
                let (stop, local, found) = callback(&args[2], &env, &deps, &params)?;
                let stop = residual(emitter, stop, local, found, &Type::Bool, plan, depth + 1)?;
                Some(emitter.bind(&stop))
            } else { None };
            let (step, local, found) = callback(&args[if stop.is_some() {3} else {2}], &env, &deps, &params)?;
            let value = residual(emitter, step, local, found, result, plan, depth + 1)?;
            emitter.line(format!("{out}={value};"));
            if let Some(stop) = stop { emitter.line(format!("if({stop})break;")); }
            emitter.line("}"); return Ok(out);
        }
        if name == "choose" && args.len() == 3 {
            // The condition executes at its original source position. Stable
            // successful checks may persist; dynamic guards and unvisited
            // branches remain dynamic/lazy, and thrown failures are retried.
            let expensive = retention_work(&args[0],emitter.p);
            let condition = if expensive {
                binding(emitter, &args[0], &env, &deps, &Type::Bool, true, plan, depth)?
            } else {
                let value = ordinary(emitter, &args[0], &env, &Type::Bool)?;
                emitter.bind(&value)
            };
            let out = emitter.fresh();
            emitter.line(format!("let {out};if({condition}){{"));
            let yes = residual(emitter, &args[1], env.clone(), deps.clone(), result, plan, depth + 1)?;
            emitter.line(format!("{out}={yes};}}else{{"));
            let no = residual(emitter, &args[2], env, deps, result, plan, depth + 1)?;
            emitter.line(format!("{out}={no};}}")); return Ok(out);
        }
        if let Some((index, f)) = emitter.p.functions.iter().enumerate().find(|(_, f)| &f.name == name) {
            // Keep helper boundaries instead of copying a large call closure
            // into every entry. Each syntactic site lazily creates a distinct
            // residual helper. The mask carries transitive parameter provenance,
            // never an identity/trust claim about its runtime values.
            let possible = args.iter().map(|arg| returned(arg, &deps, emitter.p)).collect::<Vec<_>>();
            let reusable=useful(f,&possible,emitter.p,&emitter.prepared_sums);
            if !recursion::recursive(f) && !reusable.is_empty() && !local_collections::owned(&f.result, emitter.p)
                && !f.params.iter().any(|(_, t)| local_collections::owned(t, emitter.p)) {
                let f = f.clone(); let mut actuals = Vec::new(); let mut fixed = Vec::new();
                for (arg, (_, ty)) in args.iter().zip(&f.params) {
                    // Actual arguments still execute once, left to right, before
                    // any work in the callee (including its first cached check).
                    let value = residual(emitter, arg, env.clone(), deps.clone(), ty, plan, depth + 1)?;
                    actuals.push(emitter.bind(&value));
                    fixed.push(returned(arg, &deps, emitter.p).mask(plan,emitter));
                }
                let helper = emitter.fresh(); let factory = emitter.fresh();
                let test=reusable.iter().map(|origins|format!("({})",eligibility(&Some(origins.clone())))).collect::<Vec<_>>().join("||");
                let active=plan.policy(format!("depth<15&&__preparedFactories.has({index})&&({test})"),emitter);
                plan.declarations.push_str(&format!("let {helper};\n"));
                let out=emitter.fresh();
                // Keep a direct ordinary call when this captured policy cannot
                // reuse work. Even an ordinary function hidden behind a helper
                // variable can lose target-engine inlining in a hot loop.
                emitter.line(format!("let {out};if({active}){{if(!{helper}){{const {factory}=__preparedFactories.get({index});{helper}={factory}([{}],depth+1);}}{out}={helper}({});}}else{{{out}=__fn{index}({});}}",fixed.join(","),actuals.join(","),actuals.join(",")));
                plan.delegated += 1;
                return Ok(out);
            }
        }
    }
    if let Expr::Method(receiver, method, args) = body {
        if matches!(method.as_str(), "map" | "map_indexed" | "filter") && args.len() == 1
            && matches!(result, Type::List(_)) && !local_collections::owned(result, emitter.p)
            && shared_callback(&args[0], &env, emitter.p) {
            if let Type::List(inner) = emitter.infer(receiver, &env, None)? {
                let xs = ordinary(emitter, receiver, &env, &Type::List(inner.clone()))?;
                let xs = emitter.bind(&xs); let out = emitter.fresh(); let index = emitter.fresh();
                emitter.line(format!("const {out}=[];for(let {index}=0;{index}<{xs}.length;{index}++){{"));
                let element = emitter.bind(&super::word_load(&format!("{xs}[{index}]"), &inner));
                let params = if method == "map_indexed" {
                    vec![(format!("({index}>>>0)"), Type::U32), (element.clone(), *inner.clone())]
                } else { vec![(element.clone(), *inner.clone())] };
                let (body, local, found) = callback(&args[0], &env, &deps, &params)?;
                let Type::List(output) = result else { unreachable!() };
                let ty = if method == "filter" { &Type::Bool } else { output.as_ref() };
                let value = residual(emitter, body, local, found, ty, plan, depth + 1)?;
                if method == "filter" { emitter.line(format!("if({value}){out}.push({element});}}")); }
                else { emitter.line(format!("{out}.push({value});}}")); }
                return Ok(out);
            }
        }
        if let Ok(ty) = emitter.infer(receiver, &env, None) {
            if matches!(ty, Type::Option(_) | Type::Result(..))
                && !local_collections::owned(&ty, emitter.p) && !local_collections::owned(result, emitter.p)
                && ((method == "fold" && args.len() == 2)
                    || (matches!(method.as_str(), "map" | "map_err") && args.len() == 1))
                && args.iter().all(|arg| shared_callback(arg,&env,emitter.p)) {
                // The receiver executes exactly once before its selected arm.
                // A stable complete sum makes its immutable payload stable; a
                // changing sum never inherits the stability of lexical captures.
                let payload = Shape::Value(returned(receiver,&deps,emitter.p).origins());
                let value = residual(emitter,receiver,env.clone(),deps.clone(),&ty,plan,depth+1)?;
                let value = emitter.equality.sums.view_type(emitter.p,&ty,&value)?;
                let value = emitter.bind(&value);
                let (a,b,tag_a,tag_b) = match &ty {
                    Type::Option(a) => (a.as_ref().clone(),Type::Unit,"Some","None"),
                    Type::Result(a,b) => (a.as_ref().clone(),b.as_ref().clone(),"Ok","Err"),
                    _ => unreachable!(),
                };
                let tag = if method == "map_err" {tag_b} else {tag_a};
                let out = emitter.fresh();
                emitter.line(format!("let {out};if(Object.hasOwn({value},{})){{",super::quote(tag)));
                let inner = if method == "map_err" {&b} else {&a};
                let item = emitter.bind(&format!("{value}[{}]",super::quote(tag)));
                let (body,local,mut found) = callback(&args[0],&env,&deps,&[(item,inner.clone())])?;
                let Expr::Lambda(name,_) = &args[0] else {return Err("prepared sum callback".into())};
                found.insert(name.clone(),payload.clone());
                let mapped = match (method.as_str(),result) {
                    ("fold",_) => result,
                    ("map",Type::Option(a)) | ("map",Type::Result(a,_)) | ("map_err",Type::Result(_,a)) => a.as_ref(),
                    _ => return Err("prepared sum result".into()),
                };
                let mapped = residual(emitter,body,local,found,mapped,plan,depth+1)?;
                let mapped = if method == "fold" {mapped} else {
                    emitter.equality.sums.make_type(emitter.p,result,tag,&mapped)?
                };
                emitter.line(format!("{out}={mapped};}}else{{"));
                if method == "fold" {
                    let item = emitter.bind(&if tag_b == "None" {"null".into()}
                        else {format!("{value}[{}]",super::quote(tag_b))});
                    let (body,local,mut found) = callback(&args[1],&env,&deps,&[(item,b)])?;
                    let Expr::Lambda(name,_) = &args[1] else {return Err("prepared sum callback".into())};
                    found.insert(name.clone(),if tag_b == "None" {Shape::Value(Some(BTreeSet::new()))} else {payload});
                    let mapped = residual(emitter,body,local,found,result,plan,depth+1)?;
                    emitter.line(format!("{out}={mapped};}}"));
                } else {
                    let other = if method == "map_err" {tag_a} else {tag_b};
                    let passthrough = if other == "None" {value.clone()} else {
                        emitter.equality.sums.make_type(emitter.p,result,other,&format!("{value}[{}]",super::quote(other)))?
                    };
                    emitter.line(format!("{out}={passthrough};}}"));
                }
                return Ok(out);
            }
            if matches!(ty, Type::Option(_) | Type::Result(..)) && !local_collections::owned(&ty, emitter.p)
                && matches!(receiver.as_ref(), Expr::Call(..) | Expr::Let(..)) {
                // Preserve the ordinary sum method and its lazy callback. Only its
                // already-strict receiver enters the bounded residual traversal.
                let value = residual(emitter, receiver, env.clone(), deps.clone(), &ty, plan, depth + 1)?;
                let var = emitter.bind(&value);
                let name = loop { let name = emitter.fresh(); if !env.contains_key(&name) { break name; } };
                env.insert(name.clone(), (var, ty));
                let expression = Expr::Method(Box::new(Expr::Var(name)), method.clone(), args.clone());
                return ordinary(emitter, &expression, &env, result);
            }
        }
    }
    if potential(body, &deps, emitter.p, &emitter.prepared_sums) {
        strict(emitter, body, env, deps, result, plan, depth)
    } else { ordinary(emitter, body, &env, result) }
}

pub(super) fn emit(emitter: &mut Emitter<'_>) -> (String, Vec<Value>) {
    // An optional lane has independent limits; it cannot consume the ordinary
    // emitter's work budget or reject an otherwise supported checked program.
    emitter.budget = 200_000;
    emitter.depth = 0;
    emitter.prepared_sums.clear();
    let mut work = 200_000;
    for f in &emitter.p.functions {
        let Some(nodes) = analysis::node_count(&f.body,work.min(4096)) else {continue};
        work -= nodes;
        // Reuse core lexical/type traversal. This optional classification only
        // informs opportunity search; actual emission checks the type again.
        let _ = analysis::typed_walk(emitter.p,f,|expression,env| {
            if let Expr::Method(receiver,method,_) = expression {
                if matches!(method.as_str(),"fold"|"map"|"map_err") {
                    match ink_core::check::infer(receiver,env,emitter.p) {
                        Ok(Type::Option(_)) => {emitter.prepared_sums.insert(expression as *const Expr as usize,true);}
                        Ok(Type::Result(..)) => {emitter.prepared_sums.insert(expression as *const Expr as usize,false);}
                        _ => {},
                    }
                }
            }
        });
    }
    let mut source = String::from(r#"
function __preparedPart(mask,path){
 for(const field of path){
  if(mask===true)return true;
  if(!mask || typeof mask!=="object")return false;
  mask=Object.hasOwn(mask.fields,field)?mask.fields[field]:false;
 }
 return mask;
}
function __preparedStable(mask,path){const part=__preparedPart(mask,path);return part===true || (!!part && part.all===true);}
"#); let mut entries = Vec::new(); let mut metadata = Vec::new();
    for (index, f) in emitter.p.functions.iter().enumerate() {
        let callbacks = emitter.callbacks.len(); let equality = emitter.equality.clone();
        let budget = emitter.budget;
        emitter.split.clear(); emitter.lines.clear();
        match factory(emitter, f, index) {
            Ok((code, retained, delegated)) if source.len() + code.len() <= 262_144 => {
                source.push_str(&code); entries.push(format!("[{index},__prepareFn{index}]"));
                metadata.push(json!({"function":f.name,"retained_bindings":retained,"delegated_calls":delegated,"factory":true}));
            }
            result => {
                emitter.callbacks.truncate(callbacks); emitter.equality = equality; emitter.budget = budget;
                let reason = match result { Err(e) => e, _ => "prepared module source budget".into() };
                metadata.push(json!({"function":f.name,"factory":false,"reason":reason}));
            }
        }
        emitter.depth = 0;
    }
    source.push_str(&format!("const __preparedFactories=new Map([{}]);\n", entries.join(",")));
    (source, metadata)
}
