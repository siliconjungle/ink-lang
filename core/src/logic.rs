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
    If {
        condition: Box<Term>,
        on_true: Box<Term>,
        on_false: Box<Term>,
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
    BitVector {
        from: Term,
        to: Term,
        hypotheses: Vec<usize>,
        certificate: crate::bitproof::Certificate,
    },
    Substitute {
        variable: String,
        context: Term,
        equality: Box<Proof>,
    },
    BoolSplit {
        condition: Term,
        from: Term,
        to: Term,
        on_false: Box<Proof>,
        on_true: Box<Proof>,
    },
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
    GeneralizedInduction {
        variable: String,
        generalize: Vec<String>,
        from: Term,
        to: Term,
        cases: Vec<Case>,
    },
    GeneralizedHypothesis {
        index: usize,
        arguments: Vec<Term>,
    },
    BoolCases {
        variable: String,
        from: Term,
        to: Term,
        on_false: Box<Proof>,
        on_true: Box<Proof>,
    },
    /// Instantiate a general (parametric) theorem. Every abstract sort,
    /// abstract function and assumption the theorem depends on is interpreted
    /// exactly once: sorts by sorts, functions by closed total terms, and
    /// assumptions by checked proofs of their instantiated statements. Each
    /// parametric datatype or function the instantiated statement reaches is
    /// mapped to an existing definition whose declaration is the instantiated
    /// declaration. The conclusion is the instantiated equation.
    Instance {
        theorem: String,
        sorts: BTreeMap<String, Sort>,
        functions: BTreeMap<String, Lambda>,
        definitions: BTreeMap<String, String>,
        assumptions: BTreeMap<String, Proof>,
        arguments: Vec<Term>,
        premises: Vec<Proof>,
    },
}
/// A closed term with named parameters interpreting an abstract function.
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Lambda {
    pub params: Vec<String>,
    pub body: Term,
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
    /// An uninterpreted sort: no constructors, so it cannot be matched,
    /// constructed or inducted on. Only `Proof::Instance` interprets it. The
    /// name keeps distinct symbols distinct under content addressing.
    AbstractSort { name: String },
    /// An uninterpreted total function. Its calls never compute. Parameter
    /// names are documentation only; instances bind their own.
    AbstractFunction {
        name: String,
        params: Vec<(String, Sort)>,
        result: Sort,
    },
    /// A hypothesis schema. Everything that uses it stays parametric, and can
    /// only reach a checked conclusion through an `Instance` that proves it.
    Assumption {
        params: Vec<(String, Sort)>,
        conditions: Vec<Equation>,
        from: Term,
        to: Term,
    },
}
struct Budget {
    remaining: usize,
    bit_work: usize,
}
impl Budget {
    fn new() -> Self {
        Self {
            remaining: 100_000,
            bit_work: 20_000_000,
        }
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if self.remaining == 0 || depth > 128 {
            return Err("inductive logic resource limit".into());
        }
        self.remaining -= 1;
        Ok(())
    }
    /// A substituted copy of a bound term costs one step per node, so a
    /// repeated variable cannot multiply a large argument without bound.
    fn copy(&mut self, t: &Term) -> LangResult<()> {
        let mut pending = vec![t];
        while let Some(t) = pending.pop() {
            self.step(0)?;
            match t {
                Term::Var(_) | Term::Bool(_) | Term::U64(_) => {}
                Term::Construct { arguments, .. }
                | Term::Call { arguments, .. }
                | Term::SelfCall(arguments) => pending.extend(arguments),
                Term::Binary { left, right, .. } => pending.extend([&**left, &**right]),
                Term::If {
                    condition,
                    on_true,
                    on_false,
                } => pending.extend([&**condition, &**on_true, &**on_false]),
                Term::Match {
                    scrutinee,
                    branches,
                } => {
                    pending.push(scrutinee);
                    pending.extend(branches.iter().map(|b| &b.body));
                }
            }
        }
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
/// A branch-local induction hypothesis, universal only in these parameters.
/// The recursive argument is already fixed to an immediate constructor field.
#[derive(Clone, Debug)]
struct InductionSchema {
    params: Vec<(String, Sort)>,
    equation: Equation,
}
#[derive(Clone, Debug)]
enum Kind {
    Datatype(Vec<Constructor>),
    Function(Function),
    Theorem(Theorem),
    AbstractSort,
    AbstractFunction(Vec<Sort>, Sort),
    Assumption(Theorem),
}
#[derive(Clone, Debug)]
struct Entry {
    id: String,
    kind: Kind,
    dependencies: Vec<Arc<Entry>>,
    /// Abstract sorts, functions and assumptions this entry's meaning or
    /// validity depends on. Empty means closed (ordinary, checkable).
    parameters: BTreeSet<String>,
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
    pub fn bitvector_problem(
        &self,
        params: &[(String, Sort)],
        conditions: &[Equation],
        from: &Term,
        to: &Term,
    ) -> LangResult<crate::bitproof::Problem> {
        let env = self.env(params)?;
        let mut budget = Budget::new();
        if conditions.len() > 64 {
            return Err("logic theorem premise count limit".into());
        }
        let conditions = conditions
            .iter()
            .map(|e| prepare(e, &env, self, &mut budget))
            .collect::<LangResult<Vec<_>>>()?;
        let goal = prepare(
            &Equation {
                from: from.clone(),
                to: to.clone(),
            },
            &env,
            self,
            &mut budget,
        )?;
        crate::bitproof::problem(&env, &conditions, &goal)
    }
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
    /// Parameter sorts and result of a defined or abstract function.
    fn signature(&self, id: &str, internal: bool) -> LangResult<(Vec<Sort>, Sort)> {
        match &self.entry(id, internal)?.kind {
            Kind::Function(f) => Ok((
                f.params.iter().map(|p| p.1.clone()).collect(),
                f.result.clone(),
            )),
            Kind::AbstractFunction(params, result) => Ok((params.clone(), result.clone())),
            _ => Err("expected function".into()),
        }
    }
    fn sort(&self, sort: &Sort) -> LangResult<()> {
        match sort {
            Sort::Bool | Sort::U64 => Ok(()),
            Sort::Data(id) => match &self.entry(id, false)?.kind {
                Kind::Datatype(_) | Kind::AbstractSort => Ok(()),
                _ => Err("expected datatype".into()),
            },
            Sort::SelfType => Err("SelfType only allowed in datatype fields".into()),
        }
    }
    /// Union of the abstract parameters of the referenced entries.
    fn parameters(&self, references: &BTreeSet<String>) -> LangResult<BTreeSet<String>> {
        let mut out = BTreeSet::new();
        for id in references {
            out.extend(self.entry(id, true)?.parameters.iter().cloned());
        }
        Ok(out)
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
        // Entries referenced by the declaration: their abstract parameters
        // become this entry's parameters, so nothing that depends on an
        // uninterpreted symbol or an assumption can pass as closed.
        let mut references = BTreeSet::new();
        let mut own = BTreeSet::new();
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
                            sort_references(field, &mut references);
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
                    let Some(Sort::Data(data)) = params.get(*index).map(|p| &p.1) else {
                        return Err("recursive parameter must be an inductive datatype".into());
                    };
                    self.datatype(data, false)?;
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
                for (_, sort) in params {
                    sort_references(sort, &mut references);
                }
                sort_references(result, &mut references);
                term_references(body, &mut references);
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
                let statement = self.statement(params, conditions, from, to, &mut budget)?;
                let (env, hypotheses, equation) = &statement;
                if derive(proof, env, self, hypotheses, &[], &mut budget, 0)? != *equation {
                    return Err("inductive proof proves a different statement".into());
                }
                statement_references(params, conditions, from, to, &mut references);
                proof_references(proof, &mut references);
                Kind::Theorem(Theorem {
                    params: params.clone(),
                    conditions: statement.1,
                    equation: statement.2,
                })
            }
            Declaration::AbstractSort { name: label } => {
                name(label)?;
                own.insert(id.clone());
                Kind::AbstractSort
            }
            Declaration::AbstractFunction {
                name: label,
                params,
                result,
            } => {
                name(label)?;
                self.env(params)?;
                self.sort(result)?;
                for sort in params.iter().map(|p| &p.1).chain([result]) {
                    sort_references(sort, &mut references);
                }
                own.insert(id.clone());
                Kind::AbstractFunction(params.iter().map(|p| p.1.clone()).collect(), result.clone())
            }
            Declaration::Assumption {
                params,
                conditions,
                from,
                to,
            } => {
                let (_, hypotheses, equation) =
                    self.statement(params, conditions, from, to, &mut budget)?;
                statement_references(params, conditions, from, to, &mut references);
                own.insert(id.clone());
                Kind::Assumption(Theorem {
                    params: params.clone(),
                    conditions: hypotheses,
                    equation,
                })
            }
        };
        let mut parameters = self.parameters(&references)?;
        parameters.extend(own);
        self.install(Arc::new(Entry {
            id,
            kind,
            dependencies: self.visible.values().cloned().collect(),
            parameters,
        }))
    }
    fn statement(
        &self,
        params: &[(String, Sort)],
        conditions: &[Equation],
        from: &Term,
        to: &Term,
        budget: &mut Budget,
    ) -> LangResult<(Env, Vec<Equation>, Equation)> {
        let env = self.env(params)?;
        if conditions.len() > 64 {
            return Err("logic theorem premise count limit".into());
        }
        let hypotheses = conditions
            .iter()
            .map(|e| prepare(e, &env, self, budget))
            .collect::<LangResult<Vec<_>>>()?;
        let equation = prepare(
            &Equation {
                from: from.clone(),
                to: to.clone(),
            },
            &env,
            self,
            budget,
        )?;
        Ok((env, hypotheses, equation))
    }
    /// Check a closed obligation. A conclusion that depends on an abstract
    /// symbol or an assumption is refused: general laws reach concrete
    /// obligations only through `Proof::Instance`.
    pub fn check(
        &self,
        params: &[(String, Sort)],
        conditions: &[Equation],
        from: &Term,
        to: &Term,
        proof: &Proof,
    ) -> LangResult<()> {
        let mut budget = Budget::new();
        let (env, hypotheses, want) = self.statement(params, conditions, from, to, &mut budget)?;
        if derive(proof, &env, self, &hypotheses, &[], &mut budget, 0)? != want {
            return Err("inductive proof proves a different statement".into());
        }
        let mut references = BTreeSet::new();
        statement_references(params, conditions, from, to, &mut references);
        proof_references(proof, &mut references);
        if !self.parameters(&references)?.is_empty() {
            return Err(
                "checked conclusion depends on abstract parameters or assumptions; instantiate the general law"
                    .into(),
            );
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
            let (params, result) = c.signature(function, internal)?;
            check_args(
                &params,
                arguments,
                env,
                c,
                pending,
                internal,
                budget,
                depth + 1,
            )?;
            Ok(result)
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
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            if infer(condition, env, c, pending, internal, budget, depth + 1)? != Sort::Bool {
                return Err("conditional requires Bool".into());
            }
            let ty = infer(on_true, env, c, pending, internal, budget, depth + 1)?;
            if infer(on_false, env, c, pending, internal, budget, depth + 1)? != ty {
                return Err("conditional branch sorts differ".into());
            }
            Ok(ty)
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
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            for t in [condition, on_true, on_false] {
                terminating(t, f, smaller, c, budget, depth + 1)?;
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
        Term::If {
            condition,
            on_true,
            on_false,
        } => Term::If {
            condition: Box::new(bind_self(condition, id, budget, depth + 1)?),
            on_true: Box::new(bind_self(on_true, id, budget, depth + 1)?),
            on_false: Box::new(bind_self(on_false, id, budget, depth + 1)?),
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
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            for t in [condition, on_true, on_false] {
                names(t, out, budget, depth + 1)?;
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
        Term::Var(n) => match bindings.get(n) {
            Some(value) => {
                budget.copy(value)?;
                value.clone()
            }
            None => t.clone(),
        },
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
        Term::If {
            condition,
            on_true,
            on_false,
        } => Term::If {
            condition: Box::new(substitute(condition, bindings, budget, depth + 1)?),
            on_true: Box::new(substitute(on_true, bindings, budget, depth + 1)?),
            on_false: Box::new(substitute(on_false, bindings, budget, depth + 1)?),
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
            let args = arguments
                .iter()
                .map(|a| normal(a, c, budget, depth + 1))
                .collect::<LangResult<Vec<_>>>()?;
            let f = match &c.entry(function, true)?.kind {
                Kind::Function(f) => f,
                // An uninterpreted function never computes.
                Kind::AbstractFunction(..) => {
                    return Ok(Term::Call {
                        function: function.clone(),
                        arguments: args,
                    })
                }
                _ => return Err("expected function".into()),
            };
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
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            let condition = normal(condition, c, budget, depth + 1)?;
            match condition {
                Term::Bool(true) => normal(on_true, c, budget, depth + 1),
                Term::Bool(false) => normal(on_false, c, budget, depth + 1),
                _ => Ok(Term::If {
                    condition: Box::new(condition),
                    on_true: Box::new(normal(on_true, c, budget, depth + 1)?),
                    on_false: Box::new(normal(on_false, c, budget, depth + 1)?),
                }),
            }
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
// Normalised equality terms have canonical lexical binders. Substitution may
// freshen a stuck Match more than once; those spellings do not change its value.
// Free variables are preserved, including internal names, so canonicalisation
// cannot turn variable capture into an equality.
fn alpha_normal(t: Term, budget: &mut Budget) -> LangResult<Term> {
    fn free(
        t: &Term,
        bound: &BTreeSet<String>,
        out: &mut BTreeSet<String>,
        has_match: &mut bool,
        budget: &mut Budget,
        depth: usize,
    ) -> LangResult<()> {
        budget.step(depth)?;
        match t {
            Term::Var(n) => {
                if !bound.contains(n) {
                    out.insert(n.clone());
                }
            }
            Term::Binary { left, right, .. } => {
                free(left, bound, out, has_match, budget, depth + 1)?;
                free(right, bound, out, has_match, budget, depth + 1)?;
            }
            Term::Construct { arguments, .. }
            | Term::Call { arguments, .. }
            | Term::SelfCall(arguments) => {
                for a in arguments {
                    free(a, bound, out, has_match, budget, depth + 1)?;
                }
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                for a in [condition, on_true, on_false] {
                    free(a, bound, out, has_match, budget, depth + 1)?;
                }
            }
            Term::Match {
                scrutinee,
                branches,
            } => {
                *has_match = true;
                free(scrutinee, bound, out, has_match, budget, depth + 1)?;
                for b in branches {
                    let mut local = bound.clone();
                    local.extend(b.bindings.iter().cloned());
                    free(&b.body, &local, out, has_match, budget, depth + 1)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn rename(
        t: &Term,
        env: &BTreeMap<String, String>,
        avoid: &BTreeSet<String>,
        next: &mut usize,
        budget: &mut Budget,
        depth: usize,
    ) -> LangResult<Term> {
        budget.step(depth)?;
        Ok(match t {
            Term::Var(n) => Term::Var(env.get(n).unwrap_or(n).clone()),
            Term::Binary { op, left, right } => Term::Binary {
                op: op.clone(),
                left: Box::new(rename(left, env, avoid, next, budget, depth + 1)?),
                right: Box::new(rename(right, env, avoid, next, budget, depth + 1)?),
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
                    .map(|a| rename(a, env, avoid, next, budget, depth + 1))
                    .collect::<LangResult<_>>()?,
            },
            Term::Call {
                function,
                arguments,
            } => Term::Call {
                function: function.clone(),
                arguments: arguments
                    .iter()
                    .map(|a| rename(a, env, avoid, next, budget, depth + 1))
                    .collect::<LangResult<_>>()?,
            },
            Term::SelfCall(arguments) => Term::SelfCall(
                arguments
                    .iter()
                    .map(|a| rename(a, env, avoid, next, budget, depth + 1))
                    .collect::<LangResult<_>>()?,
            ),
            Term::If {
                condition,
                on_true,
                on_false,
            } => Term::If {
                condition: Box::new(rename(condition, env, avoid, next, budget, depth + 1)?),
                on_true: Box::new(rename(on_true, env, avoid, next, budget, depth + 1)?),
                on_false: Box::new(rename(on_false, env, avoid, next, budget, depth + 1)?),
            },
            Term::Match {
                scrutinee,
                branches,
            } => {
                let scrutinee = Box::new(rename(scrutinee, env, avoid, next, budget, depth + 1)?);
                let mut cases = Vec::new();
                for b in branches {
                    let mut local = env.clone();
                    let mut bindings = Vec::new();
                    for old in &b.bindings {
                        let fresh = loop {
                            let n = format!("$a{}", *next);
                            *next += 1;
                            if !avoid.contains(&n) {
                                break n;
                            }
                        };
                        local.insert(old.clone(), fresh.clone());
                        bindings.push(fresh);
                    }
                    cases.push(Branch {
                        bindings,
                        body: rename(&b.body, &local, avoid, next, budget, depth + 1)?,
                    });
                }
                Term::Match {
                    scrutinee,
                    branches: cases,
                }
            }
            _ => t.clone(),
        })
    }
    if matches!(t, Term::Var(_) | Term::Bool(_) | Term::U64(_)) {
        return Ok(t);
    }
    let mut avoid = BTreeSet::new();
    let mut has_match = false;
    free(&t, &BTreeSet::new(), &mut avoid, &mut has_match, budget, 0)?;
    if !has_match {
        return Ok(t);
    }
    rename(&t, &BTreeMap::new(), &avoid, &mut 0, budget, 0)
}
fn normalize_pair(e: Equation, c: &Context, budget: &mut Budget) -> LangResult<Equation> {
    Ok(Equation {
        from: alpha_normal(normal(&e.from, c, budget, 0)?, budget)?,
        to: alpha_normal(normal(&e.to, c, budget, 0)?, budget)?,
    })
}

#[cfg(test)]
mod alpha_tests {
    use super::*;
    #[test]
    fn free_internal_names_and_nested_shadowing_survive_canonicalisation() {
        let t = Term::Match {
            scrutinee: Box::new(Term::Var("source".into())),
            branches: vec![Branch {
                bindings: vec!["x".into()],
                body: Term::Binary {
                    op: "+".into(),
                    left: Box::new(Term::Var("$a0".into())),
                    right: Box::new(Term::Match {
                        scrutinee: Box::new(Term::Var("x".into())),
                        branches: vec![Branch {
                            bindings: vec!["x".into()],
                            body: Term::Var("x".into()),
                        }],
                    }),
                },
            }],
        };
        let n = alpha_normal(t, &mut Budget::new()).unwrap();
        let Term::Match { branches, .. } = &n else {
            panic!()
        };
        assert_eq!(branches[0].bindings, ["$a1"]);
        let Term::Binary { left, right, .. } = &branches[0].body else {
            panic!()
        };
        assert_eq!(**left, Term::Var("$a0".into()));
        let Term::Match {
            scrutinee,
            branches,
        } = &**right
        else {
            panic!()
        };
        assert_eq!(**scrutinee, Term::Var("$a1".into()));
        assert_eq!(branches[0].bindings, ["$a2"]);
        assert_eq!(branches[0].body, Term::Var("$a2".into()));
        assert_eq!(alpha_normal(n.clone(), &mut Budget::new()).unwrap(), n);
        let mut budget = Budget::new();
        budget.remaining = 0;
        assert!(alpha_normal(n, &mut budget).is_err());
    }
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
fn independent_induction_premises(
    variables: &BTreeSet<String>,
    hypotheses: &[Equation],
    schemas: &[InductionSchema],
    budget: &mut Budget,
) -> LangResult<()> {
    for (equation, bound) in hypotheses.iter().map(|e| (e, BTreeSet::new())).chain(
        schemas
            .iter()
            .map(|s| (&s.equation, s.params.iter().map(|p| p.0.clone()).collect())),
    ) {
        let mut used = BTreeSet::new();
        names(&equation.from, &mut used, budget, 0)?;
        names(&equation.to, &mut used, budget, 0)?;
        if variables
            .iter()
            .any(|v| used.contains(v) && !bound.contains(v))
        {
            return Err("induction under variable-dependent premises is unsupported".into());
        }
    }
    Ok(())
}
/// A substitution of interpretations for abstract symbols and of existing
/// definitions for parametric ones. Inserted function bodies are closed terms
/// of the target context and are never substituted again.
struct Interpretation<'a> {
    sorts: &'a BTreeMap<String, Sort>,
    functions: &'a BTreeMap<String, Lambda>,
    definitions: &'a BTreeMap<String, String>,
    c: &'a Context,
}
impl Interpretation<'_> {
    fn parametric(&self, id: &str) -> LangResult<bool> {
        Ok(!self.c.entry(id, true)?.parameters.is_empty())
    }
    fn sort(&self, sort: &Sort) -> LangResult<Sort> {
        Ok(match sort {
            Sort::Data(id) => {
                if let Some(target) = self.sorts.get(id) {
                    target.clone()
                } else if let Some(target) = self.definitions.get(id) {
                    Sort::Data(target.clone())
                } else if self.parametric(id)? {
                    return Err("uninterpreted parametric sort in instance".into());
                } else {
                    sort.clone()
                }
            }
            Sort::SelfType => return Err("SelfType outside datatype declaration".into()),
            _ => sort.clone(),
        })
    }
    fn datatype(&self, id: &str) -> LangResult<String> {
        if let Some(target) = self.definitions.get(id) {
            Ok(target.clone())
        } else if self.parametric(id)? {
            Err("uninterpreted parametric datatype in instance".into())
        } else {
            Ok(id.to_owned())
        }
    }
    fn equation(&self, e: &Equation, budget: &mut Budget) -> LangResult<Equation> {
        Ok(Equation {
            from: self.term(&e.from, budget, 0)?,
            to: self.term(&e.to, budget, 0)?,
        })
    }
    fn term(&self, t: &Term, budget: &mut Budget, depth: usize) -> LangResult<Term> {
        budget.step(depth)?;
        let all = |arguments: &[Term], budget: &mut Budget| {
            arguments
                .iter()
                .map(|a| self.term(a, budget, depth + 1))
                .collect::<LangResult<Vec<_>>>()
        };
        Ok(match t {
            Term::Var(_) | Term::Bool(_) | Term::U64(_) => t.clone(),
            Term::Construct {
                datatype,
                constructor,
                arguments,
            } => Term::Construct {
                datatype: self.datatype(datatype)?,
                constructor: *constructor,
                arguments: all(arguments, budget)?,
            },
            Term::Call {
                function,
                arguments,
            } => {
                let arguments = all(arguments, budget)?;
                if let Some(lambda) = self.functions.get(function) {
                    let bindings = lambda.params.iter().cloned().zip(arguments).collect();
                    substitute(&lambda.body, &bindings, budget, depth + 1)?
                } else if let Some(target) = self.definitions.get(function) {
                    Term::Call {
                        function: target.clone(),
                        arguments,
                    }
                } else if self.parametric(function)? {
                    return Err("uninterpreted parametric function in instance".into());
                } else {
                    Term::Call {
                        function: function.clone(),
                        arguments,
                    }
                }
            }
            Term::SelfCall(_) => return Err("unbound recursive call in instance".into()),
            Term::Binary { op, left, right } => Term::Binary {
                op: op.clone(),
                left: Box::new(self.term(left, budget, depth + 1)?),
                right: Box::new(self.term(right, budget, depth + 1)?),
            },
            Term::If {
                condition,
                on_true,
                on_false,
            } => Term::If {
                condition: Box::new(self.term(condition, budget, depth + 1)?),
                on_true: Box::new(self.term(on_true, budget, depth + 1)?),
                on_false: Box::new(self.term(on_false, budget, depth + 1)?),
            },
            Term::Match {
                scrutinee,
                branches,
            } => Term::Match {
                scrutinee: Box::new(self.term(scrutinee, budget, depth + 1)?),
                branches: branches
                    .iter()
                    .map(|b| {
                        Ok(Branch {
                            bindings: b.bindings.clone(),
                            body: self.term(&b.body, budget, depth + 1)?,
                        })
                    })
                    .collect::<LangResult<_>>()?,
            },
        })
    }
}
fn sort_references(sort: &Sort, out: &mut BTreeSet<String>) {
    if let Sort::Data(id) = sort {
        out.insert(id.clone());
    }
}
fn term_references(t: &Term, out: &mut BTreeSet<String>) {
    match t {
        Term::Construct {
            datatype,
            arguments,
            ..
        } => {
            out.insert(datatype.clone());
            arguments.iter().for_each(|a| term_references(a, out));
        }
        Term::Call {
            function,
            arguments,
        } => {
            out.insert(function.clone());
            arguments.iter().for_each(|a| term_references(a, out));
        }
        Term::SelfCall(arguments) => arguments.iter().for_each(|a| term_references(a, out)),
        Term::Binary { left, right, .. } => {
            term_references(left, out);
            term_references(right, out);
        }
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            for t in [condition, on_true, on_false] {
                term_references(t, out);
            }
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            term_references(scrutinee, out);
            branches.iter().for_each(|b| term_references(&b.body, out));
        }
        Term::Var(_) | Term::Bool(_) | Term::U64(_) => {}
    }
}
fn statement_references(
    params: &[(String, Sort)],
    conditions: &[Equation],
    from: &Term,
    to: &Term,
    out: &mut BTreeSet<String>,
) {
    params.iter().for_each(|p| sort_references(&p.1, out));
    for e in conditions {
        term_references(&e.from, out);
        term_references(&e.to, out);
    }
    term_references(from, out);
    term_references(to, out);
}
/// Entries a proof relies on. An `Instance` relies on its interpretations, not
/// on the abstract symbols it interprets: those are discharged by the rule.
fn proof_references(p: &Proof, out: &mut BTreeSet<String>) {
    let terms = |ts: &[&Term], out: &mut BTreeSet<String>| ts.iter().for_each(|t| term_references(t, out));
    match p {
        Proof::BitVector { from, to, .. } | Proof::Convert { from, to } => terms(&[from, to], out),
        Proof::Substitute {
            context, equality, ..
        } => {
            term_references(context, out);
            proof_references(equality, out);
        }
        Proof::BoolSplit {
            condition,
            from,
            to,
            on_false,
            on_true,
        } => {
            terms(&[condition, from, to], out);
            proof_references(on_false, out);
            proof_references(on_true, out);
        }
        Proof::BoolCases {
            from,
            to,
            on_false,
            on_true,
            ..
        } => {
            terms(&[from, to], out);
            proof_references(on_false, out);
            proof_references(on_true, out);
        }
        Proof::Refl(t) => term_references(t, out),
        Proof::Hypothesis(_) => {}
        Proof::Sym(p) => proof_references(p, out),
        Proof::Trans(p, q) => {
            proof_references(p, out);
            proof_references(q, out);
        }
        Proof::Construct {
            datatype,
            arguments,
            ..
        } => {
            out.insert(datatype.clone());
            arguments.iter().for_each(|p| proof_references(p, out));
        }
        Proof::Call {
            function,
            arguments,
        } => {
            out.insert(function.clone());
            arguments.iter().for_each(|p| proof_references(p, out));
        }
        Proof::Binary { left, right, .. } => {
            proof_references(left, out);
            proof_references(right, out);
        }
        Proof::Use {
            theorem,
            arguments,
            premises,
        } => {
            out.insert(theorem.clone());
            arguments.iter().for_each(|t| term_references(t, out));
            premises.iter().for_each(|p| proof_references(p, out));
        }
        Proof::Induction {
            from, to, cases, ..
        }
        | Proof::GeneralizedInduction {
            from, to, cases, ..
        } => {
            terms(&[from, to], out);
            cases.iter().for_each(|c| proof_references(&c.proof, out));
        }
        Proof::GeneralizedHypothesis { arguments, .. } => {
            arguments.iter().for_each(|t| term_references(t, out))
        }
        Proof::Instance {
            sorts,
            functions,
            definitions,
            assumptions,
            arguments,
            premises,
            ..
        } => {
            sorts.values().for_each(|s| sort_references(s, out));
            functions
                .values()
                .for_each(|l| term_references(&l.body, out));
            out.extend(definitions.values().cloned());
            assumptions.values().for_each(|p| proof_references(p, out));
            arguments.iter().for_each(|t| term_references(t, out));
            premises.iter().for_each(|p| proof_references(p, out));
        }
    }
}
fn derive(
    p: &Proof,
    env: &Env,
    c: &Context,
    hypotheses: &[Equation],
    schemas: &[InductionSchema],
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
        Proof::BitVector {
            from,
            to,
            hypotheses: selected,
            certificate,
        } => {
            if selected.len() > 128 {
                return Err("bit proof hypothesis count limit".into());
            }
            let want = prepare(
                &Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                budget,
            )?;
            let premises = selected
                .iter()
                .map(|i| {
                    hypotheses
                        .get(*i)
                        .cloned()
                        .ok_or_else(|| "unknown bit proof hypothesis".to_owned())
                })
                .collect::<LangResult<Vec<_>>>()?;
            let problem =
                crate::bitproof::problem_with_work(env, &premises, &want, &mut budget.bit_work)?;
            crate::bitproof::verify_with_work(&problem, certificate, &mut budget.bit_work)?;
            want
        }
        Proof::Substitute {
            variable,
            context,
            equality,
        } => {
            name(variable)?;
            if env.contains_key(variable) {
                return Err("congruence hole must be fresh".into());
            }
            let e = derive(equality, env, c, hypotheses, schemas, budget, depth + 1)?;
            let ty = infer(&e.from, env, c, None, true, budget, 0)?;
            let mut local = env.clone();
            local.insert(variable.clone(), ty);
            infer(context, &local, c, None, false, budget, 0)?;
            Equation {
                from: substitute(context, &[(variable.clone(), e.from)].into(), budget, 0)?,
                to: substitute(context, &[(variable.clone(), e.to)].into(), budget, 0)?,
            }
        }
        Proof::BoolSplit {
            condition,
            from,
            to,
            on_false,
            on_true,
        } => {
            if infer(condition, env, c, None, false, budget, 0)? != Sort::Bool {
                return Err("case condition must be Bool".into());
            }
            let want = prepare(
                &Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                budget,
            )?;
            if hypotheses.len() + schemas.len() >= 128 {
                return Err("logic hypothesis count limit".into());
            }
            for (value, proof) in [(false, on_false), (true, on_true)] {
                let mut local = hypotheses.to_vec();
                local.push(prepare(
                    &Equation {
                        from: condition.clone(),
                        to: Term::Bool(value),
                    },
                    env,
                    c,
                    budget,
                )?);
                if derive(proof, env, c, &local, schemas, budget, depth + 1)? != want {
                    return Err("Boolean condition branch proves a different statement".into());
                }
            }
            want
        }
        Proof::Hypothesis(i) => hypotheses
            .get(*i)
            .cloned()
            .ok_or("unknown logic hypothesis")?,
        Proof::GeneralizedHypothesis { index, arguments } => {
            let schema = schemas
                .get(*index)
                .ok_or("unknown generalized induction hypothesis")?;
            let bindings = instance(&schema.params, arguments, env, c, budget)?;
            sub_pair(&schema.equation, &bindings, c, budget)?
        }
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
            let e = derive(p, env, c, hypotheses, schemas, budget, depth + 1)?;
            Equation {
                from: e.to,
                to: e.from,
            }
        }
        Proof::Trans(p, q) => {
            let a = derive(p, env, c, hypotheses, schemas, budget, depth + 1)?;
            let b = derive(q, env, c, hypotheses, schemas, budget, depth + 1)?;
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
                .map(|p| derive(p, env, c, hypotheses, schemas, budget, depth + 1))
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
            c.signature(function, false)?;
            let pairs = arguments
                .iter()
                .map(|p| derive(p, env, c, hypotheses, schemas, budget, depth + 1))
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
            let l = derive(left, env, c, hypotheses, schemas, budget, depth + 1)?;
            let r = derive(right, env, c, hypotheses, schemas, budget, depth + 1)?;
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
            let (Kind::Theorem(t) | Kind::Assumption(t)) = &c.entry(theorem, false)?.kind else {
                return Err("expected checked theorem".into());
            };
            if premises.len() != t.conditions.len() {
                return Err("logic theorem premise count mismatch".into());
            }
            let bindings = instance(&t.params, arguments, env, c, budget)?;
            for (condition, proof) in t.conditions.iter().zip(premises) {
                if derive(proof, env, c, hypotheses, schemas, budget, depth + 1)?
                    != sub_pair(condition, &bindings, c, budget)?
                {
                    return Err("logic theorem premise proves a different statement".into());
                }
            }
            sub_pair(&t.equation, &bindings, c, budget)?
        }
        Proof::Instance {
            theorem,
            sorts,
            functions,
            definitions,
            assumptions,
            arguments,
            premises,
        } => {
            if sorts.len() + functions.len() + definitions.len() + assumptions.len() > 128 {
                return Err("instance interpretation count limit".into());
            }
            let entry = c.entry(theorem, false)?;
            let (Kind::Theorem(t) | Kind::Assumption(t)) = &entry.kind else {
                return Err("expected checked theorem".into());
            };
            // Interpret exactly the theorem's abstract parameters: every
            // assumption its validity rests on must be discharged here.
            let (mut want_sorts, mut want_functions, mut want_assumptions) =
                (BTreeSet::new(), BTreeSet::new(), BTreeSet::new());
            for id in &entry.parameters {
                match &c.entry(id, true)?.kind {
                    Kind::AbstractSort => want_sorts.insert(id),
                    Kind::AbstractFunction(..) => want_functions.insert(id),
                    Kind::Assumption(_) => want_assumptions.insert(id),
                    _ => return Err("invalid abstract parameter".into()),
                };
            }
            if !sorts.keys().eq(want_sorts.iter().copied())
                || !functions.keys().eq(want_functions.iter().copied())
                || !assumptions.keys().eq(want_assumptions.iter().copied())
            {
                return Err("instance must interpret exactly the theorem's abstract parameters".into());
            }
            for target in sorts.values() {
                c.sort(target)?;
            }
            let s = Interpretation {
                sorts,
                functions,
                definitions,
                c,
            };
            for (id, lambda) in functions {
                let Kind::AbstractFunction(params, result) = &c.entry(id, true)?.kind else {
                    return Err("invalid abstract function".into());
                };
                if lambda.params.len() != params.len() {
                    return Err("instance function arity mismatch".into());
                }
                let mut local = Env::new();
                for (n, sort) in lambda.params.iter().zip(params) {
                    name(n)?;
                    if local.insert(n.clone(), s.sort(sort)?).is_some() {
                        return Err("duplicate instance function parameter".into());
                    }
                }
                // Closed (only its parameters are bound) and SelfCall-free, so
                // it denotes a total function of the instantiated signature.
                if infer(&lambda.body, &local, c, None, false, budget, 0)? != s.sort(result)? {
                    return Err("instance function result type mismatch".into());
                }
            }
            for (from, to) in definitions {
                let source = c.entry(from, true)?;
                if source.parameters.is_empty() {
                    return Err("only parametric definitions are instantiated".into());
                }
                match (&source.kind, &c.entry(to, false)?.kind) {
                    (Kind::Datatype(general), Kind::Datatype(actual)) => {
                        let same = general.len() == actual.len()
                            && general.iter().zip(actual).all(|(g, a)| {
                                g.name == a.name
                                    && g.fields.len() == a.fields.len()
                                    && g.fields
                                        .iter()
                                        .zip(&a.fields)
                                        .all(|(gf, af)| s.sort(gf).ok().as_ref() == Some(af))
                            });
                        if !same {
                            return Err("instantiated datatype differs from its definition".into());
                        }
                    }
                    (Kind::Function(general), Kind::Function(_)) => {
                        let actual = c.function(to, false)?;
                        if general.params.len() != actual.params.len()
                            || general.recursive != actual.recursive
                            || s.sort(&general.result)? != actual.result
                        {
                            return Err("instantiated function signature differs".into());
                        }
                        let mut rename = BTreeMap::new();
                        for (g, a) in general.params.iter().zip(&actual.params) {
                            if s.sort(&g.1)? != a.1 {
                                return Err("instantiated function signature differs".into());
                            }
                            rename.insert(a.0.clone(), Term::Var(g.0.clone()));
                        }
                        let expected = alpha_normal(s.term(&general.body, budget, 0)?, budget)?;
                        let actual =
                            alpha_normal(substitute(&actual.body, &rename, budget, 0)?, budget)?;
                        if expected != actual {
                            return Err("instantiated function body differs from its definition".into());
                        }
                    }
                    _ => return Err("instance definition kind mismatch".into()),
                }
            }
            for (id, proof) in assumptions {
                let Kind::Assumption(a) = &c.entry(id, true)?.kind else {
                    return Err("invalid assumption".into());
                };
                let local = a
                    .params
                    .iter()
                    .map(|(n, sort)| Ok((n.clone(), s.sort(sort)?)))
                    .collect::<LangResult<Env>>()?;
                let hypotheses = a
                    .conditions
                    .iter()
                    .map(|e| normalize_pair(s.equation(e, budget)?, c, budget))
                    .collect::<LangResult<Vec<_>>>()?;
                let want = normalize_pair(s.equation(&a.equation, budget)?, c, budget)?;
                if derive(proof, &local, c, &hypotheses, &[], budget, depth + 1)? != want {
                    return Err("assumption discharge proves a different statement".into());
                }
            }
            if premises.len() != t.conditions.len() {
                return Err("logic theorem premise count mismatch".into());
            }
            let params = t
                .params
                .iter()
                .map(|(n, sort)| Ok((n.clone(), s.sort(sort)?)))
                .collect::<LangResult<Vec<_>>>()?;
            let bindings = instance(&params, arguments, env, c, budget)?;
            for (condition, proof) in t.conditions.iter().zip(premises) {
                if derive(proof, env, c, hypotheses, schemas, budget, depth + 1)?
                    != sub_pair(&s.equation(condition, budget)?, &bindings, c, budget)?
                {
                    return Err("logic theorem premise proves a different statement".into());
                }
            }
            sub_pair(&s.equation(&t.equation, budget)?, &bindings, c, budget)?
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
            independent_induction_premises(
                &[variable.clone()].into(),
                hypotheses,
                schemas,
                budget,
            )?;
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
                if local_hypotheses.len() + schemas.len() > 128 {
                    return Err("logic hypothesis count limit".into());
                }
                if derive(
                    &case.proof,
                    &local,
                    c,
                    &local_hypotheses,
                    schemas,
                    budget,
                    depth + 1,
                )? != want
                {
                    return Err("induction branch proves a different statement".into());
                }
            }
            normalize_pair(original, c, budget)?
        }
        Proof::GeneralizedInduction {
            variable,
            generalize,
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
            if generalize.len() > 64 {
                return Err("generalized induction parameter count limit".into());
            }
            let mut variables = BTreeSet::from([variable.clone()]);
            let mut params = Vec::new();
            for parameter in generalize {
                name(parameter)?;
                if !variables.insert(parameter.clone()) {
                    return Err("duplicate or recursive generalized parameter".into());
                }
                params.push((
                    parameter.clone(),
                    env.get(parameter)
                        .cloned()
                        .ok_or("unknown generalized parameter")?,
                ));
            }
            // Fixed assumptions cannot be quantified over new parameter values.
            // Existing schemas are checked for free, rather than bound, uses.
            independent_induction_premises(&variables, hypotheses, schemas, budget)?;
            let original = Equation {
                from: from.clone(),
                to: to.clone(),
            };
            typed_pair(&original, env, c, false, budget)?;
            for (index, (case, constructor)) in cases.iter().zip(constructors).enumerate() {
                let mut local = branch_env(&case.bindings, &constructor.fields, env, false)?;
                local.remove(variable);
                let value = Term::Construct {
                    datatype: id.clone(),
                    constructor: index,
                    arguments: case.bindings.iter().cloned().map(Term::Var).collect(),
                };
                let want = sub_pair(&original, &[(variable.clone(), value)].into(), c, budget)?;
                let mut local_schemas = schemas.to_vec();
                for (binding, sort) in case.bindings.iter().zip(&constructor.fields) {
                    if sort == &Sort::Data(id.clone()) {
                        local_schemas.push(InductionSchema {
                            params: params.clone(),
                            equation: sub_pair(
                                &original,
                                &[(variable.clone(), Term::Var(binding.clone()))].into(),
                                c,
                                budget,
                            )?,
                        });
                    }
                }
                if local_schemas.len() + hypotheses.len() > 128 {
                    return Err("logic hypothesis count limit".into());
                }
                if derive(
                    &case.proof,
                    &local,
                    c,
                    hypotheses,
                    &local_schemas,
                    budget,
                    depth + 1,
                )? != want
                {
                    return Err("generalized induction branch proves a different statement".into());
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
                let local_schemas = schemas
                    .iter()
                    .map(|s| {
                        let free = bindings
                            .iter()
                            .filter(|(n, _)| !s.params.iter().any(|p| &p.0 == *n))
                            .map(|(n, t)| (n.clone(), t.clone()))
                            .collect();
                        Ok(InductionSchema {
                            params: s.params.clone(),
                            equation: sub_pair(&s.equation, &free, c, budget)?,
                        })
                    })
                    .collect::<LangResult<Vec<_>>>()?;
                if derive(proof, &local, c, &hs, &local_schemas, budget, depth + 1)? != want {
                    return Err("Boolean branch proves a different statement".into());
                }
            }
            normalize_pair(original, c, budget)?
        }
    };
    typed_pair(&equation, env, c, true, budget)?;
    normalize_pair(equation, c, budget)
}
