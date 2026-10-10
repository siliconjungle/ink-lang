//! Source-bound, total state-transition projection. Fixed semantics only;
//! replacement search and transformation laws belong to knowledge producers.
//! The current projection fails closed outside the documented executable subset.
use crate::{
    action_ir::{Body, CheckedActions, ExprType, Instruction, Kind, NodeId},
    core::CheckedModule,
    logic::{Branch, Constructor, Context, Declaration, Proof, Sort, Term},
    registry::{self, Entry},
    syntax::{ActionKind, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
mod pure;
pub const SEMANTICS: &str = "ink-action-transition-v1";
const MAX_DEFINITIONS: usize = 128;
const MAX_WORK: usize = 20_000;
fn v(n: &str) -> Term {
    Term::Var(n.into())
}
fn c(id: &str, constructor: usize, arguments: Vec<Term>) -> Term {
    Term::Construct {
        datatype: id.into(),
        constructor,
        arguments,
    }
}
fn call(id: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments,
    }
}
fn b(op: &str, left: Term, right: Term) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(left),
        right: Box::new(right),
    }
}
fn choice(condition: Term, on_true: Term, on_false: Term) -> Term {
    Term::If {
        condition: Box::new(condition),
        on_true: Box::new(on_true),
        on_false: Box::new(on_false),
    }
}
fn m(scrutinee: Term, branches: Vec<(Vec<String>, Term)>) -> Term {
    Term::Match {
        scrutinee: Box::new(scrutinee),
        branches: branches
            .into_iter()
            .map(|(bindings, body)| Branch { bindings, body })
            .collect(),
    }
}
fn id(sort: &Sort) -> LangResult<&str> {
    if let Sort::Data(id) = sort {
        Ok(id)
    } else {
        Err("expected action datatype".into())
    }
}
fn refs(value: &serde_json::Value, out: &mut BTreeSet<String>) {
    match value {
        serde_json::Value::Object(xs) => {
            for (k, v) in xs {
                if ["Data", "function", "datatype", "theorem"].contains(&k.as_str()) {
                    if let Some(n) = v.as_str() {
                        out.insert(n.into());
                    }
                }
                refs(v, out)
            }
        }
        serde_json::Value::Array(xs) => {
            for x in xs {
                refs(x, out)
            }
        }
        _ => {}
    }
}
// Public normal forms use ordinary, globally fresh binders. Kernel-internal
// alpha names are never a producer protocol or a relaxation of binder checking.
fn public_normal(t: &Term, env: &BTreeMap<String, String>, next: &mut usize) -> Term {
    let recurse = |x: &Term, n: &mut usize| public_normal(x, env, n);
    match t {
        Term::Var(n) => v(env.get(n).unwrap_or(n)),
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => c(
            datatype,
            *constructor,
            arguments.iter().map(|x| recurse(x, next)).collect(),
        ),
        Term::Call {
            function,
            arguments,
        } => call(
            function,
            arguments.iter().map(|x| recurse(x, next)).collect(),
        ),
        Term::SelfCall(xs) => Term::SelfCall(xs.iter().map(|x| recurse(x, next)).collect()),
        Term::Binary { op, left, right } => b(op, recurse(left, next), recurse(right, next)),
        Term::If {
            condition,
            on_true,
            on_false,
        } => choice(
            recurse(condition, next),
            recurse(on_true, next),
            recurse(on_false, next),
        ),
        Term::Match {
            scrutinee,
            branches,
        } => {
            let value = recurse(scrutinee, next);
            let branches = branches
                .iter()
                .map(|branch| {
                    let mut local = env.clone();
                    let names = branch
                        .bindings
                        .iter()
                        .map(|n| {
                            let fresh = format!("case_binding_{}", *next);
                            *next += 1;
                            local.insert(n.clone(), fresh.clone());
                            fresh
                        })
                        .collect();
                    (names, public_normal(&branch.body, &local, next))
                })
                .collect();
            m(value, branches)
        }
        _ => t.clone(),
    }
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Action {
    pub function: String,
    pub params: Vec<(String, Sort)>,
    pub result: Sort,
    pub case: Case,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Case {
    pub bindings: Vec<String>,
    pub params: Vec<(String, Sort)>,
    pub call: Term,
    pub normal: Term,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Table {
    pub datatype: String,
    pub get: String,
    pub contains: String,
    pub remove: String,
    pub insert: String,
    pub replace: String,
    pub value_type: Type,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Projection {
    pub schema: u32,
    pub semantics: String,
    pub source: String,
    pub state: String,
    pub events: String,
    pub types: BTreeMap<String, Sort>,
    pub tables: Vec<Table>,
    pub actions: BTreeMap<String, Action>,
    pub objects: BTreeMap<String, Entry>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Replacement {
    pub selected: serde_json::Value,
    pub proofs: BTreeMap<String, Proof>,
}
struct Lower<'a> {
    program: &'a Program,
    objects: BTreeMap<String, Entry>,
    types: BTreeMap<String, Sort>,
    active: BTreeSet<String>,
    tables: Vec<Table>,
    state: String,
    event: String,
    events: String,
    snoc: String,
    boxes: BTreeMap<String, String>,
    fresh: usize,
    work: usize,
    helpers: BTreeMap<usize, String>,
    helper_active: BTreeSet<usize>,
}
impl Lower<'_> {
    fn tick(&mut self) -> LangResult<()> {
        self.work = self.work.checked_sub(1).ok_or("action model work limit")?;
        Ok(())
    }
    fn fresh(&mut self) -> String {
        let n = format!("model_{}", self.fresh);
        self.fresh += 1;
        n
    }
    fn store(&mut self, d: Declaration) -> LangResult<String> {
        self.tick()?;
        let mut dependencies = BTreeSet::new();
        refs(
            &serde_json::to_value(&d).map_err(|e| e.to_string())?,
            &mut dependencies,
        );
        // Match field sorts are implicit. Declare them as direct imports too.
        dependencies.extend(self.types.values().filter_map(|s| {
            if let Sort::Data(i) = s {
                Some(i.clone())
            } else {
                None
            }
        }));
        for t in &self.tables {
            dependencies.insert(t.datatype.clone());
        }
        for i in [&self.state, &self.event, &self.events] {
            if !i.is_empty() {
                dependencies.insert(i.clone());
            }
        }
        let e = Entry::from_declaration(&d, dependencies.into_iter().collect())?;
        let i = registry::identity(&e)?;
        if !self.objects.contains_key(&i) && self.objects.len() >= MAX_DEFINITIONS {
            return Err("action model definition limit".into());
        }
        self.objects.insert(i.clone(), e);
        Ok(i)
    }
    fn data(&mut self, constructors: Vec<(&str, Vec<Sort>)>) -> LangResult<String> {
        self.store(Declaration::Datatype {
            constructors: constructors
                .into_iter()
                .map(|(n, fields)| Constructor {
                    name: n.into(),
                    fields,
                })
                .collect(),
        })
    }
    fn function(
        &mut self,
        params: Vec<(&str, Sort)>,
        result: Sort,
        body: Term,
        recursive: Option<usize>,
    ) -> LangResult<String> {
        self.store(Declaration::Function {
            params: params.into_iter().map(|(n, t)| (n.into(), t)).collect(),
            result,
            body,
            recursive,
        })
    }
    fn sort(&mut self, ty: &Type) -> LangResult<Sort> {
        self.tick()?;
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some(s) = self.types.get(&key) {
            return Ok(s.clone());
        }
        if !self.active.insert(key.clone()) {
            return Err("recursive action model type is unsupported".into());
        }
        let s = match ty {
            Type::U64 => Sort::U64,
            Type::Bool => Sort::Bool,
            Type::Unit => Sort::Data(self.data(vec![("Unit", vec![])])?),
            Type::Option(t) => {
                let t = self.sort(t)?;
                Sort::Data(self.data(vec![("None", vec![]), ("Some", vec![t])])?)
            }
            Type::Result(a, e) => {
                let a = self.sort(a)?;
                let e = self.sort(e)?;
                Sort::Data(self.data(vec![("Ok", vec![a]), ("Err", vec![e])])?)
            }
            Type::Named(n) => {
                if let Some(xs) = self.program.enums.get(n).cloned() {
                    Sort::Data(
                        self.store(Declaration::Datatype {
                            constructors: xs
                                .into_iter()
                                .map(|name| Constructor {
                                    name: format!("{n}_{name}"),
                                    fields: vec![],
                                })
                                .collect(),
                        })?,
                    )
                } else if let Some(fs) = self.program.records.get(n).cloned() {
                    let fields = fs
                        .iter()
                        .map(|(_, t)| self.sort(t))
                        .collect::<LangResult<_>>()?;
                    Sort::Data(self.store(Declaration::Datatype {
                        constructors: vec![Constructor {
                            name: n.clone(),
                            fields,
                        }],
                    })?)
                } else {
                    return Err("unsupported nominal action model type".into());
                }
            }
            _ => return Err(format!("unsupported action model type {ty:?}")),
        };
        self.active.remove(&key);
        self.types.insert(key, s.clone());
        Ok(s)
    }
    fn table(&mut self, value_type: &Type) -> LangResult<Table> {
        let val = self.sort(value_type)?;
        let option = self.sort(&Type::Option(Box::new(value_type.clone())))?;
        let opt = id(&option)?.to_string();
        let table = self.data(vec![
            ("Nil", vec![]),
            ("Cons", vec![Sort::U64, val.clone(), Sort::SelfType]),
        ])?;
        let ts = Sort::Data(table.clone());
        let get = self.function(
            vec![("rows", ts.clone()), ("key", Sort::U64)],
            option,
            m(
                v("rows"),
                vec![
                    (vec![], c(&opt, 0, vec![])),
                    (
                        vec!["head".into(), "value".into(), "tail".into()],
                        choice(
                            b("==", v("key"), v("head")),
                            c(&opt, 1, vec![v("value")]),
                            Term::SelfCall(vec![v("tail"), v("key")]),
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let contains = self.function(
            vec![("rows", ts.clone()), ("key", Sort::U64)],
            Sort::Bool,
            m(
                call(&get, vec![v("rows"), v("key")]),
                vec![
                    (vec![], Term::Bool(false)),
                    (vec!["value".into()], Term::Bool(true)),
                ],
            ),
            None,
        )?;
        let remove = self.function(
            vec![("rows", ts.clone()), ("key", Sort::U64)],
            ts.clone(),
            m(
                v("rows"),
                vec![
                    (vec![], c(&table, 0, vec![])),
                    (
                        vec!["head".into(), "value".into(), "tail".into()],
                        choice(
                            b("==", v("key"), v("head")),
                            Term::SelfCall(vec![v("tail"), v("key")]),
                            c(
                                &table,
                                1,
                                vec![
                                    v("head"),
                                    v("value"),
                                    Term::SelfCall(vec![v("tail"), v("key")]),
                                ],
                            ),
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let insert = self.function(
            vec![
                ("rows", ts.clone()),
                ("key", Sort::U64),
                ("new", val.clone()),
            ],
            ts.clone(),
            m(
                v("rows"),
                vec![
                    (
                        vec![],
                        c(&table, 1, vec![v("key"), v("new"), c(&table, 0, vec![])]),
                    ),
                    (
                        vec!["head".into(), "value".into(), "tail".into()],
                        choice(
                            b("<", v("key"), v("head")),
                            c(&table, 1, vec![v("key"), v("new"), v("rows")]),
                            c(
                                &table,
                                1,
                                vec![
                                    v("head"),
                                    v("value"),
                                    Term::SelfCall(vec![v("tail"), v("key"), v("new")]),
                                ],
                            ),
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let replace = self.function(
            vec![("rows", ts.clone()), ("key", Sort::U64), ("new", val)],
            ts,
            m(
                v("rows"),
                vec![
                    (vec![], c(&table, 0, vec![])),
                    (
                        vec!["head".into(), "value".into(), "tail".into()],
                        c(
                            &table,
                            1,
                            vec![
                                v("head"),
                                choice(b("==", v("key"), v("head")), v("new"), v("value")),
                                Term::SelfCall(vec![v("tail"), v("key"), v("new")]),
                            ],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        Ok(Table {
            datatype: table,
            get,
            contains,
            remove,
            insert,
            replace,
            value_type: value_type.clone(),
        })
    }
    fn bind<F>(&mut self, sort: Sort, value: Term, f: F) -> LangResult<Term>
    where
        F: FnOnce(&mut Self, Term) -> LangResult<Term>,
    {
        let key = serde_json::to_string(&sort).map_err(|e| e.to_string())?;
        let wrapper = if let Some(i) = self.boxes.get(&key) {
            i.clone()
        } else {
            let i = self.data(vec![("Bound", vec![sort])])?;
            self.boxes.insert(key, i.clone());
            i
        };
        let n = self.fresh();
        let body = f(self, v(&n))?;
        Ok(m(c(&wrapper, 0, vec![value]), vec![(vec![n], body)]))
    }
    fn root(&mut self, state: Term, index: usize) -> LangResult<Term> {
        self.tick()?;
        let names = (0..self.tables.len())
            .map(|_| self.fresh())
            .collect::<Vec<_>>();
        Ok(m(state, vec![(names.clone(), v(&names[index]))]))
    }
    fn update(&mut self, state: Term, index: usize, rows: Term) -> LangResult<Term> {
        self.tick()?;
        let names = (0..self.tables.len())
            .map(|_| self.fresh())
            .collect::<Vec<_>>();
        let fields = names
            .iter()
            .enumerate()
            .map(|(i, n)| if i == index { rows.clone() } else { v(n) })
            .collect();
        Ok(m(state, vec![(names, c(&self.state, 0, fields))]))
    }
    fn expr(
        &mut self,
        body: &Body,
        node: NodeId,
        env: &BTreeMap<usize, Term>,
        state: &Term,
    ) -> LangResult<Term> {
        self.tick()?;
        let n = &body.nodes[node];
        let ty = if let ExprType::Value(t) = &n.ty {
            t
        } else {
            return Err("action model lambda is unsupported".into());
        };
        match &n.kind {
            Kind::Number(n) if *ty == Type::U64 => Ok(Term::U64(*n)),
            Kind::Bool(x) => Ok(Term::Bool(*x)),
            Kind::Unit => {
                let s = self.sort(ty)?;
                Ok(c(id(&s)?, 0, vec![]))
            }
            Kind::None => {
                let s = self.sort(ty)?;
                Ok(c(id(&s)?, 0, vec![]))
            }
            Kind::Local(s) => env
                .get(s)
                .cloned()
                .ok_or("uninitialised action model slot".into()),
            Kind::Enum { variant, .. } => {
                let s = self.sort(ty)?;
                Ok(c(id(&s)?, *variant, vec![]))
            }
            Kind::Record { name, fields } => {
                let mut values = BTreeMap::new();
                for (i, n) in fields {
                    values.insert(*i, self.expr(body, *n, env, state)?);
                }
                let count = self.program.records[name].len();
                let s = self.sort(ty)?;
                Ok(c(
                    id(&s)?,
                    0,
                    (0..count)
                        .map(|i| values.remove(&i).expect("checked record"))
                        .collect(),
                ))
            }
            Kind::Field {
                record,
                receiver,
                field,
            } => {
                let r = self.expr(body, *receiver, env, state)?;
                let names = (0..self.program.records[record].len())
                    .map(|_| self.fresh())
                    .collect::<Vec<_>>();
                Ok(m(r, vec![(names.clone(), v(&names[*field]))]))
            }
            Kind::Binary { op, left, right } => {
                let lhs = self.expr(body, *left, env, state)?;
                let rhs = self.expr(body, *right, env, state)?;
                let t = &body.nodes[*left].ty;
                if !matches!(t, ExprType::Value(Type::U64 | Type::Bool)) {
                    return Err("non-word action model operator is unsupported".into());
                }
                Ok(b(op, lhs, rhs))
            }
            Kind::And { left, right } | Kind::Or { left, right } => {
                let lhs = self.expr(body, *left, env, state)?;
                let rhs = self.expr(body, *right, env, state)?;
                Ok(if matches!(n.kind, Kind::And { .. }) {
                    choice(lhs, rhs, Term::Bool(false))
                } else {
                    choice(lhs, Term::Bool(true), rhs)
                })
            }
            Kind::Builtin { name, arguments } if ["Ok", "Err", "Some"].contains(&name.as_str()) => {
                let xs = arguments
                    .iter()
                    .map(|n| self.expr(body, *n, env, state))
                    .collect::<LangResult<_>>()?;
                let s = self.sort(ty)?;
                Ok(c(id(&s)?, usize::from(name == "Err" || name == "Some"), xs))
            }
            Kind::Table {
                root,
                method,
                arguments,
            } if method == "get" || method == "contains" => {
                let args = arguments
                    .iter()
                    .map(|n| self.expr(body, *n, env, state))
                    .collect::<LangResult<Vec<_>>>()?;
                let rows = self.root(state.clone(), *root)?;
                let t = &self.tables[*root];
                Ok(call(
                    if method == "get" { &t.get } else { &t.contains },
                    vec![rows, args[0].clone()],
                ))
            }
            Kind::PureCall {
                function,
                arguments,
            } => {
                let xs = arguments
                    .iter()
                    .map(|n| self.expr(body, *n, env, state))
                    .collect::<LangResult<Vec<_>>>()?;
                let f = self.pure_function(*function)?;
                Ok(call(&f, xs))
            }
            _ => Err(format!(
                "unsupported action transition expression: {:?}",
                n.kind
            )),
        }
    }
    fn host(&self, observation: &str, code: u64) -> Term {
        c(
            observation,
            1,
            vec![Term::U64(code), v("version"), v("initial")],
        )
    }
    fn finish(
        &mut self,
        result: Term,
        state: Term,
        events: Term,
        kind: &ActionKind,
        result_type: &Type,
        observation: &str,
    ) -> LangResult<Term> {
        let empty = c(&self.events, 0, vec![]);
        if *kind == ActionKind::Query {
            return Ok(c(
                observation,
                0,
                vec![result, Term::Bool(false), v("version"), v("initial"), empty],
            ));
        }
        let Sort::Data(result_id) = self.sort(result_type)? else {
            return Err("change result carrier".into());
        };
        Ok(m(
            result,
            vec![
                (
                    vec!["returned".into()],
                    choice(
                        b("==", v("version"), Term::U64(u64::MAX)),
                        self.host(observation, 1),
                        c(
                            observation,
                            0,
                            vec![
                                c(&result_id, 0, vec![v("returned")]),
                                Term::Bool(true),
                                b("+", v("version"), Term::U64(1)),
                                state,
                                events,
                            ],
                        ),
                    ),
                ),
                (
                    vec!["error".into()],
                    c(
                        observation,
                        0,
                        vec![
                            c(&result_id, 1, vec![v("error")]),
                            Term::Bool(false),
                            v("version"),
                            v("initial"),
                            empty,
                        ],
                    ),
                ),
            ],
        ))
    }
    fn block(
        &mut self,
        body: &Body,
        instructions: &[Instruction],
        env: BTreeMap<usize, Term>,
        state: Term,
        events: Term,
        kind: &ActionKind,
        result_type: &Type,
        observation: &str,
        depth: usize,
    ) -> LangResult<Term> {
        if depth > 32 {
            return Err("action transition continuation depth limit".into());
        }
        self.tick()?;
        let Some((first, tail)) = instructions.split_first() else {
            return Ok(self.host(observation, 3));
        };
        match first {
            Instruction::Return(n) => {
                let value = self.expr(body, *n, &env, &state)?;
                self.finish(value, state, events, kind, result_type, observation)
            }
            Instruction::Let { slot, value, .. } => {
                let value = self.expr(body, *value, &env, &state)?;
                let s = self.sort(&body.slots[*slot].ty)?;
                self.bind(s, value, |this, value| {
                    let mut env = env;
                    env.insert(*slot, value);
                    this.block(
                        body,
                        tail,
                        env,
                        state,
                        events,
                        kind,
                        result_type,
                        observation,
                        depth + 1,
                    )
                })
            }
            Instruction::Emit { channel, value } => {
                let value = self.expr(body, *value, &env, &state)?;
                let index = self
                    .program
                    .events
                    .keys()
                    .position(|n| n == channel)
                    .expect("checked event");
                let next = call(&self.snoc, vec![events, c(&self.event, index, vec![value])]);
                self.bind(Sort::Data(self.events.clone()), next, |this, events| {
                    this.block(
                        body,
                        tail,
                        env,
                        state,
                        events,
                        kind,
                        result_type,
                        observation,
                        depth + 1,
                    )
                })
            }
            Instruction::If {
                condition,
                on_true,
                on_false,
            } => {
                let test = self.expr(body, *condition, &env, &state)?;
                let mut yes = on_true.clone();
                yes.extend_from_slice(tail);
                let mut no = on_false.clone();
                no.extend_from_slice(tail);
                let a = self.block(
                    body,
                    &yes,
                    env.clone(),
                    state.clone(),
                    events.clone(),
                    kind,
                    result_type,
                    observation,
                    depth + 1,
                )?;
                let z = self.block(
                    body,
                    &no,
                    env,
                    state,
                    events,
                    kind,
                    result_type,
                    observation,
                    depth + 1,
                )?;
                Ok(choice(test, a, z))
            }
            Instruction::Eval(n) => {
                if let Kind::Table {
                    root,
                    method,
                    arguments,
                } = &body.nodes[*n].kind
                {
                    if ["insert", "replace", "remove"].contains(&method.as_str()) {
                        let args = arguments
                            .iter()
                            .map(|n| self.expr(body, *n, &env, &state))
                            .collect::<LangResult<Vec<_>>>()?;
                        let rows = self.root(state.clone(), *root)?;
                        let t = self.tables[*root].clone();
                        let fun = match method.as_str() {
                            "insert" => &t.insert,
                            "replace" => &t.replace,
                            _ => &t.remove,
                        };
                        let mut xs = vec![rows.clone()];
                        xs.extend(args.clone());
                        let next = self.update(state, *root, call(fun, xs))?;
                        let continuation =
                            self.bind(Sort::Data(self.state.clone()), next, |this, state| {
                                this.block(
                                    body,
                                    tail,
                                    env,
                                    state,
                                    events,
                                    kind,
                                    result_type,
                                    observation,
                                    depth + 1,
                                )
                            })?;
                        return Ok(if method == "remove" {
                            continuation
                        } else {
                            let present = call(&t.contains, vec![rows, args[0].clone()]);
                            if method == "insert" {
                                choice(present, self.host(observation, 2), continuation)
                            } else {
                                choice(present, continuation, self.host(observation, 2))
                            }
                        });
                    }
                }
                self.expr(body, *n, &env, &state)?;
                self.block(
                    body,
                    tail,
                    env,
                    state,
                    events,
                    kind,
                    result_type,
                    observation,
                    depth + 1,
                )
            }
        }
    }
}
impl Projection {
    pub fn derive(module: &CheckedModule) -> LangResult<Self> {
        let actions = CheckedActions::elaborate(module)?;
        let mut nodes = 0usize;
        for i in 0..module.program().actions.len() {
            nodes = nodes
                .checked_add(actions.action(i).expect("checked action").nodes.len())
                .ok_or("action model node limit")?;
        }
        if nodes > 2048 {
            return Err("action model node limit".into());
        }
        let p = module.program();
        let mut l = Lower {
            program: p,
            objects: BTreeMap::new(),
            types: BTreeMap::new(),
            active: BTreeSet::new(),
            tables: vec![],
            state: String::new(),
            event: String::new(),
            events: String::new(),
            snoc: String::new(),
            boxes: BTreeMap::new(),
            fresh: 0,
            work: MAX_WORK,
            helpers: BTreeMap::new(),
            helper_active: BTreeSet::new(),
        };
        // Domain validation includes unused signatures; an unsupported value may
        // not acquire authority just because a branch happens not to evaluate it.
        for a in &p.actions {
            for (_, t) in &a.params {
                l.sort(t)?;
            }
            l.sort(&a.result)?;
        }
        for t in p.events.values() {
            l.sort(t)?;
        }
        for root in &p.states {
            let Type::Table(k, value) = &root.ty else {
                return Err("action model state must be a table".into());
            };
            if **k != Type::U64 {
                return Err("action model table keys currently require u64".into());
            }
            let t = l.table(value)?;
            l.tables.push(t);
        }
        l.state = l.data(vec![(
            "State",
            l.tables
                .iter()
                .map(|t| Sort::Data(t.datatype.clone()))
                .collect(),
        )])?;
        let mut events = vec![];
        for (n, t) in &p.events {
            events.push(Constructor {
                name: n.clone(),
                fields: vec![l.sort(t)?],
            });
        }
        // No channels still has an uninhabited-by-source marker so lists exist.
        if events.is_empty() {
            events.push(Constructor {
                name: "NoSourceEvent".into(),
                fields: vec![],
            });
        }
        l.event = l.store(Declaration::Datatype {
            constructors: events,
        })?;
        l.events = l.data(vec![
            ("Nil", vec![]),
            ("Cons", vec![Sort::Data(l.event.clone()), Sort::SelfType]),
        ])?;
        l.snoc = l.function(
            vec![
                ("events", Sort::Data(l.events.clone())),
                ("event", Sort::Data(l.event.clone())),
            ],
            Sort::Data(l.events.clone()),
            m(
                v("events"),
                vec![
                    (
                        vec![],
                        c(&l.events, 1, vec![v("event"), c(&l.events, 0, vec![])]),
                    ),
                    (
                        vec!["head".into(), "tail".into()],
                        c(
                            &l.events,
                            1,
                            vec![v("head"), Term::SelfCall(vec![v("tail"), v("event")])],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let mut descriptions = BTreeMap::new();
        for (index, a) in p.actions.iter().enumerate() {
            let result = l.sort(&a.result)?;
            let observation = l.data(vec![
                (
                    "Reply",
                    vec![
                        result,
                        Sort::Bool,
                        Sort::U64,
                        Sort::Data(l.state.clone()),
                        Sort::Data(l.events.clone()),
                    ],
                ),
                (
                    "Host",
                    vec![Sort::U64, Sort::U64, Sort::Data(l.state.clone())],
                ),
            ])?;
            let mut params = vec![
                ("initial".into(), Sort::Data(l.state.clone())),
                ("version".into(), Sort::U64),
            ];
            let mut env = BTreeMap::new();
            for (i, (_, t)) in a.params.iter().enumerate() {
                let n = format!("arg_{i}");
                params.push((n.clone(), l.sort(t)?));
                env.insert(i, v(&n));
            }
            let term = l.block(
                actions.action(index).expect("checked action"),
                &actions.action(index).unwrap().instructions,
                env,
                v("initial"),
                c(&l.events, 0, vec![]),
                &a.kind,
                &a.result,
                &observation,
                0,
            )?;
            let function = l.store(Declaration::Function {
                params: params.clone(),
                result: Sort::Data(observation.clone()),
                body: term,
                recursive: None,
            })?;
            descriptions.insert(
                a.name.clone(),
                Action {
                    function,
                    params,
                    result: Sort::Data(observation),
                    case: Case {
                        bindings: vec![],
                        params: vec![],
                        call: Term::Bool(false),
                        normal: Term::Bool(false),
                    },
                },
            );
        }
        let mut out = Self {
            schema: 1,
            semantics: SEMANTICS.into(),
            source: module.identity()?,
            state: l.state,
            events: l.events,
            types: l.types,
            tables: l.tables,
            actions: descriptions,
            objects: l.objects,
        };
        if registry::canonical(&out)?.len() > crate::core::MAX_BYTES {
            return Err("action model byte limit".into());
        }
        let context = out.context()?;
        let mut case_bytes = crate::core::MAX_BYTES;
        for a in out.actions.values_mut() {
            let bindings = (0..out.tables.len())
                .map(|i| format!("rows_{i}"))
                .collect::<Vec<_>>();
            let mut params = bindings
                .iter()
                .zip(&out.tables)
                .map(|(n, t)| (n.clone(), Sort::Data(t.datatype.clone())))
                .collect::<Vec<_>>();
            params.extend_from_slice(&a.params[1..]);
            let mut arguments = vec![c(&out.state, 0, bindings.iter().map(|n| v(n)).collect())];
            arguments.extend(a.params[1..].iter().map(|(n, _)| v(n)));
            let application = call(&a.function, arguments);
            let normal = public_normal(
                &context.evaluate(&params, &application)?,
                &BTreeMap::new(),
                &mut 0,
            );
            let case = Case {
                bindings,
                params,
                call: application,
                normal,
            };
            case_bytes = case_bytes
                .checked_sub(registry::canonical(&case)?.len())
                .ok_or("action model case byte limit")?;
            a.case = case;
        }
        if registry::canonical(&out)?.len() > crate::core::MAX_BYTES {
            return Err("action model byte limit".into());
        }
        Ok(out)
    }
    fn reachable(&self) -> LangResult<BTreeSet<String>> {
        let mut pending = self
            .actions
            .values()
            .map(|a| a.function.clone())
            .collect::<Vec<_>>();
        let mut used = BTreeSet::new();
        while let Some(i) = pending.pop() {
            if used.insert(i.clone()) {
                let e = self.objects.get(&i).ok_or("missing projected dependency")?;
                pending.extend(e.dependencies.iter().cloned());
            }
        }
        Ok(used)
    }
    /// A local definition check, with no catalogue, native backend or planner.
    pub fn context(&self) -> LangResult<Context> {
        let mut c = Context::default();
        let mut pending = self.objects.clone();
        while !pending.is_empty() {
            let ready = pending
                .iter()
                .filter(|(_, e)| e.dependencies.iter().all(|i| !pending.contains_key(i)))
                .map(|(i, _)| i.clone())
                .collect::<Vec<_>>();
            if ready.is_empty() {
                return Err("cyclic action model definitions".into());
            }
            for i in ready {
                let e = pending.remove(&i).unwrap();
                let d: Declaration = serde_json::from_value(e.payload["declaration"].clone())
                    .map_err(|e| e.to_string())?;
                let mut local = c.subset(&e.dependencies)?;
                local.declare(i.clone(), &d)?;
                c.import(&local, &i)?;
            }
        }
        Ok(c)
    }
}
/// Compare complete transitions over every logical state, version and argument.
/// This is source correspondence; host codecs and generated native code remain
/// in the disclosed trust boundary. Resource-exhaustion behaviour is not equated.
pub(crate) fn check(
    module: &CheckedModule,
    bundle: &registry::Bundle,
    r: &Replacement,
) -> LangResult<CheckedModule> {
    let selected =
        CheckedModule::from_bytes(&serde_json::to_vec(&r.selected).map_err(|e| e.to_string())?)?;
    let mut original = module.program().clone();
    original.actions = selected.program().actions.clone();
    for (old, new) in module
        .program()
        .actions
        .iter()
        .zip(&selected.program().actions)
    {
        let mut old = old.clone();
        old.body = new.body.clone();
        if serde_json::to_vec(&old).map_err(|e| e.to_string())?
            != serde_json::to_vec(new).map_err(|e| e.to_string())?
        {
            return Err("action replacement changes the public interface".into());
        }
    }
    if module.program().actions.len() != selected.program().actions.len()
        || serde_json::to_vec(&original).map_err(|e| e.to_string())?
            != serde_json::to_vec(selected.program()).map_err(|e| e.to_string())?
    {
        return Err("action replacement changes non-action source".into());
    }
    let before = Projection::derive(module)?;
    let after = Projection::derive(&selected)?;
    let checked = registry::CheckedBundle::check(bundle)?;
    let context = checked.first_order_context()?;
    for projection in [&before, &after] {
        for i in projection.reachable()? {
            let e = &projection.objects[&i];
            let actual = bundle
                .objects
                .get(&i)
                .ok_or("missing source-bound transition definition")?;
            if registry::canonical(e)? != registry::canonical(actual)? {
                return Err("wrong source transition definition".into());
            }
            let d: Declaration = serde_json::from_value(e.payload["declaration"].clone())
                .map_err(|e| e.to_string())?;
            context.matches_definition(&i, &d)?;
        }
    }
    if r.proofs.keys().ne(before.actions.keys()) {
        return Err("action replacement requires exactly every action proof".into());
    }
    for (name, a) in &before.actions {
        let z = &after.actions[name];
        if a.params != z.params || a.result != z.result {
            return Err("action transition signature changed".into());
        }
        if !bundle.roots.contains(&a.function) || !bundle.roots.contains(&z.function) {
            return Err("source transition must be an enabled database root".into());
        }
        let args = a.params.iter().map(|(n, _)| v(n)).collect::<Vec<_>>();
        context
            .check(
                &a.params,
                &[],
                &call(&a.function, args.clone()),
                &call(&z.function, args),
                &r.proofs[name],
            )
            .map_err(|e| format!("action {name}: {e}"))?;
    }
    Ok(selected)
}

/// Actual theorem references in the supplied proof terms, rather than action
/// names or every unused theorem in the authenticated view.
pub(crate) fn used_theorems(
    proofs: &BTreeMap<String, Proof>,
    bundle: &registry::Bundle,
) -> LangResult<Vec<String>> {
    let mut references = BTreeSet::new();
    for p in proofs.values() {
        refs(
            &serde_json::to_value(p).map_err(|e| e.to_string())?,
            &mut references,
        );
    }
    Ok(references
        .into_iter()
        .filter(|i| {
            bundle
                .objects
                .get(i)
                .is_some_and(|e| e.kind == registry::Kind::Theorem)
        })
        .collect())
}
