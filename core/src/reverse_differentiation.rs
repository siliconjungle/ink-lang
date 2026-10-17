//! Source reverse AD with a fresh, owned, bounded tape. This is a derivative of
//! a real lift, evaluated in fixed F32/F64 order, not a rewrite of forward-mode AD.
use crate::{
    ad_scalar::Scalar,
    check::{self, Env},
    core::*,
    LangResult,
};
use std::collections::{BTreeMap, BTreeSet};
const INTRINSICS: [&str; 4] = [
    "reverse_gradient",
    "reverse_gradient_piecewise",
    "reverse_linearize",
    "reverse_linearize_piecewise",
];
fn v(n: &str) -> Expr {
    Expr::Var(n.into())
}
fn f(e: Expr, n: &str) -> Expr {
    Expr::Field(Box::new(e), n.into())
}
fn call(n: &str, args: Vec<Expr>) -> Expr {
    Expr::Call(n.into(), args)
}
fn method(e: Expr, n: &str, args: Vec<Expr>) -> Expr {
    Expr::Method(Box::new(e), n.into(), args)
}
fn bin(n: &str, a: Expr, b: Expr) -> Expr {
    Expr::Binary(n.into(), Box::new(a), Box::new(b))
}
fn let_(n: String, t: Type, x: Expr, body: Expr) -> Expr {
    Expr::Let(n, Some(Box::new(t)), Box::new(x), Box::new(body))
}
fn lambda(ns: &[String], mut e: Expr) -> Expr {
    for n in ns.iter().rev() {
        e = Expr::Lambda(n.clone(), Box::new(e));
    }
    e
}

pub(crate) fn hint(e: &Expr, p: &Program) -> Option<Type> {
    let Expr::Call(n, args) = e else { return None };
    if !n.starts_with("reverse_gradient")
        || !INTRINSICS.contains(&n.as_str())
        || p.functions.iter().any(|f| f.name == *n)
    {
        return None;
    }
    let Expr::Var(target) = args.first()? else {
        return None;
    };
    let t = p
        .functions
        .iter()
        .find(|f| f.name == *target)?
        .params
        .first()?
        .1
        .clone();
    Some(Type::Result(Box::new(t), Box::new(Type::String)))
}

pub(crate) fn expand(p: &mut Program, abstracts: &BTreeMap<String, String>) -> LangResult<()> {
    expand_scalar(p, abstracts, Scalar::F32)?;
    if p.functions.iter().any(|f| f.result == Type::F64) {
        expand_scalar(p, abstracts, Scalar::F64)?;
    }
    Ok(())
}
fn expand_scalar(
    p: &mut Program,
    abstracts: &BTreeMap<String, String>,
    scalar: Scalar,
) -> LangResult<()> {
    let mut used = false;
    let mut scan = |e: &Expr| {
        crate::analysis::walk(e, |e| {
            if matches!(e,Expr::Call(n,args)if INTRINSICS.contains(&n.as_str())&&scalar.handles(args,p)&&!p.functions.iter().any(|f|f.name==*n))
            {
                used = true;
            }
        });
    };
    for k in p.states.iter().chain(&p.keeps) {
        scan(&k.value);
    }
    for fun in &p.functions {
        scan(&fun.body);
    }
    fn expressions(body: &[Statement], out: &mut Vec<Expr>) {
        for s in body {
            match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Expr(e)
                | Statement::Emit(_, e) => out.push(e.clone()),
                Statement::If(e, a, b) => {
                    out.push(e.clone());
                    expressions(a, out);
                    expressions(b, out);
                }
            }
        }
    }
    for a in &p.actions {
        let mut es = vec![];
        expressions(&a.body, &mut es);
        for e in &es {
            scan(e);
        }
    }
    if !used {
        return Ok(());
    }
    let occupied = crate::analysis::program_names(p);
    let mut b = Builder {
        scalar,
        source: p.clone(),
        out: Program::default(),
        occupied,
        next: 0,
        work: 150_000,
        prefix: String::new(),
        blocked: abstracts.keys().cloned().collect(),
        types: BTreeMap::new(),
        flows: BTreeMap::new(),
        functions: BTreeMap::new(),
        wrappers: BTreeMap::new(),
        active: BTreeSet::new(),
    };
    loop {
        let prefix = format!("{}_", b.fresh());
        if !b.occupied.iter().any(|n| n.starts_with(&prefix)) {
            b.prefix = prefix;
            break;
        }
    }
    b.out = scalar.reverse_runtime(&b.prefix)?;
    for n in b
        .out
        .records
        .keys()
        .chain(b.out.functions.iter().map(|f| &f.name))
    {
        b.occupied.insert(n.clone());
    }
    for fun in &mut p.functions {
        b.rewrite(
            &mut fun.body,
            &fun.params.iter().map(|(n, _)| n.clone()).collect(),
            0,
        )?;
    }
    for k in p.states.iter_mut().chain(&mut p.keeps) {
        b.rewrite(&mut k.value, &BTreeSet::new(), 0)?;
    }
    for a in &mut p.actions {
        b.block(
            &mut a.body,
            &mut a.params.iter().map(|(n, _)| n.clone()).collect(),
            0,
        )?;
    }
    p.records.extend(b.out.records);
    p.functions.extend(b.out.functions);
    Ok(())
}
struct Builder {
    scalar: Scalar,
    source: Program,
    out: Program,
    occupied: BTreeSet<String>,
    next: usize,
    work: usize,
    prefix: String,
    blocked: BTreeSet<String>,
    types: BTreeMap<String, String>,
    flows: BTreeMap<String, String>,
    functions: BTreeMap<(String, bool), String>,
    wrappers: BTreeMap<(String, String), String>,
    active: BTreeSet<String>,
}
impl Builder {
    fn fresh(&mut self) -> String {
        loop {
            let n = format!("__ink_reverse{}_{}", self.scalar.suffix(), self.next);
            self.next += 1;
            if self.occupied.insert(n.clone()) {
                return n;
            }
        }
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if self.work == 0 || depth > 64 {
            return Err("reverse differentiation expansion budget exceeded".into());
        }
        self.work -= 1;
        Ok(())
    }
    fn name(&self, n: &str) -> String {
        format!("{}{n}", self.prefix)
    }
    fn wire(&self) -> Type {
        Type::Named(self.name("Wire"))
    }
    fn tape(&self) -> Type {
        Type::Named(self.name("Tape"))
    }
    fn dtype(&mut self, t: &Type, depth: usize) -> LangResult<Type> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => self.wire(),
            Type::Named(n) if self.source.records.contains_key(n) => {
                if self.blocked.contains(n)
                    || self.source.contracts.value_invariants.contains_key(n)
                {
                    return Err(
                        "reverse differentiation requires plain views of abstract/refined values"
                            .into(),
                    );
                }
                if self.active.contains(n) {
                    return Err("reverse differentiation excludes recursive record shapes".into());
                }
                if let Some(n) = self.types.get(n) {
                    Type::Named(n.clone())
                } else {
                    self.active.insert(n.clone());
                    let target = self.fresh();
                    let mut fields = vec![];
                    for (name, t) in self.source.records[n].clone() {
                        fields.push((name, self.dtype(&t, depth + 1)?));
                    }
                    self.active.remove(n);
                    self.types.insert(n.clone(), target.clone());
                    self.out.records.insert(target.clone(), fields);
                    Type::Named(target)
                }
            }
            Type::List(t) => Type::List(Box::new(self.dtype(t, depth + 1)?)),
            Type::Option(t) => Type::Option(Box::new(self.dtype(t, depth + 1)?)),
            Type::Result(a, b) => Type::Result(
                Box::new(self.dtype(a, depth + 1)?),
                Box::new(self.dtype(b, depth + 1)?),
            ),
            Type::Buffer(_)
            | Type::Map(..)
            | Type::Table(..)
            | Type::Vector(..)
            | Type::Unknown => {
                return Err(format!(
                    "unsupported reverse differentiation value domain: {t:?}"
                ))
            }
            _ => t.clone(),
        })
    }
    fn flow_type(&mut self, t: &Type) -> Type {
        if *t == self.wire() {
            return Type::Named(self.name("Flow"));
        }
        let key = format!("{t:?}");
        if let Some(n) = self.flows.get(&key) {
            return Type::Named(n.clone());
        }
        let n = self.fresh();
        self.out.records.insert(
            n.clone(),
            vec![("value".into(), t.clone()), ("tape".into(), self.tape())],
        );
        self.flows.insert(key, n.clone());
        Type::Named(n)
    }
    fn flow(&mut self, t: &Type, value: Expr, tape: Expr) -> Expr {
        let Type::Named(n) = self.flow_type(t) else {
            unreachable!()
        };
        Expr::Record(n, vec![("value".into(), value), ("tape".into(), tape)])
    }
    fn constant(&self, e: Expr) -> Expr {
        call(&self.name("constant"), vec![e])
    }
    fn bind_flow(&mut self, t: &Type, e: Expr) -> (String, Type, Expr) {
        let n = self.fresh();
        let flow = self.flow_type(t);
        (n, flow, e)
    }
    fn function(&mut self, name: &str, piecewise: bool, depth: usize) -> LangResult<String> {
        self.step(depth)?;
        if self.active.contains(name) {
            return Err(format!(
                "reverse differentiation excludes recursive call graph at {name}"
            ));
        }
        if let Some(n) = self.functions.get(&(name.into(), piecewise)) {
            return Ok(n.clone());
        }
        if self.functions.len() > 256 {
            return Err("reverse differentiation helper limit".into());
        }
        let fun = self
            .source
            .functions
            .iter()
            .find(|f| f.name == name)
            .ok_or("reverse differentiation helper not found")?
            .clone();
        Scalar::check_requirements(&self.source, name, "reverse differentiation")?;
        let env = check::params_env(&fun.params)?;
        check::infer_as(&fun.body, &env, &self.source, &fun.result)?;
        self.active.insert(name.into());
        let target = self.fresh();
        let trace = self.fresh();
        let mut params = vec![];
        for (n, t) in &fun.params {
            params.push((n.clone(), self.dtype(t, depth + 1)?));
        }
        params.push((trace.clone(), self.tape()));
        let result = self.dtype(&fun.result, depth + 1)?;
        let result = self.flow_type(&result);
        let body = self.lift(
            &fun.body,
            &env,
            Some(&fun.result),
            v(&trace),
            piecewise,
            depth + 1,
        )?;
        self.active.remove(name);
        self.functions
            .insert((name.into(), piecewise), target.clone());
        self.out.functions.push(Function {
            name: target.clone(),
            params,
            result,
            body,
        });
        Ok(target)
    }
    // Evaluate strict operands once, left to right, carrying the sole tape owner.
    fn operands(
        &mut self,
        xs: &[(&Expr, Type)],
        env: &Env,
        tape: Expr,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<(Vec<(String, Type, Expr)>, Vec<Expr>, Expr)> {
        let mut bindings = vec![];
        let mut values = vec![];
        let mut trace = tape;
        for (x, t) in xs {
            let e = self.lift(x, env, Some(t), trace, piecewise, depth + 1)?;
            let dt = self.dtype(t, depth + 1)?;
            let binding = self.bind_flow(&dt, e);
            values.push(f(v(&binding.0), "value"));
            trace = f(v(&binding.0), "tape");
            bindings.push(binding);
        }
        Ok((bindings, values, trace))
    }
    fn lets(bindings: Vec<(String, Type, Expr)>, mut e: Expr) -> Expr {
        for (n, t, x) in bindings.into_iter().rev() {
            e = let_(n, t, x, e);
        }
        e
    }
    fn primal(&mut self, t: &Type, e: Expr, depth: usize) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => f(e, "value"),
            Type::Named(n) if self.source.records.contains_key(n) => {
                let mut fields = vec![];
                for (name, t) in self.source.records[n].clone() {
                    fields.push((
                        name.clone(),
                        self.primal(&t, f(e.clone(), &name), depth + 1)?,
                    ));
                }
                Expr::Record(n.clone(), fields)
            }
            Type::List(t) => {
                let n = self.fresh();
                method(
                    e,
                    "map",
                    vec![lambda(&[n.clone()], self.primal(t, v(&n), depth + 1)?)],
                )
            }
            Type::Option(t) => {
                let n = self.fresh();
                method(
                    e,
                    "map",
                    vec![lambda(&[n.clone()], self.primal(t, v(&n), depth + 1)?)],
                )
            }
            Type::Result(a, b) => {
                let n = self.fresh();
                let k = self.fresh();
                let ok = self.primal(a, v(&n), depth + 1)?;
                let err = self.primal(b, v(&k), depth + 1)?;
                method(
                    method(e, "map", vec![lambda(&[n], ok)]),
                    "map_err",
                    vec![lambda(&[k], err)],
                )
            }
            _ => e,
        })
    }
    fn zero(&mut self, t: &Type, depth: usize) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => self.constant(self.scalar.number(0.0)),
            Type::F32 => Expr::Float(0),
            Type::F64 => Expr::Double(0),
            Type::Bool => Expr::Bool(false),
            Type::Unit => Expr::Unit,
            Type::String => Expr::String(String::new()),
            Type::U32 | Type::U64 | Type::I32 | Type::Int => Expr::Num(0),
            Type::List(_) => call("list", vec![]),
            Type::Named(n) if self.source.records.contains_key(n) => {
                let Type::Named(target) = self.dtype(t, depth + 1)? else {
                    unreachable!()
                };
                let mut fields = vec![];
                for (name, t) in self.source.records[n].clone() {
                    fields.push((name, self.zero(&t, depth + 1)?));
                }
                Expr::Record(target, fields)
            }
            Type::Option(_) => v("None"),
            Type::Result(_, b) => call("Err", vec![self.zero(b, depth + 1)?]),
            Type::Named(n) if self.source.enums.contains_key(n) => f(
                v(n),
                self.source.enums[n]
                    .first()
                    .ok_or("reverse fallback cannot inhabit an empty enum")?,
            ),
            _ => return Err(format!("unsupported reverse fallback shape {t:?}")),
        })
    }
    fn collect<F>(
        &mut self,
        item: &Type,
        out: &Type,
        xs: Expr,
        tape: Expr,
        filter: bool,
        callback: F,
    ) -> LangResult<Expr>
    where
        F: FnOnce(&mut Self, Expr, Expr, Expr) -> LangResult<Expr>,
    {
        let state = self.fresh();
        let element = self.fresh();
        let result = self.fresh();
        let final_ = self.fresh();
        let record = self.fresh();
        self.out.records.insert(
            record.clone(),
            vec![
                ("values".into(), Type::Buffer(Box::new(out.clone()))),
                ("tape".into(), self.tape()),
                ("index".into(), Type::U32),
            ],
        );
        let initial = Expr::Record(
            record.clone(),
            vec![
                ("values".into(), method(v("Buffer"), "empty", vec![])),
                ("tape".into(), tape),
                ("index".into(), Expr::Num(0)),
            ],
        );
        let next = callback(
            self,
            v(&element),
            f(v(&state), "index"),
            f(v(&state), "tape"),
        )?;
        let value = if filter {
            v(&element)
        } else {
            f(v(&result), "value")
        };
        let pushed = method(f(v(&state), "values"), "push", vec![value]);
        let pushed = if filter {
            call(
                "choose",
                vec![f(v(&result), "value"), pushed, f(v(&state), "values")],
            )
        } else {
            pushed
        };
        let output = Expr::Record(
            record.clone(),
            vec![
                ("values".into(), pushed),
                ("tape".into(), f(v(&result), "tape")),
                (
                    "index".into(),
                    bin("+", f(v(&state), "index"), Expr::Num(1)),
                ),
            ],
        );
        let flow = if filter {
            self.flow_type(&Type::Bool)
        } else {
            self.flow_type(out)
        };
        let body = let_(result, flow, next, output);
        let folded = call("foldl", vec![xs, initial, lambda(&[element, state], body)]);
        let value = method(f(v(&final_), "values"), "freeze", vec![]);
        let flow = self.flow(
            &Type::List(Box::new(out.clone())),
            value,
            f(v(&final_), "tape"),
        );
        let _ = item;
        Ok(let_(final_, Type::Named(record), folded, flow))
    }
    fn seed(
        &mut self,
        t: &Type,
        e: Expr,
        tape: Expr,
        tracked: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        let dt = self.dtype(t, depth + 1)?;
        if !tracked {
            let value = self.context(t, e, depth + 1)?;
            return Ok(self.flow(&dt, value, tape));
        }
        Ok(match t {
            t if *t == self.scalar.ty() => call(&self.name("seed"), vec![e, tape]),
            Type::Named(n) if self.source.records.contains_key(n) => {
                let Type::Named(target) = dt.clone() else {
                    unreachable!()
                };
                let mut fields = vec![];
                let mut bs = vec![];
                let mut trace = tape;
                for (name, t) in self.source.records[n].clone() {
                    let seeded = self.seed(&t, f(e.clone(), &name), trace, true, depth + 1)?;
                    let st = self.dtype(&t, depth + 1)?;
                    let b = self.bind_flow(&st, seeded);
                    fields.push((name, f(v(&b.0), "value")));
                    trace = f(v(&b.0), "tape");
                    bs.push(b);
                }
                let flow = self.flow(&dt, Expr::Record(target, fields), trace);
                Self::lets(bs, flow)
            }
            Type::List(item) => {
                let d = self.dtype(item, depth + 1)?;
                self.collect(&d, &d, e, tape, false, |this, value, _, trace| {
                    this.seed(item, value, trace, true, depth + 1)
                })?
            }
            _ => {
                return Err(
                    "reverse gradient parameters must contain only the objective scalar precision, lists and plain records"
                        .into(),
                )
            }
        })
    }
    fn context(&mut self, t: &Type, e: Expr, depth: usize) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => self.constant(e),
            Type::Named(n) if self.source.records.contains_key(n) => {
                let Type::Named(target) = self.dtype(t, depth + 1)? else {
                    unreachable!()
                };
                let mut fs = vec![];
                for (name, t) in self.source.records[n].clone() {
                    fs.push((
                        name.clone(),
                        self.context(&t, f(e.clone(), &name), depth + 1)?,
                    ));
                }
                Expr::Record(target, fs)
            }
            Type::List(t) => {
                let n = self.fresh();
                method(
                    e,
                    "map",
                    vec![lambda(&[n.clone()], self.context(t, v(&n), depth + 1)?)],
                )
            }
            Type::Option(t) => {
                let n = self.fresh();
                method(
                    e,
                    "map",
                    vec![lambda(&[n.clone()], self.context(t, v(&n), depth + 1)?)],
                )
            }
            Type::Result(a, b) => {
                let n = self.fresh();
                let k = self.fresh();
                let ok = self.context(a, v(&n), depth + 1)?;
                let err = self.context(b, v(&k), depth + 1)?;
                method(
                    method(e, "map", vec![lambda(&[n], ok)]),
                    "map_err",
                    vec![lambda(&[k], err)],
                )
            }
            _ => e,
        })
    }
    fn gather(&mut self, t: &Type, e: Expr, gradient: Expr, depth: usize) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => {
                method(gradient, "at_or", vec![f(e, "id"), self.scalar.number(0.0)])
            }
            Type::Named(n) if self.source.records.contains_key(n) => {
                let mut fs = vec![];
                for (name, t) in self.source.records[n].clone() {
                    fs.push((
                        name.clone(),
                        self.gather(&t, f(e.clone(), &name), gradient.clone(), depth + 1)?,
                    ));
                }
                Expr::Record(n.clone(), fs)
            }
            Type::List(t) => {
                let n = self.fresh();
                method(
                    e,
                    "map",
                    vec![lambda(
                        &[n.clone()],
                        self.gather(t, v(&n), gradient, depth + 1)?,
                    )],
                )
            }
            _ => return Err("reverse gradient parameter shape".into()),
        })
    }
    fn callback(
        &mut self,
        e: &Expr,
        inputs: &[(Type, Expr)],
        out: &Type,
        env: &Env,
        tape: Expr,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        let mut body = e;
        let mut local = env.clone();
        let mut bindings = vec![];
        for (t, value) in inputs {
            let Expr::Lambda(n, next) = body else {
                return Err(
                    "reverse differentiation requires literal nonescaping callbacks".into(),
                );
            };
            local.insert(n.clone(), t.clone());
            bindings.push((n.clone(), self.dtype(t, depth + 1)?, value.clone()));
            body = next;
        }
        let lifted = self.lift(body, &local, Some(out), tape, piecewise, depth + 1)?;
        Ok(Self::lets(bindings, lifted))
    }
    fn variant(
        &mut self,
        input: &Type,
        n: &str,
        args: &[Expr],
        receiver: Expr,
        trace: Expr,
        ty: &Type,
        dt: &Type,
        env: &Env,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        let (left, right, ok, err) = match input {
            Type::Option(t) => (*t.clone(), Type::Unit, "Some", "None"),
            Type::Result(a, b) => (*a.clone(), *b.clone(), "Ok", "Err"),
            _ => return Err("reverse variant receiver".into()),
        };
        let a = self.fresh();
        let b = self.fresh();
        let mut arms = vec![];
        for (branch, (t, name, constructor)) in [
            (left.clone(), a.clone(), ok),
            (right.clone(), b.clone(), err),
        ]
        .into_iter()
        .enumerate()
        {
            let body = if n == "fold" {
                self.callback(
                    &args[branch],
                    &[(t, v(&name))],
                    ty,
                    env,
                    trace.clone(),
                    piecewise,
                    depth + 1,
                )?
            } else if (n == "map" && branch == 0) || (n == "map_err" && branch == 1) {
                let out = match (ty, n) {
                    (Type::Option(t), _)
                    | (Type::Result(t, _), "map")
                    | (Type::Result(_, t), "map_err") => *t.clone(),
                    _ => return Err("reverse variant map result".into()),
                };
                let callback = self.callback(
                    &args[0],
                    &[(t, v(&name))],
                    &out,
                    env,
                    trace.clone(),
                    piecewise,
                    depth + 1,
                )?;
                let output = self.dtype(&out, depth + 1)?;
                let binding = self.bind_flow(&output, callback);
                let value = call(constructor, vec![f(v(&binding.0), "value")]);
                let flow = self.flow(dt, value, f(v(&binding.0), "tape"));
                Self::lets(vec![binding], flow)
            } else {
                let value = if constructor == "None" {
                    v("None")
                } else {
                    call(constructor, vec![v(&name)])
                };
                self.flow(dt, value, trace.clone())
            };
            arms.push(lambda(&[name], body));
        }
        Ok(method(receiver, "fold", arms))
    }
    fn until(
        &mut self,
        n: &str,
        args: &[Expr],
        ty: &Type,
        dt: &Type,
        env: &Env,
        tape: Expr,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        let list = n == "fold_until";
        let first = if list {
            check::infer(&args[0], env, &self.source)?
        } else {
            Type::U32
        };
        let item = if list {
            let Type::List(t) = &first else {
                return Err("reverse fold_until list".into());
            };
            *t.clone()
        } else {
            Type::U32
        };
        let (bs, values, trace) = self.operands(
            &[(&args[0], first), (&args[1], ty.clone())],
            env,
            tape,
            piecewise,
            depth + 1,
        )?;
        let record = self.fresh();
        let state = self.fresh();
        let element = self.fresh();
        let stopped = self.fresh();
        let stepped = self.fresh();
        let final_ = self.fresh();
        self.out.records.insert(
            record.clone(),
            vec![
                ("value".into(), dt.clone()),
                ("tape".into(), self.tape()),
                ("stopped".into(), Type::Bool),
            ],
        );
        let initial = Expr::Record(
            record.clone(),
            vec![
                ("value".into(), values[1].clone()),
                ("tape".into(), trace),
                ("stopped".into(), Expr::Bool(false)),
            ],
        );
        let accumulator = (ty.clone(), f(v(&state), "value"));
        let stop_inputs = if list {
            vec![(item.clone(), v(&element)), accumulator.clone()]
        } else {
            vec![accumulator.clone()]
        };
        let stop = self.callback(
            &args[2],
            &stop_inputs,
            &Type::Bool,
            env,
            f(v(&state), "tape"),
            piecewise,
            depth + 1,
        )?;
        let step = self.callback(
            &args[3],
            &[(item, v(&element)), accumulator],
            ty,
            env,
            f(v(&stopped), "tape"),
            piecewise,
            depth + 1,
        )?;
        let output = Expr::Record(
            record.clone(),
            vec![
                ("value".into(), f(v(&stepped), "value")),
                ("tape".into(), f(v(&stepped), "tape")),
                (
                    "stopped".into(),
                    if list {
                        f(v(&stopped), "value")
                    } else {
                        Expr::Bool(false)
                    },
                ),
            ],
        );
        let flow = self.flow_type(dt);
        let step = let_(stepped, flow, step, output);
        let next = if list {
            step
        } else {
            let halted = Expr::Record(
                record.clone(),
                vec![
                    ("value".into(), f(v(&state), "value")),
                    ("tape".into(), f(v(&stopped), "tape")),
                    ("stopped".into(), Expr::Bool(true)),
                ],
            );
            call("choose", vec![f(v(&stopped), "value"), halted, step])
        };
        let flow_bool = self.flow_type(&Type::Bool);
        let next = let_(stopped, flow_bool, stop, next);
        // fold_until executes its step even on the item whose old-state stop is true.
        // Carry that decision to the next observation; its extra step returns the
        // owner unchanged, without evaluating either authored callback again.
        let next = if list {
            call("choose", vec![f(v(&state), "stopped"), v(&state), next])
        } else {
            next
        };
        let observation = self.fresh();
        let ignored = self.fresh();
        let stop = if list {
            lambda(
                &[ignored, observation.clone()],
                f(v(&observation), "stopped"),
            )
        } else {
            lambda(&[observation.clone()], f(v(&observation), "stopped"))
        };
        let folded = call(
            n,
            vec![
                values[0].clone(),
                initial,
                stop,
                lambda(&[element, state], next),
            ],
        );
        let result = self.flow(dt, f(v(&final_), "value"), f(v(&final_), "tape"));
        Ok(Self::lets(
            bs,
            let_(final_, Type::Named(record), folded, result),
        ))
    }
    fn wrapper(&mut self, target: &str, kind: &str) -> LangResult<String> {
        if let Some(n) = self.wrappers.get(&(target.into(), kind.into())) {
            return Ok(n.clone());
        }
        let fun = self
            .source
            .functions
            .iter()
            .find(|f| f.name == target)
            .ok_or("reverse differentiation needs a named pure objective")?
            .clone();
        if fun.result != self.scalar.ty() || fun.params.is_empty() {
            return Err("reverse objective needs a first parameter and f32 or f64 result".into());
        }
        let piecewise = kind.ends_with("piecewise");
        let objective = self.function(target, piecewise, 0)?;
        let weight = &fun.params[0].1;
        let dt = self.dtype(weight, 0)?;
        let maximum = self.fresh();
        let stop = self.fresh();
        let seed = self.fresh();
        let observed = self.fresh();
        let gradients = self.fresh();
        let wrapper = self.fresh();
        let mut params = vec![
            fun.params[0].clone(),
            (maximum.clone(), Type::U32),
            (stop.clone(), Type::Bool),
        ];
        params.extend(fun.params.iter().skip(1).cloned());
        let tape = Expr::Record(
            self.name("Tape"),
            vec![
                ("nodes".into(), method(v("Buffer"), "empty", vec![])),
                ("maximum".into(), v(&maximum)),
                ("failed".into(), Expr::Bool(false)),
            ],
        );
        let seeded = self.seed(weight, v(&fun.params[0].0), tape, true, 0)?;
        let mut args = vec![f(v(&seed), "value")];
        for (n, t) in fun.params.iter().skip(1) {
            args.push(self.context(t, v(n), 0)?);
        }
        args.push(f(v(&seed), "tape"));
        let forward = call(&objective, args);
        let back = call(
            &self.name("backward"),
            vec![
                method(f(f(v(&observed), "tape"), "nodes"), "freeze", vec![]),
                f(v(&observed), "value"),
                v(&stop),
            ],
        );
        let gradient = self.gather(weight, f(v(&seed), "value"), v(&gradients), 0)?;
        let (result, value) = if kind.starts_with("reverse_linearize") {
            let result = self.fresh();
            self.out.records.insert(
                result.clone(),
                vec![
                    ("value".into(), self.scalar.ty()),
                    ("gradient".into(), weight.clone()),
                ],
            );
            (
                Type::Named(result.clone()),
                Expr::Record(
                    result,
                    vec![
                        ("value".into(), f(f(v(&observed), "value"), "value")),
                        ("gradient".into(), gradient),
                    ],
                ),
            )
        } else {
            (weight.clone(), gradient)
        };
        let ok = call("Ok", vec![value]);
        let ok = let_(gradients, Type::List(Box::new(self.scalar.ty())), back, ok);
        let failure = call(
            "Err",
            vec![Expr::String(
                "reverse differentiation tape capacity exceeded".into(),
            )],
        );
        let body = call(
            "choose",
            vec![f(f(v(&observed), "tape"), "failed"), failure, ok],
        );
        let flow_wire = self.flow_type(&self.wire());
        let body = let_(observed, flow_wire, forward, body);
        let flow_weight = self.flow_type(&dt);
        let body = let_(seed, flow_weight, seeded, body);
        let body = call(
            "choose",
            vec![
                bin(">", v(&maximum), Expr::Num(1_000_000)),
                call(
                    "Err",
                    vec![Expr::String(
                        "reverse differentiation capacity exceeds one million nodes".into(),
                    )],
                ),
                body,
            ],
        );
        self.out.functions.push(Function {
            name: wrapper.clone(),
            params,
            result: Type::Result(Box::new(result), Box::new(Type::String)),
            body,
        });
        self.wrappers
            .insert((target.into(), kind.into()), wrapper.clone());
        Ok(wrapper)
    }
    fn rewrite(&mut self, e: &mut Expr, scope: &BTreeSet<String>, depth: usize) -> LangResult<()> {
        self.step(depth)?;
        match e {
            Expr::Call(n, args)
                if INTRINSICS.contains(&n.as_str())
                    && self.scalar.handles(args, &self.source)
                    && !scope.contains(n)
                    && !self.source.functions.iter().any(|f| f.name == *n) =>
            {
                let Some(Expr::Var(target)) = args.first() else {
                    return Err("reverse differentiation requires a literal named objective".into());
                };
                if scope.contains(target) {
                    return Err("reverse objective is shadowed by a local value".into());
                }
                let name = self.wrapper(target, n)?;
                let mut actual = args[1..].to_vec();
                for a in &mut actual {
                    self.rewrite(a, scope, depth + 1)?;
                }
                *e = call(&name, actual);
            }
            Expr::Let(n, _, a, b) => {
                self.rewrite(a, scope, depth + 1)?;
                let mut local = scope.clone();
                local.insert(n.clone());
                self.rewrite(b, &local, depth + 1)?;
            }
            Expr::Lambda(n, body) => {
                let mut local = scope.clone();
                local.insert(n.clone());
                self.rewrite(body, &local, depth + 1)?;
            }
            Expr::Binary(_, a, b) => {
                self.rewrite(a, scope, depth + 1)?;
                self.rewrite(b, scope, depth + 1)?;
            }
            Expr::Neg(a) | Expr::Field(a, _) | Expr::Try(a) => self.rewrite(a, scope, depth + 1)?,
            Expr::Call(_, args) => {
                for a in args {
                    self.rewrite(a, scope, depth + 1)?;
                }
            }
            Expr::Method(a, _, args) => {
                self.rewrite(a, scope, depth + 1)?;
                for a in args {
                    self.rewrite(a, scope, depth + 1)?;
                }
            }
            Expr::Record(_, fs) => {
                for (_, a) in fs {
                    self.rewrite(a, scope, depth + 1)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn block(
        &mut self,
        ss: &mut [Statement],
        scope: &mut BTreeSet<String>,
        depth: usize,
    ) -> LangResult<()> {
        for s in ss {
            match s {
                Statement::Let(n, _, e) => {
                    self.rewrite(e, scope, depth)?;
                    scope.insert(n.clone());
                }
                Statement::Return(e) | Statement::Expr(e) | Statement::Emit(_, e) => {
                    self.rewrite(e, scope, depth)?
                }
                Statement::If(e, a, b) => {
                    self.rewrite(e, scope, depth)?;
                    self.block(a, &mut scope.clone(), depth + 1)?;
                    self.block(b, &mut scope.clone(), depth + 1)?;
                }
            }
        }
        Ok(())
    }
    fn lift(
        &mut self,
        e: &Expr,
        env: &Env,
        want: Option<&Type>,
        tape: Expr,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        let ty = check::infer_context(e, env, &self.source, want)?;
        let dt = self.dtype(&ty, depth + 1)?;
        Ok(match e {
            Expr::Float(_) | Expr::Double(_) if ty == self.scalar.ty() => {
                let value = self.constant(e.clone());
                self.flow(&dt, value, tape)
            }
            Expr::Num(_) if ty == self.scalar.ty() => {
                let value = self.constant(e.clone());
                self.flow(&dt, value, tape)
            }
            Expr::Var(_)
            | Expr::Num(_)
            | Expr::Float(_)
            | Expr::Double(_)
            | Expr::Bool(_)
            | Expr::String(_)
            | Expr::Unit => self.flow(&dt, e.clone(), tape),
            Expr::Field(x, _) if matches!(x.as_ref(),Expr::Var(n)if self.source.enums.contains_key(n)&&!env.contains_key(n)) => {
                self.flow(&dt, e.clone(), tape)
            }
            Expr::Field(x, name) => {
                let xt = check::infer(x, env, &self.source)?;
                let (bs, values, trace) =
                    self.operands(&[(x, xt)], env, tape, piecewise, depth + 1)?;
                let value = f(values[0].clone(), name);
                let out = self.flow(&dt, value, trace);
                Self::lets(bs, out)
            }
            Expr::Let(n, annotation, x, body) => {
                let xt = check::infer_context(x, env, &self.source, annotation.as_deref())?;
                let mut local = env.clone();
                local.insert(n.clone(), xt.clone());
                let dx = self.dtype(&xt, depth + 1)?;
                let lifted = self.lift(x, env, Some(&xt), tape, piecewise, depth + 1)?;
                let b = self.bind_flow(&dx, lifted);
                let out = self.lift(
                    body,
                    &local,
                    Some(&ty),
                    f(v(&b.0), "tape"),
                    piecewise,
                    depth + 1,
                )?;
                let out = let_(n.clone(), dx, f(v(&b.0), "value"), out);
                Self::lets(vec![b], out)
            }
            Expr::Record(name, fields) => {
                let operands = fields
                    .iter()
                    .map(|(n, x)| {
                        Ok((
                            x,
                            self.source.records[name]
                                .iter()
                                .find(|(field, _)| field == n)
                                .ok_or("reverse record field")?
                                .1
                                .clone(),
                        ))
                    })
                    .collect::<LangResult<Vec<_>>>()?;
                let (bs, values, trace) =
                    self.operands(&operands, env, tape, piecewise, depth + 1)?;
                let Type::Named(target) = dt.clone() else {
                    return Err("reverse record type".into());
                };
                let fs = fields
                    .iter()
                    .zip(values)
                    .map(|((n, _), x)| (n.clone(), x))
                    .collect();
                let out = self.flow(&dt, Expr::Record(target, fs), trace);
                Self::lets(bs, out)
            }
            Expr::Neg(x) => {
                let (bs, values, trace) =
                    self.operands(&[(x, ty.clone())], env, tape, piecewise, depth + 1)?;
                let out = if ty == self.scalar.ty() {
                    call(
                        &self.name("unary"),
                        vec![Expr::Num(5), trace, values[0].clone()],
                    )
                } else {
                    self.flow(&dt, Expr::Neg(Box::new(values[0].clone())), trace)
                };
                Self::lets(bs, out)
            }
            Expr::Binary(op, a, b) if op == "&&" || op == "||" => {
                let (bs, values, trace) =
                    self.operands(&[(a, Type::Bool)], env, tape, piecewise, depth + 1)?;
                let rhs = self.lift(
                    b,
                    env,
                    Some(&Type::Bool),
                    trace.clone(),
                    piecewise,
                    depth + 1,
                )?;
                let literal = self.flow(&Type::Bool, Expr::Bool(op == "||"), trace);
                let branches = if op == "&&" {
                    vec![values[0].clone(), rhs, literal]
                } else {
                    vec![values[0].clone(), literal, rhs]
                };
                Self::lets(bs, call("choose", branches))
            }
            Expr::Binary(op, a, b) => {
                let arithmetic = ["+", "-", "*"].contains(&op.as_str());
                let input = if arithmetic {
                    ty.clone()
                } else {
                    check::hint(a, env, &self.source)
                        .or_else(|| check::hint(b, env, &self.source))
                        .map(Ok)
                        .unwrap_or_else(|| check::infer(a, env, &self.source))?
                };
                let (bs, values, trace) = self.operands(
                    &[(a, input.clone()), (b, input.clone())],
                    env,
                    tape,
                    piecewise,
                    depth + 1,
                )?;
                let out = if arithmetic && ty == self.scalar.ty() {
                    let tag = match op.as_str() {
                        "+" => 1,
                        "-" => 2,
                        _ => 3,
                    };
                    call(
                        &self.name("binary"),
                        vec![Expr::Num(tag), trace, values[0].clone(), values[1].clone()],
                    )
                } else {
                    let decision = ["==", "!=", "<", "<=", ">", ">="].contains(&op.as_str());
                    let mut xs = values;
                    if decision {
                        if !piecewise && self.dtype(&input, depth + 1)? != input {
                            return Err("numeric decisions require reverse_gradient_piecewise or reverse_linearize_piecewise".into());
                        }
                        xs = xs
                            .into_iter()
                            .map(|x| self.primal(&input, x, depth + 1))
                            .collect::<LangResult<_>>()?;
                    }
                    let value = bin(op, xs[0].clone(), xs[1].clone());
                    self.flow(&dt, value, trace)
                };
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if self.source.functions.iter().any(|f| f.name == *n) => {
                let fun = self
                    .source
                    .functions
                    .iter()
                    .find(|f| f.name == *n)
                    .unwrap()
                    .clone();
                let target = self.function(n, piecewise, depth + 1)?;
                let inputs = args
                    .iter()
                    .zip(&fun.params)
                    .map(|(x, (_, t))| (x, t.clone()))
                    .collect::<Vec<_>>();
                let (bs, mut values, trace) =
                    self.operands(&inputs, env, tape, piecewise, depth + 1)?;
                values.push(trace);
                Self::lets(bs, call(&target, values))
            }
            Expr::Call(n, args) if n == "choose" => {
                let (bs, values, trace) =
                    self.operands(&[(&args[0], Type::Bool)], env, tape, piecewise, depth + 1)?;
                let yes = self.lift(
                    &args[1],
                    env,
                    Some(&ty),
                    trace.clone(),
                    piecewise,
                    depth + 1,
                )?;
                let no = self.lift(&args[2], env, Some(&ty), trace, piecewise, depth + 1)?;
                Self::lets(bs, call("choose", vec![values[0].clone(), yes, no]))
            }
            Expr::Call(n, args) if ["Some", "Ok", "Err"].contains(&n.as_str()) => {
                let inner = match (&ty, n.as_str()) {
                    (Type::Option(t), "Some")
                    | (Type::Result(t, _), "Ok")
                    | (Type::Result(_, t), "Err") => *t.clone(),
                    _ => return Err("reverse constructor result".into()),
                };
                let (bs, values, trace) =
                    self.operands(&[(&args[0], inner)], env, tape, piecewise, depth + 1)?;
                let out = self.flow(&dt, call(n, values), trace);
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if n == "list" => {
                let Type::List(item) = &ty else {
                    return Err("reverse list type".into());
                };
                let inputs = args.iter().map(|x| (x, *item.clone())).collect::<Vec<_>>();
                let (bs, values, trace) =
                    self.operands(&inputs, env, tape, piecewise, depth + 1)?;
                let out = self.flow(&dt, call("list", values), trace);
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if n == "repeat_until" || n == "fold_until" => {
                self.until(n, args, &ty, &dt, env, tape, piecewise, depth + 1)?
            }
            Expr::Call(n, args) if n == "repeat" || n == "foldl" || n == "foldr" => {
                let first = check::infer(&args[0], env, &self.source)?;
                // repeat bounds are checked source literals, not dynamically lifted fields.
                let (bs, values, trace) = if n == "repeat" {
                    let (bs, mut values, trace) =
                        self.operands(&[(&args[1], ty.clone())], env, tape, piecewise, depth + 1)?;
                    values.insert(0, args[0].clone());
                    (bs, values, trace)
                } else {
                    self.operands(
                        &[(&args[0], first.clone()), (&args[1], ty.clone())],
                        env,
                        tape,
                        piecewise,
                        depth + 1,
                    )?
                };
                let state = self.fresh();
                let element = self.fresh();
                let item = if n == "repeat" {
                    Type::U32
                } else {
                    let Type::List(item) = first else {
                        return Err("reverse fold list".into());
                    };
                    *item
                };
                let callback = self.callback(
                    &args[2],
                    &[(item, v(&element)), (ty.clone(), f(v(&state), "value"))],
                    &ty,
                    env,
                    f(v(&state), "tape"),
                    piecewise,
                    depth + 1,
                )?;
                let initial = self.flow(&dt, values[1].clone(), trace);
                Self::lets(
                    bs,
                    call(
                        n,
                        vec![
                            values[0].clone(),
                            initial,
                            lambda(&[element, state], callback),
                        ],
                    ),
                )
            }
            Expr::Call(n, args) if n == "sum" && ty == self.scalar.ty() => {
                let input = Type::List(Box::new(self.scalar.ty()));
                let (bs, values, trace) =
                    self.operands(&[(&args[0], input)], env, tape, piecewise, depth + 1)?;
                let state = self.fresh();
                let element = self.fresh();
                let body = call(
                    &self.name("binary"),
                    vec![
                        Expr::Num(1),
                        f(v(&state), "tape"),
                        f(v(&state), "value"),
                        v(&element),
                    ],
                );
                let initial = self.flow(&dt, self.constant(self.scalar.number(0.0)), trace);
                Self::lets(
                    bs,
                    call(
                        "foldl",
                        vec![values[0].clone(), initial, lambda(&[element, state], body)],
                    ),
                )
            }
            Expr::Call(n, args) if n == "sum" => {
                let input = Type::List(Box::new(ty.clone()));
                let (bs, values, trace) =
                    self.operands(&[(&args[0], input)], env, tape, piecewise, depth + 1)?;
                let out = self.flow(&dt, call(n, values), trace);
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if n == "sqrt" || n == "f32_div" || n == "f64_div" => {
                let inputs = args.iter().map(|x| (x, ty.clone())).collect::<Vec<_>>();
                let (bs, values, trace) =
                    self.operands(&inputs, env, tape, piecewise, depth + 1)?;
                let out = if ty != self.scalar.ty() {
                    self.flow(&dt, call(n, values), trace)
                } else if n == "sqrt" {
                    call(
                        &self.name("unary"),
                        vec![Expr::Num(6), trace, values[0].clone()],
                    )
                } else {
                    call(
                        &self.name("binary"),
                        vec![Expr::Num(4), trace, values[0].clone(), values[1].clone()],
                    )
                };
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if n == "length" || n == "count" => {
                let t = check::infer(&args[0], env, &self.source)?;
                let (bs, values, trace) =
                    self.operands(&[(&args[0], t)], env, tape, piecewise, depth + 1)?;
                let out = self.flow(&dt, call(n, values), trace);
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if crate::word::primitive(n) => {
                let inputs = crate::word::arguments(n, &ty);
                let inputs = args
                    .iter()
                    .zip(inputs)
                    .map(|(a, t)| (a, t))
                    .collect::<Vec<_>>();
                let (bs, values, trace) =
                    self.operands(&inputs, env, tape, piecewise, depth + 1)?;
                let out = self.flow(&dt, call(n, values), trace);
                Self::lets(bs, out)
            }
            Expr::Call(n, args) if crate::primitives::primitive(n) => {
                let first = args
                    .first()
                    .map(|x| check::infer(x, env, &self.source))
                    .transpose()?;
                let (inputs, _) = crate::primitives::signature(n, first.as_ref())?;
                let hard = inputs.contains(&self.scalar.ty()) || n == self.scalar.from_bits();
                if hard && !piecewise {
                    return Err(format!(
                        "primitive {n} needs an explicit reverse piecewise policy"
                    ));
                }
                let actuals = args
                    .iter()
                    .zip(&inputs)
                    .map(|(x, t)| (x, t.clone()))
                    .collect::<Vec<_>>();
                let (bs, values, trace) =
                    self.operands(&actuals, env, tape, piecewise, depth + 1)?;
                let xs = values
                    .into_iter()
                    .zip(inputs)
                    .map(|(x, t)| self.primal(&t, x, depth + 1))
                    .collect::<LangResult<Vec<_>>>()?;
                let value = call(n, xs);
                let value = if ty == self.scalar.ty() {
                    self.constant(value)
                } else {
                    value
                };
                let out = self.flow(&dt, value, trace);
                Self::lets(bs, out)
            }
            Expr::Method(x, n, args) => {
                let input = check::infer(x, env, &self.source)?;
                if matches!(input, Type::Option(_) | Type::Result(..)) {
                    let (bs, values, trace) =
                        self.operands(&[(x, input.clone())], env, tape, piecewise, depth + 1)?;
                    if n == "ok_or" {
                        let error = check::infer(&args[0], env, &self.source)?;
                        let (next, errors, trace) =
                            self.operands(&[(&args[0], error)], env, trace, piecewise, depth + 1)?;
                        let out = self.flow(&dt, method(values[0].clone(), n, errors), trace);
                        return Ok(Self::lets(bs, Self::lets(next, out)));
                    }
                    let out = self.variant(
                        &input,
                        n,
                        args,
                        values[0].clone(),
                        trace,
                        &ty,
                        &dt,
                        env,
                        piecewise,
                        depth + 1,
                    )?;
                    return Ok(Self::lets(bs, out));
                }
                let Type::List(item) = &input else {
                    return Err(format!("unsupported reverse differentiated receiver {n}"));
                };
                let (bs, values, trace) =
                    self.operands(&[(x, input.clone())], env, tape, piecewise, depth + 1)?;
                let receiver = values[0].clone();
                let out = match n.as_str() {
                    "map" | "map_indexed" | "filter" => {
                        let result = if n == "filter" {
                            Type::Bool
                        } else {
                            let Type::List(out) = &ty else {
                                return Err("reverse map result".into());
                            };
                            *out.clone()
                        };
                        let out = if n == "filter" {
                            self.dtype(item, depth + 1)?
                        } else {
                            self.dtype(&result, depth + 1)?
                        };
                        let di = self.dtype(item, depth + 1)?;
                        self.collect(
                            &di,
                            &out,
                            receiver,
                            trace,
                            n == "filter",
                            |this, value, index, trace| {
                                let inputs = if n == "map_indexed" {
                                    vec![(Type::U32, index), (*item.clone(), value)]
                                } else {
                                    vec![(*item.clone(), value)]
                                };
                                this.callback(
                                    &args[0],
                                    &inputs,
                                    &result,
                                    env,
                                    trace,
                                    piecewise,
                                    depth + 1,
                                )
                            },
                        )?
                    }
                    "zip" => {
                        let other = check::infer(&args[0], env, &self.source)?;
                        let Type::List(right) = &other else {
                            return Err("reverse zip right list".into());
                        };
                        let Type::List(output) = &ty else {
                            return Err("reverse zip output list".into());
                        };
                        let (next, values, trace) = self.operands(
                            &[(&args[0], other.clone())],
                            env,
                            trace,
                            piecewise,
                            depth + 1,
                        )?;
                        let left_value = self.fresh();
                        let right_value = self.fresh();
                        let pair = self.fresh();
                        let left_type = self.dtype(item, depth + 1)?;
                        let right_type = self.dtype(right, depth + 1)?;
                        self.out.records.insert(
                            pair.clone(),
                            vec![("left".into(), left_type), ("right".into(), right_type)],
                        );
                        let zipped = method(
                            receiver,
                            "zip",
                            vec![
                                values[0].clone(),
                                lambda(
                                    &[left_value.clone(), right_value.clone()],
                                    Expr::Record(
                                        pair.clone(),
                                        vec![
                                            ("left".into(), v(&left_value)),
                                            ("right".into(), v(&right_value)),
                                        ],
                                    ),
                                ),
                            ],
                        );
                        let out = self.dtype(output, depth + 1)?;
                        let collected = self.collect(
                            &Type::Named(pair),
                            &out,
                            zipped,
                            trace,
                            false,
                            |this, value, _, trace| {
                                this.callback(
                                    &args[1],
                                    &[
                                        (*item.clone(), f(value.clone(), "left")),
                                        (*right.clone(), f(value, "right")),
                                    ],
                                    output,
                                    env,
                                    trace,
                                    piecewise,
                                    depth + 1,
                                )
                            },
                        )?;
                        Self::lets(next, collected)
                    }
                    "len" => self.flow(&dt, method(receiver, n, vec![]), trace),
                    "concat" => {
                        let (next, mut values, trace) =
                            self.operands(&[(&args[0], input)], env, trace, piecewise, depth + 1)?;
                        let result = method(receiver, n, vec![values.remove(0)]);
                        let out = self.flow(&dt, result, trace);
                        Self::lets(next, out)
                    }
                    "at_or" => {
                        let (next, values, trace) = self.operands(
                            &[(&args[0], Type::U32)],
                            env,
                            trace,
                            piecewise,
                            depth + 1,
                        )?;
                        let index = values[0].clone();
                        let fallback = self.zero(item, depth + 1)?;
                        let result =
                            method(receiver.clone(), "at_or", vec![index.clone(), fallback]);
                        let yes = self.flow(&dt, result, trace.clone());
                        let no =
                            self.lift(&args[1], env, Some(item), trace, piecewise, depth + 1)?;
                        Self::lets(
                            next,
                            call(
                                "choose",
                                vec![bin("<", index, call("length", vec![receiver])), yes, no],
                            ),
                        )
                    }
                    _ => {
                        return Err(format!(
                            "unsupported reverse differentiated list operation {n}"
                        ))
                    }
                };
                Self::lets(bs, out)
            }
            _ => {
                return Err(format!(
                    "unsupported reverse differentiated expression: {e:?}"
                ))
            }
        })
    }
}
