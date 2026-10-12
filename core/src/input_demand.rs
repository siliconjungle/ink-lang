//! Conservative lexical field demand for fixed pure input representation conversion.
//! Algorithm choices remain ordinary checked source. Unknown operations/calls
//! demand complete values; whole-value observations never permit field elision.
use crate::core::{Expr, Function, Program, Type};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Default)]
struct Origin {
    rows: BTreeSet<usize>,
    lists: BTreeSet<usize>,
}
impl Origin {
    fn union(&mut self, other: Self) {
        self.rows.extend(other.rows);
        self.lists.extend(other.lists);
    }
    fn elements(&self) -> Self {
        Self {
            rows: self.lists.clone(),
            lists: BTreeSet::new(),
        }
    }
    fn sequence(&self) -> Self {
        Self {
            lists: self.rows.clone(),
            rows: BTreeSet::new(),
        }
    }
}
/// None retains complete conversion. A set names every field the admitted body
/// may observe, including through callbacks and aliases. Only flat record roots
/// (or lists of records) are projected; nested field converters stay complete.
pub fn fields(function: &Function, program: &Program) -> Vec<Option<BTreeSet<String>>> {
    struct Walk<'a> {
        program: &'a Program,
        active: BTreeSet<String>,
        nodes: usize,
        demands: Vec<Option<BTreeSet<String>>>,
    }
    impl Walk<'_> {
        fn whole(&mut self, origin: &Origin) {
            for i in origin.rows.iter().chain(&origin.lists) {
                self.demands[*i] = None;
            }
        }
        fn callback(
            &mut self,
            e: &Expr,
            args: &[Origin],
            env: &BTreeMap<String, Origin>,
        ) -> Origin {
            if args.is_empty() {
                return self.visit(e, env);
            }
            let Expr::Lambda(name, body) = e else {
                for arg in args {
                    self.whole(arg);
                }
                return self.visit(e, env);
            };
            let mut local = env.clone();
            local.insert(name.clone(), args[0].clone());
            self.callback(body, &args[1..], &local)
        }
        fn visit(&mut self, e: &Expr, env: &BTreeMap<String, Origin>) -> Origin {
            self.nodes += 1;
            if self.nodes > 100_000 {
                self.demands.fill(None);
                return Origin::default();
            }
            match e {
                Expr::Var(n) => env.get(n).cloned().unwrap_or_default(),
                Expr::Field(receiver, field) => {
                    let origin = self.visit(receiver, env);
                    for i in origin.rows {
                        if let Some(fields) = &mut self.demands[i] {
                            fields.insert(field.clone());
                        }
                    }
                    // Reading a nested value converts the complete declared
                    // field, so its subsequent uses need no root provenance.
                    for i in origin.lists {
                        self.demands[i] = None;
                    }
                    Origin::default()
                }
                Expr::Let(name, _, initial, body) => {
                    let origin = self.visit(initial, env);
                    let mut local = env.clone();
                    local.insert(name.clone(), origin);
                    self.visit(body, &local)
                }
                Expr::Method(receiver, name, args)
                    if [
                        "map",
                        "filter",
                        "map_indexed",
                        "zip",
                        "take",
                        "drop",
                        "concat",
                    ]
                    .contains(&name.as_str())
                        && args.len() == if name == "zip" { 2 } else { 1 } =>
                {
                    let source = self.visit(receiver, env);
                    self.whole(&Origin {
                        rows: source.rows.clone(),
                        ..Default::default()
                    });
                    match name.as_str() {
                        "map" => self
                            .callback(&args[0], &[source.elements()], env)
                            .sequence(),
                        "map_indexed" => self
                            .callback(&args[0], &[Origin::default(), source.elements()], env)
                            .sequence(),
                        "filter" => {
                            let result = self.callback(&args[0], &[source.elements()], env);
                            self.whole(&result);
                            source
                        }
                        "zip" => {
                            let other = self.visit(&args[0], env);
                            self.whole(&Origin {
                                rows: other.rows.clone(),
                                ..Default::default()
                            });
                            self.callback(&args[1], &[source.elements(), other.elements()], env)
                                .sequence()
                        }
                        "take" | "drop" => {
                            let count = self.visit(&args[0], env);
                            self.whole(&count);
                            source
                        }
                        "concat" => {
                            let mut result = source;
                            result.union(self.visit(&args[0], env));
                            result
                        }
                        _ => unreachable!(),
                    }
                }
                Expr::Call(name, args)
                    if ["foldr", "foldl", "fold_until"].contains(&name.as_str())
                        && args.len() == if name == "fold_until" { 4 } else { 3 } =>
                {
                    let source = self.visit(&args[0], env);
                    self.whole(&Origin {
                        rows: source.rows.clone(),
                        ..Default::default()
                    });
                    let initial = self.visit(&args[1], env);
                    // The accumulator may carry input rows between iterations.
                    // Demand it completely rather than assume a fixed point.
                    self.whole(&initial);
                    if name == "fold_until" {
                        let stop =
                            self.callback(&args[2], &[source.elements(), Origin::default()], env);
                        self.whole(&stop);
                    }
                    let result = self.callback(
                        &args[args.len() - 1],
                        &[source.elements(), Origin::default()],
                        env,
                    );
                    self.whole(&result);
                    Origin::default()
                }
                Expr::Call(name, args)
                    if ["count", "length"].contains(&name.as_str()) && args.len() == 1 =>
                {
                    let source = self.visit(&args[0], env);
                    self.whole(&Origin {
                        rows: source.rows,
                        ..Default::default()
                    });
                    Origin::default()
                }
                Expr::Call(name, args) if name == "choose" && args.len() == 3 => {
                    let condition = self.visit(&args[0], env);
                    self.whole(&condition);
                    let mut result = self.visit(&args[1], env);
                    result.union(self.visit(&args[2], env));
                    result
                }
                Expr::Call(name, args)
                    if self.program.functions.iter().any(|f| &f.name == name) =>
                {
                    let inputs: Vec<_> = args.iter().map(|arg| self.visit(arg, env)).collect();
                    let function = self
                        .program
                        .functions
                        .iter()
                        .find(|f| &f.name == name)
                        .unwrap();
                    // A recursive edge or exhausted budget conservatively demands
                    // all its inputs. Top-level helpers have their own lexical scope.
                    if function.params.len() != inputs.len()
                        || self.active.len() >= 64
                        || self.active.contains(name)
                        || !bounded(&function.body)
                        || self
                            .program
                            .contracts
                            .precondition_checks
                            .contains_key(name)
                    {
                        for input in &inputs {
                            self.whole(input);
                        }
                        return Origin::default();
                    }
                    let local = function
                        .params
                        .iter()
                        .zip(inputs)
                        .map(|((param, _), input)| (param.clone(), input))
                        .collect();
                    self.active.insert(name.clone());
                    let result = self.visit(&function.body, &local);
                    self.active.remove(name);
                    result
                }
                Expr::Lambda(name, body) => {
                    let mut local = env.clone();
                    local.insert(name.clone(), Origin::default());
                    let result = self.visit(body, &local);
                    self.whole(&result);
                    Origin::default()
                }
                _ => {
                    for child in crate::analysis::children(e) {
                        let origin = self.visit(child, env);
                        self.whole(&origin);
                    }
                    Origin::default()
                }
            }
        }
    }
    if !bounded(&function.body) {
        return vec![None; function.params.len()];
    }
    let mut w = Walk {
        program,
        active: BTreeSet::from([function.name.clone()]),
        nodes: 0,
        demands: vec![None; function.params.len()],
    };
    let mut env = BTreeMap::new();
    for (i, (name, ty)) in function.params.iter().enumerate() {
        let (carrier, list) = match ty {
            Type::List(t) => (t.as_ref(), true),
            t => (t, false),
        };
        if matches!(carrier,Type::Named(n)if program.records.contains_key(n)) {
            w.demands[i] = Some(BTreeSet::new());
            env.insert(
                name.clone(),
                if list {
                    Origin {
                        lists: BTreeSet::from([i]),
                        ..Default::default()
                    }
                } else {
                    Origin {
                        rows: BTreeSet::from([i]),
                        ..Default::default()
                    }
                },
            );
        }
    }
    let result = w.visit(&function.body, &env);
    w.whole(&result);
    w.demands
}

// Check each reachable helper before recursion; the shared visit budget also
// bounds repeated expansion of a DAG. Exceeding it closes every projection.
fn bounded(body: &Expr) -> bool {
    let mut pending = vec![(body, 0usize)];
    let mut nodes = 0;
    while let Some((e, depth)) = pending.pop() {
        nodes += 1;
        if depth > 128 || nodes > 100_000 {
            return false;
        }
        pending.extend(
            crate::analysis::children(e)
                .into_iter()
                .map(|e| (e, depth + 1)),
        );
    }
    true
}
