//! First-order inductive equality: typed constructors, terminating definitions,
//! definitional computation and induction. Optimisation laws are not primitives.
use crate::LangResult;
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet},
    sync::Arc,
};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Sort {
    Bool,
    U64,
    Data(String),
    SelfType,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Term {
    Var(String),
    Bool(bool),
    U64(u64),
    Construct {
        datatype: String,
        constructor: usize,
        arguments: Vec<Term>,
    },
    Call {
        function: String,
        arguments: Vec<Term>,
    },
    SelfCall(Vec<Term>),
    Binary {
        op: String,
        left: Box<Term>,
        right: Box<Term>,
    },
    Match {
        scrutinee: Box<Term>,
        branches: Vec<Branch>,
    },
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Branch {
    pub bindings: Vec<String>,
    pub body: Term,
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Equation {
    pub from: Term,
    pub to: Term,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Case {
    pub bindings: Vec<String>,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Proof {
    Refl(Term),
    Convert {
        from: Term,
        to: Term,
    },
    Hypothesis(usize),
    Sym(Box<Proof>),
    Trans(Box<Proof>, Box<Proof>),
    Construct {
        datatype: String,
        constructor: usize,
        arguments: Vec<Proof>,
    },
    Call {
        function: String,
        arguments: Vec<Proof>,
    },
    Binary {
        op: String,
        left: Box<Proof>,
        right: Box<Proof>,
    },
    Use {
        theorem: String,
        arguments: Vec<Term>,
        premises: Vec<Proof>,
    },
    Induction {
        variable: String,
        from: Term,
        to: Term,
        cases: Vec<Case>,
    },
    BoolCases {
        variable: String,
        from: Term,
        to: Term,
        on_false: Box<Proof>,
        on_true: Box<Proof>,
    },
}
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Constructor {
    pub name: String,
    pub fields: Vec<Sort>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Declaration {
    Datatype {
        constructors: Vec<Constructor>,
    },
    Function {
        params: Vec<(String, Sort)>,
        result: Sort,
        body: Term,
        recursive: Option<usize>,
    },
    Theorem {
        params: Vec<(String, Sort)>,
        conditions: Vec<Equation>,
        from: Term,
        to: Term,
        proof: Proof,
    },
}
struct Budget {
    remaining: usize,
}
impl Budget {
    fn new() -> Self {
        Self { remaining: 100_000 }
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if self.remaining == 0 || depth > 128 {
            return Err("inductive logic resource limit".into());
        }
        self.remaining -= 1;
        Ok(())
    }
}
type Env = BTreeMap<String, Sort>;
#[derive(Clone, Debug)]
struct Function {
    params: Vec<(String, Sort)>,
    result: Sort,
    body: Term,
    recursive: Option<usize>,
}
#[derive(Clone, Debug)]
struct Theorem {
    params: Vec<(String, Sort)>,
    conditions: Vec<Equation>,
    equation: Equation,
}
#[derive(Clone, Debug)]
enum Kind {
    Datatype(Vec<Constructor>),
    Function(Function),
    Theorem(Theorem),
}
#[derive(Clone, Debug)]
struct Entry {
    id: String,
    kind: Kind,
    dependencies: Vec<Arc<Entry>>,
}
/// Visible names are direct imports. Internal entries retain immutable checked
/// dependency closures; they cannot be constructed by external callers.
#[derive(Clone, Debug, Default)]
pub struct Context {
    visible: BTreeMap<String, Arc<Entry>>,
    all: BTreeMap<String, Arc<Entry>>,
}
fn name(n: &str) -> LangResult<()> {
    if n.is_empty()
        || n.len() > 64
        || !n.bytes().all(|b| b.is_ascii_alphanumeric() || b == b'_')
        || n.as_bytes()[0].is_ascii_digit()
    {
        return Err("invalid logic binder name".into());
    }
    Ok(())
}
impl Context {
    /// Read-only correspondence check against a previously checked direct import.
    /// Does not install declarations or extend the trusted set of equalities.
    pub fn matches_definition(&self, id: &str, expected: &Declaration) -> LangResult<()> {
        let same = match (&self.entry(id, false)?.kind, expected) {
            (Kind::Datatype(actual), Declaration::Datatype { constructors }) => {
                let mut resolved = constructors.clone();
                for c in &mut resolved {
                    for field in &mut c.fields {
                        if *field == Sort::SelfType {
                            *field = Sort::Data(id.to_owned());
                        }
                    }
                }
                actual == &resolved
            }
            (
                Kind::Function(actual),
                Declaration::Function {
                    params,
                    result,
                    body,
                    recursive,
                },
            ) => {
                actual.params == *params
                    && actual.result == *result
                    && actual.recursive == *recursive
                    && actual.body == bind_self(body, id, &mut Budget::new(), 0)?
            }
            _ => false,
        };
        if same {
            Ok(())
        } else {
            Err("database definition differs from source semantics".into())
        }
    }
    fn entry(&self, id: &str, internal: bool) -> LangResult<&Entry> {
        (if internal { &self.all } else { &self.visible })
            .get(id)
            .map(Arc::as_ref)
            .ok_or_else(|| "unknown or undeclared logic entry".into())
    }
    fn datatype(&self, id: &str, internal: bool) -> LangResult<&[Constructor]> {
        match &self.entry(id, internal)?.kind {
            Kind::Datatype(c) => Ok(c),
            _ => Err("expected datatype".into()),
        }
    }
    fn function(&self, id: &str, internal: bool) -> LangResult<&Function> {
        match &self.entry(id, internal)?.kind {
            Kind::Function(f) => Ok(f),
            _ => Err("expected function".into()),
        }
    }
    fn sort(&self, sort: &Sort) -> LangResult<()> {
        match sort {
            Sort::Bool | Sort::U64 => Ok(()),
            Sort::Data(id) => self.datatype(id, false).map(|_| ()),
            Sort::SelfType => Err("SelfType only allowed in datatype fields".into()),
        }
    }
    fn env(&self, params: &[(String, Sort)]) -> LangResult<Env> {
        if params.len() > 64 {
            return Err("logic parameter count limit".into());
        }
        let mut env = Env::new();
        for (n, s) in params {
            name(n)?;
            self.sort(s)?;
            if env.insert(n.clone(), s.clone()).is_some() {
                return Err("duplicate logic parameter".into());
            }
        }
        Ok(env)
    }
    fn install(&mut self, entry: Arc<Entry>) -> LangResult<()> {
        if self.visible.contains_key(&entry.id) {
            return Err("duplicate logic identity".into());
        }
        fn collect(
            entry: &Arc<Entry>,
            all: &mut BTreeMap<String, Arc<Entry>>,
            depth: usize,
        ) -> LangResult<()> {
            if let Some(old) = all.get(&entry.id) {
                if Arc::ptr_eq(old, entry) {
                    return Ok(());
                }
                return Err("conflicting checked logic identity".into());
            }
            if depth > 64 || all.len() >= 128 {
                return Err("logic context closure limit".into());
            }
            for dep in &entry.dependencies {
                collect(dep, all, depth + 1)?
            }
            all.insert(entry.id.clone(), entry.clone());
            Ok(())
        }
        // Transactional: a failed import cannot leave an enlarged hidden context.
        let mut all = self.all.clone();
        collect(&entry, &mut all, 0)?;
        self.all = all;
        self.visible.insert(entry.id.clone(), entry);
        Ok(())
    }
    pub fn subset(&self, ids: &[String]) -> LangResult<Self> {
        let mut c = Self::default();
        for id in ids {
            c.install(
                self.visible
                    .get(id)
                    .ok_or("undeclared logic import")?
                    .clone(),
            )?
        }
        Ok(c)
    }
    pub fn import(&mut self, other: &Self, id: &str) -> LangResult<()> {
        self.install(
            other
                .visible
                .get(id)
                .ok_or("undeclared logic import")?
                .clone(),
        )
    }
    pub fn declare(&mut self, id: String, declaration: &Declaration) -> LangResult<()> {
        if self.all.contains_key(&id) {
            return Err("duplicate logic identity".into());
        }
        let mut budget = Budget::new();
        let kind = match declaration {
            Declaration::Datatype { constructors } => {
                if constructors.is_empty() || constructors.len() > 32 {
                    return Err("datatype constructor count limit".into());
                }
                let mut names = BTreeSet::new();
                let mut out = constructors.clone();
                for constructor in &mut out {
                    name(&constructor.name)?;
                    if !names.insert(constructor.name.clone()) || constructor.fields.len() > 64 {
                        return Err("invalid datatype constructor".into());
                    }
                    for field in &mut constructor.fields {
                        if *field == Sort::SelfType {
                            *field = Sort::Data(id.clone())
                        } else {
                            self.sort(field)?;
                        }
                    }
                }
                Kind::Datatype(out)
            }
            Declaration::Function {
                params,
                result,
                body,
                recursive,
            } => {
                let env = self.env(params)?;
                self.sort(result)?;
                if let Some(index) = recursive {
                    if !matches!(params.get(*index).map(|p| &p.1), Some(Sort::Data(_))) {
                        return Err("recursive parameter must be an inductive datatype".into());
                    }
                }
                let pending = Function {
                    params: params.clone(),
                    result: result.clone(),
                    body: body.clone(),
                    recursive: *recursive,
                };
                if infer(body, &env, self, Some(&pending), false, &mut budget, 0)? != *result {
                    return Err("logic function result type mismatch".into());
                }
                terminating(body, &pending, &BTreeSet::new(), self, &mut budget, 0)?;
                let body = bind_self(body, &id, &mut budget, 0)?;
                Kind::Function(Function { body, ..pending })
            }
            Declaration::Theorem {
                params,
                conditions,
                from,
                to,
                proof,
            } => {
                let env = self.env(params)?;
                if conditions.len() > 64 {
                    return Err("logic theorem premise count limit".into());
                }
                let hypotheses = conditions
                    .iter()
                    .map(|e| prepare(e, &env, self, &mut budget))
                    .collect::<LangResult<Vec<_>>>()?;
                let equation = prepare(
                    &Equation {
                        from: from.clone(),
                        to: to.clone(),
                    },
                    &env,
                    self,
                    &mut budget,
                )?;
                if derive(proof, &env, self, &hypotheses, &mut budget, 0)? != equation {
                    return Err("inductive proof proves a different statement".into());
                }
                Kind::Theorem(Theorem {
                    params: params.clone(),
                    conditions: hypotheses,
                    equation,
                })
            }
        };
        self.install(Arc::new(Entry {
            id,
            kind,
            dependencies: self.visible.values().cloned().collect(),
        }))
    }
    pub fn check(
        &self,
        params: &[(String, Sort)],
        conditions: &[Equation],
        from: &Term,
        to: &Term,
        proof: &Proof,
    ) -> LangResult<()> {
        let env = self.env(params)?;
        let mut budget = Budget::new();
        if conditions.len() > 64 {
            return Err("logic theorem premise count limit".into());
        }
        let hypotheses = conditions
            .iter()
            .map(|e| prepare(e, &env, self, &mut budget))
            .collect::<LangResult<Vec<_>>>()?;
        let want = prepare(
            &Equation {
                from: from.clone(),
                to: to.clone(),
            },
            &env,
            self,
            &mut budget,
        )?;
        if derive(proof, &env, self, &hypotheses, &mut budget, 0)? != want {
            return Err("inductive proof proves a different statement".into());
        }
        Ok(())
    }
    pub fn evaluate(&self, params: &[(String, Sort)], term: &Term) -> LangResult<Term> {
        let env = self.env(params)?;
        let mut budget = Budget::new();
        infer(term, &env, self, None, false, &mut budget, 0)?;
        normal(term, self, &mut budget, 0)
    }
}
fn primitive(op: &str, left: &Sort, right: &Sort) -> LangResult<Sort> {
    if left != right {
        return Err("primitive operand type mismatch".into());
    }
    match (op, left) {
        ("+" | "-" | "*", Sort::U64) => Ok(Sort::U64),
        ("<" | "<=" | ">" | ">=", Sort::U64) => Ok(Sort::Bool),
        ("&&" | "||", Sort::Bool) => Ok(Sort::Bool),
        ("==" | "!=", Sort::Bool | Sort::U64) => Ok(Sort::Bool),
        _ => Err("unsupported logic primitive".into()),
    }
}
fn branch_env(bindings: &[String], fields: &[Sort], env: &Env, internal: bool) -> LangResult<Env> {
    if bindings.len() != fields.len() {
        return Err("constructor field count mismatch".into());
    }
    let mut local = env.clone();
    for (n, t) in bindings.iter().zip(fields) {
        if !internal {
            name(n)?;
        }
        if local.insert(n.clone(), t.clone()).is_some() && !internal {
            return Err("logic binder shadows an existing variable".into());
        }
    }
    Ok(local)
}
fn infer(
    t: &Term,
    env: &Env,
    c: &Context,
    pending: Option<&Function>,
    internal: bool,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<Sort> {
    budget.step(depth)?;
    match t {
        Term::Var(n) => env
            .get(n)
            .cloned()
            .ok_or_else(|| "unbound logic variable".into()),
        Term::Bool(_) => Ok(Sort::Bool),
        Term::U64(_) => Ok(Sort::U64),
        Term::Binary { op, left, right } => primitive(
            op,
            &infer(left, env, c, pending, internal, budget, depth + 1)?,
            &infer(right, env, c, pending, internal, budget, depth + 1)?,
        ),
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => {
            let fields = &c
                .datatype(datatype, internal)?
                .get(*constructor)
                .ok_or("unknown constructor")?
                .fields;
            check_args(
                fields,
                arguments,
                env,
                c,
                pending,
                internal,
                budget,
                depth + 1,
            )?;
            Ok(Sort::Data(datatype.clone()))
        }
        Term::Call {
            function,
            arguments,
        } => {
            let f = c.function(function, internal)?;
            check_args(
                &f.params.iter().map(|p| p.1.clone()).collect::<Vec<_>>(),
                arguments,
                env,
                c,
                pending,
                internal,
                budget,
                depth + 1,
            )?;
            Ok(f.result.clone())
        }
        Term::SelfCall(arguments) => {
            let f = pending.ok_or("SelfCall outside a recursive definition")?;
            if f.recursive.is_none() {
                return Err("SelfCall in nonrecursive definition".into());
            }
            check_args(
                &f.params.iter().map(|p| p.1.clone()).collect::<Vec<_>>(),
                arguments,
                env,
                c,
                pending,
                internal,
                budget,
                depth + 1,
            )?;
            Ok(f.result.clone())
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            let Sort::Data(id) = infer(scrutinee, env, c, pending, internal, budget, depth + 1)?
            else {
                return Err("match requires inductive data".into());
            };
            let constructors = c.datatype(&id, internal)?;
            if branches.len() != constructors.len() {
                return Err("match must cover every constructor".into());
            }
            let mut result = None;
            for (branch, constructor) in branches.iter().zip(constructors) {
                let local = branch_env(&branch.bindings, &constructor.fields, env, internal)?;
                let ty = infer(
                    &branch.body,
                    &local,
                    c,
                    pending,
                    internal,
                    budget,
                    depth + 1,
                )?;
                if result.as_ref().is_some_and(|old| old != &ty) {
                    return Err("match branch type mismatch".into());
                }
                result = Some(ty);
            }
            result.ok_or_else(|| "empty match".into())
        }
    }
}
fn check_args(
    types: &[Sort],
    args: &[Term],
    env: &Env,
    c: &Context,
    pending: Option<&Function>,
    internal: bool,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<()> {
    if types.len() != args.len() {
        return Err("logic argument count mismatch".into());
    }
    for (ty, arg) in types.iter().zip(args) {
        if infer(arg, env, c, pending, internal, budget, depth + 1)? != *ty {
            return Err("logic argument type mismatch".into());
        }
    }
    Ok(())
}
// Only a lexically exposed strict constructor subterm can be the recursive argument.
fn terminating(
    t: &Term,
    f: &Function,
    smaller: &BTreeSet<String>,
    c: &Context,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<()> {
    budget.step(depth)?;
    match t {
        Term::SelfCall(args) => {
            let index = f
                .recursive
                .ok_or("recursive call without decreasing parameter")?;
            if !matches!(&args[index],Term::Var(n) if smaller.contains(n)) {
                return Err("recursive call is not on a strict structural subterm".into());
            }
            for a in args {
                terminating(a, f, smaller, c, budget, depth + 1)?
            }
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            terminating(scrutinee, f, smaller, c, budget, depth + 1)?;
            // infer() already checked exhaustive branches and binder freshness.
            for (branch_index, branch) in branches.iter().enumerate() {
                let mut local = smaller.clone();
                if let (Some(index), Term::Var(n)) = (f.recursive, scrutinee.as_ref()) {
                    let (root, Sort::Data(id)) = &f.params[index] else {
                        return Err("invalid recursive parameter".into());
                    };
                    if n == root || smaller.contains(n) {
                        let ctor = &c.datatype(id, false)?[branch_index];
                        for (binding, sort) in branch.bindings.iter().zip(&ctor.fields) {
                            if sort == &Sort::Data(id.clone()) {
                                local.insert(binding.clone());
                            }
                        }
                    }
                }
                terminating(&branch.body, f, &local, c, budget, depth + 1)?;
            }
        }
        Term::Binary { left, right, .. } => {
            terminating(left, f, smaller, c, budget, depth + 1)?;
            terminating(right, f, smaller, c, budget, depth + 1)?
        }
        Term::Call { arguments, .. } | Term::Construct { arguments, .. } => {
            for a in arguments {
                terminating(a, f, smaller, c, budget, depth + 1)?
            }
        }
        _ => {}
    }
    Ok(())
}
fn bind_self(t: &Term, id: &str, budget: &mut Budget, depth: usize) -> LangResult<Term> {
    budget.step(depth)?;
    Ok(match t {
        Term::SelfCall(args) => Term::Call {
            function: id.into(),
            arguments: args
                .iter()
                .map(|a| bind_self(a, id, budget, depth + 1))
                .collect::<LangResult<_>>()?,
        },
        Term::Call {
            function,
            arguments,
        } => Term::Call {
            function: function.clone(),
            arguments: arguments
                .iter()
                .map(|a| bind_self(a, id, budget, depth + 1))
                .collect::<LangResult<_>>()?,
        },
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => Term::Construct {
            datatype: datatype.clone(),
            constructor: *constructor,
            arguments: arguments
                .iter()
                .map(|a| bind_self(a, id, budget, depth + 1))
                .collect::<LangResult<_>>()?,
        },
        Term::Binary { op, left, right } => Term::Binary {
            op: op.clone(),
            left: Box::new(bind_self(left, id, budget, depth + 1)?),
            right: Box::new(bind_self(right, id, budget, depth + 1)?),
        },
        Term::Match {
            scrutinee,
            branches,
        } => Term::Match {
            scrutinee: Box::new(bind_self(scrutinee, id, budget, depth + 1)?),
            branches: branches
                .iter()
                .map(|b| {
                    Ok(Branch {
                        bindings: b.bindings.clone(),
                        body: bind_self(&b.body, id, budget, depth + 1)?,
                    })
                })
                .collect::<LangResult<_>>()?,
        },
        _ => t.clone(),
    })
}
fn names(
    t: &Term,
    out: &mut BTreeSet<String>,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<()> {
    budget.step(depth)?;
    match t {
        Term::Var(n) => {
            out.insert(n.clone());
        }
        Term::Binary { left, right, .. } => {
            names(left, out, budget, depth + 1)?;
            names(right, out, budget, depth + 1)?
        }
        Term::Call { arguments, .. }
        | Term::Construct { arguments, .. }
        | Term::SelfCall(arguments) => {
            for a in arguments {
                names(a, out, budget, depth + 1)?
            }
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            names(scrutinee, out, budget, depth + 1)?;
            for b in branches {
                out.extend(b.bindings.iter().cloned());
                names(&b.body, out, budget, depth + 1)?
            }
        }
        _ => {}
    }
    Ok(())
}
// Capture-avoiding simultaneous substitution. Internal fresh names use '$',
// which untrusted binders cannot use. Inserted terms are never substituted again.
fn substitute(
    t: &Term,
    bindings: &BTreeMap<String, Term>,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<Term> {
    budget.step(depth)?;
    Ok(match t {
        Term::Var(n) => bindings.get(n).cloned().unwrap_or_else(|| t.clone()),
        Term::Binary { op, left, right } => Term::Binary {
            op: op.clone(),
            left: Box::new(substitute(left, bindings, budget, depth + 1)?),
            right: Box::new(substitute(right, bindings, budget, depth + 1)?),
        },
        Term::Call {
            function,
            arguments,
        } => Term::Call {
            function: function.clone(),
            arguments: arguments
                .iter()
                .map(|a| substitute(a, bindings, budget, depth + 1))
                .collect::<LangResult<_>>()?,
        },
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => Term::Construct {
            datatype: datatype.clone(),
            constructor: *constructor,
            arguments: arguments
                .iter()
                .map(|a| substitute(a, bindings, budget, depth + 1))
                .collect::<LangResult<_>>()?,
        },
        Term::Match {
            scrutinee,
            branches,
        } => {
            let mut used = BTreeSet::new();
            names(t, &mut used, budget, depth + 1)?;
            for value in bindings.values() {
                names(value, &mut used, budget, depth + 1)?
            }
            let mut branches_out = Vec::new();
            for branch in branches {
                let mut local = bindings.clone();
                let mut renamed = Vec::new();
                for binder in &branch.bindings {
                    let mut index = 0;
                    let fresh = loop {
                        let candidate = format!("$b{index}");
                        index += 1;
                        if used.insert(candidate.clone()) {
                            break candidate;
                        }
                    };
                    local.insert(binder.clone(), Term::Var(fresh.clone()));
                    renamed.push(fresh);
                }
                branches_out.push(Branch {
                    bindings: renamed,
                    body: substitute(&branch.body, &local, budget, depth + 1)?,
                });
            }
            Term::Match {
                scrutinee: Box::new(substitute(scrutinee, bindings, budget, depth + 1)?),
                branches: branches_out,
            }
        }
        Term::SelfCall(_) => return Err("unbound recursive call in substitution".into()),
        _ => t.clone(),
    })
}
fn normal(t: &Term, c: &Context, budget: &mut Budget, depth: usize) -> LangResult<Term> {
    budget.step(depth)?;
    match t {
        Term::Call {
            function,
            arguments,
        } => {
            let f = c.function(function, true)?;
            let args = arguments
                .iter()
                .map(|a| normal(a, c, budget, depth + 1))
                .collect::<LangResult<Vec<_>>>()?;
            if f.recursive
                .is_some_and(|i| !matches!(args[i], Term::Construct { .. }))
            {
                return Ok(Term::Call {
                    function: function.clone(),
                    arguments: args,
                });
            }
            let bindings = f.params.iter().map(|p| p.0.clone()).zip(args).collect();
            normal(
                &substitute(&f.body, &bindings, budget, depth + 1)?,
                c,
                budget,
                depth + 1,
            )
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            let scrutinee = normal(scrutinee, c, budget, depth + 1)?;
            if let Term::Construct {
                constructor,
                arguments,
                ..
            } = &scrutinee
            {
                let branch = branches
                    .get(*constructor)
                    .ok_or("unknown match constructor")?;
                let bindings = branch
                    .bindings
                    .iter()
                    .cloned()
                    .zip(arguments.iter().cloned())
                    .collect();
                normal(
                    &substitute(&branch.body, &bindings, budget, depth + 1)?,
                    c,
                    budget,
                    depth + 1,
                )
            } else {
                Ok(Term::Match {
                    scrutinee: Box::new(scrutinee),
                    branches: branches.clone(),
                })
            }
        }
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => Ok(Term::Construct {
            datatype: datatype.clone(),
            constructor: *constructor,
            arguments: arguments
                .iter()
                .map(|a| normal(a, c, budget, depth + 1))
                .collect::<LangResult<_>>()?,
        }),
        Term::Binary { op, left, right } => {
            let left = normal(left, c, budget, depth + 1)?;
            let right = normal(right, c, budget, depth + 1)?;
            let reduced = match (&left, &right) {
                (Term::U64(a), Term::U64(b)) => Some(match op.as_str() {
                    "+" => Term::U64(a.wrapping_add(*b)),
                    "-" => Term::U64(a.wrapping_sub(*b)),
                    "*" => Term::U64(a.wrapping_mul(*b)),
                    "==" => Term::Bool(a == b),
                    "!=" => Term::Bool(a != b),
                    "<" => Term::Bool(a < b),
                    "<=" => Term::Bool(a <= b),
                    ">" => Term::Bool(a > b),
                    ">=" => Term::Bool(a >= b),
                    _ => return Err("invalid numeric primitive".into()),
                }),
                (Term::Bool(a), Term::Bool(b)) => Some(match op.as_str() {
                    "&&" => Term::Bool(*a && *b),
                    "||" => Term::Bool(*a || *b),
                    "==" => Term::Bool(a == b),
                    "!=" => Term::Bool(a != b),
                    _ => return Err("invalid Boolean primitive".into()),
                }),
                _ => None,
            };
            Ok(reduced.unwrap_or(Term::Binary {
                op: op.clone(),
                left: Box::new(left),
                right: Box::new(right),
            }))
        }
        Term::SelfCall(_) => Err("unbound recursive call in computation".into()),
        _ => Ok(t.clone()),
    }
}
fn typed_pair(
    e: &Equation,
    env: &Env,
    c: &Context,
    internal: bool,
    budget: &mut Budget,
) -> LangResult<()> {
    if infer(&e.from, env, c, None, internal, budget, 0)?
        != infer(&e.to, env, c, None, internal, budget, 0)?
    {
        return Err("logic equality type mismatch".into());
    }
    Ok(())
}
fn normalize_pair(e: Equation, c: &Context, budget: &mut Budget) -> LangResult<Equation> {
    Ok(Equation {
        from: normal(&e.from, c, budget, 0)?,
        to: normal(&e.to, c, budget, 0)?,
    })
}
fn prepare(e: &Equation, env: &Env, c: &Context, budget: &mut Budget) -> LangResult<Equation> {
    typed_pair(e, env, c, false, budget)?;
    normalize_pair(e.clone(), c, budget)
}
fn instance(
    params: &[(String, Sort)],
    arguments: &[Term],
    env: &Env,
    c: &Context,
    budget: &mut Budget,
) -> LangResult<BTreeMap<String, Term>> {
    check_args(
        &params.iter().map(|p| p.1.clone()).collect::<Vec<_>>(),
        arguments,
        env,
        c,
        None,
        false,
        budget,
        0,
    )?;
    Ok(params
        .iter()
        .map(|p| p.0.clone())
        .zip(arguments.iter().cloned())
        .collect())
}
fn sub_pair(
    e: &Equation,
    bindings: &BTreeMap<String, Term>,
    c: &Context,
    budget: &mut Budget,
) -> LangResult<Equation> {
    normalize_pair(
        Equation {
            from: substitute(&e.from, bindings, budget, 0)?,
            to: substitute(&e.to, bindings, budget, 0)?,
        },
        c,
        budget,
    )
}
fn derive(
    p: &Proof,
    env: &Env,
    c: &Context,
    hypotheses: &[Equation],
    budget: &mut Budget,
    depth: usize,
) -> LangResult<Equation> {
    // Proof recursion has larger frames than term recursion. Reject before a
    // deeply nested adversarial derivation exhausts a normal host thread stack.
    if depth > 32 {
        return Err("inductive proof depth limit".into());
    }
    budget.step(depth)?;
    let equation = match p {
        Proof::Hypothesis(i) => hypotheses
            .get(*i)
            .cloned()
            .ok_or("unknown logic hypothesis")?,
        Proof::Refl(t) => prepare(
            &Equation {
                from: t.clone(),
                to: t.clone(),
            },
            env,
            c,
            budget,
        )?,
        Proof::Convert { from, to } => {
            let e = prepare(
                &Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                budget,
            )?;
            if e.from != e.to {
                return Err("definitional computation does not prove equality".into());
            }
            e
        }
        Proof::Sym(p) => {
            let e = derive(p, env, c, hypotheses, budget, depth + 1)?;
            Equation {
                from: e.to,
                to: e.from,
            }
        }
        Proof::Trans(p, q) => {
            let a = derive(p, env, c, hypotheses, budget, depth + 1)?;
            let b = derive(q, env, c, hypotheses, budget, depth + 1)?;
            if a.to != b.from {
                return Err("logic transitivity middle differs".into());
            }
            Equation {
                from: a.from,
                to: b.to,
            }
        }
        Proof::Construct {
            datatype,
            constructor,
            arguments,
        } => {
            c.datatype(datatype, false)?;
            let pairs = arguments
                .iter()
                .map(|p| derive(p, env, c, hypotheses, budget, depth + 1))
                .collect::<LangResult<Vec<_>>>()?;
            Equation {
                from: Term::Construct {
                    datatype: datatype.clone(),
                    constructor: *constructor,
                    arguments: pairs.iter().map(|e| e.from.clone()).collect(),
                },
                to: Term::Construct {
                    datatype: datatype.clone(),
                    constructor: *constructor,
                    arguments: pairs.into_iter().map(|e| e.to).collect(),
                },
            }
        }
        Proof::Call {
            function,
            arguments,
        } => {
            c.function(function, false)?;
            let pairs = arguments
                .iter()
                .map(|p| derive(p, env, c, hypotheses, budget, depth + 1))
                .collect::<LangResult<Vec<_>>>()?;
            Equation {
                from: Term::Call {
                    function: function.clone(),
                    arguments: pairs.iter().map(|e| e.from.clone()).collect(),
                },
                to: Term::Call {
                    function: function.clone(),
                    arguments: pairs.into_iter().map(|e| e.to).collect(),
                },
            }
        }
        Proof::Binary { op, left, right } => {
            let l = derive(left, env, c, hypotheses, budget, depth + 1)?;
            let r = derive(right, env, c, hypotheses, budget, depth + 1)?;
            Equation {
                from: Term::Binary {
                    op: op.clone(),
                    left: Box::new(l.from),
                    right: Box::new(r.from),
                },
                to: Term::Binary {
                    op: op.clone(),
                    left: Box::new(l.to),
                    right: Box::new(r.to),
                },
            }
        }
        Proof::Use {
            theorem,
            arguments,
            premises,
        } => {
            let Kind::Theorem(t) = &c.entry(theorem, false)?.kind else {
                return Err("expected checked theorem".into());
            };
            if premises.len() != t.conditions.len() {
                return Err("logic theorem premise count mismatch".into());
            }
            let bindings = instance(&t.params, arguments, env, c, budget)?;
            for (condition, proof) in t.conditions.iter().zip(premises) {
                if derive(proof, env, c, hypotheses, budget, depth + 1)?
                    != sub_pair(condition, &bindings, c, budget)?
                {
                    return Err("logic theorem premise proves a different statement".into());
                }
            }
            sub_pair(&t.equation, &bindings, c, budget)?
        }
        Proof::Induction {
            variable,
            from,
            to,
            cases,
        } => {
            let Some(Sort::Data(id)) = env.get(variable) else {
                return Err("induction variable must have datatype sort".into());
            };
            let constructors = c.datatype(id, false)?;
            if cases.len() != constructors.len() {
                return Err("induction must cover every constructor".into());
            }
            let original = Equation {
                from: from.clone(),
                to: to.clone(),
            };
            typed_pair(&original, env, c, false, budget)?;
            // An equality premise C(x) is not an induction hypothesis C(tail).
            // This fragment fixes all outer premises independently of x.
            for h in hypotheses {
                let mut used = BTreeSet::new();
                names(&h.from, &mut used, budget, 0)?;
                names(&h.to, &mut used, budget, 0)?;
                if used.contains(variable) {
                    return Err("induction under variable-dependent premises is unsupported".into());
                }
            }
            for (index, (case, constructor)) in cases.iter().zip(constructors).enumerate() {
                let mut local = branch_env(&case.bindings, &constructor.fields, env, false)?;
                local.remove(variable);
                let value = Term::Construct {
                    datatype: id.clone(),
                    constructor: index,
                    arguments: case.bindings.iter().cloned().map(Term::Var).collect(),
                };
                let want = sub_pair(&original, &[(variable.clone(), value)].into(), c, budget)?;
                let mut local_hypotheses = hypotheses.to_vec();
                for (binding, sort) in case.bindings.iter().zip(&constructor.fields) {
                    if sort == &Sort::Data(id.clone()) {
                        local_hypotheses.push(sub_pair(
                            &original,
                            &[(variable.clone(), Term::Var(binding.clone()))].into(),
                            c,
                            budget,
                        )?);
                    }
                }
                if local_hypotheses.len() > 128 {
                    return Err("logic hypothesis count limit".into());
                }
                if derive(&case.proof, &local, c, &local_hypotheses, budget, depth + 1)? != want {
                    return Err("induction branch proves a different statement".into());
                }
            }
            normalize_pair(original, c, budget)?
        }
        Proof::BoolCases {
            variable,
            from,
            to,
            on_false,
            on_true,
        } => {
            if env.get(variable) != Some(&Sort::Bool) {
                return Err("Boolean case variable has wrong sort".into());
            }
            let original = Equation {
                from: from.clone(),
                to: to.clone(),
            };
            typed_pair(&original, env, c, false, budget)?;
            let mut local = env.clone();
            local.remove(variable);
            for (value, proof) in [(false, on_false), (true, on_true)] {
                let bindings = [(variable.clone(), Term::Bool(value))].into();
                let want = sub_pair(&original, &bindings, c, budget)?;
                let hs = hypotheses
                    .iter()
                    .map(|e| sub_pair(e, &bindings, c, budget))
                    .collect::<LangResult<Vec<_>>>()?;
                if derive(proof, &local, c, &hs, budget, depth + 1)? != want {
                    return Err("Boolean branch proves a different statement".into());
                }
            }
            normalize_pair(original, c, budget)?
        }
    };
    typed_pair(&equation, env, c, true, budget)?;
    normalize_pair(equation, c, budget)
}
