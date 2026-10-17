//! Precision of one source-AD request. This selects existing fixed arithmetic;
//! it does not authorize conversion, approximation or a semantic rewrite.
use crate::{
    core::{Expr, Program, Type},
    LangResult,
};

#[derive(Clone, Copy, PartialEq, Eq)]
pub(crate) enum Scalar {
    F32,
    F64,
}

impl Scalar {
    pub(crate) fn check_requirements(source: &Program, name: &str, pass: &str) -> LangResult<()> {
        if crate::contracts::specifications(source).iter().any(|s| {
            s.kind.is_none()
                && !s.requires.is_empty()
                && (s.name == name
                    || source
                        .contracts
                        .implementations
                        .iter()
                        .any(|i| i.name == name && i.specification == s.name))
        }) {
            return Err(format!("{pass} cannot transport proof preconditions for {name}; use a checked fallible source interface"));
        }
        Ok(())
    }
    pub(crate) fn ty(self) -> Type {
        match self {
            Self::F32 => Type::F32,
            Self::F64 => Type::F64,
        }
    }
    pub(crate) fn suffix(self) -> &'static str {
        match self {
            Self::F32 => "",
            Self::F64 => "64",
        }
    }
    pub(crate) fn division(self) -> &'static str {
        match self {
            Self::F32 => "f32_div",
            Self::F64 => "f64_div",
        }
    }
    pub(crate) fn from_bits(self) -> &'static str {
        match self {
            Self::F32 => "f32_from_bits",
            Self::F64 => "f64_from_bits",
        }
    }
    pub(crate) fn number(self, value: f64) -> Expr {
        match self {
            Self::F32 => Expr::Float((value as f32).to_bits()),
            Self::F64 => Expr::Double(value.to_bits()),
        }
    }
    /// Invalid requests still enter the historical pass and receive its ordinary
    /// scope/signature diagnostic. The other precision is handled in its pass.
    pub(crate) fn handles(self, arguments: &[Expr], source: &Program) -> bool {
        let result = arguments.first().and_then(|argument| {
            let Expr::Var(name) = argument else {
                return None;
            };
            source
                .functions
                .iter()
                .find(|f| &f.name == name)
                .map(|f| &f.result)
        });
        match result {
            Some(Type::F64) => self == Self::F64,
            _ => self == Self::F32,
        }
    }
    /// Instantiate only the bundled, fixed tape implementation. User source
    /// literals and annotations are never widened by this operation.
    pub(crate) fn reverse_runtime(self, prefix: &str) -> LangResult<Program> {
        let mut p =
            crate::syntax::parse(&include_str!("reverse_runtime.ink").replace("R_", prefix))?;
        if self == Self::F32 {
            return Ok(p);
        }
        fn ty(t: &mut Type) {
            match t {
                Type::F32 => *t = Type::F64,
                Type::List(t) | Type::Buffer(t) | Type::Option(t) | Type::Vector(t, _) => ty(t),
                Type::Map(a, b) | Type::Result(a, b) | Type::Table(a, b) => {
                    ty(a);
                    ty(b);
                }
                _ => {}
            }
        }
        fn expression(e: &mut Expr) {
            match e {
                Expr::Float(bits) => *e = Expr::Double(f64::from(f32::from_bits(*bits)).to_bits()),
                Expr::Let(_, annotation, a, b) => {
                    if let Some(t) = annotation {
                        ty(t);
                    }
                    expression(a);
                    expression(b);
                }
                Expr::Binary(_, a, b) => {
                    expression(a);
                    expression(b);
                }
                Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) | Expr::Lambda(_, x) => {
                    expression(x)
                }
                Expr::Call(name, arguments) => {
                    if name == "f32_div" {
                        *name = "f64_div".into();
                    }
                    for x in arguments {
                        expression(x);
                    }
                }
                Expr::Method(x, _, arguments) => {
                    expression(x);
                    for x in arguments {
                        expression(x);
                    }
                }
                Expr::Record(_, fields) => {
                    for (_, x) in fields {
                        expression(x);
                    }
                }
                _ => {}
            }
        }
        for fields in p.records.values_mut() {
            for (_, t) in fields {
                ty(t);
            }
        }
        for f in &mut p.functions {
            for (_, t) in &mut f.params {
                ty(t);
            }
            ty(&mut f.result);
            expression(&mut f.body);
        }
        Ok(p)
    }
}
