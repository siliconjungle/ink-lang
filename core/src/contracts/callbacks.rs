//! Call obligations quantify over the fixed consumer's actual callback domain.
//! These are ordinary semantic terms, checked by the existing proof kernel. No
//! element predicate is assumed from its nominal type, and no proof is admitted
//! by recognising a validator or an algorithm.
use super::{Equation, Obligation};
use crate::{
    core::{Program, Type},
    laws::{CheckedCatalogue, Proof},
    semantic as s, LangResult,
};
use std::collections::BTreeMap;

pub(super) fn binder_name(env: &s::Env, depth: usize) -> String {
    fresh(env, &format!("__contract_binder_{depth}"))
}
fn fresh(env: &s::Env, base: &str) -> String {
    let mut name = base.to_owned();
    while env.contains_key(&name) {
        name.push('_');
    }
    name
}
fn boolean(v: bool) -> s::Term {
    s::term(s::value(Type::Bool), s::Node::Bool(v))
}
fn and(a: s::Term, b: s::Term) -> s::Term {
    s::op(s::value(Type::Bool), "binary:&&", vec![a, b])
}
fn choose(flag: s::Term, yes: s::Term, no: s::Term) -> s::Term {
    s::op(yes.sort.clone(), "call:choose", vec![flag, yes, no])
}
fn apply(mut f: s::Term, args: Vec<s::Term>) -> LangResult<s::Term> {
    for a in args {
        let s::Sort::Arrow(_, result) = &f.sort else {
            return Err("callback arrow expected".into());
        };
        f = s::op((**result).clone(), "apply", vec![f, a]);
    }
    Ok(f)
}
fn close(body: s::Term, names: &[(String, s::Sort)], b: &mut s::Budget) -> LangResult<s::Term> {
    let mut body = s::close_scope(&body, names, b)?;
    for (_, sort) in names.iter().rev() {
        body = s::lambda(sort.clone(), body);
    }
    Ok(body)
}
fn equality(e: &Equation, p: &Program) -> Option<s::Term> {
    if e.from == e.to {
        return Some(boolean(true));
    }
    // Semantic equations use exact value equality, including raw float bits.
    // IEEE == would make a NaN alias guard false and unsoundly vacuous.
    let s::Sort::Value(ty) = &e.from.sort else {
        return None;
    };
    if crate::local_collections::owned(ty, p) {
        return None;
    }
    if e.to.node == s::Node::Bool(true) {
        return Some(e.from.clone());
    }
    Some(s::op(
        s::value(Type::Bool),
        "value:equal",
        vec![e.from.clone(), e.to.clone()],
    ))
}
fn arity(name: &str, child: usize) -> Option<usize> {
    match (name, child) {
        ("apply", 0)
        | ("method:map" | "method:filter", 1)
        | ("method:fold", 1 | 2)
        | ("call:repeat_until", 2)
        | ("method:borrow_range", 3) => Some(1),
        ("method:map_indexed", 1)
        | ("method:zip", 2)
        | ("call:foldr" | "call:foldl" | "call:repeat", 2)
        | ("call:fold_until", 2 | 3)
        | ("call:repeat_until", 3) => Some(2),
        _ => None,
    }
}
/// Lift inside-out, after nested consumers have bound their own parameters.
/// Already universal obligations retain their original form and proof bytes.
pub(super) fn lift(
    parent: &s::Term,
    child: usize,
    env: &s::Env,
    conditions: &[Equation],
    scope: &[(String, s::Sort)],
    obligations: &mut [Obligation],
    b: &mut s::Budget,
    checker: &CheckedCatalogue,
    executable: &Program,
) -> LangResult<()> {
    if obligations.is_empty() {
        return Ok(());
    }
    let s::Node::Op(name, args) = &parent.node else {
        return Ok(());
    };
    let Some(count) = arity(name, child) else {
        return Ok(());
    };
    let mut callback = &args[child];
    let mut local = env.clone();
    let mut binders = Vec::new();
    for i in 0..count {
        let (s::Node::Lambda(body), s::Sort::Arrow(input, _)) = (&callback.node, &callback.sort)
        else {
            return Ok(());
        };
        let name = binder_name(&local, scope.len() + i);
        local.insert(name.clone(), (**input).clone());
        binders.push((name, (**input).clone()));
        callback = body;
    }
    let opened = args
        .iter()
        .map(|a| s::open_scope(a, scope, b))
        .collect::<LangResult<Vec<_>>>()?;
    for obligation in obligations {
        if checker
            .prove(
                executable,
                &obligation.params,
                &obligation.conditions,
                &obligation.goal,
                &Proof::Normalize,
                &mut s::Budget::new(),
                0,
            )
            .is_ok()
        {
            continue;
        }
        // An unrecognised inner callback retains its universal obligation. Its
        // additional variables cannot become arbitrary witnesses in this domain.
        if obligation.params != local {
            continue;
        }
        if name == "apply" {
            let substitutions = BTreeMap::from([(binders[0].0.clone(), opened[1].clone())]);
            obligation.goal = substitute_equation(&obligation.goal, &substitutions, b)?;
            obligation.conditions = obligation
                .conditions
                .iter()
                .map(|e| substitute_equation(e, &substitutions, b))
                .collect::<LangResult<_>>()?;
            obligation.params = env.clone();
            continue;
        }
        let Some(mut body) = equality(&obligation.goal, executable) else {
            continue;
        };
        let mut guard = boolean(true);
        let mut supported = true;
        for condition in &obligation.conditions {
            if conditions
                .iter()
                .any(|outer| outer.from == condition.from && outer.to == condition.to)
            {
                continue;
            }
            if let Some(flag) = equality(condition, executable) {
                guard = and(guard, flag);
            } else {
                supported = false;
                break;
            }
        }
        if !supported {
            continue;
        }
        if guard != boolean(true) {
            body = choose(guard, body, boolean(true));
        }
        let predicate = close(body, &binders, b)?;
        let Some(from) = domain(name, child, &opened, predicate, env, executable, b)? else {
            continue;
        };
        s::validate(&from, env, executable, b)?;
        obligation.params = env.clone();
        obligation.conditions = conditions.to_vec();
        obligation.goal = Equation {
            from,
            to: boolean(true),
        };
    }
    Ok(())
}
fn substitute_equation(
    e: &Equation,
    substitutions: &BTreeMap<String, s::Term>,
    b: &mut s::Budget,
) -> LangResult<Equation> {
    Ok(Equation {
        from: s::substitute(&e.from, substitutions, b)?,
        to: s::substitute(&e.to, substitutions, b)?,
    })
}
fn list(receiver: &s::Term) -> LangResult<s::Term> {
    match &receiver.sort {
        s::Sort::Value(Type::List(_)) => Ok(receiver.clone()),
        s::Sort::Value(Type::Buffer(inner)) => Ok(s::op(
            s::value(Type::List(inner.clone())),
            "method:freeze",
            vec![receiver.clone()],
        )),
        _ => Err("callback collection receiver expected".into()),
    }
}
fn all(xs: s::Term, predicate: s::Term) -> LangResult<s::Term> {
    // The callback has one bound item; introduce the Boolean fold accumulator
    // inside it without capturing that item.
    let s::Sort::Arrow(item, _) = &predicate.sort else {
        return Err("collection predicate arrow".into());
    };
    let body = and(
        apply(
            predicate.clone(),
            vec![s::term((**item).clone(), s::Node::Bound(1))],
        )?,
        s::term(s::value(Type::Bool), s::Node::Bound(0)),
    );
    Ok(s::op(
        s::value(Type::Bool),
        "call:foldr",
        vec![
            xs,
            boolean(true),
            s::lambda((**item).clone(), s::lambda(s::value(Type::Bool), body)),
        ],
    ))
}
fn all_bools(xs: s::Term) -> LangResult<s::Term> {
    all(
        xs,
        s::lambda(
            s::value(Type::Bool),
            s::term(s::value(Type::Bool), s::Node::Bound(0)),
        ),
    )
}
fn domain(
    name: &str,
    child: usize,
    args: &[s::Term],
    predicate: s::Term,
    env: &s::Env,
    p: &Program,
    b: &mut s::Budget,
) -> LangResult<Option<s::Term>> {
    let result = match name {
        "method:borrow_range" => s::op(s::value(Type::Bool),name,vec![args[0].clone(),args[1].clone(),args[2].clone(),predicate]),
        "method:map" | "method:filter" => all(list(&args[0])?, predicate)?,
        "method:map_indexed" => all_bools(s::op(
            s::value(Type::List(Box::new(Type::Bool))),
            name,
            vec![list(&args[0])?, predicate],
        ))?,
        "method:zip" => all_bools(s::op(
            s::value(Type::List(Box::new(Type::Bool))),
            name,
            vec![args[0].clone(), args[1].clone(), predicate],
        ))?,
        "method:fold" => {
            let mut branches = Vec::new();
            for i in 1..=2 {
                let s::Sort::Arrow(input, _) = &args[i].sort else {
                    return Err("variant callback arrow".into());
                };
                branches.push(if child == i {
                    predicate.clone()
                } else {
                    s::lambda((**input).clone(), boolean(true))
                });
            }
            s::op(
                s::value(Type::Bool),
                name,
                vec![args[0].clone(), branches[0].clone(), branches[1].clone()],
            )
        }
        "call:foldr" | "call:foldl" | "call:fold_until" | "call:repeat" => {
            let s::Sort::Value(acc_type) = &args[1].sort else {
                return Ok(None);
            };
            if crate::local_collections::owned(acc_type, p) {
                return Ok(None);
            }
            trace_fold(name, args, predicate, env, b)?
        }
        "call:repeat_until" => {
            let s::Sort::Value(acc_type) = &args[1].sort else {
                return Ok(None);
            };
            if crate::local_collections::owned(acc_type, p) {
                return Ok(None);
            }
            trace_until(child, args, predicate, env, b)?
        }
        _ => return Ok(None),
    };
    Ok(Some(result))
}
fn some(sort: &s::Sort, v: s::Term) -> s::Term {
    s::op(sort.clone(), "call:Some", vec![v])
}
fn none(sort: &s::Sort) -> s::Term {
    s::op(sort.clone(), "call:None", vec![])
}
fn option_fold(option: s::Term, yes: s::Term, no: s::Term) -> s::Term {
    s::op(
        yes_result(&yes),
        "method:fold",
        vec![option, yes, s::lambda(s::value(Type::Unit), no)],
    )
}
fn yes_result(yes: &s::Term) -> s::Sort {
    let s::Sort::Arrow(_, result) = &yes.sort else {
        unreachable!()
    };
    (**result).clone()
}
fn valid_trace(option: s::Term, acc: s::Sort) -> s::Term {
    option_fold(option, s::lambda(acc, boolean(true)), boolean(false))
}
/// Carry either the original accumulator or a permanent failure. Retaining the
/// original fold operator preserves its direction and stop/step ordering.
fn trace_fold(
    name: &str,
    args: &[s::Term],
    predicate: s::Term,
    env: &s::Env,
    b: &mut s::Budget,
) -> LangResult<s::Term> {
    let s::Sort::Value(acc_type) = &args[1].sort else {
        unreachable!()
    };
    let acc = args[1].sort.clone();
    let trace = s::value(Type::Option(Box::new(acc_type.clone())));
    let step_index = if name == "call:fold_until" { 3 } else { 2 };
    let s::Sort::Arrow(row_sort, _) = &args[step_index].sort else {
        return Err("fold callback arrow".into());
    };
    let row_name = fresh(env, "__contract_trace_row");
    let acc_name = fresh(env, "__contract_trace_value");
    let state_name = fresh(env, "__contract_trace_state");
    let row = s::free((**row_sort).clone(), &row_name);
    let value = s::free(acc.clone(), &acc_name);
    let state = s::free(trace.clone(), &state_name);
    let next = some(
        &trace,
        apply(args[step_index].clone(), vec![row.clone(), value.clone()])?,
    );
    let yes = close(
        choose(
            apply(predicate, vec![row.clone(), value.clone()])?,
            next,
            none(&trace),
        ),
        &[(acc_name.clone(), acc.clone())],
        b,
    )?;
    let step = close(
        option_fold(state.clone(), yes, none(&trace)),
        &[
            (row_name.clone(), (**row_sort).clone()),
            (state_name.clone(), trace.clone()),
        ],
        b,
    )?;
    let mut lifted = vec![args[0].clone(), some(&trace, args[1].clone())];
    if name == "call:fold_until" {
        let stop = close(
            apply(args[2].clone(), vec![row, value])?,
            &[(acc_name, acc.clone())],
            b,
        )?;
        let stop = close(
            option_fold(state, stop, boolean(true)),
            &[
                (row_name, (**row_sort).clone()),
                (state_name, trace.clone()),
            ],
            b,
        )?;
        lifted.push(stop);
    }
    // For stop-callback requirements the same predicate is evaluated before the
    // original step. The fixed fold_until always takes that step, even when stop
    // is true, so a failed predicate still reaches the final failure state.
    lifted.push(step);
    Ok(valid_trace(s::op(trace, name, lifted), acc))
}
/// A tagged state records legitimate early termination separately from failure.
/// Running the fixed bounded loop with a false stop predicate visits each index;
/// after the source stops, tags suppress both source callbacks. Count zero never
/// evaluates a stop predicate, matching repeat_until's fixed meaning.
fn trace_until(
    child: usize,
    args: &[s::Term],
    predicate: s::Term,
    env: &s::Env,
    b: &mut s::Budget,
) -> LangResult<s::Term> {
    let s::Sort::Value(acc_type) = &args[1].sort else {
        unreachable!()
    };
    let acc = args[1].sort.clone();
    let option = s::value(Type::Option(Box::new(acc_type.clone())));
    let tagged = s::value(Type::Result(
        Box::new(Type::Option(Box::new(acc_type.clone()))),
        Box::new(acc_type.clone()),
    ));
    let index_name = fresh(env, "__contract_trace_index");
    let value_name = fresh(env, "__contract_trace_value");
    let option_name = fresh(env, "__contract_trace_option");
    let state_name = fresh(env, "__contract_trace_state");
    let index = s::free(s::value(Type::U32), &index_name);
    let value = s::free(acc.clone(), &value_name);
    let option_value = s::free(option.clone(), &option_name);
    let state = s::free(tagged.clone(), &state_name);
    let ok = |v| s::op(tagged.clone(), "call:Ok", vec![v]);
    let halted = |v| s::op(tagged.clone(), "call:Err", vec![v]);
    let failure = ok(none(&option));
    let source_stop = apply(args[2].clone(), vec![value.clone()])?;
    let source_step = apply(args[3].clone(), vec![index.clone(), value.clone()])?;
    let stop_valid = if child == 2 {
        apply(predicate.clone(), vec![value.clone()])?
    } else {
        boolean(true)
    };
    let step_valid = if child == 3 {
        apply(predicate, vec![index, value.clone()])?
    } else {
        boolean(true)
    };
    let running = choose(
        stop_valid,
        choose(
            source_stop,
            halted(value),
            choose(step_valid, ok(some(&option, source_step)), failure.clone()),
        ),
        failure.clone(),
    );
    let running = close(running, &[(value_name.clone(), acc.clone())], b)?;
    let on_option = close(
        option_fold(option_value, running, failure),
        &[(option_name, option.clone())],
        b,
    )?;
    let on_halt = close(
        halted(s::free(acc.clone(), &value_name)),
        &[(value_name, acc.clone())],
        b,
    )?;
    let step = close(
        s::op(
            tagged.clone(),
            "method:fold",
            vec![state, on_option, on_halt],
        ),
        &[
            (index_name, s::value(Type::U32)),
            (state_name, tagged.clone()),
        ],
        b,
    )?;
    let result = s::op(
        tagged.clone(),
        "call:repeat_until",
        vec![
            args[0].clone(),
            ok(some(&option, args[1].clone())),
            s::lambda(tagged, boolean(false)),
            step,
        ],
    );
    let on_running = s::lambda(
        option.clone(),
        valid_trace(s::term(option, s::Node::Bound(0)), acc.clone()),
    );
    Ok(s::op(
        s::value(Type::Bool),
        "method:fold",
        vec![result, on_running, s::lambda(acc, boolean(true))],
    ))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::laws::{self, Catalogue};
    #[test]
    fn float_alias_guards_use_exact_bits_and_cannot_hide_nan_failures() {
        let p = crate::syntax::parse("module floats;").unwrap();
        let sort = s::value(Type::F32);
        let guard = equality(
            &Equation {
                from: s::free(sort.clone(), "a"),
                to: s::free(sort.clone(), "alias"),
            },
            &p,
        )
        .unwrap();
        assert!(matches!(&guard.node,s::Node::Op(n,_) if n=="value:equal"));
        let nan = s::term(sort, s::Node::Float(0x7fc01234));
        let guard = s::substitute(
            &guard,
            &BTreeMap::from([("a".into(), nan.clone()), ("alias".into(), nan)]),
            &mut s::Budget::new(),
        )
        .unwrap();
        let checker = CheckedCatalogue::check(
            &Catalogue {
                schema: 1,
                semantics: laws::SEMANTICS.into(),
                roots: vec![],
                objects: BTreeMap::new(),
            },
            &p,
        )
        .unwrap();
        let goal = Equation {
            from: choose(guard, boolean(false), boolean(true)),
            to: boolean(true),
        };
        assert!(checker
            .prove(
                &p,
                &s::Env::new(),
                &[],
                &goal,
                &Proof::Normalize,
                &mut s::Budget::new(),
                0
            )
            .is_err());
    }
}
