//! Exact source/update correspondence. This fixes the meaning of integers and
//! finite sums; every maintenance equality is supplied as a database proof.
//! Table projection, transaction execution and backend correctness remain trusted.
use crate::{
    aggregate::Certificate,
    library::{self, Bundle},
    logic::{Branch, Constructor, Context, Declaration, Proof, Sort, Term},
    syntax::Expr,
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SEMANTICS: &str = "exact-integer-list-maintenance-v2";
pub const JOURNAL_SEMANTICS: &str = "exact-integer-list-reversible-maintenance-v3";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct JournalAction {
    pub save: Expr,
    pub apply: Expr,
    pub restore: Expr,
    pub forward: Proof,
    pub inverse: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Journal {
    pub insert: JournalAction,
    pub replace: JournalAction,
    pub remove: JournalAction,
}
impl Journal {
    pub fn action(&self, kind: u8) -> &JournalAction {
        match kind {
            0 => &self.insert,
            1 => &self.replace,
            2 => &self.remove,
            _ => unreachable!("checked journal operation"),
        }
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Evidence {
    pub library: Bundle,
    /// Roles name semantic definitions, not particular optimisation theorems.
    pub model: BTreeMap<String, String>,
    pub insert: Proof,
    pub replace: Proof,
    pub remove: Proof,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub journal: Option<Journal>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub table: Option<crate::table_maintenance::Evidence>,
}
fn var(n: &str) -> Term {
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
fn cases(term: Term, branches: Vec<(Vec<&str>, Term)>) -> Term {
    Term::Match {
        scrutinee: Box::new(term),
        branches: branches
            .into_iter()
            .map(|(names, body)| Branch {
                bindings: names.into_iter().map(str::to_owned).collect(),
                body,
            })
            .collect(),
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
fn function(params: Vec<(&str, Sort)>, result: Sort, body: Term, recursive: usize) -> Declaration {
    Declaration::Function {
        params: params.into_iter().map(|(n, s)| (n.into(), s)).collect(),
        result,
        body,
        recursive: Some(recursive),
    }
}
struct Model<'a> {
    ids: &'a BTreeMap<String, String>,
}
impl Model<'_> {
    fn id(&self, name: &str) -> &str {
        &self.ids[name]
    }
    fn add(&self, a: Term, b: Term) -> Term {
        call(self.id("addition"), vec![a, b])
    }
    fn sub(&self, a: Term, b: Term) -> Term {
        call(self.id("subtraction"), vec![a, b])
    }
    fn sum(&self, rows: Term) -> Term {
        call(self.id("sum_integers"), vec![rows])
    }
    fn append(&self, a: Term, b: Term) -> Term {
        call(self.id("append"), vec![a, b])
    }
    fn cons(&self, head: Term, tail: Term) -> Term {
        ctor(self.id("IntegerList"), 1, vec![head, tail])
    }
    fn check(&self, context: &Context) -> LangResult<()> {
        const ROLES: [&str; 12] = [
            "Natural",
            "Integer",
            "successor",
            "predecessor",
            "negation",
            "repeat_successor",
            "repeat_predecessor",
            "addition",
            "subtraction",
            "IntegerList",
            "sum_integers",
            "append",
        ];
        if self.ids.len() != ROLES.len() || ROLES.iter().any(|n| !self.ids.contains_key(*n)) {
            return Err("incomplete exact integer semantic model".into());
        }
        let nat = self.id("Natural");
        let integer = self.id("Integer");
        let ns = Sort::Data(nat.into());
        let is = Sort::Data(integer.into());
        let list = Sort::Data(self.id("IntegerList").into());
        let zero = ctor(nat, 0, vec![]);
        let z = ctor(integer, 0, vec![]);
        let s = |n| ctor(nat, 1, vec![n]);
        let p = |n| ctor(integer, 1, vec![n]);
        let m = |n| ctor(integer, 2, vec![n]);
        let x = var("x");
        let y = var("y");
        let n = var("n");
        let t = var("t");
        let definitions = vec![
            (
                "Natural",
                datatype(vec![("Zero", vec![]), ("Successor", vec![Sort::SelfType])]),
            ),
            (
                "Integer",
                datatype(vec![
                    ("Zero", vec![]),
                    ("Positive", vec![ns.clone()]),
                    ("Negative", vec![ns.clone()]),
                ]),
            ),
            (
                "successor",
                function(
                    vec![("x", is.clone())],
                    is.clone(),
                    cases(
                        x.clone(),
                        vec![
                            (vec![], p(zero.clone())),
                            (vec!["n"], p(s(n.clone()))),
                            (
                                vec!["n"],
                                cases(
                                    n.clone(),
                                    vec![(vec![], z.clone()), (vec!["t"], m(t.clone()))],
                                ),
                            ),
                        ],
                    ),
                    0,
                ),
            ),
            (
                "predecessor",
                function(
                    vec![("x", is.clone())],
                    is.clone(),
                    cases(
                        x.clone(),
                        vec![
                            (vec![], m(zero.clone())),
                            (
                                vec!["n"],
                                cases(
                                    n.clone(),
                                    vec![(vec![], z.clone()), (vec!["t"], p(t.clone()))],
                                ),
                            ),
                            (vec!["n"], m(s(n.clone()))),
                        ],
                    ),
                    0,
                ),
            ),
            (
                "negation",
                function(
                    vec![("x", is.clone())],
                    is.clone(),
                    cases(
                        x.clone(),
                        vec![
                            (vec![], z.clone()),
                            (vec!["n"], m(n.clone())),
                            (vec!["n"], p(n.clone())),
                        ],
                    ),
                    0,
                ),
            ),
            (
                "repeat_successor",
                function(
                    vec![("n", ns.clone()), ("x", is.clone())],
                    is.clone(),
                    cases(
                        n.clone(),
                        vec![
                            (vec![], x.clone()),
                            (
                                vec!["t"],
                                call(
                                    self.id("successor"),
                                    vec![Term::SelfCall(vec![t.clone(), x.clone()])],
                                ),
                            ),
                        ],
                    ),
                    0,
                ),
            ),
            (
                "repeat_predecessor",
                function(
                    vec![("n", ns.clone()), ("x", is.clone())],
                    is.clone(),
                    cases(
                        n.clone(),
                        vec![
                            (vec![], x.clone()),
                            (
                                vec!["t"],
                                call(
                                    self.id("predecessor"),
                                    vec![Term::SelfCall(vec![t.clone(), x.clone()])],
                                ),
                            ),
                        ],
                    ),
                    0,
                ),
            ),
            (
                "addition",
                function(
                    vec![("x", is.clone()), ("y", is.clone())],
                    is.clone(),
                    cases(
                        y.clone(),
                        vec![
                            (vec![], x.clone()),
                            (
                                vec!["n"],
                                call(self.id("repeat_successor"), vec![s(n.clone()), x.clone()]),
                            ),
                            (
                                vec!["n"],
                                call(self.id("repeat_predecessor"), vec![s(n), x]),
                            ),
                        ],
                    ),
                    1,
                ),
            ),
            (
                "subtraction",
                function(
                    vec![("x", is.clone()), ("y", is.clone())],
                    is.clone(),
                    self.add(var("x"), call(self.id("negation"), vec![y])),
                    1,
                ),
            ),
            (
                "IntegerList",
                datatype(vec![
                    ("Nil", vec![]),
                    ("Cons", vec![is.clone(), Sort::SelfType]),
                ]),
            ),
            (
                "sum_integers",
                function(
                    vec![("xs", list.clone())],
                    is,
                    cases(
                        var("xs"),
                        vec![
                            (vec![], z),
                            (
                                vec!["head", "tail"],
                                self.add(Term::SelfCall(vec![var("tail")]), var("head")),
                            ),
                        ],
                    ),
                    0,
                ),
            ),
            (
                "append",
                function(
                    vec![("xs", list.clone()), ("ys", list.clone())],
                    list,
                    cases(
                        var("xs"),
                        vec![
                            (vec![], var("ys")),
                            (
                                vec!["head", "tail"],
                                self.cons(
                                    var("head"),
                                    Term::SelfCall(vec![var("tail"), var("ys")]),
                                ),
                            ),
                        ],
                    ),
                    0,
                ),
            ),
        ];
        for (role, definition) in definitions {
            context
                .matches_definition(self.id(role), &definition)
                .map_err(|e| format!("{role}: {e}"))?;
        }
        Ok(())
    }
    fn expr(
        &self,
        e: &Expr,
        env: &BTreeMap<&str, Term>,
        remaining: &mut usize,
        depth: usize,
    ) -> LangResult<Term> {
        if *remaining == 0 || depth > 32 {
            return Err("exact update correspondence budget exceeded".into());
        }
        *remaining -= 1;
        match e {
            Expr::Var(n) => env
                .get(n.as_str())
                .cloned()
                .ok_or_else(|| format!("unbound exact update variable {n}")),
            Expr::Num(n) if *n <= 32 => {
                // This is a bounded proof encoding, never the runtime layout.
                let natural = (0..n.saturating_sub(1))
                    .fold(ctor(self.id("Natural"), 0, vec![]), |t, _| {
                        ctor(self.id("Natural"), 1, vec![t])
                    });
                Ok(ctor(
                    self.id("Integer"),
                    if *n == 0 { 0 } else { 1 },
                    if *n == 0 { vec![] } else { vec![natural] },
                ))
            }
            Expr::Binary(op, a, b) if op == "+" || op == "-" => {
                let a = self.expr(a, env, remaining, depth + 1)?;
                let b = self.expr(b, env, remaining, depth + 1)?;
                Ok(if op == "+" {
                    self.add(a, b)
                } else {
                    self.sub(a, b)
                })
            }
            _ => Err(
                "exact database update bridge currently supports +, - and literals up to 32".into(),
            ),
        }
    }
}
pub(crate) fn expression(
    model: &BTreeMap<String, String>,
    e: &Expr,
    env: &BTreeMap<&str, Term>,
) -> LangResult<Term> {
    Model { ids: model }.expr(e, env, &mut 512, 0)
}
pub fn verify(c: &Certificate, evidence: &Evidence) -> LangResult<()> {
    let semantics = if evidence.table.is_some() {
        (4, crate::table_maintenance::SEMANTICS)
    } else if evidence.journal.is_some() {
        (3, JOURNAL_SEMANTICS)
    } else {
        (2, SEMANTICS)
    };
    if (c.version, c.semantics.as_str()) != semantics || !c.obligations.is_empty() {
        return Err("unsupported exact database maintenance semantics".into());
    }
    let context = library::load_bundle(&evidence.library)?.context;
    let model = Model {
        ids: &evidence.model,
    };
    model.check(&context)?;
    let prefix = var("prefix");
    let suffix = var("suffix");
    let old = var("old");
    let new = var("new");
    let rest = model.sum(model.append(prefix.clone(), suffix.clone()));
    let before = model.sum(model.append(prefix.clone(), model.cons(old.clone(), suffix.clone())));
    let after = model.sum(model.append(prefix, model.cons(new.clone(), suffix)));
    let list = Sort::Data(model.id("IntegerList").into());
    let integer = Sort::Data(model.id("Integer").into());
    for (name, expr, proof, total, want, has_old, has_new) in [
        (
            "insert",
            &c.insert,
            &evidence.insert,
            rest.clone(),
            after.clone(),
            false,
            true,
        ),
        (
            "replace",
            &c.replace,
            &evidence.replace,
            before.clone(),
            after,
            true,
            true,
        ),
        (
            "remove",
            &c.remove,
            &evidence.remove,
            before,
            rest,
            true,
            false,
        ),
    ] {
        let mut env = BTreeMap::from([("total", total)]);
        let mut params = vec![
            ("prefix".into(), list.clone()),
            ("suffix".into(), list.clone()),
        ];
        if has_old {
            env.insert("old", old.clone());
            params.push(("old".into(), integer.clone()));
        }
        if has_new {
            env.insert("new", new.clone());
            params.push(("new".into(), integer.clone()));
        }
        let from = model.expr(expr, &env, &mut 512, 0)?;
        context
            .check(&params, &[], &from, &want, proof)
            .map_err(|e| format!("{name} source update proof: {e}"))?;
    }
    if let Some(journal) = &evidence.journal {
        for (kind, name, update, has_old, has_new) in [
            (0, "insert", &c.insert, false, true),
            (1, "replace", &c.replace, true, true),
            (2, "remove", &c.remove, true, false),
        ] {
            let action = journal.action(kind);
            // Arbitrary totals, rather than only reachable list sums. These
            // two obligations compose for every write in reverse journal order.
            let mut params = vec![("total".into(), integer.clone())];
            let mut inputs = BTreeMap::from([("total", var("total"))]);
            for (enabled, name) in [(has_old, "old"), (has_new, "new")] {
                if enabled {
                    params.push((name.into(), integer.clone()));
                    inputs.insert(name, var(name));
                }
            }
            let saved = model.expr(&action.save, &inputs, &mut 512, 0)?;
            let mut env = inputs.clone();
            env.insert("saved", saved.clone());
            let applied = model.expr(&action.apply, &env, &mut 512, 0)?;
            let expected = model.expr(update, &inputs, &mut 512, 0)?;
            context
                .check(&params, &[], &applied, &expected, &action.forward)
                .map_err(|e| format!("{name} journal forward proof: {e}"))?;
            let env = BTreeMap::from([("total", applied), ("saved", saved)]);
            let restored = model.expr(&action.restore, &env, &mut 512, 0)?;
            context
                .check(&params, &[], &restored, &var("total"), &action.inverse)
                .map_err(|e| format!("{name} journal inverse proof: {e}"))?;
        }
    }
    if let Some(table) = &evidence.table {
        crate::table_maintenance::verify(&context, &evidence.model, c, table)?;
    }
    Ok(())
}
