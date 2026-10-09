//! Logical source value types and row-local projections, with no rewrite laws.
//! Native codecs, map enumeration and transaction execution are separate bridges.
use crate::{
    aggregate::{self, Certificate},
    library::{self, Bundle, Object},
    logic::{Branch, Constructor, Declaration, Sort, Term},
    statecheck,
    syntax::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "source-row-values-and-projection-v1";
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct Description {
    pub schema: u32,
    pub semantics: String,
    pub source_ast_sha256: String,
    pub maintenance_id: String,
    pub root: String,
    pub keep: String,
    pub key_type: Type,
    pub key_sort: Sort,
    pub key_projection: String,
    pub row_type: Type,
    pub row_sort: Sort,
    pub projection: String,
    pub types: BTreeMap<String, Sort>,
    pub definitions: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Model {
    pub description: Description,
    pub library: Bundle,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub row_binding: Option<RowBinding>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct RowBinding {
    pub wrapper: String,
    pub projection: String,
}
fn var(name: &str) -> Term {
    Term::Var(name.into())
}
fn call(id: &str, arguments: Vec<Term>) -> Term {
    Term::Call {
        function: id.into(),
        arguments,
    }
}
fn matched(input: Term, bindings: Vec<String>, body: Term) -> Term {
    Term::Match {
        scrutinee: Box::new(input),
        branches: vec![Branch { bindings, body }],
    }
}
fn type_key(ty: &Type) -> String {
    serde_json::to_string(ty).expect("source type serialization")
}
fn references(value: &serde_json::Value, out: &mut BTreeSet<String>) {
    match value {
        serde_json::Value::Array(xs) => {
            for x in xs {
                references(x, out);
            }
        }
        serde_json::Value::Object(xs) => {
            for (k, v) in xs {
                if ["Data", "function", "datatype"].contains(&k.as_str()) {
                    if let Some(id) = v.as_str() {
                        out.insert(id.into());
                    }
                }
                references(v, out);
            }
        }
        _ => (),
    }
}
struct Lower<'a> {
    program: &'a Program,
    exact: &'a BTreeMap<String, String>,
    bundle: Bundle,
    types: BTreeMap<String, Sort>,
    active: BTreeSet<String>,
    definitions: Vec<String>,
    remaining: usize,
}
impl Lower<'_> {
    fn store(&mut self, name: String, declaration: Declaration) -> LangResult<String> {
        if self.definitions.len() >= 32 {
            return Err("source row definition budget exceeded".into());
        }
        let mut dependencies = BTreeSet::new();
        references(
            &serde_json::to_value(&declaration).map_err(|e| e.to_string())?,
            &mut dependencies,
        );
        // Exhaustive field matches may expose nested datatype sorts that do
        // not otherwise occur as explicit AST references in the projection.
        if matches!(declaration, Declaration::Function { .. }) {
            dependencies.extend(self.types.values().filter_map(|sort| match sort {
                Sort::Data(id) => Some(id.clone()),
                _ => None,
            }));
        }
        let object = Object {
            schema: 1,
            semantics: library::SEMANTICS.into(),
            name,
            dependencies: dependencies.into_iter().collect(),
            declaration,
        };
        let raw = serde_json::to_string(&object).map_err(|e| e.to_string())?;
        let id = format!("{:x}", Sha256::digest(raw.as_bytes()));
        if !self.bundle.objects.contains_key(&id) {
            self.bundle.objects.insert(id.clone(), raw);
            self.bundle.lock.objects.push(id.clone());
            self.definitions.push(id.clone());
        }
        Ok(id)
    }
    fn datatype(
        &mut self,
        name: String,
        constructors: Vec<(String, Vec<Sort>)>,
    ) -> LangResult<Sort> {
        Ok(Sort::Data(
            self.store(
                name,
                Declaration::Datatype {
                    constructors: constructors
                        .into_iter()
                        .map(|(name, fields)| Constructor { name, fields })
                        .collect(),
                },
            )?,
        ))
    }
    fn sort(&mut self, ty: &Type, depth: usize) -> LangResult<Sort> {
        if depth > 32 {
            return Err("source row type depth exceeded".into());
        }
        let key = type_key(ty);
        if let Some(sort) = self.types.get(&key) {
            return Ok(sort.clone());
        }
        if !self.active.insert(key.clone()) {
            return Err("recursive source row types are unsupported".into());
        }
        let sort = match ty {
            Type::U64 | Type::U32 => Sort::U64,
            Type::Bool => Sort::Bool,
            Type::Int => Sort::Data(self.exact["Integer"].clone()),
            Type::Unit => self.datatype("source_unit".into(), vec![("Unit".into(), vec![])])?,
            Type::String => self.datatype(
                "source_string_utf8_bytes".into(),
                vec![
                    ("Nil".into(), vec![]),
                    ("Cons".into(), vec![Sort::U64, Sort::SelfType]),
                ],
            )?,
            Type::List(inner) => {
                let inner = self.sort(inner, depth + 1)?;
                self.datatype(
                    format!("source_list_{key}"),
                    vec![
                        ("Nil".into(), vec![]),
                        ("Cons".into(), vec![inner, Sort::SelfType]),
                    ],
                )?
            }
            Type::Option(inner) => {
                let inner = self.sort(inner, depth + 1)?;
                self.datatype(
                    format!("source_option_{key}"),
                    vec![("None".into(), vec![]), ("Some".into(), vec![inner])],
                )?
            }
            Type::Result(ok, error) => {
                let ok = self.sort(ok, depth + 1)?;
                let error = self.sort(error, depth + 1)?;
                self.datatype(
                    format!("source_result_{key}"),
                    vec![("Ok".into(), vec![ok]), ("Err".into(), vec![error])],
                )?
            }
            Type::Named(name) if self.program.ids.contains(name) => self.datatype(
                format!("source_id_{name}"),
                vec![(name.clone(), vec![Sort::U64, Sort::U64])],
            )?,
            Type::Named(name) => {
                if let Some(fields) = self.program.records.get(name).cloned() {
                    let fields = fields
                        .iter()
                        .map(|(_, ty)| self.sort(ty, depth + 1))
                        .collect::<LangResult<Vec<_>>>()?;
                    self.datatype(
                        format!("source_record_{name}"),
                        vec![(name.clone(), fields)],
                    )?
                } else if let Some(variants) = self.program.enums.get(name) {
                    self.datatype(
                        format!("source_enum_{name}"),
                        variants.iter().map(|n| (n.clone(), vec![])).collect(),
                    )?
                } else {
                    return Err(format!("unknown source row type {name}"));
                }
            }
            _ => return Err("unsupported source row value type".into()),
        };
        self.active.remove(&key);
        self.types.insert(key, sort.clone());
        Ok(sort)
    }
    fn integer(&self, n: u64) -> LangResult<Term> {
        crate::exact_maintenance::expression(self.exact, &Expr::Num(n), &BTreeMap::new())
    }
    fn exact_operand(&self, ty: &Type, term: Term) -> LangResult<Term> {
        if *ty == Type::Int {
            return Ok(term);
        }
        if let Term::U64(n) = term {
            return self.integer(n);
        }
        Err("symbolic unsigned-to-Int correspondence remains unsupported".into())
    }
    fn expression(
        &mut self,
        e: &Expr,
        env: &BTreeMap<String, (Type, Term)>,
        depth: usize,
    ) -> LangResult<(Type, Term)> {
        if depth > 32 || self.remaining == 0 {
            return Err("source row expression budget exceeded".into());
        }
        self.remaining -= 1;
        match e {
            Expr::Var(name) => env
                .get(name)
                .cloned()
                .ok_or_else(|| format!("unbound source row name {name}")),
            Expr::Num(n) => Ok((Type::U64, Term::U64(*n))),
            Expr::Bool(b) => Ok((Type::Bool, Term::Bool(*b))),
            Expr::Field(base, field) => {
                let (ty, input) = self.expression(base, env, depth + 1)?;
                let Type::Named(name) = ty else {
                    return Err("field access requires a source record".into());
                };
                let fields = self
                    .program
                    .records
                    .get(&name)
                    .ok_or("field access requires a source record")?
                    .clone();
                let position = fields
                    .iter()
                    .position(|(n, _)| n == field)
                    .ok_or("unknown source row field")?;
                Ok((
                    fields[position].1.clone(),
                    matched(
                        input,
                        (0..fields.len()).map(|i| format!("field_{i}")).collect(),
                        var(&format!("field_{position}")),
                    ),
                ))
            }
            Expr::Call(name, args) if name == "Int" && args.len() == 1 => {
                let (ty, term) = self.expression(&args[0], env, depth + 1)?;
                Ok((Type::Int, self.exact_operand(&ty, term)?))
            }
            Expr::Binary(op, a, b) => {
                let (at, a) = self.expression(a, env, depth + 1)?;
                let (bt, b) = self.expression(b, env, depth + 1)?;
                if at == Type::Int || bt == Type::Int {
                    if op != "+" && op != "-" {
                        return Err("exact source row arithmetic currently supports + and -".into());
                    }
                    let a = self.exact_operand(&at, a)?;
                    let b = self.exact_operand(&bt, b)?;
                    Ok((
                        Type::Int,
                        call(
                            &self.exact[if op == "+" { "addition" } else { "subtraction" }],
                            vec![a, b],
                        ),
                    ))
                } else {
                    if ["+", "-", "*"].contains(&op.as_str())
                        && (at == Type::U32 || bt == Type::U32)
                    {
                        return Err(
                            "u32 arithmetic correspondence requires its exact modular width".into(),
                        );
                    }
                    let result = if ["+", "-", "*"].contains(&op.as_str()) {
                        Type::U64
                    } else {
                        Type::Bool
                    };
                    Ok((
                        result,
                        Term::Binary {
                            op: op.clone(),
                            left: Box::new(a),
                            right: Box::new(b),
                        },
                    ))
                }
            }
            _ => Err("unsupported pure source row expression".into()),
        }
    }
}

pub fn export(program: &Program, keep_name: &str, certificate: &Certificate) -> LangResult<Model> {
    statecheck::check(program)?;
    aggregate::verify(certificate)?;
    let evidence = certificate
        .evidence
        .as_ref()
        .ok_or("source row model requires database exact maintenance")?;
    let keep = program
        .keeps
        .iter()
        .find(|k| k.name == keep_name)
        .ok_or("unknown source keep")?;
    let plan = aggregate::plan_with_certificate(program, keep, certificate)
        .ok_or("unsupported source row pipeline/key domain")?;
    let root = program
        .states
        .iter()
        .find(|s| s.name == plan.root)
        .ok_or("unknown source table root")?;
    let Type::Table(key, ty) = &root.ty else {
        return Err("source row root must be a table".into());
    };
    if !matches!(key.as_ref(), Type::U32 | Type::U64)
        && !matches!(key.as_ref(),Type::Named(n) if program.ids.contains(n))
    {
        return Err("source row undo currently requires numeric/128-bit keys".into());
    }
    let mut lower = Lower {
        program,
        exact: &evidence.model,
        bundle: evidence.library.clone(),
        types: BTreeMap::new(),
        active: BTreeSet::new(),
        definitions: vec![],
        remaining: 512,
    };
    let table = evidence
        .table
        .as_ref()
        .ok_or("source row/key model requires version-4 table evidence")?;
    let key_sort = lower.sort(key, 0)?;
    let key_words = |hi, lo| Term::Construct {
        datatype: table.model["TableKey128"].clone(),
        constructor: 0,
        arguments: vec![hi, lo],
    };
    let key_body = if matches!(key.as_ref(), Type::Named(_)) {
        matched(
            var("key"),
            vec!["high".into(), "low".into()],
            key_words(var("high"), var("low")),
        )
    } else {
        key_words(Term::U64(0), var("key"))
    };
    let key_projection = lower.store(
        format!("source_key_words_{}", plan.root),
        Declaration::Function {
            params: vec![("key".into(), key_sort.clone())],
            result: Sort::Data(table.model["TableKey128"].clone()),
            body: key_body,
            recursive: None,
        },
    )?;
    let row_sort = lower.sort(ty, 0)?;
    let mut current = (ty.as_ref().clone(), var("row"));
    let mut conditions = vec![];
    for (stage, binder, expression) in &plan.stages {
        let env = BTreeMap::from([(binder.clone(), current.clone())]);
        let next = lower.expression(expression, &env, 0)?;
        if stage == "map" {
            current = next;
        } else {
            if next.0 != Type::Bool {
                return Err("source row filter must be Boolean".into());
            }
            conditions.push(next.1);
        }
    }
    let mut projected = if plan.count {
        lower.integer(1)?
    } else {
        lower.exact_operand(&current.0, current.1)?
    };
    for condition in conditions.into_iter().rev() {
        projected = Term::If {
            condition: Box::new(condition),
            on_true: Box::new(projected),
            on_false: Box::new(lower.integer(0)?),
        };
    }
    let projection = lower.store(
        format!("source_row_projection_{keep_name}"),
        Declaration::Function {
            params: vec![("row".into(), row_sort.clone())],
            result: Sort::Data(evidence.model["Integer"].clone()),
            body: projected,
            recursive: None,
        },
    )?;
    library::load_bundle(&lower.bundle)?;
    Ok(Model {
        description: Description {
            schema: 1,
            semantics: SEMANTICS.into(),
            source_ast_sha256: format!(
                "{:x}",
                Sha256::digest(serde_json::to_vec(program).map_err(|e| e.to_string())?)
            ),
            maintenance_id: certificate.id.clone(),
            root: plan.root,
            keep: keep_name.into(),
            key_type: key.as_ref().clone(),
            key_sort,
            key_projection,
            row_type: ty.as_ref().clone(),
            row_sort,
            projection,
            types: lower.types,
            definitions: lower.definitions,
        },
        library: lower.bundle,
        row_binding: None,
    })
}

/// Bind every generated definition to this source and certificate. Loading a
/// theorem alone, or changing metadata/content hashes, cannot supply this link.
pub fn verify(program: &Program, certificate: &Certificate, model: &Model) -> LangResult<()> {
    let expected = export(program, &model.description.keep, certificate)?;
    if model.description != expected.description {
        return Err("source row description does not match current source/certificate".into());
    }
    let context = library::load_bundle(&model.library)?.context;
    for id in &expected.description.definitions {
        let object: Object =
            serde_json::from_str(&expected.library.objects[id]).map_err(|e| e.to_string())?;
        context
            .matches_definition(id, &object.declaration)
            .map_err(|e| format!("source row definition: {e}"))?;
    }
    // Exact semantic definitions are bound by the checked original certificate;
    // their content identities must occur in the checked extended library too.
    for (id, raw) in &expected.library.objects {
        if model.library.objects.get(id) != Some(raw) {
            return Err("source row library changed an expected semantic object".into());
        }
    }
    if let Some(binding) = &model.row_binding {
        context
            .matches_definition(
                &binding.wrapper,
                &Declaration::Datatype {
                    constructors: vec![Constructor {
                        name: "Row".into(),
                        fields: vec![expected.description.row_sort.clone()],
                    }],
                },
            )
            .map_err(|e| format!("source row wrapper: {e}"))?;
        context
            .matches_definition(
                &binding.projection,
                &Declaration::Function {
                    params: vec![("row".into(), Sort::Data(binding.wrapper.clone()))],
                    result: Sort::Data(
                        certificate.evidence.as_ref().unwrap().model["Integer"].clone(),
                    ),
                    body: matched(
                        var("row"),
                        vec!["payload".into()],
                        call(&expected.description.projection, vec![var("payload")]),
                    ),
                    recursive: Some(0),
                },
            )
            .map_err(|e| format!("source row projection adapter: {e}"))?;
    }
    Ok(())
}
