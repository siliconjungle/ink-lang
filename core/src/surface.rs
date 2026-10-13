//! Bounded surface elaboration. Templates never enter executable core bytes.
use crate::{
    core::{Expr, Function, Program, Statement, Type},
    LangResult,
};
use sha2::{Digest, Sha256};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Default)]
pub struct SurfaceProgram {
    pub program: Program,
    pub aliases: BTreeMap<String, Type>,
    pub parameters: BTreeMap<String, Vec<String>>,
    pub applications: BTreeMap<String, (String, Vec<Type>)>,
    pub callback_types: BTreeMap<String, (Type, Type)>,
    pub payload_enums: BTreeMap<String, Vec<String>>,
    pub matches: BTreeMap<String, Vec<(String, String, Vec<String>)>>,
    pub constant_parameters: BTreeMap<String, BTreeSet<String>>,
    /// Source abstraction is an interface property, not a mathematical axiom.
    pub abstract_records: BTreeMap<String, String>,
    pub access_origins: BTreeMap<String, String>,
}

impl SurfaceProgram {
    pub fn mark_accesses(&mut self) -> LangResult<()> {
        self.mark_accesses_avoiding(&BTreeSet::new())
    }
    pub fn mark_accesses_avoiding(&mut self, names:&BTreeSet<String>) -> LangResult<()> {
        crate::abstraction::mark(&mut self.program, &mut self.access_origins, names)
    }
    pub fn elaborate(mut self) -> LangResult<Program> {
        // Parsed modules have already resolved their own lexical calls. This
        // also covers source-law tools that construct a surface program directly.
        crate::contracts::collections::resolve(&mut self.program)?;
        let occupied = surface_names(&self.program)?;
        let mut e = Elaborator {
            templates: self.program.clone(),
            aliases: self.aliases,
            parameters: self.parameters,
            applications: self.applications,
            output: self.program,
            instances: BTreeMap::new(),
            work: 100_000,
            locals: BTreeSet::new(),
            callback_types: self.callback_types,
            fresh: 0,
            local_types: BTreeMap::new(),
            payload_enums: self.payload_enums,
            matches: self.matches,
            instance_bases: BTreeMap::new(),
            constant_parameters: self.constant_parameters,
            arrays: BTreeMap::new(),
            occupied,
            abstract_records: self.abstract_records,
            access_origins: self.access_origins,
        };
        if e.parameters.len() + e.aliases.len() > 1024 {
            return Err("surface declaration limit exceeded".into());
        }
        fn callable(t: &Type, signatures: &BTreeMap<String, (Type, Type)>) -> bool {
            match t {
                Type::Named(n) => signatures.contains_key(n),
                Type::List(x) | Type::Buffer(x) | Type::Option(x) | Type::Vector(x, _) => {
                    callable(x, signatures)
                }
                Type::Map(a, b) | Type::Table(a, b) | Type::Result(a, b) => {
                    callable(a, signatures) || callable(b, signatures)
                }
                _ => false,
            }
        }
        if e.templates
            .functions
            .iter()
            .any(|f| callable(&f.result, &e.callback_types))
            || e.callback_types
                .values()
                .any(|(a, b)| callable(a, &e.callback_types) || callable(b, &e.callback_types))
        {
            return Err("function values cannot escape or contain callable values".into());
        }
        let reserved = [
            "u32",
            "u64",
            "i32",
            "f32",
            "Int",
            "Bool",
            "String",
            "Unit",
            "List",
            "Option",
            "Result",
            "Table",
            "Buffer",
            "Map",
            "Array",
            "Vec2",
            "Vec3",
            "Vec4",
            "ArithmeticError",
        ];
        for n in e.aliases.keys() {
            if reserved.contains(&n.as_str())
                || e.templates.records.contains_key(n)
                || e.templates.enums.contains_key(n)
                || e.templates.ids.contains(n)
                || e.templates.functions.iter().any(|f| &f.name == n)
                || e.templates.actions.iter().any(|a| &a.name == n)
                || e.templates
                    .states
                    .iter()
                    .chain(&e.templates.keeps)
                    .any(|d| &d.name == n)
                || e.templates.events.contains_key(n)
            {
                return Err(format!("duplicate or reserved alias {n}"));
            }
        }
        for (name, vars) in &e.parameters {
            let mut seen = BTreeSet::new();
            if vars.is_empty() || vars.len() > 16 || vars.iter().any(|n| !seen.insert(n)) {
                return Err(format!("invalid generic parameters for {name}"));
            }
            for n in vars {
                if reserved.contains(&n.as_str())
                    || e.aliases.contains_key(n)
                    || e.templates.records.contains_key(n)
                    || e.templates.enums.contains_key(n)
                    || e.templates.ids.contains(n)
                {
                    return Err(format!("generic parameter {n} shadows a type declaration"));
                }
            }
        }
        e.output.functions.retain(|f| {
            !e.parameters.contains_key(&f.name)
                && !f
                    .params
                    .iter()
                    .any(|(_, t)| matches!(t,Type::Named(n) if e.callback_types.contains_key(n)))
        });
        e.output.contracts.specifications.retain(|s|!e.parameters.contains_key(&s.name) && !s.params.iter().any(|(_,t)|matches!(t,Type::Named(n) if e.callback_types.contains_key(n))));
        e.output.contracts.implementations.retain(|i| e.output.contracts.specifications.iter().any(|s|s.name==i.specification));
        e.output
            .records
            .retain(|n, _| !e.parameters.contains_key(n));
        e.output.contracts.value_invariants.retain(|n, _| !e.parameters.contains_key(n));
        // Remove the output while walking to permit generated declarations.
        let mut p = std::mem::take(&mut e.output);
        let env = BTreeMap::new();
        // Resolve every ordinary signature before any body, so a surface
        // operation can inspect the declared result of a later helper.
        for f in &mut p.functions {
            for (_, t) in &mut f.params {
                *t = e.ty(t, &env, 0)?;
            }
            f.result = e.ty(&f.result, &env, 0)?;
            if let Some(original) = e
                .templates
                .functions
                .iter_mut()
                .find(|original| original.name == f.name)
            {
                original.params = f.params.clone();
                original.result = f.result.clone();
            }
        }
        for d in &mut p.states {
            d.ty=e.ty(&d.ty,&env,0)?;
            e.expr(&mut d.value,&env,0)?;
        }
        crate::contracts::cells::lower(&mut p)?;
        e.templates.states=p.states.clone(); e.templates.keeps=p.keeps.clone();
        for f in &mut p.functions {
            e.function(f, &env, 0)?;
        }
        for a in &mut p.actions {
            e.locals = a.params.iter().map(|(n, _)| n.clone()).collect();
            for (_, t) in &mut a.params {
                *t = e.ty(t, &env, 0)?;
            }
            a.result = e.ty(&a.result, &env, 0)?;
            e.local_types = a.params.iter().cloned().collect();
            e.block(&mut a.body, &env, 0)?;
        }
        for fs in p.records.values_mut() {
            for (_, t) in fs {
                *t = e.ty(t, &env, 0)?;
            }
        }
        e.locals.clear();
        e.local_types.clear();
        for d in p.states.iter_mut().chain(&mut p.keeps) {
            d.ty = e.ty(&d.ty, &env, 0)?;
            e.expr(&mut d.value, &env, 0)?;
        }
        for t in p.events.values_mut() {
            *t = e.ty(t, &env, 0)?;
        }
        for r in &mut p.rules {
            for (_, t) in &mut r.params {
                *t = e.ty(t, &env, 0)?;
            }
            e.locals = r.params.iter().map(|(n, _)| n.clone()).collect();
            e.local_types = r.params.iter().cloned().collect();
            e.expr(&mut r.from, &env, 0)?;
            e.expr(&mut r.to, &env, 0)?;
        }
        for spec in &mut p.contracts.specifications {
            for (_, t) in &mut spec.params { *t=e.ty(t,&env,0)?; }
            spec.result=e.ty(&spec.result,&env,0)?;
            e.locals=spec.params.iter().map(|(n,_)|n.clone()).collect();
            e.locals.insert("result".into());
            e.local_types=spec.params.iter().cloned().collect();
            e.local_types.insert("result".into(),spec.result.clone());
            for predicate in spec.requires.iter_mut().chain(&mut spec.ensures) { e.expr(predicate,&env,0)?; }
        }
        e.locals.clear(); e.local_types.clear();
        for predicate in &mut p.contracts.invariants { e.expr(predicate,&env,0)?; }
        for (name, predicate) in &mut p.contracts.value_invariants {
            e.locals = BTreeSet::from(["value".into()]);
            e.local_types = BTreeMap::from([("value".into(), Type::Named(name.clone()))]);
            e.expr(predicate, &env, 0)?;
        }
        e.locals.clear(); e.local_types.clear();
        // Unused non-generic aliases must also resolve, including cycles.
        let names: Vec<_> = e
            .aliases
            .keys()
            .filter(|n| !e.parameters.contains_key(*n))
            .cloned()
            .collect();
        let mut unused = vec![];
        for n in names {
            unused.push(e.ty(&Type::Named(n), &env, 0)?);
        }
        p.contracts.specifications.extend(e.output.contracts.specifications);
        p.contracts.implementations.extend(e.output.contracts.implementations);
        p.contracts.value_invariants.extend(e.output.contracts.value_invariants);
        p.functions.extend(e.output.functions);
        p.records.extend(e.output.records);
        for t in unused {
            match t {
                Type::Table(k, v) => {
                    crate::statecheck::validate_type(&k, &p)?;
                    crate::statecheck::validate_type(&v, &p)?;
                }
                _ => crate::statecheck::validate_type(&t, &p)?,
            }
        }
        for implementation in &mut p.contracts.implementations { implementation.body.clear(); }
        crate::abstraction::check_and_strip(&mut p, &e.abstract_records, &e.access_origins)?;
        crate::contracts::values::install(&mut p)?;
        crate::contracts::install_guards(&mut p)?;
        Ok(p)
    }
}

struct Elaborator {
    templates: Program,
    aliases: BTreeMap<String, Type>,
    parameters: BTreeMap<String, Vec<String>>,
    applications: BTreeMap<String, (String, Vec<Type>)>,
    output: Program,
    instances: BTreeMap<String, String>,
    work: usize,
    locals: BTreeSet<String>,
    callback_types: BTreeMap<String, (Type, Type)>,
    local_types: BTreeMap<String, Type>,
    fresh: usize,
    payload_enums: BTreeMap<String, Vec<String>>,
    matches: BTreeMap<String, Vec<(String, String, Vec<String>)>>,
    instance_bases: BTreeMap<String, String>,
    constant_parameters: BTreeMap<String, BTreeSet<String>>,
    arrays: BTreeMap<String, (Type, u32)>,
    occupied: BTreeSet<String>,
    abstract_records: BTreeMap<String, String>,
    access_origins: BTreeMap<String, String>,
}
impl Elaborator {
    fn fresh_prefix(&mut self) -> String {
        loop {
            let prefix = format!("__ink_surface_{}", self.fresh);
            self.fresh += 1;
            if self
                .occupied
                .iter()
                .any(|n| n == &prefix || n.starts_with(&format!("{prefix}_")))
            {
                continue;
            }
            self.occupied.insert(prefix.clone());
            return prefix;
        }
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        if depth > 64 || self.work == 0 {
            return Err("surface elaboration budget exceeded".into());
        }
        self.work -= 1;
        Ok(())
    }
    fn application(
        &mut self,
        key: &str,
        env: &BTreeMap<String, Type>,
        depth: usize,
        function: bool,
    ) -> LangResult<String> {
        self.step(depth)?;
        let (name, args) = self
            .applications
            .get(key)
            .ok_or("missing surface application")?
            .clone();
        let vars = self
            .parameters
            .get(&name)
            .ok_or_else(|| format!("{name} is not generic"))?
            .clone();
        if args.len() != vars.len() {
            return Err(format!("generic arity mismatch for {name}"));
        }
        let args = self.arguments(&name, &vars, &args, env, depth + 1)?;
        let bindings: BTreeMap<_, _> = vars.into_iter().zip(args.clone()).collect();
        let stamp = serde_json::to_vec(&(function, &name, &args)).map_err(|e| e.to_string())?;
        let instance = format!("__ink_instance_{:x}", Sha256::digest(&stamp));
        if self.instances.contains_key(&instance) {
            return Ok(instance);
        }
        if self.instances.len() >= 1024 {
            return Err("generic instance limit exceeded".into());
        }
        if self.templates.functions.iter().any(|f| f.name == instance)
            || self.templates.records.contains_key(&instance)
        {
            return Err("generated instance name collision".into());
        }
        if function {
            let mut f = self
                .templates
                .functions
                .iter()
                .find(|f| f.name == name)
                .ok_or("generic application is not a function")?
                .clone();
            // Reserve before walking recursive bodies. The ordinary termination
            // checker subsequently checks all specialised call edges.
            self.instances.insert(instance.clone(), instance.clone());
            f.name = instance.clone();
            self.function(&mut f, &bindings, depth + 1)?;
            self.output.functions.push(f);
            self.instance_contract(&name,&instance,&bindings,&args,depth+1)?;
        } else if let Some(fields) = self.templates.records.get(&name).cloned() {
            self.instances.insert(instance.clone(), instance.clone());
            self.instance_bases.insert(instance.clone(), name.clone());
            if let Some(owner)=self.abstract_records.get(&name).cloned() {
                self.abstract_records.insert(instance.clone(),owner);
            }
            let fields = fields
                .into_iter()
                .map(|(n, t)| Ok((n, self.ty(&t, &bindings, depth + 1)?)))
                .collect::<LangResult<Vec<_>>>()?;
            self.output.records.insert(instance.clone(), fields);
            if let Some(mut predicate) = self.templates.contracts.value_invariants.get(&name).cloned() {
                let locals = std::mem::replace(&mut self.locals, BTreeSet::from(["value".into()]));
                let types = std::mem::replace(&mut self.local_types,
                    BTreeMap::from([("value".into(), Type::Named(instance.clone()))]));
                self.expr(&mut predicate, &bindings, depth + 1)?;
                self.locals = locals; self.local_types = types;
                self.output.contracts.value_invariants.insert(instance.clone(), predicate);
            }
        } else if let Some(t) = self.aliases.get(&name).cloned() {
            // Alias instances return the canonical target, never a nominal type.
            let resolved = self.ty(&t, &bindings, depth + 1)?;
            let Type::Named(n) = resolved else {
                return Err("internal alias application in name context".into());
            };
            return Ok(n);
        } else {
            return Err("generic application is not a type".into());
        }
        Ok(instance)
    }
    fn instance_contract(&mut self,name:&str,instance:&str,bindings:&BTreeMap<String,Type>,args:&[Type],depth:usize)->LangResult<()> {
        if let Some(mut spec)=self.templates.contracts.specifications.iter().find(|s|s.name==name).cloned(){
            if spec.kind.is_some(){return Err("generic action specifications require concrete signatures".into());}
            spec.name=instance.into();
            for (_,t) in &mut spec.params{*t=self.ty(t,bindings,depth+1)?;}
            spec.result=self.ty(&spec.result,bindings,depth+1)?;
            let outer=std::mem::replace(&mut self.locals,spec.params.iter().map(|(n,_)|n.clone()).chain(std::iter::once("result".into())).collect());
            let outer_types=std::mem::replace(&mut self.local_types,spec.params.iter().cloned().chain(std::iter::once(("result".into(),spec.result.clone()))).collect());
            for e in spec.requires.iter_mut().chain(&mut spec.ensures){self.expr(e,bindings,depth+1)?;}
            self.locals=outer;self.local_types=outer_types;
            self.output.contracts.specifications.push(spec);
            let implementations=self.templates.contracts.implementations.iter().filter(|i|i.specification==name).cloned().collect::<Vec<_>>();
            for mut i in implementations {
                let key=self.fresh_prefix();self.applications.insert(key.clone(),(i.name.clone(),args.to_vec()));
                i.name=self.application(&key,&BTreeMap::new(),depth+1,true)?;
                i.specification=instance.into();i.body.clear();
                self.output.contracts.implementations.push(i);
            }
        } else if let Some(owner)=self.templates.contracts.implementations.iter().find(|i|i.name==name).map(|i|i.specification.clone()){
            let key=self.fresh_prefix();self.applications.insert(key.clone(),(owner,args.to_vec()));
            self.application(&key,&BTreeMap::new(),depth+1,true)?;
        }
        Ok(())
    }
    fn ty(&mut self, t: &Type, env: &BTreeMap<String, Type>, depth: usize) -> LangResult<Type> {
        self.step(depth)?;
        Ok(match t {
            Type::Named(n) if self.callback_types.contains_key(n) => {
                return Err("function values are restricted to nonescaping pure parameters".into())
            }
            Type::Named(n) if env.contains_key(n) => env[n].clone(),
            Type::Named(n) if self.applications.contains_key(n) => {
                let (base, args) = self.applications[n].clone();
                if base == "Array" {
                    return Ok(Type::Named(self.array(&args, env, depth + 1)?));
                }
                if let Some(alias) = self.aliases.get(&base).cloned() {
                    let vars = self
                        .parameters
                        .get(&base)
                        .ok_or("alias is not generic")?
                        .clone();
                    if vars.len() != args.len() {
                        return Err("generic alias arity mismatch".into());
                    }
                    let args = self.arguments(&base, &vars, &args, env, depth + 1)?;
                    let bindings = vars.into_iter().zip(args).collect();
                    self.ty(&alias, &bindings, depth + 1)?
                } else {
                    Type::Named(self.application(n, env, depth + 1, false)?)
                }
            }
            Type::Named(n) if self.aliases.contains_key(n) => {
                if self.parameters.contains_key(n) {
                    return Err(format!("generic alias {n} requires type arguments"));
                }
                self.ty(&self.aliases[n].clone(), env, depth + 1)?
            }
            Type::Named(n) if self.parameters.contains_key(n) => {
                return Err(format!("generic type {n} requires type arguments"))
            }
            Type::List(x) => Type::List(Box::new(self.ty(x, env, depth + 1)?)),
            Type::Buffer(x) => Type::Buffer(Box::new(self.ty(x, env, depth + 1)?)),
            Type::Option(x) => Type::Option(Box::new(self.ty(x, env, depth + 1)?)),
            Type::Vector(x, n) => Type::Vector(Box::new(self.ty(x, env, depth + 1)?), *n),
            Type::Result(a, b) => Type::Result(
                Box::new(self.ty(a, env, depth + 1)?),
                Box::new(self.ty(b, env, depth + 1)?),
            ),
            Type::Map(a, b) => Type::Map(
                Box::new(self.ty(a, env, depth + 1)?),
                Box::new(self.ty(b, env, depth + 1)?),
            ),
            Type::Table(a, b) => Type::Table(
                Box::new(self.ty(a, env, depth + 1)?),
                Box::new(self.ty(b, env, depth + 1)?),
            ),
            _ => t.clone(),
        })
    }
    fn function(
        &mut self,
        f: &mut Function,
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<()> {
        let outer = std::mem::replace(
            &mut self.locals,
            f.params.iter().map(|(n, _)| n.clone()).collect(),
        );
        for (_, t) in &mut f.params {
            *t = self.ty(t, env, depth + 1)?;
        }
        f.result = self.ty(&f.result, env, depth + 1)?;
        let outer_types =
            std::mem::replace(&mut self.local_types, f.params.iter().cloned().collect());
        let result = self.expr(&mut f.body, env, depth + 1);
        self.locals = outer;
        self.local_types = outer_types;
        result
    }
    fn expr(&mut self, e: &mut Expr, env: &BTreeMap<String, Type>, depth: usize) -> LangResult<()> {
        // Provenance wrappers have no computation or binder use. Preserve them
        // through specialisation without changing the ordinary elaboration's
        // fresh-name sequence or exposing them as executable declarations.
        if let Expr::Let(name,_,_,body)=e {
            if self.access_origins.contains_key(name) {
                return self.expr(body,env,depth);
            }
        }
        self.step(depth)?;
        let shadowed=matches!(e,Expr::Call(n,_) if self.locals.contains(n)||self.templates.functions.iter().any(|f|&f.name==n));
        if let Some(lowered) = if shadowed { None } else { crate::contracts::collections::lower(e, &self.fresh_prefix())? } {
            *e=lowered;
            return self.expr(e,env,depth+1);
        }
        match e {
            Expr::Var(n) if env.get(n).and_then(constant).is_some() => {
                *e = Expr::Num(constant(&env[n]).unwrap() as u64);
            }
            Expr::Call(n, args) => {
                if self.matches.contains_key(n) {
                    *e = self.elaborate_match(n, args, env, depth + 1)?;
                    return self.expr(e, env, depth + 1);
                }
                let base = self.applications.get(n).map(|(n, _)| n).unwrap_or(n);
                if base == "array" {
                    let (_, types) = self
                        .applications
                        .get(n)
                        .ok_or("array needs explicit element type and length")?
                        .clone();
                    let target = self.array(&types, env, depth + 1)?;
                    let (_, length) = self.arrays[&target].clone();
                    let items = if args.len() == 1 {
                        if let Expr::Call(n, items) = &args[0] {
                            if n == "list" {
                                items.clone()
                            } else {
                                args.clone()
                            }
                        } else {
                            args.clone()
                        }
                    } else {
                        args.clone()
                    };
                    if items.len() != length as usize {
                        return Err("fixed array constructor length mismatch".into());
                    }
                    *e = Expr::Record(
                        target,
                        items
                            .into_iter()
                            .enumerate()
                            .map(|(i, x)| (format!("item{i}"), x))
                            .collect(),
                    );
                    return self.expr(e, env, depth + 1);
                }
                if self.templates.functions.iter().any(|f|&f.name==base && f.params.iter().any(|(_,t)|matches!(t,Type::Named(n) if self.callback_types.contains_key(n)))) {
                    for a in args.iter_mut() {self.expr(a,env,depth+1)?;}
                    *e=self.inline_callback_call(n,args,env,depth+1)?;
                    return self.expr(e,env,depth+1);
                }
                if self.applications.contains_key(n) {
                    *n = self.application(n, env, depth + 1, true)?;
                } else if self.parameters.contains_key(n) {
                    return Err(format!(
                        "generic function {n} requires explicit type arguments"
                    ));
                }
                for a in args {
                    self.expr(a, env, depth + 1)?;
                }
            }
            Expr::Record(n, fs) => {
                if let Type::Named(target) = self.ty(&Type::Named(n.clone()), env, depth + 1)? {
                    *n = target;
                } else {
                    return Err("record constructor requires a record type".into());
                }
                for (_, a) in fs {
                    self.expr(a, env, depth + 1)?;
                }
            }
            Expr::Field(x, variant) => {
                if let Expr::Var(n) = x.as_ref() {
                    let target = if !self.locals.contains(n) {
                        match self.ty(&Type::Named(n.clone()), env, depth + 1)? {
                            Type::Named(n) => Some(n),
                            _ => None,
                        }
                    } else {
                        None
                    };
                    let base = target
                        .as_ref()
                        .map(|n| self.instance_bases.get(n).unwrap_or(n));
                    if base.is_some_and(|base| self.payload_enums.contains_key(base)) {
                        *e = self.payload_constructor(
                            target.as_ref().unwrap(),
                            variant,
                            &[],
                            env,
                            depth + 1,
                        )?;
                        return self.expr(e, env, depth + 1);
                    }
                }
                if let Expr::Var(n) = x.as_mut() {
                    if !self.locals.contains(n) && self.aliases.contains_key(n) {
                        if let Type::Named(target) =
                            self.ty(&Type::Named(n.clone()), env, depth + 1)?
                        {
                            *n = target;
                        }
                    }
                }
                self.expr(x, env, depth + 1)?;
            }
            Expr::Let(n, t, a, b) => {
                if let Some(t) = t {
                    **t = self.ty(t, env, depth + 1)?;
                }
                self.expr(a, env, depth + 1)?;
                let resolved = t.as_ref().map(|t| t.as_ref().clone()).or_else(|| {
                    let mut p = self.templates.clone();
                    p.functions.extend(self.output.functions.clone());
                    p.records.extend(self.output.records.clone());
                    crate::check::infer(a, &self.local_types, &p).ok()
                });
                let old_type = resolved.and_then(|t| self.local_types.insert(n.clone(), t));
                let previous = self.locals.insert(n.clone());
                self.expr(b, env, depth + 1)?;
                if previous {
                    self.locals.remove(n);
                }
                if let Some(t) = old_type {
                    self.local_types.insert(n.clone(), t);
                } else {
                    self.local_types.remove(n);
                }
            }
            Expr::Lambda(n, x) => {
                let previous = self.locals.insert(n.clone());
                self.expr(x, env, depth + 1)?;
                if previous {
                    self.locals.remove(n);
                }
            }
            Expr::Neg(x) | Expr::Try(x) => self.expr(x, env, depth + 1)?,
            Expr::Binary(_, a, b) => {
                self.expr(a, env, depth + 1)?;
                self.expr(b, env, depth + 1)?;
            }
            Expr::Method(x, variant, args) => {
                if let Expr::Var(n) = x.as_ref() {
                    let target = if !self.locals.contains(n) {
                        match self.ty(&Type::Named(n.clone()), env, depth + 1)? {
                            Type::Named(n) => Some(n),
                            _ => None,
                        }
                    } else {
                        None
                    };
                    let base = target
                        .as_ref()
                        .map(|n| self.instance_bases.get(n).unwrap_or(n));
                    if base.is_some_and(|base| self.payload_enums.contains_key(base)) {
                        *e = self.payload_constructor(
                            target.as_ref().unwrap(),
                            variant,
                            args,
                            env,
                            depth + 1,
                        )?;
                        return self.expr(e, env, depth + 1);
                    }
                }
                self.expr(x, env, depth + 1)?;
                for a in args.iter_mut() {
                    self.expr(a, env, depth + 1)?;
                }
                if let Ok(Type::Named(target)) =
                    crate::check::infer(x, &self.local_types, &self.program_context())
                {
                    if let Some((element, length)) = self.arrays.get(&target).cloned() {
                        let binder = self.fresh_prefix();
                        let fields: Vec<Expr> = (0..length)
                            .map(|i| {
                                Expr::Field(Box::new(Expr::Var(binder.clone())), format!("item{i}"))
                            })
                            .collect();
                        let body=match variant.as_str() {
                            "len" if args.is_empty()=>Expr::Let(format!("{binder}_length"),Some(Box::new(Type::U32)),Box::new(Expr::Num(length as u64)),Box::new(Expr::Var(format!("{binder}_length")))),
                            "values" if args.is_empty()=>Expr::Let(format!("{binder}_items"),Some(Box::new(Type::List(Box::new(element.clone())))),Box::new(Expr::Call("list".into(),fields)),Box::new(Expr::Var(format!("{binder}_items")))),
                            "at_or" if args.len()==2=>Expr::Method(Box::new(Expr::Let(format!("{binder}_items"),Some(Box::new(Type::List(Box::new(element.clone())))),Box::new(Expr::Call("list".into(),fields)),Box::new(Expr::Var(format!("{binder}_items"))))),"at_or".into(),args.clone()),
                            "with" if args.len()==2=>{
                                let index=format!("{binder}_index");let value=format!("{binder}_replacement");
                                let fields=fields.into_iter().enumerate().map(|(i,old)|(format!("item{i}"),Expr::Call("choose".into(),vec![Expr::Binary("==".into(),Box::new(Expr::Var(index.clone())),Box::new(Expr::Num(i as u64))),Expr::Var(value.clone()),old]))).collect();
                                Expr::Let(index,Some(Box::new(Type::U32)),Box::new(args[0].clone()),Box::new(Expr::Let(value,Some(Box::new(element)),Box::new(args[1].clone()),Box::new(Expr::Record(target.clone(),fields)))))
                            },
                            _=>return Err("array supports len(), values(), at_or(index,fallback), with(index,value)".into()),
                        };
                        *e = Expr::Let(
                            binder,
                            Some(Box::new(Type::Named(target))),
                            x.clone(),
                            Box::new(body),
                        );
                        return self.expr(e, env, depth + 1);
                    }
                }
            }
            _ => (),
        }
        Ok(())
    }
    fn program_context(&self) -> Program {
        let mut p = self.templates.clone();
        p.functions.extend(self.output.functions.clone());
        p.records.extend(self.output.records.clone());
        p
    }
    fn arguments(
        &mut self,
        name: &str,
        vars: &[String],
        args: &[Type],
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<Vec<Type>> {
        if vars.len() != args.len() {
            return Err("generic argument count mismatch".into());
        }
        let kinds = self
            .constant_parameters
            .get(name)
            .cloned()
            .unwrap_or_default();
        vars.iter()
            .zip(args)
            .map(|(var, t)| {
                let t = if let Type::Named(n) = t {
                    env.get(n).unwrap_or(t).clone()
                } else {
                    t.clone()
                };
                if kinds.contains(var) {
                    if constant(&t).is_none() {
                        return Err("constant parameter requires a literal u32 argument".into());
                    }
                    Ok(t)
                } else {
                    if constant(&t).is_some() {
                        return Err("type parameter cannot receive a constant".into());
                    }
                    self.ty(&t, env, depth + 1)
                }
            })
            .collect()
    }
    fn array(
        &mut self,
        args: &[Type],
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<String> {
        self.step(depth)?;
        if args.len() != 2 {
            return Err("Array requires element type and constant length".into());
        }
        let element = self.ty(&args[0], env, depth + 1)?;
        if crate::local_collections::owned(&element, &self.program_context()) {
            return Err("immutable arrays cannot own temporary storage".into());
        }
        let n = if let Type::Named(name) = &args[1] {
            env.get(name).unwrap_or(&args[1])
        } else {
            &args[1]
        };
        let n = constant(n).ok_or("Array length requires a constant u32")?;
        if n > 64 {
            return Err("fixed array capacity exceeds 64 elements".into());
        }
        let name = format!(
            "__ink_array_{:x}",
            Sha256::digest(serde_json::to_vec(&(&element, n)).map_err(|e| e.to_string())?)
        );
        if !self.arrays.contains_key(&name) {
            self.work = self
                .work
                .checked_sub(n as usize + 1)
                .ok_or("array elaboration budget exceeded")?;
            if self.templates.records.contains_key(&name) {
                return Err("generated array name collision".into());
            }
            self.output.records.insert(
                name.clone(),
                (0..n)
                    .map(|i| (format!("item{i}"), element.clone()))
                    .collect(),
            );
            self.arrays.insert(name.clone(), (element, n));
        }
        Ok(name)
    }
    fn payload_constructor(
        &mut self,
        name: &str,
        variant: &str,
        args: &[Expr],
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        let Type::Named(target) = self.ty(&Type::Named(name.into()), env, depth + 1)? else {
            return Err("payload enum type".into());
        };
        let base = self.instance_bases.get(&target).unwrap_or(&target);
        let variants = self
            .payload_enums
            .get(base)
            .ok_or("unknown payload enum")?
            .clone();
        let index = variants
            .iter()
            .position(|v| v == variant)
            .ok_or("unknown payload variant")?;
        let p = self.program_context();
        let mut sum = &p.records[&target][0].1;
        for _ in 0..index {
            let Type::Result(_, b) = sum else {
                return Err("payload enum encoding".into());
            };
            sum = b;
        }
        let t = if index + 1 == variants.len() {
            sum
        } else {
            let Type::Result(a, _) = sum else {
                return Err("payload enum encoding".into());
            };
            a
        };
        let Type::Named(payload) = t else {
            return Err("payload record encoding".into());
        };
        let fields = &p.records[payload];
        if fields.len() != args.len() {
            return Err("payload constructor argument count mismatch".into());
        }
        let mut value = Expr::Record(
            payload.clone(),
            fields
                .iter()
                .zip(args)
                .map(|((n, _), a)| (n.clone(), a.clone()))
                .collect(),
        );
        if index + 1 != variants.len() {
            value = Expr::Call("Ok".into(), vec![value]);
        }
        for _ in 0..index {
            value = Expr::Call("Err".into(), vec![value]);
        }
        Ok(Expr::Record(target, vec![("payload".into(), value)]))
    }
    fn elaborate_match(
        &mut self,
        name: &str,
        args: &[Expr],
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        let arms = self.matches[name].clone();
        if args.len() != arms.len() + 1 {
            return Err("match image arity".into());
        }
        let mut input = args[0].clone();
        self.expr(&mut input, env, depth + 1)?;
        let p = self.program_context();
        let input_type = crate::check::infer(&input, &self.local_types, &p)?;
        let (root, variants, payload) = match &input_type {
            Type::Named(n)
                if self
                    .payload_enums
                    .contains_key(self.instance_bases.get(n).unwrap_or(n)) =>
            {
                let base = self.instance_bases.get(n).unwrap_or(n).clone();
                (base.clone(), self.payload_enums[&base].clone(), true)
            }
            Type::Named(n) if p.enums.contains_key(n) => (n.clone(), p.enums[n].clone(), false),
            Type::Option(_) => (String::new(), vec!["Some".into(), "None".into()], true),
            Type::Result(..) => (String::new(), vec!["Ok".into(), "Err".into()], true),
            Type::Bool => (String::new(), vec!["true".into(), "false".into()], false),
            _ => return Err("match requires an enum, Option, Result or Bool".into()),
        };
        let mut ordered = BTreeMap::new();
        for ((arm_root, variant, binders), body) in arms.iter().zip(&args[1..]) {
            let mut arm_root = arm_root.clone();
            for _ in 0..64 {
                if let Some(Type::Named(alias)) = self.aliases.get(&arm_root) {
                    arm_root = self
                        .applications
                        .get(alias)
                        .map(|(base, _)| base)
                        .unwrap_or(alias)
                        .clone();
                } else {
                    break;
                }
            }
            if arm_root != root
                || !variants.contains(variant)
                || ordered
                    .insert(variant.clone(), (binders.len(), body.clone()))
                    .is_some()
            {
                return Err("unknown or duplicate match arm".into());
            }
        }
        if ordered.len() != variants.len() {
            return Err("match must exhaustively cover every variant".into());
        }
        let binder = self.fresh_prefix();
        let variable = Expr::Var(binder.clone());
        fn peel(count: usize, body: &Expr) -> LangResult<(Vec<String>, Expr)> {
            let mut b = body;
            let mut ns = vec![];
            for _ in 0..count {
                let Expr::Lambda(n, x) = b else {
                    return Err("match pattern binder image".into());
                };
                ns.push(n.clone());
                b = x;
            }
            Ok((ns, b.clone()))
        }
        let mut branches = vec![];
        let sum = if root.is_empty() {
            input_type.clone()
        } else if payload {
            p.records[match &input_type {
                Type::Named(n) => n,
                _ => unreachable!(),
            }][0]
                .1
                .clone()
        } else {
            input_type.clone()
        };
        let mut current = sum.clone();
        for (i, variant) in variants.iter().enumerate() {
            let (count, expression) = &ordered[variant];
            let (names, mut body) = peel(*count, expression)?;
            let parameter = self.fresh_prefix();
            let ty = if root.is_empty() {
                match &input_type {
                    Type::Option(t) if i == 0 => *t.clone(),
                    Type::Option(_) => Type::Unit,
                    Type::Result(a, _) if i == 0 => *a.clone(),
                    Type::Result(_, b) => *b.clone(),
                    _ => input_type.clone(),
                }
            } else if payload {
                if i + 1 == variants.len() {
                    current.clone()
                } else {
                    let Type::Result(a, b) = &current else {
                        return Err("match payload encoding".into());
                    };
                    let t = *a.clone();
                    current = *b.clone();
                    t
                }
            } else {
                Type::Unit
            };
            if !root.is_empty() && payload {
                let Type::Named(n) = &ty else {
                    return Err("match payload record".into());
                };
                let fields = &p.records[n];
                if fields.len() != names.len() {
                    return Err("match payload binder count mismatch".into());
                }
                for (n, (field, t)) in names.iter().zip(fields).rev() {
                    body = Expr::Let(
                        n.clone(),
                        Some(Box::new(t.clone())),
                        Box::new(Expr::Field(
                            Box::new(Expr::Var(parameter.clone())),
                            field.clone(),
                        )),
                        Box::new(body),
                    );
                }
            } else if root.is_empty() && payload {
                let expected = if variants[i] == "None" { 0 } else { 1 };
                if names.len() != expected {
                    return Err("match variant binder count mismatch".into());
                }
                if let Some(n) = names.first() {
                    body = Expr::Let(
                        n.clone(),
                        Some(Box::new(ty)),
                        Box::new(Expr::Var(parameter.clone())),
                        Box::new(body),
                    );
                }
            } else if !names.is_empty() {
                return Err("nonpayload match arms cannot bind values".into());
            }
            branches.push((parameter, body));
        }
        let body = if payload {
            let mut input = if root.is_empty() {
                variable
            } else {
                Expr::Field(Box::new(variable), "payload".into())
            };
            if root.is_empty() {
                Expr::Method(
                    Box::new(input),
                    "fold".into(),
                    branches
                        .into_iter()
                        .map(|(n, b)| Expr::Lambda(n, Box::new(b)))
                        .collect(),
                )
            } else {
                fn chain(value: Expr, branches: &[(String, Expr)]) -> Expr {
                    let (n, b) = &branches[0];
                    if branches.len() == 1 {
                        return Expr::Let(n.clone(), None, Box::new(value), Box::new(b.clone()));
                    }
                    let rest = format!("{n}_rest");
                    Expr::Method(
                        Box::new(value),
                        "fold".into(),
                        vec![
                            Expr::Lambda(n.clone(), Box::new(b.clone())),
                            Expr::Lambda(
                                rest.clone(),
                                Box::new(chain(Expr::Var(rest), &branches[1..])),
                            ),
                        ],
                    )
                }
                input = chain(input, &branches);
                input
            }
        } else {
            let mut body = branches.last().unwrap().1.clone();
            for (i, (_, branch)) in branches[..branches.len() - 1].iter().enumerate().rev() {
                let tag = if root.is_empty() {
                    Expr::Bool(i == 0)
                } else {
                    Expr::Field(Box::new(Expr::Var(root.clone())), variants[i].clone())
                };
                body = Expr::Call(
                    "choose".into(),
                    vec![
                        Expr::Binary("==".into(), Box::new(variable.clone()), Box::new(tag)),
                        branch.clone(),
                        body,
                    ],
                );
            }
            body
        };
        Ok(Expr::Let(
            binder,
            Some(Box::new(input_type)),
            Box::new(input),
            Box::new(body),
        ))
    }
    fn inline_callback_call(&mut self,key:&str,args:&[Expr],env:&BTreeMap<String,Type>,depth:usize)->LangResult<Expr> {
        let (name,type_args)=self.applications.get(key).cloned().unwrap_or((key.into(),vec![]));
        let owner=self.templates.contracts.implementations.iter().find(|i|i.name==name).map(|i|i.specification.clone()).unwrap_or(name.clone());
        let Some(spec)=self.templates.contracts.specifications.iter().find(|s|s.name==owner).cloned() else{return self.inline_callback_call_raw(key,args,env,depth);};
        let prefix=self.fresh_prefix();let target=format!("{prefix}_spec");
        let vars=self.parameters.get(&owner).cloned().unwrap_or_default();
        let types=self.arguments(&owner,&vars,&type_args,env,depth+1)?;
        let bindings=vars.into_iter().zip(types).collect();
        let result=self.ty(&spec.result,&bindings,depth+1)?;
        let mut free=BTreeSet::new();for a in args{free.extend(free_variables(a,&BTreeSet::new()));}
        let params=self.local_types.iter().filter(|(n,_)|free.contains(*n)).map(|(n,t)|(n.clone(),t.clone())).collect::<Vec<_>>();
        let mut requires=vec![];let mut ensures=vec![];
        for (post,clauses) in [(false,&spec.requires),(true,&spec.ensures)] {
            for clause in clauses {
                let helper=self.fresh_prefix();let mut ps=spec.params.clone();let mut actual=args.to_vec();
                if post{ps.push(("result".into(),spec.result.clone()));actual.push(Expr::Var("result".into()));}
                self.templates.functions.push(Function{name:helper.clone(),params:ps,result:Type::Bool,body:clause.clone()});
                if let Some(vars)=self.parameters.get(&owner).cloned(){self.parameters.insert(helper.clone(),vars);}
                if let Some(cs)=self.constant_parameters.get(&owner).cloned(){self.constant_parameters.insert(helper.clone(),cs);}
                let helper_key=self.fresh_prefix();self.applications.insert(helper_key.clone(),(helper.clone(),type_args.clone()));
                let old=self.local_types.insert("result".into(),result.clone());
                let value=self.inline_callback_call_raw(&helper_key,&actual,env,depth+1)?;
                if let Some(t)=old{self.local_types.insert("result".into(),t);}else{self.local_types.remove("result");}
                self.templates.functions.retain(|f|f.name!=helper);self.parameters.remove(&helper);self.constant_parameters.remove(&helper);
                if post{ensures.push(value)}else{requires.push(value)}
            }
        }
        self.output.contracts.specifications.push(crate::contracts::Specification{name:target.clone(),kind:None,params:params.clone(),result:result.clone(),reads:vec![],writes:vec![],emits:vec![],requires,ensures});
        let candidates=self.templates.contracts.implementations.iter().filter(|i|i.specification==owner).map(|i|i.name.clone()).collect::<Vec<_>>();
        let mut selected=target.clone();
        for (index,candidate) in std::iter::once(owner.clone()).chain(candidates).enumerate(){
            let candidate_key=self.fresh_prefix();self.applications.insert(candidate_key.clone(),(candidate.clone(),type_args.clone()));
            let body=self.inline_callback_call_raw(&candidate_key,args,env,depth+1)?;
            let concrete=if index==0{target.clone()}else{format!("{prefix}_impl{index}")};
            if candidate==name{selected=concrete.clone();}
            self.output.functions.push(Function{name:concrete.clone(),params:params.clone(),result:result.clone(),body});
            if index>0{self.output.contracts.implementations.push(crate::contracts::Implementation{name:concrete,specification:target.clone(),body:vec![]});}
        }
        Ok(Expr::Call(selected,params.iter().map(|(n,_)|Expr::Var(n.clone())).collect()))
    }
    fn inline_callback_call_raw(
        &mut self,
        key: &str,
        args: &[Expr],
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<Expr> {
        self.step(depth)?;
        let (name, type_args) = self
            .applications
            .get(key)
            .cloned()
            .unwrap_or((key.into(), vec![]));
        let vars = self.parameters.get(&name).cloned().unwrap_or_default();
        if vars.len() != type_args.len() {
            return Err("callback template requires explicit matching type arguments".into());
        }
        let types = self.arguments(&name, &vars, &type_args, env, depth + 1)?;
        let bindings: BTreeMap<_, _> = vars.into_iter().zip(types).collect();
        let f = self
            .templates
            .functions
            .iter()
            .find(|f| f.name == name)
            .ok_or("missing callback function")?
            .clone();
        if args.len() != f.params.len() {
            return Err("callback argument count mismatch".into());
        }
        let prefix = self.fresh_prefix();
        let mut names: BTreeMap<String, String> = f
            .params
            .iter()
            .enumerate()
            .map(|(i, (n, _))| (n.clone(), format!("{prefix}_p{i}")))
            .collect();
        let mut serial = 0;
        let mut body = hygienic(&f.body, &mut names, &prefix, &mut serial, &self.access_origins);
        let mut values = vec![];
        let mut callbacks = BTreeMap::new();
        for (i, ((_, t), arg)) in f.params.iter().zip(args).enumerate() {
            let parameter = format!("{prefix}_p{i}");
            if let Type::Named(n) = t {
                if let Some((input, output)) = self.callback_types.get(n).cloned() {
                    let input = self.ty(&input, &bindings, depth + 1)?;
                    let output = self.ty(&output, &bindings, depth + 1)?;
                    let lambda = match arg {
                        Expr::Lambda(n, b) => {
                            for capture in free_variables(b, &[n.clone()].into_iter().collect()) {
                                if self.local_types.get(&capture).is_some_and(|t| {
                                    crate::local_collections::owned(t, &self.templates)
                                }) {
                                    return Err(
                                        "callbacks cannot capture owned temporary storage".into()
                                    );
                                }
                            }
                            arg.clone()
                        }
                        Expr::Var(n) if self.templates.functions.iter().any(|f| f.name == *n) => {
                            Expr::Lambda(
                                format!("{prefix}_argument"),
                                Box::new(Expr::Call(
                                    n.clone(),
                                    vec![Expr::Var(format!("{prefix}_argument"))],
                                )),
                            )
                        }
                        _ => {
                            return Err(
                                "callback requires a literal pure lambda or named pure function"
                                    .into(),
                            )
                        }
                    };
                    let Expr::Lambda(n, body) = &lambda else {
                        unreachable!()
                    };
                    let mut types = self.local_types.clone();
                    types.insert(n.clone(), input.clone());
                    crate::check::infer_as(body, &types, &self.program_context(), &output)?;
                    callbacks.insert(parameter, (input, output, lambda));
                    continue;
                }
            }
            values.push((parameter, self.ty(t, &bindings, depth + 1)?, arg.clone()));
        }
        substitute_callbacks(&mut body, &callbacks, &prefix, &mut serial)?;
        // Annotating the result prevents callback specialisation from weakening
        // the declared signature. All generated code receives ordinary checks.
        let result = self.ty(&f.result, &bindings, depth + 1)?;
        let n = format!("{prefix}_result");
        body = Expr::Let(
            n.clone(),
            Some(Box::new(result)),
            Box::new(body),
            Box::new(Expr::Var(n)),
        );
        for (n, t, a) in values.into_iter().rev() {
            body = Expr::Let(n, Some(Box::new(t)), Box::new(a), Box::new(body));
        }
        // Resolve template annotations before entering the caller environment.
        self.expr(&mut body, &bindings, depth + 1)?;
        Ok(body)
    }
    fn block(
        &mut self,
        body: &mut [Statement],
        env: &BTreeMap<String, Type>,
        depth: usize,
    ) -> LangResult<()> {
        self.step(depth)?;
        let outer = self.locals.clone();
        let outer_types = self.local_types.clone();
        for s in body {
            match s {
                Statement::Let(n, t, e) => {
                    if let Some(t) = t {
                        *t = self.ty(t, env, depth + 1)?;
                    }
                    self.expr(e, env, depth + 1)?;
                    self.locals.insert(n.clone());
                    if let Some(t) = t.clone().or_else(|| {
                        crate::check::infer(e, &self.local_types, &self.program_context()).ok()
                    }) {
                        self.local_types.insert(n.clone(), t);
                    }
                }
                Statement::Return(e) | Statement::Emit(_, e) | Statement::Expr(e) => {
                    self.expr(e, env, depth + 1)?
                }
                Statement::If(c, a, b) => {
                    self.expr(c, env, depth + 1)?;
                    self.block(a, env, depth + 1)?;
                    self.block(b, env, depth + 1)?;
                }
            }
        }
        self.locals = outer;
        self.local_types = outer_types;
        Ok(())
    }
}

fn hygienic(
    e: &Expr,
    names: &mut BTreeMap<String, String>,
    prefix: &str,
    serial: &mut usize,
    origins: &BTreeMap<String,String>,
) -> Expr {
    if let Expr::Let(name,annotation,initial,body)=e {
        if origins.contains_key(name) {
            return Expr::Let(name.clone(),annotation.clone(),
                Box::new(hygienic(initial,names,prefix,serial,origins)),
                Box::new(hygienic(body,names,prefix,serial,origins)));
        }
    }
    let rename = |n: &String, names: &BTreeMap<String, String>| names.get(n).unwrap_or(n).clone();
    match e {
        Expr::Var(n) => Expr::Var(rename(n, names)),
        Expr::Call(n, a) => Expr::Call(
            rename(n, names),
            a.iter()
                .map(|a| hygienic(a, names, prefix, serial, origins))
                .collect(),
        ),
        Expr::Let(n, t, a, b) => {
            let a = hygienic(a, names, prefix, serial, origins);
            let mut local = names.clone();
            let fresh = format!("{prefix}_v{}", *serial);
            *serial += 1;
            local.insert(n.clone(), fresh.clone());
            Expr::Let(
                fresh,
                t.clone(),
                Box::new(a),
                Box::new(hygienic(b, &mut local, prefix, serial, origins)),
            )
        }
        Expr::Lambda(n, b) => {
            let mut local = names.clone();
            let fresh = format!("{prefix}_v{}", *serial);
            *serial += 1;
            local.insert(n.clone(), fresh.clone());
            Expr::Lambda(fresh, Box::new(hygienic(b, &mut local, prefix, serial, origins)))
        }
        Expr::Neg(x) => Expr::Neg(Box::new(hygienic(x, names, prefix, serial, origins))),
        Expr::Try(x) => Expr::Try(Box::new(hygienic(x, names, prefix, serial, origins))),
        Expr::Field(x, n) => Expr::Field(Box::new(hygienic(x, names, prefix, serial, origins)), n.clone()),
        Expr::Method(x, n, a) => Expr::Method(
            Box::new(hygienic(x, names, prefix, serial, origins)),
            n.clone(),
            a.iter()
                .map(|a| hygienic(a, names, prefix, serial, origins))
                .collect(),
        ),
        Expr::Binary(n, a, b) => Expr::Binary(
            n.clone(),
            Box::new(hygienic(a, names, prefix, serial, origins)),
            Box::new(hygienic(b, names, prefix, serial, origins)),
        ),
        Expr::Record(n, fs) => Expr::Record(
            n.clone(),
            fs.iter()
                .map(|(n, a)| (n.clone(), hygienic(a, names, prefix, serial, origins)))
                .collect(),
        ),
        _ => e.clone(),
    }
}
fn free_variables(e: &Expr, bound: &BTreeSet<String>) -> BTreeSet<String> {
    let mut out = BTreeSet::new();
    match e {
        Expr::Var(n) => {
            if !bound.contains(n) {
                out.insert(n.clone());
            }
        }
        Expr::Let(n, _, a, b) => {
            out.extend(free_variables(a, bound));
            let mut local = bound.clone();
            local.insert(n.clone());
            out.extend(free_variables(b, &local));
        }
        Expr::Lambda(n, b) => {
            let mut local = bound.clone();
            local.insert(n.clone());
            out.extend(free_variables(b, &local));
        }
        Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) => out.extend(free_variables(x, bound)),
        Expr::Call(_, a) => {
            for a in a {
                out.extend(free_variables(a, bound));
            }
        }
        Expr::Method(x, _, a) => {
            out.extend(free_variables(x, bound));
            for a in a {
                out.extend(free_variables(a, bound));
            }
        }
        Expr::Binary(_, a, b) => {
            out.extend(free_variables(a, bound));
            out.extend(free_variables(b, bound));
        }
        Expr::Record(_, fs) => {
            for (_, a) in fs {
                out.extend(free_variables(a, bound));
            }
        }
        _ => (),
    }
    out
}
fn substitute_callbacks(
    e: &mut Expr,
    callbacks: &BTreeMap<String, (Type, Type, Expr)>,
    prefix: &str,
    serial: &mut usize,
) -> LangResult<()> {
    let wrap = |signature: &(Type, Type, Expr), serial: &mut usize| -> Expr {
        let (input, output, lambda) = signature;
        let Expr::Lambda(n, body) = lambda else {
            unreachable!()
        };
        let argument = format!("{prefix}_c{}", *serial);
        *serial += 1;
        let result = format!("{prefix}_c{}", *serial);
        *serial += 1;
        Expr::Lambda(
            argument.clone(),
            Box::new(Expr::Let(
                n.clone(),
                Some(Box::new(input.clone())),
                Box::new(Expr::Var(argument)),
                Box::new(Expr::Let(
                    result.clone(),
                    Some(Box::new(output.clone())),
                    body.clone(),
                    Box::new(Expr::Var(result)),
                )),
            )),
        )
    };
    match e {
        Expr::Call(n, args) if callbacks.contains_key(n) => {
            if args.len() != 1 {
                return Err("pure callback expects one argument".into());
            }
            substitute_callbacks(&mut args[0], callbacks, prefix, serial)?;
            let input = callbacks[n].0.clone();
            let Expr::Lambda(n, body) = wrap(&callbacks[n], serial) else {
                unreachable!()
            };
            *e = Expr::Let(n, Some(Box::new(input)), Box::new(args[0].clone()), body);
            // Do not substitute inside caller lambda bodies, whose lexical
            // names belong to a different environment.
            return Ok(());
        }
        Expr::Var(n) if callbacks.contains_key(n) => {
            *e = wrap(&callbacks[n], serial);
            return Ok(());
        }
        Expr::Let(_, _, a, b) | Expr::Binary(_, a, b) => {
            substitute_callbacks(a, callbacks, prefix, serial)?;
            substitute_callbacks(b, callbacks, prefix, serial)?;
        }
        Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) | Expr::Lambda(_, x) => {
            substitute_callbacks(x, callbacks, prefix, serial)?
        }
        Expr::Call(_, a) => {
            for a in a {
                substitute_callbacks(a, callbacks, prefix, serial)?;
            }
        }
        Expr::Method(x, _, a) => {
            substitute_callbacks(x, callbacks, prefix, serial)?;
            for a in a {
                substitute_callbacks(a, callbacks, prefix, serial)?;
            }
        }
        Expr::Record(_, fs) => {
            for (_, a) in fs {
                substitute_callbacks(a, callbacks, prefix, serial)?;
            }
        }
        _ => (),
    }
    Ok(())
}
fn constant(t: &Type) -> Option<u32> {
    if let Type::Named(n) = t {
        n.strip_prefix("__ink_constant_")?.parse().ok()
    } else {
        None
    }
}

fn surface_names(p: &Program) -> LangResult<BTreeSet<String>> {
    let mut names = BTreeSet::new();
    let mut expressions = vec![];
    let mut statements = vec![];
    for f in &p.functions {
        names.insert(f.name.clone());
        for (n, _) in &f.params {
            names.insert(n.clone());
        }
        expressions.push(&f.body);
    }
    for a in &p.actions {
        names.insert(a.name.clone());
        for (n, _) in &a.params {
            names.insert(n.clone());
        }
        statements.extend(&a.body);
    }
    for d in p.states.iter().chain(&p.keeps) {
        names.insert(d.name.clone());
        expressions.push(&d.value);
    }
    for r in &p.rules {
        for (n, _) in &r.params {
            names.insert(n.clone());
        }
        expressions.extend([&r.from, &r.to]);
    }
    let mut remaining = 100_000usize;
    while let Some(s) = statements.pop() {
        remaining = remaining
            .checked_sub(1)
            .ok_or("surface node budget exceeded")?;
        match s {
            Statement::Let(n, _, e) | Statement::Emit(n, e) => {
                names.insert(n.clone());
                expressions.push(e);
            }
            Statement::Return(e) | Statement::Expr(e) => expressions.push(e),
            Statement::If(c, a, b) => {
                expressions.push(c);
                statements.extend(a);
                statements.extend(b);
            }
        }
    }
    while let Some(e) = expressions.pop() {
        remaining = remaining
            .checked_sub(1)
            .ok_or("surface node budget exceeded")?;
        match e {
            Expr::Var(n) => {
                names.insert(n.clone());
            }
            Expr::Let(n, _, a, b) => {
                names.insert(n.clone());
                expressions.extend([a.as_ref(), b.as_ref()]);
            }
            Expr::Lambda(n, b) => {
                names.insert(n.clone());
                expressions.push(b);
            }
            Expr::Neg(x) | Expr::Try(x) | Expr::Field(x, _) => expressions.push(x),
            Expr::Binary(_, a, b) => expressions.extend([a.as_ref(), b.as_ref()]),
            Expr::Call(n, args) => {
                names.insert(n.clone());
                expressions.extend(args);
            }
            Expr::Method(x, _, args) => {
                expressions.push(x);
                expressions.extend(args);
            }
            Expr::Record(n, fields) => {
                names.insert(n.clone());
                expressions.extend(fields.iter().map(|(_, e)| e));
            }
            _ => (),
        }
    }
    Ok(names)
}
