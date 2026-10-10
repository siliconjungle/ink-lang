//! Reference execution for stateful language programs. Writes use an undo journal.
use crate::{syntax::*, LangResult};
use num_bigint::BigInt;
use num_traits::ToPrimitive;
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::BTreeMap;
#[path = "stateful_actions.rs"]
mod actions;

#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Value {
    Unit,
    Bool(bool),
    U32(u32),
    U64(u64),
    Int(BigInt),
    String(String),
    Id(String, u128),
    Record(String, BTreeMap<String, Value>),
    Enum(String, String),
    Option(Option<Box<Value>>),
    Result(bool, Box<Value>),
    List(Vec<Value>),
}
impl Value {
    fn ty(&self) -> Type {
        match self {
            Self::Unit => Type::Unit,
            Self::Bool(_) => Type::Bool,
            Self::U32(_) => Type::U32,
            Self::U64(_) => Type::U64,
            Self::Int(_) => Type::Int,
            Self::String(_) => Type::String,
            Self::Id(n, _) | Self::Record(n, _) | Self::Enum(n, _) => Type::Named(n.clone()),
            Self::Option(v) => Type::Option(Box::new(
                v.as_ref().map(|v| v.ty()).unwrap_or(Type::Unknown),
            )),
            Self::Result(ok, v) => {
                if *ok {
                    Type::Result(Box::new(v.ty()), Box::new(Type::Unknown))
                } else {
                    Type::Result(Box::new(Type::Unknown), Box::new(v.ty()))
                }
            }
            Self::List(xs) => {
                Type::List(Box::new(xs.first().map(Value::ty).unwrap_or(Type::Unknown)))
            }
        }
    }
    pub fn json(&self) -> serde_json::Value {
        use serde_json::json;
        match self {
            Self::Unit => serde_json::Value::Null,
            Self::Bool(v) => json!(v),
            Self::U32(v) => json!(v),
            Self::U64(v) => json!(v),
            Self::Int(v) => json!({"Int":v.to_string()}),
            Self::String(v) => json!(v),
            Self::Id(_, v) => json!(format!("{v:032x}")),
            Self::Record(_, fs) => fs.iter().map(|(k, v)| (k.clone(), v.json())).collect(),
            Self::Enum(t, v) => json!(format!("{t}.{v}")),
            Self::Option(v) => {
                if let Some(v) = v {
                    json!({"Some":v.json()})
                } else {
                    json!({"None":null})
                }
            }
            Self::Result(ok, v) => {
                if *ok {
                    json!({"Ok":v.json()})
                } else {
                    json!({"Err":v.json()})
                }
            }
            Self::List(xs) => xs.iter().map(Self::json).collect(),
        }
    }
    pub fn from_json(v: &serde_json::Value, t: &Type, p: &Program) -> LangResult<Self> {
        match t {
            Type::Unit if v.is_null() => Ok(Self::Unit),
            Type::Bool => v.as_bool().map(Self::Bool).ok_or("expected Bool".into()),
            Type::U32 => v
                .as_u64()
                .and_then(|v| v.try_into().ok())
                .map(Self::U32)
                .ok_or("expected u32".into()),
            Type::U64 => v.as_u64().map(Self::U64).ok_or("expected u64".into()),
            Type::Int => {
                let text = v
                    .get("Int")
                    .and_then(|v| v.as_str())
                    .map(str::to_owned)
                    .unwrap_or_else(|| v.to_string());
                text.parse::<BigInt>()
                    .map(Self::Int)
                    .map_err(|_| "expected exact integer".into())
            }
            Type::String => v
                .as_str()
                .map(|s| Self::String(s.into()))
                .ok_or("expected String".into()),
            Type::Named(n) if p.ids.contains(n) => {
                let text = v
                    .as_str()
                    .ok_or("ID must be a 32-digit hexadecimal string")?;
                if text.len() != 32 || !text.bytes().all(|b| b.is_ascii_hexdigit()) {
                    return Err("ID must be a 32-digit hexadecimal string".into());
                }
                Ok(Self::Id(
                    n.clone(),
                    u128::from_str_radix(text, 16).map_err(|e| e.to_string())?,
                ))
            }
            Type::Named(n) if p.records.contains_key(n) => {
                let object = v.as_object().ok_or("expected record object")?;
                let fields = &p.records[n];
                if object.len() != fields.len() {
                    return Err(format!("record {n} field count mismatch"));
                }
                let mut out = BTreeMap::new();
                for (f, t) in fields {
                    out.insert(
                        f.clone(),
                        Self::from_json(
                            object.get(f).ok_or_else(|| format!("missing {n}.{f}"))?,
                            t,
                            p,
                        )?,
                    );
                }
                Ok(Self::Record(n.clone(), out))
            }
            Type::Named(n) if p.enums.contains_key(n) => {
                let s = v.as_str().ok_or("expected enum string")?;
                let prefix = format!("{n}.");
                let variant = s.strip_prefix(&prefix).ok_or("enum type mismatch")?;
                if !p.enums[n].iter().any(|v| v == variant) {
                    return Err("unknown enum variant".into());
                }
                Ok(Self::Enum(n.clone(), variant.into()))
            }
            Type::List(t) => v
                .as_array()
                .ok_or("expected list")?
                .iter()
                .map(|x| Self::from_json(x, t, p))
                .collect::<LangResult<Vec<_>>>()
                .map(Self::List),
            Type::Option(t) => {
                let obj = v.as_object().ok_or("expected Option object")?;
                if obj.len() != 1 {
                    return Err("Option requires one tag".into());
                }
                if let Some(x) = obj.get("Some") {
                    Ok(Self::Option(Some(Box::new(Self::from_json(x, t, p)?))))
                } else if obj.get("None").is_some_and(|x| x.is_null()) {
                    Ok(Self::Option(None))
                } else {
                    Err("invalid Option tag".into())
                }
            }
            Type::Result(a, b) => {
                let obj = v.as_object().ok_or("expected Result object")?;
                if obj.len() != 1 {
                    return Err("Result requires one tag".into());
                }
                if let Some(x) = obj.get("Ok") {
                    Ok(Self::Result(true, Box::new(Self::from_json(x, a, p)?)))
                } else if let Some(x) = obj.get("Err") {
                    Ok(Self::Result(false, Box::new(Self::from_json(x, b, p)?)))
                } else {
                    Err("invalid Result tag".into())
                }
            }
            _ => Err(format!("unsupported ingress type {t:?}")),
        }
    }
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub struct Event {
    pub commit: u64,
    pub position: u64,
    pub channel: String,
    pub value: Value,
}
#[derive(Clone, Debug)]
pub struct Outcome {
    pub result: Value,
    pub committed: bool,
    pub version: u64,
    pub events: Vec<Event>,
}
impl Outcome {
    pub fn json(&self) -> serde_json::Value {
        serde_json::json!({"result":self.result.json(),"committed":self.committed,"version":self.version,"events":self.events.iter().map(|e|serde_json::json!({"commit":e.commit,"position":e.position,"channel":e.channel,"value":e.value.json()})).collect::<Vec<_>>()})
    }
}

#[derive(Debug)]
enum Failure {
    Abort(Value),
    Host(String),
}
impl From<String> for Failure {
    fn from(s: String) -> Self {
        Self::Host(s)
    }
}
impl From<&str> for Failure {
    fn from(s: &str) -> Self {
        Self::Host(s.into())
    }
}
type Exec<T> = Result<T, Failure>;
type Env = BTreeMap<String, Value>;
type Table = BTreeMap<Value, Value>;
struct Undo {
    root: String,
    key: Value,
    old: Option<Value>,
    cached: Vec<(String, crate::aggregate::CacheUndo)>,
}
struct Cached {
    plan: crate::aggregate::Plan,
    total: BigInt,
}

pub struct Runtime {
    program: Program,
    selected_layout: Option<crate::snapshot_wire::Layout>,
    action_ir: crate::action_ir::CheckedActions,
    effects: crate::effects::CheckedEffects,
    last_body_path: Option<crate::effects::Path>,
    action_bodies: Vec<std::sync::Arc<crate::action_ir::Body>>,
    keep_bodies: Vec<std::sync::Arc<crate::action_ir::Body>>,
    tables: BTreeMap<String, Table>,
    version: u64,
    outbox: Vec<Event>,
    undo: Vec<Undo>,
    staged: Vec<(String, Value)>,
    fuel: u64,
    cached: BTreeMap<String, Cached>,
    certificate: Option<crate::aggregate::Certificate>,
}
impl Runtime {
    pub fn new(program: Program) -> LangResult<Self> {
        let module = crate::core::CheckedModule::from_source(program.clone())?;
        let action_ir = crate::action_ir::CheckedActions::elaborate(&module)?;
        let action_bodies = (0..program.actions.len())
            .map(|i| std::sync::Arc::new(action_ir.action(i).expect("checked action").clone()))
            .collect();
        let keep_bodies = (0..program.keeps.len())
            .map(|i| std::sync::Arc::new(action_ir.keep(i).expect("checked keep").clone()))
            .collect();
        let effects = crate::effects::CheckedEffects::derive(&action_ir)?;
        let tables = program
            .states
            .iter()
            .map(|d| (d.name.clone(), Table::new()))
            .collect();
        Ok(Self {
            program,
            selected_layout: None,
            action_ir,
            effects,
            last_body_path: None,
            action_bodies,
            keep_bodies,
            tables,
            version: 0,
            outbox: vec![],
            undo: vec![],
            staged: vec![],
            fuel: 0,
            cached: BTreeMap::new(),
            certificate: None,
        })
    }
    pub fn new_selected(selection: &crate::optimisation::CheckedSelection) -> LangResult<Self> {
        let layout = crate::snapshot::selected_layout(selection)?;
        let mut rt = Self::new(selection.module().program().clone())?;
        rt.selected_layout = Some(layout);
        Ok(rt)
    }
    fn portable_layout(&self) -> LangResult<crate::snapshot_wire::Layout> {
        self.selected_layout
            .clone()
            .map_or_else(|| crate::snapshot::layout(&self.program), Ok)
    }
    pub fn action_ir(&self) -> &crate::action_ir::CheckedActions {
        &self.action_ir
    }
    pub fn effects(&self) -> &crate::effects::CheckedEffects {
        &self.effects
    }
    /// Observed prefix effects before commit/rollback of the last body.
    /// Diagnostic data, not proof or replacement authority.
    pub fn last_body_path(&self) -> Option<crate::effects::Path> {
        self.last_body_path
    }
    pub fn version(&self) -> u64 {
        self.version
    }
    pub fn program(&self) -> &Program {
        &self.program
    }
    pub fn outbox(&self) -> &[Event] {
        &self.outbox
    }
    pub fn maintained_values(&self) -> Vec<String> {
        self.cached.keys().cloned().collect()
    }
    pub fn enable_maintenance(
        &mut self,
        c: crate::aggregate::Certificate,
    ) -> LangResult<Vec<String>> {
        if !self.undo.is_empty() || !self.staged.is_empty() {
            return Err("implementation selection requires a transaction boundary".into());
        }
        crate::aggregate::verify(&c)?;
        self.fuel = 100_000_000;
        let mut candidates = BTreeMap::new();
        for keep in self.program.keeps.clone() {
            if let Some(plan) = crate::aggregate::plan_with_certificate(&self.program, &keep, &c) {
                let rows = self
                    .tables
                    .get(&plan.root)
                    .ok_or("aggregate root is not a table")?
                    .values()
                    .cloned()
                    .collect::<Vec<_>>();
                let mut total = BigInt::from(0);
                for row in rows {
                    total += self.contribution(&plan, row).map_err(|e| match e {
                        Failure::Host(s) => s,
                        Failure::Abort(_) => "unexpected error from total projection".into(),
                    })?;
                }
                candidates.insert(keep.name, Cached { plan, total });
            }
        }
        self.cached = candidates;
        self.certificate = Some(c);
        Ok(self.maintained_values())
    }
    pub fn disable_maintenance(&mut self) -> LangResult<()> {
        if !self.undo.is_empty() || !self.staged.is_empty() {
            return Err("implementation selection requires a transaction boundary".into());
        }
        self.cached.clear();
        self.certificate = None;
        Ok(())
    }
    fn contribution(&mut self, plan: &crate::aggregate::Plan, mut value: Value) -> Exec<BigInt> {
        for (op, var, body) in &plan.stages {
            let env = [(var.clone(), value.clone())].into();
            let out = self.expr(body, &env)?;
            if op == "filter" {
                match out {
                    Value::Bool(false) => return Ok(BigInt::from(0)),
                    Value::Bool(true) => {}
                    _ => return Err("invalid aggregate predicate".into()),
                }
            } else {
                value = out;
            }
        }
        if plan.count {
            return Ok(BigInt::from(1));
        }
        if let Value::Int(n) = value {
            Ok(n)
        } else {
            Err("exact-sum plan requires Int contribution".into())
        }
    }
    pub fn acknowledge_through(&mut self, commit: u64, position: u64) {
        self.outbox
            .retain(|e| (e.commit, e.position) > (commit, position));
    }
    pub fn invoke_json(&mut self, name: &str, args: &serde_json::Value) -> LangResult<Outcome> {
        self.last_body_path = None;
        let a = self
            .program
            .actions
            .iter()
            .find(|a| a.name == name)
            .ok_or_else(|| format!("unknown action {name}"))?;
        let args = args.as_array().ok_or("arguments must be an array")?;
        if args.len() != a.params.len() {
            return Err("argument count mismatch".into());
        }
        let vals = args
            .iter()
            .zip(&a.params)
            .map(|(v, (_, t))| Value::from_json(v, t, &self.program))
            .collect::<LangResult<Vec<_>>>()?;
        self.invoke(name, vals)
    }
    pub fn invoke(&mut self, name: &str, args: Vec<Value>) -> LangResult<Outcome> {
        self.last_body_path = None;
        let index = self
            .program
            .actions
            .iter()
            .position(|a| a.name == name)
            .ok_or_else(|| format!("unknown action {name}"))?;
        let action = &self.program.actions[index];
        let kind = action.kind.clone();
        if args.len() != action.params.len() {
            return Err("argument count mismatch".into());
        }
        let args = args
            .into_iter()
            .zip(&action.params)
            .map(|(v, (_, t))| self.coerce(v, t))
            .collect::<LangResult<Vec<_>>>()?;
        self.fuel = 100_000_000;
        self.undo.clear();
        self.staged.clear();
        let result = self.typed_action(index, args, false);
        use crate::effects::{Exit, Path, ValueShape};
        let (exit, value) = match &result {
            Ok(v) => (
                Exit::Return,
                match v {
                    Value::Bool(false) => ValueShape::False,
                    Value::Bool(true) => ValueShape::True,
                    Value::Result(true, _) => ValueShape::Ok,
                    Value::Result(false, _) => ValueShape::Err,
                    Value::Option(None) => ValueShape::None,
                    Value::Option(Some(_)) => ValueShape::Some,
                    _ => ValueShape::Other,
                },
            ),
            Err(Failure::Abort(_)) => (Exit::Abort, ValueShape::Other),
            Err(Failure::Host(_)) => (Exit::Host, ValueShape::Other),
        };
        self.last_body_path = Some(Path {
            written: !self.undo.is_empty(),
            emitted: !self.staged.is_empty(),
            exit,
            value,
        });

        match result {
            Ok(v) if kind == ActionKind::Query => {
                self.rollback();
                Ok(Outcome {
                    result: v,
                    committed: false,
                    version: self.version,
                    events: vec![],
                })
            }
            Ok(Value::Result(succeeded, v)) => {
                let next = match crate::transaction::decide(self.version, succeeded) {
                    crate::transaction::Decision::Commit { version } => version,
                    crate::transaction::Decision::Exhausted => {
                        self.rollback();
                        return Err("commit sequence exhausted".into());
                    }
                    crate::transaction::Decision::Rollback => {
                        self.rollback();
                        return Ok(Outcome {
                            result: Value::Result(false, v),
                            committed: false,
                            version: self.version,
                            events: vec![],
                        });
                    }
                };
                self.version = next;
                self.undo.clear();
                let events = crate::transaction::publish(next, self.staged.drain(..))
                    .map(|published| Event {
                        commit: published.commit,
                        position: published.position,
                        channel: published.value.0,
                        value: published.value.1,
                    })
                    .collect::<Vec<_>>();
                self.outbox.extend(events.iter().cloned());
                Ok(Outcome {
                    result: Value::Result(true, v),
                    committed: true,
                    version: next,
                    events,
                })
            }
            Err(Failure::Abort(e)) => {
                self.rollback();
                Ok(Outcome {
                    result: Value::Result(false, Box::new(e)),
                    committed: false,
                    version: self.version,
                    events: vec![],
                })
            }
            Ok(_) => {
                self.rollback();
                Err("change did not return Result".into())
            }
            Err(Failure::Host(e)) => {
                self.rollback();
                Err(e)
            }
        }
    }
    fn rollback(&mut self) {
        for u in self.undo.drain(..).rev() {
            let table = self.tables.get_mut(&u.root).expect("checked state root");
            if let Some(old) = u.old {
                table.insert(u.key, old);
            } else {
                table.remove(&u.key);
            }
            for (n, undo) in u.cached {
                let cache = self
                    .cached
                    .get_mut(&n)
                    .expect("stable cache plan during transaction");
                cache.total = crate::aggregate::restore_journal(
                    self.certificate.as_ref().expect("stable certificate"),
                    &cache.total,
                    undo,
                );
            }
        }
        self.staged.clear();
    }
    fn tick(&mut self) -> Exec<()> {
        if self.fuel == 0 {
            return Err("execution budget exhausted".into());
        }
        self.fuel -= 1;
        Ok(())
    }
    fn coerce(&self, v: Value, t: &Type) -> LangResult<Value> {
        if let (Value::Id(n, _) | Value::Record(n, _) | Value::Enum(n, _), Type::Named(want)) =
            (&v, t)
        {
            if n != want {
                return Err("nominal type mismatch".into());
            }
        }
        match (&v, t) {
            (Value::U64(n), Type::U32) => {
                return n.to_u32().map(Value::U32).ok_or("u32 out of range".into())
            }
            (Value::U64(n), Type::Int) => return Ok(Value::Int(BigInt::from(*n))),
            (Value::U32(n), Type::Int) => return Ok(Value::Int(BigInt::from(*n))),
            (_, Type::Unknown) => return Ok(v),
            _ => {}
        }
        // Reuse the boundary validator to reject malformed structured values.
        Value::from_json(&v.json(), t, &self.program)
    }
    fn binary(op: &str, av: Value, bv: Value) -> Exec<Value> {
        match op {
            "==" => return Ok(Value::Bool(av == bv)),
            "!=" => return Ok(Value::Bool(av != bv)),
            "<" => return Ok(Value::Bool(av < bv)),
            ">" => return Ok(Value::Bool(av > bv)),
            "<=" => return Ok(Value::Bool(av <= bv)),
            ">=" => return Ok(Value::Bool(av >= bv)),
            _ => {}
        }
        match (av, bv) {
            (Value::U64(a), Value::U64(b)) => Ok(Value::U64(match op {
                "+" => a.wrapping_add(b),
                "-" => a.wrapping_sub(b),
                "*" => a.wrapping_mul(b),
                _ => return Err("invalid integer operator".into()),
            })),
            (Value::U32(a), Value::U32(b)) => Ok(Value::U32(match op {
                "+" => a.wrapping_add(b),
                "-" => a.wrapping_sub(b),
                "*" => a.wrapping_mul(b),
                _ => return Err("invalid integer operator".into()),
            })),
            (Value::Int(a), Value::Int(b)) => Ok(Value::Int(match op {
                "+" => a + b,
                "-" => a - b,
                "*" => a * b,
                _ => return Err("invalid exact integer operator".into()),
            })),
            (Value::Bool(a), Value::Bool(b)) => Ok(Value::Bool(match op {
                "&&" => a && b,
                "||" => a || b,
                _ => return Err("invalid Bool operator".into()),
            })),
            _ => Err("operand type mismatch".into()),
        }
    }
    fn builtin(&mut self, n: &str, vals: Vec<Value>, result_type: &Type) -> Exec<Value> {
        match n {
            "Ok" | "Err" => return Ok(Value::Result(n == "Ok", Box::new(vals[0].clone()))),
            "Some" => return Ok(Value::Option(Some(Box::new(vals[0].clone())))),
            "Int" => return Ok(self.coerce(vals[0].clone(), &Type::Int)?),
            "checked_add" | "checked_sub" | "checked_mul" => {
                let out = match &vals[0] {
                    Value::U32(a) => {
                        let b = if let Value::U32(b) = self.coerce(vals[1].clone(), &Type::U32)? {
                            b
                        } else {
                            return Err("arithmetic type".into());
                        };
                        match n {
                            "checked_add" => a.checked_add(b),
                            "checked_sub" => a.checked_sub(b),
                            _ => a.checked_mul(b),
                        }
                        .map(Value::U32)
                    }
                    Value::U64(a) => {
                        let b = if let Value::U64(b) = vals[1] {
                            b
                        } else {
                            return Err("arithmetic type".into());
                        };
                        match n {
                            "checked_add" => a.checked_add(b),
                            "checked_sub" => a.checked_sub(b),
                            _ => a.checked_mul(b),
                        }
                        .map(Value::U64)
                    }
                    _ => return Err("checked arithmetic type".into()),
                };
                return Ok(if let Some(v) = out {
                    Value::Result(true, Box::new(v))
                } else {
                    Value::Result(
                        false,
                        Box::new(Value::Enum("ArithmeticError".into(), "Overflow".into())),
                    )
                });
            }
            "sum" | "count" => {
                let xs = if let Value::List(xs) = &vals[0] {
                    xs
                } else {
                    return Err("aggregate requires list".into());
                };
                if n == "count" {
                    return Ok(Value::Int(BigInt::from(xs.len())));
                }
                if xs.is_empty() {
                    return Ok(match result_type {
                        Type::U32 => Value::U32(0),
                        Type::U64 => Value::U64(0),
                        _ => Value::Int(BigInt::from(0)),
                    });
                }
                if xs.iter().all(|x| matches!(x, Value::Int(_))) {
                    let mut s = BigInt::from(0);
                    for x in xs {
                        if let Value::Int(v) = x {
                            s += v;
                        }
                    }
                    return Ok(Value::Int(s));
                }
                if xs.iter().all(|x| matches!(x, Value::U32(_))) {
                    let mut s = 0u32;
                    for x in xs {
                        if let Value::U32(v) = x {
                            s = s.wrapping_add(*v);
                        }
                    }
                    return Ok(Value::U32(s));
                }
                let mut s = 0u64;
                for x in xs {
                    if let Value::U64(v) = x {
                        s = s.wrapping_add(*v);
                    } else {
                        return Err("invalid sum elements".into());
                    }
                }
                return Ok(Value::U64(s));
            }
            _ => return Err(format!("unknown builtin {n}").into()),
        }
    }
    fn pure_call(&mut self, index: usize, vals: Vec<Value>) -> Exec<Value> {
        let f = &self.program.functions[index];
        let inputs = vals
            .iter()
            .zip(&f.params)
            .map(|(v, (_, t))| crate::eval::Value::from_program_json(&v.json(), t, &self.program))
            .collect::<LangResult<Vec<_>>>()?;
        let result = crate::eval::call(&self.program, &f.name, inputs, &mut self.fuel)?;
        return Ok(Value::from_json(&result.json(), &f.result, &self.program)?);
    }
    fn table(&mut self, root: &String, n: &str, vals: Vec<Value>) -> Exec<Value> {
        let d = self
            .program
            .states
            .iter()
            .find(|d| &d.name == root)
            .ok_or("missing schema")?
            .clone();
        let (kt, vt) = if let Type::Table(k, v) = d.ty {
            (k, v)
        } else {
            return Err("state is not a table".into());
        };
        if n == "values" {
            return Ok(Value::List(self.tables[root].values().cloned().collect()));
        }
        let k = self.coerce(vals[0].clone(), &kt)?;
        match n {
            "get" => {
                return Ok(Value::Option(
                    self.tables[root].get(&k).cloned().map(Box::new),
                ))
            }
            "contains" => return Ok(Value::Bool(self.tables[root].contains_key(&k))),
            "insert" | "replace" | "remove" => {
                let old = self.tables[root].get(&k).cloned();
                if (n == "insert" && old.is_some()) || (n == "replace" && old.is_none()) {
                    return Err("violated checked table precondition".into());
                }
                let next = if n == "remove" {
                    None
                } else {
                    Some(self.coerce(vals[1].clone(), &vt)?)
                };
                let plans = self
                    .cached
                    .iter()
                    .filter(|(_, c)| &c.plan.root == root)
                    .map(|(n, c)| (n.clone(), c.plan.clone()))
                    .collect::<Vec<_>>();
                let mut prior = Vec::new();
                let mut updated = Vec::new();
                for (name, plan) in plans {
                    let old_value = if let Some(v) = &old {
                        Some(self.contribution(&plan, v.clone())?)
                    } else {
                        None
                    };
                    let new_value = if let Some(v) = &next {
                        Some(self.contribution(&plan, v.clone())?)
                    } else {
                        None
                    };
                    let (new_total, undo) = crate::aggregate::update_journal(
                        self.certificate.as_ref().expect("checked plan certificate"),
                        &self.cached[&name].total,
                        old_value.as_ref(),
                        new_value.as_ref(),
                    );
                    prior.push((name.clone(), undo));
                    updated.push((name, new_total));
                }
                self.undo.push(Undo {
                    root: root.clone(),
                    key: k.clone(),
                    old: old.clone(),
                    cached: prior,
                });
                let table = self.tables.get_mut(root).expect("known root");
                if let Some(v) = next {
                    table.insert(k, v);
                } else {
                    table.remove(&k);
                }
                for (name, total) in updated {
                    self.cached.get_mut(&name).expect("existing plan").total = total;
                }
                return Ok(if n == "remove" {
                    Value::Option(old.map(Box::new))
                } else {
                    Value::Unit
                });
            }
            _ => return Err(format!("unknown table method {n}").into()),
        }
    }
    // Transitional aggregate projections still use source expressions. Actions
    // and keeps execute only the checked typed tree in actions.rs.
    fn expr(&mut self, e: &Expr, env: &Env) -> Exec<Value> {
        self.tick()?;
        match e {
            Expr::Float(_) | Expr::Neg(_) | Expr::Let(..) => {
                Err("compute expression belongs in a pure function".into())
            }
            Expr::Num(n) => Ok(Value::U64(*n)),
            Expr::Bool(v) => Ok(Value::Bool(*v)),
            Expr::String(s) => Ok(Value::String(s.clone())),
            Expr::Unit => Ok(Value::Unit),
            Expr::Var(n) => {
                if let Some(v) = env.get(n) {
                    return Ok(v.clone());
                }
                if n == "None" {
                    return Ok(Value::Option(None));
                }
                if let Some(cache) = self.cached.get(n) {
                    return Ok(Value::Int(cache.total.clone()));
                }
                if let Some(index) = self.program.keeps.iter().position(|k| &k.name == n) {
                    return self.typed_keep(index);
                }
                Err(format!("unbound runtime name {n}").into())
            }
            Expr::Record(n, fs) => {
                let fields = self.program.records[n].clone();
                let mut out = BTreeMap::new();
                for (f, e) in fs {
                    let v = self.expr(e, env)?;
                    let t = &fields
                        .iter()
                        .find(|(name, _)| name == f)
                        .ok_or("unknown field")?
                        .1;
                    out.insert(f.clone(), self.coerce(v, t)?);
                }
                Ok(Value::Record(n.clone(), out))
            }
            Expr::Field(x, f) => {
                if let Expr::Var(n) = &**x {
                    if self.program.enums.get(n).is_some_and(|vs| vs.contains(f)) {
                        return Ok(Value::Enum(n.clone(), f.clone()));
                    }
                }
                if let Value::Record(_, mut fields) = self.expr(x, env)? {
                    fields
                        .remove(f)
                        .ok_or_else(|| Failure::Host(format!("unknown field {f}")))
                } else {
                    Err("field requires record".into())
                }
            }
            Expr::Try(x) => match self.expr(x, env)? {
                Value::Result(true, v) => Ok(*v),
                Value::Result(false, e) => Err(Failure::Abort(*e)),
                _ => Err("? requires Result".into()),
            },
            Expr::Binary(op, a, b) => {
                let mut av = self.expr(a, env)?;
                if op == "&&" && av == Value::Bool(false) {
                    return Ok(av);
                }
                if op == "||" && av == Value::Bool(true) {
                    return Ok(av);
                }
                let mut bv = self.expr(b, env)?;
                if matches!(&**a, Expr::Num(_)) {
                    av = match &bv {
                        Value::U32(_) => self.coerce(av, &Type::U32)?,
                        Value::Int(_) => self.coerce(av, &Type::Int)?,
                        _ => av,
                    };
                }
                if matches!(&**b, Expr::Num(_)) {
                    bv = match &av {
                        Value::U32(_) => self.coerce(bv, &Type::U32)?,
                        Value::Int(_) => self.coerce(bv, &Type::Int)?,
                        _ => bv,
                    };
                }
                Self::binary(op, av, bv)
            }
            Expr::Call(n, args) => {
                let vals = args
                    .iter()
                    .map(|e| self.expr(e, env))
                    .collect::<Exec<Vec<_>>>()?;
                if [
                    "Ok",
                    "Err",
                    "Some",
                    "Int",
                    "checked_add",
                    "checked_sub",
                    "checked_mul",
                    "sum",
                    "count",
                ]
                .contains(&n.as_str())
                {
                    let result_type = if n == "sum" {
                        let types = env.iter().map(|(n, v)| (n.clone(), v.ty())).collect();
                        crate::statecheck::expression_type(&self.program, e, &types)?
                    } else {
                        Type::Unit
                    };
                    return self.builtin(n, vals, &result_type);
                }
                if let Some(index) = self.program.actions.iter().position(|a| &a.name == n) {
                    return self.typed_action(index, vals, true);
                }
                if let Some(index) = self.program.functions.iter().position(|f| &f.name == n) {
                    return self.pure_call(index, vals);
                }
                Err(format!("unknown runtime function {n}").into())
            }
            Expr::Method(receiver, n, args) => {
                if let Expr::Var(root) = &**receiver {
                    if self.tables.contains_key(root) && !env.contains_key(root) {
                        let vals = args
                            .iter()
                            .map(|a| self.expr(a, env))
                            .collect::<Exec<Vec<_>>>()?;
                        return self.table(root, n, vals);
                    }
                }
                let value = self.expr(receiver, env)?;
                if n == "ok_or" {
                    let fallback = self.expr(&args[0], env)?;
                    return match value {
                        Value::Option(Some(v)) => Ok(Value::Result(true, v)),
                        Value::Option(None) => Ok(Value::Result(false, Box::new(fallback))),
                        _ => Err("ok_or requires Option".into()),
                    };
                }
                let (var, body) = if let Some(Expr::Lambda(v, b)) = args.first() {
                    (v, b)
                } else {
                    return Err("method requires lambda".into());
                };
                let apply = |rt: &mut Self, v: Value| {
                    let mut local = env.clone();
                    local.insert(var.clone(), v);
                    rt.expr(body, &local)
                };
                match value {
                    Value::List(xs) => {
                        let mut out = Vec::new();
                        for v in xs {
                            let mapped = apply(self, v.clone())?;
                            if n == "map" {
                                out.push(mapped);
                            } else if mapped == Value::Bool(true) {
                                out.push(v);
                            } else if mapped != Value::Bool(false) {
                                return Err("filter requires Bool".into());
                            }
                        }
                        Ok(Value::List(out))
                    }
                    Value::Option(v) => Ok(Value::Option(if let Some(v) = v {
                        Some(Box::new(apply(self, *v)?))
                    } else {
                        None
                    })),
                    Value::Result(ok, v) => {
                        let map = (ok && n == "map") || (!ok && n == "map_err");
                        Ok(Value::Result(
                            ok,
                            if map { Box::new(apply(self, *v)?) } else { v },
                        ))
                    }
                    _ => Err("unsupported receiver".into()),
                }
            }
            Expr::Lambda(..) => Err("lambda cannot execute alone".into()),
        }
    }
}

// Portable reference snapshot encoding. The final compact binary codec remains separate work.
#[derive(Serialize, Deserialize)]
struct Snapshot {
    format: u32,
    program: String,
    version: u64,
    tables: Vec<(String, Vec<(Value, Value)>)>,
    outbox: Vec<Event>,
}
impl Runtime {
    fn program_id(&self) -> LangResult<String> {
        if let Some(layout) = &self.selected_layout {
            return Ok(layout.program.iter().map(|b| format!("{b:02x}")).collect());
        }
        let bytes = serde_json::to_vec(&self.program).map_err(|e| e.to_string())?;
        Ok(format!("{:x}", Sha256::digest(bytes)))
    }
    pub fn checkpoint(&self) -> LangResult<Vec<u8>> {
        if !self.undo.is_empty() || !self.staged.is_empty() {
            return Err("checkpoint requires a transaction boundary".into());
        }
        serde_json::to_vec(&Snapshot {
            format: 1,
            program: self.program_id()?,
            version: self.version,
            tables: self
                .tables
                .iter()
                .map(|(n, t)| {
                    (
                        n.clone(),
                        t.iter().map(|(k, v)| (k.clone(), v.clone())).collect(),
                    )
                })
                .collect(),
            outbox: self.outbox.clone(),
        })
        .map_err(|e| e.to_string())
    }
    pub fn checkpoint_portable(&self) -> LangResult<Vec<u8>> {
        self.checkpoint_portable_with_limits(crate::snapshot_wire::Limits::default())
    }
    pub fn checkpoint_portable_with_limits(
        &self,
        limits: crate::snapshot_wire::Limits,
    ) -> LangResult<Vec<u8>> {
        use crate::snapshot_wire::{Event as PortableEvent, Logical};
        if !self.undo.is_empty() || !self.staged.is_empty() {
            return Err("checkpoint requires a transaction boundary".into());
        }
        let layout = self.portable_layout()?;
        let tables = layout
            .roots
            .iter()
            .map(|(n, _, _)| {
                self.tables[n]
                    .iter()
                    .map(|(k, v)| (k.json(), v.json()))
                    .collect()
            })
            .collect();
        let outbox = self
            .outbox
            .iter()
            .map(|e| {
                Ok(PortableEvent {
                    commit: e.commit,
                    position: e.position,
                    channel: layout
                        .events
                        .iter()
                        .position(|(n, _)| n == &e.channel)
                        .ok_or("unknown event channel")?,
                    value: e.value.json(),
                })
            })
            .collect::<LangResult<Vec<_>>>()?;
        crate::snapshot_wire::encode(
            &layout,
            &Logical {
                version: self.version,
                tables,
                outbox,
            },
            limits,
        )
    }
    pub fn restore_portable(program: Program, bytes: &[u8]) -> LangResult<Self> {
        Self::restore_portable_with_limits(program, bytes, crate::snapshot_wire::Limits::default())
    }
    pub fn restore_portable_with_limits(
        program: Program,
        bytes: &[u8],
        limits: crate::snapshot_wire::Limits,
    ) -> LangResult<Self> {
        Self::restore_portable_into(Self::new(program)?, bytes, limits)
    }
    pub fn restore_portable_selected(
        selection: &crate::optimisation::CheckedSelection,
        bytes: &[u8],
    ) -> LangResult<Self> {
        Self::restore_portable_selected_with_limits(
            selection,
            bytes,
            crate::snapshot_wire::Limits::default(),
        )
    }
    pub fn restore_portable_selected_with_limits(
        selection: &crate::optimisation::CheckedSelection,
        bytes: &[u8],
        limits: crate::snapshot_wire::Limits,
    ) -> LangResult<Self> {
        Self::restore_portable_into(Self::new_selected(selection)?, bytes, limits)
    }
    fn restore_portable_into(
        mut rt: Self,
        bytes: &[u8],
        limits: crate::snapshot_wire::Limits,
    ) -> LangResult<Self> {
        let layout = rt.portable_layout()?;
        let logical = crate::snapshot_wire::decode(&layout, bytes, limits)?;
        for ((name, _, _), rows) in layout.roots.iter().zip(logical.tables) {
            let root = rt.program.states.iter().find(|s| &s.name == name).unwrap();
            let Type::Table(kt, vt) = &root.ty else {
                unreachable!()
            };
            let table = rows
                .into_iter()
                .map(|(k, v)| {
                    Ok((
                        Value::from_json(&k, kt, &rt.program)?,
                        Value::from_json(&v, vt, &rt.program)?,
                    ))
                })
                .collect::<LangResult<Table>>()?;
            rt.tables.insert(name.clone(), table);
        }
        rt.outbox = logical
            .outbox
            .into_iter()
            .map(|e| {
                let channel = &layout.events[e.channel].0;
                Ok(Event {
                    commit: e.commit,
                    position: e.position,
                    channel: channel.clone(),
                    value: Value::from_json(&e.value, &rt.program.events[channel], &rt.program)?,
                })
            })
            .collect::<LangResult<Vec<_>>>()?;
        rt.version = logical.version;
        Ok(rt)
    }
    pub fn restore(program: Program, bytes: &[u8]) -> LangResult<Self> {
        Self::restore_into(Self::new(program)?, bytes)
    }
    pub fn restore_selected(
        selection: &crate::optimisation::CheckedSelection,
        bytes: &[u8],
    ) -> LangResult<Self> {
        Self::restore_into(Self::new_selected(selection)?, bytes)
    }
    fn restore_into(mut rt: Self, bytes: &[u8]) -> LangResult<Self> {
        let s: Snapshot = serde_json::from_slice(bytes).map_err(|e| e.to_string())?;
        if s.format != 1 || s.program != rt.program_id()? {
            return Err("snapshot format or program identity mismatch".into());
        }
        if s.tables.len() != rt.tables.len() {
            return Err("snapshot root count mismatch".into());
        }
        let mut roots = std::collections::BTreeSet::new();
        for (name, rows) in s.tables {
            if !roots.insert(name.clone()) {
                return Err("duplicate snapshot root".into());
            }
            let d = rt
                .program
                .states
                .iter()
                .find(|d| d.name == name)
                .ok_or("unknown snapshot root")?;
            let (kt, vt) = if let Type::Table(k, v) = &d.ty {
                (k, v)
            } else {
                unreachable!()
            };
            let mut table = Table::new();
            for (k, v) in rows {
                let kc = rt.coerce(k.clone(), kt)?;
                let vc = rt.coerce(v.clone(), vt)?;
                if kc != k || vc != v {
                    return Err("noncanonical snapshot value".into());
                }
                if table.insert(k, v).is_some() {
                    return Err("duplicate snapshot key".into());
                }
            }
            rt.tables.insert(name, table);
        }
        let mut prior = None;
        for e in &s.outbox {
            if e.commit == 0
                || e.commit > s.version
                || prior.is_some_and(|p| p >= (e.commit, e.position))
            {
                return Err("invalid event sequence in snapshot".into());
            }
            let t = rt
                .program
                .events
                .get(&e.channel)
                .ok_or("unknown snapshot channel")?;
            if rt.coerce(e.value.clone(), t)? != e.value {
                return Err("noncanonical event payload".into());
            }
            prior = Some((e.commit, e.position));
        }
        rt.version = s.version;
        rt.outbox = s.outbox;
        Ok(rt)
    }
}
