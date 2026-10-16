//! Bounded structural conversion for the existing total first-order calculus.
//! No equations, recognizers, proof verdict cache or new primitive meanings.
use super::*;

pub(super) fn same(a: &Term, b: &Term, c: &Context, budget: &mut Budget) -> LangResult<bool> {
    budget.step(0)?;
    let allowance = (budget.remaining / 4).min(32_768);
    if allowance == 0 {
        return Ok(false);
    }
    let mut speculative = Budget::new();
    speculative.remaining = allowance;
    let result = compare(a, b, c, &mut speculative, &mut 4096, 0);
    budget.remaining -= allowance - speculative.remaining;
    match result {
        // A speculative reduction may reach the existing depth limit before
        // another strategy does. Retain its charged work and try the ordinary
        // strategies from their own root; an exhausted work budget still fails.
        Err(error) if error == "inductive logic resource limit" && budget.remaining > 0 => {
            Ok(false)
        }
        result => result,
    }
}

fn compare(
    a: &Term,
    b: &Term,
    c: &Context,
    budget: &mut Budget,
    remaining: &mut usize,
    depth: usize,
) -> LangResult<bool> {
    if *remaining == 0 || depth > 64 {
        return Ok(false);
    }
    *remaining -= 1;
    budget.step(depth)?;
    if a == b {
        return Ok(true);
    }
    let mut pairs: Vec<(&Term, &Term)> = vec![];
    let compatible = match (a, b) {
        (
            Term::Construct {
                datatype: ad,
                constructor: ac,
                arguments: aa,
            },
            Term::Construct {
                datatype: bd,
                constructor: bc,
                arguments: ba,
            },
        ) if ad == bd && ac == bc && aa.len() == ba.len() => {
            pairs.extend(aa.iter().zip(ba));
            true
        }
        (
            Term::Call {
                function: af,
                arguments: aa,
            },
            Term::Call {
                function: bf,
                arguments: ba,
            },
        ) if af == bf && aa.len() == ba.len() => {
            pairs.extend(aa.iter().zip(ba));
            true
        }
        (
            Term::Binary {
                op: ao,
                left: al,
                right: ar,
            },
            Term::Binary {
                op: bo,
                left: bl,
                right: br,
            },
        ) if ao == bo => {
            pairs.extend([(al.as_ref(), bl.as_ref()), (ar.as_ref(), br.as_ref())]);
            true
        }
        (
            Term::If {
                condition: ac,
                on_true: at,
                on_false: af,
            },
            Term::If {
                condition: bc,
                on_true: bt,
                on_false: bf,
            },
        ) => {
            pairs.extend([
                (ac.as_ref(), bc.as_ref()),
                (at.as_ref(), bt.as_ref()),
                (af.as_ref(), bf.as_ref()),
            ]);
            true
        }
        (
            Term::Match {
                scrutinee: a,
                branches: aa,
            },
            Term::Match {
                scrutinee: b,
                branches: ba,
            },
        ) if aa.len() == ba.len()
            && aa
                .iter()
                .zip(ba)
                .all(|(a, b)| a.bindings.len() == b.bindings.len()) =>
        {
            let mut equal = compare(a, b, c, budget, remaining, depth + 1)?;
            for (left, right) in aa.iter().zip(ba) {
                if !equal {
                    break;
                }
                if left.bindings == right.bindings {
                    equal = compare(&left.body, &right.body, c, budget, remaining, depth + 1)?;
                } else {
                    // Align only these local binders. Avoid *all* names on
                    // both sides, including free names bound by an enclosing
                    // comparison. Whole-tree numbering depends on scrutinee
                    // syntax and cannot align these corresponding scopes.
                    let mut occupied = BTreeSet::new();
                    names(&left.body, &mut occupied, budget, depth + 1)?;
                    names(&right.body, &mut occupied, budget, depth + 1)?;
                    let mut lb = BTreeMap::new();
                    let mut rb = BTreeMap::new();
                    let mut serial = 0;
                    for (ln, rn) in left.bindings.iter().zip(&right.bindings) {
                        let fresh = loop {
                            budget.step(depth + 1)?;
                            let name = format!("$s{serial}");
                            serial += 1;
                            if occupied.insert(name.clone()) {
                                break name;
                            }
                        };
                        lb.insert(ln.clone(), Term::Var(fresh.clone()));
                        rb.insert(rn.clone(), Term::Var(fresh));
                    }
                    let left = substitute(&left.body, &lb, budget, depth + 1)?;
                    let right = substitute(&right.body, &rb, budget, depth + 1)?;
                    equal = compare(&left, &right, c, budget, remaining, depth + 1)?;
                }
            }
            if equal {
                return Ok(true);
            }
            false
        }
        _ => false,
    };
    if compatible {
        let mut equal = true;
        for (a, b) in pairs {
            if !compare(a, b, c, budget, remaining, depth + 1)? {
                equal = false;
                break;
            }
        }
        if equal {
            return Ok(true);
        }
    }
    // A definition body may contain an expensive continuation that appears
    // verbatim on the other side. Check a single gated delta step before
    // searching through that continuation or advancing both sides together.
    // This uses the existing reduction and lexical alpha comparison only.
    for (source, target) in [(a, b), (b, a)] {
        if direct_reduction(source, target, c, budget, depth + 1)? {
            return Ok(true);
        }
    }
    // A reusable continuation is deliberately left as a call on one side.
    // Advancing both sides immediately can unfold that continuation before the
    // other side reaches it. Try a bounded, iterative head reduction toward
    // its exact call identity first. This is ordinary definitional computation;
    // the identity only stops search, and every argument is still compared.
    // Charge the existing speculative budget rather than expanding its limits.
    for (source, target) in [(a, b), (b, a)] {
        if let Term::Call { function, .. } = target {
            if !matches!(source, Term::Call {function: name, ..} if name == function) {
                if let Some(exposed) = seek_call(source, function, c, budget, remaining, depth + 1)?
                {
                    if compare(&exposed, target, c, budget, remaining, depth + 1)? {
                        return Ok(true);
                    }
                }
            }
        }
    }
    // One fixed reduction at each side can expose matching structure without
    // evaluating unrelated fields, arms or arguments. Typing and termination
    // of all definitions have already been checked by Context.
    let left = step(a, c, budget, depth + 1)?;
    let right = step(b, c, budget, depth + 1)?;
    if left.is_none() && right.is_none() {
        return Ok(false);
    }
    compare(
        left.as_ref().unwrap_or(a),
        right.as_ref().unwrap_or(b),
        c,
        budget,
        remaining,
        depth + 1,
    )
}

fn direct_reduction(
    source: &Term,
    target: &Term,
    c: &Context,
    budget: &mut Budget,
    depth: usize,
) -> LangResult<bool> {
    if !matches!(
        source,
        Term::Call { .. } | Term::Match { .. } | Term::If { .. } | Term::Binary { .. }
    ) {
        return Ok(false);
    }
    let allowance = budget.remaining.min(4096);
    if allowance == 0 {
        return Ok(false);
    }
    let mut lookahead = Budget::new();
    lookahead.remaining = allowance;
    let result = (|| {
        let Some(body) = step(source, c, &mut lookahead, depth)? else {
            return Ok(false);
        };
        if &body == target {
            return Ok(true);
        }
        lookahead.copy(target)?;
        Ok(alpha_normal_impl(body, &mut lookahead, true)?
            == alpha_normal_impl(target.clone(), &mut lookahead, true)?)
    })();
    budget.remaining -= allowance - lookahead.remaining;
    match result {
        Err(error) if error == "inductive logic resource limit" && budget.remaining > 0 => {
            Ok(false)
        }
        result => result,
    }
}

fn seek_call(
    source: &Term,
    function: &str,
    c: &Context,
    budget: &mut Budget,
    remaining: &mut usize,
    depth: usize,
) -> LangResult<Option<Term>> {
    let mut value = None;
    for _ in 0..16 {
        if *remaining == 0 {
            break;
        }
        *remaining -= 1;
        let Some(next) = step(value.as_ref().unwrap_or(source), c, budget, depth)? else {
            break;
        };
        if matches!(&next, Term::Call {function: name, ..} if name == function) {
            return Ok(Some(next));
        }
        value = Some(next);
    }
    Ok(None)
}

fn step(t: &Term, c: &Context, budget: &mut Budget, depth: usize) -> LangResult<Option<Term>> {
    budget.step(depth)?;
    Ok(match t {
        Term::Call {
            function,
            arguments,
        } => {
            let Kind::Function(f) = &c.entry(function, true)?.kind else {
                return Ok(None);
            };
            let mut args = Vec::with_capacity(arguments.len());
            for value in arguments {
                budget.copy(value)?;
                let mut value = value.clone();
                let mut at = depth + 1;
                // Discard only closed control before a binder can duplicate
                // it. Arithmetic and constructor fields remain untouched.
                // This avoids expanding all arms of each earlier step inside
                // a later step of a known traversal.
                while matches!(value, Term::If { .. } | Term::Match { .. }) {
                    let Some(reduced) = step(&value, c, budget, at)? else {
                        break;
                    };
                    value = reduced;
                    at += 1;
                }
                args.push(value);
            }
            if let Some(i) = f.recursive {
                args[i] = head(&args[i], c, budget, depth + 1)?;
                if !matches!(args[i], Term::Construct { .. }) {
                    return Ok(None);
                }
            }
            let bindings = f.params.iter().map(|p| p.0.clone()).zip(args).collect();
            Some(substitute(&f.body, &bindings, budget, depth + 1)?)
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            let value = head(scrutinee, c, budget, depth + 1)?;
            if let Term::Construct {
                constructor,
                arguments,
                ..
            } = value
            {
                let branch = branches
                    .get(constructor)
                    .ok_or("unknown match constructor")?;
                let bindings = branch.bindings.iter().cloned().zip(arguments).collect();
                Some(substitute(&branch.body, &bindings, budget, depth + 1)?)
            } else {
                None
            }
        }
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            // A dynamic arithmetic predicate may contain a large shared
            // primal. Structural comparison handles it without evaluating
            // every copy just to discover that its condition is unknown.
            let mut pending = vec![condition.as_ref()];
            while let Some(term) = pending.pop() {
                budget.step(depth)?;
                if matches!(term, Term::Var(_)) {
                    return Ok(None);
                }
                pending.extend(term_children(term));
            }
            match head(condition, c, budget, depth + 1)? {
                Term::Bool(value) => {
                    let selected = if value { on_true } else { on_false };
                    budget.copy(selected)?;
                    Some((**selected).clone())
                }
                _ => None,
            }
        }
        Term::Binary { left, right, .. }
            if matches!(left.as_ref(), Term::Bool(_) | Term::U64(_))
                && matches!(right.as_ref(), Term::Bool(_) | Term::U64(_)) =>
        {
            Some(normal(t, c, budget, depth + 1)?)
        }
        _ => None,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    fn v(name: &str) -> Term {
        Term::Var(name.into())
    }
    fn call(name: &str, arguments: Vec<Term>) -> Term {
        Term::Call {
            function: name.into(),
            arguments,
        }
    }
    fn cons(constructor: usize, arguments: Vec<Term>) -> Term {
        Term::Construct {
            datatype: "rows".into(),
            constructor,
            arguments,
        }
    }
    fn plus(a: Term, b: Term) -> Term {
        Term::Binary {
            op: "f32:+".into(),
            left: Box::new(a),
            right: Box::new(b),
        }
    }
    fn context() -> Context {
        let mut c = Context::default();
        c.declare(
            "rows".into(),
            &Declaration::Datatype {
                constructors: vec![
                    Constructor {
                        name: "Nil".into(),
                        fields: vec![],
                    },
                    Constructor {
                        name: "Cons".into(),
                        fields: vec![Sort::U64, Sort::SelfType],
                    },
                ],
            },
        )
        .unwrap();
        c.declare(
            "fold".into(),
            &Declaration::Function {
                params: vec![
                    ("rows".into(), Sort::Data("rows".into())),
                    ("initial".into(), Sort::U64),
                ],
                result: Sort::U64,
                recursive: Some(0),
                body: Term::Match {
                    scrutinee: Box::new(v("rows")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: v("initial"),
                        },
                        Branch {
                            bindings: vec!["head".into(), "tail".into()],
                            body: Term::SelfCall(vec![v("tail"), plus(v("initial"), v("head"))]),
                        },
                    ],
                },
            },
        )
        .unwrap();
        c
    }
    fn check(c: &Context, params: &[(String, Sort)], a: &Term, b: &Term) -> LangResult<()> {
        c.check(
            params,
            &[],
            a,
            b,
            &Proof::Convert {
                from: a.clone(),
                to: b.clone(),
            },
        )
    }

    #[test]
    fn ordered_recursive_steps_match_structure_without_normalizing_shared_primals() {
        let c = context();
        let bits = [
            0x4b800000, 0x3f800000, 0xcb800000, 0x80000000, 1, 0x7fa01234,
        ];
        let mut rows = cons(0, vec![]);
        let mut result = v("input");
        for i in (0..20).rev() {
            rows = cons(1, vec![Term::U64(bits[i % bits.len()]), rows]);
        }
        for i in 0..20 {
            result = plus(result, Term::U64(bits[i % bits.len()]));
        }
        let original = call("fold", vec![rows, v("input")]);
        assert!(same(&original, &result, &c, &mut Budget::new()).unwrap());
        let params = vec![("input".into(), Sort::U64)];
        check(&c, &params, &original, &result).unwrap();
        let wrong = plus(result.clone(), Term::U64(0));
        // Even adding +0 can change signed zero or a signalling NaN payload.
        assert!(check(&c, &params, &original, &wrong).is_err());
        assert!(check(&c, &params, &plus(v("input"), v("input")), &v("input")).is_err());
        let nan_eq = Term::Binary {
            op: "f32:==".into(),
            left: Box::new(Term::U64(0x7fa01234)),
            right: Box::new(Term::U64(0x7fa01234)),
        };
        check(&c, &[], &nan_eq, &Term::Bool(false)).unwrap();
        assert!(check(&c, &[], &nan_eq, &Term::Bool(true)).is_err());
    }

    #[test]
    fn helper_chunks_reach_the_same_continuation_without_expanding_its_body() {
        let mut c = context();
        c.declare(
            "slot".into(),
            &Declaration::Datatype {
                constructors: vec![Constructor {
                    name: "Slot".into(),
                    fields: vec![Sort::U64],
                }],
            },
        )
        .unwrap();
        // The continuation is intentionally much larger than the small chunk.
        // A comparison must leave it reusable instead of normalizing its work.
        let mut tail = v("input");
        for i in 0..24 {
            tail = plus(tail.clone(), tail);
            // Keep the definition DAG explicit rather than serializing a
            // duplicated primal in one giant input term.
            let name = format!("tail_{i}");
            c.declare(
                name.clone(),
                &Declaration::Function {
                    params: vec![("input".into(), Sort::U64)],
                    result: Sort::U64,
                    body: tail,
                    recursive: None,
                },
            )
            .unwrap();
            tail = call(&name, vec![v("input")]);
        }
        let mut body = substitute(
            &tail,
            &BTreeMap::from([("input".into(), v("local_7"))]),
            &mut Budget::new(),
            0,
        )
        .unwrap();
        let mut result = v("input");
        for _ in 0..8 {
            result = plus(result, Term::U64(0x3f800000));
        }
        for i in (0..8).rev() {
            let name = format!("local_{i}");
            let previous = if i == 0 {
                "input".into()
            } else {
                format!("local_{}", i - 1)
            };
            body = Term::Match {
                scrutinee: Box::new(Term::Construct {
                    datatype: "slot".into(),
                    constructor: 0,
                    arguments: vec![plus(v(&previous), Term::U64(0x3f800000))],
                }),
                branches: vec![Branch {
                    bindings: vec![name],
                    body,
                }],
            };
        }
        c.declare(
            "chunk".into(),
            &Declaration::Function {
                params: vec![("input".into(), Sort::U64)],
                result: Sort::U64,
                body,
                recursive: None,
            },
        )
        .unwrap();
        let target = substitute(
            &tail,
            &BTreeMap::from([("input".into(), result)]),
            &mut Budget::new(),
            0,
        )
        .unwrap();
        let mut budget = Budget::new();
        let start = budget.remaining;
        assert!(same(&call("chunk", vec![v("input")]), &target, &c, &mut budget).unwrap());
        assert!(
            start - budget.remaining < 4096,
            "comparison expanded a reusable continuation"
        );
        check(
            &c,
            &[("input".into(), Sort::U64)],
            &call("chunk", vec![v("input")]),
            &target,
        )
        .unwrap();
    }

    #[test]
    fn conversion_preserves_capture_avoidance_and_unvisited_arms() {
        let mut c = context();
        c.declare(
            "head_or".into(),
            &Declaration::Function {
                params: vec![
                    ("rows".into(), Sort::Data("rows".into())),
                    ("fallback".into(), Sort::U64),
                ],
                result: Sort::U64,
                recursive: None,
                body: Term::Match {
                    scrutinee: Box::new(v("rows")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: v("fallback"),
                        },
                        Branch {
                            bindings: vec!["head".into(), "tail".into()],
                            body: v("head"),
                        },
                    ],
                },
            },
        )
        .unwrap();
        let original = call("head_or", vec![v("data"), v("head")]);
        let target = Term::Match {
            scrutinee: Box::new(v("data")),
            branches: vec![
                Branch {
                    bindings: vec![],
                    body: v("head"),
                },
                Branch {
                    bindings: vec!["item".into(), "rest".into()],
                    body: v("item"),
                },
            ],
        };
        let params = vec![
            ("data".into(), Sort::Data("rows".into())),
            ("head".into(), Sort::U64),
        ];
        check(&c, &params, &original, &target).unwrap();
        assert!(same(&original, &target, &c, &mut Budget::new()).unwrap());
        let mut wrong = target.clone();
        let Term::Match { branches, .. } = &mut wrong else {
            unreachable!()
        };
        branches[1].body = v("head");
        assert!(check(&c, &params, &original, &wrong).is_err());
        let nan = Term::U64(0x7fa01234);
        let branch = Term::If {
            condition: Box::new(v("flag")),
            on_true: Box::new(nan.clone()),
            on_false: Box::new(Term::U64(0)),
        };
        assert!(check(&c, &[("flag".into(), Sort::Bool)], &branch, &nan).is_err());
    }

    #[test]
    fn speculative_comparison_is_bounded_and_cannot_reuse_another_context_verdict() {
        let make = |value| {
            let mut c = Context::default();
            c.declare(
                "constant".into(),
                &Declaration::Function {
                    params: vec![],
                    result: Sort::U64,
                    recursive: None,
                    body: Term::U64(value),
                },
            )
            .unwrap();
            c
        };
        let first = make(17);
        let second = make(18);
        let term = call("constant", vec![]);
        let mut budget = Budget::new();
        assert!(same(&term, &Term::U64(17), &first, &mut budget).unwrap());
        assert!(!same(&term, &Term::U64(17), &second, &mut budget).unwrap());
        assert!(!compare(&term, &Term::U64(17), &first, &mut budget, &mut 0, 0).unwrap());
        assert!(!compare(&term, &Term::U64(17), &first, &mut budget, &mut 1, 65).unwrap());
        budget.remaining = 0;
        assert!(same(&term, &Term::U64(17), &first, &mut budget).is_err());
        assert!(check(&first, &[], &call("missing", vec![]), &Term::U64(17)).is_err());
    }

    #[test]
    fn closed_control_is_pruned_before_recursive_binders_duplicate_live_arithmetic() {
        let mut c = context();
        let binary = |op: &str, a: Term, b: Term| Term::Binary {
            op: op.into(),
            left: Box::new(a),
            right: Box::new(b),
        };
        let choose = |condition: Term, yes: Term, no: Term| Term::If {
            condition: Box::new(condition),
            on_true: Box::new(yes),
            on_false: Box::new(no),
        };
        let next = choose(
            binary("==", v("op"), Term::U64(0)),
            plus(v("initial"), v("weight")),
            choose(
                binary("==", v("op"), Term::U64(1)),
                binary("f32:*", v("initial"), v("weight")),
                choose(
                    binary("f32:>", v("initial"), Term::U64(0)),
                    v("initial"),
                    Term::U64(0),
                ),
            ),
        );
        c.declare(
            "program".into(),
            &Declaration::Function {
                params: vec![
                    ("rows".into(), Sort::Data("rows".into())),
                    ("initial".into(), Sort::U64),
                    ("weight".into(), Sort::U64),
                ],
                result: Sort::U64,
                recursive: Some(0),
                body: Term::Match {
                    scrutinee: Box::new(v("rows")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: v("initial"),
                        },
                        Branch {
                            bindings: vec!["op".into(), "tail".into()],
                            body: Term::SelfCall(vec![v("tail"), next, v("weight")]),
                        },
                    ],
                },
            },
        )
        .unwrap();
        let ops = [1, 0, 2, 1, 0, 1, 2, 0];
        let mut rows = cons(0, vec![]);
        for op in ops.into_iter().rev() {
            rows = cons(1, vec![Term::U64(op), rows]);
        }
        let mut result = v("input");
        for op in ops {
            result = match op {
                0 => plus(result, v("weight")),
                1 => binary("f32:*", result, v("weight")),
                _ => choose(
                    binary("f32:>", result.clone(), Term::U64(0)),
                    result,
                    Term::U64(0),
                ),
            };
        }
        let original = call("program", vec![rows, v("input"), v("weight")]);
        let params = vec![("input".into(), Sort::U64), ("weight".into(), Sort::U64)];
        assert!(same(&original, &result, &c, &mut Budget::new()).unwrap());
        check(&c, &params, &original, &result).unwrap();
        let wrong = plus(result, Term::U64(1));
        assert!(check(&c, &params, &original, &wrong).is_err());
    }
}
