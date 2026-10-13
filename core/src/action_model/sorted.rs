//! Strictly ascending table keys: a checked inductive invariant of the
//! projection, never an axiom.
//!
//! Every logical table is a cons list of `(key, value)` rows. Source tables are
//! ordered maps, but a projected transition is a total function on *all* such
//! lists, including unsorted ones and ones with repeated keys that no source
//! state can produce. Equalities that only hold for maps (two writers of
//! different keys commute) are false over that larger domain.
//!
//! [`SortedTables`] restricts the domain soundly. It derives one predicate per
//! table from the projection's own insertion order, and a replacement may
//! assume every table is strictly sorted only after the checker has established
//! that this is an inductive invariant of the *original* module:
//! - the initial state (all tables empty) satisfies it, by computation;
//! - every original action, from a state satisfying it, returns a state
//!   satisfying it on both observation constructors (supplied proofs).
//!
//! The selected actions equal the original ones on every such state, so they
//! preserve it too. Restored states satisfy it because portable snapshot
//! decoding rejects duplicate or unordered keys under the same key order.
use super::*;
use crate::logic::Equation;

pub const SORTED_SEMANTICS: &str = "ink-sorted-tables-v1";

/// The derived predicates. The core recomputes these; a supplied copy only
/// lets producers publish the same definitions in their bundle.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SortedTables {
    pub semantics: String,
    /// `sorted(rows) -> Bool` for each table, in root order.
    pub predicates: Vec<String>,
    pub objects: BTreeMap<String, Entry>,
}

/// Preservation proofs: for each original action, one proof per table in root
/// order of `match action(..) { Reply(.., state, ..) | Host(.., state) =>
/// sorted_i(root_i(state)) } = true`, under every table's hypothesis.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SortedProofs {
    pub actions: BTreeMap<String, Vec<Proof>>,
}

fn rename(t: &Term, map: &BTreeMap<&str, &str>) -> LangResult<Term> {
    let recurse = |x: &Term| rename(x, map);
    Ok(match t {
        Term::Var(n) => v(map.get(n.as_str()).copied().unwrap_or(n)),
        Term::Binary { op, left, right } => Term::Binary {
            op: op.clone(),
            left: Box::new(recurse(left)?),
            right: Box::new(recurse(right)?),
        },
        Term::If {
            condition,
            on_true,
            on_false,
        } => Term::If {
            condition: Box::new(recurse(condition)?),
            on_true: Box::new(recurse(on_true)?),
            on_false: Box::new(recurse(on_false)?),
        },
        Term::Call {
            function,
            arguments,
        } => Term::Call {
            function: function.clone(),
            arguments: arguments.iter().map(recurse).collect::<LangResult<_>>()?,
        },
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => Term::Construct {
            datatype: datatype.clone(),
            constructor: *constructor,
            arguments: arguments.iter().map(recurse).collect::<LangResult<_>>()?,
        },
        Term::Match {
            scrutinee,
            branches,
        } => Term::Match {
            scrutinee: Box::new(recurse(scrutinee)?),
            branches: branches
                .iter()
                .map(|b| {
                    // A renamed variable may be neither shadowed nor captured.
                    if b.bindings.iter().any(|n| {
                        map.contains_key(n.as_str()) || map.values().any(|x| *x == n.as_str())
                    }) {
                        return Err("sorted predicate binder conflict".into());
                    }
                    Ok(Branch {
                        bindings: b.bindings.clone(),
                        body: recurse(&b.body)?,
                    })
                })
                .collect::<LangResult<_>>()?,
        },
        Term::U64(_) | Term::Bool(_) => t.clone(),
        Term::SelfCall(_) => return Err("unsupported key order term".into()),
    })
}

fn free_variables(t: &Term, bound: &BTreeSet<String>, out: &mut BTreeSet<String>) {
    match t {
        Term::Var(n) => {
            if !bound.contains(n) {
                out.insert(n.clone());
            }
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            free_variables(scrutinee, bound, out);
            for b in branches {
                let mut inner = bound.clone();
                inner.extend(b.bindings.iter().cloned());
                free_variables(&b.body, &inner, out);
            }
        }
        _ => {
            for child in crate::logic::term_children(t) {
                free_variables(child, bound, out);
            }
        }
    }
}

fn declaration(e: &Entry) -> LangResult<Declaration> {
    serde_json::from_value(e.payload["declaration"].clone()).map_err(|e| e.to_string())
}

/// `root_i(state)`: the rows of one table.
pub(crate) fn root(tables: usize, index: usize, state: Term) -> Term {
    let names = (0..tables)
        .map(|i| format!("sorted_root_{i}"))
        .collect::<Vec<_>>();
    let body = v(&names[index]);
    m(state, vec![(names, body)])
}

impl Projection {
    /// Key order exactly as the projection's own `insert` decides it.
    fn insertion_order(&self, table: &Table) -> LangResult<Term> {
        let Declaration::Function { body, .. } =
            declaration(self.objects.get(&table.insert).ok_or("missing table insert")?)?
        else {
            return Err("table insert must be a function".into());
        };
        let Term::Match { branches, .. } = body else {
            return Err("unexpected table insert shape".into());
        };
        let [_, cons] = branches.as_slice() else {
            return Err("unexpected table insert shape".into());
        };
        let Term::If { condition, on_true, .. } = &cons.body else {
            return Err("unexpected table insert shape".into());
        };
        if cons.bindings != ["head", "value", "tail"] {
            return Err("unexpected table insert binders".into());
        }
        // The order must be exactly "insert `key` before `head`": the new row
        // goes first, and the condition reads only those two keys.
        let first = c(
            &table.datatype,
            1,
            vec![v("key"), v("new"), v("rows")],
        );
        if **on_true != first {
            return Err("unexpected table insert order".into());
        }
        let mut free = BTreeSet::new();
        free_variables(condition, &BTreeSet::new(), &mut free);
        if !free.iter().all(|n| n == "key" || n == "head") {
            return Err("table key order reads more than two keys".into());
        }
        rename(
            condition,
            &[("key", "bound"), ("head", "sorted_key")].into(),
        )
    }

    /// Per table, `above(rows, bound)`: keys strictly ascend and exceed
    /// `bound`; and `sorted(rows)`: keys strictly ascend. Both use exactly
    /// the projection's own insertion order.
    pub fn sorted_tables(&self) -> LangResult<SortedTables> {
        let mut objects = BTreeMap::new();
        let mut predicates = vec![];
        for table in &self.tables {
            let less = self.insertion_order(table)?;
            let rows = Sort::Data(table.datatype.clone());
            let key_sort = match declaration(
                self.objects
                    .get(&table.datatype)
                    .ok_or("missing table datatype")?,
            )? {
                Declaration::Datatype { constructors } if constructors.len() == 2 => constructors[1]
                    .fields
                    .first()
                    .cloned()
                    .ok_or("unexpected table datatype")?,
                _ => return Err("unexpected table datatype".into()),
            };
            let row = vec![
                "sorted_key".to_string(),
                "sorted_value".into(),
                "sorted_tail".into(),
            ];
            let above = Declaration::Function {
                params: vec![("rows".into(), rows.clone()), ("bound".into(), key_sort)],
                result: Sort::Bool,
                body: m(
                    v("rows"),
                    vec![
                        (vec![], Term::Bool(true)),
                        (
                            row.clone(),
                            choice(
                                less,
                                Term::SelfCall(vec![v("sorted_tail"), v("sorted_key")]),
                                Term::Bool(false),
                            ),
                        ),
                    ],
                ),
                recursive: Some(0),
            };
            let above = self.predicate(above, &mut objects)?;
            let sorted = Declaration::Function {
                params: vec![("rows".into(), rows)],
                result: Sort::Bool,
                body: m(
                    v("rows"),
                    vec![
                        (vec![], Term::Bool(true)),
                        (row, call(&above, vec![v("sorted_tail"), v("sorted_key")])),
                    ],
                ),
                recursive: None,
            };
            predicates.push(self.predicate(sorted, &mut objects)?);
        }
        Ok(SortedTables {
            semantics: SORTED_SEMANTICS.into(),
            predicates,
            objects,
        })
    }

    fn predicate(
        &self,
        d: Declaration,
        objects: &mut BTreeMap<String, Entry>,
    ) -> LangResult<String> {
        // Direct imports: everything the predicate's terms and the row fields
        // reach, so it declares in an isolated dependency context.
        let mut pending = BTreeSet::new();
        refs(
            &serde_json::to_value(&d).map_err(|e| e.to_string())?,
            &mut pending,
        );
        let mut dependencies = BTreeSet::new();
        let mut work: Vec<String> = pending.into_iter().collect();
        while let Some(i) = work.pop() {
            if dependencies.insert(i.clone()) {
                let e = match (self.objects.get(&i), objects.get(&i)) {
                    (Some(e), _) | (None, Some(e)) => e,
                    _ => return Err("sorted predicate dependency is not projected".into()),
                };
                work.extend(e.dependencies.iter().cloned());
            }
        }
        let e = Entry::from_declaration(&d, dependencies.into_iter().collect())?;
        let i = registry::identity(&e)?;
        objects.insert(i.clone(), e);
        Ok(i)
    }

    /// `sorted_i(root_i(state)) = true` for every table.
    pub fn sorted_hypotheses(&self, sorted: &SortedTables, state: Term) -> Vec<Equation> {
        sorted
            .predicates
            .iter()
            .enumerate()
            .map(|(i, p)| Equation {
                from: call(p, vec![root(self.tables.len(), i, state.clone())]),
                to: Term::Bool(true),
            })
            .collect()
    }

    /// The preservation obligation of one action for one table.
    pub fn sorted_obligation(
        &self,
        sorted: &SortedTables,
        action: &str,
        table: usize,
    ) -> LangResult<Equation> {
        let a = self.actions.get(action).ok_or("unknown action")?;
        let Sort::Data(observation) = &a.result else {
            return Err("invalid action observation".into());
        };
        let Declaration::Datatype { constructors } =
            declaration(self.objects.get(observation).ok_or("missing observation")?)?
        else {
            return Err("invalid observation datatype".into());
        };
        let state = Sort::Data(self.state.clone());
        if constructors.len() != 2
            || constructors[0].fields.len() != 5
            || constructors[0].fields[3] != state
            || constructors[1].fields.len() != 3
            || constructors[1].fields[2] != state
        {
            return Err("unexpected observation layout".into());
        }
        let predicate = &sorted.predicates[table];
        let holds = |s: &str| call(predicate, vec![root(self.tables.len(), table, v(s))]);
        let reply = ["reply", "commit", "version", "state", "events"]
            .map(|n| format!("sorted_after_{n}"))
            .to_vec();
        let host = ["code", "version", "state"]
            .map(|n| format!("sorted_host_{n}"))
            .to_vec();
        let args = a.params.iter().map(|(n, _)| v(n)).collect();
        Ok(Equation {
            from: m(
                call(&a.function, args),
                vec![
                    (reply, holds("sorted_after_state")),
                    (host, holds("sorted_host_state")),
                ],
            ),
            to: Term::Bool(true),
        })
    }

    /// Check that strictly sorted tables are an inductive invariant of this
    /// (original) projection. Replacements may then assume its hypotheses.
    pub(crate) fn check_sorted(
        &self,
        bundle: &registry::Bundle,
        context: &Context,
        proofs: &SortedProofs,
    ) -> LangResult<SortedTables> {
        let sorted = self.sorted_tables()?;
        for (i, e) in &sorted.objects {
            let actual = bundle
                .objects
                .get(i)
                .ok_or("missing sorted table predicate")?;
            if registry::canonical(e)? != registry::canonical(actual)? {
                return Err("wrong sorted table predicate".into());
            }
            context.matches_definition(i, &declaration(e)?)?;
        }
        for (predicate, table) in sorted.predicates.iter().zip(&self.tables) {
            let empty = call(predicate, vec![c(&table.datatype, 0, vec![])]);
            context
                .check(
                    &[],
                    &[],
                    &empty,
                    &Term::Bool(true),
                    &Proof::Convert {
                        from: empty.clone(),
                        to: Term::Bool(true),
                    },
                )
                .map_err(|e| format!("empty table is not sorted: {e}"))?;
        }
        if proofs.actions.keys().ne(self.actions.keys()) {
            return Err("sorted tables require a proof for exactly every action".into());
        }
        for (name, a) in &self.actions {
            let state = a.params.first().ok_or("action without state")?;
            let hypotheses = self.sorted_hypotheses(&sorted, v(&state.0));
            let tables = &proofs.actions[name];
            if tables.len() != self.tables.len() {
                return Err("sorted tables require one proof per table".into());
            }
            for (index, proof) in tables.iter().enumerate() {
                let goal = self.sorted_obligation(&sorted, name, index)?;
                context
                    .check(&a.params, &hypotheses, &goal.from, &goal.to, proof)
                    .map_err(|e| format!("action {name} table {index} sortedness: {e}"))?;
            }
        }
        Ok(sorted)
    }
}
