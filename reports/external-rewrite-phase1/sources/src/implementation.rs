//! Whole-function database proposals. This module fixes source semantics, not
//! optimisation laws. Every replacement requires an unconditional kernel proof.
use crate::{
    check, knowledge, library,
    logic::{Branch, Constructor, Context, Declaration, Proof, Sort, Term},
    syntax::{Expr, Program, Type},
    LangResult,
};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::{BTreeMap, BTreeSet},
    path::{Component, Path},
};
pub const SEMANTICS: &str = "source-collections-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Proposal {
    pub function: String,
    pub from: Expr,
    pub to: Expr,
    pub datatype: String,
    pub from_definitions: Vec<String>,
    pub to_definitions: Vec<String>,
    pub proof: Proof,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Package {
    pub schema: u32,
    pub semantics: String,
    pub library: String,
    pub proposals: Vec<Proposal>,
}
pub const REPLACEMENT_SEMANTICS: &str = "ink-checked-replacement-v1";
/// Versioned admission envelope. This first proof domain is pure total-value
/// equality; effects, allocation failures and migration need separate domains.
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct ReplacementPackage {
    pub schema: u32,
    pub semantics: String,
    pub core_semantics: String,
    pub input_core_sha256: String,
    pub observations: String,
    pub library_lock_sha256: String,
    pub package: Package,
}
#[derive(Debug, Serialize)]
pub struct ReplacementEvidence {
    pub replacement_package_sha256: String,
    pub input_core_sha256: String,
    pub selected_core_sha256: String,
    pub library_lock_sha256: String,
    pub observations: String,
    pub equality: Evidence,
}
#[derive(Debug, Serialize)]
pub struct Evidence {
    pub package_sha256: String,
    pub library_lock: knowledge::Lock,
    pub library_closure: Vec<String>,
    pub checked_proposals: Vec<Proposal>,
    pub source_models: Vec<(Term, Term)>,
    pub scope: &'static str,
}
type Env = BTreeMap<String, (Sort, Term)>;
fn var(n: &str) -> Term {
    Term::Var(n.into())
}
fn bin(op: &str, left: Term, right: Term) -> Term {
    Term::Binary {
        op: op.into(),
        left: Box::new(left),
        right: Box::new(right),
    }
}
fn sort(ty: &Type, datatype: &str) -> LangResult<Sort> {
    match ty {
        Type::Bool => Ok(Sort::Bool),
        Type::U64 => Ok(Sort::U64),
        Type::List(inner) if **inner == Type::U64 => Ok(Sort::Data(datatype.into())),
        _ => Err("unsupported type in collection correspondence".into()),
    }
}
fn free(
    e: &Expr,
    bound: &BTreeSet<String>,
    out: &mut BTreeSet<String>,
    depth: usize,
) -> LangResult<()> {
    if depth > 128 {
        return Err("collection correspondence depth limit".into());
    }
    match e {
        Expr::Var(n) if !bound.contains(n) => {
            out.insert(n.clone());
        }
        Expr::Binary(_, a, b) => {
            free(a, bound, out, depth + 1)?;
            free(b, bound, out, depth + 1)?;
        }
        Expr::Call(_, args) => {
            for a in args {
                free(a, bound, out, depth + 1)?;
            }
        }
        Expr::Method(xs, _, args) => {
            free(xs, bound, out, depth + 1)?;
            for a in args {
                free(a, bound, out, depth + 1)?;
            }
        }
        Expr::Lambda(n, body) => {
            let mut local = bound.clone();
            local.insert(n.clone());
            free(body, &local, out, depth + 1)?;
        }
        Expr::Num(_) | Expr::Bool(_) | Expr::Var(_) => {}
        _ => return Err("unsupported expression in collection correspondence".into()),
    }
    Ok(())
}
struct Translator<'a> {
    context: &'a Context,
    program: &'a Program,
    datatype: &'a str,
    ids: &'a [String],
    cursor: usize,
    remaining: usize,
}
impl Translator<'_> {
    fn construct(&self, constructor: usize, arguments: Vec<Term>) -> Term {
        Term::Construct {
            datatype: self.datatype.into(),
            constructor,
            arguments,
        }
    }
    fn expr(&mut self, e: &Expr, env: &Env, depth: usize) -> LangResult<Term> {
        if depth > 128 || self.remaining == 0 {
            return Err("collection correspondence budget exceeded".into());
        }
        self.remaining -= 1;
        match e {
            Expr::Num(n) => Ok(Term::U64(*n)),
            Expr::Bool(b) => Ok(Term::Bool(*b)),
            Expr::Var(n) => env
                .get(n)
                .map(|v| v.1.clone())
                .ok_or_else(|| format!("unbound model name {n}")),
            Expr::Call(n, args) if n == "choose" => {
                let [condition, on_true, on_false] = args.as_slice() else {
                    return Err("invalid choose correspondence".into());
                };
                Ok(Term::If {
                    condition: Box::new(self.expr(condition, env, depth + 1)?),
                    on_true: Box::new(self.expr(on_true, env, depth + 1)?),
                    on_false: Box::new(self.expr(on_false, env, depth + 1)?),
                })
            }
            Expr::Binary(op, a, b) => Ok(bin(
                op,
                self.expr(a, env, depth + 1)?,
                self.expr(b, env, depth + 1)?,
            )),
            Expr::Method(xs, method, args) if method == "map" || method == "filter" => {
                let input = self.expr(xs, env, depth + 1)?;
                let [Expr::Lambda(item, body)] = args.as_slice() else {
                    return Err("invalid map correspondence".into());
                };
                let mut names = BTreeSet::new();
                free(&args[0], &BTreeSet::new(), &mut names, 0)?;
                let (params, mut local, captures) = self.captures(env, &names)?;
                local.insert(item.clone(), (Sort::U64, var("head")));
                let head = self.expr(body, &local, depth + 1)?;
                let tail = self.recursion(&params);
                let body = Term::Match {
                    scrutinee: Box::new(var("input")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: self.construct(0, vec![]),
                        },
                        Branch {
                            bindings: vec!["head".into(), "tail".into()],
                            body: if method == "map" {
                                self.construct(1, vec![head, tail])
                            } else {
                                Term::If {
                                    condition: Box::new(head),
                                    on_true: Box::new(
                                        self.construct(1, vec![var("head"), tail.clone()]),
                                    ),
                                    on_false: Box::new(tail),
                                }
                            },
                        },
                    ],
                };
                self.component(
                    input,
                    params,
                    captures,
                    Sort::Data(self.datatype.into()),
                    body,
                )
            }
            Expr::Call(method, args) if method == "sum" || method == "count" => {
                let [xs] = args.as_slice() else {
                    return Err("invalid reduction correspondence".into());
                };
                let input = self.expr(xs, env, depth + 1)?;
                let head = if method == "sum" {
                    var("head")
                } else {
                    Term::U64(1)
                };
                let body = Term::Match {
                    scrutinee: Box::new(var("input")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: Term::U64(0),
                        },
                        Branch {
                            bindings: vec!["head".into(), "tail".into()],
                            body: bin("+", head, Term::SelfCall(vec![var("tail")])),
                        },
                    ],
                };
                self.component(
                    input,
                    vec![("input".into(), Sort::Data(self.datatype.into()))],
                    vec![],
                    Sort::U64,
                    body,
                )
            }
            Expr::Call(method, args) if method == "foldr" => {
                let [xs, initial, Expr::Lambda(item, inner)] = args.as_slice() else {
                    return Err("invalid foldr correspondence".into());
                };
                let Expr::Lambda(rest, step) = inner.as_ref() else {
                    return Err("invalid foldr nested lambda".into());
                };
                let input = self.expr(xs, env, depth + 1)?;
                let mut names = BTreeSet::new();
                free(initial, &BTreeSet::new(), &mut names, 0)?;
                free(&args[2], &BTreeSet::new(), &mut names, 0)?;
                let (params, mut local, captures) = self.captures(env, &names)?;
                let zero = self.expr(initial, &local, depth + 1)?;
                local.insert(item.clone(), (Sort::U64, var("head")));
                local.insert(rest.clone(), (Sort::U64, self.recursion(&params)));
                let body = Term::Match {
                    scrutinee: Box::new(var("input")),
                    branches: vec![
                        Branch {
                            bindings: vec![],
                            body: zero,
                        },
                        Branch {
                            bindings: vec!["head".into(), "tail".into()],
                            body: self.expr(step, &local, depth + 1)?,
                        },
                    ],
                };
                self.component(input, params, captures, Sort::U64, body)
            }
            Expr::Call(name, args) => {
                let f = self
                    .program
                    .functions
                    .iter()
                    .find(|f| f.name == *name)
                    .ok_or("unknown source function in correspondence")?
                    .clone();
                let arguments = args
                    .iter()
                    .map(|e| self.expr(e, env, depth + 1))
                    .collect::<LangResult<Vec<_>>>()?;
                let mut params = Vec::new();
                let mut local = Env::new();
                for (i, (n, ty)) in f.params.iter().enumerate() {
                    let p = format!("arg{i}");
                    let ty = sort(ty, self.datatype)?;
                    params.push((p.clone(), ty.clone()));
                    local.insert(n.clone(), (ty, var(&p)));
                }
                let body = self.expr(&f.body, &local, depth + 1)?;
                let function =
                    self.definition(params, sort(&f.result, self.datatype)?, body, None)?;
                Ok(Term::Call {
                    function,
                    arguments,
                })
            }
            _ => Err("unsupported operation in collection correspondence".into()),
        }
    }
    fn captures(
        &self,
        env: &Env,
        names: &BTreeSet<String>,
    ) -> LangResult<(Vec<(String, Sort)>, Env, Vec<Term>)> {
        let mut params = vec![("input".into(), Sort::Data(self.datatype.into()))];
        let mut local = Env::new();
        let mut arguments = Vec::new();
        for (i, n) in names.iter().enumerate() {
            let (s, value) = env.get(n).ok_or("unbound captured model variable")?;
            let name = format!("c{i}");
            params.push((name.clone(), s.clone()));
            local.insert(n.clone(), (s.clone(), var(&name)));
            arguments.push(value.clone());
        }
        if params.len() > 64 {
            return Err("collection model parameter limit".into());
        }
        Ok((params, local, arguments))
    }
    fn recursion(&self, params: &[(String, Sort)]) -> Term {
        Term::SelfCall(
            std::iter::once(var("tail"))
                .chain(params[1..].iter().map(|(n, _)| var(n)))
                .collect(),
        )
    }
    fn component(
        &mut self,
        input: Term,
        params: Vec<(String, Sort)>,
        captures: Vec<Term>,
        result: Sort,
        body: Term,
    ) -> LangResult<Term> {
        let function = self.definition(params, result, body, Some(0))?;
        Ok(Term::Call {
            function,
            arguments: std::iter::once(input).chain(captures).collect(),
        })
    }
    fn definition(
        &mut self,
        params: Vec<(String, Sort)>,
        result: Sort,
        body: Term,
        recursive: Option<usize>,
    ) -> LangResult<String> {
        let id = self
            .ids
            .get(self.cursor)
            .ok_or("missing source semantic definition")?;
        self.cursor += 1;
        self.context.matches_definition(
            id,
            &Declaration::Function {
                params,
                result,
                body,
                recursive,
            },
        )?;
        Ok(id.clone())
    }
}
fn model(
    context: &Context,
    program: &Program,
    datatype: &str,
    ids: &[String],
    body: &Expr,
    env: &Env,
) -> LangResult<Term> {
    if ids.len() > 128 {
        return Err("collection component count limit".into());
    }
    let mut translator = Translator {
        context,
        program,
        datatype,
        ids,
        cursor: 0,
        remaining: 100_000,
    };
    let result = translator.expr(body, env, 0)?;
    if translator.cursor != ids.len() {
        return Err("unused source semantic definition".into());
    }
    Ok(result)
}
/// Transactional: every proposal is checked before the caller's program changes.
pub fn apply(program: &mut Program, path: &Path) -> LangResult<Evidence> {
    check::check(program)?;
    let bytes = knowledge::read_bounded(path, 4_000_000)?;
    let package: Package = serde_json::from_slice(&bytes)
        .map_err(|e| format!("invalid implementation package: {e}"))?;
    let relative = package_library(&package)?;
    let lib = library::load(&path.parent().unwrap_or(Path::new(".")).join(relative))?;
    apply_loaded(
        program,
        package,
        lib,
        format!("{:x}", Sha256::digest(bytes)),
    )
}

fn package_library(package: &Package) -> LangResult<&Path> {
    if package.schema != 1 || package.semantics != SEMANTICS || package.proposals.len() > 128 {
        return Err("unsupported implementation package".into());
    }
    let relative = Path::new(&package.library);
    if relative.as_os_str().is_empty()
        || relative
            .components()
            .any(|c| !matches!(c, Component::Normal(_)))
    {
        return Err("library must be a relative path without traversal".into());
    }
    Ok(relative)
}

/// Check the source identity, proof domain and exact library pin before proof
/// checking. Publish a candidate only after its executable core is rechecked.
pub fn apply_replacement(program: &mut Program, path: &Path) -> LangResult<ReplacementEvidence> {
    let input = crate::core::CheckedModule::from_source(program.clone())?;
    input.pure_program()?;
    let input_hash = input.identity()?;
    let bytes = knowledge::read_bounded(path, 4_000_000)?;
    let replacement: ReplacementPackage =
        serde_json::from_slice(&bytes).map_err(|e| format!("invalid replacement package: {e}"))?;
    if replacement.schema != 1
        || replacement.semantics != REPLACEMENT_SEMANTICS
        || replacement.core_semantics != crate::core::SEMANTICS
        || replacement.observations != "pure-total-values-v1"
    {
        return Err("unsupported replacement semantics or observations".into());
    }
    if replacement.input_core_sha256 != input_hash {
        return Err("replacement does not match the complete input core module".into());
    }
    let relative = package_library(&replacement.package)?;
    let library = library::load_pinned(
        &path.parent().unwrap_or(Path::new(".")).join(relative),
        &replacement.library_lock_sha256,
    )?;
    let mut candidate = program.clone();
    let equality = apply_loaded(
        &mut candidate,
        replacement.package,
        library,
        format!("{:x}", Sha256::digest(&bytes)),
    )?;
    let selected = crate::core::CheckedModule::from_source(candidate)?;
    let selected_hash = selected.identity()?;
    *program = selected.into_program();
    Ok(ReplacementEvidence {
        replacement_package_sha256: format!("{:x}", Sha256::digest(bytes)),
        input_core_sha256: input_hash,
        selected_core_sha256: selected_hash,
        library_lock_sha256: replacement.library_lock_sha256,
        observations: replacement.observations,
        equality,
    })
}

fn apply_loaded(
    program: &mut Program,
    package: Package,
    lib: library::Library,
    package_sha256: String,
) -> LangResult<Evidence> {
    let mut candidate = program.clone();
    let mut targets = BTreeSet::new();
    let mut models = Vec::new();
    for proposal in &package.proposals {
        if !targets.insert(proposal.function.clone()) {
            return Err("duplicate implementation target".into());
        }
        let f = program
            .functions
            .iter()
            .find(|f| f.name == proposal.function)
            .ok_or("unknown implementation target")?;
        if f.body != proposal.from {
            return Err("implementation proposal does not match current function".into());
        }
        lib.context.matches_definition(
            &proposal.datatype,
            &Declaration::Datatype {
                constructors: vec![
                    Constructor {
                        name: "Nil".into(),
                        fields: vec![],
                    },
                    Constructor {
                        name: "Cons".into(),
                        fields: vec![Sort::U64, Sort::SelfType],
                    },
                ],
            },
        )?;
        if check::infer(&proposal.to, &check::params_env(&f.params)?, program)? != f.result {
            return Err("implementation changes result type".into());
        }
        let mut env = Env::new();
        let mut params = Vec::new();
        for (i, (n, ty)) in f.params.iter().enumerate() {
            let s = sort(ty, &proposal.datatype)?;
            let p = format!("p{i}");
            params.push((p.clone(), s.clone()));
            env.insert(n.clone(), (s, var(&p)));
        }
        let from = model(
            &lib.context,
            program,
            &proposal.datatype,
            &proposal.from_definitions,
            &proposal.from,
            &env,
        )?;
        let to = model(
            &lib.context,
            program,
            &proposal.datatype,
            &proposal.to_definitions,
            &proposal.to,
            &env,
        )?;
        lib.context
            .check(&params, &[], &from, &to, &proposal.proof)?;
        models.push((from, to));
        candidate
            .functions
            .iter_mut()
            .find(|f| f.name == proposal.function)
            .unwrap()
            .body = proposal.to.clone();
    }
    check::check(&candidate)?;
    *program = candidate;
    Ok(Evidence {package_sha256,library_lock:lib.lock,library_closure:lib.closure,checked_proposals:package.proposals,source_models:models,scope:"total mathematical value equality for map/filter/sum/count/foldr/choose and acyclic pure calls over u64 lists; allocation, OOM and trap traces excluded"})
}
