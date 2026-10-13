//! Source form of laws: one declaration for every law, concrete or general.
//! Parsed only from external authoring sources (`ink emit-laws`); executable
//! sources reject it. Nothing here is trusted: `law_author` elaborates each
//! declaration into an ordinary kernel law and the kernel checks it.
use crate::{core::Expr, core::Type, semantic::Sort};

/// `law name<T, ...>(params) { requires ...; assume ...; from == to; proof by ...; }`
#[derive(Clone, Debug)]
pub struct LawDecl {
    pub name: String,
    /// Type parameters: opaque while the law is proved.
    pub types: Vec<String>,
    /// Value parameters (`Sort::Value`) and function parameters (`Sort::Arrow`,
    /// curried), in declaration order.
    pub params: Vec<(String, Sort)>,
    /// Conditions every use must prove, optionally named for `hypothesis`.
    pub requires: Vec<(Option<String>, Expr)>,
    pub assumes: Vec<AssumeDecl>,
    pub from: Expr,
    pub to: Expr,
    pub proof: Tactic,
}

/// `assume name(params) [requires c, ...]: from == to;` quantified over its
/// own parameters, about the law's parameters.
#[derive(Clone, Debug)]
pub struct AssumeDecl {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub requires: Vec<Expr>,
    pub from: Expr,
    pub to: Expr,
}

#[derive(Clone, Debug)]
pub enum HypothesisRef {
    Index(usize),
    Name(String),
}

/// Proof tactics. Each lowers to kernel proof rules; terms in them are source
/// expressions elaborated in the scope where they occur.
#[derive(Clone, Debug)]
pub enum Tactic {
    /// Both sides have the same normal form (computation, hypotheses as
    /// oriented rewrites, the polynomial decision procedure).
    Normalize,
    /// Kernel evidence supplied with `--proofs`.
    Provided,
    Hypothesis(HypothesisRef),
    /// The latest induction hypothesis; generalized ones take arguments.
    Ih(Vec<(String, Expr)>),
    Symmetry(Box<Tactic>),
    Congruence(Vec<Tactic>),
    /// `calc { _ == m1 by p0; == m2 by p1; == _ by p2; }`
    Calc {
        middles: Vec<Expr>,
        proofs: Vec<Tactic>,
    },
    Cases {
        condition: Expr,
        on_true: Box<Tactic>,
        on_false: Box<Tactic>,
    },
    /// `cases o { none => p; some(v) => q; }` or
    /// `cases r { ok(v) => p; err(e) => q; }`
    Variants {
        variable: String,
        names: Vec<String>,
        first: Box<Tactic>,
        second: Box<Tactic>,
    },
    Induction {
        variable: String,
        generalizing: Vec<String>,
        /// Binder names for the step case (`cons(head, tail)`), if given.
        names: Vec<String>,
        base: Box<Tactic>,
        step: Box<Tactic>,
    },
    /// `use law<types>(args) [requires (...)] [assuming (...)] [exactly]`.
    /// Without `exactly`, both ends may differ from the instance up to
    /// normalisation.
    Use {
        law: String,
        types: Vec<Type>,
        args: Vec<Expr>,
        premises: Vec<Tactic>,
        assumptions: Vec<Tactic>,
        exact: bool,
    },
    /// `assumption name(args) [requires (...)] [exactly]`
    Assumption {
        name: String,
        args: Vec<Expr>,
        premises: Vec<Tactic>,
        exact: bool,
    },
    /// `assert a == b by p then q`: prove `(a == b) == true`, then continue
    /// with `a = b` as a hypothesis (words and Bool only).
    Assert {
        from: Expr,
        to: Expr,
        premise: Box<Tactic>,
        body: Box<Tactic>,
    },
    /// `order(a, b, c) then p`: check `p` once for every weak ordering of the
    /// atoms (two to five, one word or Int type), with that ordering's
    /// comparisons and equalities as extra hypotheses.
    Order {
        atoms: Vec<Expr>,
        body: Box<Tactic>,
    },
}
