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
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};
mod collections;
mod frozen_values;
mod shared_terms;
mod float_words;
mod pure_pairs;
mod function_equivalence;
pub use function_equivalence::{check_functions, FunctionModel, FunctionProjection, FunctionReplacement, FUNCTION_SEMANTICS};
mod bulk;
mod equality;
mod keys;
mod local;
mod flow;
mod observations;
pub use observations::{ValueObservation, CallObservation, EntryObservation, SiteObservation, ObservationFunction};
mod integer;
mod pure;
mod sorted;
pub use sorted::{SortedProofs, SortedTables, SORTED_SEMANTICS};
pub(crate) mod recursive_values;
pub use recursive_values::{RecursiveField,RecursiveRecord};
pub const SEMANTICS: &str = "ink-action-transition-v1";
const LEGACY_MAX_DEFINITIONS: usize = 256;
const MAX_WORK: usize = 20_000;
// Source specialisation produces names longer than the kernel's descriptive
// constructor-label limit. Constructor identity is its checked datatype and
// ordinal, never this label. Retain old short labels for stable proof bytes;
// encode longer ones without widening the kernel's input bounds. Avoid a source
// author deliberately using the generated spelling as another short label.
fn constructor_label(p: &Program, source: &str) -> LangResult<String> {
    if source.len() <= 64 { return Ok(source.into()); }
    let occupied = p.records.keys().chain(p.events.keys()).cloned()
        .chain(p.enums.iter().flat_map(|(n,variants)| variants.iter().map(move |v|format!("{n}_{v}"))))
        .collect::<BTreeSet<_>>();
    for nonce in 0..128u32 {
        let mut hash = Sha256::new();
        hash.update(source.as_bytes()); hash.update(nonce.to_le_bytes());
        let digest = format!("{:x}",hash.finalize());
        let label = format!("ink_{}", &digest[..60]);
        if !occupied.contains(&label) { return Ok(label); }
    }
    Err("source constructor label collision limit".into())
}
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
pub(crate) fn public_normal(t: &Term, env: &BTreeMap<String, String>, next: &mut usize) -> Term {
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
    #[serde(default = "default_key_type")]
    pub key_type: Type,
}
fn default_key_type() -> Type { Type::U64 }
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Projection {
    pub schema: u32,
    pub semantics: String,
    pub source: String,
    pub state: String,
    pub events: String,
    pub types: BTreeMap<String, Sort>,
    #[serde(default,skip_serializing_if="BTreeMap::is_empty")]
    pub recursive_records: BTreeMap<String,RecursiveRecord>,
    pub tables: Vec<Table>,
    pub actions: BTreeMap<String, Action>,
    pub objects: BTreeMap<String, Entry>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_invariants: Vec<String>,
    #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
    pub source_preconditions: BTreeMap<String, String>,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub source_domain: Vec<crate::logic::Equation>,
    /// Fixed-root equalities derived only from checked immutable source rows.
    /// Unlike source predicates, these need no invariant-preservation premise.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub frozen_domain: Vec<crate::logic::Equation>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub initial_state: Option<Term>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Replacement {
    pub selected: serde_json::Value,
    pub proofs: BTreeMap<String, Proof>,
    /// Optional: first establish strictly sorted tables as an inductive
    /// invariant of the original module, then check every action equality
    /// under it. Without it, equalities quantify over all row lists.
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub sorted_tables: Option<SortedProofs>,
}
struct Lower<'a> {
    program: &'a Program,
    typed: &'a CheckedActions,
    keep_active: BTreeSet<usize>,
    integer: Option<integer::Integer>,
    equalities: BTreeMap<String, String>,
    objects: BTreeMap<String, Entry>,
    types: BTreeMap<String, Sort>,
    recursive_records: BTreeMap<String,RecursiveRecord>,
    recursive_tree: Option<String>,
    tree_codecs: BTreeMap<String,(String,String)>,
    tree_nth: Option<String>,
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
    local_ops: BTreeMap<String, String>,
    local_maps: BTreeMap<String, Table>,
    loop_fuel: Option<(String,String,String)>,
    helper_active: BTreeSet<usize>,
    intern_declarations: bool,
    structural_imports: bool,
    shared_declarations: BTreeMap<Vec<u8>, String>,
    shared_declaration_bytes: usize,
    shared_declaration_work: usize,
    object_bytes: usize,
    kept_definitions: BTreeMap<usize, String>,
    pure_sources: BTreeMap<usize, LangResult<std::sync::Arc<crate::semantic::Term>>>,
    pure_roots: BTreeSet<usize>,
    projection_variables: BTreeMap<String, Sort>,
    track_projection_variables: bool,
}
/// Closed mathematical carrier for one checked source value. This exports fixed
/// source correspondence independently of whole-action projection or search.
#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct ValueCarrier {
    pub sort: Sort,
    pub objects: BTreeMap<String, Entry>,
}
pub fn value_carrier(module: &CheckedModule, ty: &Type) -> LangResult<ValueCarrier> {
    let typed = CheckedActions::elaborate_with_frozen_roots(module)?;
    let mut lower = Lower::new(module.program(), &typed);
    lower.reserve_recursive_records()?;
    let sort = lower.sort(ty)?;
    let mut pending=match &sort {Sort::Data(id)=>vec![id.clone()],_=>vec![]};
    let mut objects=BTreeMap::new();
    while let Some(id)=pending.pop() {
        if objects.contains_key(&id){continue;}
        let entry=lower.objects.get(&id).ok_or("value carrier declaration missing")?;
        pending.extend(entry.dependencies.iter().cloned());objects.insert(id,entry.clone());
    }
    Ok(ValueCarrier { sort, objects })
}
impl<'a> Lower<'a> {
    fn new(program: &'a Program, typed: &'a CheckedActions) -> Self {
        Self {
            program,
            typed,
            keep_active: BTreeSet::new(),
            integer: None,
            equalities: BTreeMap::new(),
            objects: BTreeMap::new(),
            types: BTreeMap::new(),
            recursive_records: BTreeMap::new(),
            recursive_tree: None,
            tree_codecs: BTreeMap::new(),
            tree_nth: None,
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
            local_ops: BTreeMap::new(),
            local_maps: BTreeMap::new(),
            loop_fuel: None,
            helper_active: BTreeSet::new(),
            intern_declarations: false,
            structural_imports: false,
            shared_declarations: BTreeMap::new(),
            shared_declaration_bytes: 0,
            shared_declaration_work: MAX_WORK,
            object_bytes: 0,
            kept_definitions: BTreeMap::new(),
            pure_sources: BTreeMap::new(),
            pure_roots: BTreeSet::new(),
            projection_variables: BTreeMap::new(),
            track_projection_variables: false,
        }

    }
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
        self.store_with_implicit_sorts(d, true)
    }
    fn store_with_implicit_sorts(&mut self, mut d: Declaration, implicit: bool) -> LangResult<String> {
        self.tick()?;
        // Pure-function correspondence imports the actual declaration and its
        // implicit field sorts, independent of unrelated helper discovery.
        // Legacy action projections keep their original import identities.
        let implicit = implicit && !self.structural_imports;
        if let Declaration::Datatype { constructors } = &mut d {
            // Generated source names can exceed the proof language's binder
            // limit. Constructor labels carry no computation: keep a stable,
            // bounded label while retaining source/type correspondence separately.
            for constructor in constructors {
                let name = &constructor.name;
                if name.len() > 64 {
                    let digest = format!("{:x}", Sha256::digest(name.as_bytes()));
                    constructor.name = format!("c{}", &digest[..63]);
                }
            }
        }
        let mut dependencies = BTreeSet::new();
        refs(
            &serde_json::to_value(&d).map_err(|e| e.to_string())?,
            &mut dependencies,
        );
        if self.structural_imports {
            let mut pending = dependencies.iter().cloned().collect::<Vec<_>>();
            while let Some(key) = pending.pop() {
                self.tick()?;
                let entry = self.objects.get(&key).ok_or("pure declaration import missing")?;
                let declaration = &entry.payload["declaration"];
                let signature = if let Some(function) = declaration.get("Function") {
                    serde_json::json!([function["params"], function["result"]])
                } else { declaration.clone() };
                let mut sorts = BTreeSet::new();
                refs(&signature, &mut sorts);
                for sort in sorts {
                    if dependencies.insert(sort.clone()) { pending.push(sort); }
                }
            }
        }
        // Match field sorts are implicit. Declare them as direct imports too.
        if implicit {
            dependencies.extend(self.types.values().filter_map(|s| {
                if let Sort::Data(i) = s { Some(i.clone()) } else { None }
            }));
            for t in &self.tables {
                dependencies.insert(t.datatype.clone());
            }
            for i in [&self.state, &self.event, &self.events] {
                if !i.is_empty() { dependencies.insert(i.clone()); }
            }
        }
        let e = Entry::from_declaration(&d, dependencies.into_iter().collect())?;
        let bytes = match registry::canonical(&e) {
            Ok(bytes) => bytes,
            Err(error) if error == "canonical value depth limit" && matches!(&d, Declaration::Function { .. }) => {
                // Only formerly untransportable declarations use this path.
                // Existing admitted projection identities remain unchanged.
                return self.share_large_definition(d, implicit);
            }
            Err(error) => return Err(error),
        };
        let i=format!("{:x}",Sha256::digest(&bytes));
        let key=if self.intern_declarations && self.shared_declaration_work>0 {
            match self.declaration_key(&d) {
                Ok(key)=>Some(key),
                Err(error) if error=="action model declaration sharing work limit"=>None,
                Err(error)=>return Err(error),
            }
        }else{None};
        if let Some(key)=&key {
            if let Some(existing)=self.shared_declarations.get(key) {return Ok(existing.clone());}
        }
        if !self.objects.contains_key(&i) {
            let limit=if self.intern_declarations {registry::MAX_VIEW_ENTRIES}else{LEGACY_MAX_DEFINITIONS};
            if self.objects.len()>=limit {return Err("action model definition limit".into());}
            // Account for complete entries and their JSON object keys before
            // retaining them. Modular projection uses the existing bundle
            // storage cap, with unchanged per-definition checking budgets.
            self.object_bytes=self.object_bytes.checked_add(bytes.len()+i.len()+4)
                .filter(|bytes|*bytes<=crate::core::MAX_BYTES).ok_or("action model byte limit")?;
        }
        if let Some(key)=key {
            if let Some(bytes)=self.shared_declaration_bytes.checked_add(key.len())
                .filter(|bytes|*bytes<=crate::core::MAX_BYTES) {
                self.shared_declaration_bytes=bytes;
                self.shared_declarations.insert(key,i.clone());
            }
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
        let key = serde_json::to_string(ty).map_err(|e| e.to_string())?;
        if let Some(s) = self.types.get(&key) {
            return Ok(s.clone());
        }
        self.tick()?;
        if !self.active.insert(key.clone()) {
            return Err("recursive action model type is unsupported".into());
        }
        let s = match ty {
            Type::U64 | Type::U32 | Type::I32 | Type::F32 => Sort::U64,
            Type::Int => Sort::Data(self.integer()?.value),
            Type::String => Sort::Data(self.data(vec![("Utf8Nil",vec![]),("Utf8Cons",vec![Sort::U64,Sort::SelfType])])?),
            Type::Vector(t,n)=>{let s=self.sort(t)?;Sort::Data(self.data(vec![("Vector",vec![s;*n as usize])])?)},
            Type::Bool => Sort::Bool,
            Type::Buffer(t) => self.sort(&Type::List(t.clone()))?,
            Type::Map(k,t) => {
                let table=self.table(k,t)?;
                let sort=Sort::Data(table.datatype.clone());
                self.local_maps.insert(key.clone(),table);sort
            }
            Type::List(t) => {
                let element = self.sort(t)?;
                Sort::Data(self.data(vec![
                    ("Nil", vec![]),
                    ("Cons", vec![element, Sort::SelfType]),
                ])?)
            }
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
                                .map(|name| Ok(Constructor {
                                    name: constructor_label(self.program,&format!("{n}_{name}"))?,
                                    fields: vec![],
                                }))
                                .collect::<LangResult<_>>()?,
                        })?,
                    )
                } else if let Some(fs) = self.program.records.get(n).cloned() {
                    let fields = fs
                        .iter()
                        .map(|(_, t)| self.sort(t))
                        .collect::<LangResult<_>>()?;
                    Sort::Data(self.store(Declaration::Datatype {
                        constructors: vec![Constructor {
                            name: constructor_label(self.program,n)?,
                            fields,
                        }],
                    })?)
                } else if self.program.ids.contains(n) {
                    Sort::Data(self.data(vec![("Id128",vec![Sort::U64,Sort::U64])])?)
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
    fn table(&mut self, key_type: &Type, value_type: &Type) -> LangResult<Table> {
        let key_sort = self.sort(key_type)?;
        let equal = self.operator(key_type,"==",v("key"),v("head"))?;
        let less = self.key_less(key_type,v("key"),v("head"))?;
        let val = self.sort(value_type)?;
        let option = self.sort(&Type::Option(Box::new(value_type.clone())))?;
        let opt = id(&option)?.to_string();
        let table = self.data(vec![
            ("Nil", vec![]),
            ("Cons", vec![key_sort.clone(), val.clone(), Sort::SelfType]),
        ])?;
        let ts = Sort::Data(table.clone());
        let get = self.function(
            vec![("rows", ts.clone()), ("key", key_sort.clone())],
            option,
            m(
                v("rows"),
                vec![
                    (vec![], c(&opt, 0, vec![])),
                    (
                        vec!["head".into(), "value".into(), "tail".into()],
                        choice(
                            equal.clone(),
                            c(&opt, 1, vec![v("value")]),
                            Term::SelfCall(vec![v("tail"), v("key")]),
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let contains = self.function(
            vec![("rows", ts.clone()), ("key", key_sort.clone())],
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
            vec![("rows", ts.clone()), ("key", key_sort.clone())],
            ts.clone(),
            m(
                v("rows"),
                vec![
                    (vec![], c(&table, 0, vec![])),
                    (
                        vec!["head".into(), "value".into(), "tail".into()],
                        choice(
                            equal.clone(),
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
                ("key", key_sort.clone()),
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
                            less.clone(),
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
            vec![("rows", ts.clone()), ("key", key_sort.clone()), ("new", val)],
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
                                choice(equal.clone(), v("new"), v("value")),
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
            key_type: key_type.clone(),
        })
    }
    fn bind<F>(&mut self, sort: Sort, value: Term, f: F) -> LangResult<Term>
    where
        F: FnOnce(&mut Self, Term) -> LangResult<Term>,
    {
        let key = serde_json::to_string(&sort).map_err(|e| e.to_string())?;
        let bound_sort=sort.clone();
        let wrapper = if let Some(i) = self.boxes.get(&key) {
            i.clone()
        } else {
            let i = self.data(vec![("Bound", vec![sort])])?;
            self.boxes.insert(key, i.clone());
            i
        };
        let n = self.fresh();
        self.remember_projection_variable(&v(&n),&bound_sort)?;
        let body = f(self, v(&n))?;
        Ok(m(c(&wrapper, 0, vec![value]), vec![(vec![n], body)]))
    }
    fn remember_projection_variable(&mut self,value:&Term,sort:&Sort)->LangResult<()> {
        if self.intern_declarations && self.track_projection_variables {
            if let Term::Var(name)=value {
                if self.projection_variables.get(name).is_some_and(|old|old!=sort) {
                    return Err("projected variable changes sort across its scope".into());
                }
                self.projection_variables.insert(name.clone(),sort.clone());
            }
        }
        Ok(())
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
            Kind::Bind { slot,value,body:inner,.. } => {
                let value=self.expr(body,*value,env,state)?;
                let mut env=env.clone();env.insert(*slot,value);
                self.expr(body,*inner,&env,state)
            }

            Kind::String(text) => self.string_literal(text),
            Kind::Number(n) if matches!(ty,Type::U64|Type::U32|Type::I32) => Ok(Term::U64(*n)),
            Kind::Number(n) if *ty==Type::F32 => Ok(Term::U64((*n as f32).to_bits()as u64)),
            Kind::Float(bits)=>Ok(Term::U64(*bits as u64)),
            Kind::Neg{value}if *ty==Type::F32=>{let x=self.expr(body,*value,env,state)?;Ok(b("f32:neg",x,Term::U64(0)))},
            Kind::Number(n) if *ty == Type::Int => self.integer_literal(*n),
            Kind::Neg { value } if *ty == Type::I32 => {
                let x = self.expr(body, *value, env, state)?;
                self.operator(ty, "-", Term::U64(0), x)
            }
            Kind::Neg { value } if *ty == Type::Int => {
                let i = self.integer()?;
                let x = self.expr(body, *value, env, state)?;
                Ok(call(&i.negate, vec![x]))
            }
            Kind::Bool(x) => Ok(Term::Bool(*x)),
            Kind::Unit => {
                let s = self.sort(ty)?;
                Ok(c(id(&s)?, 0, vec![]))
            }
            Kind::None => {
                let s = self.sort(ty)?;
                Ok(c(id(&s)?, 0, vec![]))
            }
            Kind::State(root) => self.root(state.clone(), *root),
            Kind::Keep(index) => {
                if self.intern_declarations {
                    if let Some(function)=self.kept_definitions.get(index) {
                        return Ok(call(function,vec![state.clone()]));
                    }
                }
                if !self.keep_active.insert(*index) {
                    return Err("action model keep cycle".into());
                }
                let keep = self.typed.keep(*index).ok_or("missing typed keep")?.clone();
                let input=if self.intern_declarations {v("kept_state")}else{state.clone()};
                let result = self.expr(
                    &keep,
                    keep.value.ok_or("missing keep value")?,
                    &BTreeMap::new(),
                    &input,
                );
                self.keep_active.remove(index);
                let result=result?;
                if self.intern_declarations {
                    // Share the definition, never a value. Every use passes
                    // its current logical state, including after writes.
                    let output=self.sort(ty)?;
                    let function=self.function(vec![("kept_state",Sort::Data(self.state.clone()))],output,result,None)?;
                    self.kept_definitions.insert(*index,function.clone());
                    Ok(call(&function,vec![state.clone()]))
                }else{Ok(result)}
            }
            Kind::Builtin { name,arguments } if ["u32_from_f32","u64_from_f32","i32_from_f32"].contains(&name.as_str()) => {
                let [argument]=arguments.as_slice() else{return Err("action model float-to-word arity".into());};
                let value=self.expr(body,*argument,env,state)?;
                let function=self.float_word_conversion(name)?;
                Ok(call(&function,vec![value]))
            }
            Kind::Builtin { name,arguments } if ["f32_from_u32","f32_from_u64","f32_from_i32"].contains(&name.as_str()) => {
                let [argument]=arguments.as_slice() else {return Err("fixed-width float conversion arity".into());};
                let x=self.expr(body,*argument,env,state)?;
                Ok(b(&format!("f32:{}", &name[4..]),x,Term::U64(0)))
            }
            Kind::Builtin { name,arguments } if ["sqrt","f32_div","floor","ceil","trunc","round_ties_even","is_nan","is_finite","f32_bits","f32_from_bits"].contains(&name.as_str()) => {
                let x=self.expr(body,arguments[0],env,state)?;
                if name=="f32_bits"||name=="f32_from_bits" {return Ok(b("&",x,Term::U64(u32::MAX as u64)));}
                let y=if name=="f32_div"{self.expr(body,arguments[1],env,state)?}else{Term::U64(0)};
                Ok(b(&format!("f32:{}",if name=="f32_div"{"div"}else{name}),x,y))
            }
            Kind::Builtin { name, arguments } if name == "word_and" && arguments.len() == 2 && matches!(ty, Type::U64 | Type::U32 | Type::I32) => {
                let x = self.expr(body, arguments[0], env, state)?;
                let y = self.expr(body, arguments[1], env, state)?;
                self.operator(ty, "&", x, y)
            }
            Kind::Builtin { name, arguments } if name == "list" => {
                let sort = self.sort(ty)?;
                let xs = arguments.iter().map(|i| self.expr(body, *i, env, state)).collect::<LangResult<Vec<_>>>()?;
                self.literal_list(&sort, xs)
            }
            Kind::Method { receiver, method, arguments } if method == "unwrap_or" => {
                let value = self.expr(body, *receiver, env, state)?;
                let fallback = self.expr(body, arguments[0], env, state)?;
                let name = self.fresh();
                Ok(m(value, vec![(vec![], fallback), (vec![name.clone()], v(&name))]))
            }
            Kind::Method { receiver, method, arguments } if method == "concat" => {
                let Type::List(element) = ty else { return Err("concat list type".into()); };
                let a = self.expr(body, *receiver, env, state)?;
                let z = self.expr(body, arguments[0], env, state)?;
                let f = self.sequence_op(element, "concat")?;
                Ok(call(&f, vec![a,z]))
            }
            Kind::Builtin { name, arguments }
                if ["vec2", "vec3", "vec4"].contains(&name.as_str()) =>
            {
                let s = self.sort(ty)?;
                let xs = arguments
                    .iter()
                    .map(|i| self.expr(body, *i, env, state))
                    .collect::<LangResult<Vec<_>>>()?;
                Ok(c(id(&s)?, 0, xs))
            }
            Kind::VectorField {
                receiver,
                component,
            } => {
                let value = self.expr(body, *receiver, env, state)?;
                let ExprType::Value(Type::Vector(_, n)) = body.nodes[*receiver].ty else {
                    return Err("vector receiver type".into());
                };
                let names = (0..n).map(|_| self.fresh()).collect::<Vec<_>>();
                Ok(m(value, vec![(names.clone(), v(&names[*component]))]))
            }

            Kind::Builtin { name, arguments } if ["quot_or", "rem_or"].contains(&name.as_str()) => {
                let xs = arguments
                    .iter()
                    .map(|i| self.expr(body, *i, env, state))
                    .collect::<LangResult<Vec<_>>>()?;
                self.division(ty, name, xs[0].clone(), xs[1].clone(), xs[2].clone())
            }
            Kind::Builtin { name, arguments } if name == "choose" => {
                let [condition, on_true, on_false] = arguments.as_slice() else {
                    return Err("action model choose arity".into());
                };
                Ok(choice(
                    self.expr(body, *condition, env, state)?,
                    self.expr(body, *on_true, env, state)?,
                    self.expr(body, *on_false, env, state)?,
                ))
            }
            Kind::Builtin { name, arguments } if ["count", "sum"].contains(&name.as_str()) => {
                self.reduce_expr(body, name, arguments, env, state)
            }
            Kind::Method {
                receiver,
                method,
                arguments,
            } if ["values", "keys", "map", "filter"].contains(&method.as_str()) => {
                self.collection_expr(body, *receiver, method, arguments, env, state)
            }
            Kind::Table {
                root,
                method,
                arguments,
            } if arguments.is_empty() && ["values", "keys"].contains(&method.as_str()) => {
                self.table_sequence(*root, method, state)
            }
            Kind::Local(s) => {
                let value=env.get(s).cloned().ok_or("uninitialised action model slot")?;
                if self.intern_declarations && self.track_projection_variables {
                    let sort=self.sort(ty)?;self.remember_projection_variable(&value,&sort)?;
                }
                Ok(value)
            }
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
                if self.recursive_records.contains_key(name) {
                    return self.recursive_record(name,(0..count).map(|i|values.remove(&i).expect("checked record")).collect());
                }
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
                if self.recursive_records.contains_key(record) {return self.recursive_field(record,*field,r);}
                let names = (0..self.program.records[record].len())
                    .map(|_| self.fresh())
                    .collect::<Vec<_>>();
                Ok(m(r, vec![(names.clone(), v(&names[*field]))]))
            }
            Kind::Binary { op, left, right } => {
                let lhs = self.expr(body, *left, env, state)?;
                let rhs = self.expr(body, *right, env, state)?;
                let t = &body.nodes[*left].ty;
                let ExprType::Value(t) = t else {
                    return Err("operator operand type".into());
                };
                self.operator(t, op, lhs, rhs)
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
            Kind::Table {root,method,arguments} if method=="sum_by" || method=="count_where" => self.table_scan(body,*root,method,arguments[0],env,state,ty),
            Kind::Table {root,method,arguments} if method=="shared_keys" => {
                let Kind::State(other)=body.nodes[arguments[0]].kind else{return Err("shared_keys root".into());};
                let keys=self.table_sequence(other,"keys",state)?;
                self.intersect_table(*root,keys,state)
            }
            Kind::Table { root, method, arguments } if method == "intersect_keys" => {
                let keys=self.expr(body,arguments[0],env,state)?;
                self.intersect_table(*root,keys,state)
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
        if !matches!(result_type, Type::Result(..)) {
            return Ok(choice(b("==", v("version"), Term::U64(u64::MAX)), self.host(observation, 1),
                c(observation, 0, vec![result, Term::Bool(true), b("+",v("version"),Term::U64(1)), state, events])));
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
}
impl Projection {
    pub fn derive(module: &CheckedModule) -> LangResult<Self> {
        Ok(Self::derive_observations(module, &[])?.0)
    }
    /// Project source-site predicates through the same ordered execution used
    /// for transitions. Requests select checked source nodes, never meanings.
    pub fn derive_observations(
        module: &CheckedModule,
        observations: &[ValueObservation],
    ) -> LangResult<(Self, Vec<ObservationFunction>)> {
        Self::derive_site_observations(module,&observations.iter().cloned().map(SiteObservation::Value).collect::<Vec<_>>())
    }
    pub fn derive_site_observations(
        module: &CheckedModule,
        observations: &[SiteObservation],
    ) -> LangResult<(Self, Vec<ObservationFunction>)> {
        match Self::derive_bounded(module,observations,false) {
            Err(error) if error=="action model definition limit" || error.starts_with("action model work limit")=>Self::derive_bounded(module,observations,true),
            result=>result,
        }
    }
    fn derive_bounded(module:&CheckedModule,observations:&[SiteObservation],intern:bool)->LangResult<(Self,Vec<ObservationFunction>)> {
        let actions = CheckedActions::elaborate_with_frozen_roots(module)?;
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
        let mut l = Lower::new(p, &actions);
        l.intern_declarations=intern;
        l.prepare_pure_sources();
        l.prepare_recursive_records()?;
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
            let t = l.table(k,value)?;
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
                name: constructor_label(p,n)?,
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
        if intern {l.prepare_pure_definitions()?;}
        let mut descriptions = BTreeMap::new();
        for (index, a) in p.actions.iter().enumerate() {
            if intern {l.work=MAX_WORK;}
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
            l.track_projection_variables=intern;
            l.projection_variables=params.iter().cloned().collect();
            let term = l.action_flow(&actions, index, env, &observation).map_err(|error|
                if error=="action model work limit" {format!("{error} while projecting action {}",a.name)}else{error})?;
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
        let mut observed = vec![];
        for observation in observations {
            if intern {l.work=MAX_WORK;}
            observed.push(l.site_observation(&actions, observation)?);
        }
        if intern {l.work=MAX_WORK;}
        let initial_state=l.fixed_initial_state()?;
        let mut out = Self {
            schema: 1,
            semantics: SEMANTICS.into(),
            source: module.identity()?,
            state: l.state,
            events: l.events,
            types: l.types,
            recursive_records: l.recursive_records,
            tables: l.tables,
            actions: descriptions,
            objects: l.objects,
            source_invariants: p.contracts.invariant_checks.clone(),
            source_preconditions: p.contracts.precondition_checks.iter()
                .filter(|(name, _)| p.actions.iter().any(|a| &a.name == *name))
                .map(|(n, g)| (n.clone(), g.clone())).collect(),
            source_domain: vec![],
            frozen_domain: vec![],
            initial_state,
        };
        let (domain_objects,domain)=crate::contracts::state::source_domain(p)?;
        out.objects.extend(domain_objects);out.source_domain=domain;
        if out.objects.len()>registry::MAX_VIEW_ENTRIES {return Err("action model definition limit".into());}
        // These equalities follow from fixed source bindings, the absence of
        // writer capabilities and checked restore. They are not producer hints.
        if let Some(Term::Construct{arguments,..})=&out.initial_state {
            let bindings=(0..out.tables.len()).map(|i|format!("__frozen_root_{i}")).collect::<Vec<_>>();
            for (index,_) in p.states.iter().enumerate().filter(|(_,s)|p.frozen.contains_key(&s.name)) {
                out.frozen_domain.push(crate::logic::Equation {
                    from:Term::Match {scrutinee:Box::new(v("initial")),branches:vec![Branch{bindings:bindings.clone(),body:v(&bindings[index])}]},
                    to:arguments[index].clone(),
                });
            }
        }
        out.source_domain.extend(out.frozen_domain.iter().cloned());
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
            // This is a producer aid, never a proof premise. Full evaluation
            // can expand shared closed data back into an untransportable
            // spine. Keep its exact typed application when normalization or
            // the resulting hint exceeds the existing resource/depth bounds.
            // Ordinary Convert still has to establish every proposed equality.
            let evaluated = match context.evaluate(&params, &application) {
                Ok(term) => term,
                Err(error) if error == "inductive logic resource limit" => application.clone(),
                Err(error) => return Err(error),
            };
            let normal = match registry::canonical(&evaluated) {
                Ok(bytes) if bytes.len() <= case_bytes => public_normal(&evaluated, &BTreeMap::new(), &mut 0),
                Ok(_) => application.clone(),
                Err(error) if error == "canonical value depth limit" => application.clone(),
                Err(error) => return Err(error),
            };
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
        Ok((out, observed))
    }
    fn reachable(&self) -> LangResult<BTreeSet<String>> {
        let mut pending = self
            .actions
            .values()
            .map(|a| a.function.clone())
            .collect::<Vec<_>>();
        // Closed data definitions can occur only in source-derived premises,
        // even when no action reads that root. Rebind their complete meaning
        // against the input as well as the executable transition definitions.
        let mut fixed = BTreeSet::new();
        refs(&serde_json::to_value(&self.frozen_domain).map_err(|e| e.to_string())?, &mut fixed);
        pending.extend(fixed);
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
        definition_context(&self.objects)
    }
}
fn definition_context(objects: &BTreeMap<String, Entry>) -> LangResult<Context> {
        let mut c = Context::default();
        let mut pending = objects.clone();
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
/// Compare complete transitions over every logical state, version and argument,
/// or, with `sorted_tables`, over every state whose tables are strictly sorted
/// once that invariant is checked (recorded in the evidence's assumptions).
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
    let sorted = r
        .sorted_tables
        .as_ref()
        .map(|proofs| before.check_sorted(bundle, &context, proofs))
        .transpose()?;
    for (name, a) in &before.actions {
        let z = &after.actions[name];
        if a.params != z.params || a.result != z.result {
            return Err("action transition signature changed".into());
        }
        if !bundle.roots.contains(&a.function) || !bundle.roots.contains(&z.function) {
            return Err("source transition must be an enabled database root".into());
        }
        let args = a.params.iter().map(|(n, _)| v(n)).collect::<Vec<_>>();
        let mut hypotheses = match &sorted {
            Some(sorted) => before.sorted_hypotheses(
                sorted,
                v(&a.params.first().ok_or("action without state")?.0),
            ),
            None => vec![],
        };
        // Re-derived from the checked input, never copied from proposal data.
        // Keep sorted premises first so existing proof indices stay stable.
        hypotheses.extend(before.frozen_domain.iter().cloned());
        context
            .check(
                &a.params,
                &hypotheses,
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
    replacement: &Replacement,
    bundle: &registry::Bundle,
) -> LangResult<Vec<String>> {
    let mut references = BTreeSet::new();
    let invariant = replacement
        .sorted_tables
        .iter()
        .flat_map(|s| s.actions.values().flatten());
    for p in replacement.proofs.values().chain(invariant) {
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
