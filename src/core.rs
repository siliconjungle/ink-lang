//! Versioned executable program representation, shared by source parsing,
//! semantic checking, reference execution and lowering. No optimisation laws.
use crate::LangResult;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Type {
    U64,
    U32,
    I32,
    F32,
    Vector(Box<Type>, u8),
    Int,
    Unit,
    String,
    Bool,
    List(Box<Type>),
    Buffer(Box<Type>),
    Map(Box<Type>, Box<Type>),
    Option(Box<Type>),
    Result(Box<Type>, Box<Type>),
    Table(Box<Type>, Box<Type>),
    Named(String),
    Unknown,
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Expr {
    Num(u64),
    Float(u32),
    Neg(Box<Expr>),
    // Box annotations to preserve the compact v1 Expr stack footprint.
    Let(String, Option<Box<Type>>, Box<Expr>, Box<Expr>),
    Bool(bool),
    Var(String),
    Binary(String, Box<Expr>, Box<Expr>),
    Call(String, Vec<Expr>),
    Method(Box<Expr>, String, Vec<Expr>),
    Lambda(String, Box<Expr>),
    String(String),
    Unit,
    Field(Box<Expr>, String),
    Record(String, Vec<(String, Expr)>),
    Try(Box<Expr>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Statement {
    Let(String, Option<Type>, Expr),
    Return(Expr),
    If(Expr, Vec<Statement>, Vec<Statement>),
    Emit(String, Expr),
    Expr(Expr),
}

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub enum ActionKind {
    Change,
    Query,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Action {
    pub name: String,
    pub kind: ActionKind,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub reads: Vec<String>,
    pub writes: Vec<String>,
    pub emits: Vec<String>,
    pub body: Vec<Statement>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct BindingDecl {
    pub name: String,
    pub ty: Type,
    pub value: Expr,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Function {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub body: Expr,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Rewrite {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub from: Expr,
    pub to: Expr,
    pub tactic: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Program {
    pub module: String,
    pub functions: Vec<Function>,
    pub rules: Vec<Rewrite>,
    pub ids: Vec<String>,
    pub records: std::collections::BTreeMap<String, Vec<(String, Type)>>,
    pub enums: std::collections::BTreeMap<String, Vec<String>>,
    pub states: Vec<BindingDecl>,
    pub keeps: Vec<BindingDecl>,
    pub events: std::collections::BTreeMap<String, Type>,
    pub actions: Vec<Action>,
    #[serde(default, skip_serializing_if = "crate::termination::Declarations::is_empty")]
    pub termination: crate::termination::Declarations,
    #[serde(default, skip_serializing_if = "crate::contracts::Contracts::is_empty")]
    pub contracts: crate::contracts::Contracts,
}

/// This version fixes the executable representation and its current semantics,
/// not the larger proposed language or a proof of the Rust implementation.
pub const PRIMITIVE_SEMANTICS: &str = "ink-executable-core-v11";
pub const CANONICAL_FLOAT_SEMANTICS: &str = "ink-executable-core-v7";
pub const CONTROL_SEMANTICS: &str = "ink-executable-core-v6";
pub const SEMANTICS: &str = "ink-executable-core-v1";
pub const COMPUTE_SEMANTICS: &str = "ink-executable-core-v2";
pub const LOCAL_SEMANTICS: &str = "ink-executable-core-v3";
pub const EXACT_FLOAT_SEMANTICS: &str = CANONICAL_FLOAT_SEMANTICS;
pub const VALUE_SEMANTICS: &str = "ink-executable-core-v8";
pub const CONTRACT_SEMANTICS: &str = "ink-executable-core-v10";
pub const VALUE_INVARIANT_SEMANTICS: &str = "ink-executable-core-v11";
pub const MEASURE_SEMANTICS: &str = "ink-executable-core-v12";
pub const BORROW_RANGE_SEMANTICS: &str = "ink-executable-core-v13";
pub const WORD_CONVERSION_SEMANTICS: &str = "ink-executable-core-v11";
pub const BULK_BUFFER_SEMANTICS: &str = "ink-executable-core-v9";
pub const PARALLEL_SEMANTICS: &str = "ink-executable-core-v5";
pub const SEQUENCE_SEMANTICS: &str = "ink-executable-core-v4";
pub const MAX_BYTES: usize = 16_000_000;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
struct WireModule {
    schema: u32,
    semantics: String,
    program: Program,
}

/// Constructed only after bounded structural, type, effect and dependency checks.
/// Executable IR contains no inline proof-authoring/optimisation directives.
#[derive(Clone, Debug)]
pub struct CheckedModule(WireModule);

// New fixed value operations have an explicit execution version. Surface forms
// that elaborate entirely into older meanings retain those older versions.
fn value_domain(p: &Program) -> bool {
    fn callback(
        e: &Expr,
        inputs: &[Type],
        env: &crate::check::Env,
        p: &Program,
        want: Option<&Type>,
        pure: bool,
    ) -> bool {
        let mut local = env.clone();
        let mut body = e;
        for t in inputs {
            let Expr::Lambda(n, b) = body else {
                return false;
            };
            local.insert(n.clone(), t.clone());
            body = b;
        }
        expr(body, &local, p, want, pure)
    }
    fn expr(
        e: &Expr,
        env: &crate::check::Env,
        p: &Program,
        want: Option<&Type>,
        pure: bool,
    ) -> bool {
        match e {
            Expr::Call(n, args) => {
                if crate::word::primitive(n) || n == "foldl" {
                    return true;
                }
                if pure && n == "count" && want != Some(&Type::U64) {
                    return true;
                }
                if pure
                    && ["sum", "foldr"].contains(&n.as_str())
                    && crate::check::infer_context(e, env, p, want)
                        .is_ok_and(|t| !crate::check::is_number(&t))
                {
                    return true;
                }
                if n == "list"
                    || (!pure && n == "choose")
                    || (pure
                        && [
                            "Int",
                            "Some",
                            "Ok",
                            "Err",
                            "checked_add",
                            "checked_sub",
                            "checked_mul",
                        ]
                        .contains(&n.as_str()))
                {
                    return true;
                }
                if pure && ["repeat", "repeat_until", "foldr", "parallel_map"].contains(&n.as_str())
                {
                    let result = crate::check::infer_context(e, env, p, want).ok();
                    let inputs = if n == "foldr" {
                        crate::check::infer(&args[0], env, p)
                            .ok()
                            .and_then(|t| match t {
                                Type::List(inner) => Some(*inner),
                                _ => None,
                            })
                    } else if n == "parallel_map" {
                        crate::check::infer(&args[0], env, p)
                            .ok()
                            .and_then(|t| match t {
                                Type::List(inner) => Some(*inner),
                                _ => None,
                            })
                    } else {
                        Some(Type::U32)
                    };
                    if let (Some(input), Some(result)) = (inputs, result) {
                        let output = match &result {
                            Type::List(inner) if n == "parallel_map" => inner.as_ref(),
                            _ => &result,
                        };
                        let sig = if n == "parallel_map" {
                            vec![Type::U32, input]
                        } else {
                            vec![input, result.clone()]
                        };
                        if callback(args.last().unwrap(), &sig, env, p, Some(output), pure) {
                            return true;
                        }
                        if n == "repeat_until"
                            && callback(
                                &args[2],
                                &[result.clone()],
                                env,
                                p,
                                Some(&Type::Bool),
                                pure,
                            )
                        {
                            return true;
                        }
                    }
                }
                let f = p.functions.iter().find(|f| &f.name == n);
                args.iter().enumerate().any(|(i, a)| {
                    expr(
                        a,
                        env,
                        p,
                        f.and_then(|f| f.params.get(i).map(|(_, t)| t)),
                        pure,
                    )
                })
            }
            Expr::String(_) | Expr::Unit => false,
            Expr::Var(n) => pure && n == "None",
            Expr::Field(x, _) => {
                pure && matches!(x.as_ref(), Expr::Var(n) if p.enums.contains_key(n))
                    || expr(x, env, p, None, pure)
            }
            Expr::Let(n, t, a, b) => {
                if !pure {
                    return true;
                }
                let ty = crate::check::infer_context(a, env, p, t.as_deref()).ok();
                let mut local = env.clone();
                if let Some(t) = &ty {
                    local.insert(n.clone(), t.clone());
                }
                expr(a, env, p, ty.as_ref(), pure) || expr(b, &local, p, want, pure)
            }
            Expr::Num(_) => pure && want == Some(&Type::Int),
            Expr::Binary(_, a, b) => {
                let context = want
                    .filter(|t| crate::check::is_numeric_value(t))
                    .cloned()
                    .or_else(|| crate::check::hint(a, env, p))
                    .or_else(|| crate::check::hint(b, env, p));
                let at = crate::check::infer_context(a, env, p, context.as_ref()).ok();
                pure && at.as_ref().is_some_and(|t| {
                    !matches!(
                        t,
                        Type::U32 | Type::U64 | Type::I32 | Type::F32 | Type::Bool
                    )
                }) || expr(a, env, p, at.as_ref(), pure)
                    || expr(b, env, p, at.as_ref(), pure)
            }
            Expr::Method(x, method, args) => {
                if method == "fold" {
                    return true;
                }
                if pure
                    && crate::check::infer(x, env, p)
                        .is_ok_and(|t| matches!(t, Type::Option(_) | Type::Result(..)))
                {
                    return true;
                }
                if pure {
                    if let Ok(Type::List(inner)) = crate::check::infer(x, env, p) {
                        let output = match want {
                            Some(Type::List(t)) => Some(t.as_ref()),
                            _ => None,
                        };
                        let inputs = match method.as_str() {
                            "map" | "filter" => vec![*inner],
                            "map_indexed" => vec![Type::U32, *inner],
                            "zip" => crate::check::infer(&args[0], env, p)
                                .ok()
                                .and_then(|t| match t {
                                    Type::List(other) => Some(vec![*inner, *other]),
                                    _ => None,
                                })
                                .unwrap_or_default(),
                            _ => vec![],
                        };
                        if !inputs.is_empty()
                            && callback(
                                args.last().unwrap(),
                                &inputs,
                                env,
                                p,
                                if method == "filter" {
                                    Some(&Type::Bool)
                                } else {
                                    output
                                },
                                pure,
                            )
                        {
                            return true;
                        }
                    }
                }
                expr(x, env, p, None, pure) || args.iter().any(|a| expr(a, env, p, None, pure))
            }
            Expr::Neg(x) => {
                pure && crate::check::infer_context(e, env, p, want).is_ok_and(|t| t == Type::Int)
                    || expr(x, env, p, want, pure)
            }
            Expr::Lambda(_, x) | Expr::Try(x) => expr(x, env, p, want, pure),
            Expr::Record(n, fields) => fields.iter().any(|(name, e)| {
                expr(
                    e,
                    env,
                    p,
                    p.records
                        .get(n)
                        .and_then(|fs| fs.iter().find(|(f, _)| f == name).map(|(_, t)| t)),
                    pure,
                )
            }),
            _ => false,
        }
    }
    fn block(xs: &[Statement], p: &Program) -> bool {
        xs.iter().any(|s| match s {
            Statement::Let(_, _, e)
            | Statement::Return(e)
            | Statement::Emit(_, e)
            | Statement::Expr(e) => expr(e, &Default::default(), p, None, false),
            Statement::If(c, a, b) => {
                expr(c, &Default::default(), p, None, false) || block(a, p) || block(b, p)
            }
        })
    }
    fn shadows(xs: &[Statement], mut names: std::collections::BTreeSet<String>) -> bool {
        for s in xs {
            match s {
                Statement::Let(n, _, _) => {
                    if !names.insert(n.clone()) {
                        return true;
                    }
                }
                Statement::If(_, a, b) => {
                    if shadows(a, names.clone()) || shadows(b, names.clone()) {
                        return true;
                    }
                }
                _ => (),
            }
        }
        false
    }
    p.functions.iter().any(|f| {
        expr(
            &f.body,
            &f.params.iter().cloned().collect(),
            p,
            Some(&f.result),
            true,
        )
    }) || p.actions.iter().any(|a| {
        block(&a.body, p) || shadows(&a.body, a.params.iter().map(|(n, _)| n.clone()).collect())
    }) || p
        .keeps
        .iter()
        .any(|k| expr(&k.value, &Default::default(), p, Some(&k.ty), false))
}

fn primitive_needed(p: &Program) -> bool {
    let mut found=false;
    let mut visit=|e:&Expr|crate::analysis::walk(e,|x|found |= matches!(x,Expr::Call(n,_) if crate::primitives::primitive(n)));
    for f in &p.functions {visit(&f.body);}
    for s in p.states.iter().chain(&p.keeps) {visit(&s.value);}
    let mut statements:Vec<_>=p.actions.iter().flat_map(|a|&a.body).collect();
    while let Some(s)=statements.pop(){match s {
        Statement::Let(_,_,e)|Statement::Return(e)|Statement::Emit(_,e)|Statement::Expr(e)=>visit(e),
        Statement::If(e,a,b)=>{visit(e);statements.extend(a);statements.extend(b);}
    }}
    found
}

fn bulk_buffer_needed(p: &Program) -> bool {
    let mut found = false;
    let mut visit = |e: &Expr| {
        crate::analysis::walk(e, |e| {
            found |= matches!(e, Expr::Method(_, name, _) if name == "fill_range" || name == "copy_within");
        })
    };
    for f in &p.functions {
        visit(&f.body);
    }
    for s in p.states.iter().chain(&p.keeps) {
        visit(&s.value);
    }
    let mut statements: Vec<_> = p.actions.iter().flat_map(|a| &a.body).collect();
    while let Some(s) = statements.pop() {
        match s {
            Statement::Let(_, _, e)
            | Statement::Return(e)
            | Statement::Emit(_, e)
            | Statement::Expr(e) => visit(e),
            Statement::If(e, yes, no) => {
                visit(e);
                statements.extend(yes);
                statements.extend(no);
            }
        }
    }
    found
}

fn borrow_range_needed(p:&Program)->bool {
    let mut found=false;
    let mut visit=|e:&Expr|crate::analysis::walk(e,|e|found|=matches!(e,Expr::Method(_,n,_) if n=="borrow_range"));
    for f in &p.functions {visit(&f.body);}
    for b in p.states.iter().chain(&p.keeps) {visit(&b.value);}
    let mut blocks:Vec<_>=p.actions.iter().map(|a|a.body.as_slice()).collect();
    while let Some(block)=blocks.pop() {for statement in block {match statement {
        Statement::If(e,a,b)=>{visit(e);blocks.extend([a.as_slice(),b.as_slice()]);}
        Statement::Let(_,_,e)|Statement::Expr(e)|Statement::Return(e)|Statement::Emit(_,e)=>visit(e),
    }}}
    found
}
fn word_conversion_needed(p: &Program) -> bool {
    let mut found = false;
    let mut visit = |e: &Expr| {
        crate::analysis::walk(e, |e| {
            found |= matches!(e, Expr::Call(name, _) if crate::word::conversion(name).is_some());
        })
    };
    for f in &p.functions {
        visit(&f.body);
    }
    for s in p.states.iter().chain(&p.keeps) {
        visit(&s.value);
    }
    let mut statements: Vec<_> = p.actions.iter().flat_map(|a| &a.body).collect();
    while let Some(s) = statements.pop() {
        match s {
            Statement::Let(_, _, e)
            | Statement::Return(e)
            | Statement::Emit(_, e)
            | Statement::Expr(e) => visit(e),
            Statement::If(e, yes, no) => {
                visit(e);
                statements.extend(yes);
                statements.extend(no);
            }
        }
    }
    found
}

impl CheckedModule {
    pub fn from_source(program: Program) -> LangResult<Self> {
        let (extended, sequence) = validate(&program)?;
        let local = crate::local_collections::needed(&program);
        crate::check::check(&program)?;
        let module = Self(WireModule {
            schema: 1,
            semantics: if borrow_range_needed(&program) {
                BORROW_RANGE_SEMANTICS
            } else if !program.termination.is_empty() {
                MEASURE_SEMANTICS
            } else if !program.contracts.value_invariants.is_empty() || primitive_needed(&program) || word_conversion_needed(&program) {
                VALUE_INVARIANT_SEMANTICS
            } else if !program.contracts.is_empty() || program.actions.iter().any(|a| a.kind==ActionKind::Change && !matches!(a.result,Type::Result(..))) {
                CONTRACT_SEMANTICS
            } else if bulk_buffer_needed(&program) {
                BULK_BUFFER_SEMANTICS
            } else if value_domain(&program) {
                VALUE_SEMANTICS
            } else if canonical_float_needed(&program) {
                CANONICAL_FLOAT_SEMANTICS
            } else if control_needed(&program) {
                CONTROL_SEMANTICS
            } else if crate::recursion::needed(&program) {
                PARALLEL_SEMANTICS
            } else if sequence {
                SEQUENCE_SEMANTICS
            } else if local {
                LOCAL_SEMANTICS
            } else if extended {
                COMPUTE_SEMANTICS
            } else {
                SEMANTICS
            }
            .into(),
            program,
        });
        module.bytes()?;
        crate::contracts::check(&module)?;
        crate::protocol::check_source(&module)?;
        Ok(module)
    }

    pub fn from_bytes(bytes: &[u8]) -> LangResult<Self> {
        if bytes.len() > MAX_BYTES {
            return Err("core module exceeds byte limit".into());
        }
        let wire: WireModule =
            serde_json::from_slice(bytes).map_err(|e| format!("invalid core module: {e}"))?;
        if wire.schema != 1
            || ![
                SEMANTICS,
                COMPUTE_SEMANTICS,
                LOCAL_SEMANTICS,
                SEQUENCE_SEMANTICS,
                PARALLEL_SEMANTICS,
                CONTROL_SEMANTICS,
                CANONICAL_FLOAT_SEMANTICS,
                VALUE_SEMANTICS,
                BULK_BUFFER_SEMANTICS,
                CONTRACT_SEMANTICS,
                VALUE_INVARIANT_SEMANTICS,
                MEASURE_SEMANTICS,
                BORROW_RANGE_SEMANTICS,
                WORD_CONVERSION_SEMANTICS,
            ]
            .contains(&wire.semantics.as_str())
        {
            return Err("incompatible executable core semantics".into());
        }
        let checked = Self::from_source(wire.program)?;
        if checked.semantics() != wire.semantics {
            return Err("incorrect executable semantics version".into());
        }
        Ok(checked)
    }

    pub fn semantics(&self) -> &str {
        &self.0.semantics
    }

    pub fn program(&self) -> &Program {
        &self.0.program
    }

    pub fn into_program(self) -> Program {
        self.0.program
    }

    /// Compact declaration-order JSON; named maps are BTreeMaps. The format is
    /// versioned. Source whitespace and object-property order are not identities.
    pub fn bytes(&self) -> LangResult<Vec<u8>> {
        let bytes = serde_json::to_vec(&self.0).map_err(|e| e.to_string())?;
        if bytes.len() > MAX_BYTES {
            return Err("core module exceeds byte limit".into());
        }
        Ok(bytes)
    }

    pub fn identity(&self) -> LangResult<String> {
        use sha2::{Digest, Sha256};
        Ok(format!("{:x}", Sha256::digest(self.bytes()?)))
    }

    pub fn pure_program(&self) -> LangResult<&Program> {
        let p = self.program();
        if !p.states.is_empty()
            || !p.keeps.is_empty()
            || !p.actions.is_empty()
            || !p.events.is_empty()
            || !p.ids.is_empty()
            || !p.enums.is_empty()
        {
            return Err(
                "pure core execution excludes stateful declarations; use the stateful backend"
                    .into(),
            );
        }
        Ok(p)
    }
}

struct Bounds {
    remaining: usize,
    extended: bool,
    sequence: bool,
}
impl Bounds {
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if depth > 32 || self.remaining == 0 {
            return Err("executable core structural budget exceeded".into());
        }
        self.remaining -= 1;
        Ok(())
    }
    fn name(&mut self, n: &str) -> LangResult<()> {
        self.step(0)?;
        if n.len() > 128
            || n.is_empty()
            || !n
                .bytes()
                .enumerate()
                .all(|(i, b)| b == b'_' || b.is_ascii_alphabetic() || (i > 0 && b.is_ascii_digit()))
        {
            return Err(format!("invalid core identifier {n:?}"));
        }
        Ok(())
    }
    fn ty(&mut self, t: &Type, d: usize) -> LangResult<()> {
        self.step(d)?;
        match t {
            Type::I32 | Type::F32 => {
                self.extended = true;
                Ok(())
            }
            Type::Vector(t, n) => {
                self.extended = true;
                if !(2..=4).contains(n) || !matches!(**t, Type::U32 | Type::I32 | Type::F32) {
                    return Err("vectors require 2–4 32-bit numeric components".into());
                }
                self.ty(t, d + 1)
            }
            Type::Unknown => Err("unresolved type in executable core".into()),
            Type::Named(n) => self.name(n),
            Type::List(t) | Type::Buffer(t) | Type::Option(t) => self.ty(t, d + 1),
            Type::Result(a, b) | Type::Map(a, b) | Type::Table(a, b) => {
                self.ty(a, d + 1)?;
                self.ty(b, d + 1)
            }
            _ => Ok(()),
        }
    }
    fn expr(&mut self, e: &Expr, d: usize) -> LangResult<()> {
        self.step(d)?;
        match e {
            Expr::Float(bits) => {
                self.extended = true;
                if !f32::from_bits(*bits).is_finite() {
                    return Err("non-finite float literal".into());
                }
                Ok(())
            }
            Expr::Neg(e) => {
                self.extended = true;
                self.expr(e, d + 1)
            }
            Expr::Let(n, t, a, b) => {
                self.extended = true;
                self.name(n)?;
                if let Some(t) = t {
                    self.ty(t, d + 1)?;
                }
                self.expr(a, d + 1)?;
                self.expr(b, d + 1)
            }
            Expr::Var(n) => self.name(n),
            Expr::Binary(_, a, b) => {
                self.expr(a, d + 1)?;
                self.expr(b, d + 1)
            }
            Expr::Call(n, args) => {
                if ["repeat", "vec2", "vec3", "vec4", "quot_or", "rem_or"].contains(&n.as_str()) {
                    self.extended = true;
                }
                self.name(n)?;
                for a in args {
                    self.expr(a, d + 1)?;
                }
                Ok(())
            }
            Expr::Method(e, n, args) => {
                self.sequence |= n == "concat";
                if ["zip", "map_indexed", "at_or", "scan", "sort"].contains(&n.as_str()) {
                    self.extended = true;
                }
                self.name(n)?;
                self.expr(e, d + 1)?;
                for a in args {
                    self.expr(a, d + 1)?;
                }
                Ok(())
            }
            Expr::Lambda(n, e) | Expr::Field(e, n) => {
                self.name(n)?;
                self.expr(e, d + 1)
            }
            Expr::Record(n, fields) => {
                self.name(n)?;
                for (n, e) in fields {
                    self.name(n)?;
                    self.expr(e, d + 1)?;
                }
                Ok(())
            }
            Expr::Try(e) => self.expr(e, d + 1),
            Expr::String(s) if s.len() > 1_000_000 => {
                Err("core string literal exceeds byte limit".into())
            }
            _ => Ok(()),
        }
    }
    fn statements(&mut self, body: &[Statement], d: usize) -> LangResult<()> {
        for statement in body {
            self.step(d)?;
            match statement {
                Statement::Let(n, t, e) => {
                    self.name(n)?;
                    if let Some(t) = t {
                        self.ty(t, d + 1)?;
                    }
                    self.expr(e, d + 1)?;
                }
                Statement::Return(e) | Statement::Expr(e) => self.expr(e, d + 1)?,
                Statement::Emit(n, e) => {
                    self.name(n)?;
                    self.expr(e, d + 1)?;
                }
                Statement::If(e, a, b) => {
                    self.expr(e, d + 1)?;
                    self.statements(a, d + 1)?;
                    self.statements(b, d + 1)?;
                }
            }
        }
        Ok(())
    }
    fn params(&mut self, params: &[(String, Type)]) -> LangResult<()> {
        if params.len() > 128 {
            return Err("core parameter limit exceeded".into());
        }
        for (n, t) in params {
            self.name(n)?;
            self.ty(t, 0)?;
        }
        Ok(())
    }
}

/// Reuse executable value budgets before external tools enter recursive typing.
pub(crate) fn validate_value_groups<'a>(
    groups: impl IntoIterator<Item = (&'a [(String, Type)], Vec<&'a Expr>)>,
) -> LangResult<()> {
    let mut bounds = Bounds {
        remaining: 100_000,
        extended: false,
        sequence: false,
    };
    for (params, expressions) in groups {
        bounds.params(params)?;
        for expression in expressions {
            bounds.expr(expression, 0)?;
        }
    }
    Ok(())
}

fn validate(p: &Program) -> LangResult<(bool, bool)> {
    if !p.rules.is_empty() {
        return Err(
            "executable core excludes inline rewrites; supply an external proof package".into(),
        );
    }
    if p.functions.len()
        + p.actions.len()
        + p.states.len()
        + p.keeps.len()
        + p.ids.len()
        + p.records.len()
        + p.enums.len()
        + p.events.len()
        > 1024
    {
        return Err("core declaration limit exceeded".into());
    }
    let mut b = Bounds {
        remaining: 100_000,
        extended: false,
        sequence: false,
    };
    if !p.module.is_empty() {
        b.name(&p.module)?;
    }
    for f in &p.functions {
        b.name(&f.name)?;
        b.params(&f.params)?;
        b.ty(&f.result, 0)?;
        b.expr(&f.body, 0)?;
        fn new_record_expr(e: &Expr) -> bool {
            match e {
                Expr::Record(..) | Expr::Field(..) => true,
                Expr::Binary(_, a, b) => new_record_expr(a) || new_record_expr(b),
                Expr::Call(_, a) => a.iter().any(new_record_expr),
                Expr::Method(x, _, a) => new_record_expr(x) || a.iter().any(new_record_expr),
                Expr::Lambda(_, b) => new_record_expr(b),
                _ => false,
            }
        }
        b.extended |= new_record_expr(&f.body);
    }
    for n in &p.ids {
        b.name(n)?;
    }
    for (n, fields) in &p.records {
        b.name(n)?;
        b.params(fields)?;
    }
    for (name, measure) in &p.termination.measures {
        b.name(name)?;
        b.expr(measure,0)?;
    }
    for (name, predicate) in &p.contracts.value_invariants {
        b.name(name)?;
        b.expr(predicate, 0)?;
    }
    for (ty, constructor) in &p.contracts.value_constructors {
        b.name(ty)?;
        b.name(constructor)?;
    }
    for (name,ty) in &p.contracts.value_validators { b.name(name)?; b.ty(ty,0)?; }
    for (name, spec) in &p.contracts.inferred {
        b.name(name)?;
        b.params(&spec.params)?;
        b.ty(&spec.result, 0)?;
        for predicate in spec.requires.iter().chain(&spec.ensures) { b.expr(predicate, 0)?; }
    }
    for (n, variants) in &p.enums {
        b.name(n)?;
        for v in variants {
            b.name(v)?;
        }
    }
    for (n, t) in &p.events {
        b.name(n)?;
        b.ty(t, 0)?;
    }
    for declaration in p.states.iter().chain(&p.keeps) {
        b.name(&declaration.name)?;
        b.ty(&declaration.ty, 0)?;
        b.expr(&declaration.value, 0)?;
    }
    for a in &p.actions {
        b.name(&a.name)?;
        b.params(&a.params)?;
        b.ty(&a.result, 0)?;
        for n in a.reads.iter().chain(&a.writes).chain(&a.emits) {
            b.name(n)?;
        }
        b.statements(&a.body, 0)?;
    }
    Ok((b.extended, b.sequence))
}

fn canonical_float_needed(p: &Program) -> bool {
    fn ty(t: &Type) -> bool {
        match t {
            Type::F32 => true,
            Type::List(x) | Type::Buffer(x) | Type::Option(x) | Type::Vector(x, _) => ty(x),
            Type::Result(a, b) | Type::Map(a, b) | Type::Table(a, b) => ty(a) || ty(b),
            _ => false,
        }
    }
    fn expr(e: &Expr) -> bool {
        let mut found = false;
        crate::analysis::walk(e, |node| {
            found |= matches!(node, Expr::Float(_));
            if let Expr::Let(_, Some(t), _, _) = node {
                found |= ty(t);
            }
        });
        found
    }
    fn statements(ss: &[Statement]) -> bool {
        ss.iter().any(|s| match s {
            Statement::Let(_, t, e) => t.as_ref().is_some_and(ty) || expr(e),
            Statement::If(c, a, b) => expr(c) || statements(a) || statements(b),
            Statement::Return(e) | Statement::Expr(e) | Statement::Emit(_, e) => expr(e),
        })
    }
    p.records.values().any(|fs| fs.iter().any(|(_, t)| ty(t)))
        || p.states
            .iter()
            .chain(&p.keeps)
            .any(|d| ty(&d.ty) || expr(&d.value))
        || p.events.values().any(ty)
        || p.functions
            .iter()
            .any(|f| ty(&f.result) || f.params.iter().any(|(_, t)| ty(t)) || expr(&f.body))
        || p.actions
            .iter()
            .any(|a| ty(&a.result) || a.params.iter().any(|(_, t)| ty(t)) || statements(&a.body))
}
fn control_needed(p: &Program) -> bool {
    fn has(e: &Expr, pure_carriers: bool) -> bool {
        let mut found = false;
        crate::analysis::walk(e, |n| {
            if matches!(n,Expr::Call(name,_) if name=="fold_until"||name=="foldr")
                || (pure_carriers && matches!(n, Expr::String(_) | Expr::Unit))
            {
                found = true;
            }
        });
        found
    }
    fn statements(ss: &[Statement]) -> bool {
        ss.iter().any(|s| match s {
            Statement::If(c, a, b) => has(c, false) || statements(a) || statements(b),
            Statement::Let(_, _, e)
            | Statement::Return(e)
            | Statement::Expr(e)
            | Statement::Emit(_, e) => has(e, false),
        })
    }
    // String/Unit already had fixed action semantics. V6 marks their newly
    // admitted pure-function carriers and the general fold control mechanism.
    p.functions.iter().any(|f| has(&f.body, true))
        || p.states
            .iter()
            .chain(&p.keeps)
            .any(|d| has(&d.value, false))
        || p.actions.iter().any(|a| statements(&a.body))
}
#[cfg(test)]
mod control_domain_tests {
    use super::*;
    #[test]
    fn domain_marks_general_pure_control_without_relabelling_unchanged_actions() {
        let action = CheckedModule::from_source(
            crate::syntax::parse("module actions;query unit()->Unit{return ();}").unwrap(),
        )
        .unwrap();
        assert_eq!(action.semantics(), SEMANTICS);
        let pure = CheckedModule::from_source(
            crate::syntax::parse("module pure;fn unit()->Unit{return ();}").unwrap(),
        )
        .unwrap();
        assert_eq!(pure.semantics(), CONTROL_SEMANTICS);
        let fold=CheckedModule::from_source(crate::syntax::parse("module control;fn first(xs:List<u32>)->u32{return fold_until(xs,0,fn(x)=>fn(a)=>x>0,fn(x)=>fn(a)=>x);}").unwrap()).unwrap();
        assert_eq!(fold.semantics(), CONTROL_SEMANTICS);
    }
}
