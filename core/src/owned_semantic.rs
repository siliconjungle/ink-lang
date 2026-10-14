//! Fixed extensional meanings of affine local storage. No rewrite catalogue.
//! Allocation identity/failure and fuel are outside the total-value domain.
use crate::{
    core::{Program, Type},
    semantic::{arrow, lambda as lam, op, term, value, word, Node, Sort, Term},
    LangResult,
};

pub fn arguments(ty: &Type, name: &str) -> LangResult<Vec<Type>> {
    Ok(match (ty, name) {
        (Type::Buffer(t), "at_or" | "set") => vec![Type::U32, *t.clone()],
        (Type::Buffer(_), "swap") => vec![Type::U32, Type::U32],
        (Type::Buffer(_), "copy_within") => vec![Type::U32, Type::U32, Type::U32],
        (Type::Buffer(t), "fill_range") => vec![Type::U32, Type::U32, *t.clone()],
        (Type::Buffer(t), "push") => vec![*t.clone()],
        (Type::Buffer(_), "truncate") => vec![Type::U32],
        (Type::Buffer(_), "freeze" | "len" | "pop" | "scan") => vec![],
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
                if let Type::Buffer(inner) = receiver_ty {
                    if name=="borrow_range" {
                        if a.len()!=4 {return Err("borrow_range semantic arity".into());}
                        expect(&a[1],value(Type::U32))?;expect(&a[2],value(Type::U32))?;
                        if crate::local_collections::owned(ty(&t.sort)?,p) {return Err("borrow_range result must be immutable".into());}
                        expect(&a[3],arrow(receiver.sort.clone(),t.sort.clone()))?;
                        return Ok(true);
                    }
                    if ["map", "map_indexed", "filter"].contains(&name) {
                        if a.len() != 2 {
                            return Err("buffer map arity".into());
                        }
                        let item = value(*inner.clone());
                        let callback = if name != "map_indexed" {
                            arrow(
                                item.clone(),
                                if name == "filter" {
                                    value(Type::Bool)
                                } else {
                                    item.clone()
                                },
                            )
                        } else {
                            arrow(value(Type::U32), arrow(item.clone(), item.clone()))
                        };
                        expect(&a[1], callback)?;
                        expect(t, receiver.sort.clone())?;
                        return Ok(true);
                    }
                    if name == "scan" && !crate::check::is_number(inner) {
                        return Err("buffer scan numeric sort".into());
                    }
                }
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
        "local:fill-range" | "local:copy-range" | "local:copy-from" => {
            let Type::List(inner) = ty(&t.sort)? else {
                return Err("range edit list".into());
            };
            Some((
                match n.as_str() {
                    "local:fill-range" => vec![
                        t.sort.clone(),
                        value(Type::U32),
                        value(Type::U32),
                        value(*inner.clone()),
                    ],
                    "local:copy-range" => vec![
                        t.sort.clone(),
                        value(Type::U32),
                        value(Type::U32),
                        value(Type::U32),
                    ],
                    _ => vec![
                        t.sort.clone(),
                        t.sort.clone(),
                        value(Type::U32),
                        value(Type::U32),
                    ],
                },
                t.sort.clone(),
            ))
        }
        "local:truncate" | "local:drop" => Some((vec![t.sort.clone(), value(Type::U32)], t.sort.clone())),
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
        if matches!(n.as_str(), "local:pop" | "local:truncate" | "local:drop")
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
// Membership observes the finite key sequence, irrespective of the map's
// construction history. Bind the query outside both fold parameters so captures
// under existing lambdas are shifted by the ordinary checked beta machinery.
fn map_membership(map: &Term, key: &Term) -> LangResult<Term> {
    let Type::Map(key_type, _) = ty(&map.sort)? else { return Err("map membership receiver".into()); };
    expect(key, value(*key_type.clone()))?;
    let boolean = value(Type::Bool);
    let key_sort = key.sort.clone();
    let body = op(boolean.clone(), "binary:||", vec![
        eq(term(key_sort.clone(), Node::Bound(2)), term(key_sort.clone(), Node::Bound(1))),
        term(boolean.clone(), Node::Bound(0)),
    ]);
    let accumulated = term(arrow(boolean.clone(), boolean.clone()), Node::Lambda(Box::new(body)));
    let step_sort = arrow(key_sort.clone(), accumulated.sort.clone());
    let step = term(step_sort.clone(), Node::Lambda(Box::new(accumulated)));
    let capture = term(arrow(key_sort, step_sort.clone()), Node::Lambda(Box::new(step)));
    Ok(op(boolean.clone(), "call:foldr", vec![
        op(value(Type::List(key_type.clone())), "method:keys", vec![map.clone()]),
        term(boolean, Node::Bool(false)),
        op(step_sort, "apply", vec![capture, key.clone()]),
    ]))
}
pub fn reduce(t: &Term) -> LangResult<Option<Term>> {
    let Node::Op(n, a) = &t.node else {
        return Ok(None);
    };
    let list_edit = |name: &str, args: Vec<Term>| op(args[0].sort.clone(), name, args);
    let result = match (n.as_str(), a.as_slice()) {
        ("method:borrow_range",[owner,start,count,callback]) => {
            let Type::Buffer(inner)=ty(&owner.sort)? else {return Err("borrow_range receiver".into());};
            let sequence=value(Type::List(inner.clone()));
            let rows=op(sequence.clone(),"method:freeze",vec![owner.clone()]);
            let clipped=op(sequence.clone(),"method:take",vec![op(sequence,"method:drop",vec![rows,start.clone()]),count.clone()]);
            let view=op(owner.sort.clone(),"call:buffer",vec![clipped]);
            Some(op(t.sort.clone(),"apply",vec![callback.clone(),view]))
        }
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
        ("method:map" | "method:map_indexed" | "method:scan" | "method:filter", args)
            if matches!(
                args.first().map(|x| &x.sort),
                Some(Sort::Value(Type::Buffer(_)))
            ) =>
        {
            if let Node::Op(name, values) = &args[0].node {
                if name == "call:buffer" {
                    let list = values[0].clone();
                    let mut params = vec![list.clone()];
                    params.extend(args[1..].iter().cloned());
                    Some(op(
                        t.sort.clone(),
                        "call:buffer",
                        vec![op(list.sort.clone(), n, params)],
                    ))
                } else {
                    None
                }
            } else {
                None
            }
        }
        (
            "method:push" | "method:set" | "method:pop" | "method:truncate" | "method:swap"
            | "method:fill_range" | "method:copy_within",
            args,
        ) if matches!(
            args.first().map(|x| &x.sort),
            Some(Sort::Value(Type::Buffer(_)))
        ) =>
        {
            // Every owner denotes its frozen sequence, including an opaque
            // accumulator returned by a fold. This is the fixed extensional
            // meaning of mutation, independent of any optimisation law.
            let Type::Buffer(inner) = ty(&args[0].sort)? else {
                unreachable!()
            };
            let xs = match &args[0].node {
                Node::Op(name, values) if name == "call:buffer" => values[0].clone(),
                _ => op(
                    value(Type::List(inner.clone())),
                    "method:freeze",
                    vec![args[0].clone()],
                ),
            };
            let edited = match n.as_str() {
                "method:push" => list_edit("local:append", vec![xs, args[1].clone()]),
                "method:set" => list_edit("local:set", vec![xs, args[1].clone(), args[2].clone()]),
                "method:pop" => list_edit("local:pop", vec![xs]),
                "method:truncate" => list_edit("local:truncate", vec![xs, args[1].clone()]),
                "method:fill_range" => list_edit(
                    "local:fill-range",
                    vec![xs, args[1].clone(), args[2].clone(), args[3].clone()],
                ),
                "method:copy_within" => list_edit(
                    "local:copy-range",
                    vec![xs, args[1].clone(), args[2].clone(), args[3].clone()],
                ),
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
                    let first = list_edit("local:set", vec![xs.clone(), args[1].clone(), right]);
                    choose(
                        valid,
                        list_edit("local:set", vec![first, args[2].clone(), left]),
                        xs,
                    )
                }
            };
            Some(op(t.sort.clone(), "call:buffer", vec![edited]))
        }
        ("local:fill-range", [xs, start, count, v]) => {
            if matches!(count.node, Node::Word(0)) {
                Some(xs.clone())
            } else {
                match &xs.node {
                    Node::Nil => Some(xs.clone()),
                    Node::Cons(h, tail) => Some(choose(
                        eq(count.clone(), word(Type::U32, 0)),
                        xs.clone(),
                        choose(
                            eq(start.clone(), word(Type::U32, 0)),
                            cons(
                                v.clone(),
                                list_edit(
                                    n,
                                    vec![
                                        *tail.clone(),
                                        word(Type::U32, 0),
                                        dec(count.clone()),
                                        v.clone(),
                                    ],
                                ),
                            ),
                            cons(
                                *h.clone(),
                                list_edit(
                                    n,
                                    vec![
                                        *tail.clone(),
                                        dec(start.clone()),
                                        count.clone(),
                                        v.clone(),
                                    ],
                                ),
                            ),
                        ),
                    )),
                    _ => None,
                }
            }
        }
        ("local:copy-range", [xs, source, destination, count]) => {
            Some(if matches!(count.node, Node::Word(0)) {
                xs.clone()
            } else {
                list_edit(
                    "local:copy-from",
                    vec![
                        xs.clone(),
                        op(
                            xs.sort.clone(),
                        "local:drop",
                            vec![xs.clone(), source.clone()],
                        ),
                        destination.clone(),
                        count.clone(),
                    ],
                )
            })
        }
        ("local:copy-from", [xs, source, destination, count]) => {
            if matches!(count.node, Node::Word(0)) {
                Some(xs.clone())
            } else {
                match &xs.node {
                    Node::Nil => Some(xs.clone()),
                    Node::Cons(h, tail) => {
                        let copied = match &source.node {
                            Node::Nil => xs.clone(),
                            Node::Cons(v, rest) => cons(
                                *v.clone(),
                                list_edit(
                                    n,
                                    vec![
                                        *tail.clone(),
                                        *rest.clone(),
                                        word(Type::U32, 0),
                                        dec(count.clone()),
                                    ],
                                ),
                            ),
                            _ => return Ok(None),
                        };
                        Some(choose(
                            eq(count.clone(), word(Type::U32, 0)),
                            xs.clone(),
                            choose(
                                eq(destination.clone(), word(Type::U32, 0)),
                                copied,
                                cons(
                                    *h.clone(),
                                    list_edit(
                                        n,
                                        vec![
                                            *tail.clone(),
                                            source.clone(),
                                            dec(destination.clone()),
                                            count.clone(),
                                        ],
                                    ),
                                ),
                            ),
                        ))
                    }
                    _ => None,
                }
            }
        }
        ("local:drop", [xs, count]) => {
            if matches!(count.node, Node::Word(0)) {Some(xs.clone())}
            else {match &xs.node {
                Node::Nil => Some(xs.clone()),
                Node::Cons(_, tail) => Some(choose(eq(count.clone(), word(Type::U32,0)), xs.clone(),list_edit(n, vec![*tail.clone(),dec(count.clone())]))),
                _ => None,
            }}
        }
        ("local:append", [xs, v]) => Some(op(
            xs.sort.clone(),
            "method:concat",
            vec![xs.clone(), cons(v.clone(), nil(xs.sort.clone()))],
        )),
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
            let opaque = || -> LangResult<Option<Term>> {
                if n == "method:contains" { Ok(Some(map_membership(m, k)?)) } else { Ok(None) }
            };
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
                    _ => opaque()?,
                }
            } else {
                opaque()?
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
