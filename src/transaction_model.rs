//! Bind a checked database definition to the actual fixed change boundary.
//! This does not bind the action body, certify rollback storage or install a plan.
use crate::{
    core::CheckedModule,
    logic::{Constructor, Context, Declaration, Sort, Term},
    registry::{Bundle, CheckedBundle},
    syntax::ActionKind,
    transaction::{self, Decision},
    LangResult,
};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Description {
    pub schema: u32,
    pub semantics: String,
    pub decision: String,
    pub finish: String,
}

/// Not deserialisable or constructible by a producer. Identity describes the
/// complete checked module; the body still needs a separate refinement proof.
pub struct BoundChange {
    module_identity: String,
    action: String,
    description: Description,
    context: Context,
}

impl BoundChange {
    pub fn bind(
        module: &CheckedModule,
        action: &str,
        bundle: &Bundle,
        description: &Description,
    ) -> LangResult<Self> {
        if description.schema != 1 || description.semantics != transaction::SEMANTICS {
            return Err("incompatible change boundary model".into());
        }
        let action = module
            .program()
            .actions
            .iter()
            .find(|a| a.name == action)
            .ok_or("unknown source action")?;
        if action.kind != ActionKind::Change {
            return Err("change boundary requires a source change".into());
        }
        let context = CheckedBundle::check(bundle)?.first_order_context()?;
        context.matches_definition(
            &description.decision,
            &Declaration::Datatype {
                constructors: vec![
                    Constructor {
                        name: "Rollback".into(),
                        fields: vec![],
                    },
                    Constructor {
                        name: "Commit".into(),
                        fields: vec![Sort::U64],
                    },
                    Constructor {
                        name: "Exhausted".into(),
                        fields: vec![],
                    },
                ],
            },
        )?;
        let ctor = |constructor, arguments| Term::Construct {
            datatype: description.decision.clone(),
            constructor,
            arguments,
        };
        // Exact definitions, not object names, hashes or theorem titles, bind
        // the meaning. These are fixed language semantics, not rewrite rules.
        context.matches_definition(
            &description.finish,
            &Declaration::Function {
                params: vec![
                    ("version".into(), Sort::U64),
                    ("succeeded".into(), Sort::Bool),
                ],
                result: Sort::Data(description.decision.clone()),
                recursive: None,
                body: Term::If {
                    condition: Box::new(Term::Var("succeeded".into())),
                    on_false: Box::new(ctor(0, vec![])),
                    on_true: Box::new(Term::If {
                        condition: Box::new(Term::Binary {
                            op: "==".into(),
                            left: Box::new(Term::Var("version".into())),
                            right: Box::new(Term::U64(u64::MAX)),
                        }),
                        on_true: Box::new(ctor(2, vec![])),
                        on_false: Box::new(ctor(
                            1,
                            vec![Term::Binary {
                                op: "+".into(),
                                left: Box::new(Term::Var("version".into())),
                                right: Box::new(Term::U64(1)),
                            }],
                        )),
                    }),
                },
            },
        )?;
        Ok(Self {
            module_identity: module.identity()?,
            action: action.name.clone(),
            description: description.clone(),
            context,
        })
    }

    pub fn module_identity(&self) -> &str {
        &self.module_identity
    }
    pub fn action(&self) -> &str {
        &self.action
    }
    pub fn context(&self) -> &Context {
        &self.context
    }

    pub fn finish_call(&self, version: Term, succeeded: Term) -> Term {
        Term::Call {
            function: self.description.finish.clone(),
            arguments: vec![version, succeeded],
        }
    }

    pub fn encode_decision(&self, decision: Decision) -> Term {
        let (constructor, arguments) = match decision {
            Decision::Rollback => (0, vec![]),
            Decision::Commit { version } => (1, vec![Term::U64(version)]),
            Decision::Exhausted => (2, vec![]),
        };
        Term::Construct {
            datatype: self.description.decision.clone(),
            constructor,
            arguments,
        }
    }
}
