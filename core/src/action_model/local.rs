//! Fixed value correspondence for invocation-local owners and bounded iteration.
//! The carrier is extensional: allocation identity is unobservable under the
//! existing affine source rules. No optimisation law or native storage policy.
use super::*;
use crate::semantic::{Node, Sort as SemanticSort, Term as SemanticTerm};

impl Lower<'_> {
    pub(super) fn sequence_op(&mut self, element: &Type, name: &str) -> LangResult<String> {
        let key = format!(
            "{name}:{}",
            serde_json::to_string(element).map_err(|e| e.to_string())?
        );
        if let Some(f) = self.local_ops.get(&key) {
            return Ok(f.clone());
        }
        let sequence = self.sort(&Type::List(Box::new(element.clone())))?;
        let datatype = id(&sequence)?.to_string();
        let value = self.sort(element)?;
        let nil = c(&datatype, 0, vec![]);
        let head = v("local_head");
        let tail = v("local_tail");
        let make = |a, z| c(&datatype, 1, vec![a, z]);
        let index = v("local_index");
        let zero = b("==", index.clone(), Term::U64(0));
        let decrement = b(
            "&",
            b("-", index.clone(), Term::U64(1)),
            Term::U64(u32::MAX as u64),
        );
        let mut params = vec![("local_rows", sequence.clone())];
        let (result, empty, nonempty) = match name {
            "len" => (
                Sort::U64,
                Term::U64(0),
                b(
                    "&",
                    b("+", Term::U64(1), Term::SelfCall(vec![tail])),
                    Term::U64(u32::MAX as u64),
                ),
            ),
            "get" => {
                params.push(("local_index", Sort::U64));
                let option = self.sort(&Type::Option(Box::new(element.clone())))?;
                (
                    option.clone(),
                    c(id(&option)?, 0, vec![]),
                    choice(
                        zero,
                        c(id(&option)?, 1, vec![head]),
                        Term::SelfCall(vec![tail, decrement]),
                    ),
                )
            }
            "set" => {
                params.extend([("local_index", Sort::U64), ("local_value", value)]);
                (
                    sequence.clone(),
                    nil,
                    choice(
                        zero,
                        make(v("local_value"), tail.clone()),
                        make(
                            head,
                            Term::SelfCall(vec![tail, decrement, v("local_value")]),
                        ),
                    ),
                )
            }
            "push" => {
                params.push(("local_value", value));
                (
                    sequence.clone(),
                    make(v("local_value"), nil),
                    make(head, Term::SelfCall(vec![tail, v("local_value")])),
                )
            }
            "concat" => {
                params.push(("local_other", sequence.clone()));
                (
                    sequence.clone(),
                    v("local_other"),
                    make(head, Term::SelfCall(vec![tail, v("local_other")])),
                )
            }
            "pop" => (
                sequence.clone(),
                nil.clone(),
                m(
                    tail.clone(),
                    vec![
                        (vec![], nil),
                        (
                            vec!["local_next".into(), "local_rest".into()],
                            make(head, Term::SelfCall(vec![tail])),
                        ),
                    ],
                ),
            ),
            "truncate" => {
                params.push(("local_index", Sort::U64));
                (
                    sequence.clone(),
                    nil.clone(),
                    choice(zero, nil, make(head, Term::SelfCall(vec![tail, decrement]))),
                )
            }
            _ => return Err("unknown local sequence operation".into()),
        };
        let f = self.function(
            params,
            result,
            m(
                v("local_rows"),
                vec![
                    (vec![], empty),
                    (vec!["local_head".into(), "local_tail".into()], nonempty),
                ],
            ),
            Some(0),
        )?;
        self.local_ops.insert(key, f.clone());
        Ok(f)
    }
    pub(super) fn pure_local(
        &mut self,
        t: &SemanticTerm,
        op: &str,
        args: &[SemanticTerm],
        env: &BTreeMap<String, Term>,
        bound: &[Term],
        depth: usize,
    ) -> LangResult<Option<Term>> {
        let SemanticSort::Value(ty) = &t.sort else {
            return Ok(None);
        };
        if op == "local:buffer-empty" || op == "local:map-empty" {
            let sort = self.sort(ty)?;
            return Ok(Some(c(id(&sort)?, 0, vec![])));
        }
        if op == "call:buffer" {
            return Ok(Some(self.pure_term(&args[0], env, bound, depth + 1)?));
        }
        if op == "call:buffer_fill" {
            let Type::Buffer(element) = ty else {
                return Err("buffer fill result".into());
            };
            let n = self.pure_term(&args[0], env, bound, depth + 1)?;
            let value = self.pure_term(&args[1], env, bound, depth + 1)?;
            let (fuel, encoded) = self.fuel(n.clone())?;
            let sequence = self.sort(ty)?;
            let datatype = id(&sequence)?.to_string();
            let concat = self.sequence_op(element, "concat")?;
            let value_sort = self.sort(element)?;
            let part = Term::SelfCall(vec![
                v("fill_tail"),
                b("quot", v("fill_span"), Term::U64(2)),
                v("fill_value"),
            ]);
            let doubled = call(&concat, vec![v("fill_part"), v("fill_part")]);
            let pair = self.data(vec![("FillBinding", vec![sequence.clone()])])?;
            let body = |odd: bool| {
                m(
                    c(&pair, 0, vec![part.clone()]),
                    vec![(
                        vec!["fill_part".into()],
                        if odd {
                            c(&datatype, 1, vec![v("fill_value"), doubled.clone()])
                        } else {
                            doubled.clone()
                        },
                    )],
                )
            };
            let nil = c(&datatype, 0, vec![]);
            let f = self.function(
                vec![
                    ("fill_fuel", Sort::Data(fuel)),
                    ("fill_span", Sort::U64),
                    ("fill_value", value_sort),
                ],
                sequence,
                choice(
                    b("==", v("fill_span"), Term::U64(0)),
                    nil.clone(),
                    m(
                        v("fill_fuel"),
                        vec![
                            (vec![], nil),
                            (
                                vec!["fill_bit".into(), "fill_tail".into()],
                                choice(v("fill_bit"), body(true), body(false)),
                            ),
                        ],
                    ),
                ),
                Some(0),
            )?;
            return Ok(Some(call(&f, vec![encoded, n, value])));
        }
        let Some(first) = args.first() else {
            return Ok(None);
        };
        let SemanticSort::Value(receiver) = &first.sort else {
            return Ok(None);
        };
        let name = op
            .strip_prefix("method:")
            .or_else(|| op.strip_prefix("call:"));
        let Some(name) = name else { return Ok(None) };
        if let Type::Map(..) = receiver {
            self.sort(receiver)?;
            let table = self.local_maps
                [&serde_json::to_string(receiver).map_err(|e| e.to_string())?]
                .clone();
            let xs = args
                .iter()
                .map(|a| self.pure_term(a, env, bound, depth + 1))
                .collect::<LangResult<Vec<_>>>()?;
            let result = match name {
                "set" => choice(
                    call(&table.contains, vec![xs[0].clone(), xs[1].clone()]),
                    call(&table.replace, xs.clone()),
                    call(&table.insert, xs),
                ),
                "remove" => call(&table.remove, xs),
                "contains" => call(&table.contains, xs),
                "get_or" => m(
                    call(&table.get, vec![xs[0].clone(), xs[1].clone()]),
                    vec![
                        (vec![], xs[2].clone()),
                        (vec!["local_found".into()], v("local_found")),
                    ],
                ),
                "len" | "keys" | "values" => {
                    let result = self.sort(ty)?;
                    let picked = if name == "keys" {
                        v("local_key")
                    } else {
                        v("local_value")
                    };
                    let empty = if name == "len" {
                        Term::U64(0)
                    } else {
                        c(id(&result)?, 0, vec![])
                    };
                    let recur = Term::SelfCall(vec![v("local_tail")]);
                    let step = if name == "len" {
                        b("&", b("+", Term::U64(1), recur), Term::U64(u32::MAX as u64))
                    } else {
                        c(id(&result)?, 1, vec![picked, recur])
                    };
                    let f = self.function(
                        vec![("local_rows", Sort::Data(table.datatype))],
                        result,
                        m(
                            v("local_rows"),
                            vec![
                                (vec![], empty),
                                (
                                    vec![
                                        "local_key".into(),
                                        "local_value".into(),
                                        "local_tail".into(),
                                    ],
                                    step,
                                ),
                            ],
                        ),
                        Some(0),
                    )?;
                    call(&f, vec![xs[0].clone()])
                }
                _ => return Ok(None),
            };
            return Ok(Some(result));
        }
        let element = match receiver {
            Type::Buffer(x) | Type::List(x) => x.as_ref(),
            _ => return Ok(None),
        };
        if ![
            "len", "length", "freeze", "at_or", "set", "push", "pop", "truncate", "swap", "concat",
        ]
        .contains(&name)
        {
            return Ok(None);
        }
        let xs = args
            .iter()
            .map(|a| self.pure_term(a, env, bound, depth + 1))
            .collect::<LangResult<Vec<_>>>()?;
        let result = match name {
            "freeze" => xs[0].clone(),
            "at_or" => {
                let f = self.sequence_op(element, "get")?;
                m(
                    call(&f, vec![xs[0].clone(), xs[1].clone()]),
                    vec![
                        (vec![], xs[2].clone()),
                        (vec!["local_found".into()], v("local_found")),
                    ],
                )
            }
            "swap" => {
                let get = self.sequence_op(element, "get")?;
                let set = self.sequence_op(element, "set")?;
                let edited = call(
                    &set,
                    vec![
                        call(&set, vec![xs[0].clone(), xs[1].clone(), v("swap_right")]),
                        xs[2].clone(),
                        v("swap_left"),
                    ],
                );
                m(
                    call(&get, vec![xs[0].clone(), xs[1].clone()]),
                    vec![
                        (vec![], xs[0].clone()),
                        (
                            vec!["swap_left".into()],
                            m(
                                call(&get, vec![xs[0].clone(), xs[2].clone()]),
                                vec![(vec![], xs[0].clone()), (vec!["swap_right".into()], edited)],
                            ),
                        ),
                    ],
                )
            }
            _ => {
                let f = self.sequence_op(element, if name == "length" { "len" } else { name })?;
                call(&f, xs)
            }
        };
        Ok(Some(result))
    }
    fn fuel(&mut self, n: Term) -> LangResult<(String, Term)> {
        if self.loop_fuel.is_none() {
            let d = self.data(vec![
                ("FuelZero", vec![]),
                ("FuelDigit", vec![Sort::Bool, Sort::SelfType]),
            ])?;
            let sort = Sort::Data(d.clone());
            let mut bits = c(&d, 0, vec![]);
            for i in (0..32).rev() {
                bits = c(
                    &d,
                    1,
                    vec![
                        b(
                            "!=",
                            b("&", v("fuel_word"), Term::U64(1u64 << i)),
                            Term::U64(0),
                        ),
                        bits,
                    ],
                );
            }
            // Keep a symbolic count symbolic. The structural input guard stops
            // definitional normalisation from enumerating all 2^32 bit cases;
            // concrete execution still parses only its selected branches.
            let seed = self.data(vec![
                ("CountZero", vec![]),
                ("CountNonZero", vec![Sort::U64]),
            ])?;
            let wrapper = self.function(
                vec![("fuel_input", Sort::Data(seed.clone()))],
                sort,
                m(
                    v("fuel_input"),
                    vec![(vec![], c(&d, 0, vec![])), (vec!["fuel_word".into()], bits)],
                ),
                Some(0),
            )?;
            self.loop_fuel = Some((d, wrapper, seed));
        }
        let (d, f, seed) = self.loop_fuel.as_ref().unwrap();
        if let Term::U64(word) = n {
            let mut bits = c(d, 0, vec![]);
            for i in (0..(64 - word.leading_zeros())).rev() {
                bits = c(d, 1, vec![Term::Bool(word & (1 << i) != 0), bits]);
            }
            return Ok((d.clone(), bits));
        }
        let input = choice(
            b("==", n.clone(), Term::U64(0)),
            c(seed, 0, vec![]),
            c(seed, 1, vec![n]),
        );
        Ok((d.clone(), call(f, vec![input])))
    }

    pub(super) fn pure_loop(
        &mut self,
        t: &SemanticTerm,
        op: &str,
        args: &[SemanticTerm],
        env: &BTreeMap<String, Term>,
        bound: &[Term],
        depth: usize,
    ) -> LangResult<Term> {
        let SemanticSort::Value(ty) = &t.sort else {
            return Err("loop result sort".into());
        };
        let state_sort = self.sort(ty)?;
        let n = if let Node::Nat(n) = args[0].node {
            Term::U64(n)
        } else {
            self.pure_term(&args[0], env, bound, depth + 1)?
        };
        let (fuel, encoded) = self.fuel(n.clone())?;
        let initial = self.pure_term(&args[1], env, bound, depth + 1)?;
        let step = &args[if op == "call:repeat" { 2 } else { 3 }];
        let predicate = if op == "call:repeat_until" {
            Some(&args[2])
        } else {
            None
        };
        // Capture the checked lexical environment with explicit first-order
        // parameters. No owned accumulator escapes its invocation.
        let mut params: Vec<(String, Sort)> = vec![
            ("loop_fuel".into(), Sort::Data(fuel)),
            ("loop_span".into(), Sort::U64),
            ("loop_index".into(), Sort::U64),
            ("loop_state".into(), state_sort.clone()),
        ];
        let mut actual = vec![encoded, n, Term::U64(0), initial];
        let mut recur_args = vec![];
        let mut local_env = BTreeMap::new();
        let mut local_bound = bound.to_vec();
        fn free(
            t: &SemanticTerm,
            depth: usize,
            names: &mut BTreeMap<String, Type>,
            slots: &mut BTreeMap<usize, Type>,
        ) {
            match &t.node {
                Node::Free(n) => {
                    if let SemanticSort::Value(t) = &t.sort {
                        names.insert(n.clone(), t.clone());
                    }
                }
                Node::Bound(i) if *i >= depth => {
                    if let SemanticSort::Value(t) = &t.sort {
                        slots.insert(i - depth, t.clone());
                    }
                }
                Node::Lambda(x) => free(x, depth + 1, names, slots),
                Node::Op(_, xs) => {
                    for x in xs {
                        free(x, depth, names, slots)
                    }
                }
                Node::Cons(a, z) => {
                    free(a, depth, names, slots);
                    free(z, depth, names, slots);
                }
                _ => {}
            }
        }
        let mut names = BTreeMap::new();
        let mut slots = BTreeMap::new();
        free(step, 0, &mut names, &mut slots);
        if let Some(p) = predicate {
            free(p, 0, &mut names, &mut slots)
        }
        for (name, ty) in names {
            let n = self.fresh();
            params.push((n.clone(), self.sort(&ty)?));
            actual.push(env.get(&name).cloned().ok_or("loop free capture")?);
            recur_args.push(v(&n));
            local_env.insert(name, v(&n));
        }
        for (i, ty) in slots {
            let at = bound.len().checked_sub(i + 1).ok_or("loop bound capture")?;
            let n = self.fresh();
            params.push((n.clone(), self.sort(&ty)?));
            actual.push(bound[at].clone());
            recur_args.push(v(&n));
            local_bound[at] = v(&n);
        }
        let done = |this: &mut Self, s: Term| -> LangResult<Term> {
            if let Some(predicate) = predicate {
                let Node::Lambda(body) = &predicate.node else {
                    return Err("loop predicate lambda".into());
                };
                let mut bs = local_bound.clone();
                bs.push(s);
                this.pure_term(body, &local_env, &bs, depth + 1)
            } else {
                Ok(Term::Bool(false))
            }
        };
        let half = b("quot", v("loop_span"), Term::U64(2));
        let increment = |a, z| b("&", b("+", a, z), Term::U64(u32::MAX as u64));
        let rec = |i, s| {
            let mut xs = vec![v("loop_tail"), half.clone(), i, s];
            xs.extend(recur_args.clone());
            Term::SelfCall(xs)
        };
        let twice = rec(
            increment(v("loop_index"), half.clone()),
            rec(v("loop_index"), v("loop_state")),
        );
        let Node::Lambda(step) = &step.node else {
            return Err("loop index lambda".into());
        };
        let Node::Lambda(step) = &step.node else {
            return Err("loop state lambda".into());
        };
        let odd = self.bind(state_sort.clone(), twice.clone(), |this, s| {
            let mut bs = local_bound.clone();
            bs.push(increment(
                v("loop_index"),
                b("*", half.clone(), Term::U64(2)),
            ));
            bs.push(s.clone());
            let body = this.pure_term(step, &local_env, &bs, depth + 1)?;
            Ok(choice(done(this, s.clone())?, s, body))
        })?;
        let stopped = choice(
            b("==", v("loop_span"), Term::U64(0)),
            Term::Bool(true),
            done(self, v("loop_state"))?,
        );
        let body = choice(
            stopped,
            v("loop_state"),
            m(
                v("loop_fuel"),
                vec![
                    (vec![], v("loop_state")),
                    (
                        vec!["loop_bit".into(), "loop_tail".into()],
                        choice(v("loop_bit"), odd, twice),
                    ),
                ],
            ),
        );
        let f = self.store(Declaration::Function {
            params,
            result: state_sort,
            body,
            recursive: Some(0),
        })?;
        Ok(call(&f, actual))
    }
}
