//! Fixed extensional meanings of affine local storage. No rewrite catalogue.
//! Allocation identity/failure and fuel are outside the total-value domain.
use crate::{
    core::{Program, Type},
    semantic::{op, term, value, word, Node, Sort, Term},
    LangResult,
};

pub fn arguments(ty: &Type, name: &str) -> LangResult<Vec<Type>> {
    Ok(match (ty, name) {
        (Type::Buffer(t), "at_or" | "set") => vec![Type::U32, *t.clone()],
        (Type::Buffer(_), "swap") => vec![Type::U32, Type::U32],
        (Type::Buffer(t), "push") => vec![*t.clone()],
        (Type::Buffer(_), "truncate") => vec![Type::U32],
        (Type::Buffer(_), "freeze" | "len" | "pop") => vec![],
        (Type::Map(k, v), "get_or" | "set") => vec![*k.clone(), *v.clone()],
        (Type::Map(k, _), "remove" | "contains") => vec![*k.clone()],
        (Type::Map(..), "len" | "keys" | "values") => vec![],
        _ => return Err("unsupported temporary semantic operation".into()),
    })
}
fn ty(s: &Sort) -> LangResult<&Type> {
    if let Sort::Value(t) = s {
        Ok(t)
    } else {
        Err("temporary value sort".into())
    }
}
fn expect(t: &Term, sort: Sort) -> LangResult<()> {
    if t.sort == sort {
        Ok(())
    } else {
        Err("temporary semantic sort mismatch".into())
    }
}
pub fn validate(t: &Term, p: &Program) -> LangResult<bool> {
    let Node::Op(n, a) = &t.node else {
        return Ok(false);
    };
    if n == "local:buffer-empty" || n == "local:map-empty" {
        if !a.is_empty()
            || !matches!(
                (n.as_str(), ty(&t.sort)?),
                ("local:buffer-empty", Type::Buffer(_)) | ("local:map-empty", Type::Map(..))
            )
        {
            return Err("temporary empty sort/arity".into());
        }
        crate::statecheck::validate_type(ty(&t.sort)?, p)?;
        return Ok(true);
    }
    if n == "call:buffer_fill" {
        let Type::Buffer(inner) = ty(&t.sort)? else {
            return Err("fill result".into());
        };
        if a.len() != 2 {
            return Err("fill arity".into());
        }
        expect(&a[0], value(Type::U32))?;
        expect(&a[1], value(*inner.clone()))?;
        crate::statecheck::validate_type(ty(&t.sort)?, p)?;
        return Ok(true);
    }
    if let Some(name) = n.strip_prefix("method:") {
        if let Some(receiver) = a.first() {
            let receiver_ty = ty(&receiver.sort)?;
            if matches!(receiver_ty, Type::Buffer(_) | Type::Map(..)) {
                crate::statecheck::validate_type(receiver_ty, p)?;
                let types = arguments(receiver_ty, name)?;
                if a.len() != types.len() + 1 {
                    return Err("temporary method arity".into());
                }
                for (arg, ty) in a[1..].iter().zip(types) {
                    expect(arg, value(ty))?;
                }
                let result = match (receiver_ty, name) {
                    (_, "len") => Type::U32,
                    (Type::Buffer(t), "freeze") => Type::List(t.clone()),
                    (Type::Buffer(t), "at_or") => *t.clone(),
                    (Type::Map(_, v), "get_or") => *v.clone(),
                    (Type::Map(..), "contains") => Type::Bool,
                    (Type::Map(k, _), "keys") => Type::List(k.clone()),
                    (Type::Map(_, v), "values") => Type::List(v.clone()),
                    _ => receiver_ty.clone(),
                };
                expect(t, value(result))?;
                return Ok(true);
            }
        }
    }
    // Operational helpers are proof vocabulary, never reified source calls.
    let signatures: Option<(Vec<Sort>, Sort)> = match n.as_str() {
        "local:fill" => {
            let Type::List(inner) = ty(&t.sort)? else {
                return Err("fill list".into());
            };
            Some((
                vec![value(Type::U32), value(*inner.clone())],
                t.sort.clone(),
            ))
        }
        "local:append" | "local:set" => {
            let Type::List(inner) = ty(&t.sort)? else {
                return Err("edit list".into());
            };
            let mut s = vec![t.sort.clone()];
            if n == "local:set" {
                s.push(value(Type::U32));
            }
            s.push(value(*inner.clone()));
            Some((s, t.sort.clone()))
        }
        "local:pop" => Some((vec![t.sort.clone()], t.sort.clone())),
        "local:truncate" => Some((vec![t.sort.clone(), value(Type::U32)], t.sort.clone())),
        "local:keys-insert" | "local:keys-remove" => {
            let Type::List(k) = ty(&t.sort)? else {
                return Err("key list".into());
            };
            if !crate::local_collections::key_type(k) {
                return Err("key sort".into());
            }
            Some((vec![t.sort.clone(), value(*k.clone())], t.sort.clone()))
        }
        "local:has-index" => {
            if a.len() != 2 || !matches!(ty(&a[0].sort)?, Type::List(_)) {
                return Err("index predicate list/arity".into());
            }
            Some((vec![a[0].sort.clone(), value(Type::U32)], value(Type::Bool)))
        }
        "local:swap-read" => {
            if a.len() != 2 {
                return Err("swap read arity".into());
            }
            let Type::List(inner) = ty(&a[0].sort)? else {
                return Err("swap read list".into());
            };
            Some((
                vec![a[0].sort.clone(), value(Type::U32)],
                value(*inner.clone()),
            ))
        }
        "local:map-value" | "local:map-values" => {
            let Some(first) = a.first() else {
                return Err("map helper arity".into());
            };
            let Type::Map(k, v) = ty(&first.sort)? else {
                return Err("map helper receiver".into());
            };
            let (arg, result) = if n == "local:map-value" {
                (value(*k.clone()), value(*v.clone()))
            } else {
                (value(Type::List(k.clone())), value(Type::List(v.clone())))
            };
            Some((vec![first.sort.clone(), arg], result))
        }
        _ => None,
    };
    if let Some((args, result)) = signatures {
        if a.len() != args.len() {
            return Err("temporary helper arity".into());
        }
        if matches!(n.as_str(), "local:pop" | "local:truncate")
            && !matches!(ty(&t.sort)?, Type::List(_))
        {
            return Err("temporary helper list".into());
        }
        for (arg, sort) in a.iter().zip(args) {
            expect(arg, sort)?;
        }
        expect(t, result)?;
        return Ok(true);
    }
    Ok(false)
}
fn nil(sort: Sort) -> Term {
    term(sort, Node::Nil)
}
fn cons(h: Term, t: Term) -> Term {
    term(t.sort.clone(), Node::Cons(Box::new(h), Box::new(t)))
}
fn choose(c: Term, t: Term, f: Term) -> Term {
    op(t.sort.clone(), "call:choose", vec![c, t, f])
}
fn eq(a: Term, b: Term) -> Term {
    op(value(Type::Bool), "binary:==", vec![a, b])
}
fn dec(n: Term) -> Term {
    op(value(Type::U32), "binary:-", vec![n, word(Type::U32, 1)])
}
fn empty_map(t: &Term) -> bool {
    matches!(&t.node,Node::Op(n,a) if n=="local:map-empty" && a.is_empty())
}
pub fn reduce(t: &Term) -> LangResult<Option<Term>> {
    let Node::Op(n, a) = &t.node else {
        return Ok(None);
    };
    let list_edit = |name: &str, args: Vec<Term>| op(args[0].sort.clone(), name, args);
    let result = match (n.as_str(), a.as_slice()) {
        ("local:buffer-empty", []) => {
            let Type::Buffer(inner) = ty(&t.sort)? else {
                return Err("empty buffer".into());
            };
            Some(op(
                t.sort.clone(),
                "call:buffer",
                vec![nil(value(Type::List(inner.clone())))],
            ))
        }
        ("call:buffer_fill", [n, v]) => Some(op(
            t.sort.clone(),
            "call:buffer",
            vec![op(
                value(Type::List(Box::new(ty(&v.sort)?.clone()))),
                "local:fill",
                vec![n.clone(), v.clone()],
            )],
        )),
        ("local:fill", [n, v]) => match n.node {
            Node::Word(0) => Some(nil(t.sort.clone())),
            Node::Word(k) => Some(cons(
                v.clone(),
                op(
                    t.sort.clone(),
                    "local:fill",
                    vec![word(Type::U32, k - 1), v.clone()],
                ),
            )),
            _ => None,
        },
        ("method:push" | "method:set" | "method:pop" | "method:truncate" | "method:swap", args)
            if matches!(
                args.first().map(|x| &x.sort),
                Some(Sort::Value(Type::Buffer(_)))
            ) =>
        {
            if let Node::Op(name, xs) = &args[0].node {
                if name == "call:buffer" {
                    let xs = xs[0].clone();
                    let edited = match n.as_str() {
                        "method:push" => list_edit("local:append", vec![xs, args[1].clone()]),
                        "method:set" => {
                            list_edit("local:set", vec![xs, args[1].clone(), args[2].clone()])
                        }
                        "method:pop" => list_edit("local:pop", vec![xs]),
                        "method:truncate" => list_edit("local:truncate", vec![xs, args[1].clone()]),
                        _ => {
                            let Type::List(inner) = ty(&xs.sort)? else {
                                return Err("swap list".into());
                            };
                            let valid = op(
                                value(Type::Bool),
                                "binary:&&",
                                vec![
                                    op(
                                        value(Type::Bool),
                                        "local:has-index",
                                        vec![xs.clone(), args[1].clone()],
                                    ),
                                    op(
                                        value(Type::Bool),
                                        "local:has-index",
                                        vec![xs.clone(), args[2].clone()],
                                    ),
                                ],
                            );
                            // The fallback is unobserved on the guarded path. Read from the original list.
                            // A separate helper swaps by two indexed edits only after both values are found.
                            let left = op(
                                value(*inner.clone()),
                                "local:swap-read",
                                vec![xs.clone(), args[1].clone()],
                            );
                            let right = op(
                                value(*inner.clone()),
                                "local:swap-read",
                                vec![xs.clone(), args[2].clone()],
                            );
                            let first =
                                list_edit("local:set", vec![xs.clone(), args[1].clone(), right]);
                            choose(
                                valid,
                                list_edit("local:set", vec![first, args[2].clone(), left]),
                                xs,
                            )
                        }
                    };
                    Some(op(t.sort.clone(), "call:buffer", vec![edited]))
                } else {
                    None
                }
            } else {
                None
            }
        }
        ("local:append", [xs, v]) => match &xs.node {
            Node::Nil => Some(cons(v.clone(), xs.clone())),
            Node::Cons(h, tail) => Some(cons(
                *h.clone(),
                list_edit(n, vec![*tail.clone(), v.clone()]),
            )),
            _ => None,
        },
        ("local:set", [xs, i, v]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, tail) => Some(choose(
                eq(i.clone(), word(Type::U32, 0)),
                cons(v.clone(), *tail.clone()),
                cons(
                    *h.clone(),
                    list_edit(n, vec![*tail.clone(), dec(i.clone()), v.clone()]),
                ),
            )),
            _ => None,
        },
        ("local:pop", [xs]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, tail) => match &tail.node {
                Node::Nil => Some(*tail.clone()),
                Node::Cons(..) => Some(cons(*h.clone(), list_edit(n, vec![*tail.clone()]))),
                _ => None,
            },
            _ => None,
        },
        ("local:truncate", [xs, i]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, tail) => Some(choose(
                eq(i.clone(), word(Type::U32, 0)),
                nil(xs.sort.clone()),
                cons(
                    *h.clone(),
                    list_edit(n, vec![*tail.clone(), dec(i.clone())]),
                ),
            )),
            _ => None,
        },
        ("local:has-index", [xs, i]) => match &xs.node {
            Node::Nil => Some(term(value(Type::Bool), Node::Bool(false))),
            Node::Cons(_, tail) => Some(choose(
                eq(i.clone(), word(Type::U32, 0)),
                term(value(Type::Bool), Node::Bool(true)),
                op(value(Type::Bool), n, vec![*tail.clone(), dec(i.clone())]),
            )),
            _ => None,
        },
        ("local:swap-read", [xs, i]) => match (&xs.node, &i.node) {
            (Node::Cons(h, _), Node::Word(0)) => Some(*h.clone()),
            (Node::Cons(_, tail), Node::Word(k)) => Some(op(
                t.sort.clone(),
                n,
                vec![*tail.clone(), word(Type::U32, k - 1)],
            )),
            _ => None,
        },
        ("method:len", [m]) if matches!(m.sort, Sort::Value(Type::Map(..))) => {
            let Type::Map(k, _) = ty(&m.sort)? else {
                unreachable!()
            };
            Some(op(
                value(Type::U32),
                "call:length",
                vec![op(
                    value(Type::List(k.clone())),
                    "method:keys",
                    vec![m.clone()],
                )],
            ))
        }
        ("method:get_or", [m, k, _])
        | ("method:contains", [m, k])
        | ("local:map-value", [m, k]) => {
            let fallback = if n == "method:contains" {
                term(value(Type::Bool), Node::Bool(false))
            } else if n == "method:get_or" {
                a[2].clone()
            } else {
                t.clone()
            };
            if empty_map(m) {
                if n == "local:map-value" {
                    None
                } else {
                    Some(fallback)
                }
            } else if let Node::Op(name, args) = &m.node {
                match (name.as_str(), args.as_slice()) {
                    ("method:set", [previous, key, v]) => Some(choose(
                        eq(k.clone(), key.clone()),
                        if n == "method:contains" {
                            term(value(Type::Bool), Node::Bool(true))
                        } else {
                            v.clone()
                        },
                        op(
                            t.sort.clone(),
                            n,
                            if n == "method:get_or" {
                                vec![previous.clone(), k.clone(), fallback]
                            } else {
                                vec![previous.clone(), k.clone()]
                            },
                        ),
                    )),
                    ("method:remove", [previous, key]) => {
                        if n == "local:map-value" {
                            if matches!((&k.node,&key.node),(Node::Word(a),Node::Word(b)) if a!=b)
                                || matches!((&k.node,&key.node),(Node::Bool(a),Node::Bool(b)) if a!=b)
                            {
                                Some(op(t.sort.clone(), n, vec![previous.clone(), k.clone()]))
                            } else {
                                None
                            }
                        } else {
                            Some(choose(
                                eq(k.clone(), key.clone()),
                                fallback.clone(),
                                op(
                                    t.sort.clone(),
                                    n,
                                    if n == "method:get_or" {
                                        vec![previous.clone(), k.clone(), fallback]
                                    } else {
                                        vec![previous.clone(), k.clone()]
                                    },
                                ),
                            ))
                        }
                    }
                    _ => None,
                }
            } else {
                None
            }
        }
        ("method:keys", [m]) => {
            if empty_map(m) {
                Some(nil(t.sort.clone()))
            } else if let Node::Op(name, args) = &m.node {
                match (name.as_str(), args.as_slice()) {
                    ("method:set", [previous, key, _]) | ("method:remove", [previous, key]) => {
                        Some(op(
                            t.sort.clone(),
                            if name == "method:set" {
                                "local:keys-insert"
                            } else {
                                "local:keys-remove"
                            },
                            vec![op(t.sort.clone(), n, vec![previous.clone()]), key.clone()],
                        ))
                    }
                    _ => None,
                }
            } else {
                None
            }
        }
        ("local:keys-insert" | "local:keys-remove", [xs, key]) => match &xs.node {
            Node::Nil => Some(if n == "local:keys-insert" {
                cons(key.clone(), xs.clone())
            } else {
                xs.clone()
            }),
            Node::Cons(h, tail) => {
                let rest = op(xs.sort.clone(), n, vec![*tail.clone(), key.clone()]);
                if n == "local:keys-remove" {
                    Some(choose(
                        eq(key.clone(), *h.clone()),
                        *tail.clone(),
                        cons(*h.clone(), rest),
                    ))
                } else {
                    let less = if key.sort == value(Type::Bool) {
                        op(
                            value(Type::Bool),
                            "binary:&&",
                            vec![
                                op(
                                    value(Type::Bool),
                                    "binary:==",
                                    vec![key.clone(), term(value(Type::Bool), Node::Bool(false))],
                                ),
                                *h.clone(),
                            ],
                        )
                    } else {
                        op(value(Type::Bool), "binary:<", vec![key.clone(), *h.clone()])
                    };
                    Some(choose(
                        eq(key.clone(), *h.clone()),
                        xs.clone(),
                        choose(less, cons(key.clone(), xs.clone()), cons(*h.clone(), rest)),
                    ))
                }
            }
            _ => None,
        },
        ("method:values", [m]) => {
            let Type::Map(k, _) = ty(&m.sort)? else {
                return Ok(None);
            };
            Some(op(
                t.sort.clone(),
                "local:map-values",
                vec![
                    m.clone(),
                    op(value(Type::List(k.clone())), "method:keys", vec![m.clone()]),
                ],
            ))
        }
        ("local:map-values", [m, keys]) => match &keys.node {
            Node::Nil => Some(nil(t.sort.clone())),
            Node::Cons(h, tail) => {
                let Type::Map(_, v) = ty(&m.sort)? else {
                    return Err("map values".into());
                };
                Some(cons(
                    op(
                        value(*v.clone()),
                        "local:map-value",
                        vec![m.clone(), *h.clone()],
                    ),
                    op(t.sort.clone(), n, vec![m.clone(), *tail.clone()]),
                ))
            }
            _ => None,
        },
        _ => None,
    };
    Ok(result)
}
