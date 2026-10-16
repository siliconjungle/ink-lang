//! First-order inductive equality: typed constructors, terminating definitions,
//! definitional computation and induction. Optimisation laws are not primitives.
use crate::LangResult;
use serde::{Deserialize, Serialize};
use std::{
    collections::{BTreeMap, BTreeSet, HashMap},
    sync::Arc,
};
#[path = "logic_conversion.rs"]
mod conversion;

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Sort {
    Bool,
    U64,
    Data(String),
    SelfType,
}
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
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
/// Immediate checked-term children in evaluation order. Structural analysis only.
pub fn term_children(term: &Term) -> Vec<&Term> {
    match term {
        Term::Construct { arguments, .. } | Term::Call { arguments, .. } | Term::SelfCall(arguments) => arguments.iter().collect(),
        Term::Binary { left, right, .. } => vec![left, right],
        Term::If { condition, on_true, on_false } => vec![condition, on_true, on_false],
        Term::Match { scrutinee, branches } => std::iter::once(scrutinee.as_ref()).chain(branches.iter().map(|b| &b.body)).collect(),
        Term::Var(_) | Term::Bool(_) | Term::U64(_) => vec![],
    }
}

/// Iterative traversal avoids consuming the host stack for syntax analysis.
pub fn walk_term(term: &Term, mut visit: impl FnMut(&Term)) {
    let mut pending = vec![term];
    while let Some(term) = pending.pop() {
        visit(term);
        pending.extend(term_children(term).into_iter().rev());
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Branch {
    pub bindings: Vec<String>,
    pub body: Term,
}
#[derive(Clone, Debug, PartialEq, Eq, Hash, Serialize, Deserialize)]
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
    /// Equality of every bit of a fixed-width word, checked through covering masks.
    WordExtensionality {
        from: Term,
        to: Term,
        parts: Vec<(u64, Proof)>,
    },
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
    /// Exhaustive elimination of an inductive value, without granting any
    /// induction hypothesis. Each branch gets only scrutinee = constructor.
    /// This also permits case analysis beneath existing conditional premises.
    /// Exactly one subject is required. Variable cases substitute each constructor
    /// into the goal and premises; scrutinee cases retain them and add its equality.
    Cases {
        #[serde(default, skip_serializing_if = "Option::is_none")]
        scrutinee: Option<Term>,
        #[serde(default, skip_serializing_if = "Option::is_none")]
        variable: Option<String>,
        from: Term,
        to: Term,
        cases: Vec<Case>,
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
    AbstractSort {
        name: String,
    },
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
    normal_calls: HashMap<(Term, usize), Term>,
    normal_nodes: usize,
    normal_context: Option<usize>,
    prepared_cache: Vec<(usize, Env, Equation, Equation, usize)>,
    prepared_nodes: usize,
}
impl Budget {
    fn new() -> Self {
        Self {
            remaining: 1_000_000,
            bit_work: 20_000_000,
            normal_calls: HashMap::new(),
            normal_nodes: 0,
            normal_context: None,
            prepared_cache: Vec::new(),
            prepared_nodes: 0,
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
        return Err(format!("invalid logic binder name {n:?}"));
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
        self.bitvector_problem_with_encoding(
            params, conditions, from, to, crate::bitproof::Encoding::LiteralV1,
        )
    }
    pub fn bitvector_problem_with_encoding(
        &self,
        params: &[(String, Sort)],
        conditions: &[Equation],
        from: &Term,
        to: &Term,
        encoding: crate::bitproof::Encoding,
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
        crate::bitproof::problem_with_encoding(&env, &conditions, &goal, encoding)
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
            .ok_or_else(|| format!("unknown or undeclared logic entry {id}"))
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
            existing: &BTreeMap<String, Arc<Entry>>,
            pending: &mut BTreeMap<String, Arc<Entry>>,
            depth: usize,
        ) -> LangResult<()> {
            if let Some(old) = existing.get(&entry.id).or_else(|| pending.get(&entry.id)) {
                if Arc::ptr_eq(old, entry) {
                    return Ok(());
                }
                return Err("conflicting checked logic identity".into());
            }
            if depth > 64 || existing.len() + pending.len() >= crate::registry::MAX_VIEW_ENTRIES {
                return Err("logic context closure limit".into());
            }
            for dep in &entry.dependencies {
                collect(dep, existing, pending, depth + 1)?
            }
            // Dependencies may have filled the remaining capacity.
            if existing.len() + pending.len() >= crate::registry::MAX_VIEW_ENTRIES {
                return Err("logic context closure limit".into());
            }
            pending.insert(entry.id.clone(), entry.clone());
            Ok(())
        }
        // Stage only new entries. A failed import leaves both contexts unchanged,
        // without copying the already checked dependency closure on each import.
        let mut pending = BTreeMap::new();
        collect(&entry, &self.all, &mut pending, 0)?;
        self.all.extend(pending);
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
                if !same_equation(
                    &derive(proof, env, self, hypotheses, &[], &mut budget, 0)?,
                    equation,
                    self,
                    &mut budget,
                )? {
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
            .map(|e| raw_pair(e.clone(), &env, self, false, budget))
            .collect::<LangResult<Vec<_>>>()?;
        let equation = raw_pair(
            Equation {
                from: from.clone(),
                to: to.clone(),
            },
            &env,
            self,
            false,
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
        if !same_equation(
            &derive(proof, &env, self, &hypotheses, &[], &mut budget, 0)?,
            &want,
            self,
            &mut budget,
        )? {
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
/// Arithmetic has one portable quiet NaN; transport and negation preserve bits.
pub fn canonical_f32_bits(value: f32) -> u32 {
    if value.is_nan() {
        0x7fc00000
    } else {
        value.to_bits()
    }
}
/// Fixed binary32 operations over raw 32-bit words.
pub fn f32_primitive(op: &str, a: u64, b: u64) -> LangResult<Term> {
    let x = f32::from_bits(a as u32);
    let y = f32::from_bits(b as u32);
    Ok(match op {
        "f32:+" => Term::U64(canonical_f32_bits(x + y) as u64),
        "f32:-" => Term::U64(canonical_f32_bits(x - y) as u64),
        "f32:*" => Term::U64(canonical_f32_bits(x * y) as u64),
        "f32:sqrt" => Term::U64(crate::primitives::sqrt_bits(a as u32) as u64),
        "f32:div" => Term::U64(canonical_f32_bits(x / y) as u64),
        "f32:floor" => Term::U64(canonical_f32_bits(x.floor()) as u64),
        "f32:ceil" => Term::U64(canonical_f32_bits(x.ceil()) as u64),
        "f32:trunc" => Term::U64(canonical_f32_bits(x.trunc()) as u64),
        "f32:round_ties_even" => Term::U64(canonical_f32_bits(x.round_ties_even()) as u64),
        "f32:is_nan" => Term::Bool(x.is_nan()),"f32:is_finite" => Term::Bool(x.is_finite()),
        "f32:neg" => Term::U64((a as u32 ^ 0x80000000) as u64),
        "f32:==" => Term::Bool(x == y),
        "f32:!=" => Term::Bool(x != y),
        "f32:<" => Term::Bool(x < y),
        "f32:<=" => Term::Bool(x <= y),
        "f32:>" => Term::Bool(x > y),
        "f32:>=" => Term::Bool(x >= y),
        _ => return Err("unsupported binary32 primitive".into()),
    })
}
fn primitive(op: &str, left: &Sort, right: &Sort) -> LangResult<Sort> {
    if left != right {
        return Err("primitive operand type mismatch".into());
    }
    if op.starts_with("f32:") && *left == Sort::U64 {
        return match &op[4..] {
            "+" | "-" | "*" | "neg" | "sqrt" | "div" | "floor" | "ceil" | "trunc" | "round_ties_even" => Ok(Sort::U64),
            "==" | "!=" | "<" | "<=" | ">" | ">=" | "is_nan" | "is_finite" => Ok(Sort::Bool),
            _ => Err("unsupported binary32 primitive".into()),
        };
    }
    match (op, left) {
        ("+" | "-" | "*" | "&" | "quot" | "rem", Sort::U64) => Ok(Sort::U64),
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
            return Err(format!("logic binder {n} shadows an existing variable"));
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
/// Bounded capture-avoiding substitution for compile-time structural transforms.
pub fn substitute_term(term: &Term, bindings: &BTreeMap<String, Term>) -> LangResult<Term> {
    substitute(term, bindings, &mut Budget::new(), 0)
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
    if bindings
        .iter()
        .all(|(name, value)| matches!(value,Term::Var(n)if n==name))
    {
        budget.copy(t)?;
        return Ok(t.clone());
    }
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
/// Expose an elimination discriminator without normalising constructor fields.
/// All terms are checked before conversion. This only changes evaluation order
/// for the existing total definitions; it introduces no equations or axioms.
fn head(t: &Term, c: &Context, budget: &mut Budget, depth: usize) -> LangResult<Term> {
    budget.step(depth)?;
    match t {
        Term::Call {
            function,
            arguments,
        } => {
            let Kind::Function(f) = &c.entry(function, true)?.kind else {
                budget.copy(t)?;
                return Ok(t.clone());
            };
            for argument in arguments {
                budget.copy(argument)?;
            }
            let mut args = arguments.clone();
            if let Some(i) = f.recursive {
                args[i] = head(&args[i], c, budget, depth + 1)?;
                if !matches!(args[i], Term::Construct { .. }) {
                    return Ok(Term::Call {
                        function: function.clone(),
                        arguments: args,
                    });
                }
            }
            let bindings = f.params.iter().map(|p| p.0.clone()).zip(args).collect();
            head(
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
            let value = head(scrutinee, c, budget, depth + 1)?;
            if let Term::Construct {
                constructor,
                arguments,
                ..
            } = value
            {
                let branch = branches
                    .get(constructor)
                    .ok_or("unknown match constructor")?;
                let bindings = branch.bindings.iter().cloned().zip(arguments).collect();
                head(
                    &substitute(&branch.body, &bindings, budget, depth + 1)?,
                    c,
                    budget,
                    depth + 1,
                )
            } else {
                for b in branches {
                    budget.copy(&b.body)?;
                }
                Ok(Term::Match {
                    scrutinee: Box::new(value),
                    branches: branches.clone(),
                })
            }
        }
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            let value = head(condition, c, budget, depth + 1)?;
            match value {
                Term::Bool(true) => head(on_true, c, budget, depth + 1),
                Term::Bool(false) => head(on_false, c, budget, depth + 1),
                _ => {
                    budget.copy(on_true)?;
                    budget.copy(on_false)?;
                    Ok(Term::If {
                        condition: Box::new(value),
                        on_true: on_true.clone(),
                        on_false: on_false.clone(),
                    })
                }
            }
        }
        Term::Binary { op, left, right } => {
            let a = head(left, c, budget, depth + 1)?;
            if !matches!(a, Term::Bool(_) | Term::U64(_)) {
                budget.copy(t)?;
                return Ok(t.clone());
            }
            let b = head(right, c, budget, depth + 1)?;
            if !matches!(b, Term::Bool(_) | Term::U64(_)) {
                budget.copy(t)?;
                return Ok(t.clone());
            }
            normal(
                &Term::Binary {
                    op: op.clone(),
                    left: Box::new(a),
                    right: Box::new(b),
                },
                c,
                budget,
                depth + 1,
            )
        }
        Term::Construct { .. } => {
            budget.copy(t)?;
            Ok(t.clone())
        }
        _ => normal(t, c, budget, depth + 1),
    }
}
/// A demand-driven computation strategy for the same fixed total definitions.
/// The weaker strategy retains stuck branches; the stronger strategy also
/// computes their bodies. Both only perform fixed, type-checked reductions.
/// Equal results suffice for conversion; weak results are never assumed canonical.
fn compute_mode(
    t: &Term,
    c: &Context,
    budget: &mut Budget,
    depth: usize,
    reduce_branches: bool,
) -> LangResult<Term> {
    budget.step(depth)?;
    match t {
        Term::Call {
            function,
            arguments,
        } => {
            let Kind::Function(f) = &c.entry(function, true)?.kind else {
                return Ok(Term::Call {
                    function: function.clone(),
                    arguments: arguments
                        .iter()
                        .map(|a| compute_mode(a, c, budget, depth + 1, reduce_branches))
                        .collect::<LangResult<_>>()?,
                });
            };
            for a in arguments {
                budget.copy(a)?;
            }
            let mut args = arguments.clone();
            if let Some(i) = f.recursive {
                args[i] = head(&args[i], c, budget, depth + 1)?;
                if !matches!(args[i], Term::Construct { .. }) {
                    return Ok(Term::Call {
                        function: function.clone(),
                        arguments: args
                            .iter()
                            .map(|a| compute_mode(a, c, budget, depth + 1, reduce_branches))
                            .collect::<LangResult<_>>()?,
                    });
                }
            }
            let bindings = f.params.iter().map(|p| p.0.clone()).zip(args).collect();
            compute_mode(
                &substitute(&f.body, &bindings, budget, depth + 1)?,
                c,
                budget,
                depth + 1,
                reduce_branches,
            )
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            let value = head(scrutinee, c, budget, depth + 1)?;
            if let Term::Construct {
                constructor,
                arguments,
                ..
            } = value
            {
                let branch = branches
                    .get(constructor)
                    .ok_or("unknown match constructor")?;
                let bindings = branch.bindings.iter().cloned().zip(arguments).collect();
                compute_mode(
                    &substitute(&branch.body, &bindings, budget, depth + 1)?,
                    c,
                    budget,
                    depth + 1,
                    reduce_branches,
                )
            } else {
                let branches = if reduce_branches {
                    branches
                        .iter()
                        .map(|b| {
                            Ok(Branch {
                                bindings: b.bindings.clone(),
                                body: compute_mode(&b.body, c, budget, depth + 1, true)?,
                            })
                        })
                        .collect::<LangResult<_>>()?
                } else {
                    for b in branches {
                        budget.copy(&b.body)?;
                    }
                    branches.clone()
                };
                Ok(Term::Match {
                    scrutinee: Box::new(compute_mode(
                        &value,
                        c,
                        budget,
                        depth + 1,
                        reduce_branches,
                    )?),
                    branches,
                })
            }
        }
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            let condition = compute_mode(condition, c, budget, depth + 1, reduce_branches)?;
            match condition {
                Term::Bool(true) => compute_mode(on_true, c, budget, depth + 1, reduce_branches),
                Term::Bool(false) => compute_mode(on_false, c, budget, depth + 1, reduce_branches),
                _ => Ok(Term::If {
                    condition: Box::new(condition),
                    on_true: Box::new(compute_mode(
                        on_true,
                        c,
                        budget,
                        depth + 1,
                        reduce_branches,
                    )?),
                    on_false: Box::new(compute_mode(
                        on_false,
                        c,
                        budget,
                        depth + 1,
                        reduce_branches,
                    )?),
                }),
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
                .map(|a| compute_mode(a, c, budget, depth + 1, reduce_branches))
                .collect::<LangResult<_>>()?,
        }),
        Term::Binary { op, left, right } => {
            let a = compute_mode(left, c, budget, depth + 1, reduce_branches)?;
            let b = compute_mode(right, c, budget, depth + 1, reduce_branches)?;
            let literal = matches!(a, Term::U64(_) | Term::Bool(_))
                && matches!(b, Term::U64(_) | Term::Bool(_));
            let value = Term::Binary {
                op: op.clone(),
                left: Box::new(a),
                right: Box::new(b),
            };
            if literal {
                normal(&value, c, budget, depth + 1)
            } else {
                Ok(value)
            }
        }
        Term::SelfCall(_) => Err("unbound recursive call in computation".into()),
        _ => Ok(t.clone()),
    }
}
fn bounded_nodes(t: &Term, limit: usize) -> Option<usize> {
    let mut pending = vec![(t, 0usize)];
    let mut count = 0;
    while let Some((t, depth)) = pending.pop() {
        count += 1;
        if count > limit || depth > 64 {
            return None;
        }
        match t {
            Term::Construct { arguments, .. }
            | Term::Call { arguments, .. }
            | Term::SelfCall(arguments) => pending.extend(arguments.iter().map(|t| (t, depth + 1))),
            Term::Binary { left, right, .. } => {
                pending.extend([(&**left, depth + 1), (&**right, depth + 1)])
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => pending.extend([
                (&**condition, depth + 1),
                (&**on_true, depth + 1),
                (&**on_false, depth + 1),
            ]),
            Term::Match {
                scrutinee,
                branches,
            } => {
                pending.push((&**scrutinee, depth + 1));
                pending.extend(branches.iter().map(|b| (&b.body, depth + 1)));
            }
            _ => {}
        }
    }
    Some(count)
}

fn normal(t: &Term, c: &Context, budget: &mut Budget, depth: usize) -> LangResult<Term> {
    budget.step(depth)?;
    // Only small calls are memoised. Counting also bounds key construction and
    // hashing; the complete cache retains at most 16,384 syntax nodes.
    fn nodes(t: &Term, remaining: &mut usize) -> bool {
        if *remaining == 0 {
            return false;
        }
        *remaining -= 1;
        match t {
            Term::Call { arguments, .. }
            | Term::Construct { arguments, .. }
            | Term::SelfCall(arguments) => arguments.iter().all(|t| nodes(t, remaining)),
            Term::Binary { left, right, .. } => nodes(left, remaining) && nodes(right, remaining),
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                nodes(condition, remaining)
                    && nodes(on_true, remaining)
                    && nodes(on_false, remaining)
            }
            Term::Match {
                scrutinee,
                branches,
            } => nodes(scrutinee, remaining) && branches.iter().all(|b| nodes(&b.body, remaining)),
            _ => true,
        }
    }
    let context = c as *const Context as usize;
    if budget.normal_context != Some(context) {
        budget.normal_calls.clear();
        budget.normal_nodes = 0;
        budget.normal_context = Some(context);
    }
    let mut key_remaining = 128;
    let eligible = matches!(t, Term::Call { .. }) && nodes(t, &mut key_remaining);
    let key = eligible.then(|| (t.clone(), depth));
    if let Some(key) = &key {
        if let Some(result) = budget.normal_calls.get(key).cloned() {
            budget.copy(&result)?;
            return Ok(result);
        }
    }
    let result = normal_uncached(t, c, budget, depth)?;
    if let Some(key) = key {
        let mut result_remaining = 1024;
        if budget.normal_calls.len() < 128 && nodes(&result, &mut result_remaining) {
            let count = 128 - key_remaining + 1024 - result_remaining;
            if budget.normal_nodes + count <= 16_384 {
                budget.normal_nodes += count;
                budget.normal_calls.insert(key, result.clone());
            }
        }
    }
    Ok(result)
}
fn normal_uncached(t: &Term, c: &Context, budget: &mut Budget, depth: usize) -> LangResult<Term> {
    let scalar_projection = match t {
        Term::Call { function, .. } => {
            matches!(&c.entry(function,true)?.kind,Kind::Function(f) if f.recursive.is_none() && matches!(f.result,Sort::Bool|Sort::U64) && match &f.body {
                Term::Var(_)|Term::U64(_)|Term::Bool(_)=>true,
                Term::Match{branches,..}=>branches.iter().all(|b|matches!(b.body,Term::Var(_)|Term::U64(_)|Term::Bool(_))),
                _=>false,
            })
        }
        Term::Match { branches, .. } => branches
            .iter()
            .all(|b| matches!(b.body, Term::Var(_) | Term::U64(_) | Term::Bool(_))),
        _ => false,
    };
    if scalar_projection {
        let exposed = head(t, c, budget, depth + 1)?;
        // Primitive atoms have a unique normal form. A stuck elimination must
        // use ordinary argument normalisation to preserve lexical canonicality.
        if matches!(exposed, Term::Var(_) | Term::Bool(_) | Term::U64(_)) {
            return Ok(exposed);
        }
    }
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
            let identical = if op=="==" || op=="!=" {
                if left==right {true} else {
                    budget.copy(&left)?; budget.copy(&right)?;
                    alpha_normal_impl(left.clone(),budget,true)?==alpha_normal_impl(right.clone(),budget,true)?
                }
            }else{false};
            let reduced = match (&left, &right) {
                _ if identical => Some(Term::Bool(op == "==")),
                (Term::U64(a), Term::U64(b)) if op.starts_with("f32:") => {
                    Some(f32_primitive(op, *a, *b)?)
                }
                (Term::U64(a), Term::U64(b)) => Some(match op.as_str() {
                    "+" => Term::U64(a.wrapping_add(*b)),
                    "-" => Term::U64(a.wrapping_sub(*b)),
                    "*" => Term::U64(a.wrapping_mul(*b)),
                    "&" => Term::U64(a & b),
                    "quot" => Term::U64(a.checked_div(*b).unwrap_or(0)),
                    "rem" => Term::U64(a.checked_rem(*b).unwrap_or(0)),
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
    alpha_normal_impl(t, budget, false)
}
fn alpha_normal_impl(t: Term, budget: &mut Budget, public_free: bool) -> LangResult<Term> {
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
        mut t: Term,
        env: &BTreeMap<String, String>,
        avoid: &BTreeSet<String>,
        next: &mut usize,
        budget: &mut Budget,
        depth: usize,
    ) -> LangResult<Term> {
        budget.step(depth)?;
        let take = |t: &mut Term| std::mem::replace(t, Term::Bool(false));
        match &mut t {
            Term::Var(n) => {
                if let Some(fresh) = env.get(n) {
                    *n = fresh.clone();
                }
            }
            Term::Construct { arguments, .. }
            | Term::Call { arguments, .. }
            | Term::SelfCall(arguments) => {
                for a in arguments {
                    *a = rename(take(a), env, avoid, next, budget, depth + 1)?;
                }
            }
            Term::Binary { left, right, .. } => {
                for a in [left, right] {
                    **a = rename(take(a), env, avoid, next, budget, depth + 1)?;
                }
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                for a in [condition, on_true, on_false] {
                    **a = rename(take(a), env, avoid, next, budget, depth + 1)?;
                }
            }
            Term::Match {
                scrutinee,
                branches,
            } => {
                **scrutinee = rename(take(scrutinee), env, avoid, next, budget, depth + 1)?;
                for branch in branches {
                    let mut local = env.clone();
                    for name in &mut branch.bindings {
                        let fresh = loop {
                            let n = format!("$a{}", *next);
                            *next += 1;
                            if !avoid.contains(&n) {
                                break n;
                            }
                        };
                        local.insert(name.clone(), fresh.clone());
                        *name = fresh;
                    }
                    branch.body = rename(
                        take(&mut branch.body),
                        &local,
                        avoid,
                        next,
                        budget,
                        depth + 1,
                    )?;
                }
            }
            _ => {}
        }
        Ok(t)
    }
    if matches!(t, Term::Var(_) | Term::Bool(_) | Term::U64(_)) {
        return Ok(t);
    }
    let mut avoid = BTreeSet::new();
    let mut has_match = false;
    if !public_free {
        free(&t, &BTreeSet::new(), &mut avoid, &mut has_match, budget, 0)?;
        if !has_match {
            return Ok(t);
        }
    }
    rename(t, &BTreeMap::new(), &avoid, &mut 0, budget, 0)
}
fn normalize_pair(e: Equation, c: &Context, budget: &mut Budget) -> LangResult<Equation> {
    Ok(Equation {
        from: alpha_normal_impl(normal(&e.from, c, budget, 0)?, budget, true)?,
        to: alpha_normal_impl(normal(&e.to, c, budget, 0)?, budget, true)?,
    })
}
fn same_term(a: &Term, b: &Term, c: &Context, budget: &mut Budget) -> LangResult<bool> {
    budget.step(0)?;
    if a == b {
        return Ok(true);
    }
    budget.copy(a)?;
    budget.copy(b)?;
    if alpha_normal_impl(a.clone(), budget, true)? == alpha_normal_impl(b.clone(), budget, true)? {
        return Ok(true);
    }
    // Compare shared structure before computing entire descendants. Only
    // ordinary congruence and the existing checked definitions can succeed;
    // exhaustion retains the original conversion strategies and their bounds.
    if conversion::same(a, b, c, budget)? {
        return Ok(true);
    }
    let left = alpha_normal_impl(compute_mode(a, c, budget, 0, false)?, budget, true)?;
    let right = alpha_normal_impl(compute_mode(b, c, budget, 0, false)?, budget, true)?;
    if left == right {
        return Ok(true);
    }
    let left = alpha_normal_impl(compute_mode(a, c, budget, 0, true)?, budget, true)?;
    let right = alpha_normal_impl(compute_mode(b, c, budget, 0, true)?, budget, true)?;
    if left == right {
        return Ok(true);
    }
    Ok(alpha_normal_impl(normal(a, c, budget, 0)?, budget, true)?
        == alpha_normal_impl(normal(b, c, budget, 0)?, budget, true)?)
}
fn same_equation(a: &Equation, b: &Equation, c: &Context, budget: &mut Budget) -> LangResult<bool> {
    Ok(same_term(&a.from, &b.from, c, budget)? && same_term(&a.to, &b.to, c, budget)?)
}
fn raw_pair(
    e: Equation,
    env: &Env,
    c: &Context,
    internal: bool,
    budget: &mut Budget,
) -> LangResult<Equation> {
    typed_pair(&e, env, c, internal, budget)?;
    Ok(e)
}

#[cfg(test)]
mod normal_cache_tests {
    use super::*;
    fn context(increment: u64) -> Context {
        let mut c = Context::default();
        c.declare(
            "increment".into(),
            &Declaration::Function {
                params: vec![("x".into(), Sort::U64)],
                result: Sort::U64,
                recursive: None,
                body: Term::Binary {
                    op: "+".into(),
                    left: Box::new(Term::Var("x".into())),
                    right: Box::new(Term::U64(increment)),
                },
            },
        )
        .unwrap();
        c
    }
    fn call(n: u64) -> Term {
        Term::Call {
            function: "increment".into(),
            arguments: vec![Term::U64(n)],
        }
    }
    #[test]
    fn reductions_share_work_only_in_the_same_context_and_depth() {
        let first = context(1);
        let second = context(2);
        let mut budget = Budget::new();
        assert_eq!(
            normal(&call(7), &first, &mut budget, 0).unwrap(),
            Term::U64(8)
        );
        let before = budget.remaining;
        assert_eq!(
            normal(&call(7), &first, &mut budget, 0).unwrap(),
            Term::U64(8)
        );
        assert_eq!(before - budget.remaining, 2);
        let before = budget.remaining;
        normal(&call(7), &first, &mut budget, 1).unwrap();
        assert!(before - budget.remaining > 1);
        assert!(normal(&call(7), &first, &mut budget, 129).is_err());
        assert_eq!(
            normal(&call(7), &second, &mut budget, 0).unwrap(),
            Term::U64(9)
        );
        assert_eq!(budget.normal_calls.len(), 1);
        let wrong = Term::Call {
            function: "absent".into(),
            arguments: vec![],
        };
        assert!(normal(&wrong, &second, &mut budget, 0).is_err());
        assert!(!budget.normal_calls.contains_key(&(wrong, 0)));
    }
    #[test]
    fn retained_call_syntax_is_bounded() {
        let c = context(1);
        let mut budget = Budget::new();
        for n in 0..1000 {
            assert_eq!(
                normal(&call(n), &c, &mut budget, 0).unwrap(),
                Term::U64(n + 1)
            );
        }
        assert!(budget.normal_calls.len() <= 128);
        assert!(budget.normal_nodes <= 16_384);
    }
}

#[cfg(test)]
mod alpha_tests {
    use super::*;
    #[test]
    fn bounded_memo_reuses_exact_computation_without_changing_normal_forms() {
        let mut context = Context::default();
        context
            .declare(
                "choose".into(),
                &Declaration::Function {
                    params: vec![("condition".into(), Sort::Bool)],
                    result: Sort::U64,
                    recursive: None,
                    body: Term::If {
                        condition: Box::new(Term::Var("condition".into())),
                        on_true: Box::new(Term::U64(7)),
                        on_false: Box::new(Term::U64(9)),
                    },
                },
            )
            .unwrap();
        let mut cached = Budget::new();
        let mut uncached = Budget::new();
        for argument in [
            Term::Bool(true),
            Term::Bool(false),
            Term::Var("free".into()),
            Term::Bool(true),
        ] {
            let term = Term::Call {
                function: "choose".into(),
                arguments: vec![argument],
            };
            assert_eq!(
                normal(&term, &context, &mut cached, 0).unwrap(),
                normal_uncached(&term, &context, &mut uncached, 0).unwrap()
            );
        }
        assert!(!cached.normal_calls.is_empty());
        assert!(uncached.normal_calls.is_empty());
        cached.remaining = 0;
        assert!(normal(
            &Term::Call {
                function: "choose".into(),
                arguments: vec![Term::Bool(true)]
            },
            &context,
            &mut cached,
            0
        )
        .is_err());
    }

    fn leaf(id: &str) -> Arc<Entry> {
        Arc::new(Entry {
            id: id.into(),
            kind: Kind::Function(Function {
                params: vec![],
                result: Sort::Bool,
                body: Term::Bool(false),
                recursive: None,
            }),
            dependencies: vec![],
            parameters: BTreeSet::new(),
        })
    }
    #[test]
    fn staged_imports_preserve_exact_visibility_and_are_transactional() {
        let shared = leaf("shared");
        let fresh = leaf("fresh");
        let mut context = Context::default();
        context.install(shared.clone()).unwrap();
        let mut root = (*leaf("root")).clone();
        root.dependencies = vec![fresh.clone(), leaf("shared")];
        assert!(context.install(Arc::new(root)).is_err());
        assert_eq!(context.all.len(), 1);
        assert_eq!(context.visible.len(), 1);
        assert!(context.entry("fresh", true).is_err());
        let mut root = (*leaf("root")).clone();
        root.dependencies = vec![fresh, shared];
        context.install(Arc::new(root)).unwrap();
        assert_eq!(context.all.len(), 3);
        assert!(context.entry("fresh", false).is_err());
        let subset = context.subset(&["root".into()]).unwrap();
        assert_eq!(subset.visible.len(), 1);
        assert_eq!(subset.all.len(), 3);
    }
    #[test]
    fn dependency_imports_cannot_overshoot_the_view_capacity() {
        let mut context = Context::default();
        for i in 0..crate::registry::MAX_VIEW_ENTRIES - 1 {
            context.install(leaf(&format!("entry_{i}"))).unwrap();
        }
        let mut root = (*leaf("root")).clone();
        root.dependencies = vec![leaf("last_dependency")];
        assert!(context.install(Arc::new(root)).is_err());
        assert_eq!(context.all.len(), crate::registry::MAX_VIEW_ENTRIES - 1);
        assert!(context.entry("last_dependency", true).is_err());
        context.install(leaf("last")).unwrap();
        assert!(context.install(leaf("overflow")).is_err());
        assert_eq!(context.all.len(), crate::registry::MAX_VIEW_ENTRIES);
    }
    #[test]
    fn prepared_memo_never_skips_environment_type_checks() {
        let context = Context::default();
        let mut budget = Budget::new();
        let expression = (0..24).fold(Term::Var("input".into()), |left, _| Term::Binary {
            op: "+".into(),
            left: Box::new(left),
            right: Box::new(Term::U64(0)),
        });
        let goal = Equation {
            from: expression.clone(),
            to: expression,
        };
        let words = Env::from([("input".into(), Sort::U64)]);
        assert!(prepare(&goal, &words, &context, &mut budget).is_ok());
        assert!(!budget.prepared_cache.is_empty());
        let booleans = Env::from([("input".into(), Sort::Bool)]);
        assert!(prepare(&goal, &booleans, &context, &mut budget).is_err());
        assert!(prepare(&goal, &Env::new(), &context, &mut budget).is_err());
        budget.remaining = 0;
        assert!(prepare(&goal, &words, &context, &mut budget).is_err());
    }
    #[test]
    fn normal_cache_is_context_local_and_preserves_work_and_depth_bounds() {
        let make = |word| {
            let mut c = Context::default();
            c.declare(
                "constant".into(),
                &Declaration::Function {
                    params: vec![],
                    result: Sort::U64,
                    body: (0..20).fold(Term::U64(word), |t, _| Term::Binary {
                        op: "+".into(),
                        left: Box::new(t),
                        right: Box::new(Term::U64(0)),
                    }),
                    recursive: None,
                },
            )
            .unwrap();
            c
        };
        let c1 = make(17);
        let c2 = make(18);
        let t = Term::Call {
            function: "constant".into(),
            arguments: vec![],
        };
        let mut budget = Budget::new();
        assert_eq!(normal(&t, &c1, &mut budget, 0).unwrap(), Term::U64(17));
        assert_eq!(normal(&t, &c2, &mut budget, 0).unwrap(), Term::U64(18));
        assert!(budget.normal_calls.len() <= 128 && budget.normal_nodes <= 16384);
        budget.remaining = 1;
        assert!(normal(&t, &c2, &mut budget, 0).is_err());
        budget.remaining = 1000;
        assert!(normal(&t, &c2, &mut budget, 129).is_err());
    }
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
    budget.step(0)?;
    let context = c as *const Context as usize;
    if let Some((_, _, _, value, nodes)) = budget
        .prepared_cache
        .iter()
        .find(|(cx, vars, goal, _, _)| *cx == context && vars == env && goal == e)
    {
        budget.remaining = budget
            .remaining
            .checked_sub(*nodes)
            .ok_or("inductive logic resource limit")?;
        return Ok(value.clone());
    }
    let started = budget.remaining;
    typed_pair(e, env, c, false, budget)?;
    let value = normalize_pair(e.clone(), c, budget)?;
    // The bounded memo pool accounts for its own storage copies. Hits still
    // charge every copied result node to ordinary checking work. Complete
    // environments, contexts and terms are compared; no hash proves equality.
    if env.len() <= 128
        && started.saturating_sub(budget.remaining) >= 64
        && budget.prepared_cache.len() < 32
    {
        let counts = [&value.from, &value.to, &e.from, &e.to].map(|t| bounded_nodes(t, 65536));
        if let [Some(a), Some(b), Some(d), Some(f)] = counts {
            let nodes = a + b + d + f;
            if nodes <= 65536 && budget.prepared_nodes + nodes <= 131072 {
                budget
                    .prepared_cache
                    .push((context, env.clone(), e.clone(), value.clone(), a + b));
                budget.prepared_nodes += nodes;
            }
        }
    }
    Ok(value)
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
    _c: &Context,
    budget: &mut Budget,
) -> LangResult<Equation> {
    Ok(Equation {
        from: substitute(&e.from, bindings, budget, 0)?,
        to: substitute(&e.to, bindings, budget, 0)?,
    })
}
fn independent_induction_premises(
    variables: &BTreeSet<String>,
    hypotheses: &[Equation],
    schemas: &[InductionSchema],
    c: &Context,
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
            // A syntactically mentioned argument can be discarded by an existing
            // total definition. Test semantic dependence after definitional
            // reduction only; ambient hypotheses never rewrite this premise.
            used.clear();
            let from = compute_mode(&equation.from, c, budget, 0, true)?;
            let to = compute_mode(&equation.to, c, budget, 0, true)?;
            names(&from, &mut used, budget, 0)?;
            names(&to, &mut used, budget, 0)?;
            if variables.iter().any(|v| used.contains(v) && !bound.contains(v)) {
                return Err("induction under variable-dependent premises is unsupported".into());
            }
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
    let terms =
        |ts: &[&Term], out: &mut BTreeSet<String>| ts.iter().for_each(|t| term_references(t, out));
    match p {
        Proof::WordExtensionality { from, to, parts } => {
            terms(&[from, to], out);
            for (_, proof) in parts {
                proof_references(proof, out);
            }
        }
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
        Proof::Cases {
            scrutinee,
            variable: _,
            from,
            to,
            cases,
        } => {
            terms(&[from, to], out);
            if let Some(scrutinee) = scrutinee {terms(&[scrutinee],out);}
            for case in cases {
                proof_references(&case.proof, out);
            }
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
        Proof::WordExtensionality { from, to, parts } => {
            if parts.is_empty() || parts.len() > 64 || parts.iter().any(|(mask, _)| *mask == 0) {
                return Err("word extensionality mask limit".into());
            }
            let want = raw_pair(
                Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                false,
                budget,
            )?;
            if infer(&want.from, env, c, None, false, budget, depth + 1)? != Sort::U64 {
                return Err("word extensionality requires words".into());
            }
            if parts.iter().fold(0, |cover, (mask, _)| cover | mask) != u64::MAX {
                return Err("word extensionality does not cover all bits".into());
            }
            for (mask, proof) in parts {
                let masked = |term: &Term| Term::Binary {
                    op: "&".into(),
                    left: Box::new(term.clone()),
                    right: Box::new(Term::U64(*mask)),
                };
                let expected = prepare(
                    &Equation {
                        from: masked(&want.from),
                        to: masked(&want.to),
                    },
                    env,
                    c,
                    budget,
                )?;
                let actual = derive(proof, env, c, hypotheses, schemas, budget, depth + 1)?;
                if !same_equation(&actual, &expected, c, budget)? {
                    return Err("word extensionality part mismatch".into());
                }
            }
            want
        }
        Proof::BitVector {
            from,
            to,
            hypotheses: selected,
            certificate,
        } => {
            if selected.len() > 128 {
                return Err("bit proof hypothesis count limit".into());
            }
            let want = raw_pair(
                Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                false,
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
            let computed = normalize_pair(want.clone(), c, budget)?;
            let premises = premises
                .into_iter()
                .map(|e| normalize_pair(e, c, budget))
                .collect::<LangResult<Vec<_>>>()?;
            let problem = crate::bitproof::problem_with_encoding_and_work(
                env,
                &premises,
                &computed,
                certificate.encoding,
                &mut budget.bit_work,
            )?;
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
            let want = raw_pair(
                Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                false,
                budget,
            )?;
            if hypotheses.len() + schemas.len() >= 128 {
                return Err("logic hypothesis count limit".into());
            }
            for (value, proof) in [(false, on_false), (true, on_true)] {
                let mut local = hypotheses.to_vec();
                local.push(raw_pair(
                    Equation {
                        from: condition.clone(),
                        to: Term::Bool(value),
                    },
                    env,
                    c,
                    false,
                    budget,
                )?);
                if !same_equation(
                    &derive(proof, env, c, &local, schemas, budget, depth + 1)?,
                    &want,
                    c,
                    budget,
                )? {
                    return Err("Boolean condition branch proves a different statement".into());
                }
            }
            want
        }
        Proof::Cases {
            scrutinee,
            variable,
            from,
            to,
            cases,
        } => {
            if variable.is_some() == scrutinee.is_some() {
                return Err("constructor cases require exactly one subject".into());
            }
            if let Some(variable) = variable {
            let Some(Sort::Data(id)) = env.get(variable) else {
                return Err("case variable must have datatype sort".into());
            };
            let constructors = c.datatype(id, false)?;
            if cases.len() != constructors.len() {
                return Err("cases must cover every constructor".into());
            }
            let original = Equation {
                from: from.clone(),
                to: to.clone(),
            };
            typed_pair(&original, env, c, false, budget)?;
            // Schemas describe separately generalized induction arguments.
            // Do not silently reinterpret a schema that captures this variable.
            independent_induction_premises(&[variable.clone()].into(), &[], schemas, c, budget)?;
            for (index, (case, constructor)) in cases.iter().zip(constructors).enumerate() {
                let mut local = branch_env(&case.bindings, &constructor.fields, env, false)?;
                local.remove(variable);
                let value = Term::Construct {
                    datatype: id.clone(),
                    constructor: index,
                    arguments: case.bindings.iter().cloned().map(Term::Var).collect(),
                };
                let bindings = [(variable.clone(), value)].into();
                let want = sub_pair(&original, &bindings, c, budget)?;
                let premises = hypotheses
                    .iter()
                    .map(|e| sub_pair(e, &bindings, c, budget))
                    .collect::<LangResult<Vec<_>>>()?;
                if !same_equation(&derive(
                    &case.proof,
                    &local,
                    c,
                    &premises,
                    schemas,
                    budget,
                    depth + 1,
                )?, &want, c, budget)?
                {
                    return Err("constructor case proves a different statement".into());
                }
            }
            // Exhaustive branches established this exact equation. Expanding
            // its complete values again is unnecessary and destroys sharing
            // in closed data definitions. Later uses retain ordinary checked
            // conversion, just as the scrutinee form below does.
            original
            } else {
                let scrutinee = scrutinee.as_ref().unwrap();
            let Sort::Data(id) = infer(scrutinee, env, c, None, false, budget, 0)? else {
                return Err("constructor cases require an inductive datatype".into());
            };
            let constructors = c.datatype(&id, false)?;
            if cases.len() != constructors.len() {
                return Err("constructor cases must cover every constructor".into());
            }
            if hypotheses.len() + schemas.len() >= 128 {
                return Err("logic hypothesis count limit".into());
            }
            let original = Equation {
                from: from.clone(),
                to: to.clone(),
            };
            let want = raw_pair(original.clone(), env, c, false, budget)?;
            for (index, (case, constructor)) in cases.iter().zip(constructors).enumerate() {
                let local = branch_env(&case.bindings, &constructor.fields, env, false)?;
                let mut local_hypotheses = hypotheses.to_vec();
                local_hypotheses.push(raw_pair(
                    Equation {
                        from: scrutinee.clone(),
                        to: Term::Construct {
                            datatype: id.clone(),
                            constructor: index,
                            arguments: case.bindings.iter().cloned().map(Term::Var).collect(),
                        },
                    },
                    &local,
                    c,
                    false,
                    budget,
                )?);
                if !same_equation(
                    &derive(
                        &case.proof,
                        &local,
                        c,
                        &local_hypotheses,
                        schemas,
                        budget,
                        depth + 1,
                    )?,
                    &want,
                    c,
                    budget,
                )? {
                    return Err("constructor case proves a different statement".into());
                }
            }
            want
            }
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
        Proof::Refl(t) => raw_pair(
            Equation {
                from: t.clone(),
                to: t.clone(),
            },
            env,
            c,
            false,
            budget,
        )?,
        Proof::Convert { from, to } => {
            let e = raw_pair(
                Equation {
                    from: from.clone(),
                    to: to.clone(),
                },
                env,
                c,
                false,
                budget,
            )?;
            if !same_term(&e.from, &e.to, c, budget)? {
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
            if !same_term(&a.to, &b.from, c, budget)? {
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
                if !same_equation(
                    &derive(proof, env, c, hypotheses, schemas, budget, depth + 1)?,
                    &sub_pair(condition, &bindings, c, budget)?,
                    c,
                    budget,
                )? {
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
                return Err(
                    "instance must interpret exactly the theorem's abstract parameters".into(),
                );
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
                            return Err(
                                "instantiated function body differs from its definition".into()
                            );
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
                if !same_equation(
                    &derive(proof, &local, c, &hypotheses, &[], budget, depth + 1)?,
                    &want,
                    c,
                    budget,
                )? {
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
                if !same_equation(
                    &derive(proof, env, c, hypotheses, schemas, budget, depth + 1)?,
                    &sub_pair(&s.equation(condition, budget)?, &bindings, c, budget)?,
                    c,
                    budget,
                )? {
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
                c,
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
                if !same_equation(
                    &derive(
                        &case.proof,
                        &local,
                        c,
                        &local_hypotheses,
                        schemas,
                        budget,
                        depth + 1,
                    )?,
                    &want,
                    c,
                    budget,
                )? {
                    return Err("induction branch proves a different statement".into());
                }
            }
            original
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
            independent_induction_premises(&variables, hypotheses, schemas, c, budget)?;
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
                if !same_equation(
                    &derive(
                        &case.proof,
                        &local,
                        c,
                        hypotheses,
                        &local_schemas,
                        budget,
                        depth + 1,
                    )?,
                    &want,
                    c,
                    budget,
                )? {
                    return Err("generalized induction branch proves a different statement".into());
                }
            }
            original
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
                if !same_equation(
                    &derive(proof, &local, c, &hs, &local_schemas, budget, depth + 1)?,
                    &want,
                    c,
                    budget,
                )? {
                    return Err("Boolean branch proves a different statement".into());
                }
            }
            original
        }
    };
    // Rules retain the typed expressions they establish. Only congruence or
    // interpretation forms new terms requiring another type check; computation
    // is needed when matching endpoints, never as an ambient proof rewrite.
    if matches!(
        p,
        Proof::WordExtensionality { .. }
            | Proof::BitVector { .. }
            | Proof::BoolSplit { .. }
            | Proof::Cases { .. }
            | Proof::Hypothesis(_)
            | Proof::GeneralizedHypothesis { .. }
            | Proof::Refl(_)
            | Proof::Convert { .. }
            | Proof::Sym(_)
            | Proof::Trans(..)
            | Proof::Use { .. }
            | Proof::Induction { .. }
            | Proof::GeneralizedInduction { .. }
            | Proof::BoolCases { .. }
    ) {
        Ok(equation)
    } else {
        typed_pair(&equation, env, c, true, budget)?;
        Ok(equation)
    }
}
