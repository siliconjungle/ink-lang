//! Source arithmetic correspondence to an exact keyed contribution-table model.
//! The model is pinned here; its transition/history equalities are database proofs.
//! Row projection, native map abstraction and transaction execution remain trusted.
use crate::{
    aggregate::Certificate,
    logic::{Branch, Constructor, Context, Declaration, Proof, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SEMANTICS: &str = "exact-integer-keyed-table-maintenance-v4";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub model: BTreeMap<String, String>,
    pub step: Proof,
    pub history: Proof,
}
fn v(n: &str) -> Term {
    Term::Var(n.into())
}
fn call(id: &str, args: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments: args,
    }
}
fn ctor(id: &str, index: usize, args: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor: index,
        arguments: args,
    }
}
fn cases(t: Term, branches: Vec<(Vec<&str>, Term)>) -> Term {
    Term::Match {
        scrutinee: Box::new(t),
        branches: branches
            .into_iter()
            .map(|(ns, body)| Branch {
                bindings: ns.into_iter().map(str::to_owned).collect(),
                body,
            })
            .collect(),
    }
}
fn iff(condition: Term, on_true: Term, on_false: Term) -> Term {
    Term::If {
        condition: Box::new(condition),
        on_true: Box::new(on_true),
        on_false: Box::new(on_false),
    }
}
fn binary(op: &str, a: Term, b: Term) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(a),
        right: Box::new(b),
    }
}
fn datatype(fields: Vec<(&str, Vec<Sort>)>) -> Declaration {
    Declaration::Datatype {
        constructors: fields
            .into_iter()
            .map(|(name, fields)| Constructor {
                name: name.into(),
                fields,
            })
            .collect(),
    }
}
fn function(
    params: Vec<(&str, Sort)>,
    result: Sort,
    body: Term,
    recursive: Option<usize>,
) -> Declaration {
    Declaration::Function {
        params: params.into_iter().map(|(n, s)| (n.into(), s)).collect(),
        result,
        body,
        recursive,
    }
}

pub(crate) fn verify(
    context: &Context,
    exact: &BTreeMap<String, String>,
    c: &Certificate,
    e: &Evidence,
) -> LangResult<()> {
    const ROLES: [&str; 18] = [
        "OptionalInteger",
        "TableKey128",
        "table_key_equal",
        "ContributionRows",
        "lookup_contribution",
        "write_matching_contribution",
        "write_contribution",
        "sum_contributions",
        "update_contribution_total",
        "TableCommand",
        "CachedContributionState",
        "reference_table_step",
        "cached_table_step",
        "initialise_contribution_state",
        "TableCommands",
        "ContributionTrace",
        "reference_table_trace",
        "cached_table_trace",
    ];
    if e.model.len() != ROLES.len() || ROLES.iter().any(|r| !e.model.contains_key(*r)) {
        return Err("incomplete keyed table semantic model".into());
    }
    let id = |n: &str| e.model[n].as_str();
    let sort = |n: &str| Sort::Data(id(n).into());
    let integer = Sort::Data(exact["Integer"].clone());
    let option = sort("OptionalInteger");
    let key = sort("TableKey128");
    let rows = sort("ContributionRows");
    let command = sort("TableCommand");
    let state = sort("CachedContributionState");
    let commands = sort("TableCommands");
    let trace = sort("ContributionTrace");
    let none = ctor(id("OptionalInteger"), 0, vec![]);
    let some = |t| ctor(id("OptionalInteger"), 1, vec![t]);
    let nil = ctor(id("ContributionRows"), 0, vec![]);
    let cons = |k, x, t| ctor(id("ContributionRows"), 1, vec![k, x, t]);
    let rs = v("rows");
    let k = v("key");
    let new = v("new");
    let tail = v("tail");
    let hk = v("head_key");
    let hv = v("head_value");
    let add = |a, b| call(&exact["addition"], vec![a, b]);
    let sum = |r| call(id("sum_contributions"), vec![r]);
    let get = |r, k| call(id("lookup_contribution"), vec![r, k]);
    let put = |r, k, n| call(id("write_contribution"), vec![r, k, n]);
    let matched = |k, t, n| call(id("write_matching_contribution"), vec![k, t, n]);
    let maintained = |t, o, n| call(id("update_contribution_total"), vec![t, o, n]);
    let pair = |r, t| ctor(id("CachedContributionState"), 0, vec![r, t]);
    let init = |r| call(id("initialise_contribution_state"), vec![r]);
    let refstep = |r, c| call(id("reference_table_step"), vec![r, c]);
    let faststep = |s, c| call(id("cached_table_step"), vec![s, c]);
    let inputs = |old: bool, new: bool| {
        let mut env = BTreeMap::from([("total", v("total"))]);
        if old {
            env.insert("old", v("old_value"));
        }
        if new {
            env.insert("new", v("new_value"));
        }
        env
    };
    let insert = crate::exact_maintenance::expression(exact, &c.insert, &inputs(false, true))?;
    let replace = crate::exact_maintenance::expression(exact, &c.replace, &inputs(true, true))?;
    let remove = crate::exact_maintenance::expression(exact, &c.remove, &inputs(true, false))?;
    let equal = call(id("table_key_equal"), vec![hk.clone(), k.clone()]);
    let cmd = v("command");
    let physical = v("state");
    let cs = v("commands");
    let ct = v("command_tail");
    let definitions = vec![
        (
            "OptionalInteger",
            datatype(vec![("None", vec![]), ("Some", vec![integer.clone()])]),
        ),
        (
            "TableKey128",
            datatype(vec![("Key", vec![Sort::U64, Sort::U64])]),
        ),
        (
            "table_key_equal",
            function(
                vec![("a", key.clone()), ("b", key.clone())],
                Sort::Bool,
                cases(
                    v("a"),
                    vec![(
                        vec!["ahi", "alo"],
                        cases(
                            v("b"),
                            vec![(
                                vec!["bhi", "blo"],
                                binary(
                                    "&&",
                                    binary("==", v("ahi"), v("bhi")),
                                    binary("==", v("alo"), v("blo")),
                                ),
                            )],
                        ),
                    )],
                ),
                Some(0),
            ),
        ),
        (
            "ContributionRows",
            datatype(vec![
                ("Nil", vec![]),
                ("Cons", vec![key.clone(), integer.clone(), Sort::SelfType]),
            ]),
        ),
        (
            "lookup_contribution",
            function(
                vec![("rows", rows.clone()), ("key", key.clone())],
                option.clone(),
                cases(
                    rs.clone(),
                    vec![
                        (vec![], none),
                        (
                            vec!["head_key", "head_value", "tail"],
                            iff(
                                equal.clone(),
                                some(hv.clone()),
                                Term::SelfCall(vec![tail.clone(), k.clone()]),
                            ),
                        ),
                    ],
                ),
                Some(0),
            ),
        ),
        (
            "write_matching_contribution",
            function(
                vec![
                    ("head_key", key.clone()),
                    ("tail", rows.clone()),
                    ("new", option.clone()),
                ],
                rows.clone(),
                cases(
                    new.clone(),
                    vec![
                        (vec![], tail.clone()),
                        (vec!["value"], cons(hk.clone(), v("value"), tail.clone())),
                    ],
                ),
                Some(2),
            ),
        ),
        (
            "write_contribution",
            function(
                vec![
                    ("rows", rows.clone()),
                    ("key", key.clone()),
                    ("new", option.clone()),
                ],
                rows.clone(),
                cases(
                    rs.clone(),
                    vec![
                        (vec![], matched(k.clone(), nil, new.clone())),
                        (
                            vec!["head_key", "head_value", "tail"],
                            iff(
                                equal,
                                matched(hk.clone(), tail.clone(), new.clone()),
                                cons(
                                    hk,
                                    hv.clone(),
                                    Term::SelfCall(vec![tail, k.clone(), new.clone()]),
                                ),
                            ),
                        ),
                    ],
                ),
                Some(0),
            ),
        ),
        (
            "sum_contributions",
            function(
                vec![("rows", rows.clone())],
                integer.clone(),
                cases(
                    rs.clone(),
                    vec![
                        (vec![], ctor(&exact["Integer"], 0, vec![])),
                        (
                            vec!["head_key", "head_value", "tail"],
                            add(Term::SelfCall(vec![v("tail")]), hv),
                        ),
                    ],
                ),
                Some(0),
            ),
        ),
        (
            "update_contribution_total",
            function(
                vec![
                    ("total", integer.clone()),
                    ("old", option.clone()),
                    ("new", option.clone()),
                ],
                integer,
                cases(
                    v("old"),
                    vec![
                        (
                            vec![],
                            cases(
                                new.clone(),
                                vec![(vec![], v("total")), (vec!["new_value"], insert)],
                            ),
                        ),
                        (
                            vec!["old_value"],
                            cases(new, vec![(vec![], remove), (vec!["new_value"], replace)]),
                        ),
                    ],
                ),
                Some(1),
            ),
        ),
        ("TableCommand", datatype(vec![("Write", vec![key, option])])),
        (
            "CachedContributionState",
            datatype(vec![(
                "State",
                vec![rows.clone(), Sort::Data(exact["Integer"].clone())],
            )]),
        ),
        (
            "reference_table_step",
            function(
                vec![("rows", rows.clone()), ("command", command.clone())],
                rows.clone(),
                cases(
                    cmd.clone(),
                    vec![(vec!["key", "new"], put(rs.clone(), k.clone(), v("new")))],
                ),
                Some(1),
            ),
        ),
        (
            "cached_table_step",
            function(
                vec![("state", state.clone()), ("command", command.clone())],
                state.clone(),
                cases(
                    physical.clone(),
                    vec![(
                        vec!["rows", "total"],
                        cases(
                            cmd.clone(),
                            vec![(
                                vec!["key", "new"],
                                pair(
                                    put(rs.clone(), k.clone(), v("new")),
                                    maintained(v("total"), get(rs.clone(), k), v("new")),
                                ),
                            )],
                        ),
                    )],
                ),
                Some(1),
            ),
        ),
        (
            "initialise_contribution_state",
            function(
                vec![("rows", rows.clone())],
                state.clone(),
                pair(rs.clone(), sum(rs.clone())),
                None,
            ),
        ),
        (
            "TableCommands",
            datatype(vec![
                ("Nil", vec![]),
                ("Cons", vec![command, Sort::SelfType]),
            ]),
        ),
        (
            "ContributionTrace",
            datatype(vec![
                ("Nil", vec![]),
                ("Cons", vec![state.clone(), Sort::SelfType]),
            ]),
        ),
        (
            "reference_table_trace",
            function(
                vec![("commands", commands.clone()), ("rows", rows.clone())],
                trace.clone(),
                cases(
                    cs.clone(),
                    vec![
                        (vec![], ctor(id("ContributionTrace"), 0, vec![])),
                        (
                            vec!["command", "command_tail"],
                            ctor(
                                id("ContributionTrace"),
                                1,
                                vec![
                                    init(refstep(rs.clone(), cmd.clone())),
                                    Term::SelfCall(vec![
                                        ct.clone(),
                                        refstep(rs.clone(), cmd.clone()),
                                    ]),
                                ],
                            ),
                        ),
                    ],
                ),
                Some(0),
            ),
        ),
        (
            "cached_table_trace",
            function(
                vec![("commands", commands.clone()), ("state", state)],
                trace,
                cases(
                    cs.clone(),
                    vec![
                        (vec![], ctor(id("ContributionTrace"), 0, vec![])),
                        (
                            vec!["command", "command_tail"],
                            ctor(
                                id("ContributionTrace"),
                                1,
                                vec![
                                    faststep(physical.clone(), cmd.clone()),
                                    Term::SelfCall(vec![ct, faststep(physical, cmd.clone())]),
                                ],
                            ),
                        ),
                    ],
                ),
                Some(0),
            ),
        ),
    ];
    for (role, definition) in definitions {
        context
            .matches_definition(id(role), &definition)
            .map_err(|err| format!("{role}: {err}"))?;
    }
    context
        .check(
            &[
                ("rows".into(), rows.clone()),
                ("command".into(), sort("TableCommand")),
            ],
            &[],
            &faststep(init(rs.clone()), cmd.clone()),
            &init(refstep(rs.clone(), cmd)),
            &e.step,
        )
        .map_err(|err| format!("keyed table step proof: {err}"))?;
    context
        .check(
            &[("commands".into(), commands), ("rows".into(), rows)],
            &[],
            &call(id("cached_table_trace"), vec![cs.clone(), init(rs.clone())]),
            &call(id("reference_table_trace"), vec![cs, rs]),
            &e.history,
        )
        .map_err(|err| format!("keyed table history proof: {err}"))?;
    Ok(())
}
