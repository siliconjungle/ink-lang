//! General equality checking on executable semantic terms. Search and laws are
//! external. Conditions are equations with proof obligations, never profile facts.
use crate::{
    core::{Program, Type},
    semantic::{self as s, *},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Equation {
    pub from: Term,
    pub to: Term,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Proof {
    AssertEquality {
        equality: Equation,
        premise: Box<Proof>,
        body: Box<Proof>,
    },
    Normalize,
    Hypothesis(usize),
    Sym(Box<Proof>),
    Trans {
        middle: Term,
        left: Box<Proof>,
        right: Box<Proof>,
    },
    Congruence(Vec<Proof>),
    Use {
        law: String,
        arguments: BTreeMap<String, Term>,
        premises: Vec<Proof>,
    },
    Cases {
        condition: Term,
        on_false: Box<Proof>,
        on_true: Box<Proof>,
    },
    Induction {
        variable: String,
        names: Vec<String>,
        base: Box<Proof>,
        step: Box<Proof>,
    },
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Law {
    pub schema: u32,
    pub semantics: String,
    pub params: Env,
    pub conditions: Vec<Equation>,
    pub from: Term,
    pub to: Term,
    pub proof: Proof,
    pub dependencies: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalogue {
    pub schema: u32,
    pub semantics: String,
    pub roots: Vec<String>,
    pub objects: BTreeMap<String, Law>,
}
pub const SEMANTICS: &str = "ink-conditional-laws-v1";
pub fn identity<T: Serialize>(v: &T) -> LangResult<String> {
    use sha2::{Digest, Sha256};
    Ok(format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(v).map_err(|e| e.to_string())?)
    ))
}
#[derive(Debug)]
pub struct CheckedCatalogue {
    laws: BTreeMap<String, Law>,
    roots: Vec<String>,
    sha256: String,
    program_sha256: String,
}
impl CheckedCatalogue {
    pub fn roots(&self) -> &[String] {
        &self.roots
    }
    pub fn identity(&self) -> &str {
        &self.sha256
    }
    pub fn law(&self, id: &str) -> LangResult<&Law> {
        self.laws
            .get(id)
            .ok_or("law is not in checked dependency closure".into())
    }
    pub fn closure(&self) -> Vec<String> {
        self.laws.keys().cloned().collect()
    }
    pub fn check(c: &Catalogue, p: &Program) -> LangResult<Self> {
        if c.schema != 1
            || c.semantics != SEMANTICS
            || c.objects.len() > 1024
            || c.roots.len() > 1024
        {
            return Err("incompatible or oversized law catalogue".into());
        }
        if serde_json::to_vec(c).map_err(|e| e.to_string())?.len() > 16_000_000 {
            return Err("law catalogue byte limit".into());
        }
        crate::core::CheckedModule::from_source(p.clone())?;
        let mut checked = Self {
            laws: BTreeMap::new(),
            roots: c.roots.clone(),
            sha256: identity(c)?,
            program_sha256: identity(p)?,
        };
        let mut active = BTreeSet::new();
        let mut budget = Budget::new();
        fn load(
            id: &str,
            c: &Catalogue,
            out: &mut CheckedCatalogue,
            active: &mut BTreeSet<String>,
            p: &Program,
            b: &mut Budget,
            d: usize,
        ) -> LangResult<()> {
            b.step(d)?;
            if out.laws.contains_key(id) {
                return Ok(());
            }
            if !active.insert(id.into()) {
                return Err("cyclic law dependencies".into());
            }
            let law = c.objects.get(id).ok_or("missing law dependency")?;
            if crate::registry::identity(&crate::registry::Entry::from_law(law)?)? != *id {
                return Err("law content identity mismatch".into());
            }
            if law.schema != 1
                || law.semantics != SEMANTICS
                || law.params.len() > 128
                || law.conditions.len() > 128
                || law.dependencies.len() > 128
            {
                return Err("incompatible or oversized law".into());
            }
            let mut imports = CheckedCatalogue {
                laws: BTreeMap::new(),
                roots: vec![],
                sha256: String::new(),
                program_sha256: out.program_sha256.clone(),
            };
            for dep in &law.dependencies {
                load(dep, c, out, active, p, b, d + 1)?;
                imports.laws.insert(dep.clone(), out.law(dep)?.clone());
            }
            // Only explicit direct imports are available while checking this law.
            imports.prove(
                p,
                &law.params,
                &law.conditions,
                &Equation {
                    from: law.from.clone(),
                    to: law.to.clone(),
                },
                &law.proof,
                b,
                0,
            )?;
            out.laws.insert(id.into(), law.clone());
            active.remove(id);
            Ok(())
        }
        for id in &c.roots {
            load(id, c, &mut checked, &mut active, p, &mut budget, 0)?;
        }
        Ok(checked)
    }
    pub fn prove(
        &self,
        p: &Program,
        env: &Env,
        hyp: &[Equation],
        goal: &Equation,
        proof: &Proof,
        b: &mut Budget,
        d: usize,
    ) -> LangResult<()> {
        if identity(p)? != self.program_sha256 {
            return Err("checked laws belong to a different executable definition context".into());
        }
        self.prove_inner(p, env, hyp, goal, proof, b, d)
    }
    fn prove_inner(
        &self,
        p: &Program,
        env: &Env,
        hyp: &[Equation],
        goal: &Equation,
        proof: &Proof,
        b: &mut Budget,
        d: usize,
    ) -> LangResult<()> {
        b.step(d)?;
        validate(&goal.from, env, p, b)?;
        validate(&goal.to, env, p, b)?;
        if goal.from.sort != goal.to.sort {
            return Err("equality endpoint sort mismatch".into());
        }
        for h in hyp {
            validate(&h.from, env, p, b)?;
            validate(&h.to, env, p, b)?;
            if h.from.sort != h.to.sort {
                return Err("condition sort mismatch".into());
            }
        }
        match proof {
            Proof::AssertEquality {
                equality,
                premise,
                body,
            } => {
                if !matches!(&equality.from.sort,Sort::Value(t) if check_word(t)||*t==Type::Bool) {
                    return Err("numeric float equality does not imply bit-pattern equality".into());
                }
                let proposition = op(
                    value(Type::Bool),
                    "binary:==",
                    vec![equality.from.clone(), equality.to.clone()],
                );
                self.prove_inner(
                    p,
                    env,
                    hyp,
                    &Equation {
                        from: proposition,
                        to: term(value(Type::Bool), Node::Bool(true)),
                    },
                    premise,
                    b,
                    d + 1,
                )?;
                let mut local = hyp.to_vec();
                local.push(equality.clone());
                self.prove_inner(p, env, &local, goal, body, b, d + 1)
            }
            Proof::Normalize => {
                if equivalent(&goal.from, &goal.to, hyp, p, b, 0)? {
                    Ok(())
                } else {
                    Err("semantic normal forms differ".into())
                }
            }
            Proof::Hypothesis(i) => {
                let h = hyp.get(*i).ok_or("condition index out of range")?;
                if h == goal {
                    Ok(())
                } else {
                    Err("condition does not establish goal".into())
                }
            }
            Proof::Sym(proof) => self.prove_inner(
                p,
                env,
                hyp,
                &Equation {
                    from: goal.to.clone(),
                    to: goal.from.clone(),
                },
                proof,
                b,
                d + 1,
            ),
            Proof::Trans {
                middle,
                left,
                right,
            } => {
                self.prove_inner(
                    p,
                    env,
                    hyp,
                    &Equation {
                        from: goal.from.clone(),
                        to: middle.clone(),
                    },
                    left,
                    b,
                    d + 1,
                )?;
                self.prove_inner(
                    p,
                    env,
                    hyp,
                    &Equation {
                        from: middle.clone(),
                        to: goal.to.clone(),
                    },
                    right,
                    b,
                    d + 1,
                )
            }
            Proof::Congruence(proofs) => {
                let mut from = goal.from.clone();
                let mut to = goal.to.clone();
                let mut local = env.clone();
                if let (Node::Lambda(a), Node::Lambda(c)) = (&from.node, &to.node) {
                    let Sort::Arrow(x, _) = &from.sort else {
                        return Err("lambda congruence".into());
                    };
                    let name = fresh(env, "__congruence");
                    let arg = free((**x).clone(), &name);
                    local.insert(name, arg.sort.clone());
                    from = beta(a, &arg, b)?;
                    to = beta(c, &arg, b)?;
                    if proofs.len() != 1 {
                        return Err("lambda congruence arity".into());
                    }
                    return self.prove_inner(
                        p,
                        &local,
                        hyp,
                        &Equation { from, to },
                        &proofs[0],
                        b,
                        d + 1,
                    );
                }
                if !same_head(&from, &to) || children(&from).len() != proofs.len() {
                    return Err("congruence structure mismatch".into());
                }
                for ((a, c), proof) in children(&from).into_iter().zip(children(&to)).zip(proofs) {
                    self.prove_inner(
                        p,
                        &local,
                        hyp,
                        &Equation {
                            from: a.clone(),
                            to: c.clone(),
                        },
                        proof,
                        b,
                        d + 1,
                    )?;
                }
                Ok(())
            }
            Proof::Use {
                law,
                arguments,
                premises,
            } => {
                let law = self.law(law)?;
                if arguments.len() != law.params.len() || premises.len() != law.conditions.len() {
                    return Err("law instantiation arity".into());
                }
                for (n, sort) in &law.params {
                    let arg = arguments.get(n).ok_or("missing law argument")?;
                    validate(arg, env, p, b)?;
                    if &arg.sort != sort {
                        return Err("law argument sort mismatch".into());
                    }
                }
                let from = substitute(&law.from, arguments, b)?;
                let to = substitute(&law.to, arguments, b)?;
                if from != goal.from || to != goal.to {
                    return Err("law does not match exact application endpoints".into());
                }
                for (condition, proof) in law.conditions.iter().zip(premises) {
                    self.prove_inner(
                        p,
                        env,
                        hyp,
                        &sub_equation(condition, arguments, b)?,
                        proof,
                        b,
                        d + 1,
                    )?;
                }
                Ok(())
            }
            Proof::Cases {
                condition,
                on_false,
                on_true,
            } => {
                validate(condition, env, p, b)?;
                if condition.sort != value(Type::Bool) {
                    return Err("case condition must be Bool".into());
                }
                for (flag, proof) in [(false, on_false), (true, on_true)] {
                    let mut local = hyp.to_vec();
                    local.push(Equation {
                        from: condition.clone(),
                        to: term(value(Type::Bool), Node::Bool(flag)),
                    });
                    self.prove_inner(p, env, &local, goal, proof, b, d + 1)?;
                }
                Ok(())
            }
            Proof::Induction {
                variable,
                names,
                base,
                step,
            } => {
                let sort = env.get(variable).ok_or("missing induction variable")?;
                if hyp
                    .iter()
                    .any(|h| occurs(&h.from, variable) || occurs(&h.to, variable))
                {
                    return Err("induction needs premises independent of its variable".into());
                }
                if names.iter().any(|n| env.contains_key(n))
                    || names.iter().collect::<BTreeSet<_>>().len() != names.len()
                {
                    return Err("induction binders must be fresh".into());
                }
                let mut local = env.clone();
                local.remove(variable);
                let (zero, next, ih_arg) = match sort {
                    Sort::Nat if names.len() == 1 => {
                        let n = free(Sort::Nat, &names[0]);
                        local.insert(names[0].clone(), Sort::Nat);
                        (
                            term(Sort::Nat, Node::Nat(0)),
                            op(Sort::Nat, "nat.succ", vec![n.clone()]),
                            n,
                        )
                    }
                    Sort::Value(Type::List(x)) if names.len() == 2 => {
                        let h = free(value((**x).clone()), &names[0]);
                        let tail = free(sort.clone(), &names[1]);
                        local.insert(names[0].clone(), h.sort.clone());
                        local.insert(names[1].clone(), sort.clone());
                        (
                            term(sort.clone(), Node::Nil),
                            term(
                                sort.clone(),
                                Node::Cons(Box::new(h), Box::new(tail.clone())),
                            ),
                            tail,
                        )
                    }
                    _ => {
                        return Err(
                            "induction requires natural or list sort and matching binders".into(),
                        )
                    }
                };
                let sub = |arg: Term| BTreeMap::from([(variable.clone(), arg)]);
                self.prove_inner(
                    p,
                    &local,
                    hyp,
                    &sub_equation(goal, &sub(zero), b)?,
                    base,
                    b,
                    d + 1,
                )?;
                let mut hs = hyp.to_vec();
                hs.push(sub_equation(goal, &sub(ih_arg), b)?);
                self.prove_inner(
                    p,
                    &local,
                    &hs,
                    &sub_equation(goal, &sub(next), b)?,
                    step,
                    b,
                    d + 1,
                )
            }
        }
    }
}
fn fresh(env: &Env, base: &str) -> String {
    let mut n = base.to_string();
    while env.contains_key(&n) {
        n.push('_')
    }
    n
}
pub fn sub_equation(
    e: &Equation,
    args: &BTreeMap<String, Term>,
    b: &mut Budget,
) -> LangResult<Equation> {
    Ok(Equation {
        from: substitute(&e.from, args, b)?,
        to: substitute(&e.to, args, b)?,
    })
}
fn occurs(t: &Term, n: &str) -> bool {
    matches!(&t.node,Node::Free(x) if x==n) || children(t).iter().any(|x| occurs(x, n))
}
fn same_head(a: &Term, b: &Term) -> bool {
    if a.sort != b.sort {
        return false;
    }
    match (&a.node, &b.node) {
        (Node::Op(n, a), Node::Op(m, b)) => n == m && a.len() == b.len(),
        (Node::Lambda(_), Node::Lambda(_)) | (Node::Cons(..), Node::Cons(..)) => true,
        _ => a == b,
    }
}
fn apply(f: Term, arg: Term) -> LangResult<Term> {
    let Sort::Arrow(_, out) = &f.sort else {
        return Err("semantic application".into());
    };
    Ok(op((**out).clone(), "apply", vec![f, arg]))
}
fn zero(t: &Sort) -> LangResult<Term> {
    Ok(match t {
        Sort::Value(Type::F32) => term(t.clone(), Node::Float(0)),
        Sort::Value(t) if check_word(t) => word(t.clone(), 0),
        _ => return Err("zero numeric sort".into()),
    })
}
fn check_word(t: &Type) -> bool {
    crate::check::is_word(t)
}
fn normal(t: &Term, hyp: &[Equation], p: &Program, b: &mut Budget, d: usize) -> LangResult<Term> {
    b.step(d)?;
    let mut out = t.clone();
    for (i, c) in children(t).into_iter().enumerate() {
        out = replace_child(&out, i, normal(c, hyp, p, b, d + 1)?)?;
    }
    // Equality premises are oriented local facts. Match only exact typed terms.
    for h in hyp {
        if out == h.from && h.from != h.to {
            return normal(&h.to, &[], p, b, d + 1);
        }
    }
    let Node::Op(n, a) = &out.node else {
        return Ok(out);
    };
    let again = |t: &Term, b: &mut Budget| normal(t, hyp, p, b, d + 1);
    let reduced = match (n.as_str(), a.as_slice()) {
        ("apply", [f, x]) => {
            if let Node::Lambda(body) = &f.node {
                Some(beta(body, x, b)?)
            } else {
                None
            }
        }
        ("nat.succ", [x]) => {
            if let Node::Nat(n) = x.node {
                n.checked_add(1).map(|n| term(Sort::Nat, Node::Nat(n)))
            } else {
                None
            }
        }
        ("nat.word", [x]) => match &x.node {
            Node::Nat(n) => Some(word(
                match &out.sort {
                    Sort::Value(t) => t.clone(),
                    _ => return Err("word sort".into()),
                },
                if out.sort == value(Type::U64) {
                    *n
                } else {
                    *n as u32 as u64
                },
            )),
            Node::Op(n, a) if n == "nat.succ" => Some(op(
                out.sort.clone(),
                "binary:+",
                vec![
                    op(out.sort.clone(), "nat.word", vec![a[0].clone()]),
                    word(
                        match &out.sort {
                            Sort::Value(t) => t.clone(),
                            _ => return Err("word sort".into()),
                        },
                        1,
                    ),
                ],
            )),
            _ => None,
        },
        ("binary:&&", [c, x]) => match c.node {
            Node::Bool(false) => Some(c.clone()),
            Node::Bool(true) => Some(x.clone()),
            _ => None,
        },
        ("binary:||", [c, x]) => match c.node {
            Node::Bool(true) => Some(c.clone()),
            Node::Bool(false) => Some(x.clone()),
            _ => None,
        },
        ("call:choose", [c, a, e]) => match c.node {
            Node::Bool(true) => Some(a.clone()),
            Node::Bool(false) => Some(e.clone()),
            _ if a == e => Some(a.clone()),
            _ => None,
        },
        ("call:repeat", [count, init, f]) => {
            let previous = match &count.node {
                Node::Nat(0) => return again(init, b),
                Node::Nat(n) => Some(term(Sort::Nat, Node::Nat(n - 1))),
                Node::Op(n, a) if n == "nat.succ" => Some(a[0].clone()),
                _ => None,
            };
            if let Some(prev) = previous {
                let rest = op(
                    out.sort.clone(),
                    "call:repeat",
                    vec![prev.clone(), init.clone(), f.clone()],
                );
                Some(apply(
                    apply(f.clone(), op(value(Type::U32), "nat.word", vec![prev]))?,
                    rest,
                )?)
            } else {
                None
            }
        }
        ("method:map", [xs, f]) => match &xs.node {
            Node::Nil => Some(term(out.sort.clone(), Node::Nil)),
            Node::Cons(h, t) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    Box::new(apply(f.clone(), (**h).clone())?),
                    Box::new(op(out.sort.clone(), n, vec![(**t).clone(), f.clone()])),
                ),
            )),
            _ => None,
        },
        ("method:filter", [xs, f]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, t) => {
                let rest = op(out.sort.clone(), n, vec![(**t).clone(), f.clone()]);
                Some(op(
                    out.sort.clone(),
                    "call:choose",
                    vec![
                        apply(f.clone(), (**h).clone())?,
                        term(
                            out.sort.clone(),
                            Node::Cons(h.clone(), Box::new(rest.clone())),
                        ),
                        rest,
                    ],
                ))
            }
            _ => None,
        },
        ("call:count", [xs]) => match &xs.node {
            Node::Nil => Some(word(Type::U64, 0)),
            Node::Cons(_, t) => Some(op(
                out.sort.clone(),
                "binary:+",
                vec![
                    word(Type::U64, 1),
                    op(out.sort.clone(), n, vec![(**t).clone()]),
                ],
            )),
            _ => None,
        },
        ("call:sum", [xs]) if out.sort == value(Type::F32) => Some(op(
            out.sort.clone(),
            "sum.acc",
            vec![xs.clone(), zero(&out.sort)?],
        )),
        ("sum.acc", [xs, initial]) => match &xs.node {
            Node::Nil => Some(initial.clone()),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                n,
                vec![
                    (**t).clone(),
                    op(
                        out.sort.clone(),
                        "binary:+",
                        vec![initial.clone(), (**h).clone()],
                    ),
                ],
            )),
            _ => None,
        },
        ("call:sum", [xs]) if out.sort != value(Type::F32) => match &xs.node {
            Node::Nil => Some(zero(&out.sort)?),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                "binary:+",
                vec![(**h).clone(), op(out.sort.clone(), n, vec![(**t).clone()])],
            )),
            _ => None,
        },
        ("call:foldr", [xs, init, f]) => match &xs.node {
            Node::Nil => Some(init.clone()),
            Node::Cons(h, t) => Some(apply(
                apply(f.clone(), (**h).clone())?,
                op(
                    out.sort.clone(),
                    n,
                    vec![(**t).clone(), init.clone(), f.clone()],
                ),
            )?),
            _ => None,
        },
        ("method:zip", [xs, ys, f]) => match (&xs.node, &ys.node) {
            (Node::Nil, _) | (_, Node::Nil) => Some(term(out.sort.clone(), Node::Nil)),
            (Node::Cons(x, xs), Node::Cons(y, ys)) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    Box::new(apply(apply(f.clone(), (**x).clone())?, (**y).clone())?),
                    Box::new(op(
                        out.sort.clone(),
                        n,
                        vec![(**xs).clone(), (**ys).clone(), f.clone()],
                    )),
                ),
            )),
            _ => None,
        },
        ("method:map_indexed", [xs, f]) => Some(op(
            out.sort.clone(),
            "indexed.from",
            vec![xs.clone(), term(Sort::Nat, Node::Nat(0)), f.clone()],
        )),
        ("indexed.from", [xs, index, f]) => match &xs.node {
            Node::Nil => Some(term(out.sort.clone(), Node::Nil)),
            Node::Cons(h, t) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    Box::new(apply(
                        apply(
                            f.clone(),
                            op(value(Type::U32), "nat.word", vec![index.clone()]),
                        )?,
                        (**h).clone(),
                    )?),
                    Box::new(op(
                        out.sort.clone(),
                        n,
                        vec![
                            (**t).clone(),
                            op(Sort::Nat, "nat.succ", vec![index.clone()]),
                            f.clone(),
                        ],
                    )),
                ),
            )),
            _ => None,
        },
        ("method:scan", [xs]) => {
            let Sort::Value(Type::List(t)) = &out.sort else {
                return Err("scan sort".into());
            };
            Some(op(
                out.sort.clone(),
                "scan.acc",
                vec![xs.clone(), word((**t).clone(), 0)],
            ))
        }
        ("scan.acc", [xs, initial]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, t) => {
                let head = op(
                    initial.sort.clone(),
                    "binary:+",
                    vec![initial.clone(), (**h).clone()],
                );
                Some(term(
                    out.sort.clone(),
                    Node::Cons(
                        Box::new(head.clone()),
                        Box::new(op(out.sort.clone(), n, vec![(**t).clone(), head])),
                    ),
                ))
            }
            _ => None,
        },
        ("method:sort", [xs]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                "list.insert",
                vec![(**h).clone(), op(out.sort.clone(), n, vec![(**t).clone()])],
            )),
            _ => None,
        },
        ("list.insert", [x, xs]) => match &xs.node {
            Node::Nil => Some(term(
                out.sort.clone(),
                Node::Cons(Box::new(x.clone()), Box::new(xs.clone())),
            )),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                "call:choose",
                vec![
                    op(
                        value(Type::Bool),
                        "binary:<=",
                        vec![x.clone(), (**h).clone()],
                    ),
                    term(
                        out.sort.clone(),
                        Node::Cons(Box::new(x.clone()), Box::new(xs.clone())),
                    ),
                    term(
                        out.sort.clone(),
                        Node::Cons(
                            h.clone(),
                            Box::new(op(out.sort.clone(), n, vec![x.clone(), (**t).clone()])),
                        ),
                    ),
                ],
            )),
            _ => None,
        },
        ("method:at_or", [xs, index, fallback]) => match (&xs.node, &index.node) {
            (Node::Nil, _) => Some(fallback.clone()),
            (Node::Cons(h, _), Node::Word(0)) => Some((**h).clone()),
            (Node::Cons(_, t), Node::Word(i)) => Some(op(
                out.sort.clone(),
                n,
                vec![(**t).clone(), word(Type::U32, i - 1), fallback.clone()],
            )),
            _ => None,
        },
        ("call:quot_or" | "call:rem_or", [_, divisor, fallback])
            if divisor.node == Node::Word(0) =>
        {
            Some(fallback.clone())
        }
        (n, [x]) if n.starts_with("field:") => {
            if let Node::Op(name, args) = &x.node {
                let idx = if name.starts_with("record:") {
                    p.records
                        .get(&name[7..])
                        .and_then(|fs| fs.iter().position(|(field, _)| field == &n[6..]))
                } else if name.starts_with("call:vec") {
                    ["x", "y", "z", "w"]
                        .iter()
                        .position(|field| *field == &n[6..])
                } else {
                    None
                };
                idx.and_then(|i| args.get(i).cloned())
            } else {
                None
            }
        }
        (n, args) if n.starts_with("call:") => {
            if let Some(f) = p.functions.iter().find(|f| f.name == n[5..]) {
                let body =
                    s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
                Some(substitute(
                    &body,
                    &f.params
                        .iter()
                        .zip(args)
                        .map(|((n, _), t)| (n.clone(), t.clone()))
                        .collect(),
                    b,
                )?)
            } else {
                None
            }
        }
        _ => None,
    };
    if let Some(t) = reduced {
        return again(&t, b);
    }
    if let Some(t) = literal_primitive(&out, p, b)? {
        return Ok(t);
    }
    Ok(out)
}
fn literal_primitive(t: &Term, p: &Program, b: &mut Budget) -> LangResult<Option<Term>> {
    let Node::Op(n, args) = &t.node else {
        return Ok(None);
    };
    if !(n.starts_with("binary:") || n == "neg" || n == "call:quot_or" || n == "call:rem_or") {
        return Ok(None);
    }
    if !args
        .iter()
        .all(|a| matches!(a.node, Node::Word(_) | Node::Float(_) | Node::Bool(_)))
    {
        return Ok(None);
    }
    let expr = s::reify(t, p)
        .or_else(|_| Err("exceptional float cannot be reified for computation".to_string()))?;
    let Sort::Value(ty) = &t.sort else {
        return Ok(None);
    };
    let mut fuel = b.remaining as u64;
    let v = crate::eval::closed(&expr, p, ty, &mut fuel)?;
    b.remaining = fuel as usize;
    Ok(Some(match v {
        crate::eval::Value::U32(n) => word(Type::U32, n as u64),
        crate::eval::Value::I32(n) => word(Type::I32, n as u32 as u64),
        crate::eval::Value::U64(n) => word(Type::U64, n),
        crate::eval::Value::F32(n) => term(value(Type::F32), Node::Float(n)),
        crate::eval::Value::Bool(x) => term(value(Type::Bool), Node::Bool(x)),
        _ => return Err("literal primitive output".into()),
    }))
}
// A general decision procedure for the polynomial fragment of wrapping word
// semantics. It checks equality; it never installs an optimisation or emits code.
type Polynomial = BTreeMap<Vec<String>, u64>;
fn polynomial(t: &Term, b: &mut Budget, d: usize) -> LangResult<Polynomial> {
    b.step(d)?;
    let mask = if t.sort == value(Type::U64) {
        u64::MAX
    } else {
        u32::MAX as u64
    };
    let add = |mut a: Polynomial,
               c: Polynomial,
               negative: bool,
               b: &mut Budget|
     -> LangResult<Polynomial> {
        for (m, k) in c {
            b.step(d)?;
            let k = if negative { 0u64.wrapping_sub(k) } else { k };
            let v = a.entry(m).or_default();
            *v = v.wrapping_add(k) & mask;
        }
        a.retain(|_, v| *v != 0);
        Ok(a)
    };
    match &t.node {
        Node::Word(n) => Ok(if *n == 0 {
            BTreeMap::new()
        } else {
            BTreeMap::from([(vec![], *n & mask)])
        }),
        Node::Op(n, a) if n == "neg" => add(BTreeMap::new(), polynomial(&a[0], b, d + 1)?, true, b),
        Node::Op(n, a) if n == "binary:+" || n == "binary:-" => add(
            polynomial(&a[0], b, d + 1)?,
            polynomial(&a[1], b, d + 1)?,
            n == "binary:-",
            b,
        ),
        Node::Op(n, a) if n == "binary:*" => {
            let a = polynomial(&a[0], b, d + 1)?;
            let c = polynomial(&a_term(t, 1)?, b, d + 1)?;
            let mut out = Polynomial::new();
            for (m, k) in a {
                for (q, v) in &c {
                    b.step(d)?;
                    let mut key = m.clone();
                    key.extend(q.clone());
                    if key.len() > 128 {
                        return Err("word polynomial degree limit".into());
                    }
                    key.sort();
                    let old = out.entry(key).or_default();
                    *old = old.wrapping_add(k.wrapping_mul(*v)) & mask;
                    if out.len() > 8192 {
                        return Err("word polynomial term limit".into());
                    }
                }
            }
            out.retain(|_, v| *v != 0);
            Ok(out)
        }
        _ => Ok(BTreeMap::from([(
            vec![serde_json::to_string(t).map_err(|e| e.to_string())?],
            1,
        )])),
    }
}
fn a_term(t: &Term, i: usize) -> LangResult<Term> {
    children(t)
        .get(i)
        .map(|t| (*t).clone())
        .ok_or("semantic argument".into())
}
fn equivalent(
    a: &Term,
    c: &Term,
    hyp: &[Equation],
    p: &Program,
    b: &mut Budget,
    d: usize,
) -> LangResult<bool> {
    b.step(d)?;
    if a == c {
        return Ok(true);
    }
    if a.sort != c.sort {
        return Ok(false);
    }
    if same_head(a, c) {
        let mut same = true;
        for (x, y) in children(a).into_iter().zip(children(c)) {
            if !equivalent(x, y, hyp, p, b, d + 1)? {
                same = false;
                break;
            }
        }
        if same {
            return Ok(true);
        }
    }
    // One definition unfolding may establish correspondence immediately. Do
    // not force a large unchanged loop merely to compare a call with its body.
    for (left, right) in [(a, c), (c, a)] {
        if let Node::Op(name, args) = &left.node {
            if let Some(name) = name.strip_prefix("call:") {
                if let Some(f) = p.functions.iter().find(|f| f.name == name) {
                    let body =
                        s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
                    let args = f
                        .params
                        .iter()
                        .zip(args)
                        .map(|((n, _), v)| (n.clone(), v.clone()))
                        .collect();
                    let expanded = substitute(&body, &args, b)?;
                    if equivalent(&expanded, right, hyp, p, b, d + 1)? {
                        return Ok(true);
                    }
                }
            }
        }
    }
    let facts = hyp
        .iter()
        .map(|h| {
            Ok(Equation {
                from: normal(&h.from, &[], p, b, 0)?,
                to: normal(&h.to, &[], p, b, 0)?,
            })
        })
        .collect::<LangResult<Vec<_>>>()?;
    let a = normal(a, &facts, p, b, 0)?;
    let c = normal(c, &facts, p, b, 0)?;
    if a == c {
        return Ok(true);
    }
    if a.sort != c.sort {
        return Ok(false);
    }
    if matches!(&a.sort,Sort::Value(t) if check_word(t)) {
        return Ok(polynomial(&a, b, 0)? == polynomial(&c, b, 0)?);
    }
    if !same_head(&a, &c) {
        return Ok(false);
    }
    for (a, c) in children(&a).into_iter().zip(children(&c)) {
        if !equivalent(a, c, &facts, p, b, d + 1)? {
            return Ok(false);
        }
    }
    Ok(true)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn context() -> (Program, CheckedCatalogue) {
        let p = Program::default();
        let c = Catalogue {
            schema: 1,
            semantics: SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        };
        let checked = CheckedCatalogue::check(&c, &p).unwrap();
        (p, checked)
    }
    #[test]
    fn wrapping_arithmetic_is_checked_for_each_word_width() {
        let (p, c) = context();
        for ty in [Type::U32, Type::U64, Type::I32] {
            let s = value(ty.clone());
            let x = free(s.clone(), "x");
            let env = BTreeMap::from([("x".into(), s.clone())]);
            let a = op(
                s.clone(),
                "binary:+",
                vec![
                    op(s.clone(), "binary:+", vec![x.clone(), word(ty.clone(), 1)]),
                    word(ty.clone(), 1),
                ],
            );
            let target = op(s, "binary:+", vec![x, word(ty, 2)]);
            c.prove(
                &p,
                &env,
                &[],
                &Equation {
                    from: a,
                    to: target,
                },
                &Proof::Normalize,
                &mut Budget::new(),
                0,
            )
            .unwrap();
        }
    }
    #[test]
    fn false_equalities_and_unknown_primitives_reject() {
        let (p, c) = context();
        let goal = Equation {
            from: word(Type::U32, 0),
            to: word(Type::U32, 1),
        };
        assert!(c
            .prove(
                &p,
                &Env::new(),
                &[],
                &goal,
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
        let bad = op(value(Type::U32), "proof.trust", vec![]);
        assert!(validate(&bad, &Env::new(), &p, &mut Budget::new()).is_err());
    }
    #[test]
    fn beta_reduction_preserves_free_variables_beneath_binders() {
        let s = value(Type::U32);
        let body = lambda(s.clone(), term(s.clone(), Node::Bound(1)));
        let result = beta(&body, &free(s.clone(), "x"), &mut Budget::new()).unwrap();
        assert_eq!(result, lambda(s.clone(), free(s, "x")));
    }
    #[test]
    fn floats_do_not_enter_the_word_polynomial_checker() {
        let (p, c) = context();
        let s = value(Type::F32);
        let x = free(s.clone(), "x");
        let env = BTreeMap::from([("x".into(), s.clone())]);
        let from = op(s.clone(), "binary:-", vec![x.clone(), x]);
        let to = term(s, Node::Float(0));
        assert!(c
            .prove(
                &p,
                &env,
                &[],
                &Equation { from, to },
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
    }
}
/// Premise certificates use the application's binder context, just like its
/// arguments. Open that context uniformly in every term carried by the proof.
pub fn open_proof(proof: &Proof, scope: &[(String, Sort)], b: &mut Budget) -> LangResult<Proof> {
    fn go(proof: &Proof, scope: &[(String, Sort)], b: &mut Budget, d: usize) -> LangResult<Proof> {
        b.step(d)?;
        let eq = |e: &Equation, b: &mut Budget| -> LangResult<Equation> {
            Ok(Equation {
                from: s::open_scope(&e.from, scope, b)?,
                to: s::open_scope(&e.to, scope, b)?,
            })
        };
        Ok(match proof {
            Proof::Normalize => Proof::Normalize,
            Proof::Hypothesis(i) => Proof::Hypothesis(*i),
            Proof::Sym(p) => Proof::Sym(Box::new(go(p, scope, b, d + 1)?)),
            Proof::Trans {
                middle,
                left,
                right,
            } => Proof::Trans {
                middle: s::open_scope(middle, scope, b)?,
                left: Box::new(go(left, scope, b, d + 1)?),
                right: Box::new(go(right, scope, b, d + 1)?),
            },
            Proof::Congruence(ps) => Proof::Congruence(
                ps.iter()
                    .map(|p| go(p, scope, b, d + 1))
                    .collect::<LangResult<_>>()?,
            ),
            Proof::Use {
                law,
                arguments,
                premises,
            } => Proof::Use {
                law: law.clone(),
                arguments: arguments
                    .iter()
                    .map(|(n, t)| Ok((n.clone(), s::open_scope(t, scope, b)?)))
                    .collect::<LangResult<_>>()?,
                premises: premises
                    .iter()
                    .map(|p| go(p, scope, b, d + 1))
                    .collect::<LangResult<_>>()?,
            },
            Proof::Cases {
                condition,
                on_false,
                on_true,
            } => Proof::Cases {
                condition: s::open_scope(condition, scope, b)?,
                on_false: Box::new(go(on_false, scope, b, d + 1)?),
                on_true: Box::new(go(on_true, scope, b, d + 1)?),
            },
            Proof::Induction {
                variable,
                names,
                base,
                step,
            } => Proof::Induction {
                variable: variable.clone(),
                names: names.clone(),
                base: Box::new(go(base, scope, b, d + 1)?),
                step: Box::new(go(step, scope, b, d + 1)?),
            },
            Proof::AssertEquality {
                equality,
                premise,
                body,
            } => Proof::AssertEquality {
                equality: eq(equality, b)?,
                premise: Box::new(go(premise, scope, b, d + 1)?),
                body: Box::new(go(body, scope, b, d + 1)?),
            },
        })
    }
    go(proof, scope, b, 0)
}
