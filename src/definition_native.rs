//! Straightforward lowering of checked first-order definitions, with no
//! optimisation laws or representation recognisers. Rust/LLVM remain trusted.
use crate::{
    library::{self, Bundle, Object},
    logic::{Constructor, Declaration, Proof, Sort, Term},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

pub const SEMANTICS: &str = "ink-definition-rust-v1";
pub const SELECTION_SEMANTICS: &str = "ink-definition-selection-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Replacement {
    pub original: String,
    pub replacement: String,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct SelectionPackage {
    pub schema: u32,
    pub semantics: String,
    pub observations: String,
    pub bundle_sha256: String,
    pub proposals: Vec<Replacement>,
}
#[derive(Debug, Serialize)]
pub struct Receipt {
    pub schema: u32,
    pub semantics: String,
    pub definition_semantics: String,
    pub bundle_sha256: String,
    pub source_sha256: String,
    pub exports: Vec<String>,
    pub checked_closure: Vec<String>,
    pub executable_closure: Vec<String>,
    pub selections: Vec<(String, String)>,
    pub selection_package_sha256: Option<String>,
    pub scope: String,
}
pub struct Emission {
    pub source: String,
    pub receipt: Receipt,
}
#[derive(Clone)]
struct Expression {
    code: String,
    sort: Sort,
    borrowed: bool,
}
impl Expression {
    fn owned(&self) -> String {
        if self.borrowed {
            format!("({}).clone()", self.code)
        } else {
            self.code.clone()
        }
    }
    fn argument(&self) -> String {
        if matches!(self.sort, Sort::Data(_)) && !self.borrowed {
            format!("&({})", self.code)
        } else {
            self.code.clone()
        }
    }
}
struct Lower<'a> {
    objects: &'a BTreeMap<String, Object>,
    selected: BTreeSet<String>,
    binder: usize,
    nodes: usize,
}
fn ty(sort: &Sort) -> LangResult<String> {
    Ok(match sort {
        Sort::Bool => "bool".into(),
        Sort::U64 => "u64".into(),
        Sort::Data(id) => format!("D_{id}"),
        Sort::SelfType => return Err("unresolved definition sort".into()),
    })
}
fn field_sort(sort: &Sort, id: &str) -> Sort {
    if *sort == Sort::SelfType {
        Sort::Data(id.into())
    } else {
        sort.clone()
    }
}
impl Lower<'_> {
    fn fresh(&mut self) -> String {
        let name = format!("v{}", self.binder);
        self.binder += 1;
        name
    }
    fn declaration(&self, id: &str) -> LangResult<&Declaration> {
        self.objects
            .get(id)
            .map(|o| &o.declaration)
            .ok_or_else(|| "missing checked definition".into())
    }
    fn constructors(&self, id: &str) -> LangResult<Vec<Constructor>> {
        match self.declaration(id)? {
            Declaration::Datatype { constructors } => Ok(constructors.clone()),
            _ => Err("definition is not a datatype".into()),
        }
    }
    fn select_sort(&mut self, sort: &Sort) -> LangResult<()> {
        if let Sort::Data(id) = sort {
            self.select(id)?;
        }
        Ok(())
    }
    fn select(&mut self, id: &str) -> LangResult<()> {
        if !self.selected.insert(id.into()) {
            return Ok(());
        }
        match self.declaration(id)?.clone() {
            Declaration::Datatype { constructors } => {
                for constructor in constructors {
                    for s in constructor.fields {
                        self.select_sort(&s)?;
                    }
                }
            }
            Declaration::Function {
                params,
                result,
                body,
                ..
            } => {
                for (_, s) in params {
                    self.select_sort(&s)?;
                }
                self.select_sort(&result)?;
                self.select_term(&body, 0)?;
            }
            Declaration::Theorem { .. } => {
                return Err("theorems are not executable definitions".into())
            }
        }
        Ok(())
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        self.nodes += 1;
        if depth > 128 || self.nodes > 100_000 {
            return Err("definition lowering resource limit".into());
        }
        Ok(())
    }
    fn select_term(&mut self, t: &Term, depth: usize) -> LangResult<()> {
        self.step(depth)?;
        match t {
            Term::Construct {
                datatype,
                arguments,
                ..
            } => {
                self.select(datatype)?;
                for a in arguments {
                    self.select_term(a, depth + 1)?;
                }
            }
            Term::Call {
                function,
                arguments,
            } => {
                self.select(function)?;
                for a in arguments {
                    self.select_term(a, depth + 1)?;
                }
            }
            Term::SelfCall(args) => {
                for a in args {
                    self.select_term(a, depth + 1)?;
                }
            }
            Term::Binary { left, right, .. } => {
                self.select_term(left, depth + 1)?;
                self.select_term(right, depth + 1)?;
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                self.select_term(condition, depth + 1)?;
                self.select_term(on_true, depth + 1)?;
                self.select_term(on_false, depth + 1)?;
            }
            Term::Match {
                scrutinee,
                branches,
            } => {
                self.select_term(scrutinee, depth + 1)?;
                for b in branches {
                    self.select_term(&b.body, depth + 1)?;
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn expression(
        &mut self,
        t: &Term,
        env: &BTreeMap<String, Expression>,
        current: &str,
        depth: usize,
    ) -> LangResult<Expression> {
        self.step(depth)?;
        let (code, sort) = match t {
            Term::Var(name) => {
                return env
                    .get(name)
                    .cloned()
                    .ok_or_else(|| "unbound lowered variable".into())
            }
            Term::Bool(b) => (b.to_string(), Sort::Bool),
            Term::U64(n) => (format!("{n}u64"), Sort::U64),
            Term::Binary { op, left, right } => {
                let l = self.expression(left, env, current, depth + 1)?;
                let r = self.expression(right, env, current, depth + 1)?;
                let (code, sort) = match op.as_str() {
                    "+" | "-" | "*" => {
                        let method = match op.as_str() {
                            "+" => "wrapping_add",
                            "-" => "wrapping_sub",
                            _ => "wrapping_mul",
                        };
                        (format!("({}).{method}({})", l.code, r.code), Sort::U64)
                    }
                    "&&" | "||" => (
                        format!(
                            "(({}) {} ({}))",
                            l.code,
                            if op == "&&" { "&" } else { "|" },
                            r.code
                        ),
                        Sort::Bool,
                    ),
                    "==" | "!=" | "<" | "<=" | ">" | ">=" => {
                        (format!("(({}) {op} ({}))", l.code, r.code), Sort::Bool)
                    }
                    _ => return Err("unsupported lowered primitive".into()),
                };
                (code, sort)
            }
            Term::Call {
                function,
                arguments,
            } => self.call(function, arguments, env, current, depth + 1)?,
            Term::SelfCall(arguments) => self.call(current, arguments, env, current, depth + 1)?,
            Term::Construct {
                datatype,
                constructor,
                arguments,
            } => {
                let cs = self.constructors(datatype)?;
                let c = cs.get(*constructor).ok_or("invalid lowered constructor")?;
                let mut args = Vec::new();
                for (t, s) in arguments.iter().zip(&c.fields) {
                    let e = self.expression(t, env, current, depth + 1)?;
                    args.push(if matches!(field_sort(s, datatype), Sort::Data(_)) {
                        format!("Box::new({})", e.owned())
                    } else {
                        e.owned()
                    });
                }
                (
                    format!(
                        "D_{datatype}::C{constructor}{}",
                        if args.is_empty() {
                            String::new()
                        } else {
                            format!("({})", args.join(","))
                        }
                    ),
                    Sort::Data(datatype.clone()),
                )
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                let c = self.expression(condition, env, current, depth + 1)?;
                let a = self.expression(on_true, env, current, depth + 1)?;
                let b = self.expression(on_false, env, current, depth + 1)?;
                (
                    format!("if {} {{ {} }} else {{ {} }}", c.code, a.owned(), b.owned()),
                    a.sort,
                )
            }
            Term::Match {
                scrutinee,
                branches,
            } => {
                let e = self.expression(scrutinee, env, current, depth + 1)?;
                let Sort::Data(id) = &e.sort else {
                    return Err("invalid lowered match".into());
                };
                let cs = self.constructors(id)?;
                let mut arms = Vec::new();
                let mut result = None;
                for (i, (branch, constructor)) in branches.iter().zip(cs).enumerate() {
                    let mut local = env.clone();
                    let mut fields = Vec::new();
                    for (name, s) in branch.bindings.iter().zip(constructor.fields) {
                        let binder = self.fresh();
                        let sort = field_sort(&s, id);
                        let data = matches!(sort, Sort::Data(_));
                        local.insert(
                            name.clone(),
                            Expression {
                                code: if data {
                                    format!("{binder}.as_ref()")
                                } else {
                                    format!("*{binder}")
                                },
                                sort,
                                borrowed: data,
                            },
                        );
                        fields.push(binder);
                    }
                    let b = self.expression(&branch.body, &local, current, depth + 1)?;
                    result = Some(b.sort.clone());
                    arms.push(format!(
                        "D_{id}::C{i}{} => {{ {} }}",
                        if fields.is_empty() {
                            String::new()
                        } else {
                            format!("({})", fields.join(","))
                        },
                        b.owned()
                    ));
                }
                (
                    format!("match {} {{ {} }}", e.argument(), arms.join(",")),
                    result.ok_or("empty lowered match")?,
                )
            }
        };
        Ok(Expression {
            code,
            sort,
            borrowed: false,
        })
    }
    fn call(
        &mut self,
        id: &str,
        args: &[Term],
        env: &BTreeMap<String, Expression>,
        current: &str,
        depth: usize,
    ) -> LangResult<(String, Sort)> {
        let Declaration::Function { result, .. } = self.declaration(id)?.clone() else {
            return Err("invalid lowered call".into());
        };
        let args = args
            .iter()
            .map(|a| {
                self.expression(a, env, current, depth + 1)
                    .map(|e| e.argument())
            })
            .collect::<LangResult<Vec<_>>>()?;
        Ok((format!("d_{id}({})", args.join(",")), result))
    }
    fn datatype(&self, id: &str, cs: &[Constructor]) -> LangResult<String> {
        let mut variants = Vec::new();
        let mut decode = Vec::new();
        let mut encode = Vec::new();
        for (i, c) in cs.iter().enumerate() {
            let sorts: Vec<_> = c.fields.iter().map(|s| field_sort(s, id)).collect();
            let types = sorts
                .iter()
                .map(|s| {
                    let t = ty(s)?;
                    Ok(if matches!(s, Sort::Data(_)) {
                        format!("Box<{t}>")
                    } else {
                        t
                    })
                })
                .collect::<LangResult<Vec<_>>>()?;
            variants.push(format!(
                "C{i}{}",
                if types.is_empty() {
                    String::new()
                } else {
                    format!("({})", types.join(","))
                }
            ));
            let mut ds = Vec::new();
            let mut es = Vec::new();
            let mut bs = Vec::new();
            for (j, s) in sorts.iter().enumerate() {
                let decoded = decode_value(s, &format!("&arguments[{j}]"));
                ds.push(if matches!(s, Sort::Data(_)) {
                    format!("Box::new({decoded})")
                } else {
                    decoded
                });
                bs.push(format!("b{j}"));
                es.push(encode_value(s, &format!("b{j}"), true));
            }
            decode.push(format!(
                "{i} if arguments.len() == {} => Ok(Self::C{i}{}),",
                sorts.len(),
                if ds.is_empty() {
                    String::new()
                } else {
                    format!("({})", ds.join(","))
                }
            ));
            encode.push(format!("Self::C{i}{} => Value::Data {{ datatype: \"{id}\".into(), constructor: {i}, arguments: vec![{}] }},", if bs.is_empty() { String::new() } else { format!("({})", bs.join(",")) }, es.join(",")));
        }
        Ok(format!("#[derive(Clone, Debug, PartialEq, Eq)]\npub enum D_{id} {{ {} }}\nimpl D_{id} {{\n fn decode(v: &Value) -> Result<Self, &'static str> {{ match v {{ Value::Data {{ datatype, constructor, arguments }} if datatype == \"{id}\" => match constructor {{ {} _ => Err(\"constructor or field count mismatch\") }}, _ => Err(\"datatype mismatch\") }} }}\n fn encode(&self) -> Value {{ match self {{ {} }} }}\n}}\n", variants.join(","), decode.join("\n"), encode.join("\n")))
    }
}
fn decode_value(sort: &Sort, value: &str) -> String {
    match sort {
        Sort::Bool => format!("decode_bool({value})?"),
        Sort::U64 => format!("decode_u64({value})?"),
        Sort::Data(id) => format!("D_{id}::decode({value})?"),
        Sort::SelfType => unreachable!("sorts resolved before codec lowering"),
    }
}
fn encode_value(sort: &Sort, value: &str, borrowed: bool) -> String {
    match sort {
        Sort::Bool => format!("Value::Bool({}{value})", if borrowed { "*" } else { "" }),
        Sort::U64 => format!("Value::U64({}{value})", if borrowed { "*" } else { "" }),
        Sort::Data(_) => format!("({value}).encode()"),
        Sort::SelfType => unreachable!("sorts resolved before codec lowering"),
    }
}

/// Check the whole bundle before lowering; selecting exports cannot hide an
/// invalid theorem. Only explicitly public function roots may be exported.
pub fn emit(bundle: &Bundle, exports: &[String]) -> LangResult<Emission> {
    emit_selected(bundle, exports, None)
}
/// Entry selections preserve total returned values over the entire parameter
/// domain. Internal calls continue to name original immutable definitions;
/// redirecting those calls could introduce cycles even for equal candidates.
pub fn emit_selected(
    bundle: &Bundle,
    exports: &[String],
    selection: Option<&SelectionPackage>,
) -> LangResult<Emission> {
    let checked = library::load_bundle(bundle)?;
    let bundle_sha256 = format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(bundle).map_err(|e| e.to_string())?)
    );
    if exports.is_empty() || exports.len() > 128 {
        return Err("definition export count limit".into());
    }
    let mut unique = BTreeSet::new();
    for id in exports {
        if !bundle.lock.objects.contains(id) {
            return Err("definition export is not a public root".into());
        }
        if !unique.insert(id) {
            return Err("duplicate definition export".into());
        }
    }
    let objects = bundle
        .objects
        .iter()
        .map(|(id, raw)| {
            Ok((
                id.clone(),
                serde_json::from_str::<Object>(raw).map_err(|e| e.to_string())?,
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let mut choices = BTreeMap::new();
    if let Some(package) = selection {
        if package.schema != 1
            || package.semantics != SELECTION_SEMANTICS
            || package.observations != "first-order-total-values-v1"
        {
            return Err("incompatible definition selection semantics".into());
        }
        if package.bundle_sha256 != bundle_sha256 {
            return Err("definition selection bundle identity mismatch".into());
        }
        if package.proposals.len() > 128 {
            return Err("definition proposal count limit".into());
        }
        for proposal in &package.proposals {
            if !exports.contains(&proposal.original) {
                return Err("definition proposal does not name an export".into());
            }
            if !bundle.lock.objects.contains(&proposal.replacement) {
                return Err("replacement is not a public root".into());
            }
            if choices
                .insert(proposal.original.clone(), proposal.replacement.clone())
                .is_some()
            {
                return Err("duplicate definition proposal".into());
            }
            let (Some(original), Some(replacement)) = (
                objects.get(&proposal.original),
                objects.get(&proposal.replacement),
            ) else {
                return Err("missing replacement definition".into());
            };
            let (
                Declaration::Function { params, result, .. },
                Declaration::Function {
                    params: to_params,
                    result: to_result,
                    ..
                },
            ) = (&original.declaration, &replacement.declaration)
            else {
                return Err("replacement endpoints must be functions".into());
            };
            if result != to_result
                || params.iter().map(|p| &p.1).collect::<Vec<_>>()
                    != to_params.iter().map(|p| &p.1).collect::<Vec<_>>()
            {
                return Err("replacement function signature mismatch".into());
            }
            let args: Vec<_> = params.iter().map(|p| Term::Var(p.0.clone())).collect();
            checked.context.check(
                params,
                &[],
                &Term::Call {
                    function: proposal.original.clone(),
                    arguments: args.clone(),
                },
                &Term::Call {
                    function: proposal.replacement.clone(),
                    arguments: args,
                },
                &proposal.proof,
            )?;
        }
    }
    let mut lower = Lower {
        objects: &objects,
        selected: BTreeSet::new(),
        binder: 0,
        nodes: 0,
    };
    for id in exports {
        if !matches!(lower.declaration(id)?, Declaration::Function { .. }) {
            return Err("definition export must be a function".into());
        }
        lower.select(choices.get(id).unwrap_or(id))?;
    }
    let mut source = String::from("// ink-definition-rust-v1: checked bodies; Rust/backend are trusted.\n#![allow(non_camel_case_types, dead_code, unused_variables, unused_parens)]\n");
    source.push_str(include_str!("definition_value.rs.txt"));
    let selected: Vec<_> = lower.selected.iter().cloned().collect();
    for id in &selected {
        match lower.declaration(id)?.clone() {
            Declaration::Datatype { constructors } => {
                source.push_str(&lower.datatype(id, &constructors)?)
            }
            Declaration::Function {
                params,
                result,
                body,
                ..
            } => {
                let mut env = BTreeMap::new();
                let mut inputs = Vec::new();
                for (n, s) in params {
                    let binder = lower.fresh();
                    let data = matches!(s, Sort::Data(_));
                    inputs.push(format!(
                        "{binder}: {}{}",
                        if data { "&" } else { "" },
                        ty(&s)?
                    ));
                    env.insert(
                        n,
                        Expression {
                            code: binder,
                            sort: s,
                            borrowed: data,
                        },
                    );
                }
                let body = lower.expression(&body, &env, id, 0)?;
                source.push_str(&format!(
                    "fn d_{id}({}) -> {} {{ {} }}\n",
                    inputs.join(","),
                    ty(&result)?,
                    body.owned()
                ));
            }
            _ => return Err("non-executable dependency selected".into()),
        }
        if source.len() > 16_000_000 {
            return Err("definition source size limit".into());
        }
    }
    // Typed exports are wrappers, not mutable definition identities.
    for id in exports {
        let Declaration::Function { params, result, .. } = &objects[id].declaration else {
            unreachable!()
        };
        let target = choices.get(id).unwrap_or(id);
        let mut inputs = Vec::new();
        let mut args = Vec::new();
        for (_, s) in params {
            let binder = lower.fresh();
            inputs.push(format!(
                "{binder}: {}{}",
                if matches!(s, Sort::Data(_)) { "&" } else { "" },
                ty(s)?
            ));
            args.push(binder);
        }
        source.push_str(&format!(
            "pub fn f_{id}({}) -> {} {{ d_{target}({}) }}\n",
            inputs.join(","),
            ty(result)?,
            args.join(",")
        ));
    }
    source.push_str("pub fn invoke(function: &str, args: &[Value]) -> Result<Value, &'static str> { validate_inputs(args)?; match function {\n");
    for id in exports {
        let Declaration::Function { params, result, .. } = &objects[id].declaration else {
            unreachable!()
        };
        let mut inputs = Vec::new();
        source.push_str(&format!(
            "\"{id}\" if args.len() == {} => {{\n",
            params.len()
        ));
        for (i, (_, s)) in params.iter().enumerate() {
            source.push_str(&format!(
                "let a{i} = {};\n",
                decode_value(s, &format!("&args[{i}]"))
            ));
            inputs.push(format!(
                "{}a{i}",
                if matches!(s, Sort::Data(_)) { "&" } else { "" }
            ));
        }
        source.push_str(&format!(
            "let result = f_{id}({}); Ok({}) }},\n",
            inputs.join(","),
            encode_value(result, "result", false)
        ));
    }
    source.push_str("_ => Err(\"unknown export or argument count mismatch\") } }\n");
    if source.len() > 16_000_000 {
        return Err("definition source size limit".into());
    }
    let receipt = Receipt {
        schema: 1, semantics: SEMANTICS.into(), definition_semantics: library::SEMANTICS.into(),
        bundle_sha256,
        source_sha256: format!("{:x}", Sha256::digest(source.as_bytes())), exports: exports.to_vec(), checked_closure: checked.closure,
        executable_closure: selected,
        selections: exports.iter().map(|id| (id.clone(), choices.get(id).unwrap_or(id).clone())).collect(),
        selection_package_sha256: selection.map(|p| serde_json::to_vec(p).map(|bytes| format!("{:x}", Sha256::digest(bytes))).map_err(|e| e.to_string())).transpose()?,
        scope: "exact checked first-order definition bodies; trusted Rust lowering, codecs and Rust/LLVM backend; boxed baseline; no stateful source admission, physical storage refinement, host-failure preservation or execution-cost bound".into(),
    };
    Ok(Emission { source, receipt })
}
