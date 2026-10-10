//! Bind database prefix-composition definitions to the actual effect algebra.
//! This does not prove source-analysis soundness or admit a stateful replacement.
use crate::{
    effects::{self, CheckedEffects, Exit, Path, ValueShape},
    logic::{Branch, Constructor, Context, Declaration, Sort, Term},
    registry::{Bundle, CheckedBundle},
    LangResult,
};
use serde::{Deserialize, Serialize};
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Description {
    pub schema: u32,
    pub semantics: String,
    pub value_shape: String,
    pub exit: String,
    pub path: String,
    pub follow: String,
    pub prefix_or: String,
}
pub struct BoundEffects {
    identity: String,
    description: Description,
    context: Context,
}
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn ctor(id: &str, n: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor: n,
        arguments: args,
    }
}
impl BoundEffects {
    pub fn bind(effects: &CheckedEffects, bundle: &Bundle, d: &Description) -> LangResult<Self> {
        if d.schema != 1 || d.semantics != effects::SEMANTICS {
            return Err("incompatible effect composition model".into());
        }
        let context = CheckedBundle::check(bundle)?.first_order_context()?;
        for (id, names) in [
            (
                &d.value_shape,
                &["Other", "False", "True", "None", "Some", "Ok", "Err"][..],
            ),
            (&d.exit, &["Next", "Return", "Abort", "Host"][..]),
        ] {
            context.matches_definition(
                id,
                &Declaration::Datatype {
                    constructors: names
                        .iter()
                        .map(|n| Constructor {
                            name: (*n).into(),
                            fields: vec![],
                        })
                        .collect(),
                },
            )?;
        }
        context.matches_definition(
            &d.path,
            &Declaration::Datatype {
                constructors: vec![Constructor {
                    name: "Path".into(),
                    fields: vec![
                        Sort::Bool,
                        Sort::Bool,
                        Sort::Data(d.exit.clone()),
                        Sort::Data(d.value_shape.clone()),
                    ],
                }],
            },
        )?;
        context.matches_definition(
            &d.prefix_or,
            &Declaration::Function {
                params: vec![("a".into(), Sort::Bool), ("b".into(), Sort::Bool)],
                result: Sort::Bool,
                recursive: None,
                body: Term::If {
                    condition: Box::new(var("a")),
                    on_true: Box::new(Term::Bool(true)),
                    on_false: Box::new(var("b")),
                },
            },
        )?;
        let combine = |a: &str, b: &str| Term::Call {
            function: d.prefix_or.clone(),
            arguments: vec![var(a), var(b)],
        };
        let suffix = Term::Match {
            scrutinee: Box::new(var("right")),
            branches: vec![Branch {
                bindings: vec!["bw".into(), "be".into(), "bx".into(), "bv".into()],
                body: ctor(
                    &d.path,
                    0,
                    vec![
                        combine("aw", "bw"),
                        combine("ae", "be"),
                        var("bx"),
                        var("bv"),
                    ],
                ),
            }],
        };
        let choice = Term::Match {
            scrutinee: Box::new(var("ax")),
            branches: (0..4)
                .map(|i| Branch {
                    bindings: vec![],
                    body: if i == 0 { suffix.clone() } else { var("left") },
                })
                .collect(),
        };
        context.matches_definition(
            &d.follow,
            &Declaration::Function {
                params: vec![
                    ("left".into(), Sort::Data(d.path.clone())),
                    ("right".into(), Sort::Data(d.path.clone())),
                ],
                result: Sort::Data(d.path.clone()),
                recursive: None,
                body: Term::Match {
                    scrutinee: Box::new(var("left")),
                    branches: vec![Branch {
                        bindings: vec!["aw".into(), "ae".into(), "ax".into(), "av".into()],
                        body: choice,
                    }],
                },
            },
        )?;
        Ok(Self {
            identity: effects.identity()?,
            description: d.clone(),
            context,
        })
    }
    pub fn effects_identity(&self) -> &str {
        &self.identity
    }
    pub fn context(&self) -> &Context {
        &self.context
    }
    pub fn encode(&self, p: Path) -> Term {
        let exit = match p.exit {
            Exit::Next => 0,
            Exit::Return => 1,
            Exit::Abort => 2,
            Exit::Host => 3,
        };
        let shape = match p.value {
            ValueShape::Other => 0,
            ValueShape::False => 1,
            ValueShape::True => 2,
            ValueShape::None => 3,
            ValueShape::Some => 4,
            ValueShape::Ok => 5,
            ValueShape::Err => 6,
        };
        ctor(
            &self.description.path,
            0,
            vec![
                Term::Bool(p.written),
                Term::Bool(p.emitted),
                ctor(&self.description.exit, exit, vec![]),
                ctor(&self.description.value_shape, shape, vec![]),
            ],
        )
    }
    pub fn follow_call(&self, left: Term, right: Term) -> Term {
        Term::Call {
            function: self.description.follow.clone(),
            arguments: vec![left, right],
        }
    }
}
