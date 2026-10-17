//! Bounded source AD elaboration into ordinary typed functions. Tangents use the
//! objective's F32/F64 arithmetic and chain rule for its real-arithmetic lift.
//! This is not a derivative of IEEE rounding and grants no rewrite authority.
use crate::{
    ad_scalar::Scalar,
    check::{self, Env},
    core::*,
    LangResult,
};
use std::collections::{BTreeMap, BTreeSet};
fn var(n: &str) -> Expr {
    Expr::Var(n.into())
}
fn field(e: Expr, n: &str) -> Expr {
    Expr::Field(Box::new(e), n.into())
}
fn bin(n: &str, a: Expr, b: Expr) -> Expr {
    Expr::Binary(n.into(), Box::new(a), Box::new(b))
}
fn call(n: &str, args: Vec<Expr>) -> Expr {
    Expr::Call(n.into(), args)
}
const INTRINSICS: [&str; 6] = [
    "gradient",
    "gradient_piecewise",
    "jvp",
    "jvp_piecewise",
    "linearize",
    "linearize_piecewise",
];

pub(crate) fn hint(e: &Expr, p: &Program) -> Option<Type> {
    let Expr::Call(n, args) = e else {
        return None;
    };
    if p.functions.iter().any(|f| f.name == *n) || !INTRINSICS.contains(&n.as_str()) {
        return None;
    }
    let Expr::Var(target) = args.first()? else {
        return None;
    };
    let f = p.functions.iter().find(|f| f.name == *target)?;
    if n.starts_with("gradient") {
        f.params.first().map(|(_, t)| t.clone())
    } else if n.starts_with("jvp") {
        Some(f.result.clone())
    } else {
        None
    }
}

pub(crate) fn expand(
    p: &mut Program,
    abstract_records: &BTreeMap<String, String>,
) -> LangResult<()> {
    expand_scalar(p, abstract_records, Scalar::F32)?;
    if p.functions.iter().any(|f| f.result == Type::F64) {
        expand_scalar(p, abstract_records, Scalar::F64)?;
    }
    Ok(())
}
fn expand_scalar(
    p: &mut Program,
    abstract_records: &BTreeMap<String, String>,
    scalar: Scalar,
) -> LangResult<()> {
    let mut used = false;
    let mut occupied = BTreeSet::new();
    for n in p.records.keys().chain(p.enums.keys()).chain(p.ids.iter()) {
        occupied.insert(n.clone());
    }
    for n in p
        .states
        .iter()
        .chain(&p.keeps)
        .map(|d| &d.name)
        .chain(p.events.keys())
    {
        occupied.insert(n.clone());
    }
    for k in &p.keeps {
        crate::analysis::walk(&k.value, |e| {
            if let Expr::Var(n) | Expr::Let(n, _, _, _) | Expr::Lambda(n, _) = e {
                occupied.insert(n.clone());
            }
            if matches!(e,Expr::Call(n,args) if INTRINSICS.contains(&n.as_str())&&scalar.handles(args,p) && !p.functions.iter().any(|f| &f.name==n))
            {
                used = true;
            }
        });
    }
    for f in &p.functions {
        occupied.insert(f.name.clone());
        for (n, _) in &f.params {
            occupied.insert(n.clone());
        }
        crate::analysis::walk(&f.body, |e| {
            match e {
                Expr::Var(n) | Expr::Let(n, _, _, _) | Expr::Lambda(n, _) => {
                    occupied.insert(n.clone());
                }
                _ => (),
            }
            if matches!(e,Expr::Call(n,args) if INTRINSICS.contains(&n.as_str())&&scalar.handles(args,p) && !p.functions.iter().any(|f| &f.name==n))
            {
                used = true;
            }
        });
    }
    fn scan(
        body: &[Statement],
        occupied: &mut BTreeSet<String>,
        used: &mut bool,
        p: &Program,
        scalar: Scalar,
    ) {
        for s in body {
            let e = match s {
                Statement::Let(n, _, e) => {
                    occupied.insert(n.clone());
                    e
                }
                Statement::Return(e) | Statement::Expr(e) | Statement::Emit(_, e) => e,
                Statement::If(e, a, b) => {
                    scan(a, occupied, used, p, scalar);
                    scan(b, occupied, used, p, scalar);
                    e
                }
            };
            crate::analysis::walk(e, |e| {
                match e {
                    Expr::Var(n) | Expr::Let(n, _, _, _) | Expr::Lambda(n, _) => {
                        occupied.insert(n.clone());
                    }
                    _ => (),
                }
                if matches!(e,Expr::Call(n,args) if INTRINSICS.contains(&n.as_str())&&scalar.handles(args,p) && !p.functions.iter().any(|f| &f.name==n))
                {
                    *used = true;
                }
            });
        }
    }
    for a in &p.actions {
        occupied.insert(a.name.clone());
        for (n, _) in &a.params {
            occupied.insert(n.clone());
        }
        scan(&a.body, &mut occupied, &mut used, p, scalar);
    }
    if !used {
        return Ok(());
    }
    let mut b = Builder {
        scalar,
        source: p.clone(),
        out: Program::default(),
        occupied,
        next: 0,
        work: 50_000,
        blocked: abstract_records.keys().cloned().collect(),
        records: BTreeMap::new(),
        functions: BTreeMap::new(),
        active: BTreeSet::new(),
        ops: BTreeMap::new(),
        wrappers: BTreeMap::new(),
        width: 1,
        duals: BTreeMap::new(),
    };
    b.install_dual();
    for f in &mut p.functions {
        let scope = f.params.iter().map(|(n, _)| n.clone()).collect();
        b.rewrite(&mut f.body, &scope, 0)?;
    }
    for a in &mut p.actions {
        let mut scope = a.params.iter().map(|(n, _)| n.clone()).collect();
        b.block(&mut a.body, &mut scope, 0)?;
    }
    // Keeps may use generated wrappers too, with state reads evaluated by the
    // ordinary caller. Initializers and specifications deliberately stay outside
    // this first AD source domain and fail normal typing if they contain AD calls.
    for k in &mut p.keeps {
        b.rewrite(&mut k.value, &BTreeSet::new(), 0)?;
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
    width: usize,
    duals: BTreeMap<usize, String>,
    blocked: BTreeSet<String>,
    records: BTreeMap<(String, usize), String>,
    functions: BTreeMap<(String, bool, usize), String>,
    active: BTreeSet<String>,
    ops: BTreeMap<(String, usize), Function>,
    wrappers: BTreeMap<(String, String), String>,
}
impl Builder {
    fn fresh(&mut self) -> String {
        loop {
            let n = format!("__ink_differential{}_{}", self.scalar.suffix(), self.next);
            self.next += 1;
            if self.occupied.insert(n.clone()) {
                return n;
            }
        }
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if depth > 64 || self.work == 0 {
            return Err("differentiation expansion budget exceeded".into());
        }
        self.work -= 1;
        Ok(())
    }
    fn install_dual(&mut self) {
        if self.duals.contains_key(&self.width) {
            return;
        }
        let name = self.fresh();
        let mut fields = vec![("value".into(), self.scalar.ty())];
        fields.extend((0..self.width).map(|i| (self.tangent_name(i), self.scalar.ty())));
        self.out.records.insert(name.clone(), fields);
        self.duals.insert(self.width, name);
    }
    fn tangent_name(&self, i: usize) -> String {
        if self.width == 1 {
            "tangent".into()
        } else {
            format!("tangent_{i}")
        }
    }
    fn tangent(&self, e: Expr, i: usize) -> Expr {
        field(e, &self.tangent_name(i))
    }
    fn dual(&self) -> Type {
        Type::Named(self.duals[&self.width].clone())
    }
    fn pair(&self, value: Expr, tangents: Vec<Expr>) -> Expr {
        assert_eq!(tangents.len(), self.width);
        let mut fields = vec![("value".into(), value)];
        fields.extend(
            tangents
                .into_iter()
                .enumerate()
                .map(|(i, t)| (self.tangent_name(i), t)),
        );
        Expr::Record(self.duals[&self.width].clone(), fields)
    }
    fn constant(&self, value: Expr) -> Expr {
        self.pair(value, vec![self.scalar.number(0.0); self.width])
    }
    fn dtype(&mut self, t: &Type, depth: usize) -> LangResult<Type> {
        self.step(depth)?;
        Ok(match t {
            Type::Named(n)
                if self.blocked.contains(n)
                    || self.source.contracts.value_invariants.contains_key(n) =>
            {
                return Err(
                    "differentiation requires a plain record view of abstract/refined values"
                        .into(),
                )
            }
            t if *t == self.scalar.ty() => self.dual(),
            Type::Named(n) if self.source.records.contains_key(n) => {
                if let Some(n) = self.records.get(&(n.clone(), self.width)) {
                    Type::Named(n.clone())
                } else {
                    if self.active.contains(n) {
                        return Err("differentiation excludes recursive record shapes".into());
                    }
                    self.active.insert(n.clone());
                    let name = self.fresh();
                    let fs = self.source.records[n]
                        .clone()
                        .into_iter()
                        .map(|(f, t)| Ok((f, self.dtype(&t, depth + 1)?)))
                        .collect::<LangResult<Vec<_>>>()?;
                    self.active.remove(n);
                    self.records.insert((n.clone(), self.width), name.clone());
                    self.out.records.insert(name.clone(), fs);
                    Type::Named(name)
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
                return Err(format!("unsupported differentiated value domain: {t:?}"))
            }
            _ => t.clone(),
        })
    }
    fn leaves(
        &mut self,
        t: &Type,
        path: Vec<String>,
        out: &mut Vec<Vec<String>>,
        depth: usize,
    ) -> LangResult<()> {
        self.step(depth)?;
        match t {
            t if *t == self.scalar.ty() => out.push(path),
            Type::Named(n) if self.source.records.contains_key(n) => {
                if self.active.contains(n) {
                    return Err("trainable gradient shape cannot be recursive".into());
                }
                self.active.insert(n.clone());
                for (f, t) in self.source.records[n].clone() {
                    let mut p = path.clone();
                    p.push(f);
                    self.leaves(&t, p, out, depth + 1)?;
                }
                self.active.remove(n);
            }
            _ => {
                return Err(
                    "gradient parameters must be finite records of the objective scalar precision"
                        .into(),
                )
            }
        }
        if out.len() > 1024 {
            return Err("directional parameter shape exceeds 1024 scalar coordinates".into());
        }
        Ok(())
    }
    fn seed(
        &mut self,
        t: &Type,
        x: Expr,
        seed: Option<Expr>,
        selected: &[Option<&[String]>],
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => self.pair(
                x,
                if let Some(seed) = seed {
                    // Explicit JVP requests always use a single direction.
                    assert_eq!(self.width, 1);
                    vec![seed]
                } else {
                    (0..self.width)
                        .map(|i| {
                            self.scalar.number(
                                if selected
                                    .get(i)
                                    .copied()
                                    .flatten()
                                    .is_some_and(|p| p.is_empty())
                                {
                                    1.0
                                } else {
                                    0.0
                                },
                            )
                        })
                        .collect()
                },
            ),
            Type::Named(n) if self.source.records.contains_key(n) => {
                let Type::Named(target) = self.dtype(t, depth + 1)? else {
                    unreachable!()
                };
                let mut fields = vec![];
                for (f, t) in self.source.records[n].clone() {
                    let sub = selected
                        .iter()
                        .map(|p| {
                            p.and_then(|p| {
                                p.split_first()
                                    .filter(|(first, _)| *first == &f)
                                    .map(|(_, tail)| tail)
                            })
                        })
                        .collect::<Vec<_>>();
                    fields.push((
                        f.clone(),
                        self.seed(
                            &t,
                            field(x.clone(), &f),
                            seed.clone().map(|s| field(s, &f)),
                            &sub,
                            depth + 1,
                        )?,
                    ));
                }
                Expr::Record(target, fields)
            }
            Type::List(t) => {
                if seed.is_some() || selected.iter().any(Option::is_some) {
                    return Err("list parameter directions need a fixed record shape".into());
                }
                let n = self.fresh();
                Expr::Method(
                    Box::new(x),
                    "map".into(),
                    vec![Expr::Lambda(
                        n.clone(),
                        Box::new(self.seed(t, var(&n), None, &[], depth + 1)?),
                    )],
                )
            }
            Type::Option(_) | Type::Result(..) => {
                return Err("optional context seeding is not yet supported".into())
            }
            _ => x,
        })
    }
    fn assemble(
        &mut self,
        t: &Type,
        path: Vec<String>,
        leaves: &BTreeMap<Vec<String>, Expr>,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => leaves
                .get(&path)
                .ok_or("missing gradient component")?
                .clone(),
            Type::Named(n) => {
                let mut fs = vec![];
                for (f, t) in self.source.records.get(n).ok_or("gradient record")?.clone() {
                    let mut p = path.clone();
                    p.push(f.clone());
                    fs.push((f, self.assemble(&t, p, leaves, depth + 1)?));
                }
                Expr::Record(n.clone(), fs)
            }
            _ => return Err("gradient result shape".into()),
        })
    }
    fn wrapper(&mut self, target: &str, kind: &str) -> LangResult<String> {
        if let Some(n) = self.wrappers.get(&(target.into(), kind.into())) {
            return Ok(n.clone());
        }
        let f = self
            .source
            .functions
            .iter()
            .find(|f| f.name == target)
            .ok_or("gradient requires a named pure function")?
            .clone();
        if f.result != self.scalar.ty() || f.params.is_empty() {
            return Err(
                "gradient objective requires a first parameter and f32 or f64 result".into(),
            );
        }
        let piecewise = kind.ends_with("piecewise");
        let n = self.fresh();
        let mut params = f.params.clone();
        let weight = f.params[0].1.clone();
        let mut paths = vec![];
        self.leaves(&weight, vec![], &mut paths, 0)?;
        if kind.starts_with("gradient") && paths.len() > 32 {
            return Err(
                "gradient has more than 32 scalar parameters; use jvp for explicit directions"
                    .into(),
            );
        }
        if paths.is_empty() {
            return Err("gradient has no trainable scalar parameters".into());
        }
        // Batch basis directions through one primal execution. Every lane keeps
        // exactly the scalar JVP arithmetic tree, including nonfinite arithmetic.
        self.width = if kind.starts_with("gradient") {
            paths.len()
        } else {
            1
        };
        self.install_dual();
        let differentiated = self.function(target, piecewise, 0)?;
        let (body, result) = if kind.starts_with("gradient") {
            let basis = paths.iter().map(|p| Some(p.as_slice())).collect::<Vec<_>>();
            let mut args = vec![self.seed(&weight, var(&f.params[0].0), None, &basis, 0)?];
            for (name, t) in f.params.iter().skip(1) {
                args.push(self.seed(t, var(name), None, &[], 0)?);
            }
            let local = self.fresh();
            let components = paths
                .into_iter()
                .enumerate()
                .map(|(i, path)| (path, self.tangent(var(&local), i)))
                .collect();
            let result = self.assemble(&weight, vec![], &components, 0)?;
            (
                Expr::Let(
                    local,
                    Some(Box::new(self.dual())),
                    Box::new(call(&differentiated, args)),
                    Box::new(result),
                ),
                weight,
            )
        } else {
            let seed = self.fresh();
            params.insert(1, (seed.clone(), weight));
            let mut args = vec![];
            for (i, (name, t)) in f.params.iter().enumerate() {
                args.push(self.seed(
                    t,
                    var(name),
                    if i == 0 { Some(var(&seed)) } else { None },
                    &[],
                    0,
                )?);
            }
            let value = call(&differentiated, args);
            if kind.starts_with("linearize") {
                (value, self.dual())
            } else {
                (self.tangent(value, 0), self.scalar.ty())
            }
        };
        self.out.functions.push(Function {
            name: n.clone(),
            params,
            result,
            body,
        });
        self.wrappers
            .insert((target.into(), kind.into()), n.clone());
        Ok(n)
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
                    return Err("differentiation requires a literal named objective".into());
                };
                if scope.contains(target) {
                    return Err("differentiation objective is shadowed by a local value".into());
                }
                let target = target.clone();
                let generated = self.wrapper(&target, n)?;
                let mut actual = args[1..].to_vec();
                for a in &mut actual {
                    self.rewrite(a, scope, depth + 1)?;
                }
                *e = call(&generated, actual);
            }
            Expr::Let(n, _, a, b) => {
                self.rewrite(a, scope, depth + 1)?;
                let mut s = scope.clone();
                s.insert(n.clone());
                self.rewrite(b, &s, depth + 1)?;
            }
            Expr::Lambda(n, b) => {
                let mut s = scope.clone();
                s.insert(n.clone());
                self.rewrite(b, &s, depth + 1)?;
            }
            Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) => self.rewrite(x, scope, depth + 1)?,
            Expr::Binary(_, a, b) => {
                self.rewrite(a, scope, depth + 1)?;
                self.rewrite(b, scope, depth + 1)?;
            }
            Expr::Call(_, xs) => {
                for x in xs {
                    self.rewrite(x, scope, depth + 1)?;
                }
            }
            Expr::Method(x, _, xs) => {
                self.rewrite(x, scope, depth + 1)?;
                for x in xs {
                    self.rewrite(x, scope, depth + 1)?;
                }
            }
            Expr::Record(_, fs) => {
                for (_, x) in fs {
                    self.rewrite(x, scope, depth + 1)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn block(
        &mut self,
        body: &mut [Statement],
        scope: &mut BTreeSet<String>,
        depth: usize,
    ) -> LangResult<()> {
        for s in body {
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
    fn function(&mut self, name: &str, piecewise: bool, depth: usize) -> LangResult<String> {
        self.step(depth)?;
        if self.active.contains(name) {
            return Err(format!(
                "differentiation excludes recursive call graph at {name}"
            ));
        }
        if let Some(n) = self.functions.get(&(name.into(), piecewise, self.width)) {
            return Ok(n.clone());
        }
        let f = self
            .source
            .functions
            .iter()
            .find(|f| f.name == name)
            .ok_or("differentiation helper not found")?
            .clone();
        if self.functions.len() > 256 {
            return Err("differentiation helper limit".into());
        }
        Scalar::check_requirements(&self.source, name, "differentiation")?;
        let env = check::params_env(&f.params)?;
        check::infer_as(&f.body, &env, &self.source, &f.result)?;
        self.active.insert(name.into());
        let target = self.fresh();
        let mut params = vec![];
        for (n, t) in &f.params {
            params.push((n.clone(), self.dtype(t, 0)?));
        }
        let result = self.dtype(&f.result, 0)?;
        let body = self.lift(&f.body, &env, Some(&f.result), piecewise, depth + 1)?;
        self.active.remove(name);
        self.functions
            .insert((name.into(), piecewise, self.width), target.clone());
        self.out.functions.push(Function {
            name: target.clone(),
            params,
            result,
            body,
        });
        Ok(target)
    }
    fn op(&mut self, name: &str) -> LangResult<Function> {
        if let Some(n) = self.ops.get(&(name.into(), self.width)) {
            return Ok(n.clone());
        }
        let n = self.fresh();
        let a = self.fresh();
        let b = self.fresh();
        let primal = self.fresh();
        let av = field(var(&a), "value");
        let bv = field(var(&b), "value");
        let (value, arity) = match name {
            "+" | "-" | "*" => (bin(name, av.clone(), bv.clone()), 2),
            "f32_div" | "f64_div" => (call(name, vec![av.clone(), bv.clone()]), 2),
            "neg" => (Expr::Neg(Box::new(av.clone())), 1),
            "sqrt" => (call("sqrt", vec![av.clone()]), 1),
            _ => unreachable!(),
        };
        let mut tangents = vec![];
        for i in 0..self.width {
            self.step(0)?;
            let ad = self.tangent(var(&a), i);
            let bd = self.tangent(var(&b), i);
            tangents.push(match name {
                "+" | "-" => bin(name, ad, bd),
                "*" => bin("+", bin("*", ad, bv.clone()), bin("*", av.clone(), bd)),
                "f32_div" | "f64_div" => call(
                    name,
                    vec![
                        bin("-", bin("*", ad, bv.clone()), bin("*", av.clone(), bd)),
                        bin("*", bv.clone(), bv.clone()),
                    ],
                ),
                "neg" => Expr::Neg(Box::new(ad)),
                "sqrt" => call(
                    self.scalar.division(),
                    vec![ad, bin("*", self.scalar.number(2.0), var(&primal))],
                ),
                _ => unreachable!(),
            });
        }
        let mut params = vec![(a, self.dual())];
        if arity == 2 {
            params.push((b, self.dual()));
        }
        let function = Function {
            name: n.clone(),
            params,
            result: self.dual(),
            body: Expr::Let(
                primal.clone(),
                Some(Box::new(self.scalar.ty())),
                Box::new(value),
                Box::new(self.pair(var(&primal), tangents)),
            ),
        };
        if self.width == 1 {
            self.out.functions.push(function.clone());
        }
        self.ops.insert((name.into(), self.width), function.clone());
        Ok(function)
    }
    fn operation(&mut self, name: &str, args: Vec<Expr>) -> LangResult<Expr> {
        let f = self.op(name)?;
        if self.width == 1 {
            return Ok(call(&f.name, args));
        }
        // Wide dual arithmetic stays lexical so ordinary host compilers can
        // keep fields in scalar locals. Bind operands once, left to right.
        let mut body = f.body;
        for ((name, ty), arg) in f.params.into_iter().zip(args).rev() {
            body = Expr::Let(name, Some(Box::new(ty)), Box::new(arg), Box::new(body));
        }
        let mut nodes = 0;
        crate::analysis::walk(&body, |_| nodes += 1);
        if nodes > self.work {
            return Err("differentiation expansion budget exceeded".into());
        }
        self.work -= nodes;
        Ok(body)
    }
    fn lambda(
        &mut self,
        e: &Expr,
        inputs: &[Type],
        result: &Type,
        env: &Env,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        if inputs.is_empty() {
            return self.lift(e, env, Some(result), piecewise, depth + 1);
        }
        let Expr::Lambda(n, body) = e else {
            return Err("differentiation requires literal nonescaping callbacks".into());
        };
        let mut env = env.clone();
        env.insert(n.clone(), inputs[0].clone());
        Ok(Expr::Lambda(
            n.clone(),
            Box::new(self.lambda(body, &inputs[1..], result, &env, piecewise, depth + 1)?),
        ))
    }
    fn primal(&mut self, e: Expr, t: &Type, depth: usize) -> LangResult<Expr> {
        self.step(depth)?;
        Ok(match t {
            t if *t == self.scalar.ty() => field(e, "value"),
            Type::Named(n) if self.source.records.contains_key(n) => {
                let fs = self.source.records[n].clone();
                let mut out = vec![];
                for (f, t) in fs {
                    out.push((f.clone(), self.primal(field(e.clone(), &f), &t, depth + 1)?));
                }
                Expr::Record(n.clone(), out)
            }
            Type::List(t) => {
                let n = self.fresh();
                Expr::Method(
                    Box::new(e),
                    "map".into(),
                    vec![Expr::Lambda(
                        n.clone(),
                        Box::new(self.primal(var(&n), t, depth + 1)?),
                    )],
                )
            }
            Type::Option(_) | Type::Result(..) => {
                return Err("differentiation comparison of optional values unsupported".into())
            }
            _ => e,
        })
    }
    fn lift(
        &mut self,
        e: &Expr,
        env: &Env,
        want: Option<&Type>,
        piecewise: bool,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        let ty = check::infer_context(e, env, &self.source, want)?;
        Ok(match e {
            Expr::Float(_) | Expr::Double(_) if ty == self.scalar.ty() => self.constant(e.clone()),
            Expr::Num(_) if ty == self.scalar.ty() => self.constant(e.clone()),
            Expr::Var(_)
            | Expr::Num(_)
            | Expr::Float(_)
            | Expr::Double(_)
            | Expr::Bool(_)
            | Expr::String(_)
            | Expr::Unit => e.clone(),
            Expr::Field(x, n) if matches!(x.as_ref(),Expr::Var(n) if self.source.enums.contains_key(n)&&!env.contains_key(n)) => {
                e.clone()
            }
            Expr::Field(x, n) => field(self.lift(x, env, None, piecewise, depth + 1)?, n),
            Expr::Neg(x) => {
                let x = self.lift(x, env, Some(&ty), piecewise, depth + 1)?;
                if ty == self.scalar.ty() {
                    self.operation("neg", vec![x])?
                } else {
                    Expr::Neg(Box::new(x))
                }
            }
            Expr::Let(n, t, x, body) => {
                let xt = check::infer_context(x, env, &self.source, t.as_deref())?;
                let x = self.lift(x, env, Some(&xt), piecewise, depth + 1)?;
                let mut local = env.clone();
                local.insert(n.clone(), xt.clone());
                let body = self.lift(body, &local, Some(&ty), piecewise, depth + 1)?;
                Expr::Let(
                    n.clone(),
                    Some(Box::new(self.dtype(&xt, 0)?)),
                    Box::new(x),
                    Box::new(body),
                )
            }
            Expr::Record(n, fs) => {
                let Type::Named(target) = self.dtype(&ty, 0)? else {
                    return Err("differential record type".into());
                };
                let mut out = vec![];
                for (f, x) in fs {
                    let ft = self.source.records[n]
                        .iter()
                        .find(|(name, _)| name == f)
                        .ok_or("differential field")?
                        .1
                        .clone();
                    out.push((
                        f.clone(),
                        self.lift(x, env, Some(&ft), piecewise, depth + 1)?,
                    ));
                }
                Expr::Record(target, out)
            }
            Expr::Binary(op, a, b) => {
                let arithmetic = ["+", "-", "*"].contains(&op.as_str());
                let input = if arithmetic {
                    ty.clone()
                } else {
                    check::hint(a, env, &self.source)
                        .or_else(|| check::hint(b, env, &self.source))
                        .unwrap_or(check::infer(a, env, &self.source)?)
                };
                let aa = self.lift(a, env, Some(&input), piecewise, depth + 1)?;
                let bb = self.lift(b, env, Some(&input), piecewise, depth + 1)?;
                if arithmetic && ty == self.scalar.ty() {
                    self.operation(op, vec![aa, bb])?
                } else if ["==", "!=", "<", "<=", ">", ">="].contains(&op.as_str()) {
                    if !piecewise && self.dtype(&input, 0)? != input {
                        return Err("numeric decisions require gradient_piecewise or jvp_piecewise; no implicit hard-decision gradient".into());
                    }
                    bin(op, self.primal(aa, &input, 0)?, self.primal(bb, &input, 0)?)
                } else {
                    bin(op, aa, bb)
                }
            }
            Expr::Call(n, args) if self.source.functions.iter().any(|f| f.name == *n) => {
                let params = self
                    .source
                    .functions
                    .iter()
                    .find(|f| f.name == *n)
                    .unwrap()
                    .params
                    .clone();
                let target = self.function(n, piecewise, depth + 1)?;
                let mut xs = vec![];
                for (x, (_, t)) in args.iter().zip(params) {
                    xs.push(self.lift(x, env, Some(&t), piecewise, depth + 1)?);
                }
                call(&target, xs)
            }
            Expr::Call(n, args) if n == "choose" => {
                let c = self.lift(&args[0], env, Some(&Type::Bool), piecewise, depth + 1)?;
                let a = self.lift(&args[1], env, Some(&ty), piecewise, depth + 1)?;
                let b = self.lift(&args[2], env, Some(&ty), piecewise, depth + 1)?;
                call(n, vec![c, a, b])
            }
            Expr::Call(n, args) if n == "repeat" => {
                let init = self.lift(&args[1], env, Some(&ty), piecewise, depth + 1)?;
                let callback = self.lambda(
                    &args[2],
                    &[Type::U32, ty.clone()],
                    &ty,
                    env,
                    piecewise,
                    depth + 1,
                )?;
                call(n, vec![args[0].clone(), init, callback])
            }
            Expr::Call(n, args) if n == "foldl" || n == "foldr" => {
                let Type::List(item) = check::infer(&args[0], env, &self.source)? else {
                    return Err("differentiated fold list".into());
                };
                let xs = self.lift(&args[0], env, None, piecewise, depth + 1)?;
                let init = self.lift(&args[1], env, Some(&ty), piecewise, depth + 1)?;
                let cb = self.lambda(
                    &args[2],
                    &[*item, ty.clone()],
                    &ty,
                    env,
                    piecewise,
                    depth + 1,
                )?;
                call(n, vec![xs, init, cb])
            }
            Expr::Call(n, args) if n == "list" => {
                let Type::List(t) = &ty else {
                    return Err("differentiated list".into());
                };
                let mut xs = vec![];
                for x in args {
                    xs.push(self.lift(x, env, Some(t), piecewise, depth + 1)?);
                }
                call(n, xs)
            }
            Expr::Call(n, args) if n == "length" || n == "count" => {
                let x = self.lift(&args[0], env, None, piecewise, depth + 1)?;
                call(n, vec![x])
            }
            Expr::Call(n, args) if n == "sum" && ty == self.scalar.ty() => {
                let xs = self.lift(
                    &args[0],
                    env,
                    Some(&Type::List(Box::new(self.scalar.ty()))),
                    piecewise,
                    depth + 1,
                )?;
                let a = self.fresh();
                let acc = self.fresh();
                let sum = self.operation("+", vec![var(&acc), var(&a)])?;
                call(
                    "foldl",
                    vec![
                        xs,
                        self.constant(self.scalar.number(0.0)),
                        Expr::Lambda(
                            a.clone(),
                            Box::new(Expr::Lambda(acc.clone(), Box::new(sum))),
                        ),
                    ],
                )
            }
            Expr::Call(n, args) if n == "sum" => call(
                n,
                vec![self.lift(
                    &args[0],
                    env,
                    Some(&Type::List(Box::new(ty.clone()))),
                    piecewise,
                    depth + 1,
                )?],
            ),
            Expr::Call(n, args) if n == "sqrt" || n == "f32_div" || n == "f64_div" => {
                let mut xs = vec![];
                for x in args {
                    xs.push(self.lift(x, env, Some(&ty), piecewise, depth + 1)?);
                }
                if ty == self.scalar.ty() {
                    self.operation(n, xs)?
                } else {
                    call(n, xs)
                }
            }
            Expr::Call(n, args) if crate::primitives::primitive(n) => {
                let (inputs, _) = crate::primitives::signature(
                    n,
                    args.first()
                        .map(|x| check::infer(x, env, &self.source))
                        .transpose()?
                        .as_ref(),
                )?;
                let hard = inputs.contains(&self.scalar.ty()) || n == self.scalar.from_bits();
                if hard && !piecewise {
                    return Err(format!(
                        "primitive {n} needs explicit piecewise differentiation policy"
                    ));
                }
                let mut xs = vec![];
                for (x, t) in args.iter().zip(inputs) {
                    let dx = self.lift(x, env, Some(&t), piecewise, depth + 1)?;
                    xs.push(self.primal(dx, &t, 0)?);
                }
                let primal = call(n, xs);
                if ty == self.scalar.ty() {
                    self.constant(primal)
                } else {
                    primal
                }
            }
            Expr::Method(x, n, args) => {
                let input = check::infer(x, env, &self.source)?;
                let Type::List(item) = &input else {
                    return Err(format!("unsupported differentiated receiver: {n}"));
                };
                let receiver = self.lift(x, env, Some(&input), piecewise, depth + 1)?;
                let xs = match n.as_str() {
                    "map" => {
                        let Type::List(out) = &ty else {
                            return Err("differentiated map".into());
                        };
                        vec![self.lambda(
                            &args[0],
                            &[*item.clone()],
                            out,
                            env,
                            piecewise,
                            depth + 1,
                        )?]
                    }
                    "filter" => vec![self.lambda(
                        &args[0],
                        &[*item.clone()],
                        &Type::Bool,
                        env,
                        piecewise,
                        depth + 1,
                    )?],
                    "at_or" => vec![
                        self.lift(&args[0], env, Some(&Type::U32), piecewise, depth + 1)?,
                        self.lift(&args[1], env, Some(item), piecewise, depth + 1)?,
                    ],
                    "concat" => {
                        vec![self.lift(&args[0], env, Some(&input), piecewise, depth + 1)?]
                    }
                    "len" => vec![],
                    _ => return Err(format!("unsupported differentiated list operation: {n}")),
                };
                Expr::Method(Box::new(receiver), n.clone(), xs)
            }
            _ => return Err(format!("unsupported differentiated expression: {e:?}")),
        })
    }
}
