//! Compile-time demand reduction for total constructor-valued functions.
//!
//! The caller supplies fields its consumer ignores and canonical replacement
//! values. Only those fields may change. No source algorithm, table layout or
//! aggregate is recognised here. Pure total calls may be inlined to expose a
//! constructor; opaque results retain a literal projection after evaluation.
use crate::{
    definition::CheckedDefinition,
    logic::{Branch, Declaration, Sort, Term},
    LangResult,
};
use std::collections::BTreeMap;

pub fn constructor_fields(
    checked: &CheckedDefinition,
    function: &str,
    replacements: &[BTreeMap<usize, Term>],
) -> LangResult<(String, Declaration)> {
    let declarations = checked.reachable_executable_declarations()?;
    let Some(Declaration::Function {
        params,
        result,
        body,
        recursive: None,
    }) = declarations.get(function)
    else {
        return Err("field projection requires a nonrecursive entry function".into());
    };
    let crate::logic::Sort::Data(datatype) = result else {
        return Err("field projection requires a datatype result".into());
    };
    let Some(Declaration::Datatype { constructors }) = declarations.get(datatype) else {
        return Err("field projection result declaration".into());
    };
    if replacements.len() != constructors.len()
        || replacements
            .iter()
            .zip(constructors)
            .any(|(r, c)| r.keys().any(|i| *i >= c.fields.len()))
    {
        return Err("field projection index".into());
    }
    // Replacements are closed canonical values, so inserting them under a
    // branch cannot capture a parameter or a match-local variable.
    fn constant(
        term: &Term,
        sort: &Sort,
        ds: &BTreeMap<String, Declaration>,
        depth: usize,
    ) -> bool {
        if depth > 32 {
            return false;
        }
        match (term, sort) {
            (Term::Bool(_), Sort::Bool) | (Term::U64(_), Sort::U64) => true,
            (
                Term::Construct {
                    datatype,
                    constructor,
                    arguments,
                },
                Sort::Data(id),
            ) if datatype == id => {
                let Some(Declaration::Datatype { constructors }) = ds.get(id) else {
                    return false;
                };
                let Some(c) = constructors.get(*constructor) else {
                    return false;
                };
                arguments.len() == c.fields.len()
                    && arguments.iter().zip(&c.fields).all(|(v, t)| {
                        constant(
                            v,
                            if *t == Sort::SelfType { sort } else { t },
                            ds,
                            depth + 1,
                        )
                    })
            }
            _ => false,
        }
    }
    for (values, c) in replacements.iter().zip(constructors) {
        for (index, value) in values {
            let sort = if c.fields[*index] == Sort::SelfType {
                result
            } else {
                &c.fields[*index]
            };
            if !constant(value, sort, &declarations, 0) {
                return Err(
                    "field projection requires a typed closed canonical replacement".into(),
                );
            }
        }
    }
    struct Reduce<'a> {
        declarations: &'a BTreeMap<String, Declaration>,
        datatype: &'a str,
        replacements: &'a [BTreeMap<usize, Term>],
        constructors: &'a [crate::logic::Constructor],
        nodes: usize,
        serial: usize,
    }
    impl Reduce<'_> {
        fn opaque(&mut self, term: &Term) -> Term {
            let branches = self
                .constructors
                .iter()
                .enumerate()
                .map(|(c, constructor)| {
                    let bindings = constructor
                        .fields
                        .iter()
                        .map(|_| {
                            let n = format!("demand_{}", self.serial);
                            self.serial += 1;
                            n
                        })
                        .collect::<Vec<_>>();
                    let arguments = bindings
                        .iter()
                        .enumerate()
                        .map(|(i, n)| {
                            self.replacements[c]
                                .get(&i)
                                .cloned()
                                .unwrap_or_else(|| Term::Var(n.clone()))
                        })
                        .collect();
                    Branch {
                        bindings,
                        body: Term::Construct {
                            datatype: self.datatype.into(),
                            constructor: c,
                            arguments,
                        },
                    }
                })
                .collect();
            Term::Match {
                scrutinee: Box::new(term.clone()),
                branches,
            }
        }
        fn output(&mut self, term: &Term, depth: usize) -> LangResult<Term> {
            // Charge copied subtrees as well as reduction steps. Inlining must
            // not multiply a large argument outside the compiler work bound.
            let mut pending = vec![term];
            while let Some(t) = pending.pop() {
                self.nodes += 1;
                if self.nodes > 100_000 {
                    return Err("field projection node limit".into());
                }
                match t {
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
                    _ => {}
                }
            }
            if depth > 32 {
                return Ok(self.opaque(term));
            }
            Ok(match term {
                Term::Construct {
                    datatype,
                    constructor,
                    arguments,
                } if datatype == self.datatype => Term::Construct {
                    datatype: datatype.clone(),
                    constructor: *constructor,
                    arguments: arguments
                        .iter()
                        .enumerate()
                        .map(|(i, a)| {
                            self.replacements[*constructor]
                                .get(&i)
                                .cloned()
                                .unwrap_or_else(|| a.clone())
                        })
                        .collect(),
                },
                Term::If {
                    condition,
                    on_true,
                    on_false,
                } => Term::If {
                    condition: condition.clone(),
                    on_true: Box::new(self.output(on_true, depth + 1)?),
                    on_false: Box::new(self.output(on_false, depth + 1)?),
                },
                Term::Match {
                    scrutinee,
                    branches,
                } => Term::Match {
                    scrutinee: scrutinee.clone(),
                    branches: branches
                        .iter()
                        .map(|b| {
                            Ok(Branch {
                                bindings: b.bindings.clone(),
                                body: self.output(&b.body, depth + 1)?,
                            })
                        })
                        .collect::<LangResult<_>>()?,
                },
                Term::Call {
                    function,
                    arguments,
                } => {
                    if let Some(Declaration::Function {
                        params,
                        body,
                        recursive: None,
                        ..
                    }) = self.declarations.get(function)
                    {
                        let bindings = params
                            .iter()
                            .zip(arguments)
                            .map(|((n, _), a)| (n.clone(), a.clone()))
                            .collect();
                        let inlined = crate::logic::substitute_term(body, &bindings)?;
                        self.output(&inlined, depth + 1)?
                    } else {
                        self.opaque(term)
                    }
                }
                _ => self.opaque(term),
            })
        }
    }
    let mut reduce = Reduce {
        declarations: &declarations,
        datatype,
        replacements,
        constructors,
        nodes: 0,
        serial: 0,
    };
    let body = reduce.output(body, 0)?;
    let id = crate::registry::identity(&("ink-constructor-demand-v1", function, replacements))?;
    Ok((
        id,
        Declaration::Function {
            params: params.clone(),
            result: result.clone(),
            body,
            recursive: None,
        },
    ))
}

/// The standalone host consumes replies, versions, commit flags and events.
/// Logical post-state is consumed through `next` and checkpoints separately.
pub fn host_observers(
    checked: &crate::representation::CheckedRepresentation,
) -> LangResult<(BTreeMap<String, Declaration>, BTreeMap<String, String>)> {
    let logical = Term::Construct {
        datatype: checked.projection().state.clone(),
        constructor: 0,
        arguments: checked
            .projection()
            .tables
            .iter()
            .map(|t| Term::Construct {
                datatype: t.datatype.clone(),
                constructor: 0,
                arguments: vec![],
            })
            .collect(),
    };
    let replacements = vec![
        [(3, logical.clone())].into_iter().collect(),
        [(2, logical)].into_iter().collect(),
    ];
    let mut declarations = BTreeMap::new();
    let mut functions = BTreeMap::new();
    for (name, action) in &checked.plan().actions {
        if let Some(compact) = &action.compact {
            functions.insert(name.clone(), compact.observe.clone());
            continue;
        }
        let (id, d) = constructor_fields(checked.definition(), &action.observe, &replacements)?;
        declarations.insert(id.clone(), d);
        functions.insert(name.clone(), id);
    }
    Ok((declarations, functions))
}
