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
    /// Source types of the logic variables a translated term may mention.
    vars: BTreeMap<String, Type>,
}
fn free_vars(t: &Term, bound: &mut Vec<String>, out: &mut BTreeSet<String>) {
    match t {
        Term::Var(n) => {
            if !bound.contains(n) {
                out.insert(n.clone());
            }
        }
        Term::Construct { arguments, .. }
        | Term::Call { arguments, .. }
        | Term::SelfCall(arguments) => arguments.iter().for_each(|a| free_vars(a, bound, out)),
        Term::Binary { left, right, .. } => {
            free_vars(left, bound, out);
            free_vars(right, bound, out)
        }
        Term::If {
            condition,
            on_true,
            on_false,
        } => {
            free_vars(condition, bound, out);
            free_vars(on_true, bound, out);
            free_vars(on_false, bound, out)
        }
        Term::Match {
            scrutinee,
            branches,
        } => {
            free_vars(scrutinee, bound, out);
            for b in branches {
                let n = bound.len();
                bound.extend(b.bindings.iter().cloned());
                free_vars(&b.body, bound, out);
                bound.truncate(n);
            }
        }
        _ => {}
    }
}
/// Renames free occurrences of `from`; translated terms bind only fresh
/// `field_i` names, so no capture can occur.
fn rename(t: &Term, from: &str, to: &str) -> Term {
    let r = |x: &Term| rename(x, from, to);
    match t {
        Term::Var(n) if n == from => var(to),
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } => Term::Construct {
            datatype: datatype.clone(),
            constructor: *constructor,
            arguments: arguments.iter().map(r).collect(),
        },
        Term::Call {
            function,
            arguments,
        } => Term::Call {
            function: function.clone(),
            arguments: arguments.iter().map(r).collect(),
        },
        Term::SelfCall(arguments) => Term::SelfCall(arguments.iter().map(r).collect()),
        Term::Binary { op, left, right } => Term::Binary {
            op: op.clone(),
            left: Box::new(r(left)),
            right: Box::new(r(right)),
        },
        Term::If {
            condition,
            on_true,
            on_false,
        } => Term::If {
            condition: Box::new(r(condition)),
            on_true: Box::new(r(on_true)),
            on_false: Box::new(r(on_false)),
        },
        Term::Match {
            scrutinee,
            branches,
        } => Term::Match {
            scrutinee: Box::new(r(scrutinee)),
            branches: branches
                .iter()
                .map(|b| Branch {
                    bindings: b.bindings.clone(),
                    body: if b.bindings.iter().any(|x| x == from) {
                        b.body.clone()
                    } else {
                        r(&b.body)
                    },
                })
                .collect(),
        },
        other => other.clone(),
    }
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
    fn exact_operand(&mut self, ty: &Type, term: Term) -> LangResult<Term> {
        if *ty == Type::Int {
            return Ok(term);
        }
        if let Term::U64(n) = term {
            return self.integer(n);
        }
        if matches!(ty, Type::U64 | Type::U32) {
            return self.unsigned_integer(term);
        }
        Err("symbolic unsigned-to-Int correspondence remains unsupported".into())
    }
    /// Faithful embedding of an unsigned word into the exact integers, built
    /// only from ordinary definitions: bit `i` of `x` is the top bit of
    /// `x * 2^(63-i)` (wrapping), and Horner's rule accumulates
    /// `n = 2n + bit` over Natural. Each step mentions the accumulator once,
    /// so symbolic terms stay linear in the word width.
    fn unsigned_integer(&mut self, term: Term) -> LangResult<Term> {
        let natural = self.exact["Natural"].clone();
        let integer = self.exact["Integer"].clone();
        let nat = Sort::Data(natural.clone());
        let zero = Term::Construct {
            datatype: natural.clone(),
            constructor: 0,
            arguments: vec![],
        };
        let succ = |t: Term| Term::Construct {
            datatype: natural.clone(),
            constructor: 1,
            arguments: vec![t],
        };
        let cases = |scrutinee: Term, zero_case: Term, binder: &str, succ_case: Term| Term::Match {
            scrutinee: Box::new(scrutinee),
            branches: vec![
                Branch {
                    bindings: vec![],
                    body: zero_case,
                },
                Branch {
                    bindings: vec![binder.into()],
                    body: succ_case,
                },
            ],
        };
        let double = self.store(
            "source_natural_double".into(),
            Declaration::Function {
                params: vec![("n".into(), nat.clone())],
                result: nat.clone(),
                body: cases(
                    var("n"),
                    zero.clone(),
                    "m",
                    succ(succ(Term::SelfCall(vec![var("m")]))),
                ),
                recursive: Some(0),
            },
        )?;
        let plus = self.store(
            "source_natural_plus".into(),
            Declaration::Function {
                params: vec![("m".into(), nat.clone()), ("k".into(), nat.clone())],
                result: nat.clone(),
                body: cases(
                    var("k"),
                    var("m"),
                    "j",
                    succ(Term::SelfCall(vec![var("m"), var("j")])),
                ),
                recursive: Some(1),
            },
        )?;
        // Eight bits per definition keeps every object shallow enough for
        // the bounded JSON object reader.
        let mut chunks = vec![];
        for chunk in 0..8u32 {
            let mut accumulated = var("acc");
            for bit in (8 * chunk..8 * chunk + 8).rev() {
                let set = Term::Binary {
                    op: ">=".into(),
                    left: Box::new(Term::Binary {
                        op: "*".into(),
                        left: Box::new(var("x")),
                        right: Box::new(Term::U64(1u64 << (63 - bit))),
                    }),
                    right: Box::new(Term::U64(1u64 << 63)),
                };
                let digit = Term::If {
                    condition: Box::new(set),
                    on_true: Box::new(succ(zero.clone())),
                    on_false: Box::new(zero.clone()),
                };
                accumulated = call(&plus, vec![call(&double, vec![accumulated]), digit]);
            }
            chunks.push(self.store(
                format!("source_u64_natural_bits_{}_{}", 8 * chunk + 7, 8 * chunk),
                Declaration::Function {
                    params: vec![("acc".into(), nat.clone()), ("x".into(), Sort::U64)],
                    result: nat.clone(),
                    body: accumulated,
                    recursive: None,
                },
            )?);
        }
        // Horner order: the most significant chunk first.
        let mut accumulated = zero.clone();
        for chunk in chunks.iter().rev() {
            accumulated = call(chunk, vec![accumulated, var("x")]);
        }
        let to_natural = self.store(
            "source_u64_natural".into(),
            Declaration::Function {
                params: vec![("x".into(), Sort::U64)],
                result: nat,
                body: accumulated,
                recursive: None,
            },
        )?;
        // A Natural parameter makes that datatype a direct import of the
        // matching definition.
        let natural_integer = self.store(
            "source_natural_integer".into(),
            Declaration::Function {
                params: vec![("n".into(), Sort::Data(natural.clone()))],
                result: Sort::Data(integer.clone()),
                body: cases(
                    var("n"),
                    Term::Construct {
                        datatype: integer.clone(),
                        constructor: 0,
                        arguments: vec![],
                    },
                    "m",
                    Term::Construct {
                        datatype: integer.clone(),
                        constructor: 1,
                        arguments: vec![var("m")],
                    },
                ),
                recursive: None,
            },
        )?;
        let to_integer = self.store(
            "source_u64_integer".into(),
            Declaration::Function {
                params: vec![("x".into(), Sort::U64)],
                result: Sort::Data(integer),
                body: call(&natural_integer, vec![call(&to_natural, vec![var("x")])]),
                recursive: None,
            },
        )?;
        // A cast of a value read from one row-valued input becomes a
        // function of that input, structurally recursive on it with no
        // self-call. Concrete rows evaluate fully; for a symbolic row the
        // call stays folded, so proofs never expand the 64-bit conversion.
        let mut free = BTreeSet::new();
        free_vars(&term, &mut vec![], &mut free);
        if free.is_empty() {
            return Ok(call(&to_integer, vec![term]));
        }
        let owner = free.into_iter().collect::<Vec<_>>();
        let [owner] = owner.as_slice() else {
            return Err("unsigned-to-Int correspondence needs a single row-valued input".into());
        };
        let ty = self
            .vars
            .get(owner)
            .cloned()
            .ok_or("unsigned-to-Int input has no source type")?;
        let sort = self.sort(&ty, 0)?;
        if !matches!(sort, Sort::Data(_)) {
            return Err("unsigned-to-Int correspondence needs a structured row input".into());
        }
        let cast = self.store(
            "source_unsigned_integer".into(),
            Declaration::Function {
                params: vec![("value".into(), sort)],
                result: Sort::Data(self.exact["Integer"].clone()),
                body: call(&to_integer, vec![rename(&term, owner, "value")]),
                recursive: Some(0),
            },
        )?;
        Ok(call(&cast, vec![var(owner)]))
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
        vars: BTreeMap::new(),
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
    lower.vars = BTreeMap::from([("row".to_string(), ty.as_ref().clone())]);
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
    // The independently checked certificate still fixes source semantics.
    // Require every actual source definition and its immutable ancestry, not
    // unrelated maintenance theorems that the source model never references.
    let required = library::project(&expected.library, &expected.description.definitions)?;
    for (id, raw) in &required.objects {
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

// ---------------------------------------------------------------------------
// View decomposition: the literal meaning of a maintained collection pipeline.
//
// `export` above states each row's contribution (`projection`) and
// maintenance then sums contributions. That a `sum`/`count` over a chain of
// `map`/`filter` stages equals the sum of per-row projections was previously
// assumed. `export_view` instead states the pipeline literally: one list
// function per source stage, the final fold, and `decomposed(rows)`, the sum
// of projections. `verify_view` checks a supplied general-kernel proof of
// `pipeline(rows) = decomposed(rows)` for the actual source. The proof comes
// from an external producer; nothing here searches or adds a law.

pub const VIEW_SEMANTICS: &str = "source-view-pipeline-decomposition-v1";

#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ViewStage {
    pub kind: String,
    pub input: Sort,
    pub output: Sort,
    pub function: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, PartialEq, Eq)]
#[serde(deny_unknown_fields)]
pub struct ViewDescription {
    pub schema: u32,
    pub semantics: String,
    pub row: Description,
    pub aggregate: String,
    pub rows: Sort,
    pub stages: Vec<ViewStage>,
    pub fold: String,
    pub pipeline: String,
    pub decomposed: String,
    pub definitions: Vec<String>,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ViewModel {
    pub description: ViewDescription,
    pub library: Bundle,
}
/// A producer's answer: a bundle containing every exported definition
/// unchanged plus its own lemmas, and a proof of the exported obligation.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ViewEvidence {
    pub schema: u32,
    pub semantics: String,
    pub keep: String,
    pub library: Bundle,
    pub proof: crate::logic::Proof,
}

pub fn export_view(
    program: &Program,
    keep_name: &str,
    certificate: &Certificate,
) -> LangResult<ViewModel> {
    let model = export(program, keep_name, certificate)?;
    let evidence = certificate
        .evidence
        .as_ref()
        .ok_or("source view model requires database exact maintenance")?;
    let keep = program
        .keeps
        .iter()
        .find(|k| k.name == keep_name)
        .ok_or("unknown source keep")?;
    let plan = aggregate::plan_with_certificate(program, keep, certificate)
        .ok_or("unsupported source view pipeline")?;
    let root = program
        .states
        .iter()
        .find(|s| s.name == plan.root)
        .ok_or("unknown source table root")?;
    let Type::Table(_, row_type) = &root.ty else {
        return Err("source view root must be a table".into());
    };
    let mut lower = Lower {
        program,
        exact: &evidence.model,
        bundle: model.library.clone(),
        types: model.description.types.clone(),
        active: BTreeSet::new(),
        definitions: vec![],
        remaining: 512,
        vars: BTreeMap::new(),
    };
    let integer = Sort::Data(evidence.model["Integer"].clone());
    let zero = lower.integer(0)?;
    let one = lower.integer(1)?;
    let add = |a: Term, b: Term| call(&evidence.model["addition"], vec![a, b]);
    let data = |sort: &Sort| match sort {
        Sort::Data(id) => Ok(id.clone()),
        _ => Err("source view list sort must be a datatype".to_string()),
    };
    let list_match = |scrutinee: &str, nil: Term, cons: Term| Term::Match {
        scrutinee: Box::new(var(scrutinee)),
        branches: vec![
            Branch {
                bindings: vec![],
                body: nil,
            },
            Branch {
                bindings: vec!["head".into(), "tail".into()],
                body: cons,
            },
        ],
    };
    // Translate every lambda before creating any new sort, so a definition
    // shared with the row model (such as an unsigned cast) gets exactly the
    // same dependencies, and hence identity, as it does there.
    let mut element = row_type.as_ref().clone();
    let mut translated = vec![];
    for (kind, binder, expression) in &plan.stages {
        let env = BTreeMap::from([(binder.clone(), (element.clone(), var("head")))]);
        lower.vars = BTreeMap::from([("head".to_string(), element.clone())]);
        let (result, term) = lower.expression(expression, &env, 0)?;
        let next = if kind == "map" {
            result.clone()
        } else {
            if result != Type::Bool {
                return Err("source view filter must be Boolean".into());
            }
            element.clone()
        };
        translated.push((kind.clone(), element.clone(), next.clone(), term));
        element = next;
    }
    let rows = lower.sort(&Type::List(row_type.clone()), 0)?;
    let mut input = rows.clone();
    let mut stages = vec![];
    for (index, (kind, _, next_element, term)) in translated.into_iter().enumerate() {
        let rest = Term::SelfCall(vec![var("tail")]);
        let (output, cons) = if kind == "map" {
            let output = lower.sort(&Type::List(Box::new(next_element.clone())), 0)?;
            let cons = Term::Construct {
                datatype: data(&output)?,
                constructor: 1,
                arguments: vec![term, rest],
            };
            (output, cons)
        } else {
            let cons = Term::If {
                condition: Box::new(term),
                on_true: Box::new(Term::Construct {
                    datatype: data(&input)?,
                    constructor: 1,
                    arguments: vec![var("head"), rest.clone()],
                }),
                on_false: Box::new(rest),
            };
            (input.clone(), cons)
        };
        let nil = Term::Construct {
            datatype: data(&output)?,
            constructor: 0,
            arguments: vec![],
        };
        let function = lower.store(
            format!("source_view_{keep_name}_stage_{index}_{kind}"),
            Declaration::Function {
                params: vec![("xs".into(), input.clone())],
                result: output.clone(),
                body: list_match("xs", nil, cons),
                recursive: Some(0),
            },
        )?;
        stages.push(ViewStage {
            kind,
            input: input.clone(),
            output: output.clone(),
            function,
        });
        input = output;
    }
    let item = if plan.count {
        one
    } else {
        if element != Type::Int {
            return Err("source view sum requires exact Int elements".into());
        }
        var("head")
    };
    let fold = lower.store(
        format!(
            "source_view_{keep_name}_{}",
            if plan.count { "count" } else { "sum" }
        ),
        Declaration::Function {
            params: vec![("xs".into(), input.clone())],
            result: integer.clone(),
            body: list_match(
                "xs",
                zero.clone(),
                add(Term::SelfCall(vec![var("tail")]), item),
            ),
            recursive: Some(0),
        },
    )?;
    let mut literal = var("rows");
    for stage in &stages {
        literal = call(&stage.function, vec![literal]);
    }
    let pipeline = lower.store(
        format!("source_view_{keep_name}_pipeline"),
        Declaration::Function {
            params: vec![("rows".into(), rows.clone())],
            result: integer.clone(),
            body: call(&fold, vec![literal]),
            recursive: None,
        },
    )?;
    let decomposed = lower.store(
        format!("source_view_{keep_name}_decomposed"),
        Declaration::Function {
            params: vec![("rows".into(), rows.clone())],
            result: integer,
            body: list_match(
                "rows",
                zero,
                add(
                    Term::SelfCall(vec![var("tail")]),
                    call(&model.description.projection, vec![var("head")]),
                ),
            ),
            recursive: Some(0),
        },
    )?;
    library::load_bundle(&lower.bundle)?;
    Ok(ViewModel {
        description: ViewDescription {
            schema: 1,
            semantics: VIEW_SEMANTICS.into(),
            row: model.description,
            aggregate: if plan.count { "count" } else { "sum" }.into(),
            rows,
            stages,
            fold,
            pipeline,
            decomposed,
            definitions: lower.definitions,
        },
        library: lower.bundle,
    })
}

/// Check that `evidence` proves this source keep equals the sum of its row
/// projections. Every exported definition must appear unchanged and be
/// directly visible; the unchanged general kernel checks the bundle and the
/// exact obligation. Table enumeration and native lowering stay outside it.
pub fn verify_view(
    program: &Program,
    certificate: &Certificate,
    evidence: &ViewEvidence,
) -> LangResult<ViewDescription> {
    if evidence.schema != 1 || evidence.semantics != VIEW_SEMANTICS {
        return Err("unsupported source view evidence".into());
    }
    let expected = export_view(program, &evidence.keep, certificate)?;
    let description = &expected.description;
    let mut definitions = description.row.definitions.clone();
    definitions.extend(description.definitions.iter().cloned());
    let required = library::project(&expected.library, &definitions)?;
    for (id, raw) in &required.objects {
        if evidence.library.objects.get(id) != Some(raw) {
            return Err("source view evidence changed an exported definition".into());
        }
    }
    let context = library::load_bundle(&evidence.library)?.context;
    for id in &definitions {
        let object: Object =
            serde_json::from_str(&expected.library.objects[id]).map_err(|e| e.to_string())?;
        context
            .matches_definition(id, &object.declaration)
            .map_err(|e| format!("source view definition: {e}"))?;
    }
    let rows = var("rows");
    context
        .check(
            &[("rows".into(), description.rows.clone())],
            &[],
            &call(&description.pipeline, vec![rows.clone()]),
            &call(&description.decomposed, vec![rows]),
            &evidence.proof,
        )
        .map_err(|e| format!("source view decomposition: {e}"))?;
    Ok(expected.description)
}
