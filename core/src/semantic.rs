//! Typed, binder-safe semantic terms shared by proof admission and external tools.
//! Operations are fixed language semantics, never database optimisation laws.
use crate::{
    check,
    core::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SEMANTICS: &str = "ink-semantic-terms-v1";
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Sort {
    Value(Type),
    Arrow(Box<Sort>, Box<Sort>),
    Nat,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Term {
    pub sort: Sort,
    pub node: Node,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Node {
    Free(String),
    Bound(usize),
    Word(u64),
    Float(u32),
    Bool(bool),
    String(String),
    Unit,
    Nat(u64),
    Lambda(Box<Term>),
    Op(String, Vec<Term>),
    Nil,
    Cons(Box<Term>, Box<Term>),
}
pub type Env = BTreeMap<String, Sort>;
pub fn value(t: Type) -> Sort {
    Sort::Value(t)
}
pub fn arrow(a: Sort, b: Sort) -> Sort {
    Sort::Arrow(Box::new(a), Box::new(b))
}
pub fn term(sort: Sort, node: Node) -> Term {
    Term { sort, node }
}
pub fn op(sort: Sort, name: &str, args: Vec<Term>) -> Term {
    term(sort, Node::Op(name.into(), args))
}
pub fn word(t: Type, n: u64) -> Term {
    term(value(t), Node::Word(n))
}
pub fn free(sort: Sort, name: &str) -> Term {
    term(sort, Node::Free(name.into()))
}
pub fn lambda(parameter: Sort, body: Term) -> Term {
    term(
        arrow(parameter, body.sort.clone()),
        Node::Lambda(Box::new(body)),
    )
}
pub fn children(t: &Term) -> Vec<&Term> {
    match &t.node {
        Node::Lambda(b) => vec![b],
        Node::Op(_, a) => a.iter().collect(),
        Node::Cons(a, b) => vec![a, b],
        _ => vec![],
    }
}
/// Rebuild each child once, in semantic visitor order. Callers own recursion,
/// binder depth and work accounting; this helper makes no rewrite decisions.
pub fn try_map_children(
    t: &Term,
    mut map: impl FnMut(&Term) -> LangResult<Term>,
) -> LangResult<Term> {
    let node = match &t.node {
        Node::Lambda(body) => Node::Lambda(Box::new(map(body)?)),
        Node::Op(name, args) => Node::Op(
            name.clone(),
            args.iter().map(&mut map).collect::<LangResult<_>>()?,
        ),
        Node::Cons(head, tail) => Node::Cons(Box::new(map(head)?), Box::new(map(tail)?)),
        node => node.clone(),
    };
    Ok(term(t.sort.clone(), node))
}
pub fn replace_child(t: &Term, i: usize, child: Term) -> LangResult<Term> {
    let mut t = t.clone();
    match &mut t.node {
        Node::Lambda(b) if i == 0 => **b = child,
        Node::Op(_, a) => *a.get_mut(i).ok_or("semantic child out of range")? = child,
        Node::Cons(a, _) if i == 0 => **a = child,
        Node::Cons(_, b) if i == 1 => **b = child,
        _ => return Err("semantic child out of range".into()),
    }
    Ok(t)
}
#[derive(Debug)]
pub struct Budget {
    pub remaining: usize,
}
impl Budget {
    pub fn new() -> Self {
        Self { remaining: 500_000 }
    }
    pub fn step(&mut self, depth: usize) -> LangResult<()> {
        if depth > 128 || self.remaining == 0 {
            return Err("semantic proof work/depth limit".into());
        }
        self.remaining -= 1;
        Ok(())
    }
}
impl Default for Budget {
    fn default() -> Self {
        Self::new()
    }
}
fn shift(t: &Term, amount: isize, cutoff: usize, b: &mut Budget, d: usize) -> LangResult<Term> {
    b.step(d)?;
    let node = match &t.node {
        Node::Bound(i) if *i >= cutoff => {
            Node::Bound(i.checked_add_signed(amount).ok_or("invalid bound shift")?)
        }
        Node::Lambda(x) => Node::Lambda(Box::new(shift(x, amount, cutoff + 1, b, d + 1)?)),
        Node::Op(n, a) => Node::Op(
            n.clone(),
            a.iter()
                .map(|x| shift(x, amount, cutoff, b, d + 1))
                .collect::<LangResult<_>>()?,
        ),
        Node::Cons(a, c) => Node::Cons(
            Box::new(shift(a, amount, cutoff, b, d + 1)?),
            Box::new(shift(c, amount, cutoff, b, d + 1)?),
        ),
        n => n.clone(),
    };
    Ok(term(t.sort.clone(), node))
}
pub fn shift_into(t: &Term, depth: usize, b: &mut Budget) -> LangResult<Term> {
    shift(t, depth as isize, 0, b, 0)
}
fn beta_at(t: &Term, arg: &Term, depth: usize, b: &mut Budget) -> LangResult<Term> {
    b.step(depth)?;
    if let Node::Bound(i) = t.node {
        if i == depth {
            return shift(arg, depth as isize, 0, b, 0);
        }
        return Ok(term(
            t.sort.clone(),
            Node::Bound(if i > depth { i - 1 } else { i }),
        ));
    }
    try_map_children(t, |c| {
        beta_at(
            c,
            arg,
            depth + usize::from(matches!(t.node, Node::Lambda(_))),
            b,
        )
    })
}
pub fn beta(body: &Term, arg: &Term, b: &mut Budget) -> LangResult<Term> {
    beta_at(body, arg, 0, b)
}
/// Capture-avoiding beta computation only. This exposes the fixed meaning of
/// lexical bindings without unfolding helpers or choosing an optimisation law.
pub fn beta_normalize(t: &Term, budget: &mut Budget) -> LangResult<Term> {
    fn walk(t: &Term, budget: &mut Budget, depth: usize) -> LangResult<Term> {
        budget.step(depth)?;
        let term = try_map_children(t, |child| walk(child, budget, depth + 1))?;
        if let Node::Op(name, args) = &term.node {
            if name == "apply" && args.len() == 2 {
                if let Node::Lambda(body) = &args[0].node {
                    return walk(&beta(body, &args[1], budget)?, budget, depth + 1);
                }
            }
        }
        Ok(term)
    }
    walk(t, budget, 0)
}
pub fn substitute(t: &Term, args: &BTreeMap<String, Term>, b: &mut Budget) -> LangResult<Term> {
    fn walk(
        t: &Term,
        args: &BTreeMap<String, Term>,
        depth: usize,
        b: &mut Budget,
    ) -> LangResult<Term> {
        b.step(depth)?;
        if let Node::Free(n) = &t.node {
            if let Some(a) = args.get(n) {
                return shift(a, depth as isize, 0, b, 0);
            }
        }
        try_map_children(t, |c| {
            walk(
                c,
                args,
                depth + usize::from(matches!(t.node, Node::Lambda(_))),
                b,
            )
        })
    }
    walk(t, args, 0, b)
}
/// Extracting a pattern hole under a binder must not capture that binder.
/// Closed lambdas containing their own bound variables are allowed.
pub fn unshift_hole(t: &Term, depth: usize) -> LangResult<Term> {
    fn walk(t: &Term, depth: usize, local: usize, b: &mut Budget) -> LangResult<Term> {
        b.step(local)?;
        if let Node::Bound(i) = t.node {
            if i >= local && i < local + depth {
                return Err("pattern hole captures surrounding binder".into());
            }
        }
        try_map_children(t, |c| {
            walk(
                c,
                depth,
                local + usize::from(matches!(t.node, Node::Lambda(_))),
                b,
            )
        })
    }
    let mut b = Budget::new();
    let out = walk(t, depth, 0, &mut b)?;
    shift(&out, -(depth as isize), 0, &mut b, 0)
}
pub(crate) fn val(s: &Sort) -> LangResult<&Type> {
    if let Sort::Value(t) = s {
        Ok(t)
    } else {
        Err("expected value sort".into())
    }
}
fn list(s: &Sort) -> LangResult<&Type> {
    if let Type::List(t) = val(s)? {
        Ok(t)
    } else {
        Err("expected list sort".into())
    }
}
fn need(got: &Sort, want: Sort) -> LangResult<()> {
    if got == &want {
        Ok(())
    } else {
        Err(format!(
            "semantic sort mismatch: {got:?}, expected {want:?}"
        ))
    }
}
pub fn validate(t: &Term, env: &Env, p: &Program, b: &mut Budget) -> LangResult<()> {
    fn walk(
        t: &Term,
        env: &Env,
        bound: &mut Vec<Sort>,
        p: &Program,
        b: &mut Budget,
        d: usize,
    ) -> LangResult<()> {
        b.step(d)?;
        match &t.node {
            Node::Free(n) => need(
                &t.sort,
                env.get(n).ok_or("undeclared semantic variable")?.clone(),
            )?,
            Node::Bound(i) => need(
                &t.sort,
                bound
                    .iter()
                    .rev()
                    .nth(*i)
                    .ok_or("unbound semantic index")?
                    .clone(),
            )?,
            Node::Word(n) => match val(&t.sort)? {
                Type::U64 | Type::Int => {}
                Type::U32 | Type::I32 if *n <= u32::MAX as u64 => {}
                _ => return Err("invalid word literal sort/range".into()),
            },
            Node::Float(_) => need(&t.sort, value(Type::F32))?,
            Node::Bool(_) => need(&t.sort, value(Type::Bool))?,
            Node::String(s) => {
                if s.len() > 1_000_000 {
                    return Err("semantic string literal budget".into());
                }
                need(&t.sort, value(Type::String))?;
            }
            Node::Unit => need(&t.sort, value(Type::Unit))?,
            Node::Nat(_) => need(&t.sort, Sort::Nat)?,
            Node::Lambda(body) => {
                let Sort::Arrow(a, c) = &t.sort else {
                    return Err("lambda needs arrow sort".into());
                };
                need(&body.sort, (**c).clone())?;
                bound.push((**a).clone());
                walk(body, env, bound, p, b, d + 1)?;
                bound.pop();
            }
            Node::Nil => {
                list(&t.sort)?;
            }
            Node::Cons(a, c) => {
                need(&a.sort, value(list(&t.sort)?.clone()))?;
                need(&c.sort, t.sort.clone())?;
                walk(a, env, bound, p, b, d + 1)?;
                walk(c, env, bound, p, b, d + 1)?;
            }
            Node::Op(n, args) => {
                for a in args {
                    walk(a, env, bound, p, b, d + 1)?;
                }
                let a = |i: usize| {
                    args.get(i)
                        .map(|x| &x.sort)
                        .ok_or("semantic operator arity")
                };
                let arity = |n: usize| {
                    if args.len() == n {
                        Ok(())
                    } else {
                        Err("semantic operator arity".to_string())
                    }
                };
                if crate::owned_semantic::validate(t, p)? {
                    return Ok(());
                }
                if let Some(literal)=n.strip_prefix("enum:") {
                    let (name,encoded)=literal.rsplit_once(':').ok_or("enum semantic literal")?;
                    let index:usize=encoded.parse().map_err(|_|"enum semantic variant index")?;
                    if index.to_string()!=encoded{return Err("noncanonical semantic enum index".into())}
                    let variants=p.enums.get(name).ok_or("unknown semantic enum")?;
                    if index>=variants.len(){return Err("semantic enum variant outside declaration".into())}
                    arity(0)?;need(&t.sort,value(Type::Named(name.into())))?;
                    return Ok(());
                }
                match n.as_str() {
                    "value:equal" => {
                        arity(2)?; need(a(1)?,a(0)?.clone())?;
                        if crate::local_collections::owned(val(a(0)?)?,p){return Err("owned equality".into());}
                        need(&t.sort,value(Type::Bool))?;
                    }
                    "apply" => {
                        arity(2)?;
                        let Sort::Arrow(x, y) = a(0)? else {
                            return Err("apply needs arrow".into());
                        };
                        need(a(1)?, (**x).clone())?;
                        need(&t.sort, (**y).clone())?;
                    }
                    "nat.succ" => {
                        arity(1)?;
                        need(a(0)?, Sort::Nat)?;
                        need(&t.sort, Sort::Nat)?;
                    }
                    "nat.word" => {
                        arity(1)?;
                        need(a(0)?, Sort::Nat)?;
                        if !check::is_word(val(&t.sort)?) {
                            return Err("natural conversion requires word".into());
                        }
                    }
                    "neg" => {
                        arity(1)?;
                        need(a(0)?, t.sort.clone())?;
                        if !check::is_numeric_value(val(&t.sort)?) {
                            return Err("numeric negation sort".into());
                        }
                    }
                    "call:choose" => {
                        arity(3)?;
                        need(a(0)?, value(Type::Bool))?;
                        need(a(1)?, t.sort.clone())?;
                        need(a(2)?, t.sort.clone())?;
                    }
                    "call:repeat" => {
                        arity(3)?;
                        need(a(0)?, Sort::Nat)?;
                        need(a(1)?, t.sort.clone())?;
                        need(
                            a(2)?,
                            arrow(value(Type::U32), arrow(t.sort.clone(), t.sort.clone())),
                        )?;
                    }
                    "call:repeat_until" | "until.from" => {
                        let offset = usize::from(n == "until.from");
                        arity(4 + offset)?;
                        need(a(0)?, value(Type::U32))?;
                        if offset == 1 {
                            need(a(1)?, value(Type::U32))?;
                        }
                        let ty = val(&t.sort)?;
                        crate::statecheck::validate_type(ty, p)?;
                        need(a(1 + offset)?, t.sort.clone())?;
                        need(a(2 + offset)?, arrow(t.sort.clone(), value(Type::Bool)))?;
                        need(
                            a(3 + offset)?,
                            arrow(value(Type::U32), arrow(t.sort.clone(), t.sort.clone())),
                        )?;
                    }
                    "call:buffer" => {
                        arity(1)?;
                        let Type::Buffer(inner) = val(&t.sort)? else {
                            return Err("buffer result sort".into());
                        };
                        crate::statecheck::validate_type(val(&t.sort)?, p)?;
                        need(a(0)?, value(Type::List(inner.clone())))?;
                    }
                    "call:length" => {
                        arity(1)?;
                        list(a(0)?)?;
                        need(&t.sort, value(Type::U32))?;
                    }
                    "method:freeze" | "method:len" => {
                        arity(1)?;
                        let Type::Buffer(inner) = val(a(0)?)? else {
                            return Err("logical buffer read receiver".into());
                        };
                        need(
                            &t.sort,
                            if n == "method:freeze" {
                                value(Type::List(inner.clone()))
                            } else {
                                value(Type::U32)
                            },
                        )?;
                    }
                    "call:quot_or" | "call:rem_or" => {
                        arity(3)?;
                        if !check::is_word(val(&t.sort)?) {
                            return Err("word division sort".into());
                        }
                        for x in args {
                            need(&x.sort, t.sort.clone())?;
                        }
                    }
                    name if name
                        .strip_prefix("call:")
                        .is_some_and(crate::word::primitive) =>
                    {
                        let name = name.strip_prefix("call:").unwrap();
                        let result = val(&t.sort)?;
                        if !check::is_word(result) {
                            return Err("word primitive sort".into());
                        }
                        let ts = crate::word::arguments(name, result);
                        arity(ts.len())?;
                        for (a, t) in args.iter().zip(ts) {
                            need(&a.sort, value(t))?;
                        }
                    }
                    "call:Some" | "call:Ok" | "call:Err" => {
                        arity(1)?;
                        let inner = match (n.as_str(), val(&t.sort)?) {
                            ("call:Some", Type::Option(x))
                            | ("call:Ok", Type::Result(x, _))
                            | ("call:Err", Type::Result(_, x)) => (**x).clone(),
                            _ => return Err("variant constructor sort".into()),
                        };
                        need(a(0)?, value(inner))?;
                    }
                    "call:None" => {
                        arity(0)?;
                        if !matches!(val(&t.sort)?, Type::Option(_)) {
                            return Err("variant constructor sort".into());
                        }
                    }
                    "call:Int" => {
                        arity(1)?;
                        need(&t.sort, value(Type::Int))?;
                        if !matches!(val(a(0)?)?, Type::U32 | Type::U64 | Type::I32 | Type::Int) {
                            return Err("exact conversion source sort".into());
                        }
                    }
                    "call:sum" => {
                        arity(1)?;
                        need(&t.sort, value(list(a(0)?)?.clone()))?;
                        if !check::is_numeric_value(val(&t.sort)?) {
                            return Err("sum numeric sort".into());
                        }
                    }
                    "call:count" => {
                        arity(1)?;
                        list(a(0)?)?;
                        if !matches!(val(&t.sort)?, Type::U64 | Type::Int) {
                            return Err("count result sort".into());
                        }
                    }
                    "call:fold_until" => {
                        arity(4)?;
                        let item = value(list(a(0)?)?.clone());
                        crate::statecheck::validate_type(val(&t.sort)?, p)?;
                        need(a(1)?, t.sort.clone())?;
                        need(
                            a(2)?,
                            arrow(item.clone(), arrow(t.sort.clone(), value(Type::Bool))),
                        )?;
                        need(a(3)?, arrow(item, arrow(t.sort.clone(), t.sort.clone())))?;
                    }
                    "call:foldr" | "call:foldl" => {
                        arity(3)?;
                        let item = value(list(a(0)?)?.clone());
                        crate::statecheck::validate_type(val(&t.sort)?, p)?;
                        need(a(1)?, t.sort.clone())?;
                        need(a(2)?, arrow(item, arrow(t.sort.clone(), t.sort.clone())))?;
                    }
                    "method:fold" => {
                        arity(3)?;
                        let (yes, no) = match val(a(0)?)? {
                            Type::Option(inner) => ((**inner).clone(), Type::Unit),
                            Type::Result(yes, no) => ((**yes).clone(), (**no).clone()),
                            _ => return Err("fold receiver sort".into()),
                        };
                        need(a(1)?, arrow(value(yes), t.sort.clone()))?;
                        need(a(2)?, arrow(value(no), t.sort.clone()))?;
                    }
                    "method:map" => {
                        arity(2)?;
                        need(
                            a(1)?,
                            arrow(value(list(a(0)?)?.clone()), value(list(&t.sort)?.clone())),
                        )?;
                    }
                    "method:filter" => {
                        arity(2)?;
                        need(a(0)?, t.sort.clone())?;
                        need(a(1)?, arrow(value(list(a(0)?)?.clone()), value(Type::Bool)))?;
                    }
                    "method:concat" => {
                        arity(2)?;
                        list(&t.sort)?;
                        need(a(0)?, t.sort.clone())?;
                        need(a(1)?, t.sort.clone())?;
                    }
                    "method:take" | "method:drop" => {
                        arity(2)?;
                        list(&t.sort)?;
                        need(a(0)?, t.sort.clone())?;
                        need(a(1)?, value(Type::U32))?;
                    }
                    "method:map_indexed" => {
                        arity(2)?;
                        need(
                            a(1)?,
                            arrow(
                                value(Type::U32),
                                arrow(value(list(a(0)?)?.clone()), value(list(&t.sort)?.clone())),
                            ),
                        )?;
                    }
                    "method:zip" => {
                        arity(3)?;
                        need(
                            a(2)?,
                            arrow(
                                value(list(a(0)?)?.clone()),
                                arrow(value(list(a(1)?)?.clone()), value(list(&t.sort)?.clone())),
                            ),
                        )?;
                    }
                    "method:at_or" => {
                        arity(3)?;
                        let inner = match val(a(0)?)? {
                            Type::List(inner) | Type::Buffer(inner) => inner,
                            _ => return Err("indexed read receiver sort".into()),
                        };
                        need(&t.sort, value((**inner).clone()))?;
                        need(a(1)?, value(Type::U32))?;
                        need(a(2)?, t.sort.clone())?;
                    }
                    "indexed.from" => {
                        arity(3)?;
                        need(a(1)?, Sort::Nat)?;
                        need(
                            a(2)?,
                            arrow(
                                value(Type::U32),
                                arrow(value(list(a(0)?)?.clone()), value(list(&t.sort)?.clone())),
                            ),
                        )?;
                    }
                    "sum.acc" => {
                        arity(2)?;
                        need(a(0)?, value(Type::List(Box::new(val(&t.sort)?.clone()))))?;
                        need(a(1)?, t.sort.clone())?;
                        if !check::is_numeric_value(val(&t.sort)?) {
                            return Err("sum accumulator numeric sort".into());
                        }
                    }
                    "scan.acc" => {
                        arity(2)?;
                        need(a(0)?, t.sort.clone())?;
                        need(a(1)?, value(list(&t.sort)?.clone()))?;
                        if !check::is_number(list(&t.sort)?) {
                            return Err("scan accumulator numeric sort".into());
                        }
                    }
                    "list.insert" => {
                        arity(2)?;
                        need(a(1)?, t.sort.clone())?;
                        need(a(0)?, value(list(&t.sort)?.clone()))?;
                        if !check::is_word(list(&t.sort)?) {
                            return Err("sorted insertion integer sort".into());
                        }
                    }
                    "method:scan" | "method:sort" => {
                        arity(1)?;
                        need(a(0)?, t.sort.clone())?;
                        if !(if n == "method:scan" {
                            check::is_number(list(&t.sort)?)
                        } else {
                            check::is_word(list(&t.sort)?)
                        }) {
                            return Err("scan numeric / sort integer sort".into());
                        }
                    }
                    n if n.starts_with("binary:") => {
                        arity(2)?;
                        need(a(1)?, a(0)?.clone())?;
                        let ty = val(a(0)?)?;
                        let out = match &n[7..] {
                            "+" | "-" | "*" if check::is_numeric_value(ty) => a(0)?.clone(),
                            "<" | ">" | "<=" | ">=" if check::is_numeric_value(ty) => {
                                value(Type::Bool)
                            }
                            "==" | "!=" if !crate::local_collections::owned(ty,p) => {
                                value(Type::Bool)
                            }
                            "&&" | "||" if *ty == Type::Bool => value(Type::Bool),
                            _ => return Err("unsupported binary semantic operation".into()),
                        };
                        need(&t.sort, out)?;
                    }
                    n if ["call:vec2", "call:vec3", "call:vec4"].contains(&n) => {
                        let Type::Vector(x, k) = val(&t.sort)? else {
                            return Err("vector result sort".into());
                        };
                        if !matches!(**x, Type::U32 | Type::I32 | Type::F32)
                            || *k != n.as_bytes()[8] - b'0'
                        {
                            return Err("vector semantic sort".into());
                        }
                        arity(*k as usize)?;
                        for x_ in args {
                            need(&x_.sort, value((**x).clone()))?;
                        }
                    }
                    n if n.starts_with("record:") => {
                        let fields = p.records.get(&n[7..]).ok_or("unknown semantic record")?;
                        arity(fields.len())?;
                        need(&t.sort, value(Type::Named(n[7..].into())))?;
                        for (x, (_, ty)) in args.iter().zip(fields) {
                            need(&x.sort, value(ty.clone()))?;
                        }
                    }
                    n if n.starts_with("field:") => {
                        arity(1)?;
                        let field = &n[6..];
                        let ty = match val(a(0)?)? {
                            Type::Named(r) => p
                                .records
                                .get(r)
                                .and_then(|f| f.iter().find(|(n, _)| n == field))
                                .map(|(_, t)| t.clone())
                                .ok_or("semantic record field")?,
                            Type::Vector(x, k) => {
                                let i = ["x", "y", "z", "w"]
                                    .iter()
                                    .position(|n| *n == field)
                                    .ok_or("semantic vector field")?;
                                if i >= *k as usize {
                                    return Err("semantic vector field".into());
                                }
                                (**x).clone()
                            }
                            _ => return Err("semantic field receiver".into()),
                        };
                        need(&t.sort, value(ty))?;
                    }
                    n if n.starts_with("call:") => {
                        let f = p
                            .functions
                            .iter()
                            .find(|f| f.name == n[5..])
                            .ok_or("unknown semantic function")?;
                        arity(f.params.len())?;
                        need(&t.sort, value(f.result.clone()))?;
                        for (x, (_, ty)) in args.iter().zip(&f.params) {
                            need(&x.sort, value(ty.clone()))?;
                        }
                    }
                    _ => return Err(format!("unknown semantic operation {n}")),
                }
            }
        }
        Ok(())
    }
    fn sort(s: &Sort, p: &Program, b: &mut Budget, d: usize) -> LangResult<()> {
        b.step(d)?;
        match s {
            Sort::Value(Type::Unknown) => Err("unresolved semantic sort".into()),
            Sort::Value(t) => crate::statecheck::validate_type(t, p),
            Sort::Arrow(a, c) => {
                sort(a, p, b, d + 1)?;
                sort(c, p, b, d + 1)
            }
            Sort::Nat => Ok(()),
        }
    }
    sort(&t.sort, p, b, 0)?;
    for (name, ty) in env {
        if name.len() > 128 || name.is_empty() {
            return Err("semantic variable name limit".into());
        }
        sort(ty, p, b, 0)?;
    }
    walk(t, env, &mut vec![], p, b, 0)
}
/// Elaborate the exact executable AST. Numeric contexts and all lambda slots
/// follow the same type checker used by the interpreter and independent backends.
pub fn elaborate(e: &Expr, env: &check::Env, p: &Program, want: &Type) -> LangResult<Term> {
    fn go(
        e: &Expr,
        env: &check::Env,
        bound: &mut Vec<(String, Type)>,
        p: &Program,
        want: &Type,
        b: &mut Budget,
    ) -> LangResult<Term> {
        b.step(bound.len())?;
        check::infer_as(e, env, p, want)?;
        let s = value(want.clone());
        let mut recur = |e: &Expr, t: &Type| go(e, env, bound, p, t, b);
        match e {
            // Variant constructors are fixed value meanings (Option/Result).
            Expr::Var(n) if n == "None" && matches!(want, Type::Option(_)) => {
                Ok(op(s, "call:None", vec![]))
            }
            Expr::Var(n) => Ok(term(
                s,
                match bound.iter().rev().position(|(x, _)| x == n) {
                    Some(i) => Node::Bound(i),
                    None => Node::Free(n.clone()),
                },
            )),
            Expr::Num(n) => Ok(if *want == Type::F32 {
                term(s, Node::Float((*n as f32).to_bits()))
            } else {
                term(s, Node::Word(*n))
            }),
            Expr::Float(n) => Ok(term(s, Node::Float(*n))),
            Expr::Bool(x) => Ok(term(s, Node::Bool(*x))),
            Expr::String(x) => Ok(term(s, Node::String(x.clone()))),
            Expr::Unit => Ok(term(s, Node::Unit)),
            Expr::Neg(x) => {
                if *want == Type::I32 {
                    if let Expr::Num(n) = **x {
                        return Ok(word(Type::I32, (n as u32).wrapping_neg() as u64));
                    }
                }
                Ok(op(s, "neg", vec![recur(x, want)?]))
            }
            Expr::Binary(n, a, c) => {
                let hint = check::hint(a, env, p).or_else(|| check::hint(c, env, p));
                let ty = check::infer_context(
                    a,
                    env,
                    p,
                    if check::is_numeric_value(want) {
                        Some(want)
                    } else {
                        hint.as_ref()
                    },
                )?;
                Ok(op(
                    s,
                    &format!("binary:{n}"),
                    vec![recur(a, &ty)?, recur(c, &ty)?],
                ))
            }
            Expr::Let(n, t, a, c) => {
                let at = check::infer_context(a, env, p, t.as_deref())?;
                let initial = recur(a, &at)?;
                let mut local = env.clone();
                local.insert(n.clone(), at.clone());
                bound.push((n.clone(), at.clone()));
                let body = go(c, &local, bound, p, want, b)?;
                bound.pop();
                Ok(op(s, "apply", vec![lambda(value(at), body), initial]))
            }
            Expr::Record(n, fields) => {
                let args = p.records[n]
                    .iter()
                    .map(|(f, t)| recur(&fields.iter().find(|(n, _)| n == f).unwrap().1, t))
                    .collect::<LangResult<_>>()?;
                Ok(op(s, &format!("record:{n}"), args))
            }
            Expr::Field(x, n) => {
                if let Expr::Var(name)=x.as_ref() {
                    if !env.contains_key(name) {
                        if let Some(variants)=p.enums.get(name) {
                            let index=variants.iter().position(|variant|variant==n).ok_or("unknown semantic enum variant")?;
                            return Ok(op(s,&format!("enum:{name}:{index}"),vec![]));
                        }
                    }
                }
                let ty = check::infer(x, env, p)?;
                Ok(op(s, &format!("field:{n}"), vec![recur(x, &ty)?]))
            }
            Expr::Call(n, args) => {
                if n == "list" {
                    let Type::List(inner) = want else {
                        return Err("list constructor sort".into());
                    };
                    let mut tail = term(s.clone(), Node::Nil);
                    for item in args.iter().rev() {
                        tail = term(
                            s.clone(),
                            Node::Cons(Box::new(recur(item, inner)?), Box::new(tail)),
                        );
                    }
                    return Ok(tail);
                }
                let mut out = Vec::new();
                match n.as_str() {
                    "repeat_until" => {
                        out.push(recur(&args[0], &Type::U32)?);
                        out.push(recur(&args[1], want)?);
                        out.push(lam(
                            &args[2],
                            &[want.clone()],
                            &Type::Bool,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                        out.push(lam(
                            &args[3],
                            &[Type::U32, want.clone()],
                            want,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                    }
                    "buffer_fill" => {
                        let Type::Buffer(inner) = want else {
                            return Err("buffer fill sort".into());
                        };
                        out.push(recur(&args[0], &Type::U32)?);
                        out.push(recur(&args[1], inner)?);
                    }
                    "buffer" => {
                        let Type::Buffer(inner) = want else {
                            return Err("buffer result sort".into());
                        };
                        out.push(recur(&args[0], &Type::List(inner.clone()))?);
                    }
                    "length" => {
                        let ty = check::infer(&args[0], env, p)?;
                        out.push(recur(&args[0], &ty)?);
                    }
                    "repeat" => {
                        let Expr::Num(count) = args[0] else {
                            return Err("repeat count".into());
                        };
                        out.push(term(Sort::Nat, Node::Nat(count)));
                        out.push(recur(&args[1], want)?);
                        out.push(lam(
                            &args[2],
                            &[Type::U32, want.clone()],
                            want,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                    }
                    "Some" | "Ok" | "Err" => {
                        let inner = match (n.as_str(), want) {
                            ("Some", Type::Option(t))
                            | ("Ok", Type::Result(t, _))
                            | ("Err", Type::Result(_, t)) => (**t).clone(),
                            _ => return Err("variant constructor sort".into()),
                        };
                        if args.len() != 1 {
                            return Err("variant constructor arity".into());
                        }
                        out.push(recur(&args[0], &inner)?);
                    }
                    "choose" => {
                        out.push(recur(&args[0], &Type::Bool)?);
                        out.push(recur(&args[1], want)?);
                        out.push(recur(&args[2], want)?);
                    }
                    "quot_or" | "rem_or" => {
                        for x in args {
                            out.push(recur(x, want)?);
                        }
                    }
                    name if crate::word::primitive(name) => {
                        for (x, t) in args.iter().zip(crate::word::arguments(name, want)) {
                            out.push(recur(x, &t)?);
                        }
                    }
                    "Int" => {
                        let ty = check::infer(&args[0], env, p)?;
                        out.push(recur(&args[0], &ty)?);
                    }
                    "sum" | "count" => {
                        let hint = Type::List(Box::new(want.clone()));
                        let ty = check::infer_context(
                            &args[0],
                            env,
                            p,
                            if n == "sum" { Some(&hint) } else { None },
                        )?;
                        out.push(recur(&args[0], &ty)?);
                    }
                    "fold_until" => {
                        let ty = check::infer(&args[0], env, p)?;
                        let Type::List(item) = &ty else {
                            return Err("fold_until list type".into());
                        };
                        out.push(recur(&args[0], &ty)?);
                        out.push(recur(&args[1], want)?);
                        out.push(lam(
                            &args[2],
                            &[item.as_ref().clone(), want.clone()],
                            &Type::Bool,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                        out.push(lam(
                            &args[3],
                            &[item.as_ref().clone(), want.clone()],
                            want,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                    }
                    "foldr" | "foldl" => {
                        let ty = check::infer(&args[0], env, p)?;
                        let Type::List(item) = &ty else {
                            return Err("foldr list type".into());
                        };
                        out.push(recur(&args[0], &ty)?);
                        out.push(recur(&args[1], want)?);
                        out.push(lam(
                            &args[2],
                            &[item.as_ref().clone(), want.clone()],
                            want,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                    }
                    "vec2" | "vec3" | "vec4" => {
                        let Type::Vector(t, _) = want else {
                            return Err("vector sort".into());
                        };
                        for x in args {
                            out.push(recur(x, t)?);
                        }
                    }
                    _ => {
                        let f = p
                            .functions
                            .iter()
                            .find(|f| &f.name == n)
                            .ok_or("missing function")?;
                        for (x, (_, t)) in args.iter().zip(&f.params) {
                            out.push(recur(x, t)?);
                        }
                    }
                }
                Ok(op(s, &format!("call:{n}"), out))
            }
            Expr::Method(xs, n, args) => {
                if matches!(xs.as_ref(), Expr::Var(v) if v == "Buffer" || v == "Map") {
                    if n != "empty" || !args.is_empty() {
                        return Err("temporary constructor".into());
                    }
                    let name = if matches!(want, Type::Buffer(_)) {
                        "local:buffer-empty"
                    } else {
                        "local:map-empty"
                    };
                    return Ok(op(s, name, vec![]));
                }
                let ty = check::infer_context(
                    xs,
                    env,
                    p,
                    if matches!(n.as_str(), "filter" | "concat" | "take" | "drop") {
                        Some(want)
                    } else {
                        None
                    },
                )?;
                if matches!(ty, Type::Buffer(_) | Type::Map(..)) {
                    let mut out = vec![recur(xs, &ty)?];
                    if let Type::Buffer(inner) = &ty {
                        if n=="borrow_range" {
                            out.push(recur(&args[0],&Type::U32)?);
                            out.push(recur(&args[1],&Type::U32)?);
                            out.push(lam(&args[2],&[ty.clone()],want,env,bound,p,b)?);
                            return Ok(op(s,"method:borrow_range",out));
                        }
                        if ["map", "map_indexed", "filter"].contains(&n.as_str()) {
                            let params = if n != "map_indexed" {
                                vec![*inner.clone()]
                            } else {
                                vec![Type::U32, *inner.clone()]
                            };
                            out.push(lam(
                                &args[0],
                                &params,
                                if n == "filter" { &Type::Bool } else { inner },
                                env,
                                bound,
                                p,
                                b,
                            )?);
                            return Ok(op(s, &format!("method:{n}"), out));
                        }
                    }
                    let types = crate::owned_semantic::arguments(&ty, n)?;
                    if types.len() != args.len() {
                        return Err("temporary method arity".into());
                    }
                    for (arg, ty) in args.iter().zip(types) {
                        out.push(recur(arg, &ty)?);
                    }
                    return Ok(op(s, &format!("method:{n}"), out));
                }
                // Variant maps are folds that rebuild the variant.
                if matches!(ty, Type::Option(_) | Type::Result(..))
                    && ["map", "map_err", "ok_or"].contains(&n.as_str())
                    && args.len() == 1
                {
                    // Generated fold binders must not capture the error
                    // expression of ok_or or an enclosing lexical variable.
                    let fresh = |base: &str| {
                        let mut name = base.to_string();
                        while env.contains_key(&name) {
                            name.push('_');
                        }
                        name
                    };
                    let value = fresh("__ink_variant_value");
                    let other = fresh("__ink_variant_other");
                    let keep = |c: &str, x: &str| {
                        Expr::Lambda(x.into(), Box::new(Expr::Call(c.into(), vec![Expr::Var(x.into())])))
                    };
                    let wrap = |c: &str, f: &Expr| -> LangResult<Expr> {
                        let Expr::Lambda(x, body) = f else {
                            return Err("variant map requires a lambda".into());
                        };
                        Ok(Expr::Lambda(x.clone(), Box::new(Expr::Call(c.into(), vec![(**body).clone()]))))
                    };
                    let (yes, no) = match (&ty, n.as_str()) {
                        (Type::Option(_), "map") => (
                            wrap("Some", &args[0])?,
                            Expr::Lambda(other.clone(), Box::new(Expr::Var("None".into()))),
                        ),
                        (Type::Option(_), "ok_or") => (
                            keep("Ok", &value),
                            Expr::Lambda(other.clone(), Box::new(Expr::Call("Err".into(), vec![args[0].clone()]))),
                        ),
                        (Type::Result(..), "map") => (wrap("Ok", &args[0])?, keep("Err", &other)),
                        (Type::Result(..), "map_err") => (keep("Ok", &value), wrap("Err", &args[0])?),
                        _ => return Err("unsupported variant method".into()),
                    };
                    let folded = Expr::Method(xs.clone(), "fold".into(), vec![yes, no]);
                    return recur(&folded, want);
                }
                if n == "fold" {
                    let (yes, no) = match &ty {
                        Type::Option(inner) => ((**inner).clone(), Type::Unit),
                        Type::Result(yes, no) => ((**yes).clone(), (**no).clone()),
                        _ => return Err("fold receiver".into()),
                    };
                    if args.len() != 2 {
                        return Err("fold arity".into());
                    }
                    return Ok(op(
                        s,
                        "method:fold",
                        vec![
                            recur(xs, &ty)?,
                            lam(&args[0], &[yes], want, env, bound, p, b)?,
                            lam(&args[1], &[no], want, env, bound, p, b)?,
                        ],
                    ));
                }
                let Type::List(inner) = &ty else {
                    return Err("list receiver".into());
                };
                let receiver = recur(xs, &ty)?;
                let mut out = vec![receiver];
                match n.as_str() {
                    "concat" => out.push(recur(&args[0], &ty)?),
                    "take" | "drop" => out.push(recur(&args[0], &Type::U32)?),
                    "map" | "map_indexed" => {
                        let Type::List(output) = want else {
                            return Err("map output".into());
                        };
                        let params = if n == "map" {
                            vec![(**inner).clone()]
                        } else {
                            vec![Type::U32, (**inner).clone()]
                        };
                        out.push(lam(&args[0], &params, output, env, bound, p, b)?);
                    }
                    "filter" => out.push(lam(
                        &args[0],
                        &[(**inner).clone()],
                        &Type::Bool,
                        env,
                        bound,
                        p,
                        b,
                    )?),
                    "zip" => {
                        let other = check::infer(&args[0], env, p)?;
                        let Type::List(ot) = &other else {
                            return Err("zip list".into());
                        };
                        out.push(go(&args[0], env, bound, p, &other, b)?);
                        let Type::List(output) = want else {
                            return Err("zip output".into());
                        };
                        out.push(lam(
                            &args[1],
                            &[(**inner).clone(), (**ot).clone()],
                            output,
                            env,
                            bound,
                            p,
                            b,
                        )?);
                    }
                    "at_or" => {
                        out.push(go(&args[0], env, bound, p, &Type::U32, b)?);
                        out.push(go(&args[1], env, bound, p, inner, b)?);
                    }
                    "scan" | "sort" => {}
                    _ => return Err("unknown method".into()),
                }
                Ok(op(s, &format!("method:{n}"), out))
            }
            _ => Err("expression has no total-value semantic correspondence".into()),
        }
    }
    fn lam(
        e: &Expr,
        params: &[Type],
        result: &Type,
        env: &check::Env,
        bound: &mut Vec<(String, Type)>,
        p: &Program,
        b: &mut Budget,
    ) -> LangResult<Term> {
        if params.is_empty() {
            return go(e, env, bound, p, result, b);
        }
        let Expr::Lambda(n, body) = e else {
            return Err("expected executable lambda".into());
        };
        let mut local = env.clone();
        local.insert(n.clone(), params[0].clone());
        bound.push((n.clone(), params[0].clone()));
        let body = lam(body, &params[1..], result, &local, bound, p, b)?;
        bound.pop();
        Ok(lambda(value(params[0].clone()), body))
    }
    let out = go(e, env, &mut vec![], p, want, &mut Budget::new())?;
    validate(
        &out,
        &env.iter()
            .map(|(n, t)| (n.clone(), value(t.clone())))
            .collect(),
        p,
        &mut Budget::new(),
    )?;
    Ok(out)
}
/// Reification is checked again against the executable module before admission.
pub fn reify(t: &Term, p: &Program) -> LangResult<Expr> {
    // A partially applied known callback reifies to value bindings enclosing a
    // lambda. Push the next application through those bindings, preserving
    // left-to-right evaluation and evaluating each argument exactly once. No
    // function value or algorithm-specific beta rewrite enters executable IR.
    fn application(
        function: Expr,
        argument: Expr,
        parameter: &Type,
        depth: usize,
    ) -> LangResult<Expr> {
        if depth > 256 {
            return Err("callback application reification depth limit".into());
        }
        match function {
            Expr::Lambda(name, body) => Ok(Expr::Let(
                name,
                Some(Box::new(parameter.clone())),
                Box::new(argument),
                body,
            )),
            Expr::Let(name, annotation, initial, body) => Ok(Expr::Let(
                name,
                annotation,
                initial,
                Box::new(application(*body, argument, parameter, depth + 1)?),
            )),
            _ => Err("unresolved function hole cannot execute".into()),
        }
    }
    fn go(t: &Term, bound: &mut Vec<String>, free: &[String], p: &Program) -> LangResult<Expr> {
        Ok(match &t.node {
            Node::Free(n) => Expr::Var(n.clone()),
            Node::Bound(i) => Expr::Var(
                bound
                    .iter()
                    .rev()
                    .nth(*i)
                    .ok_or("unbound reification")?
                    .clone(),
            ),
            Node::Word(n) => {
                if t.sort == value(Type::Int) {
                    // A source literal already acquires Int from its checked
                    // context. Adding an Int() conversion changes the exact
                    // semantic tree and breaks portable definition replay.
                    Expr::Num(*n)
                } else if t.sort == value(Type::I32) && *n > i32::MAX as u64 {
                    Expr::Neg(Box::new(Expr::Num(
                        ((*n as u32) as i32).unsigned_abs() as u64
                    )))
                } else {
                    Expr::Num(*n)
                }
            }
            Node::Float(n) => {
                if !f32::from_bits(*n).is_finite() {
                    return Err("nonfinite source literal".into());
                }
                Expr::Float(*n)
            }
            Node::Bool(x) => Expr::Bool(*x),
            Node::String(x) => Expr::String(x.clone()),
            Node::Unit => Expr::Unit,
            Node::Nat(n) => Expr::Num(*n),
            Node::Lambda(body) => {
                let mut name = format!("__ink_bound_{}", bound.len());
                while free.contains(&name) || bound.contains(&name) {
                    name.push('_')
                }
                bound.push(name.clone());
                let body = go(body, bound, free, p)?;
                bound.pop();
                Expr::Lambda(name, Box::new(body))
            }
            Node::Op(n, a) => {
                let args = a
                    .iter()
                    .map(|x| go(x, bound, free, p))
                    .collect::<LangResult<Vec<_>>>()?;
                if let Some(literal)=n.strip_prefix("enum:") {
                    let (name,index)=literal.rsplit_once(':').ok_or("reified enum literal")?;
                    let index:usize=index.parse().map_err(|_|"reified enum index")?;
                    let variant=p.enums.get(name).and_then(|variants|variants.get(index)).ok_or("unknown reified enum variant")?;
                    return Ok(Expr::Field(Box::new(Expr::Var(name.into())),variant.clone()));
                } else if n == "value:equal" {
                    return Ok(Expr::Binary("==".into(),Box::new(Expr::Call("list".into(),vec![args[0].clone()])),Box::new(Expr::Call("list".into(),vec![args[1].clone()]))));
                } else if n == "nat.word" {
                    let Node::Nat(k) = a[0].node else {
                        return Err("nonliteral natural cannot execute".into());
                    };
                    let literal = word(
                        val(&t.sort)?.clone(),
                        if t.sort == value(Type::U64) {
                            k
                        } else {
                            k as u32 as u64
                        },
                    );
                    return go(&literal, bound, free, p);
                }
                if n == "local:buffer-empty" || n == "local:map-empty" {
                    Expr::Method(
                        Box::new(Expr::Var(
                            if n == "local:buffer-empty" {
                                "Buffer"
                            } else {
                                "Map"
                            }
                            .into(),
                        )),
                        "empty".into(),
                        vec![],
                    )
                } else if n.starts_with("binary:") {
                    Expr::Binary(
                        n[7..].into(),
                        Box::new(args[0].clone()),
                        Box::new(args[1].clone()),
                    )
                } else if n == "neg" {
                    Expr::Neg(Box::new(args[0].clone()))
                } else if n == "apply" {
                    let Sort::Arrow(x, _) = &a[0].sort else {
                        return Err("apply sort".into());
                    };
                    application(args[0].clone(), args[1].clone(), val(x)?, 0)?
                } else if n == "call:None" {
                    // Checked source already supplies the constructor's type
                    // through its enclosing expression or an explicit typed
                    // binding. Inserting another binding changes the exact
                    // semantic tree and prevents portable definition replay.
                    Expr::Var("None".into())
                } else if n.starts_with("call:") {
                    Expr::Call(n[5..].into(), args)
                } else if n.starts_with("method:") {
                    let mut receiver = args[0].clone();
                    let mut env = check::Env::new();
                    fn environment(t: &Term, bound: &[String], local: usize, env: &mut check::Env) {
                        if let Sort::Value(ty) = &t.sort {
                            let name = match &t.node {
                                Node::Free(name) => Some(name),
                                Node::Bound(index) if *index >= local => {
                                    bound.iter().rev().nth(index - local)
                                }
                                _ => None,
                            };
                            if let Some(name) = name {
                                env.insert(name.clone(), ty.clone());
                            }
                        }
                        for child in children(t) {
                            environment(
                                child,
                                bound,
                                local + usize::from(matches!(t.node, Node::Lambda(_))),
                                env,
                            );
                        }
                    }
                    environment(&a[0], bound, 0, &mut env);
                    let ty = val(&a[0].sort)?;
                    if check::infer(&receiver, &env, p).as_ref() != Ok(ty) {
                        // Proof-produced empty receivers may need a type that
                        // ordinary source supplied through a binding. Insert
                        // one only when inference actually needs it, keeping
                        // captured source definitions exact on round trip.
                        let mut name = "__ink_receiver".to_string();
                        while free.contains(&name) || bound.contains(&name) {
                            name.push('_');
                        }
                        receiver = Expr::Let(
                            name.clone(),
                            Some(Box::new(ty.clone())),
                            Box::new(receiver),
                            Box::new(Expr::Var(name)),
                        );
                    }
                    Expr::Method(Box::new(receiver), n[7..].into(), args[1..].to_vec())
                } else if n.starts_with("field:") {
                    Expr::Field(Box::new(args[0].clone()), n[6..].into())
                } else if n.starts_with("record:") {
                    let fields = p.records.get(&n[7..]).ok_or("unknown reified record")?;
                    Expr::Record(
                        n[7..].into(),
                        fields
                            .iter()
                            .zip(args)
                            .map(|((n, _), a)| (n.clone(), a))
                            .collect(),
                    )
                } else {
                    return Err("proof-only semantic operation cannot execute".into());
                }
            }
            Node::Nil => Expr::Call("list".into(), vec![]),
            Node::Cons(..) => {
                let mut heads = Vec::new();
                let mut tail = t;
                while let Node::Cons(head, rest) = &tail.node {
                    heads.push(go(head, bound, free, p)?);
                    tail = rest;
                }
                let literal = Expr::Call("list".into(), heads);
                if matches!(tail.node, Node::Nil) {
                    literal
                } else {
                    Expr::Method(
                        Box::new(literal),
                        "concat".into(),
                        vec![go(tail, bound, free, p)?],
                    )
                }
            }
        })
    }
    fn names(t: &Term, out: &mut Vec<String>) {
        if let Node::Free(n) = &t.node {
            out.push(n.clone())
        }
        for x in children(t) {
            names(x, out)
        }
    }
    let mut free = vec![];
    names(t, &mut free);
    go(t, &mut vec![], &free, p)
}
/// Turn a local binder context into fresh universal parameters while checking
/// an application, then restore exactly those binders after instantiation.
pub fn open_scope(t: &Term, names: &[(String, Sort)], b: &mut Budget) -> LangResult<Term> {
    fn go(t: &Term, names: &[(String, Sort)], local: usize, b: &mut Budget) -> LangResult<Term> {
        b.step(local)?;
        if let Node::Bound(i) = t.node {
            if i >= local {
                let (n, s) = names
                    .iter()
                    .rev()
                    .nth(i - local)
                    .ok_or("invalid local binder")?;
                if &t.sort != s {
                    return Err("local binder sort mismatch".into());
                }
                return Ok(free(s.clone(), n));
            }
        }
        try_map_children(t, |c| {
            go(
                c,
                names,
                local + usize::from(matches!(t.node, Node::Lambda(_))),
                b,
            )
        })
    }
    go(t, names, 0, b)
}
pub fn close_scope(t: &Term, names: &[(String, Sort)], b: &mut Budget) -> LangResult<Term> {
    fn go(t: &Term, names: &[(String, Sort)], local: usize, b: &mut Budget) -> LangResult<Term> {
        b.step(local)?;
        if let Node::Free(n) = &t.node {
            if let Some(i) = names.iter().rev().position(|(x, _)| x == n) {
                return Ok(term(t.sort.clone(), Node::Bound(local + i)));
            }
        }
        try_map_children(t, |c| {
            go(
                c,
                names,
                local + usize::from(matches!(t.node, Node::Lambda(_))),
                b,
            )
        })
    }
    go(t, names, 0, b)
}
