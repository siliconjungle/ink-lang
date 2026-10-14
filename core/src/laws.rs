//! General equality checking on executable semantic terms. Search and laws are
//! external. Conditions are equations with proof obligations, never profile facts.
use crate::{
    core::{Program, Type},
    semantic::{self as s, *},
    LangResult,
};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Equation {
    pub from: Term,
    pub to: Term,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub enum Proof {
    AssertEquality {
        equality: Equation,
        premise: Box<Proof>,
        body: Box<Proof>,
    },
    /// Nonnegative linear combination of exact-integer inequalities.
    Linear { premises: Vec<(usize, u64)> },
    /// RUP refutation of the fixed typed unsigned-word/Boolean equality.
    Word { hypotheses: Vec<usize>, certificate: crate::bitproof::Certificate },
    Normalize,
    Hypothesis(usize),
    /// Instantiate only the quantified parameters of a branch-local induction
    /// hypothesis. Its recursive argument remains the immediate predecessor.
    GeneralizedHypothesis {
        index: usize,
        arguments: BTreeMap<String, Term>,
    },
    Sym(Box<Proof>),
    Trans {
        middle: Term,
        left: Box<Proof>,
        right: Box<Proof>,
    },
    Congruence(Vec<Proof>),
    /// Function extensionality with an explicitly fresh universal parameter.
    /// Names provide scope only; the body must prove the applied endpoints.
    Forall { parameter: String, body: Box<Proof> },
    Use {
        law: String,
        arguments: BTreeMap<String, Term>,
        premises: Vec<Proof>,
        /// A general law's type parameters, each instantiated by a type.
        #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
        types: BTreeMap<String, Type>,
        /// One proof per assumption of the used law, of its instance.
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        assumptions: Vec<Proof>,
    },
    /// Use an assumption of the law being proved, instantiating its own
    /// quantified parameters. Only valid inside that law's proof.
    Assume {
        index: usize,
        arguments: BTreeMap<String, Term>,
        #[serde(default, skip_serializing_if = "Vec::is_empty")]
        premises: Vec<Proof>,
    },
    Cases {
        condition: Term,
        on_false: Box<Proof>,
        on_true: Box<Proof>,
    },
    /// Exhaustive case analysis over the relative order of two to five atoms
    /// of one totally ordered sort (unsigned or signed words, exact Int). The
    /// body is checked once per weak ordering of the atoms, with that
    /// ordering's comparisons and equalities as appended hypotheses. See
    /// `order_regions`.
    Order { atoms: Vec<Term>, body: Box<Proof> },
    Induction {
        variable: String,
        names: Vec<String>,
        base: Box<Proof>,
        step: Box<Proof>,
    },
    /// Exhaustive case analysis of an Option or Result variable: `None` and
    /// `Some(names[0])`, or `Ok(names[0])` and `Err(names[1])`. The variable
    /// is replaced in the goal and in every hypothesis; no induction.
    Variants {
        variable: String,
        names: Vec<String>,
        first: Box<Proof>,
        second: Box<Proof>,
    },
    GeneralizedInduction {
        variable: String,
        generalize: Vec<String>,
        names: Vec<String>,
        base: Box<Proof>,
        step: Box<Proof>,
    },
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Law {
    pub schema: u32,
    pub semantics: String,
    pub params: Env,
    pub conditions: Vec<Equation>,
    pub from: Term,
    pub to: Term,
    pub proof: Proof,
    pub dependencies: Vec<String>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub definition_context: Option<crate::definition_context::DefinitionContext>,
    /// Type parameters: opaque types with no operations of their own while
    /// the law is proved, so the proof holds for every instantiation.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub types: Vec<String>,
    /// Quantified hypotheses about the parameters (for example that a
    /// function parameter is associative). Proofs use them with
    /// `Proof::Assume`; every use of the law proves their instances.
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub assumptions: Vec<Assumption>,
}
/// `forall params. conditions => from = to`, over the law's parameters and
/// its own quantified parameters (disjoint from the law's).
#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Assumption {
    pub name: String,
    pub params: Env,
    #[serde(default, skip_serializing_if = "Vec::is_empty")]
    pub conditions: Vec<Equation>,
    pub from: Term,
    pub to: Term,
}
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Catalogue {
    pub schema: u32,
    pub semantics: String,
    pub roots: Vec<String>,
    pub objects: BTreeMap<String, Law>,
}
pub const SEMANTICS: &str = "ink-conditional-laws-v1";
/// Laws with type parameters or assumptions, or whose proofs instantiate them.
/// Every other law keeps `SEMANTICS`, so existing identities never fork.
pub const GENERAL_SEMANTICS: &str = "ink-general-laws-v1";
/// The marker a law's content requires. A checked law must carry exactly it.
pub fn required_semantics(law: &Law) -> &'static str {
    if !law.types.is_empty() || !law.assumptions.is_empty() || general_proof(&law.proof) {
        GENERAL_SEMANTICS
    } else {
        SEMANTICS
    }
}
fn general_proof(p: &Proof) -> bool {
    match p {
        Proof::Assume { .. } | Proof::Variants { .. } | Proof::Order { .. } | Proof::Word { .. } => true,
        Proof::Use { types, assumptions, premises, .. } => {
            !types.is_empty() || !assumptions.is_empty() || premises.iter().any(general_proof)
        }
        Proof::AssertEquality { premise, body, .. } => general_proof(premise) || general_proof(body),
        Proof::Sym(p) => general_proof(p),
        Proof::Trans { left, right, .. } => general_proof(left) || general_proof(right),
        Proof::Congruence(ps) => ps.iter().any(general_proof),
        Proof::Forall { body, .. } => general_proof(body),
        Proof::Cases { on_false, on_true, .. } => general_proof(on_false) || general_proof(on_true),
        Proof::Induction { base, step, .. } | Proof::GeneralizedInduction { base, step, .. } => {
            general_proof(base) || general_proof(step)
        }
        Proof::Normalize | Proof::Linear { .. } | Proof::Hypothesis(_) | Proof::GeneralizedHypothesis { .. } => false,
    }
}
pub fn identity<T: Serialize>(v: &T) -> LangResult<String> {
    use sha2::{Digest, Sha256};
    Ok(format!(
        "{:x}",
        Sha256::digest(serde_json::to_vec(v).map_err(|e| e.to_string())?)
    ))
}
#[derive(Clone)]
struct InductionSchema {
    params: Env,
    equation: Equation,
}
#[derive(Debug)]
pub struct CheckedCatalogue {
    laws: BTreeMap<String, Law>,
    /// The assumptions of the law whose proof is being checked, if any.
    assumptions: Vec<Assumption>,
    roots: Vec<String>,
    sha256: String,
    program_sha256: String,
    context_error: Option<String>,
}
impl CheckedCatalogue {
    pub fn roots(&self) -> &[String] {
        &self.roots
    }
    pub fn identity(&self) -> &str {
        &self.sha256
    }
    pub fn law(&self, id: &str) -> LangResult<&Law> {
        self.laws
            .get(id)
            .ok_or("law is not in checked dependency closure".into())
    }
    pub fn closure(&self) -> Vec<String> {
        self.laws.keys().cloned().collect()
    }
    pub fn check(c: &Catalogue, p: &Program) -> LangResult<Self> {
        Self::check_reusing(c, p, None)
    }
    /// Reuse only sealed proofs in the same executable context. The caller
    /// still authenticates each new view; this is not a serialized proof cache.
    pub(crate) fn check_reusing(
        c: &Catalogue,
        p: &Program,
        previous: Option<&Self>,
    ) -> LangResult<Self> {
        if c.schema != 1
            || c.semantics != SEMANTICS
            || c.objects.len() > 1024
            || c.roots.len() > 1024
        {
            return Err("incompatible or oversized law catalogue".into());
        }
        if serde_json::to_vec(c).map_err(|e| e.to_string())?.len() > 16_000_000 {
            return Err("law catalogue byte limit".into());
        }
        crate::core::CheckedModule::from_source(p.clone())?;
        let mut checked = Self {
            laws: BTreeMap::new(),
            assumptions: vec![],
            roots: c.roots.clone(),
            sha256: identity(c)?,
            program_sha256: identity(p)?,
            context_error: None,
        };
        if let Some(previous) = previous {
            if previous.program_sha256 != checked.program_sha256 {
                return Err("proof reuse executable context mismatch".into());
            }
            for (id, law) in &previous.laws {
                if let Some(incoming) = c.objects.get(id) {
                    if crate::registry::identity(&crate::registry::Entry::from_law(incoming)?)?
                        != *id
                    {
                        return Err("reused law content identity mismatch".into());
                    }
                    checked.laws.insert(id.clone(), law.clone());
                }
            }
        }
        let mut active = BTreeSet::new();
        let mut budget = Budget::new();
        fn load(
            id: &str,
            c: &Catalogue,
            out: &mut CheckedCatalogue,
            active: &mut BTreeSet<String>,
            p: &Program,
            b: &mut Budget,
            d: usize,
        ) -> LangResult<()> {
            b.step(d)?;
            if out.laws.contains_key(id) {
                return Ok(());
            }
            if !active.insert(id.into()) {
                return Err("cyclic law dependencies".into());
            }
            let law = c.objects.get(id).ok_or("missing law dependency")?;
            if crate::registry::identity(&crate::registry::Entry::from_law(law)?)? != *id {
                return Err("law content identity mismatch".into());
            }
            if law.schema != 1
                || law.semantics != required_semantics(law)
                || law.params.len() > 128
                || law.conditions.len() > 128
                || law.dependencies.len() > 128
                || law.types.len() > 16
                || law.assumptions.len() > 32
            {
                return Err("incompatible or oversized law".into());
            }
            // Scalar equality dispatches on the concrete value type (notably
            // IEEE f32). It is not parametric over an opaque type variable.
            // Structural value:equal remains uniform, including inside lists.
            if !law.types.is_empty() {
                let data=serde_json::to_value(law).map_err(|e|e.to_string())?;
                let mut pending=vec![&data];
                while let Some(value)=pending.pop() {
                    b.step(d+1)?;
                    match value {
                        serde_json::Value::Object(fields)=>{
                            if let Some(op)=fields.get("Op").and_then(serde_json::Value::as_array) {
                                if op.len()==2 && matches!(op[0].as_str(),Some("binary:=="|"binary:!=")) {
                                    if let Some(name)=op[1][0]["sort"]["Value"]["Named"].as_str() {
                                        if law.types.iter().any(|t|t==name){return Err("unsupported binary semantic operation on opaque type parameter".into());}
                                    }
                                }
                            }
                            pending.extend(fields.values());
                        },
                        serde_json::Value::Array(values)=>pending.extend(values),
                        _=>(),
                    }
                }
            }
            // A portable law is proved only in its explicit definition context.
            // Context-free entries cannot borrow named definitions from p.
            let mut proof_program = match &law.definition_context {
                Some(context) => context.check()?,
                None => Program::default(),
            };
            // Type parameters are fresh opaque identifier types while the law
            // is proved. No semantic operation inspects, compares or builds
            // their values, so the proof is parametric in them. They are not
            // part of the definition context a use must match.
            for t in &law.types {
                type_parameter_name(t)?;
                if proof_program.ids.contains(t)
                    || proof_program.records.contains_key(t)
                    || proof_program.enums.contains_key(t)
                    || law.types.iter().filter(|x| *x == t).count() > 1
                {
                    return Err("law type parameter collides with a declared type".into());
                }
                proof_program.ids.push(t.clone());
            }
            // Proof work is bounded per immutable entry. Dependency admission
            // retains the catalogue budget and each entry is checked once;
            // composing independently bounded libraries must not consume a
            // preceding entry's allowance. Catalogue bytes/counts and proof
            // depth still bound the complete admission.
            let mut proof_budget = Budget::new();
            validate_assumptions(law, &proof_program, &mut proof_budget)?;
            let mut imports = CheckedCatalogue {
                laws: BTreeMap::new(),
                assumptions: law.assumptions.clone(),
                roots: vec![],
                sha256: String::new(),
                program_sha256: identity(&proof_program)?,
                context_error: None,
            };
            for dep in &law.dependencies {
                load(dep, c, out, active, p, b, d + 1)?;
                if let Some(context) = &out.law(dep)?.definition_context {
                    context.matches(&proof_program)?;
                }
                imports.laws.insert(dep.clone(), out.law(dep)?.clone());
            }
            // Only explicit direct imports are available while checking this law.
            imports.prove(
                &proof_program,
                &law.params,
                &law.conditions,
                &Equation {
                    from: law.from.clone(),
                    to: law.to.clone(),
                },
                &law.proof,
                &mut proof_budget,
                0,
            )?;
            out.laws.insert(id.into(), law.clone());
            active.remove(id);
            Ok(())
        }
        for id in &c.roots {
            load(id, c, &mut checked, &mut active, p, &mut budget, 0)?;
        }
        for law in checked.laws.values() {
            if let Some(context) = &law.definition_context {
                if let Err(error) = context.matches(p) {
                    checked.context_error = Some(error);
                    break;
                }
            }
        }
        Ok(checked)
    }
    /// Portable admission may succeed without these definitions in the caller.
    /// Installing or using its laws requires the exact original module context.
    pub fn require_applicable(&self) -> LangResult<()> {
        match &self.context_error {
            Some(error) => Err(error.clone()),
            None => Ok(()),
        }
    }
    pub fn prove(
        &self,
        p: &Program,
        env: &Env,
        hyp: &[Equation],
        goal: &Equation,
        proof: &Proof,
        b: &mut Budget,
        d: usize,
    ) -> LangResult<()> {
        if identity(p)? != self.program_sha256 {
            return Err("checked laws belong to a different executable definition context".into());
        }
        self.require_applicable()?;
        self.prove_inner(p, env, hyp, &[], goal, proof, b, d)
    }
    fn prove_inner(
        &self,
        p: &Program,
        env: &Env,
        hyp: &[Equation],
        schemas: &[InductionSchema],
        goal: &Equation,
        proof: &Proof,
        b: &mut Budget,
        d: usize,
    ) -> LangResult<()> {
        b.step(d)?;
        validate(&goal.from, env, p, b)?;
        validate(&goal.to, env, p, b)?;
        if goal.from.sort != goal.to.sort {
            return Err("equality endpoint sort mismatch".into());
        }
        for h in hyp {
            validate(&h.from, env, p, b)?;
            validate(&h.to, env, p, b)?;
            if h.from.sort != h.to.sort {
                return Err("condition sort mismatch".into());
            }
        }
        match proof {
            Proof::Linear { premises } => linear(p, hyp, goal, premises, b),
            Proof::Word { hypotheses, certificate } => {
                let problem = crate::semantic_word::problem(p, env, hyp, goal, hypotheses, certificate.encoding, b)?;
                crate::bitproof::verify_with_work(&problem, certificate, &mut b.remaining)
            }
            Proof::AssertEquality {
                equality,
                premise,
                body,
            } => {
                if !matches!(&equality.from.sort,Sort::Value(t) if check_word(t)||*t==Type::Bool) {
                    return Err("numeric float equality does not imply bit-pattern equality".into());
                }
                let proposition = op(
                    value(Type::Bool),
                    "binary:==",
                    vec![equality.from.clone(), equality.to.clone()],
                );
                self.prove_inner(
                    p,
                    env,
                    hyp,
                    schemas,
                    &Equation {
                        from: proposition,
                        to: term(value(Type::Bool), Node::Bool(true)),
                    },
                    premise,
                    b,
                    d + 1,
                )?;
                let mut local = hyp.to_vec();
                local.push(equality.clone());
                self.prove_inner(p, env, &local, schemas, goal, body, b, d + 1)
            }
            Proof::Normalize => {
                if equivalent(&goal.from, &goal.to, hyp, p, b, 0)? {
                    Ok(())
                } else {
                    Err("semantic normal forms differ".into())
                }
            }
            Proof::Hypothesis(i) => {
                let h = hyp.get(*i).ok_or("condition index out of range")?;
                if h == goal {
                    Ok(())
                } else {
                    Err("condition does not establish goal".into())
                }
            }
            Proof::GeneralizedHypothesis { index, arguments } => {
                let schema = schemas
                    .get(*index)
                    .ok_or("induction schema index out of range")?;
                if arguments.len() != schema.params.len() {
                    return Err("induction schema instantiation arity".into());
                }
                for (name, sort) in &schema.params {
                    let arg = arguments
                        .get(name)
                        .ok_or("missing induction schema argument")?;
                    validate(arg, env, p, b)?;
                    if &arg.sort != sort {
                        return Err("induction schema argument sort mismatch".into());
                    }
                }
                if sub_equation(&schema.equation, arguments, b)? != *goal {
                    return Err("induction schema does not establish exact goal".into());
                }
                Ok(())
            }
            Proof::Sym(proof) => self.prove_inner(
                p,
                env,
                hyp,
                schemas,
                &Equation {
                    from: goal.to.clone(),
                    to: goal.from.clone(),
                },
                proof,
                b,
                d + 1,
            ),
            Proof::Trans {
                middle,
                left,
                right,
            } => {
                self.prove_inner(
                    p,
                    env,
                    hyp,
                    schemas,
                    &Equation {
                        from: goal.from.clone(),
                        to: middle.clone(),
                    },
                    left,
                    b,
                    d + 1,
                ).map_err(|e|format!("transitivity left: {e}"))?;
                self.prove_inner(
                    p,
                    env,
                    hyp,
                    schemas,
                    &Equation {
                        from: middle.clone(),
                        to: goal.to.clone(),
                    },
                    right,
                    b,
                    d + 1,
                ).map_err(|e|format!("transitivity right: {e}"))
            }
            Proof::Forall { parameter, body } => {
                if parameter.is_empty() || parameter.len()>128 || env.contains_key(parameter)
                    || !parameter.bytes().all(|c|c.is_ascii_alphanumeric()||c==b'_') {
                    return Err("extensionality parameter must be fresh and bounded".into());
                }
                let (Node::Lambda(from),Node::Lambda(to),Sort::Arrow(input,_))=
                    (&goal.from.node,&goal.to.node,&goal.from.sort) else {
                    return Err("extensionality requires two typed lambdas".into());
                };
                let argument=free((**input).clone(),parameter);
                let mut local=env.clone();local.insert(parameter.clone(),argument.sort.clone());
                self.prove_inner(p,&local,hyp,schemas,&Equation{
                    from:beta(from,&argument,b)?,to:beta(to,&argument,b)?,
                },body,b,d+1)
            }
            Proof::Congruence(proofs) => {
                let mut from = goal.from.clone();
                let mut to = goal.to.clone();
                let mut local = env.clone();
                if let (Node::Lambda(a), Node::Lambda(c)) = (&from.node, &to.node) {
                    let Sort::Arrow(x, _) = &from.sort else {
                        return Err("lambda congruence".into());
                    };
                    let name = fresh(env, "__congruence");
                    let arg = free((**x).clone(), &name);
                    local.insert(name, arg.sort.clone());
                    from = beta(a, &arg, b)?;
                    to = beta(c, &arg, b)?;
                    if proofs.len() != 1 {
                        return Err("lambda congruence arity".into());
                    }
                    return self.prove_inner(
                        p,
                        &local,
                        hyp,
                        schemas,
                        &Equation { from, to },
                        &proofs[0],
                        b,
                        d + 1,
                    );
                }
                if !same_head(&from, &to) || children(&from).len() != proofs.len() {
                    return Err("congruence structure mismatch".into());
                }
                for ((a, c), proof) in children(&from).into_iter().zip(children(&to)).zip(proofs) {
                    self.prove_inner(
                        p,
                        &local,
                        hyp,
                        schemas,
                        &Equation {
                            from: a.clone(),
                            to: c.clone(),
                        },
                        proof,
                        b,
                        d + 1,
                    )?;
                }
                Ok(())
            }
            Proof::Use {
                law,
                arguments,
                premises,
                types,
                assumptions,
            } => {
                let law = self.law(law)?;
                if arguments.len() != law.params.len()
                    || premises.len() != law.conditions.len()
                    || assumptions.len() != law.assumptions.len()
                    || types.len() != law.types.len()
                    || law.types.iter().any(|t| !types.contains_key(t))
                {
                    return Err("law instantiation arity".into());
                }
                for ty in types.values() {
                    if *ty == Type::Unknown {
                        return Err("unresolved law type argument".into());
                    }
                    crate::statecheck::validate_type(ty, p)?;
                }
                let inst = Instance::new(law, types, b)?;
                for (n, sort) in &inst.params {
                    let arg = arguments.get(n).ok_or("missing law argument")?;
                    validate(arg, env, p, b)?;
                    if &arg.sort != sort {
                        return Err("law argument sort mismatch".into());
                    }
                }
                let from = substitute(&inst.from, arguments, b)?;
                let to = substitute(&inst.to, arguments, b)?;
                if from != goal.from || to != goal.to {
                    return Err("law does not match exact application endpoints".into());
                }
                for (condition, proof) in inst.conditions.iter().zip(premises) {
                    self.prove_inner(
                        p,
                        env,
                        hyp,
                        schemas,
                        &sub_equation(condition, arguments, b)?,
                        proof,
                        b,
                        d + 1,
                    )?;
                }
                // Each assumption is proved for this instance, universally in
                // its own parameters (fresh here), under its own conditions.
                for (assumption, proof) in inst.assumptions.iter().zip(assumptions) {
                    let mut local = env.clone();
                    let mut rename = arguments.clone();
                    for (n, sort) in &assumption.params {
                        let fresh_name = fresh(&local, &format!("__assumed_{n}"));
                        local.insert(fresh_name.clone(), sort.clone());
                        rename.insert(n.clone(), free(sort.clone(), &fresh_name));
                    }
                    let mut local_hyp = hyp.to_vec();
                    for c in &assumption.conditions {
                        local_hyp.push(sub_equation(c, &rename, b)?);
                    }
                    if local_hyp.len() + schemas.len() > 128 {
                        return Err("semantic hypothesis count limit".into());
                    }
                    let goal = Equation {
                        from: substitute(&assumption.from, &rename, b)?,
                        to: substitute(&assumption.to, &rename, b)?,
                    };
                    // Induction schemas mention only enclosing variables; an
                    // assumption instance may not use them for its fresh ones.
                    self.prove_inner(p, &local, &local_hyp, &[], &goal, proof, b, d + 1)?;
                }
                Ok(())
            }
            Proof::Assume {
                index,
                arguments,
                premises,
            } => {
                let assumption = self
                    .assumptions
                    .get(*index)
                    .ok_or("assumption index out of range")?;
                if arguments.len() != assumption.params.len()
                    || premises.len() != assumption.conditions.len()
                {
                    return Err("assumption instantiation arity".into());
                }
                for (name, sort) in &assumption.params {
                    let arg = arguments.get(name).ok_or("missing assumption argument")?;
                    validate(arg, env, p, b)?;
                    if &arg.sort != sort {
                        return Err("assumption argument sort mismatch".into());
                    }
                }
                let equation = Equation {
                    from: substitute(&assumption.from, arguments, b)?,
                    to: substitute(&assumption.to, arguments, b)?,
                };
                if equation != *goal {
                    return Err("assumption does not establish exact goal".into());
                }
                for (condition, proof) in assumption.conditions.iter().zip(premises) {
                    self.prove_inner(
                        p,
                        env,
                        hyp,
                        schemas,
                        &sub_equation(condition, arguments, b)?,
                        proof,
                        b,
                        d + 1,
                    )?;
                }
                Ok(())
            }
            Proof::Cases {
                condition,
                on_false,
                on_true,
            } => {
                validate(condition, env, p, b)?;
                if condition.sort != value(Type::Bool) {
                    return Err("case condition must be Bool".into());
                }
                for (flag, proof) in [(false, on_false), (true, on_true)] {
                    let mut local = hyp.to_vec();
                    local.push(Equation {
                        from: condition.clone(),
                        to: term(value(Type::Bool), Node::Bool(flag)),
                    });
                    self.prove_inner(p, env, &local, schemas, goal, proof, b, d + 1)
                        .map_err(|e| format!("case {flag}: {e}"))?;
                }
                Ok(())
            }
            Proof::Order { atoms, body } => {
                for facts in order_regions(p, env, hyp, goal, atoms, b, d)? {
                    let mut local = hyp.to_vec();
                    local.extend(facts);
                    self.prove_inner(p, env, &local, schemas, goal, body, b, d + 1)?;
                }
                Ok(())
            }
            Proof::Variants {
                variable,
                names,
                first,
                second,
            } => {
                let sort = env.get(variable).ok_or("missing case variable")?.clone();
                let expected = if matches!(sort, Sort::Value(Type::Result(..))) { 2 } else { 1 };
                if names.len() != expected
                    || names.iter().any(|n| env.contains_key(n) || n == variable)
                {
                    return Err("variant cases need fresh payload names".into());
                }
                if schemas.iter().any(|s| {
                    s.params.contains_key(variable)
                        || occurs(&s.equation.from, variable)
                        || occurs(&s.equation.to, variable)
                }) {
                    return Err("variant cases under an induction schema on the variable".into());
                }
                let (cases, payloads): ([(&str, bool); 2], [Type; 2]) = match &sort {
                    Sort::Value(Type::Option(t)) => (
                        [("call:None", false), ("call:Some", true)],
                        [Type::Unit, (**t).clone()],
                    ),
                    Sort::Value(Type::Result(t, e)) => (
                        [("call:Ok", true), ("call:Err", true)],
                        [(**t).clone(), (**e).clone()],
                    ),
                    _ => return Err("variant cases need an Option or Result variable".into()),
                };
                for (k, (((constructor, carries), payload), proof)) in
                    cases.into_iter().zip(payloads).zip([first, second]).enumerate()
                {
                    let name = &names[if expected == 2 { k } else { 0 }];
                    let mut local = env.clone();
                    local.remove(variable);
                    let args = if carries {
                        local.insert(name.clone(), value(payload.clone()));
                        vec![free(value(payload), name)]
                    } else {
                        vec![]
                    };
                    let sub = BTreeMap::from([(variable.clone(), op(sort.clone(), constructor, args))]);
                    let local_hyp = hyp
                        .iter()
                        .map(|h| sub_equation(h, &sub, b))
                        .collect::<LangResult<Vec<_>>>()?;
                    self.prove_inner(
                        p,
                        &local,
                        &local_hyp,
                        schemas,
                        &sub_equation(goal, &sub, b)?,
                        proof,
                        b,
                        d + 1,
                    )?;
                }
                Ok(())
            }
            Proof::Induction {
                variable,
                names,
                base,
                step,
            }
            | Proof::GeneralizedInduction {
                variable,
                names,
                base,
                step,
                ..
            } => {
                let generalize = match proof {
                    Proof::GeneralizedInduction { generalize, .. } => generalize.as_slice(),
                    _ => &[],
                };
                if generalize.len() > 64 {
                    return Err("generalized induction parameter count limit".into());
                }
                let mut variables = BTreeSet::from([variable.clone()]);
                let mut params = Env::new();
                for name in generalize {
                    if !variables.insert(name.clone()) {
                        return Err("duplicate or recursive generalized parameter".into());
                    }
                    params.insert(
                        name.clone(),
                        env.get(name)
                            .cloned()
                            .ok_or("unknown generalized parameter")?,
                    );
                }
                let sort = env.get(variable).ok_or("missing induction variable")?;
                for name in &variables {
                    if hyp
                        .iter()
                        .any(|h| occurs(&h.from, name) || occurs(&h.to, name))
                        || schemas.iter().any(|s| {
                            !s.params.contains_key(name)
                                && (occurs(&s.equation.from, name) || occurs(&s.equation.to, name))
                        })
                    {
                        return Err(
                            "induction needs premises independent of quantified variables".into(),
                        );
                    }
                }
                if names.iter().any(|n| env.contains_key(n))
                    || names.iter().collect::<BTreeSet<_>>().len() != names.len()
                {
                    return Err("induction binders must be fresh".into());
                }
                let mut local = env.clone();
                local.remove(variable);
                let (zero, next, ih_arg) = match sort {
                    Sort::Nat if names.len() == 1 => {
                        let n = free(Sort::Nat, &names[0]);
                        local.insert(names[0].clone(), Sort::Nat);
                        (
                            term(Sort::Nat, Node::Nat(0)),
                            op(Sort::Nat, "nat.succ", vec![n.clone()]),
                            n,
                        )
                    }
                    Sort::Value(Type::List(x)) if names.len() == 2 => {
                        let h = free(value((**x).clone()), &names[0]);
                        let tail = free(sort.clone(), &names[1]);
                        local.insert(names[0].clone(), h.sort.clone());
                        local.insert(names[1].clone(), sort.clone());
                        (
                            term(sort.clone(), Node::Nil),
                            term(
                                sort.clone(),
                                Node::Cons(Box::new(h), Box::new(tail.clone())),
                            ),
                            tail,
                        )
                    }
                    _ => {
                        return Err(
                            "induction requires natural or list sort and matching binders".into(),
                        )
                    }
                };
                let sub = |arg: Term| BTreeMap::from([(variable.clone(), arg)]);
                self.prove_inner(
                    p,
                    &local,
                    hyp,
                    schemas,
                    &sub_equation(goal, &sub(zero), b)?,
                    base,
                    b,
                    d + 1,
                ).map_err(|e| format!("induction base: {e}"))?;
                let mut hs = hyp.to_vec();
                let mut local_schemas = schemas.to_vec();
                let equation = sub_equation(goal, &sub(ih_arg), b)?;
                if matches!(proof, Proof::GeneralizedInduction { .. }) {
                    local_schemas.push(InductionSchema { params, equation });
                } else {
                    hs.push(equation);
                }
                if hs.len() + local_schemas.len() > 128 {
                    return Err("semantic hypothesis count limit".into());
                }
                self.prove_inner(
                    p,
                    &local,
                    &hs,
                    &local_schemas,
                    &sub_equation(goal, &sub(next), b)?,
                    step,
                    b,
                    d + 1,
                ).map_err(|e| format!("induction step: {e}"))
            }
        }
    }
}
/// Type parameter names are plain identifiers, distinct from generated names.
fn type_parameter_name(t: &str) -> LangResult<()> {
    if t.is_empty()
        || t.len() > 64
        || !t.as_bytes()[0].is_ascii_alphabetic()
        || !t.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_')
    {
        return Err("invalid law type parameter".into());
    }
    Ok(())
}
/// Assumptions are well-sorted equations over the law's parameters and their
/// own disjoint parameters.
fn validate_assumptions(law: &Law, p: &Program, b: &mut Budget) -> LangResult<()> {
    let mut names = BTreeSet::new();
    for a in &law.assumptions {
        if !names.insert(&a.name) || a.name.is_empty() || a.name.len() > 64 || a.params.len() > 16 || a.conditions.len() > 16 {
            return Err("invalid or duplicate law assumption".into());
        }
        let mut env = law.params.clone();
        for (n, sort) in &a.params {
            if env.insert(n.clone(), sort.clone()).is_some() {
                return Err("assumption parameter shadows a law parameter".into());
            }
        }
        for e in a.conditions.iter().chain([&Equation { from: a.from.clone(), to: a.to.clone() }]) {
            validate(&e.from, &env, p, b)?;
            validate(&e.to, &env, p, b)?;
            if e.from.sort != e.to.sort {
                return Err("assumption sort mismatch".into());
            }
        }
    }
    Ok(())
}
/// A law with its type parameters replaced. Term parameters stay free.
pub struct Instance {
    pub params: Env,
    pub conditions: Vec<Equation>,
    pub from: Term,
    pub to: Term,
    pub assumptions: Vec<Assumption>,
}
impl Instance {
    pub fn new(law: &Law, types: &BTreeMap<String, Type>, b: &mut Budget) -> LangResult<Self> {
        let sort = |s: &Sort, b: &mut Budget| type_sort(s, types, b, 0);
        let term = |t: &Term, b: &mut Budget| type_term(t, types, b, 0);
        let eq = |e: &Equation, b: &mut Budget| -> LangResult<Equation> {
            Ok(Equation { from: type_term(&e.from, types, b, 0)?, to: type_term(&e.to, types, b, 0)? })
        };
        Ok(Self {
            params: law
                .params
                .iter()
                .map(|(n, s)| Ok((n.clone(), sort(s, b)?)))
                .collect::<LangResult<_>>()?,
            conditions: law.conditions.iter().map(|c| eq(c, b)).collect::<LangResult<_>>()?,
            from: term(&law.from, b)?,
            to: term(&law.to, b)?,
            assumptions: law
                .assumptions
                .iter()
                .map(|a| {
                    Ok(Assumption {
                        name: a.name.clone(),
                        params: a
                            .params
                            .iter()
                            .map(|(n, s)| Ok((n.clone(), sort(s, b)?)))
                            .collect::<LangResult<_>>()?,
                        conditions: a.conditions.iter().map(|c| eq(c, b)).collect::<LangResult<_>>()?,
                        from: term(&a.from, b)?,
                        to: term(&a.to, b)?,
                    })
                })
                .collect::<LangResult<_>>()?,
        })
    }
}
/// Replace type parameters throughout a type.
pub fn type_type(t: &Type, types: &BTreeMap<String, Type>) -> Type {
    let go = |t: &Type| Box::new(type_type(t, types));
    match t {
        Type::Named(n) => types.get(n).cloned().unwrap_or_else(|| t.clone()),
        Type::List(x) => Type::List(go(x)),
        Type::Buffer(x) => Type::Buffer(go(x)),
        Type::Option(x) => Type::Option(go(x)),
        Type::Vector(x, k) => Type::Vector(go(x), *k),
        Type::Map(k, v) => Type::Map(go(k), go(v)),
        Type::Result(a, e) => Type::Result(go(a), go(e)),
        Type::Table(k, v) => Type::Table(go(k), go(v)),
        _ => t.clone(),
    }
}
fn type_sort(s: &Sort, types: &BTreeMap<String, Type>, b: &mut Budget, d: usize) -> LangResult<Sort> {
    b.step(d)?;
    Ok(match s {
        Sort::Value(t) => Sort::Value(type_type(t, types)),
        Sort::Arrow(a, c) => arrow(type_sort(a, types, b, d + 1)?, type_sort(c, types, b, d + 1)?),
        Sort::Nat => Sort::Nat,
    })
}
/// Replace type parameters in every sort of a term. Operation names carry no
/// types that a parameter could occupy (parameters are never records).
pub fn type_term(t: &Term, types: &BTreeMap<String, Type>, b: &mut Budget, d: usize) -> LangResult<Term> {
    if types.is_empty() {
        return Ok(t.clone());
    }
    b.step(d)?;
    let sort = type_sort(&t.sort, types, b, d + 1)?;
    let node = match &t.node {
        Node::Lambda(body) => Node::Lambda(Box::new(type_term(body, types, b, d + 1)?)),
        Node::Op(n, args) => Node::Op(
            n.clone(),
            args.iter().map(|a| type_term(a, types, b, d + 1)).collect::<LangResult<_>>()?,
        ),
        Node::Cons(h, tail) => Node::Cons(
            Box::new(type_term(h, types, b, d + 1)?),
            Box::new(type_term(tail, types, b, d + 1)?),
        ),
        other => other.clone(),
    };
    Ok(Term { sort, node })
}
fn fresh(env: &Env, base: &str) -> String {
    let mut n = base.to_string();
    while env.contains_key(&n) {
        n.push('_')
    }
    n
}
pub fn sub_equation(
    e: &Equation,
    args: &BTreeMap<String, Term>,
    b: &mut Budget,
) -> LangResult<Equation> {
    Ok(Equation {
        from: substitute(&e.from, args, b)?,
        to: substitute(&e.to, args, b)?,
    })
}
fn occurs(t: &Term, n: &str) -> bool {
    matches!(&t.node,Node::Free(x) if x==n) || children(t).iter().any(|x| occurs(x, n))
}
fn same_head(a: &Term, b: &Term) -> bool {
    if a.sort != b.sort {
        return false;
    }
    match (&a.node, &b.node) {
        (Node::Op(n, a), Node::Op(m, b)) => n == m && a.len() == b.len(),
        (Node::Lambda(_), Node::Lambda(_)) | (Node::Cons(..), Node::Cons(..)) => true,
        _ => a == b,
    }
}
fn apply(f: Term, arg: Term) -> LangResult<Term> {
    let Sort::Arrow(_, out) = &f.sort else {
        return Err("semantic application".into());
    };
    Ok(op((**out).clone(), "apply", vec![f, arg]))
}
fn zero(t: &Sort) -> LangResult<Term> {
    Ok(match t {
        Sort::Value(Type::F32) => term(t.clone(), Node::Float(0)),
        Sort::Value(t) if check_word(t) || *t == Type::Int => word(t.clone(), 0),
        _ => return Err("zero numeric sort".into()),
    })
}
fn check_word(t: &Type) -> bool {
    crate::check::is_word(t)
}
fn normal(t: &Term, hyp: &[Equation], p: &Program, b: &mut Budget, d: usize) -> LangResult<Term> {
    let recursive = recursive_definitions(p)?;
    normal_inner(t, hyp, p, b, d, &recursive)
}
fn recursive_definitions(p: &Program) -> LangResult<BTreeSet<&str>> {
    Ok(crate::analysis::recursive_function_groups(p)?.into_iter().flatten()
        .map(|index| p.functions[index].name.as_str()).collect())
}
fn concrete_arguments(args: &[Term]) -> bool {
    let mut pending = args.iter().collect::<Vec<_>>();
    while let Some(argument) = pending.pop() {
        if matches!(argument.node, Node::Free(_) | Node::Bound(_) | Node::Lambda(_)) {
            return false;
        }
        pending.extend(children(argument));
    }
    true
}
fn normal_inner(t: &Term, hyp: &[Equation], p: &Program, b: &mut Budget, d: usize,
    recursive: &BTreeSet<&str>) -> LangResult<Term> {
    b.step(d)?;
    // Fixed lazy control semantics: do not spend proof work unfolding a branch
    // that cannot execute. This also keeps a stopping loop's bound independent
    // of proof work when its initial stop condition is already true.
    if let Node::Op(name, args) = &t.node {
        if name == "call:choose" && args.len() == 3 {
            let condition = normal_inner(&args[0], hyp, p, b, d + 1, recursive)?;
            if let Node::Bool(flag) = condition.node {
                return normal_inner(&args[if flag { 1 } else { 2 }], hyp, p, b, d + 1, recursive);
            }
        }
    }
    let out = try_map_children(t, |c| normal_inner(c, hyp, p, b, d + 1, recursive))?;
    if let Some(function) = s::eta_reduce(&out, b, d)? {
        return normal_inner(&function, hyp, p, b, d + 1, recursive);
    }
    // Equality premises are oriented local facts. Match only exact typed terms.
    for (index, h) in hyp.iter().enumerate() {
        if out == h.from && h.from != h.to {
            // Keep transporting facts through aliases and projections. Dropping
            // all premises here loses even a short callback-binding chain.
            // Remove the applied equation on this branch so cyclic or expanding
            // hypotheses cannot reuse it indefinitely; the normal proof budget
            // also bounds the remaining substitutions.
            let remaining = hyp.iter().enumerate()
                .filter(|(i, _)| *i != index)
                .map(|(_, equation)| equation.clone()).collect::<Vec<_>>();
            return normal_inner(&h.to, &remaining, p, b, d + 1, recursive);
        }
    }
    let Node::Op(n, a) = &out.node else {
        return Ok(out);
    };
    if let Some(reduced) = crate::owned_semantic::reduce(&out)? {
        return normal_inner(&reduced, hyp, p, b, d + 1, recursive);
    }
    let reduced = match (n.as_str(), a.as_slice()) {
        ("call:Int", [x]) if x.sort == value(Type::Int) => Some(x.clone()),
        ("call:Int", [x]) => {
            if let Node::Word(n) = x.node {
                if x.sort == value(Type::I32) && (n as u32 as i32) < 0 {
                    Some(op(
                        value(Type::Int),
                        "neg",
                        vec![word(Type::Int, (n as u32 as i32).unsigned_abs() as u64)],
                    ))
                } else {
                    Some(word(Type::Int, n))
                }
            } else {
                None
            }
        }
        ("apply", [f, x]) => {
            if let Node::Lambda(body) = &f.node {
                Some(beta(body, x, b)?)
            } else {
                None
            }
        }
        ("nat.succ", [x]) => {
            if let Node::Nat(n) = x.node {
                n.checked_add(1).map(|n| term(Sort::Nat, Node::Nat(n)))
            } else {
                None
            }
        }
        ("nat.word", [x]) => match &x.node {
            Node::Nat(n) => Some(word(
                match &out.sort {
                    Sort::Value(t) => t.clone(),
                    _ => return Err("word sort".into()),
                },
                if out.sort == value(Type::U64) {
                    *n
                } else {
                    *n as u32 as u64
                },
            )),
            Node::Op(n, a) if n == "nat.succ" => Some(op(
                out.sort.clone(),
                "binary:+",
                vec![
                    op(out.sort.clone(), "nat.word", vec![a[0].clone()]),
                    word(
                        match &out.sort {
                            Sort::Value(t) => t.clone(),
                            _ => return Err("word sort".into()),
                        },
                        1,
                    ),
                ],
            )),
            _ => None,
        },
        ("binary:==" | "binary:!=", [left,right]) if matches!(&left.sort,Sort::Value(t) if !crate::check::is_numeric_value(t) && *t!=Type::Bool) => {
            let eq=op(value(Type::Bool),"value:equal",vec![left.clone(),right.clone()]);
            Some(if n=="binary:=="{eq}else{op(value(Type::Bool),"binary:==",vec![eq,term(value(Type::Bool),Node::Bool(false))])})
        }
        ("value:equal", [left,right]) => {
            let boolean=|x|term(value(Type::Bool),Node::Bool(x));
            let eq=|a:Term,b:Term|op(value(Type::Bool),"value:equal",vec![a,b]);
            if matches!(&left.sort,Sort::Value(t)if check_word(t)) {
                Some(op(value(Type::Bool),"binary:==",vec![left.clone(),right.clone()]))
            } else if left==right {Some(boolean(true))} else {match (&left.node,&right.node) {
                (Node::Cons(a,b),Node::Cons(c,d))=>Some(op(value(Type::Bool),"binary:&&",vec![eq((**a).clone(),(**c).clone()),eq((**b).clone(),(**d).clone())])),
                (Node::Nil,Node::Cons(..))|(Node::Cons(..),Node::Nil)=>Some(boolean(false)),
                (Node::Word(a),Node::Word(b))=>Some(boolean(a==b)),
                (Node::Float(a),Node::Float(b))=>Some(boolean(a==b)),
                (Node::Bool(a),Node::Bool(b))=>Some(boolean(a==b)),
                (Node::String(a),Node::String(b))=>Some(boolean(a==b)),
                (Node::Op(a,x),Node::Op(c,y)) if a.starts_with("enum:") && c.starts_with("enum:") && x.is_empty() && y.is_empty()=>Some(boolean(a==c)),
                (Node::Op(a,x),Node::Op(c,y)) if a==c && a.starts_with("record:") && x.len()==y.len()=>Some(x.iter().zip(y).rev().fold(boolean(true),|rest,(x,y)|op(value(Type::Bool),"binary:&&",vec![eq(x.clone(),y.clone()),rest]))),
                _=>None,
            }}
        }
        ("binary:==" | "binary:!=", [left, right])
            if left == right
                && matches!(
                    left.sort,
                    Sort::Value(Type::U32 | Type::U64 | Type::I32 | Type::Bool)
                ) =>
        {
            Some(term(value(Type::Bool), Node::Bool(n == "binary:==")))
        }
        ("binary:&&", [c, x]) => match c.node {
            Node::Bool(false) => Some(c.clone()),
            Node::Bool(true) => Some(x.clone()),
            _ if x.node==Node::Bool(true) => Some(c.clone()),
            _ => None,
        },
        ("binary:||", [c, x]) => match c.node {
            Node::Bool(true) => Some(c.clone()),
            Node::Bool(false) => Some(x.clone()),
            _ if x.node==Node::Bool(false) => Some(c.clone()),
            _ => None,
        },
        ("call:choose", [c, a, e]) => match c.node {
            Node::Bool(true) => Some(a.clone()),
            Node::Bool(false) => Some(e.clone()),
            _ if a == e => Some(a.clone()),
            _ => None,
        },
        ("call:repeat", [count, init, f]) => {
            let previous = match &count.node {
                Node::Nat(0) => return normal_inner(init, hyp, p, b, d + 1, recursive),
                Node::Nat(n) => Some(term(Sort::Nat, Node::Nat(n - 1))),
                Node::Op(n, a) if n == "nat.succ" => Some(a[0].clone()),
                _ => None,
            };
            if let Some(prev) = previous {
                let rest = op(
                    out.sort.clone(),
                    "call:repeat",
                    vec![prev.clone(), init.clone(), f.clone()],
                );
                Some(apply(
                    apply(f.clone(), op(value(Type::U32), "nat.word", vec![prev]))?,
                    rest,
                )?)
            } else {
                None
            }
        }
        ("method:concat", [xs, ys]) => match &xs.node {
            Node::Nil => Some(ys.clone()),
            Node::Cons(h, t) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    h.clone(),
                    Box::new(op(out.sort.clone(), n, vec![(**t).clone(), ys.clone()])),
                ),
            )),
            _ => None,
        },
        // Fixed list-slice semantics: an unsigned count is clamped at the list
        // length. Recurse on the tail only in the nonzero branch, so U32 zero
        // never executes the wrapping decrement. This is evaluation, not an
        // optimisation law; commutation and reconstruction need external proofs.
        ("method:take" | "method:drop", [xs, count]) => {
            let zero = count.node == Node::Word(0);
            if zero {
                Some(if n == "method:drop" {
                    xs.clone()
                } else {
                    term(out.sort.clone(), Node::Nil)
                })
            } else {
                match &xs.node {
                    Node::Nil => Some(xs.clone()),
                    Node::Cons(head, tail) => {
                        let remaining = op(
                            value(Type::U32),
                            "binary:-",
                            vec![count.clone(), word(Type::U32, 1)],
                        );
                        let rest = op(out.sort.clone(), n, vec![(**tail).clone(), remaining]);
                        let (empty, nonzero) = if n == "method:take" {
                            (
                                term(out.sort.clone(), Node::Nil),
                                term(out.sort.clone(), Node::Cons(head.clone(), Box::new(rest))),
                            )
                        } else {
                            (xs.clone(), rest)
                        };
                        Some(op(
                            out.sort.clone(),
                            "call:choose",
                            vec![
                                op(
                                    value(Type::Bool),
                                    "binary:==",
                                    vec![count.clone(), word(Type::U32, 0)],
                                ),
                                empty,
                                nonzero,
                            ],
                        ))
                    }
                    _ => None,
                }
            }
        }
        ("call:repeat_until", [count, init, stop, step]) => {
            let next = apply(apply(step.clone(), word(Type::U32, 0))?, init.clone())?;
            Some(op(
                out.sort.clone(),
                "call:choose",
                vec![
                    op(
                        value(Type::Bool),
                        "binary:==",
                        vec![count.clone(), word(Type::U32, 0)],
                    ),
                    init.clone(),
                    op(
                        out.sort.clone(),
                        "call:choose",
                        vec![
                            apply(stop.clone(), init.clone())?,
                            init.clone(),
                            op(
                                out.sort.clone(),
                                "until.from",
                                vec![
                                    op(
                                        value(Type::U32),
                                        "binary:-",
                                        vec![count.clone(), word(Type::U32, 1)],
                                    ),
                                    word(Type::U32, 1),
                                    next,
                                    stop.clone(),
                                    step.clone(),
                                ],
                            ),
                        ],
                    ),
                ],
            ))
        }
        ("until.from", [count, index, init, stop, step]) => match count.node {
            Node::Word(0) => Some(init.clone()),
            Node::Word(n) => Some(op(
                out.sort.clone(),
                "call:choose",
                vec![
                    apply(stop.clone(), init.clone())?,
                    init.clone(),
                    op(
                        out.sort.clone(),
                        "until.from",
                        vec![
                            word(Type::U32, n - 1),
                            op(
                                value(Type::U32),
                                "binary:+",
                                vec![index.clone(), word(Type::U32, 1)],
                            ),
                            apply(apply(step.clone(), index.clone())?, init.clone())?,
                            stop.clone(),
                            step.clone(),
                        ],
                    ),
                ],
            )),
            _ => None,
        },
        ("method:freeze" | "method:len", [buffer]) => {
            if let Node::Op(name, args) = &buffer.node {
                if name == "call:buffer" {
                    Some(if n == "method:freeze" {
                        args[0].clone()
                    } else {
                        op(value(Type::U32), "call:length", vec![args[0].clone()])
                    })
                } else {
                    None
                }
            } else {
                None
            }
        }
        ("method:at_or", [buffer, index, fallback])
            if matches!(&buffer.sort, Sort::Value(Type::Buffer(_))) =>
        {
            if let Node::Op(name, args) = &buffer.node {
                if name == "call:buffer" {
                    Some(op(
                        out.sort.clone(),
                        "method:at_or",
                        vec![args[0].clone(), index.clone(), fallback.clone()],
                    ))
                } else {
                    None
                }
            } else {
                None
            }
        }
        ("method:fold", [x, on_value, on_other]) => match &x.node {
            Node::Op(c, v) if (c == "call:Some" || c == "call:Ok") && v.len() == 1 => {
                Some(apply(on_value.clone(), v[0].clone())?)
            }
            Node::Op(c, v) if c == "call:Err" && v.len() == 1 => {
                Some(apply(on_other.clone(), v[0].clone())?)
            }
            Node::Op(c, v) if c == "call:None" && v.is_empty() => Some(apply(
                on_other.clone(),
                term(value(Type::Unit), Node::Unit),
            )?),
            _ => None,
        },
        ("call:length", [xs]) => match &xs.node {
            Node::Nil => Some(word(Type::U32, 0)),
            Node::Cons(_, tail) => Some(op(
                value(Type::U32),
                "binary:+",
                vec![
                    op(value(Type::U32), "call:length", vec![(**tail).clone()]),
                    word(Type::U32, 1),
                ],
            )),
            _ => None,
        },
        ("method:map", [xs, f]) => match &xs.node {
            Node::Nil => Some(term(out.sort.clone(), Node::Nil)),
            Node::Cons(h, t) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    Box::new(apply(f.clone(), (**h).clone())?),
                    Box::new(op(out.sort.clone(), n, vec![(**t).clone(), f.clone()])),
                ),
            )),
            _ => None,
        },
        ("method:filter", [xs, f]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, t) => {
                let rest = op(out.sort.clone(), n, vec![(**t).clone(), f.clone()]);
                Some(op(
                    out.sort.clone(),
                    "call:choose",
                    vec![
                        apply(f.clone(), (**h).clone())?,
                        term(
                            out.sort.clone(),
                            Node::Cons(h.clone(), Box::new(rest.clone())),
                        ),
                        rest,
                    ],
                ))
            }
            _ => None,
        },
        ("call:count", [xs]) => match &xs.node {
            Node::Nil => Some(word(s::val(&out.sort)?.clone(), 0)),
            Node::Cons(_, t) => Some(op(
                out.sort.clone(),
                "binary:+",
                vec![
                    word(s::val(&out.sort)?.clone(), 1),
                    op(out.sort.clone(), n, vec![(**t).clone()]),
                ],
            )),
            _ => None,
        },
        ("call:sum", [xs]) if out.sort == value(Type::F32) => Some(op(
            out.sort.clone(),
            "sum.acc",
            vec![xs.clone(), zero(&out.sort)?],
        )),
        ("sum.acc", [xs, initial]) => match &xs.node {
            Node::Nil => Some(initial.clone()),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                n,
                vec![
                    (**t).clone(),
                    op(
                        out.sort.clone(),
                        "binary:+",
                        vec![initial.clone(), (**h).clone()],
                    ),
                ],
            )),
            _ => None,
        },
        ("call:sum", [xs]) if out.sort != value(Type::F32) => match &xs.node {
            Node::Nil => Some(zero(&out.sort)?),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                "binary:+",
                vec![(**h).clone(), op(out.sort.clone(), n, vec![(**t).clone()])],
            )),
            _ => None,
        },
        ("call:foldl", [xs, init, f]) => match &xs.node {
            Node::Nil => Some(init.clone()),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                n,
                vec![
                    (**t).clone(),
                    apply(apply(f.clone(), (**h).clone())?, init.clone())?,
                    f.clone(),
                ],
            )),
            _ => None,
        },
        ("call:fold_until", [xs, init, stop, step]) => match &xs.node {
            Node::Nil => Some(init.clone()),
            Node::Cons(h, tail) => {
                let stopped = apply(apply(stop.clone(), (**h).clone())?, init.clone())?;
                let next = apply(apply(step.clone(), (**h).clone())?, init.clone())?;
                Some(op(
                    out.sort.clone(),
                    "call:choose",
                    vec![
                        stopped,
                        next.clone(),
                        op(
                            out.sort.clone(),
                            n,
                            vec![(**tail).clone(), next, stop.clone(), step.clone()],
                        ),
                    ],
                ))
            }
            _ => None,
        },
        ("call:foldr", [xs, init, f]) => match &xs.node {
            Node::Nil => Some(init.clone()),
            Node::Cons(h, t) => Some(apply(
                apply(f.clone(), (**h).clone())?,
                op(
                    out.sort.clone(),
                    n,
                    vec![(**t).clone(), init.clone(), f.clone()],
                ),
            )?),
            _ => None,
        },
        ("method:zip", [xs, ys, f]) => match (&xs.node, &ys.node) {
            (Node::Nil, _) | (_, Node::Nil) => Some(term(out.sort.clone(), Node::Nil)),
            (Node::Cons(x, xs), Node::Cons(y, ys)) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    Box::new(apply(apply(f.clone(), (**x).clone())?, (**y).clone())?),
                    Box::new(op(
                        out.sort.clone(),
                        n,
                        vec![(**xs).clone(), (**ys).clone(), f.clone()],
                    )),
                ),
            )),
            _ => None,
        },
        ("method:map_indexed", [xs, f]) => Some(op(
            out.sort.clone(),
            "indexed.from",
            vec![xs.clone(), term(Sort::Nat, Node::Nat(0)), f.clone()],
        )),
        ("indexed.from", [xs, index, f]) => match &xs.node {
            Node::Nil => Some(term(out.sort.clone(), Node::Nil)),
            Node::Cons(h, t) => Some(term(
                out.sort.clone(),
                Node::Cons(
                    Box::new(apply(
                        apply(
                            f.clone(),
                            op(value(Type::U32), "nat.word", vec![index.clone()]),
                        )?,
                        (**h).clone(),
                    )?),
                    Box::new(op(
                        out.sort.clone(),
                        n,
                        vec![
                            (**t).clone(),
                            op(Sort::Nat, "nat.succ", vec![index.clone()]),
                            f.clone(),
                        ],
                    )),
                ),
            )),
            _ => None,
        },
        ("method:scan", [xs]) => {
            let Sort::Value(Type::List(t)) = &out.sort else {
                return Err("scan sort".into());
            };
            Some(op(
                out.sort.clone(),
                "scan.acc",
                vec![
                    xs.clone(),
                    if **t == Type::F32 {
                        term(value(Type::F32), Node::Float(0))
                    } else {
                        word((**t).clone(), 0)
                    },
                ],
            ))
        }
        ("scan.acc", [xs, initial]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, t) => {
                let head = op(
                    initial.sort.clone(),
                    "binary:+",
                    vec![initial.clone(), (**h).clone()],
                );
                Some(term(
                    out.sort.clone(),
                    Node::Cons(
                        Box::new(head.clone()),
                        Box::new(op(out.sort.clone(), n, vec![(**t).clone(), head])),
                    ),
                ))
            }
            _ => None,
        },
        ("method:sort", [xs]) => match &xs.node {
            Node::Nil => Some(xs.clone()),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                "list.insert",
                vec![(**h).clone(), op(out.sort.clone(), n, vec![(**t).clone()])],
            )),
            _ => None,
        },
        ("list.insert", [x, xs]) => match &xs.node {
            Node::Nil => Some(term(
                out.sort.clone(),
                Node::Cons(Box::new(x.clone()), Box::new(xs.clone())),
            )),
            Node::Cons(h, t) => Some(op(
                out.sort.clone(),
                "call:choose",
                vec![
                    op(
                        value(Type::Bool),
                        "binary:<=",
                        vec![x.clone(), (**h).clone()],
                    ),
                    term(
                        out.sort.clone(),
                        Node::Cons(Box::new(x.clone()), Box::new(xs.clone())),
                    ),
                    term(
                        out.sort.clone(),
                        Node::Cons(
                            h.clone(),
                            Box::new(op(out.sort.clone(), n, vec![x.clone(), (**t).clone()])),
                        ),
                    ),
                ],
            )),
            _ => None,
        },
        ("method:at_or", [xs, index, fallback]) => match &xs.node {
            Node::Nil => Some(fallback.clone()),
            Node::Cons(h, tail) => Some(op(
                out.sort.clone(),
                "call:choose",
                vec![
                    op(
                        value(Type::Bool),
                        "binary:==",
                        vec![index.clone(), word(Type::U32, 0)],
                    ),
                    (**h).clone(),
                    op(
                        out.sort.clone(),
                        n,
                        vec![
                            (**tail).clone(),
                            op(
                                value(Type::U32),
                                "binary:-",
                                vec![index.clone(), word(Type::U32, 1)],
                            ),
                            fallback.clone(),
                        ],
                    ),
                ],
            )),
            _ => None,
        },
        ("call:quot_or" | "call:rem_or", [_, divisor, fallback])
            if divisor.node == Node::Word(0) =>
        {
            Some(fallback.clone())
        }
        (n, [x]) if n.starts_with("field:") => {
            if let Node::Op(name, args) = &x.node {
                let idx = if name.starts_with("record:") {
                    p.records
                        .get(&name[7..])
                        .and_then(|fs| fs.iter().position(|(field, _)| field == &n[6..]))
                } else if name.starts_with("call:vec") {
                    ["x", "y", "z", "w"]
                        .iter()
                        .position(|field| *field == &n[6..])
                } else {
                    None
                };
                idx.and_then(|i| args.get(i).cloned())
            } else {
                None
            }
        }
        (n, args) if n.starts_with("call:") => {
            if let Some(f) = p.functions.iter().find(|f| f.name == n[5..]) {
                // An unknown finite value cannot be exhaustively unfolded.
                // Keep the actual call as an atom; concrete execution remains
                // bounded by the ordinary semantic work/depth budget.
                if recursive.contains(f.name.as_str()) && !concrete_arguments(args) {
                    return Ok(out);
                }
                let body =
                    s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
                let expanded = substitute(
                    &body,
                    &f.params
                        .iter()
                        .zip(args)
                        .map(|((n, _), t)| (n.clone(), t.clone()))
                        .collect(),
                    b,
                )?;
                return normal_inner(&expanded, hyp, p, b, d + 1, recursive);
            } else {
                None
            }
        }
        _ => None,
    };
    if let Some(t) = reduced {
        return normal_inner(&t, hyp, p, b, d + 1, recursive);
    }
    if let Some(t) = literal_primitive(&out, p, b)? {
        return Ok(t);
    }
    Ok(out)
}
fn literal_primitive(t: &Term, p: &Program, b: &mut Budget) -> LangResult<Option<Term>> {
    let Node::Op(n, args) = &t.node else {
        return Ok(None);
    };
    if !(n.starts_with("binary:")
        || n == "neg"
        || n.strip_prefix("call:").is_some_and(crate::primitives::primitive)
        || n == "call:quot_or"
        || n == "call:rem_or"
        || n.strip_prefix("call:").is_some_and(crate::word::primitive))
    {
        return Ok(None);
    }
    if args.len()==2 && args.iter().all(|a|a.sort==value(Type::Int)) && ["binary:==","binary:!=","binary:<","binary:<=","binary:>","binary:>="].contains(&n.as_str()) {
        use num_traits::{Zero,Signed};
        let gap=polynomial(&op(value(Type::Int),"binary:-",args.clone()),b,0)?;
        if gap.keys().all(|key|key.is_empty()) {
            let x=gap.get(&vec![]).cloned().unwrap_or_default();
            let yes=match n.as_str(){"binary:=="=>x.is_zero(),"binary:!="=>!x.is_zero(),"binary:<"=>x.is_negative(),"binary:<="=>!x.is_positive(),"binary:>"=>x.is_positive(),_=>!x.is_negative()};
            return Ok(Some(term(value(Type::Bool),Node::Bool(yes))));
        }
    }
    if !args
        .iter()
        .all(|a| matches!(a.node, Node::Word(_) | Node::Float(_) | Node::Bool(_) | Node::String(_)))
    {
        return Ok(None);
    }
    if t.sort == value(Type::Int) || (n != "call:f32_from_int" && args.iter().any(|a| a.sort == value(Type::Int))) {
        return Ok(None);
    }
    let expr = s::reify(t, p)
        .or_else(|_| Err("exceptional float cannot be reified for computation".to_string()))?;
    let Sort::Value(ty) = &t.sort else {
        return Ok(None);
    };
    let mut fuel = b.remaining as u64;
    let v = crate::eval::closed(&expr, p, ty, &mut fuel)?;
    b.remaining = fuel as usize;
    Ok(Some(match v {
        crate::eval::Value::U32(n) => word(Type::U32, n as u64),
        crate::eval::Value::I32(n) => word(Type::I32, n as u32 as u64),
        crate::eval::Value::U64(n) => word(Type::U64, n),
        crate::eval::Value::F32(n) => term(value(Type::F32), Node::Float(n)),
        crate::eval::Value::Bool(x) => term(value(Type::Bool), Node::Bool(x)),
        crate::eval::Value::Opaque(crate::stateful::Value::String(x)) => term(value(Type::String),Node::String(x)),
        crate::eval::Value::Opaque(crate::stateful::Value::Option(x)) => {
            let Type::Option(inner)=ty else{return Err("literal option type".into())};
            if let Some(x)=x {let child=match *x {
                crate::stateful::Value::String(x)=>term(value(Type::String),Node::String(x)),
                crate::stateful::Value::U32(x)=>word(Type::U32,x as u64),
                crate::stateful::Value::U64(x)=>word(Type::U64,x),
                crate::stateful::Value::I32(x)=>word(Type::I32,x as u32 as u64),
                crate::stateful::Value::Int(x)=>{
                    let (sign,digits)=x.to_u32_digits();let mut result=word(Type::Int,0);
                    for digit in digits.iter().rev(){result=op(value(Type::Int),"binary:+",vec![op(value(Type::Int),"binary:*",vec![result,word(Type::Int,4294967296)]),word(Type::Int,*digit as u64)]);}
                    if sign==num_bigint::Sign::Minus {op(value(Type::Int),"neg",vec![result])}else{result}
                },
                _=>return Err("literal option value".into())};
                let _=inner;op(value(ty.clone()),"call:Some",vec![child])
            }else{op(value(ty.clone()),"call:None",vec![])}
        },
        _ => return Err("literal primitive output".into()),
    }))
}
const ORDER_COMPARISONS: [&str; 6] = [
    "binary:<",
    "binary:<=",
    "binary:>",
    "binary:>=",
    "binary:==",
    "binary:!=",
];
/// A decision procedure for comparisons among a few atoms of one totally
/// ordered sort: unsigned and signed words and exact Int, never f32 (NaN is
/// unordered). It returns one hypothesis list per weak ordering of the atoms.
///
/// Soundness: under any valuation the atoms' values induce exactly one weak
/// ordering, and in it every emitted fact is true. Atoms of one class equal
/// its first member (the representative), and a comparison between two
/// representatives is decided by their class ranks. A region is dropped only
/// when it cannot occur: two literal atoms contradict it, or normalisation
/// under its facts turns a hypothesis into `true == false`. Every other
/// region is returned, so the caller's body proof covers every valuation that
/// satisfies the hypotheses. Comparison facts mention only operators that
/// occur in the normalised goal or hypotheses; a subset of true facts is
/// still true, so this only bounds the work.
fn order_regions(
    p: &Program,
    env: &Env,
    hyp: &[Equation],
    goal: &Equation,
    atoms: &[Term],
    b: &mut Budget,
    d: usize,
) -> LangResult<Vec<Vec<Equation>>> {
    if !(2..=5).contains(&atoms.len()) {
        return Err("order analysis takes two to five atoms".into());
    }
    let sort = atoms[0].sort.clone();
    let ty = match &sort {
        Sort::Value(t @ (Type::U32 | Type::U64 | Type::I32 | Type::Int)) => t.clone(),
        _ => return Err("order atoms must be words or exact Int".into()),
    };
    let mut normalised: Vec<Term> = vec![];
    for a in atoms {
        validate(a, env, p, b)?;
        if a.sort != sort {
            return Err("order atoms differ in sort".into());
        }
        let n = normal(a, &[], p, b, d + 1)?;
        if normalised.contains(&n) {
            return Err("order atoms must be distinct".into());
        }
        normalised.push(n);
    }
    fn scan(t: &Term, sort: &Sort, out: &mut BTreeSet<&'static str>, b: &mut Budget, d: usize) -> LangResult<()> {
        b.step(d)?;
        if let Node::Op(n, a) = &t.node {
            if let Some(name) = ORDER_COMPARISONS.iter().find(|c| **c == n.as_str()) {
                if a.len() == 2 && &a[0].sort == sort {
                    out.insert(name);
                }
            }
        }
        for c in children(t) {
            scan(c, sort, out, b, d + 1)?;
        }
        Ok(())
    }
    let mut used = BTreeSet::new();
    for t in [&goal.from, &goal.to] {
        scan(&normal(t, hyp, p, b, d + 1)?, &sort, &mut used, b, d + 1)?;
    }
    for h in hyp {
        scan(&h.from, &sort, &mut used, b, d + 1)?;
        scan(&h.to, &sort, &mut used, b, d + 1)?;
    }
    // With no comparison in sight only the class equalities can matter.
    let literal = |t: &Term| -> Option<i128> {
        match t.node {
            Node::Word(w) if ty == Type::I32 => Some(w as u32 as i32 as i128),
            Node::Word(w) => Some(w as i128),
            _ => None,
        }
    };
    let boolean = |x: bool| term(value(Type::Bool), Node::Bool(x));
    let n = normalised.len();
    let mut ranks = vec![0usize; n];
    let mut out = vec![];
    loop {
        b.step(d)?;
        let classes = ranks.iter().max().map_or(0, |m| m + 1);
        let surjective = (0..classes).all(|r| ranks.contains(&r));
        let consistent = (0..n).all(|i| {
            (0..n).all(|j| match (literal(&normalised[i]), literal(&normalised[j])) {
                (Some(x), Some(y)) => x.cmp(&y) == ranks[i].cmp(&ranks[j]),
                _ => true,
            })
        });
        if surjective && consistent {
            let representative: Vec<usize> = (0..classes)
                .map(|r| ranks.iter().position(|x| *x == r).unwrap())
                .collect();
            let mut facts = vec![];
            for i in 0..n {
                let r = representative[ranks[i]];
                if r != i {
                    facts.push(Equation {
                        from: normalised[i].clone(),
                        to: normalised[r].clone(),
                    });
                }
            }
            for x in 0..classes {
                for y in 0..classes {
                    for name in &used {
                        let holds = match *name {
                            "binary:<" => x < y,
                            "binary:<=" => x <= y,
                            "binary:>" => x > y,
                            "binary:>=" => x >= y,
                            "binary:==" => x == y,
                            _ => x != y,
                        };
                        facts.push(Equation {
                            from: op(
                                value(Type::Bool),
                                name,
                                vec![
                                    normalised[representative[x]].clone(),
                                    normalised[representative[y]].clone(),
                                ],
                            ),
                            to: boolean(holds),
                        });
                    }
                }
            }
            let mut refuted = false;
            for h in hyp {
                let from = normal(&h.from, &facts, p, b, d + 1)?;
                let to = normal(&h.to, &facts, p, b, d + 1)?;
                if matches!((&from.node, &to.node), (Node::Bool(x), Node::Bool(y)) if x != y) {
                    refuted = true;
                    break;
                }
            }
            if !refuted {
                out.push(facts);
            }
        }
        let mut i = 0;
        loop {
            if i == n {
                return Ok(out);
            }
            ranks[i] += 1;
            if ranks[i] < n {
                break;
            }
            ranks[i] = 0;
            i += 1;
        }
    }
}
// A small certificate checker, not an optimiser or theorem-name registry.
// Each exact Int comparison supplies a nonnegative polynomial. The goal follows
// if its gap minus the supplied nonnegative combination is a nonnegative constant.
fn linear(p: &Program, hyp: &[Equation], goal: &Equation, premises: &[(usize,u64)], b: &mut Budget) -> LangResult<()> {
    use num_traits::{Zero, Signed};
    if premises.len() > 256 { return Err("linear certificate size limit".into()); }
    fn gap(e: &Equation, facts: &[Equation], p: &Program, b: &mut Budget) -> LangResult<Polynomial> {
        if e.to != term(value(Type::Bool), Node::Bool(true)) { return Err("linear goal must assert a proposition".into()); }
        let t = normal(&e.from, facts, p, b, 0)?;
        if t == e.to { return Ok(BTreeMap::new()); }
        let Node::Op(n, a) = &t.node else { return Err("linear proposition is not a comparison".into()); };
        if a.len()!=2 || a.iter().any(|a| a.sort != value(Type::Int)) { return Err("linear comparisons require exact Int operands".into()); }
        let (left,right,strict) = match n.as_str() {
            "binary:<=" => (&a[0],&a[1],false), "binary:<" => (&a[0],&a[1],true),
            "binary:>=" => (&a[1],&a[0],false), "binary:>" => (&a[1],&a[0],true),
            _ => return Err("unsupported linear comparison".into()),
        };
        let mut out = polynomial(&op(value(Type::Int), "binary:-", vec![right.clone(),left.clone()]), b, 0)?;
        if strict { *out.entry(vec![]).or_default() -= 1; }
        Ok(out)
    }
    let mut residual = gap(goal, hyp, p, b)?;
    for &(index,weight) in premises {
        b.step(0)?;
        let premise = hyp.get(index).ok_or("linear premise index")?;
        if weight == 0 { continue; }
        for (monomial,coefficient) in gap(premise, &[], p, b)? {
            let v = residual.entry(monomial).or_default();
            *v -= coefficient * num_bigint::BigInt::from(weight);
            if v.bits()>32768 { return Err("linear coefficient bit limit".into()); }
        }
        if residual.len()>8192 { return Err("linear term limit".into()); }
    }
    residual.retain(|_,v| !v.is_zero());
    if residual.iter().any(|(m,v)| !m.is_empty() || v.is_negative()) {
        return Err("linear certificate leaves a nonconstant or negative remainder".into());
    }
    Ok(())
}

// A general decision procedure for the polynomial fragment of exact integer
// and wrapping word semantics. It checks equality; it never installs an optimisation or emits code.
type Polynomial = BTreeMap<Vec<String>, num_bigint::BigInt>;
fn polynomial(t: &Term, b: &mut Budget, d: usize) -> LangResult<Polynomial> {
    b.step(d)?;
    use num_traits::Zero;
    // One ring procedure: exact coefficients, or reduction modulo fixed width.
    // Bound every coefficient and charge limb work before retaining it.
    let mask = if t.sort == value(Type::Int) {
        None
    } else {
        Some(num_bigint::BigInt::from(if t.sort == value(Type::U64) {
            u64::MAX
        } else {
            u32::MAX as u64
        }))
    };
    let coefficient = |x: num_bigint::BigInt, b: &mut Budget| -> LangResult<num_bigint::BigInt> {
        let x = if let Some(mask) = &mask { x & mask } else { x };
        if x.bits() > 32768 {
            return Err("polynomial coefficient bit limit".into());
        }
        for _ in 0..x.bits().div_ceil(64).max(1) {
            b.step(d)?;
        }
        Ok(x)
    };
    let add = |mut a: Polynomial,
               c: Polynomial,
               negative: bool,
               b: &mut Budget|
     -> LangResult<Polynomial> {
        for (m, k) in c {
            b.step(d)?;
            let k = if negative { -k } else { k };
            let v = a.entry(m).or_default();
            *v = coefficient(&*v + k, b)?;
        }
        if a.len() > 8192 {
            return Err("polynomial term limit".into());
        }
        a.retain(|_, v| !v.is_zero());
        Ok(a)
    };
    match &t.node {
        Node::Word(n) => Ok(if *n == 0 {
            BTreeMap::new()
        } else {
            BTreeMap::from([(vec![], coefficient((*n).into(), b)?)])
        }),
        Node::Op(n, a) if n == "neg" => add(BTreeMap::new(), polynomial(&a[0], b, d + 1)?, true, b),
        Node::Op(n, a) if n == "binary:+" || n == "binary:-" => add(
            polynomial(&a[0], b, d + 1)?,
            polynomial(&a[1], b, d + 1)?,
            n == "binary:-",
            b,
        ),
        Node::Op(n, a) if n == "binary:*" => {
            let a = polynomial(&a[0], b, d + 1)?;
            let c = polynomial(&a_term(t, 1)?, b, d + 1)?;
            let mut out = Polynomial::new();
            for (m, k) in a {
                for (q, v) in &c {
                    b.step(d)?;
                    let mut key = m.clone();
                    key.extend(q.clone());
                    if key.len() > 128 {
                        return Err("word polynomial degree limit".into());
                    }
                    key.sort();
                    let old = out.entry(key).or_default();
                    if k.bits().saturating_add(v.bits()) > 32769 {
                        return Err("polynomial multiplication bit limit".into());
                    }
                    *old = coefficient(&*old + &k * v, b)?;
                    if out.len() > 8192 {
                        return Err("word polynomial term limit".into());
                    }
                }
            }
            out.retain(|_, v| !v.is_zero());
            Ok(out)
        }
        _ => Ok(BTreeMap::from([(
            vec![serde_json::to_string(t).map_err(|e| e.to_string())?],
            1.into(),
        )])),
    }
}
fn a_term(t: &Term, i: usize) -> LangResult<Term> {
    children(t)
        .get(i)
        .map(|t| (*t).clone())
        .ok_or("semantic argument".into())
}
fn equivalent(
    a: &Term,
    c: &Term,
    hyp: &[Equation],
    p: &Program,
    b: &mut Budget,
    d: usize,
) -> LangResult<bool> {
    let recursive = recursive_definitions(p)?;
    equivalent_inner(a, c, hyp, p, b, d, &recursive)
}
fn equivalent_inner(
    a: &Term, c: &Term, hyp: &[Equation], p: &Program,
    b: &mut Budget, d: usize, recursive: &BTreeSet<&str>,
) -> LangResult<bool> {
    b.step(d)?;
    if a == c {
        return Ok(true);
    }
    if a.sort != c.sort {
        return Ok(false);
    }
    if hyp.iter().any(|h| (h.from == *a && h.to == *c) || (h.from == *c && h.to == *a)) {
        return Ok(true);
    }
    if same_head(a, c) {
        let mut same = true;
        for (x, y) in children(a).into_iter().zip(children(c)) {
            if !equivalent_inner(x, y, hyp, p, b, d + 1, recursive)? {
                same = false;
                break;
            }
        }
        if same {
            return Ok(true);
        }
    }
    // One definition unfolding may establish correspondence immediately. Do
    // not force a large unchanged loop merely to compare a call with its body.
    for (left, right) in [(a, c), (c, a)] {
        if let Node::Op(name, args) = &left.node {
            if let Some(name) = name.strip_prefix("call:") {
                if let Some(f) = p.functions.iter().find(|f| f.name == name) {
                    let body =
                        s::elaborate(&f.body, &crate::check::params_env(&f.params)?, p, &f.result)?;
                    let args = f
                        .params
                        .iter()
                        .zip(args)
                        .map(|((n, _), v)| (n.clone(), v.clone()))
                        .collect();
                    let expanded = substitute(&body, &args, b)?;
                    if expanded == *right || (!recursive.contains(name)
                        && equivalent_inner(&expanded, right, hyp, p, b, d + 1, recursive)?) {
                        return Ok(true);
                    }
                }
            }
        }
    }
    let mut facts = hyp
        .iter()
        .map(|h| {
            Ok(Equation {
                from: normal_inner(&h.from, &[], p, b, 0, recursive)?,
                to: normal_inner(&h.to, &[], p, b, 0, recursive)?,
            })
        })
        .collect::<LangResult<Vec<_>>>()?;
    // A true fixed structural-equality predicate establishes exact value
    // identity. Transport that consequence to its consumers after beta/source
    // normalization, including instantiated relation callbacks. IEEE scalar
    // binary:== is deliberately excluded: signed zeros and NaNs do not carry
    // this stronger raw-bit guarantee.
    fn structural_facts(facts:&mut Vec<Equation>)->LangResult<()> {
        let previous=facts.clone();
        for h in previous {
            if h.to.node!=Node::Bool(true) {continue;}
            if let Node::Op(name,args)=h.from.node {
                if name=="value:equal" && args.len()==2 && args[0].sort==args[1].sort {
                    let derived=Equation{from:args[0].clone(),to:args[1].clone()};
                    if derived.from!=derived.to && !facts.contains(&derived) {
                        if facts.len()>=1024{return Err("semantic derived fact count limit".into());}
                        facts.push(derived);
                    }
                }
            }
        }
        Ok(())
    }
    structural_facts(&mut facts)?;
    // A premise can itself contain a parameter established by another premise.
    // In particular, an induction hypothesis retains the original callback,
    // while a contract may establish one of that callback's captures. Normalize
    // both sides with the other equations, never using a premise to prove itself.
    // Every intermediate equation is still a consequence of the original facts.
    if facts.len()>1 {
        for _ in 0..8 {
            let previous=facts.clone();
            for i in 0..previous.len() {
                let others=previous.iter().enumerate().filter(|(j,_)|*j!=i)
                    .map(|(_,e)|e.clone()).collect::<Vec<_>>();
                let derived=Equation {from:normal_inner(&previous[i].from,&others,p,b,0,recursive)?,
                    to:normal_inner(&previous[i].to,&others,p,b,0,recursive)?};
                if derived.from!=derived.to && !facts.contains(&derived) {
                    if facts.len()>=1024{return Err("semantic derived fact count limit".into())}
                    facts.push(derived);
                }
            }
            structural_facts(&mut facts)?;
            if facts==previous {break}
        }
    }
    let a = normal_inner(a, &facts, p, b, 0, recursive)?;
    let c = normal_inner(c, &facts, p, b, 0, recursive)?;
    if a == c {
        return Ok(true);
    }
    if a.sort != c.sort {
        return Ok(false);
    }
    if matches!(&a.sort,Sort::Value(t) if check_word(t) || *t==Type::Int) {
        return Ok(polynomial(&a, b, 0)? == polynomial(&c, b, 0)?);
    }
    if !same_head(&a, &c) {
        return Ok(false);
    }
    for (a, c) in children(&a).into_iter().zip(children(&c)) {
        if !equivalent_inner(a, c, &facts, p, b, d + 1, recursive)? {
            return Ok(false);
        }
    }
    Ok(true)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn context() -> (Program, CheckedCatalogue) {
        let p = Program::default();
        let c = Catalogue {
            schema: 1,
            semantics: SEMANTICS.into(),
            roots: vec![],
            objects: BTreeMap::new(),
        };
        let checked = CheckedCatalogue::check(&c, &p).unwrap();
        (p, checked)
    }
    #[test]
    fn opaque_map_membership_observes_keys_and_preserves_bound_queries() {
        let (p, checked) = context();
        let boolean = value(Type::Bool);
        for key_type in [Type::U32, Type::U64, Type::I32, Type::Bool] {
            let key_sort = value(key_type.clone());
            let map_sort = value(Type::Map(Box::new(key_type.clone()), Box::new(Type::U32)));
            let map = free(map_sort.clone(), "map");
            let other = free(map_sort.clone(), "other");
            let env = BTreeMap::from([("map".into(), map_sort.clone()), ("other".into(), map_sort)]);
            let lambda = |input: Sort, body: Term| term(arrow(input, body.sort.clone()), Node::Lambda(Box::new(body)));
            // The query is bound outside the fold; its index must survive both
            // callback binders. This expected term does not call the reducer.
            let observe = |source: Term| {
                let body = op(boolean.clone(), "binary:||", vec![
                    op(boolean.clone(), "binary:==", vec![
                        term(key_sort.clone(), Node::Bound(2)),
                        term(key_sort.clone(), Node::Bound(1)),
                    ]),
                    term(boolean.clone(), Node::Bound(0)),
                ]);
                lambda(key_sort.clone(), op(boolean.clone(), "call:foldr", vec![
                    op(value(Type::List(Box::new(key_type.clone()))), "method:keys", vec![source]),
                    term(boolean.clone(), Node::Bool(false)),
                    lambda(key_sort.clone(), lambda(boolean.clone(), body)),
                ]))
            };
            let contains = lambda(key_sort.clone(), op(boolean.clone(), "method:contains", vec![
                map.clone(), term(key_sort.clone(), Node::Bound(0)),
            ]));
            checked.prove(&p, &env, &[], &Equation { from: contains.clone(), to: observe(map) },
                &Proof::Normalize, &mut Budget::new(), 0).unwrap();
            assert!(checked.prove(&p, &env, &[], &Equation { from: contains, to: observe(other) },
                &Proof::Normalize, &mut Budget::new(), 0).is_err(), "membership must bind the same map");
        }
    }
    #[test]
    fn quantified_induction_respects_free_variables_of_inherited_schemas() {
        let (p, c) = context();
        let list = value(Type::List(Box::new(Type::U32)));
        let i = free(value(Type::U32), "i");
        let xs = free(list.clone(), "xs");
        let env = BTreeMap::from([("xs".into(), list), ("i".into(), i.sort.clone())]);
        let goal = Equation {
            from: xs.clone(),
            to: xs,
        };
        let proof = Proof::GeneralizedInduction {
            variable: "xs".into(),
            generalize: vec!["i".into()],
            names: vec!["head".into(), "tail".into()],
            base: Box::new(Proof::Normalize),
            step: Box::new(Proof::Normalize),
        };
        let mut schema = InductionSchema {
            params: Env::new(),
            equation: Equation {
                from: i.clone(),
                to: i.clone(),
            },
        };
        assert!(c
            .prove_inner(
                &p,
                &env,
                &[],
                &[schema.clone()],
                &goal,
                &proof,
                &mut Budget::new(),
                0
            )
            .unwrap_err()
            .contains("independent"));
        // A schema-bound parameter is universally quantified already, so it
        // imposes no fixed assumption on the parameter being generalized.
        schema.params.insert("i".into(), i.sort);
        c.prove_inner(
            &p,
            &env,
            &[],
            &[schema],
            &goal,
            &proof,
            &mut Budget::new(),
            0,
        )
        .unwrap();
    }
    #[test]
    fn wrapping_arithmetic_is_checked_for_each_word_width() {
        let (p, c) = context();
        for ty in [Type::U32, Type::U64, Type::I32] {
            let s = value(ty.clone());
            let x = free(s.clone(), "x");
            let env = BTreeMap::from([("x".into(), s.clone())]);
            let a = op(
                s.clone(),
                "binary:+",
                vec![
                    op(s.clone(), "binary:+", vec![x.clone(), word(ty.clone(), 1)]),
                    word(ty.clone(), 1),
                ],
            );
            let target = op(s, "binary:+", vec![x, word(ty, 2)]);
            c.prove(
                &p,
                &env,
                &[],
                &Equation {
                    from: a,
                    to: target,
                },
                &Proof::Normalize,
                &mut Budget::new(),
                0,
            )
            .unwrap();
        }
    }
    #[test]
    fn false_equalities_and_unknown_primitives_reject() {
        let (p, c) = context();
        let goal = Equation {
            from: word(Type::U32, 0),
            to: word(Type::U32, 1),
        };
        assert!(c
            .prove(
                &p,
                &Env::new(),
                &[],
                &goal,
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
        let bad = op(value(Type::U32), "proof.trust", vec![]);
        assert!(validate(&bad, &Env::new(), &p, &mut Budget::new()).is_err());
    }
    #[test]
    fn beta_reduction_preserves_free_variables_beneath_binders() {
        let s = value(Type::U32);
        let body = lambda(s.clone(), term(s.clone(), Node::Bound(1)));
        let result = beta(&body, &free(s.clone(), "x"), &mut Budget::new()).unwrap();
        assert_eq!(result, lambda(s.clone(), free(s, "x")));
    }
    #[test]
    fn floats_do_not_enter_the_word_polynomial_checker() {
        let (p, c) = context();
        let s = value(Type::F32);
        let x = free(s.clone(), "x");
        let env = BTreeMap::from([("x".into(), s.clone())]);
        let from = op(s.clone(), "binary:-", vec![x.clone(), x]);
        let to = term(s, Node::Float(0));
        assert!(c
            .prove(
                &p,
                &env,
                &[],
                &Equation { from, to },
                &Proof::Normalize,
                &mut Budget::new(),
                0
            )
            .is_err());
    }
    fn pick(name: &str, x: &Term, y: &Term) -> Term {
        op(
            x.sort.clone(),
            "call:choose",
            vec![
                op(value(Type::Bool), name, vec![x.clone(), y.clone()]),
                x.clone(),
                y.clone(),
            ],
        )
    }
    fn order_env(ty: &Type, names: &[&str]) -> (Env, Vec<Term>) {
        let s = value(ty.clone());
        let env = names.iter().map(|n| (n.to_string(), s.clone())).collect();
        (env, names.iter().map(|n| free(s.clone(), n)).collect())
    }
    fn order(atoms: &[Term]) -> Proof {
        Proof::Order {
            atoms: atoms.to_vec(),
            body: Box::new(Proof::Normalize),
        }
    }
    #[test]
    fn order_analysis_proves_that_maxima_and_minima_swap() {
        let (p, c) = context();
        for ty in [Type::U32, Type::U64, Type::I32, Type::Int] {
            for name in ["binary:>", "binary:<", "binary:>=", "binary:<="] {
                let (env, v) = order_env(&ty, &["a", "b", "s"]);
                let goal = Equation {
                    from: pick(name, &v[0], &pick(name, &v[1], &v[2])),
                    to: pick(name, &v[1], &pick(name, &v[0], &v[2])),
                };
                let prove = |proof: &Proof| c.prove(&p, &env, &[], &goal, proof, &mut Budget::new(), 0);
                assert!(prove(&Proof::Normalize).is_err(), "{ty:?} {name} needs order analysis");
                prove(&order(&v)).unwrap_or_else(|e| panic!("{ty:?} {name}: {e}"));
            }
        }
    }
    #[test]
    fn order_analysis_rejects_false_order_claims() {
        let (p, c) = context();
        for ty in [Type::U32, Type::I32, Type::Int] {
            let (env, v) = order_env(&ty, &["a", "b", "s"]);
            let max = |x: &Term, y: &Term| pick("binary:>", x, y);
            for (from, to) in [
                (max(&v[0], &v[1]), v[0].clone()),
                (max(&v[0], &max(&v[1], &v[2])), max(&v[0], &v[2])),
                // max and min do not commute with each other.
                (max(&v[0], &pick("binary:<", &v[1], &v[2])), pick("binary:<", &v[1], &max(&v[0], &v[2]))),
            ] {
                let goal = Equation { from, to };
                assert!(c.prove(&p, &env, &[], &goal, &order(&v), &mut Budget::new(), 0).is_err());
            }
        }
    }
    #[test]
    fn order_analysis_derives_transitivity_from_hypotheses() {
        let (p, c) = context();
        let (env, v) = order_env(&Type::I32, &["a", "b", "c"]);
        let less = |x: &Term, y: &Term| op(value(Type::Bool), "binary:<", vec![x.clone(), y.clone()]);
        let yes = term(value(Type::Bool), Node::Bool(true));
        let hyp = [
            Equation { from: less(&v[0], &v[1]), to: yes.clone() },
            Equation { from: less(&v[1], &v[2]), to: yes.clone() },
        ];
        let goal = Equation { from: less(&v[0], &v[2]), to: yes.clone() };
        assert!(c.prove(&p, &env, &hyp, &goal, &Proof::Normalize, &mut Budget::new(), 0).is_err());
        c.prove(&p, &env, &hyp, &goal, &order(&v), &mut Budget::new(), 0).unwrap();
        // Without the second premise the conclusion does not follow.
        assert!(c.prove(&p, &env, &hyp[..1], &goal, &order(&v), &mut Budget::new(), 0).is_err());
    }
    #[test]
    fn order_analysis_is_bounded_and_typed() {
        let (p, c) = context();
        let (env, v) = order_env(&Type::U32, &["a", "b", "c", "d", "e", "f"]);
        let goal = Equation { from: v[0].clone(), to: v[0].clone() };
        let run = |atoms: &[Term]| c.prove(&p, &env, &[], &goal, &order(atoms), &mut Budget::new(), 0);
        assert!(run(&v).unwrap_err().contains("two to five"));
        assert!(run(&v[..1]).unwrap_err().contains("two to five"));
        assert!(run(&[v[0].clone(), v[0].clone()]).unwrap_err().contains("distinct"));
        run(&v[..5]).unwrap();
        let (fenv, f) = order_env(&Type::F32, &["x", "y"]);
        let fgoal = Equation { from: f[0].clone(), to: f[0].clone() };
        assert!(c.prove(&p, &fenv, &[], &fgoal, &order(&f), &mut Budget::new(), 0).unwrap_err().contains("words or exact Int"));
        let (_, w) = order_env(&Type::U64, &["a"]);
        assert!(run(&[v[0].clone(), w[0].clone()]).is_err());
    }
    #[test]
    fn order_analysis_respects_literal_atoms_and_signedness() {
        let (p, c) = context();
        // For I32, 4294967295 is -1, so it is below 0 and `max(m, 0)` is 0
        // whenever m is that literal; the region that orders the two literals
        // the other way never occurs.
        for (ty, expect) in [(Type::I32, 0u64), (Type::U32, 4294967295)] {
            let (env, v) = order_env(&ty, &["x"]);
            let minus_one = word(ty.clone(), 4294967295);
            let zero = word(ty.clone(), 0);
            let goal = Equation {
                from: pick("binary:>", &minus_one, &zero),
                to: word(ty.clone(), expect),
            };
            c.prove(&p, &env, &[], &goal, &order(&[minus_one.clone(), zero.clone(), v[0].clone()]), &mut Budget::new(), 0)
                .unwrap_or_else(|e| panic!("{ty:?}: {e}"));
        }
    }
}
/// Premise certificates use the application's binder context, just like its
/// arguments. Open that context uniformly in every term carried by the proof.
pub fn open_proof(proof: &Proof, scope: &[(String, Sort)], b: &mut Budget) -> LangResult<Proof> {
    fn go(proof: &Proof, scope: &[(String, Sort)], b: &mut Budget, d: usize) -> LangResult<Proof> {
        b.step(d)?;
        let eq = |e: &Equation, b: &mut Budget| -> LangResult<Equation> {
            Ok(Equation {
                from: s::open_scope(&e.from, scope, b)?,
                to: s::open_scope(&e.to, scope, b)?,
            })
        };
        Ok(match proof {
            Proof::Linear { premises } => Proof::Linear { premises: premises.clone() },
            Proof::Word { hypotheses, certificate } => Proof::Word { hypotheses: hypotheses.clone(), certificate: certificate.clone() },
            Proof::Normalize => Proof::Normalize,
            Proof::Hypothesis(i) => Proof::Hypothesis(*i),
            Proof::Forall { parameter, body } => Proof::Forall {
                parameter:parameter.clone(),body:Box::new(go(body,scope,b,d+1)?),
            },
            Proof::GeneralizedHypothesis { index, arguments } => Proof::GeneralizedHypothesis {
                index: *index,
                arguments: arguments
                    .iter()
                    .map(|(n, t)| Ok((n.clone(), s::open_scope(t, scope, b)?)))
                    .collect::<LangResult<_>>()?,
            },
            Proof::GeneralizedInduction {
                variable,
                generalize,
                names,
                base,
                step,
            } => Proof::GeneralizedInduction {
                variable: variable.clone(),
                generalize: generalize.clone(),
                names: names.clone(),
                base: Box::new(go(base, scope, b, d + 1)?),
                step: Box::new(go(step, scope, b, d + 1)?),
            },
            Proof::Sym(p) => Proof::Sym(Box::new(go(p, scope, b, d + 1)?)),
            Proof::Trans {
                middle,
                left,
                right,
            } => Proof::Trans {
                middle: s::open_scope(middle, scope, b)?,
                left: Box::new(go(left, scope, b, d + 1)?),
                right: Box::new(go(right, scope, b, d + 1)?),
            },
            Proof::Congruence(ps) => Proof::Congruence(
                ps.iter()
                    .map(|p| go(p, scope, b, d + 1))
                    .collect::<LangResult<_>>()?,
            ),
            Proof::Use {
                law,
                arguments,
                premises,
                types,
                assumptions,
            } => Proof::Use {
                law: law.clone(),
                arguments: arguments
                    .iter()
                    .map(|(n, t)| Ok((n.clone(), s::open_scope(t, scope, b)?)))
                    .collect::<LangResult<_>>()?,
                premises: premises
                    .iter()
                    .map(|p| go(p, scope, b, d + 1))
                    .collect::<LangResult<_>>()?,
                types: types.clone(),
                assumptions: assumptions
                    .iter()
                    .map(|p| go(p, scope, b, d + 1))
                    .collect::<LangResult<_>>()?,
            },
            Proof::Assume {
                index,
                arguments,
                premises,
            } => Proof::Assume {
                index: *index,
                arguments: arguments
                    .iter()
                    .map(|(n, t)| Ok((n.clone(), s::open_scope(t, scope, b)?)))
                    .collect::<LangResult<_>>()?,
                premises: premises
                    .iter()
                    .map(|p| go(p, scope, b, d + 1))
                    .collect::<LangResult<_>>()?,
            },
            Proof::Cases {
                condition,
                on_false,
                on_true,
            } => Proof::Cases {
                condition: s::open_scope(condition, scope, b)?,
                on_false: Box::new(go(on_false, scope, b, d + 1)?),
                on_true: Box::new(go(on_true, scope, b, d + 1)?),
            },
            Proof::Order { atoms, body } => Proof::Order {
                atoms: atoms
                    .iter()
                    .map(|t| s::open_scope(t, scope, b))
                    .collect::<LangResult<_>>()?,
                body: Box::new(go(body, scope, b, d + 1)?),
            },
            Proof::Induction {
                variable,
                names,
                base,
                step,
            } => Proof::Induction {
                variable: variable.clone(),
                names: names.clone(),
                base: Box::new(go(base, scope, b, d + 1)?),
                step: Box::new(go(step, scope, b, d + 1)?),
            },
            Proof::Variants {
                variable,
                names,
                first,
                second,
            } => Proof::Variants {
                variable: variable.clone(),
                names: names.clone(),
                first: Box::new(go(first, scope, b, d + 1)?),
                second: Box::new(go(second, scope, b, d + 1)?),
            },
            Proof::AssertEquality {
                equality,
                premise,
                body,
            } => Proof::AssertEquality {
                equality: eq(equality, b)?,
                premise: Box::new(go(premise, scope, b, d + 1)?),
                body: Box::new(go(body, scope, b, d + 1)?),
            },
        })
    }
    go(proof, scope, b, 0)
}
