//! Fixed exact-integer correspondence using binary inductive magnitudes.
//! Arithmetic is ordinary terminating definition data, not a kernel axiom.
use super::*;
#[derive(Clone)]
pub(super) struct Integer {
    pub natural: String,
    pub value: String,
    pub operations: BTreeMap<String, String>,
    pub negate: String,
}
impl Lower<'_> {
    pub(super) fn integer(&mut self) -> LangResult<Integer> {
        if let Some(i) = &self.integer {
            return Ok(i.clone());
        }
        let nat = self.data(vec![
            ("BinaryZero", vec![]),
            ("BinaryEven", vec![Sort::SelfType]),
            ("BinaryOdd", vec![Sort::SelfType]),
        ])?;
        let ns = Sort::Data(nat.clone());
        let z = c(&nat, 0, vec![]);
        let odd = |x| c(&nat, 2, vec![x]);
        let even = self.function(
            vec![("n", ns.clone())],
            ns.clone(),
            m(
                v("n"),
                vec![
                    (vec![], z.clone()),
                    (vec!["tail_even".into()], c(&nat, 1, vec![v("n")])),
                    (vec!["tail_odd".into()], c(&nat, 1, vec![v("n")])),
                ],
            ),
            Some(0),
        )?;
        let ev = |x| call(&even, vec![x]);
        let succ = self.function(
            vec![("n", ns.clone())],
            ns.clone(),
            m(
                v("n"),
                vec![
                    (vec![], odd(z.clone())),
                    (vec!["even_tail".into()], odd(v("even_tail"))),
                    (
                        vec!["odd_tail".into()],
                        ev(Term::SelfCall(vec![v("odd_tail")])),
                    ),
                ],
            ),
            Some(0),
        )?;
        let pred = self.function(
            vec![("n", ns.clone())],
            ns.clone(),
            m(
                v("n"),
                vec![
                    (vec![], z.clone()),
                    (
                        vec!["even_tail".into()],
                        odd(Term::SelfCall(vec![v("even_tail")])),
                    ),
                    (vec!["odd_tail".into()], ev(v("odd_tail"))),
                ],
            ),
            Some(0),
        )?;
        let add = self.function(
            vec![("a", ns.clone()), ("b", ns.clone())],
            ns.clone(),
            m(
                v("a"),
                vec![
                    (vec![], v("b")),
                    (
                        vec!["a_even".into()],
                        m(
                            v("b"),
                            vec![
                                (vec![], v("a")),
                                (
                                    vec!["b_even".into()],
                                    ev(Term::SelfCall(vec![v("a_even"), v("b_even")])),
                                ),
                                (
                                    vec!["b_odd".into()],
                                    odd(Term::SelfCall(vec![v("a_even"), v("b_odd")])),
                                ),
                            ],
                        ),
                    ),
                    (
                        vec!["a_odd".into()],
                        m(
                            v("b"),
                            vec![
                                (vec![], v("a")),
                                (
                                    vec!["b_even".into()],
                                    odd(Term::SelfCall(vec![v("a_odd"), v("b_even")])),
                                ),
                                (
                                    vec!["b_odd".into()],
                                    ev(call(
                                        &succ,
                                        vec![Term::SelfCall(vec![v("a_odd"), v("b_odd")])],
                                    )),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let order_box = self.data(vec![("NaturalCompareResult", vec![Sort::U64])])?;
        let cmp_tail = |a: &str, b0: &str, low: u64| {
            let tail = Term::SelfCall(vec![v(a), v(b0)]);
            m(
                c(&order_box, 0, vec![tail]),
                vec![(
                    vec!["tail_order".into()],
                    choice(
                        b("==", v("tail_order"), Term::U64(1)),
                        Term::U64(low),
                        v("tail_order"),
                    ),
                )],
            )
        };
        let compare = self.function(
            vec![("a", ns.clone()), ("b", ns.clone())],
            Sort::U64,
            m(
                v("a"),
                vec![
                    (
                        vec![],
                        m(
                            v("b"),
                            vec![
                                (vec![], Term::U64(1)),
                                (vec!["b_even".into()], Term::U64(0)),
                                (vec!["b_odd".into()], Term::U64(0)),
                            ],
                        ),
                    ),
                    (
                        vec!["a_even".into()],
                        m(
                            v("b"),
                            vec![
                                (vec![], Term::U64(2)),
                                (vec!["b_even".into()], cmp_tail("a_even", "b_even", 1)),
                                (vec!["b_odd".into()], cmp_tail("a_even", "b_odd", 0)),
                            ],
                        ),
                    ),
                    (
                        vec!["a_odd".into()],
                        m(
                            v("b"),
                            vec![
                                (vec![], Term::U64(2)),
                                (vec!["b_even".into()], cmp_tail("a_odd", "b_even", 2)),
                                (vec!["b_odd".into()], cmp_tail("a_odd", "b_odd", 1)),
                            ],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let subtract = self.function(
            vec![("a", ns.clone()), ("b", ns.clone())],
            ns.clone(),
            choice(
                b("<", call(&compare, vec![v("a"), v("b")]), Term::U64(1)),
                z.clone(),
                m(
                    v("a"),
                    vec![
                        (vec![], z.clone()),
                        (
                            vec!["a_even".into()],
                            m(
                                v("b"),
                                vec![
                                    (vec![], v("a")),
                                    (
                                        vec!["b_even".into()],
                                        ev(Term::SelfCall(vec![v("a_even"), v("b_even")])),
                                    ),
                                    (
                                        vec!["b_odd".into()],
                                        odd(call(
                                            &pred,
                                            vec![Term::SelfCall(vec![v("a_even"), v("b_odd")])],
                                        )),
                                    ),
                                ],
                            ),
                        ),
                        (
                            vec!["a_odd".into()],
                            m(
                                v("b"),
                                vec![
                                    (vec![], v("a")),
                                    (
                                        vec!["b_even".into()],
                                        odd(Term::SelfCall(vec![v("a_odd"), v("b_even")])),
                                    ),
                                    (
                                        vec!["b_odd".into()],
                                        ev(Term::SelfCall(vec![v("a_odd"), v("b_odd")])),
                                    ),
                                ],
                            ),
                        ),
                    ],
                ),
            ),
            Some(0),
        )?;
        let multiply = self.function(
            vec![("a", ns.clone()), ("b", ns.clone())],
            ns.clone(),
            m(
                v("a"),
                vec![
                    (vec![], z.clone()),
                    (
                        vec!["a_even".into()],
                        ev(Term::SelfCall(vec![v("a_even"), v("b")])),
                    ),
                    (
                        vec!["a_odd".into()],
                        call(
                            &add,
                            vec![v("b"), ev(Term::SelfCall(vec![v("a_odd"), v("b")]))],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let value = self.data(vec![
            ("BinaryIntegerZero", vec![]),
            ("BinaryIntegerPositive", vec![ns.clone()]),
            ("BinaryIntegerNegative", vec![ns.clone()]),
        ])?;
        let is = Sort::Data(value.clone());
        let iz = c(&value, 0, vec![]);
        let mut signs = Vec::new();
        for sign in [1, 2] {
            signs.push(self.function(
                vec![("magnitude", ns.clone())],
                is.clone(),
                m(
                    v("magnitude"),
                    vec![
                        (vec![], iz.clone()),
                        (
                            vec!["magnitude_even".into()],
                            c(&value, sign, vec![v("magnitude")]),
                        ),
                        (
                            vec!["magnitude_odd".into()],
                            c(&value, sign, vec![v("magnitude")]),
                        ),
                    ],
                ),
                Some(0),
            )?);
        }
        let signed = |sign: usize, n| call(&signs[sign - 1], vec![n]);
        let negate = self.function(
            vec![("integer", is.clone())],
            is.clone(),
            m(
                v("integer"),
                vec![
                    (vec![], iz.clone()),
                    (vec!["positive".into()], signed(2, v("positive"))),
                    (vec!["negative".into()], signed(1, v("negative"))),
                ],
            ),
            Some(0),
        )?;
        let mut acases = vec![(vec![], v("right"))];
        let mut mcases = vec![(vec![], iz.clone())];
        let mut ccases = vec![(
            vec![],
            m(
                v("right"),
                vec![
                    (vec![], Term::U64(1)),
                    (vec!["positive_right".into()], Term::U64(0)),
                    (vec!["negative_right".into()], Term::U64(2)),
                ],
            ),
        )];
        for left_sign in [1usize, 2] {
            let ln = format!("left_magnitude_{left_sign}");
            let mut plus = vec![(vec![], v("left"))];
            let mut times = vec![(vec![], iz.clone())];
            let mut comparisons = vec![(vec![], Term::U64(if left_sign == 1 { 2 } else { 0 }))];
            for right_sign in [1usize, 2] {
                let rn = format!("right_magnitude_{right_sign}");
                let args = vec![v(&ln), v(&rn)];
                let cmp = call(&compare, args.clone());
                plus.push((
                    vec![rn.clone()],
                    if left_sign == right_sign {
                        signed(left_sign, call(&add, args.clone()))
                    } else {
                        choice(
                            b("<", cmp.clone(), Term::U64(1)),
                            signed(right_sign, call(&subtract, vec![v(&rn), v(&ln)])),
                            signed(left_sign, call(&subtract, args.clone())),
                        )
                    },
                ));
                times.push((
                    vec![rn.clone()],
                    signed(
                        if left_sign == right_sign { 1 } else { 2 },
                        call(&multiply, args),
                    ),
                ));
                comparisons.push((
                    vec![rn],
                    if left_sign != right_sign {
                        Term::U64(if left_sign == 1 { 2 } else { 0 })
                    } else if left_sign == 1 {
                        cmp
                    } else {
                        call(
                            &compare,
                            vec![v(&format!("right_magnitude_{right_sign}")), v(&ln)],
                        )
                    },
                ));
            }
            acases.push((vec![ln.clone()], m(v("right"), plus)));
            mcases.push((vec![ln.clone()], m(v("right"), times)));
            ccases.push((vec![ln], m(v("right"), comparisons)));
        }
        let params = vec![("left", is.clone()), ("right", is.clone())];
        let addition = self.function(params.clone(), is.clone(), m(v("left"), acases), Some(0))?;
        let mul = self.function(params.clone(), is.clone(), m(v("left"), mcases), Some(0))?;
        let comparison = self.function(params.clone(), Sort::U64, m(v("left"), ccases), Some(0))?;
        let sub = self.function(
            params.clone(),
            is.clone(),
            call(&addition, vec![v("left"), call(&negate, vec![v("right")])]),
            Some(0),
        )?;
        let mut operations =
            BTreeMap::from([("+".into(), addition), ("-".into(), sub), ("*".into(), mul)]);
        for (op, relation, n) in [
            ("==", "==", 1),
            ("!=", "!=", 1),
            ("<", "==", 0),
            ("<=", "!=", 2),
            (">", "==", 2),
            (">=", "!=", 0),
        ] {
            let f = self.function(
                params.clone(),
                Sort::Bool,
                b(
                    relation,
                    call(&comparison, vec![v("left"), v("right")]),
                    Term::U64(n),
                ),
                Some(0),
            )?;
            operations.insert(op.into(), f);
        }
        let result = Integer {
            natural: nat,
            value,
            operations,
            negate,
        };
        self.integer = Some(result.clone());
        Ok(result)
    }
    pub(super) fn integer_literal(&mut self, n: u64) -> LangResult<Term> {
        let i = self.integer()?;
        let mut tail = c(&i.natural, 0, vec![]);
        let bits = 64 - n.leading_zeros();
        for bit in (0..bits).rev() {
            tail = c(
                &i.natural,
                if n & (1 << bit) == 0 { 1 } else { 2 },
                vec![tail],
            );
        }
        Ok(if n == 0 {
            c(&i.value, 0, vec![])
        } else {
            c(&i.value, 1, vec![tail])
        })
    }
    pub(super) fn division(
        &mut self,
        ty: &Type,
        name: &str,
        a: Term,
        z: Term,
        fallback: Term,
    ) -> LangResult<Term> {
        if !matches!(ty, Type::U64 | Type::U32 | Type::I32) {
            return Err("division source sort".into());
        }
        let op = if name == "quot_or" { "quot" } else { "rem" };
        let zero = b("==", z.clone(), Term::U64(0));
        let result = if *ty == Type::I32 {
            let mask = |x| b("&", x, Term::U64(u32::MAX as u64));
            let an = b(">=", a.clone(), Term::U64(1 << 31));
            let zn = b(">=", z.clone(), Term::U64(1 << 31));
            let abs = |x: Term, n: Term| choice(n, mask(b("-", Term::U64(0), x.clone())), x);
            let raw = b(op, abs(a.clone(), an.clone()), abs(z.clone(), zn.clone()));
            let negative = if name == "quot_or" {
                b("!=", an, zn)
            } else {
                an
            };
            choice(negative, mask(b("-", Term::U64(0), raw.clone())), raw)
        } else {
            b(op, a.clone(), z.clone())
        };
        let invalid = if *ty == Type::I32 {
            choice(
                b("==", a, Term::U64(1 << 31)),
                choice(
                    b("==", z, Term::U64(u32::MAX as u64)),
                    Term::Bool(true),
                    zero.clone(),
                ),
                zero,
            )
        } else {
            zero
        };
        Ok(choice(invalid, fallback, result))
    }
    pub(super) fn operator(
        &mut self,
        ty: &Type,
        op: &str,
        lhs: Term,
        rhs: Term,
    ) -> LangResult<Term> {
        match ty {
            Type::U64 | Type::Bool => Ok(b(op, lhs, rhs)),
            Type::F32 => Ok(b(&format!("f32:{op}"), lhs, rhs)),
            Type::Vector(t, n) => self.vector_operator(t, *n, op, lhs, rhs),
            Type::U32 | Type::I32 => {
                let mask = |x| b("&", x, Term::U64(u32::MAX as u64));
                Ok(if ["+", "-", "*"].contains(&op) {
                    mask(b(op, lhs, rhs))
                } else if *ty == Type::I32 && ["<", "<=", ">", ">="].contains(&op) {
                    b(
                        op,
                        mask(b("+", lhs, Term::U64(1 << 31))),
                        mask(b("+", rhs, Term::U64(1 << 31))),
                    )
                } else {
                    b(op, lhs, rhs)
                })
            }
            Type::Int => {
                let i = self.integer()?;
                let f = i
                    .operations
                    .get(op)
                    .ok_or("unsupported exact integer operator")?;
                Ok(call(f, vec![lhs, rhs]))
            }
            _ if op == "==" || op == "!=" => {
                let s = self.sort(ty)?;
                let equal = self.stored_equality(&s, lhs, rhs)?;
                Ok(if op == "==" {
                    equal
                } else {
                    choice(equal, Term::Bool(false), Term::Bool(true))
                })
            }
            _ => Err("unsupported numerical operator correspondence".into()),
        }
    }
}
