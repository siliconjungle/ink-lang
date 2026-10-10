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
}

/// This version fixes the executable representation and its current semantics,
/// not the larger proposed language or a proof of the Rust implementation.
pub const SEMANTICS: &str = "ink-executable-core-v1";
pub const COMPUTE_SEMANTICS: &str = "ink-executable-core-v2";
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

impl CheckedModule {
    pub fn from_source(program: Program) -> LangResult<Self> {
        let extended = validate(&program)?;
        crate::check::check(&program)?;
        let module = Self(WireModule {
            schema: 1,
            semantics: if extended {
                COMPUTE_SEMANTICS
            } else {
                SEMANTICS
            }
            .into(),
            program,
        });
        module.bytes()?;
        Ok(module)
    }

    pub fn from_bytes(bytes: &[u8]) -> LangResult<Self> {
        if bytes.len() > MAX_BYTES {
            return Err("core module exceeds byte limit".into());
        }
        let wire: WireModule =
            serde_json::from_slice(bytes).map_err(|e| format!("invalid core module: {e}"))?;
        if wire.schema != 1 || ![SEMANTICS, COMPUTE_SEMANTICS].contains(&wire.semantics.as_str()) {
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
            Type::List(t) | Type::Option(t) => self.ty(t, d + 1),
            Type::Result(a, b) | Type::Table(a, b) => {
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

fn validate(p: &Program) -> LangResult<bool> {
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
    Ok(b.extended)
}
