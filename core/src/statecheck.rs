//! Type/effect checking for stateful declarations. Facts are conservative key-presence proofs.
use crate::{check::Env, syntax::*, LangResult};
use std::{
    cell::RefCell,
    collections::{BTreeMap, BTreeSet},
};

type Facts = BTreeMap<(String, String), bool>;
fn key(e: &Expr) -> String {
    serde_json::to_string(e).expect("serialisable AST")
}
fn stable_key(e: &Expr, env: &Env) -> bool {
    match e {
        Expr::Var(n) => env.contains_key(n),
        Expr::Num(_) | Expr::String(_) => true,
        Expr::Field(e, _) => stable_key(e, env),
        Expr::Neg(e) => stable_key(e, env),
        Expr::Binary(_, a, b) => stable_key(a, env) && stable_key(b, env),
        _ => false,
    }
}
pub fn compatible(a: &Type, b: &Type) -> bool {
    match (a, b) {
        (Type::Unknown, _) | (_, Type::Unknown) => true,
        (Type::List(a), Type::List(b)) | (Type::Option(a), Type::Option(b)) => compatible(a, b),
        (Type::Result(a, b), Type::Result(c, d)) | (Type::Table(a, b), Type::Table(c, d)) => {
            compatible(a, c) && compatible(b, d)
        }
        _ => a == b,
    }
}
fn concrete(t: &Type) -> bool {
    match t {
        Type::Unknown => false,
        Type::List(t) | Type::Option(t) => concrete(t),
        Type::Result(a, b) | Type::Table(a, b) => concrete(a) && concrete(b),
        _ => true,
    }
}
pub(crate) fn validate_type(t: &Type, p: &Program) -> LangResult<()> {
    match t {
        Type::Named(n)
            if !p.ids.contains(n) && !p.records.contains_key(n) && !p.enums.contains_key(n) =>
        {
            Err(format!("unknown type {n}"))
        }
        Type::Vector(t, n) => {
            if !(2..=4).contains(n) || !matches!(**t, Type::U32 | Type::I32 | Type::F32) {
                return Err("vector requires 2..4 numeric 32-bit components".into());
            }
            Ok(())
        }
        Type::List(t) | Type::Option(t) => validate_type(t, p),
        Type::Table(..) => Err("Table is a state-root resource, not a value type".into()),
        Type::Result(a, b) => {
            validate_type(a, p)?;
            validate_type(b, p)
        }
        Type::Unknown => Err("unresolved type".into()),
        _ => Ok(()),
    }
}

#[derive(Default)]
pub(crate) struct Typing {
    pub values: BTreeMap<usize, Type>,
    pub lambdas: BTreeMap<usize, (Type, Type)>,
}
fn address(e: &Expr) -> usize {
    e as *const Expr as usize
}

struct Context<'a> {
    p: &'a Program,
    action: &'a Action,
    in_lambda: bool,
    typing: Option<&'a RefCell<Typing>>,
}
impl Context<'_> {
    fn numeric_hint(&self, e: &Expr, env: &Env, facts: &Facts) -> Option<Type> {
        match e {
            Expr::Num(_) => None,
            Expr::Binary(op, a, b) if ["+", "-", "*"].contains(&op.as_str()) => self
                .numeric_hint(a, env, facts)
                .or_else(|| self.numeric_hint(b, env, facts)),
            Expr::Binary(..) => None,
            _ => self
                .infer(e, env, &mut facts.clone())
                .ok()
                .filter(|t| crate::check::is_number(t) || *t == Type::Int),
        }
    }
    fn expected(&self, e: &Expr, want: &Type, env: &Env, facts: &mut Facts) -> LangResult<Type> {
        let ty = self.expected_inner(e, want, env, facts)?;
        if let Some(typing) = self.typing {
            typing.borrow_mut().values.insert(address(e), ty.clone());
        }
        Ok(ty)
    }
    fn expected_inner(
        &self,
        e: &Expr,
        want: &Type,
        env: &Env,
        facts: &mut Facts,
    ) -> LangResult<Type> {
        if let Expr::Binary(op, a, b) = e {
            if ["+", "-", "*"].contains(&op.as_str())
                && (crate::check::is_number(want) || *want == Type::Int)
            {
                self.expected(a, want, env, facts)?;
                self.expected(b, want, env, facts)?;
                return Ok(want.clone());
            }
        }
        if let Expr::Neg(value) = e {
            if crate::check::is_number(want) || *want == Type::Int {
                if let (Type::I32, Expr::Num(2147483648)) = (want, value.as_ref()) {
                    if let Some(typing) = self.typing {
                        typing.borrow_mut().values.insert(address(value), Type::I32);
                    }
                } else {
                    self.expected(value, want, env, facts)?;
                }
                return Ok(want.clone());
            }
        }
        if let Expr::Call(n, args) = e {
            if ["vec2", "vec3", "vec4"].contains(&n.as_str()) {
                if let Type::Vector(t, k) = want {
                    if n.as_bytes()[3] - b'0' != *k || args.len() != *k as usize {
                        return Err("vector arity mismatch".into());
                    }
                    for e in args {
                        self.expected(e, t, env, facts)?;
                    }
                    return Ok(want.clone());
                }
            }
            if args.len() == 1 {
                match (n.as_str(), want) {
                    ("Ok", Type::Result(t, _))
                    | ("Err", Type::Result(_, t))
                    | ("Some", Type::Option(t)) => {
                        self.expected(&args[0], t, env, facts)?;
                        return Ok(want.clone());
                    }
                    _ => {}
                }
            }
        }
        if let Expr::Num(n) = e {
            if matches!(want, Type::I32 | Type::F32) {
                return crate::check::infer_as(e, env, self.p, want);
            }
            if *want == Type::U32 {
                if *n > u32::MAX as u64 {
                    return Err("u32 literal out of range".into());
                }
                return Ok(Type::U32);
            }
            if *want == Type::Int {
                return Ok(Type::Int);
            }
        }
        let got = self.infer(e, env, facts)?;
        if !compatible(&got, want) {
            return Err(format!("expected {want:?}, found {got:?}"));
        }
        Ok(want.clone())
    }
    fn root(&self, e: &Expr) -> Option<String> {
        if let Expr::Var(n) = e {
            if self.p.states.iter().any(|d| &d.name == n) {
                return Some(n.clone());
            }
        }
        None
    }
    fn infer(&self, e: &Expr, env: &Env, facts: &mut Facts) -> LangResult<Type> {
        let ty = self.infer_inner(e, env, facts)?;
        if let Some(typing) = self.typing {
            typing.borrow_mut().values.insert(address(e), ty.clone());
        }
        Ok(ty)
    }
    fn infer_inner(&self, e: &Expr, env: &Env, facts: &mut Facts) -> LangResult<Type> {
        use Type as T;
        match e {
            Expr::Float(_) => Ok(T::F32),
            Expr::Neg(value) => {
                let t = if matches!(value.as_ref(), Expr::Num(_)) {
                    T::I32
                } else {
                    self.infer(value, env, facts)?
                };
                if !crate::check::is_number(&t) && t != T::Int {
                    return Err("negation requires numeric value".into());
                }
                self.expected(e, &t, env, facts)
            }
            Expr::Let(..) => Err("compute expression belongs in a pure function".into()),
            Expr::Num(_) => Ok(T::U64),
            Expr::Bool(_) => Ok(T::Bool),
            Expr::String(_) => Ok(T::String),
            Expr::Unit => Ok(T::Unit),
            Expr::Var(n) => {
                if let Some(t) = env.get(n) {
                    return Ok(t.clone());
                }
                if n == "None" {
                    return Ok(T::Option(Box::new(T::Unknown)));
                }
                if let Some(d) = self
                    .p
                    .states
                    .iter()
                    .chain(&self.p.keeps)
                    .find(|d| &d.name == n)
                {
                    if !self.action.reads.contains(n) && !self.action.writes.contains(n) {
                        return Err(format!(
                            "{} lacks read capability for {n}",
                            self.action.name
                        ));
                    }
                    if matches!(d.ty, T::Table(..)) {
                        return Err(
                            "table roots may only be used as table-operation receivers".into()
                        );
                    }
                    return Ok(d.ty.clone());
                }
                Err(format!("unknown name {n}"))
            }
            Expr::Field(x, n) => {
                if let Expr::Var(en) = &**x {
                    if let Some(vs) = self.p.enums.get(en) {
                        if vs.contains(n) {
                            return Ok(T::Named(en.clone()));
                        }
                        return Err(format!("unknown variant {en}.{n}"));
                    }
                }
                let receiver = self.infer(x, env, facts)?;
                if let T::Vector(t, k) = receiver {
                    let i = ["x", "y", "z", "w"]
                        .iter()
                        .position(|v| *v == n)
                        .ok_or("unknown vector component")?;
                    if i >= k as usize {
                        return Err("vector component outside dimension".into());
                    }
                    Ok(*t)
                } else if let T::Named(record) = receiver {
                    self.p
                        .records
                        .get(&record)
                        .and_then(|fs| fs.iter().find(|(f, _)| f == n))
                        .map(|(_, t)| t.clone())
                        .ok_or_else(|| format!("unknown field {record}.{n}"))
                } else {
                    Err("field access requires a record".into())
                }
            }
            Expr::Record(n, fields) => {
                let decl = self
                    .p
                    .records
                    .get(n)
                    .ok_or_else(|| format!("unknown record {n}"))?;
                let mut seen = BTreeSet::new();
                for (f, v) in fields {
                    if !seen.insert(f) {
                        return Err(format!("duplicate field {f}"));
                    }
                    let ty = decl
                        .iter()
                        .find(|(k, _)| k == f)
                        .ok_or_else(|| format!("unknown field {f}"))?;
                    self.expected(v, &ty.1, env, facts)?;
                }
                if seen.len() != decl.len() {
                    return Err(format!("missing fields for {n}"));
                }
                Ok(T::Named(n.clone()))
            }
            Expr::Try(x) => {
                if self.in_lambda {
                    return Err(
                        "error propagation is not permitted inside a collection lambda".into(),
                    );
                }
                let (out, err) = if let T::Result(a, b) = self.infer(x, env, facts)? {
                    (a, b)
                } else {
                    return Err("? requires Result".into());
                };
                let target = if let T::Result(_, e) = &self.action.result {
                    e
                } else {
                    return Err("? requires a Result-returning declaration".into());
                };
                if !compatible(&err, target) {
                    return Err(format!("cannot propagate {err:?} as {target:?}"));
                }
                if let Expr::Method(get, method, _) = &**x {
                    if method == "ok_or" {
                        if let Expr::Method(root, m, args) = &**get {
                            if m == "get" {
                                if let Some(r) = self.root(root) {
                                    if stable_key(&args[0], env) {
                                        facts.insert((r, key(&args[0])), true);
                                    }
                                }
                            }
                        }
                    }
                }
                Ok(*out)
            }
            Expr::Binary(op, a, b) => {
                let hint = self
                    .numeric_hint(a, env, facts)
                    .or_else(|| self.numeric_hint(b, env, facts));
                let at = if let Some(t) = hint {
                    self.expected(a, &t, env, facts)?
                } else {
                    self.infer(a, env, facts)?
                };
                // Short-circuit operands cannot contribute unconditional presence facts.
                let mut right_facts = facts.clone();
                self.expected(b, &at, env, &mut right_facts)?;
                if op != "&&" && op != "||" {
                    *facts = right_facts;
                } else {
                    facts.retain(|k, v| right_facts.get(k) == Some(v));
                }
                match op.as_str() {
                    "+" | "-" | "*" if crate::check::is_number(&at) || at == T::Int => Ok(at),
                    "<" | ">" | "<=" | ">=" if crate::check::is_number(&at) || at == T::Int => {
                        Ok(T::Bool)
                    }
                    "==" | "!=" => Ok(T::Bool),
                    "&&" | "||" if at == T::Bool => Ok(T::Bool),
                    _ => Err(format!("invalid operator {op} for {at:?}")),
                }
            }
            Expr::Call(n, args) => {
                match n.as_str() {
                    "vec2" | "vec3" | "vec4" => {
                        let k = n.as_bytes()[3] - b'0';
                        if args.len() != k as usize {
                            return Err("vector arity mismatch".into());
                        }
                        let t = self.infer(&args[0], env, facts)?;
                        if !matches!(t, T::U32 | T::I32 | T::F32) {
                            return Err("vector components require 32-bit numeric values".into());
                        }
                        for e in &args[1..] {
                            self.expected(e, &t, env, facts)?;
                        }
                        return Ok(T::Vector(Box::new(t), k));
                    }
                    "Ok" | "Err" | "Some" => {
                        if args.len() != 1 {
                            return Err(format!("{n} expects one argument"));
                        }
                        let t = self.infer(&args[0], env, facts)?;
                        return Ok(match n.as_str() {
                            "Ok" => T::Result(Box::new(t), Box::new(T::Unknown)),
                            "Err" => T::Result(Box::new(T::Unknown), Box::new(t)),
                            _ => T::Option(Box::new(t)),
                        });
                    }
                    "Int" => {
                        if args.len() != 1 {
                            return Err("Int expects one argument".into());
                        }
                        let t = self.infer(&args[0], env, facts)?;
                        if !matches!(t, T::U64 | T::U32 | T::Int | T::I32) {
                            return Err("Int requires integer input".into());
                        }
                        return Ok(T::Int);
                    }
                    "checked_add" | "checked_sub" | "checked_mul" => {
                        if args.len() != 2 {
                            return Err(format!("{n} expects two arguments"));
                        }
                        let t = self.infer(&args[0], env, facts)?;
                        if !matches!(t, T::U64 | T::U32 | T::I32) {
                            return Err("checked arithmetic requires fixed integers".into());
                        }
                        self.expected(&args[1], &t, env, facts)?;
                        return Ok(T::Result(
                            Box::new(t),
                            Box::new(T::Named("ArithmeticError".into())),
                        ));
                    }
                    "sum" | "count" => {
                        if args.len() != 1 {
                            return Err(format!("{n} expects one argument"));
                        }
                        let t = self.infer(&args[0], env, facts)?;
                        if let T::List(inner) = t {
                            if n == "count" {
                                return Ok(T::Int);
                            }
                            if matches!(*inner, T::U32 | T::U64 | T::Int | T::I32 | T::F32) {
                                return Ok(*inner);
                            }
                        }
                        return Err(format!("invalid {n} collection"));
                    }
                    _ => {}
                }
                if let Some(a) = self.p.actions.iter().find(|a| &a.name == n) {
                    if self.in_lambda && a.kind == ActionKind::Change {
                        return Err("collection lambda cannot call a change".into());
                    }
                    if self.action.kind == ActionKind::Query && a.kind == ActionKind::Change {
                        return Err("query cannot call a change".into());
                    }
                    if a.kind == ActionKind::Change {
                        if let (T::Result(_, callee), T::Result(_, caller)) =
                            (&a.result, &self.action.result)
                        {
                            if callee != caller {
                                return Err("nested changes must use the same error type because failure aborts the transaction".into());
                            }
                        }
                    }
                    for r in &a.reads {
                        if !self.action.reads.contains(r) && !self.action.writes.contains(r) {
                            return Err(format!("missing transitive read capability {r}"));
                        }
                    }
                    for w in &a.writes {
                        if !self.action.writes.contains(w) {
                            return Err(format!("missing transitive write capability {w}"));
                        }
                    }
                    for e in &a.emits {
                        if !self.action.emits.contains(e) {
                            return Err(format!("missing transitive event capability {e}"));
                        }
                    }
                    if args.len() != a.params.len() {
                        return Err(format!("{n} argument count mismatch"));
                    }
                    for (e, (_, t)) in args.iter().zip(&a.params) {
                        self.expected(e, t, env, facts)?;
                    }
                    if !a.writes.is_empty() {
                        facts.clear();
                    }
                    return Ok(a.result.clone());
                }
                if let Some(f) = self.p.functions.iter().find(|f| &f.name == n) {
                    if args.len() != f.params.len() {
                        return Err(format!("{n} argument count mismatch"));
                    }
                    for (e, (_, t)) in args.iter().zip(&f.params) {
                        self.expected(e, t, env, facts)?;
                    }
                    return Ok(f.result.clone());
                }
                Err(format!("unknown function {n}"))
            }
            Expr::Method(receiver, n, args) => {
                // Roots are capabilities, never first-class values. Resolve a
                // literal receiver separately, retaining its typing judgment
                // for action elaboration. A lambda-local shadow remains a value.
                let root = self.root(receiver).filter(|n| !env.contains_key(n));
                let t = if let Some(root) = &root {
                    if !self.action.reads.contains(root) && !self.action.writes.contains(root) {
                        return Err(format!(
                            "{} lacks read capability for {root}",
                            self.action.name
                        ));
                    }
                    let ty = self
                        .p
                        .states
                        .iter()
                        .find(|s| &s.name == root)
                        .expect("resolved root")
                        .ty
                        .clone();
                    if let Some(typing) = self.typing {
                        typing
                            .borrow_mut()
                            .values
                            .insert(address(receiver), ty.clone());
                    }
                    ty
                } else {
                    self.infer(receiver, env, facts)?
                };
                if let T::Table(kt, vt) = t {
                    let root = self
                        .root(receiver)
                        .ok_or("table operations require a state root")?;
                    let argc = match n.as_str() {
                        "values" => 0,
                        "get" | "contains" | "remove" => 1,
                        "insert" | "replace" => 2,
                        _ => return Err(format!("unsupported table method {n}")),
                    };
                    if args.len() != argc {
                        return Err(format!("{n} expects {argc} arguments"));
                    }
                    if argc > 0 {
                        self.expected(&args[0], &kt, env, facts)?;
                    }
                    if argc > 1 {
                        self.expected(&args[1], &vt, env, facts)?;
                    }
                    if ["insert", "replace", "remove"].contains(&n.as_str()) {
                        if self.in_lambda || !self.action.writes.contains(&root) {
                            return Err(format!("write to {root} is not permitted"));
                        }
                        let fact = (root.clone(), key(&args[0]));
                        if n == "insert" && facts.get(&fact) != Some(&false) {
                            return Err(format!(
                                "insert into {root} needs proof that the key is absent"
                            ));
                        }
                        if n == "replace" && facts.get(&fact) != Some(&true) {
                            return Err(format!(
                                "replace in {root} needs proof that the key is present"
                            ));
                        }
                        facts.clear();
                        if stable_key(&args[0], env) {
                            facts.insert(fact, n != "remove");
                        }
                    }
                    return Ok(match n.as_str() {
                        "get" | "remove" => T::Option(vt),
                        "contains" => T::Bool,
                        "values" => T::List(vt),
                        _ => T::Unit,
                    });
                }
                if n == "ok_or" {
                    if let T::Option(v) = t {
                        if args.len() != 1 {
                            return Err("ok_or expects one error".into());
                        }
                        let e = self.infer(&args[0], env, facts)?;
                        return Ok(T::Result(v, Box::new(e)));
                    }
                }
                if ["map", "map_err", "filter"].contains(&n.as_str()) {
                    if args.len() != 1 {
                        return Err(format!("{n} expects one lambda"));
                    }
                    let (v, body) = if let Expr::Lambda(v, b) = &args[0] {
                        (v, b)
                    } else {
                        return Err(format!("{n} requires a lambda"));
                    };
                    let inner = match (&t, n.as_str()) {
                        (T::List(a), "map" | "filter")
                        | (T::Option(a), "map")
                        | (T::Result(a, _), "map") => &**a,
                        (T::Result(_, b), "map_err") => &**b,
                        _ => return Err(format!("invalid method {n} on {t:?}")),
                    };
                    let mut local = env.clone();
                    local.insert(v.clone(), inner.clone());
                    let cx = Context {
                        in_lambda: true,
                        ..*self
                    };
                    let out = cx.infer(body, &local, &mut facts.clone())?;
                    if let Some(typing) = self.typing {
                        typing
                            .borrow_mut()
                            .lambdas
                            .insert(address(&args[0]), (inner.clone(), out.clone()));
                    }
                    return Ok(match t {
                        T::List(a) => {
                            if n == "filter" {
                                if out != T::Bool {
                                    return Err("filter predicate must be Bool".into());
                                }
                                T::List(a)
                            } else {
                                T::List(Box::new(out))
                            }
                        }
                        T::Option(_) => T::Option(Box::new(out)),
                        T::Result(a, b) => {
                            if n == "map_err" {
                                T::Result(a, Box::new(out))
                            } else {
                                T::Result(Box::new(out), b)
                            }
                        }
                        _ => unreachable!(),
                    });
                }
                Err(format!("unsupported method {n} on {t:?}"))
            }
            Expr::Lambda(..) => Err("lambda requires a typed operator context".into()),
        }
    }
    fn block(&self, body: &[Statement], env: &mut Env, facts: &mut Facts) -> LangResult<bool> {
        let mut terminated = false;
        for s in body {
            match s {
                Statement::Let(n, annotation, e) => {
                    if env.contains_key(n)
                        || self
                            .p
                            .states
                            .iter()
                            .chain(&self.p.keeps)
                            .any(|d| &d.name == n)
                    {
                        return Err(format!("duplicate or shadowed binding {n}"));
                    }
                    let t = if let Some(t) = annotation {
                        validate_type(t, self.p)?;
                        self.expected(e, t, env, facts)?
                    } else {
                        self.infer(e, env, facts)?
                    };
                    if !concrete(&t) {
                        return Err(format!("binding {n} needs an explicit type"));
                    }
                    env.insert(n.clone(), t);
                }
                Statement::Return(e) => {
                    self.expected(e, &self.action.result, env, facts)?;
                    terminated = true;
                }
                Statement::Expr(e) => {
                    self.infer(e, env, facts)?;
                }
                Statement::Emit(n, e) => {
                    if !self.action.emits.contains(n) {
                        return Err(format!("{} cannot emit {n}", self.action.name));
                    }
                    let t = self
                        .p
                        .events
                        .get(n)
                        .ok_or_else(|| format!("unknown event {n}"))?;
                    self.expected(e, t, env, facts)?;
                }
                Statement::If(e, yes, no) => {
                    self.expected(e, &Type::Bool, env, facts)?;
                    let mut yf = facts.clone();
                    let mut nf = facts.clone();
                    if let Expr::Method(root, m, args) = e {
                        if m == "contains" {
                            if let Some(r) = self.root(root) {
                                if stable_key(&args[0], env) {
                                    yf.insert((r.clone(), key(&args[0])), true);
                                    nf.insert((r, key(&args[0])), false);
                                }
                            }
                        }
                    }
                    let y = self.block(yes, &mut env.clone(), &mut yf)?;
                    let n = self.block(no, &mut env.clone(), &mut nf)?;
                    if y && n {
                        terminated = true;
                    }
                    if y {
                        *facts = nf;
                    } else if n {
                        *facts = yf;
                    } else {
                        yf.retain(|k, v| nf.get(k) == Some(v));
                        *facts = yf;
                    }
                }
            }
        }
        Ok(terminated)
    }
}

pub fn check(p: &Program) -> LangResult<()> {
    let mut names = BTreeSet::new();
    for n in p
        .ids
        .iter()
        .chain(p.records.keys())
        .chain(p.enums.keys())
        .chain(p.events.keys())
        .chain(p.states.iter().map(|d| &d.name))
        .chain(p.keeps.iter().map(|d| &d.name))
        .chain(p.actions.iter().map(|a| &a.name))
        .chain(p.functions.iter().map(|f| &f.name))
    {
        if !names.insert(n.clone())
            || [
                "Int",
                "u32",
                "i32",
                "f32",
                "Vec2",
                "Vec3",
                "Vec4",
                "repeat",
                "vec2",
                "vec3",
                "vec4",
                "quot_or",
                "rem_or",
                "u64",
                "Bool",
                "Unit",
                "String",
                "List",
                "Option",
                "Result",
                "Ok",
                "Err",
                "Some",
                "None",
                "sum",
                "count",
                "checked_add",
                "checked_sub",
                "checked_mul",
                "ArithmeticError",
                "Table",
            ]
            .contains(&n.as_str())
        {
            return Err(format!("duplicate or reserved declaration {n}"));
        }
    }
    for (name, fields) in &p.records {
        let mut seen = BTreeSet::new();
        for (n, t) in fields {
            if !seen.insert(n) {
                return Err(format!("duplicate field {name}.{n}"));
            }
            validate_type(t, p)?;
        }
    }
    for (n, variants) in &p.enums {
        let unique: BTreeSet<_> = variants.iter().collect();
        if unique.len() != variants.len() {
            return Err(format!("duplicate variant in {n}"));
        }
    }
    for t in p.events.values() {
        validate_type(t, p)?;
    }
    for s in &p.states {
        let (k, v) = if let Type::Table(k, v) = &s.ty {
            (k, v)
        } else {
            return Err("only table state roots are implemented yet".into());
        };
        validate_type(k, p)?;
        validate_type(v, p)?;
        if !matches!(&**k, Type::U64 | Type::U32 | Type::I32 | Type::String)
            && !matches!(&**k,Type::Named(n) if p.ids.contains(n))
        {
            return Err("unsupported persistent key type".into());
        }
        if !matches!(&s.value,Expr::Method(r,n,a) if matches!(&**r,Expr::Var(v) if v=="Table")&&n=="empty"&&a.is_empty())
        {
            return Err("state initializer must be Table.empty()".into());
        }
    }
    for k in &p.keeps {
        validate_type(&k.ty, p)?;
        let fake = Action {
            name: k.name.clone(),
            kind: ActionKind::Query,
            params: vec![],
            result: k.ty.clone(),
            reads: p
                .states
                .iter()
                .chain(&p.keeps)
                .map(|d| d.name.clone())
                .collect(),
            writes: vec![],
            emits: vec![],
            body: vec![],
        };
        Context {
            p,
            action: &fake,
            in_lambda: false,
            typing: None,
        }
        .expected(&k.value, &k.ty, &Env::new(), &mut Facts::new())?;
    }
    for a in &p.actions {
        validate_type(&a.result, p)?;
        let env = crate::check::params_env(&a.params)?;
        for (n, t) in &a.params {
            validate_type(t, p)?;
            if p.states.iter().chain(&p.keeps).any(|s| &s.name == n) {
                return Err(format!("parameter shadows state or keep {n}"));
            }
        }
        if a.kind == ActionKind::Change && !matches!(a.result, Type::Result(..)) {
            return Err("change must return Result".into());
        }
        if a.kind == ActionKind::Query && (!a.writes.is_empty() || !a.emits.is_empty()) {
            return Err("query cannot write or emit".into());
        }
        for n in &a.reads {
            if !p.states.iter().chain(&p.keeps).any(|s| &s.name == n) {
                return Err(format!("unknown read capability {n}"));
            }
        }
        for n in &a.writes {
            if !p.states.iter().any(|s| &s.name == n) {
                return Err(format!("unknown write capability {n}"));
            }
        }
        for n in &a.emits {
            if !p.events.contains_key(n) {
                return Err(format!("unknown event capability {n}"));
            }
        }
        if !(Context {
            p,
            action: a,
            in_lambda: false,
            typing: None,
        })
        .block(&a.body, &mut env.clone(), &mut Facts::new())?
        {
            return Err(format!("{} can fall through without returning", a.name));
        }
    }
    // Name dependencies are deliberately conservative, including lambda-local names.
    // This can reject a shadowed name but cannot hide a cycle in a keep or action.
    fn deps(e: &Expr, out: &mut BTreeSet<String>) {
        match e {
            Expr::Var(n) => {
                out.insert(n.clone());
            }
            Expr::Call(n, args) => {
                out.insert(n.clone());
                for a in args {
                    deps(a, out);
                }
            }
            Expr::Binary(_, a, b) => {
                deps(a, out);
                deps(b, out);
            }
            Expr::Method(a, _, xs) => {
                deps(a, out);
                for x in xs {
                    deps(x, out);
                }
            }
            Expr::Field(e, _) | Expr::Try(e) | Expr::Lambda(_, e) => deps(e, out),
            Expr::Record(_, fs) => {
                for (_, e) in fs {
                    deps(e, out);
                }
            }
            _ => {}
        }
    }
    fn bodydeps(body: &[Statement], out: &mut BTreeSet<String>) {
        for s in body {
            match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Expr(e)
                | Statement::Emit(_, e) => deps(e, out),
                Statement::If(e, a, b) => {
                    deps(e, out);
                    bodydeps(a, out);
                    bodydeps(b, out);
                }
            }
        }
    }
    let mut graph = BTreeMap::new();
    for k in &p.keeps {
        let mut ds = BTreeSet::new();
        deps(&k.value, &mut ds);
        graph.insert(k.name.clone(), ds);
    }
    for a in &p.actions {
        let mut ds = BTreeSet::new();
        bodydeps(&a.body, &mut ds);
        graph.insert(a.name.clone(), ds);
    }
    fn visit(
        n: &str,
        g: &BTreeMap<String, BTreeSet<String>>,
        stack: &mut BTreeSet<String>,
        done: &mut BTreeSet<String>,
    ) -> LangResult<()> {
        if done.contains(n) {
            return Ok(());
        }
        if stack.len() >= 128 {
            return Err("state dependency nesting limit exceeded".into());
        }
        if !stack.insert(n.into()) {
            return Err(format!("unproved dependency cycle through {n}"));
        }
        if let Some(ds) = g.get(n) {
            for d in ds {
                if g.contains_key(d) {
                    visit(d, g, stack, done)?;
                }
            }
        }
        stack.remove(n);
        done.insert(n.into());
        Ok(())
    }
    let mut done = BTreeSet::new();
    for n in graph.keys() {
        visit(n, &graph, &mut BTreeSet::new(), &mut done)?;
    }
    Ok(())
}

pub fn expression_type(p: &Program, e: &Expr, env: &Env) -> LangResult<Type> {
    let action = Action {
        name: "type_query".into(),
        kind: ActionKind::Query,
        params: vec![],
        result: Type::Result(Box::new(Type::Unknown), Box::new(Type::Unknown)),
        reads: p
            .states
            .iter()
            .chain(&p.keeps)
            .map(|d| d.name.clone())
            .collect(),
        writes: vec![],
        emits: vec![],
        body: vec![],
    };
    Context {
        p,
        action: &action,
        in_lambda: false,
        typing: None,
    }
    .infer(e, env, &mut Facts::new())
}

/// Retain the existing checker's judgments; addresses exist only during this
/// pass and never enter executable identities or the exported representation.
pub(crate) fn action_typing(p: &Program, action: &Action) -> LangResult<Typing> {
    let typing = RefCell::new(Typing::default());
    let cx = Context {
        p,
        action,
        in_lambda: false,
        typing: Some(&typing),
    };
    let mut env = crate::check::params_env(&action.params)?;
    if !cx.block(&action.body, &mut env, &mut Facts::new())? {
        return Err("action can fall through".into());
    }
    Ok(typing.into_inner())
}

pub(crate) fn keep_typing(p: &Program, keep: &BindingDecl) -> LangResult<Typing> {
    let typing = RefCell::new(Typing::default());
    let action = Action {
        name: keep.name.clone(),
        kind: ActionKind::Query,
        params: vec![],
        result: keep.ty.clone(),
        reads: p
            .states
            .iter()
            .chain(&p.keeps)
            .map(|d| d.name.clone())
            .collect(),
        writes: vec![],
        emits: vec![],
        body: vec![],
    };
    Context {
        p,
        action: &action,
        in_lambda: false,
        typing: Some(&typing),
    }
    .expected(&keep.value, &keep.ty, &Env::new(), &mut Facts::new())?;
    Ok(typing.into_inner())
}
