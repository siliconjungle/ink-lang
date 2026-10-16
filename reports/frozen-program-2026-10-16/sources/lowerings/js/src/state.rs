//! Literal state/action emission. The support runtime contains fixed primitives,
//! never program syntax or an evaluator.
use super::{arithmetic, descriptor, quote, zero, Env};
use ink_core::{syntax::*, LangResult};
use serde_json::{json, Value};
use std::collections::{BTreeMap, BTreeSet};
struct StateEmitter<'a> {
    p: &'a Program,
    next: usize,
    preflight: bool,
    execution: &'a ink_core::action_ir::Execution,
    equality: super::TypedEquality<'a>,
    // Invocation-local emission substitutions for borrowed AST children. These
    // addresses are never serialized or accepted as semantic evidence.
    at_position: BTreeMap<usize, String>,
}
impl StateEmitter<'_> {
    fn fresh(&mut self) -> String {
        let n = format!("s{}", self.next);
        self.next += 1;
        n
    }
    fn infer(&self, e: &Expr, _env: &Env, _want: Option<&Type>) -> LangResult<Type> {
        self.execution
            .type_of(e)
            .cloned()
            .or_else(|| {
                if let Expr::Var(n) = e {
                    self.p
                        .states
                        .iter()
                        .chain(&self.p.keeps)
                        .find(|d| &d.name == n)
                        .map(|d| d.ty.clone())
                } else {
                    None
                }
            })
            .ok_or_else(|| format!("missing checked action type: {e:?}"))
    }
    fn expr(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<String> {
        self.expr_carrier(e, env, want, false)
    }
    fn expr_carrier(&mut self, e: &Expr, env: &Env, want: Option<&Type>, count_number: bool) -> LangResult<String> {
        if let Some(value) = self.at_position.get(&(e as *const Expr as usize)) {
            return Ok(value.clone());
        }
        let t = self.infer(e, env, want)?;
        Ok(match e {
            Expr::Num(n) if count_number => n.to_string(),
            Expr::Num(n) => {
                if t == Type::F32 {
                    return Ok((*n as f32).to_bits().to_string());
                }
                if matches!(t, Type::U64 | Type::Int) {
                    format!("{n}n")
                } else {
                    n.to_string()
                }
            }
            Expr::Bool(b) => b.to_string(),
            Expr::Float(bits) => bits.to_string(),
            Expr::Double(bits) => super::double_literal(*bits),
            Expr::Neg(value) => {
                if t == Type::I32 && matches!(value.as_ref(), Expr::Num(2147483648)) {
                    return Ok("-2147483648".into());
                }
                let v = self.expr(value, env, Some(&t))?;
                match t {
                    Type::F32 => format!("(({v})^0x80000000)>>>0"),
                    Type::F64 => format!("__dfNeg({v})"),
                    Type::I32 => format!("(-({v}))|0"),
                    Type::U32 => format!("(-({v}))>>>0"),
                    Type::U64 => format!("__u64(-({v}))"),
                    _ => format!("-({v})"),
                }
            }
            Expr::String(s) => quote(s),
            Expr::Unit => "null".into(),
            Expr::Var(n) => {
                if let Some((v, _)) = env.get(n) {
                    v.clone()
                } else if n == "None" {
                    "({None:null})".into()
                } else {
                    let i = self
                        .p
                        .keeps
                        .iter()
                        .position(|k| &k.name == n)
                        .ok_or("table cannot be used as a value")?;
                    format!("__keep{i}(ctx,rt)")
                }
            }
            Expr::Field(x, n) => {
                if let Expr::Var(en) = x.as_ref() {
                    if self.p.enums.contains_key(en) {
                        return Ok(quote(&format!("{en}.{n}")));
                    }
                }
                if matches!(self.infer(x, env, None)?, Type::Vector(..)) {
                    let v = self.expr(x, env, None)?;
                    let i = ["x", "y", "z", "w"]
                        .iter()
                        .position(|s| *s == n)
                        .ok_or("vector component")?;
                    return Ok(format!("({v})[{i}]"));
                }
                if matches!(self.infer(x,env,None)?,Type::Named(ref name) if self.equality.elisions.contains(name)) {return self.expr(x,env,None);}
                format!("({})[{}]", self.expr(x, env, None)?, quote(n))
            }
            Expr::Record(n,fs) if self.equality.elisions.contains(n) => self.expr(&fs[0].1,env,Some(&self.p.records[n][0].1))?,
            Expr::Record(n, fs) => {
                let mut fields = vec![];
                for (k, e) in fs {
                    let ft = &self.p.records[n]
                        .iter()
                        .find(|(f, _)| f == k)
                        .ok_or("record field")?
                        .1;
                    fields.push(format!("[{}]:{}", quote(k), self.expr(e, env, Some(ft))?))
                }
                format!("({{{}}})", fields.join(","))
            }
            Expr::Try(x) => {let value=self.expr(x,env,None)?;let ty=self.infer(x,env,None)?;format!("__try({})",self.equality.sums.view_type(self.p,&ty,&value)?)},
            Expr::Binary(op, a, b) => {
                let mut at = self.infer(
                    a,
                    env,
                    if matches!(t, Type::U32 | Type::U64 | Type::Int | Type::I32 | Type::F32 | Type::F64) {
                        Some(&t)
                    } else {
                        None
                    },
                )?;
                if matches!(a.as_ref(), Expr::Num(_)) {
                    let bt = self.infer(b, env, None)?;
                    if matches!(bt, Type::U32 | Type::Int | Type::I32 | Type::F32 | Type::F64) {
                        at = bt
                    }
                }
                if super::count_carrier::comparison(op, &at, a, b) {
                    let a = self.expr_carrier(a, env, Some(&at), true)?;
                    let b = self.expr_carrier(b, env, Some(&at), true)?;
                    return Ok(super::count_carrier::emit(op, &a, &b));
                }
                let a = self.expr(a, env, Some(&at))?;
                let b = self.expr(b, env, Some(&at))?;
                if ["+", "-", "*"].contains(&op.as_str()) {
                    if at == Type::Int {
                        format!("(({a}) {op} ({b}))")
                    } else {
                        arithmetic(op, &a, &b, &at)
                    }
                } else if matches!(at,Type::F32|Type::F64) {
                    let op = match op.as_str() {
                        "==" => "===",
                        "!=" => "!==",
                        _ => op,
                    };
                    let number=if at==Type::F64{"__dfNumber"}else{"__float"};
                    format!("({number}({a}) {op} {number}({b}))")
                } else if op == "==" || op == "!=" {
                    format!("{}({})", if op == "!=" { "!" } else { "" }, self.equality.expr(&at, &a, &b)?)
                } else {
                    format!("(({a}) {op} ({b}))")
                }
            }
            Expr::Let(..) => {
                // One lexical block preserves the same strict initializers and
                // scope without creating an arrow invocation for every binding.
                // Keep the block at this operand/branch: neither source work nor
                // host failures can move across surrounding evaluation.
                let mut local = env.clone();
                let mut bindings = String::new();
                let mut tail = e;
                while let Expr::Let(n, annotation, value, body) = tail {
                    let t = self.infer(value, &local, annotation.as_deref())?;
                    let value = self.expr(value, &local, Some(&t))?;
                    let variable = self.fresh();
                    bindings.push_str(&format!("const {variable}={value};"));
                    local.insert(n.clone(), (variable, t));
                    tail = body;
                }
                format!("(()=>{{{bindings}return {};}})()", self.expr(tail, &local, want)?)
            }
            Expr::Call(n, args) => match n.as_str() {
                name if ink_core::primitives::primitive(name) => {
                    let first=args.first().and_then(|a|self.execution.type_of(a));
                    let (params,_)=ink_core::primitives::signature(name,first)?;
                    let vals=args.iter().zip(params).map(|(a,t)|self.expr(a,env,Some(&t))).collect::<LangResult<Vec<_>>>()?;
                    super::primitives::expression(name,&vals,first,false)?
                }

                name if ink_core::word::primitive(name) => {
                    let ts = ink_core::word::arguments(name, &t);
                    let vals = args
                        .iter()
                        .zip(ts)
                        .map(|(a, t)| self.expr(a, env, Some(&t)))
                        .collect::<LangResult<Vec<_>>>()?;
                    super::word_expression(name, &vals[0], vals.get(1).map(String::as_str).unwrap_or("0"), &t)
                }
                "choose" => format!(
                    "({}?{}:{})",
                    self.expr(&args[0], env, Some(&Type::Bool))?,
                    self.expr(&args[1], env, Some(&t))?,
                    self.expr(&args[2], env, Some(&t))?
                ),
                "list" => {
                    let Type::List(inner) = &t else {
                        return Err("list type".into());
                    };
                    format!(
                        "[{}]",
                        args.iter()
                            .map(|e| self.expr(e, env, Some(inner)))
                            .collect::<LangResult<Vec<_>>>()?
                            .join(",")
                    )
                }
                "vec2" | "vec3" | "vec4" => format!(
                    "[{}]",
                    args.iter()
                        .map(|e| self.expr(e, env, None))
                        .collect::<LangResult<Vec<_>>>()?
                        .join(",")
                ),
                "Ok" | "Err" | "Some" => {
                    let inner = match (&t, n.as_str()) {
                        (Type::Result(a, _), "Ok") | (Type::Option(a), "Some") => Some(&**a),
                        (Type::Result(_, b), "Err") => Some(&**b),
                        _ => None,
                    };
                    let payload=self.expr(&args[0],env,inner)?;self.equality.sums.make_type(self.p,&t,n,&payload)?
                }
                "Int" => format!("BigInt({})", self.expr(&args[0], env, None)?),
                "checked_add" | "checked_sub" | "checked_mul" => {
                    let Type::Result(at, _) = &t else {
                        return Err("checked arithmetic type".into());
                    };
                    let at = *at.clone();
                    format!(
                        "__checked({}, {}, {}, {})",
                        quote(n),
                        self.expr(&args[0], env, Some(&at))?,
                        self.expr(&args[1], env, Some(&at))?,
                        if at == Type::I32 {
                            -32
                        } else if at == Type::U32 {
                            32
                        } else {
                            64
                        }
                    )
                }
                "sum" | "count" => {
                    let xs = self.expr(&args[0], env, None)?;
                    if n == "count" {
                        if count_number { format!("({xs}).length") } else { format!("BigInt(({xs}).length)") }
                    } else {
                        let add = if t == Type::Int {
                            "a+b".into()
                        } else {
                            arithmetic("+", "a", "b", &t)
                        };
                        format!(
                            "({xs}).reduce((a,b)=>{{__tick(ctx);return {add};}},{})",
                            if t == Type::Int { "0n" } else { zero(&t) }
                        )
                    }
                }
                _ => {
                    let (index, params, change, isaction) = if let Some((i, a)) = self
                        .p
                        .actions
                        .iter()
                        .enumerate()
                        .find(|(_, a)| &a.name == n)
                    {
                        (i, a.params.clone(), a.kind == ActionKind::Change && matches!(a.result,Type::Result(..)), true)
                    } else {
                        let (i, f) = self
                            .p
                            .functions
                            .iter()
                            .enumerate()
                            .find(|(_, f)| &f.name == n)
                            .ok_or("call target")?;
                        (i, f.params.clone(), false, false)
                    };
                    let values = args
                        .iter()
                        .zip(&params)
                        .map(|(e, (_, t))| self.expr(e, env, Some(t)))
                        .collect::<LangResult<Vec<_>>>()?;
                    let argv = if values.is_empty() {
                        String::new()
                    } else {
                        format!(",{}", values.join(","))
                    };
                    if isaction {
                        let result=format!("__action{index}(ctx,rt{argv})");
                        let ty=&self.p.actions[index].result;
                        if change && self.equality.sums.selected(&descriptor(ty,self.p,&mut BTreeSet::new())?){format!("((v)=>{{__nested({},true);return v;}})({result})",self.equality.sums.view_type(self.p,ty,"v")?)}else{format!("__nested({result},{change})")}
                    } else {
                        format!("__fn{index}({})", values.join(","))
                    }
                }
            },
            Expr::Method(xs, n, args) => {
                let xt = self.infer(xs, env, None)?;
                if let Type::Table(kt, vt) = xt {
                    let Expr::Var(root) = xs.as_ref() else {
                        return Err("table root".into());
                    };
                    let i = self
                        .p
                        .states
                        .iter()
                        .position(|d| &d.name == root)
                        .ok_or("table index")?;
                    if n=="sum_by" || n=="count_where" {
                        let Expr::Lambda(parameter,body)=&args[0] else {return Err("scan callback".into());};
                        let var=self.fresh();let mut local=env.clone();local.insert(parameter.clone(),(var.clone(),*vt));
                        let callback=self.expr(body,&local,None)?;
                        let add=if n=="count_where" {"acc+1n".into()} else if t==Type::Int {"acc+contribution".into()} else {arithmetic("+","acc","contribution",&t)};
                        let step=if n=="count_where" {format!("if(contribution)acc={add};")} else {format!("acc={add};")};
                        return Ok(format!("(()=>{{let acc={};for(const key of __orderedKeys(rt,{i})){{__tick(ctx);const {var}=__cellGet(rt,{i},key);const contribution={callback};{step}}}return acc;}})()",if t==Type::Int {"0n".into()}else{zero(&t)}));
                    }
                    if n=="shared_keys" {
                        let Expr::Var(other)=&args[0] else{return Err("shared_keys root".into());};
                        let j=self.p.states.iter().position(|s| &s.name==other).ok_or("shared_keys table")?;
                        return Ok(format!("__table(rt,{i},\"intersect_table\",[{j}])"));
                    }
                    let values = args
                        .iter()
                        .enumerate()
                        .map(|(i, e)| self.expr(e, env, Some(&ink_core::table_argument(n, i, &kt, &vt))))
                        .collect::<LangResult<Vec<_>>>()?;
                    // Fixed table primitives take typed arguments directly.
                    // Keep the generic dispatcher for compound operations only.
                    if self.preflight && ["put","insert","replace","remove"].contains(&n.as_str()) {
                        // Dense plans admit only canonical unsigned integer keys.
                        // Number conversion cannot round a key outside the at-most
                        // 2^20 prefix into it. Capture its fixed capacity at bind;
                        // restore preserves the selected layout and capacity.
                        let mode=if n=="insert"{1}else if n=="replace"{2}else{0};
                        let next=if n=="remove"{"undefined".into()}else{values[1].clone()};
                        let result=if n=="remove" {"(__stagePrior===undefined?{None:null}:{Some:__stagePrior})"} else {"null"};
                        let membership=if mode==1 {"(__stagePrior!==undefined?__preflightError('insert key already present'):null)"}else if mode==2{"(__stagePrior===undefined?__preflightError('replace key absent'):null)"}else{"null"};
                        return Ok(format!("(__stageRoot={i},__stageKey={},__stageNext={next},__stageSlot=__dense{i}?Number(__stageKey):undefined,__stageSlot=__dense{i}&&__stageSlot>=__denseLimit{i}?-1:__stageSlot,__stagePrior=__stageSlot===undefined?rt.tables[{i}].get(__stageKey):__stageSlot<0?rt.tables[{i}].sparse.get(__stageKey):rt.tables[{i}].dense[__stageSlot],{membership},__stageChanged=__stagePrior===undefined?__stageNext!==undefined:__stageNext===undefined||!__stateRootEquals[{i}](__stagePrior,__stageNext),{result})",values[0]));
                    }
                    if n=="get"||n=="contains"||n=="remove" {
                        let helper=match n.as_str(){"get"=>"__tableGet","contains"=>"__tableContains",_=>"__tableRemove"};
                        return Ok(format!("{helper}(rt,{i},{})",values[0]));
                    }
                    if n=="put"||n=="insert"||n=="replace" {
                        let mode=if n=="insert"{1}else if n=="replace"{2}else{0};
                        return Ok(format!("__tablePut(rt,{i},{},{},{mode})",values[0],values[1]));
                    }
                    format!("__table(rt,{i},{},[{}])", quote(n), values.join(","))
                } else {
                    let raw = self.expr(xs, env, None)?;
                    let x=self.equality.sums.view_type(self.p,&xt,&raw)?;
                    if n == "concat" {
                        format!("({x}).concat({})", self.expr(&args[0], env, Some(&xt))?)
                    } else if n == "fold" {
                        let (a, b, tag_a, tag_b) = match &xt {
                            Type::Option(a) => (a.as_ref().clone(), Type::Unit, "Some", "None"),
                            Type::Result(a, b) => {
                                (a.as_ref().clone(), b.as_ref().clone(), "Ok", "Err")
                            }
                            _ => return Err("fold receiver".into()),
                        };
                        let value = self.fresh();
                        let mut codes = vec![];
                        for (arg, input) in args.iter().zip([a, b]) {
                            let Expr::Lambda(v, body) = arg else {
                                return Err("fold lambda".into());
                            };
                            let variable = self.fresh();
                            let mut local = env.clone();
                            local.insert(v.clone(), (variable.clone(), input));
                            codes.push(format!(
                                "({variable})=>({})",
                                self.expr(body, &local, want)?
                            ));
                        }
                        format!("(({value})=>Object.hasOwn({value},{})?({})({value}[{}]):({})({}))({x})",quote(tag_a),codes[0],quote(tag_a),codes[1],if tag_b=="None"{"null".into()}else{format!("{value}[{}]",quote(tag_b))})
                    } else if n == "unwrap_or" {
                        format!("((v,fallback)=>Object.hasOwn(v,'Some')?v.Some:fallback)({x},{})", self.expr(&args[0], env, Some(&t))?)
                    } else if n == "ok_or" {
                        let result=format!("__okOr({x},{})", self.expr(&args[0], env, None)?);
                        if self.equality.sums.selected(&descriptor(&t,self.p,&mut BTreeSet::new())?){format!("((v)=>Object.hasOwn(v,'Ok')?{}:{})({result})",self.equality.sums.make_type(self.p,&t,"Ok","v.Ok")?,self.equality.sums.make_type(self.p,&t,"Err","v.Err")?)}else{result}
                    } else {
                        let inner = match &xt {
                            Type::List(t) | Type::Option(t) => t.clone(),
                            Type::Result(a, b) => {
                                if n == "map_err" {
                                    b.clone()
                                } else {
                                    a.clone()
                                }
                            }
                            _ => return Err("map receiver".into()),
                        };
                        let Expr::Lambda(v, body) = &args[0] else {
                            return Err("lambda".into());
                        };
                        let var = self.fresh();
                        let mut local = env.clone();
                        local.insert(v.clone(), (var.clone(), *inner));
                        let body = self.expr(body, &local, None)?;
                        let kind = match xt {
                            Type::List(_) => "list",
                            Type::Option(_) => "option",
                            _ => "result",
                        };
                        let tick=if self.preflight{""}else{"__tick(ctx);"};
                        let mapped=format!("__mapValue({x},{},{},({var})=>{{{tick}return {body};}})",quote(kind),quote(n));
                        if matches!(t,Type::Result(..)){format!("((v)=>Object.hasOwn(v,'Ok')?{}:{})({mapped})",self.equality.sums.make_type(self.p,&t,"Ok","v.Ok")?,self.equality.sums.make_type(self.p,&t,"Err","v.Err")?)}else{mapped}
                    }
                }
            }
            _ => return Err("unsupported checked action expression".into()),
        })
    }
    fn statement_expr(&mut self, e: &Expr, env: &Env, want: Option<&Type>) -> LangResult<(String, String)> {
        fn leading(e: &Expr) -> bool {
            match e { Expr::Let(..) => true, Expr::Binary(_, a, _) => leading(a), _ => false }
        }
        if !leading(e) { return Ok((String::new(), self.expr(e, env, want)?)); }
        if let Expr::Binary(_, left, _) = e {
            // Only the first strict operand can move to this statement's
            // prelude. The right operand, including a short-circuit arm, keeps
            // its exact evaluation position inside the emitted expression.
            let (prefix, value) = self.statement_expr(left, env, None)?;
            let address = left.as_ref() as *const Expr as usize;
            let prior = self.at_position.insert(address, value);
            let expression = self.expr(e, env, want);
            match prior { Some(value) => { self.at_position.insert(address, value); }, None => { self.at_position.remove(&address); } }
            return expression.map(|expression| (prefix, expression));
        }
        let mut local = env.clone();
        let mut prefix = String::new();
        let mut tail = e;
        while let Expr::Let(name, annotation, value, body) = tail {
            let ty = self.infer(value, &local, annotation.as_deref())?;
            let (before, value) = self.statement_expr(value, &local, Some(&ty))?;
            let variable = self.fresh();
            prefix.push_str(&before);
            prefix.push_str(&format!("const {variable}={value};"));
            local.insert(name.clone(), (variable, ty));
            tail = body;
        }
        let (before, value) = self.statement_expr(tail, &local, want)?;
        prefix.push_str(&before);
        Ok((prefix, value))
    }
    fn block(&mut self, body: &[Statement], env: &mut Env, result: &Type) -> LangResult<String> {
        let mut code = String::new();
        for s in body {
            if !self.preflight {code.push_str("__tick(ctx);");}
            match s {
                Statement::Let(n, t, e) => {
                    let at = self.infer(e, env, t.as_ref())?;
                    let (prefix, e) = self.statement_expr(e, env, Some(&at))?;
                    code.push_str(&prefix);
                    let v = self.fresh();
                    code.push_str(&format!("const {v}={e};"));
                    env.insert(n.clone(), (v, at));
                }
                Statement::Return(e) => {
                    let (prefix, e) = self.statement_expr(e, env, Some(result))?;
                    code.push_str(&prefix);
                    code.push_str(&if self.preflight { format!("value={e};break __inkBody;") } else { format!("return {e};") });
                }
                Statement::Expr(e) => {
                    let (prefix, e) = self.statement_expr(e, env, None)?;
                    code.push_str(&prefix);code.push_str(&format!("{e};"));
                }
                Statement::Emit(n, e) => {
                    let (prefix, e) = self.statement_expr(e, env, Some(&self.p.events[n]))?;
                    code.push_str(&prefix);
                    code.push_str(&if self.preflight {format!("__eventChannel={};__eventValue={e};",quote(n))}else{format!("__emit(rt,{},{e});",quote(n))});
                }
                Statement::If(e, a, b) => {
                    let (prefix, e) = self.statement_expr(e, env, Some(&Type::Bool))?;
                    code.push_str(&prefix);
                    let a = self.block(a, &mut env.clone(), result)?;
                    let b = self.block(b, &mut env.clone(), result)?;
                    code.push_str(&format!("if({e}){{{a}}}else{{{b}}}"));
                }
            }
        }
        Ok(code)
    }
}
pub(crate) fn emit_with_sums(
    module: &ink_core::core::CheckedModule,
    layout: &ink_core::snapshot_wire::Layout,
    elisions: &BTreeSet<String>,
    sums:&super::sum_layout::Sums,
    protocol:Option<&ink_core::protocol::CheckedProtocol>,
    kernels:&[Option<String>],
) -> LangResult<(String, Value)> {
    let p = module.program();
    let checked_actions = ink_core::action_ir::CheckedActions::elaborate_with_frozen_roots(module)?;
    let effects = ink_core::effects::CheckedEffects::derive(&checked_actions)?;
    let execution = checked_actions.execution()?;
    let mut emitter = StateEmitter {
        p,
        next: 0,
        preflight: false,
        execution: &execution,
        equality: super::TypedEquality::new(p, "__stateValueEqual"),
        at_position: BTreeMap::new(),
    };
    emitter.equality.elisions=elisions.clone();
    emitter.equality.sums=sums.clone();
    let mut code = include_str!("observers.mjs").to_string()+include_str!("event_columns.mjs")+include_str!("state.mjs");
    let mut actions = vec![];
    let mut captures = super::state_capture::Captures::with_elisions(p,elisions).with_sums(sums);
    let mut capture_lists = Vec::new();
    let mut keeps = vec![];
    let mut direct_read_factories=vec![];
    let mut equal_results=vec![];
    let equal_roots=p.states.iter().map(|s|{let Type::Table(_,t)=&s.ty else{return Err("state root".into())};Ok(format!("(a,b)=>{}",emitter.equality.expr(t,"a","b")?))}).collect::<LangResult<Vec<_>>>()?;
    let mut bound_factories=vec![];
    let mut preflight_factories=vec![];
    let capabilities=ink_core::protocol::capabilities(module)?;
    let mut keep_invalidations = vec![Vec::<usize>::new(); p.states.len()];
    for (i, k) in execution.keeps().iter().enumerate() {
        let e = emitter.expr(&k.value, &Env::new(), Some(&k.ty))?;
        // Checked immutable values have no owned Buffer/Map descendants. They
        // may share private storage; public results still use owned conversion.
        // Pure callees never acquire unique ownership of their parameters.
        let cached = !ink_core::local_collections::owned(&k.ty, p);
        let reads = &effects.keep(&k.name).ok_or("missing checked keep effects")?.access.reads;
        if cached {
            for (root, state) in p.states.iter().enumerate() {
                if reads.contains(&state.name) {
                    keep_invalidations[root].push(i);
                }
            }
        }
        let keep_abort=if matches!(k.ty,Type::Result(..)){format!("}}catch(e){{if(e instanceof __Abort)return {};throw e;}}",sums.make_type(p,&k.ty,"Err","e.value")?)}else{String::new()};
        keeps.push(json!({"name": k.name, "cached": cached}));
        code.push_str(&format!(
            "function {}{i}(ctx,rt){{__tick(ctx);{}return {e};{}}}\n",
            if cached { "__computeKeep" } else { "__keep" },
            if matches!(k.ty, Type::Result(..)) {
                "try{"
            } else {
                ""
            },
            if matches!(k.ty, Type::Result(..)) {
                &keep_abort
            } else {
                ""
            }
        ));
        if cached {
            code.push_str(&format!("function __keep{i}(ctx,rt){{return __cachedKeep(ctx,rt,{i},__computeKeep{i});}}\n"));
        }
    }
    for (i, a) in execution.actions().iter().enumerate() {
        capture_lists.push(format!("[{}]", a.params.iter().map(|(_, ty)| captures.for_type(ty)).collect::<LangResult<Vec<_>>>()?.join(",")));
        let params=(0..a.params.len()).map(|i|format!("p{i}")).collect::<Vec<_>>();
        let captures=(0..a.params.len()).map(|i|format!("inputs[{i}](p{i})")).collect::<Vec<_>>();
        // Bind a direct action entry once. Captures become lexical locals;
        // no argument carrier, spread invocation or name/kind dispatch remains.
        // Preconditions retain the ordinary invocation path and evaluation order.
        if a.kind==ActionKind::Change {
            let locals=(0..a.params.len()).map(|i|format!("const b{i}=inputs[{i}](p{i});")).collect::<String>();
            let argv=(0..a.params.len()).map(|i|format!(",b{i}")).collect::<String>();
            bound_factories.push(format!("(run,a,inputs,output,only,rt,begin,complete,abort,end)=>a.precondition?({})=>run(a,[{}],null,output,only,true):({})=>{{{locals}begin(a);try{{return complete(a,__action{i}(rt.ctx,rt{argv}),output,only);}}catch(e){{return abort(e);}}finally{{end();}}}}",params.join(","),captures.join(","),params.join(",")));
        }else{
            bound_factories.push(format!("(run,a,inputs,output,only)=>({})=>run(a,[{}],null,output,only,true)",params.join(","),captures.join(",")));
        }
        let explicit=p.contracts.action_protocols.get(&a.name);
        let inferred=protocol.and_then(|p|p.plan().actions.iter().find(|c|c.action==a.name)).map(|c|c.execution);
        let use_preflight=explicit==Some(&ink_core::protocol::Execution::Preflight)||inferred==Some(ink_core::protocol::Execution::Preflight);
        let direct_keep=protocol.filter(|p|p.plan().direct_reads.contains(&a.name)).and_then(|_|capabilities[i].direct_keep);
        if use_preflight {
            // Checked preflight bodies exclude calls into source functions,
            // queries and changes, and all ingress is owned before evaluation.
            // Maintained definitions and codecs have no host callbacks. Thus
            // nobody can observe an in-progress flag before commit/publication:
            // retain the entry boundary check but omit writes and cleanup for
            // that flag. Host transactions still use the journalled fallback.
            let locals=a.params.iter().enumerate().map(|(j,(_,t))|format!("const b{j}={};",if matches!(t,Type::U64|Type::U32|Type::I32|Type::Bool|Type::Unit|Type::String)||matches!(t,Type::Named(n) if p.enums.contains_key(n)){format!("p{j}")}else{format!("ownedInputs?p{j}:inputs[{j}](p{j})")})).collect::<String>();
            let mut native_env=Env::new();for (j,(n,t)) in a.params.iter().enumerate(){native_env.insert(n.clone(),(format!("b{j}"),t.clone()));}
            emitter.preflight=true;
            let body=emitter.block(&a.body,&mut native_env,&a.result)?;
            emitter.preflight=false;
            let abort=if matches!(a.result,Type::Result(..))&&checked_actions.action(i).unwrap().nodes.iter().any(|n|matches!(n.kind,ink_core::action_ir::Kind::Try{..})){format!("try{{{body}}}catch(e){{if(e instanceof __Abort)value={};else throw e;}}",sums.make_type(p,&a.result,"Err","e.value")?)}else{body};
            let failure=if matches!(a.result,Type::Result(..)){if sums.selected(&descriptor(&a.result,p,&mut BTreeSet::new())?){"value.tag!==0"}else{"Object.hasOwn(value,'Err')"}}else{"false"};
            let result=if ink_core::action_shape::fresh_native_result(&checked_actions,i)&&!sums.contains_type(p,&a.result)?{"value"}else{"output(value)"};
            let writes=&effects.action(&a.name).ok_or("missing action effects")?.access.writes;
            let root=p.states.iter().enumerate().filter(|(_,s)|writes.contains(&s.name)).map(|(i,_)|i).collect::<Vec<_>>();
            let dense_bindings=root.iter().map(|r|format!("const __dense{r}=rt.tables[{r}] instanceof __DenseTable;const __denseLimit{r}=__dense{r}?rt.tables[{r}].limit:0;")).collect::<String>();
            let (bindings,prepare,commit)=if root.len()==1 {
                let r=root[0];(format!("const prepare=rt.views.directRoots?.[{r}];"),"if(prepare)prepare(rt,__stageKey,__stagePrior,__stageNext);".to_string(),format!("__stateCommitRoot{r}(rt,__stageKey,__stagePrior,__stageNext,__stageSlot);"))
            }else{(String::new(),"__prepareDirect(rt,__stageRoot,__stageKey,__stagePrior,__stageNext);".to_string(),"__commitDirect(rt,__stageRoot,__stageKey,__stagePrior,__stageNext,__stageSlot);".to_string())};
            let inline_kernel=if root.len()==1{kernels.get(root[0]).and_then(|k|k.as_ref())}else{None};
            let publish_root=if root.len()==1{root[0].to_string()}else{"__stageRoot".to_string()};
            let generic=bound_factories.last().unwrap();
            let advance=if protocol.is_some_and(|p|p.plan().compact_commits.is_some()){"__nextCommit(rt.version)"}else{"rt.version+1n"};
            let column_events=protocol.is_some_and(|p|p.plan().event_columns);
            let factory=|result_only:bool,fused:bool| {
                let prepare=if fused{""}else{prepare.as_str()};
                let commit=if fused{format!("{{const key=__stageKey,prior=__stagePrior,next=__stageNext,slot=__stageSlot;{}}}",inline_kernel.expect("native root kernel"))}else{commit.clone()};
                let event_prepare=match (column_events,result_only) {
                    (true,true)=>"",
                    (true,false)=>"const events=__eventChannel!==null?[{commit:publicNext,position:0n,channel:__eventChannel,value:rt.eventOutput.get(__eventChannel)(__eventValue)}]:[];",
                    (false,true)=>"let event=null;if(__eventChannel!==null)event={commit:next,position:0n,channel:__eventChannel,value:__eventValue};",
                    (false,false)=>"let event=null;if(__eventChannel!==null)event={commit:next,position:0n,channel:__eventChannel,value:__eventValue};const events=event?[{...event,commit:publicNext,value:rt.eventOutput.get(__eventChannel)(__eventValue)}]:[];",
                };
                let event_commit=if column_events{"if(__eventChannel!==null)rt.outbox.append(next,0n,__eventChannel,__eventValue);"}else{"if(event)rt.outbox.push(event);"};
                let failed=if result_only{"result"}else{"{result,committed:false,version:__versionWord(rt.version),events:[]}"};
                let public_next=if result_only{""}else{"const publicNext=__versionWord(next);"};
                let successful=if result_only{"result"}else{"{result,committed:true,version:publicNext,events}"};
                format!("({})=>{{if(rt.host)return fallback({});if(rt.busy)throw Error('state operation already in progress');{locals}let __stageRoot=-1,__stageKey,__stagePrior,__stageNext,__stageSlot,__stageChanged=false,__eventChannel=null,__eventValue;let value;__inkBody:{{{abort}}}const result={result};if({failure})return {failed};if(rt.version===18446744073709551615n)throw Error('commit sequence exhausted');const next={advance};{public_next}if(__stageChanged){{{prepare}}}{event_prepare}if(__stageChanged){{{commit}}}{event_commit}rt.version=next;if(__stageChanged)schedules[{publish_root}]?.(publicationOutputs,rt.changedOutputEpoch);return {successful};}}",params.join(","),params.join(","))
            };
            // Full replies retain preparation before fallible public event
            // copying. Result-only kernels can compute scalar keeps in locals
            // and commit them directly without intermediate runtime scratch.
            let only_body=factory(true,inline_kernel.is_some());let complete_body=factory(false,false);
            preflight_factories.push(format!("(run,a,inputs,output,only,rt,begin,complete,abort,end,ownedInputs=false)=>{{const fallback=ownedInputs?({})=>run(a,[{}],null,output,only,true):({generic})(run,a,inputs,output,only,rt,begin,complete,abort,end);{bindings}{dense_bindings}const schedules=rt.observers.rootSchedules,publicationOutputs=rt.meta.outputPublication?rt.changedOutputs:null;return only?{only_body}:{complete_body};}}",params.join(","),params.join(",")));

        }else {preflight_factories.push("null".into());}
        equal_results.push(format!("(a,b)=>{}",emitter.equality.expr(&a.result,"a","b")?));
        let mut env = Env::new();
        let mut vars = vec![];
        for (n, t) in &a.params {
            let v = emitter.fresh();
            env.insert(n.clone(), (v.clone(), t.clone()));
            vars.push(v)
        }
        let body = emitter.block(&a.body, &mut env, &a.result)?;
        let fallible=matches!(a.result,Type::Result(..));
        let abort=format!("}}catch(e){{if(e instanceof __Abort)return {};throw e;}}",sums.make_type(p,&a.result,"Err","e.value")?);
        code.push_str(&format!("function __action{i}(ctx,rt{}){{__tick(ctx);{}{body}{}}}\n",if vars.is_empty(){String::new()}else{format!(",{}",vars.join(","))},if fallible{"try{"}else{""},if fallible{&abort}else{""}));
        let summary=effects.action(&a.name).ok_or("missing action effects")?;
        let mut reads=summary.access.reads.clone();
        if let Some(guard)=p.contracts.precondition_checks.get(&a.name){reads.extend(effects.action(guard).ok_or("missing precondition effects")?.access.reads.clone());}
        let roots=p.states.iter().enumerate().filter(|(_,s)|reads.contains(&s.name)).map(|(i,_)|i).collect::<Vec<_>>();
        let single_cell=ink_core::action_shape::maximum_cell_writes(&checked_actions,i).is_some_and(|n|n<=1);
        let fresh_result=ink_core::action_shape::fresh_native_result(&checked_actions,i) && !sums.contains_type(p,&a.result)?;
        direct_read_factories.push(if fresh_result {direct_keep.map(|k|format!("rt=>()=>{{if(rt.busy)throw Error('state operation already in progress');return rt.keeps[{k}];}}" )).unwrap_or("null".into())}else{"null".into()});
        actions.push(json!({"index":i,"name":a.name,"singleCell":single_cell&&explicit!=Some(&ink_core::protocol::Execution::Transactional),"directKeep":direct_keep,"freshResult":fresh_result,"roots":roots,"precondition":p.contracts.precondition_checks.get(&a.name),"change":a.kind==ActionKind::Change,"fallible":matches!(a.result,Type::Result(..)),"flatFailure":sums.selected(&descriptor(&a.result,p,&mut BTreeSet::new())?),"params":a.params.iter().map(|(n,t)|Ok(json!({"name":n,"type":descriptor(t,p,&mut BTreeSet::new())?}))).collect::<LangResult<Vec<_>>>()?,"result":descriptor(&a.result,p,&mut BTreeSet::new())?}));
    }
    for (root,keeps) in keep_invalidations.iter().enumerate(){
        let updates=keeps.iter().map(|k|format!("{{const value=rt.viewByKeep[{k}]?rt.viewNext[{k}]:undefined;if(publish)rt.changedOutputs[{k}]=rt.keeps[{k}]!==value?rt.changedOutputEpoch:0;rt.keeps[{k}]=value;}}" )).collect::<String>();
        code.push_str(&format!("function __stateCommitRoot{root}(rt,key,prior,next,slot){{__storeDirect(rt,{root},key,prior,next,slot);const publish=rt.meta.outputPublication&&!rt.observers.directRoots[{root}]&&rt.observers.active;if(publish&&++rt.changedOutputEpoch===4294967296){{rt.changedOutputs.fill(0);rt.changedOutputEpoch=1;}}{updates}}}\n"));
    }
    code.push_str(&format!("const __stateDirectReadFactories=[{}];\n",direct_read_factories.join(",")));
    code.push_str(&emitter.equality.source());
    // Embedded data uses the public capture boundary. Encode u64s as decimal
    // strings before JSON.parse so JavaScript never rounds a large word literal.
    fn fixed_input(v:&ink_core::stateful::Value)->serde_json::Value {
        use ink_core::stateful::Value as V;
        match v {
            V::U64(n)=>json!(n.to_string()),
            V::List(xs)|V::Vector(xs)=>xs.iter().map(fixed_input).collect(),
            V::Record(_,fields)=>fields.iter().map(|(n,v)|(n.clone(),fixed_input(v))).collect(),
            V::Option(Some(v))=>json!({"Some":fixed_input(v)}),
            V::Result(ok,v)=>if *ok{json!({"Ok":fixed_input(v)})}else{json!({"Err":fixed_input(v)})},
            _=>v.json(),
        }
    }
    let fixed=ink_core::frozen::tables(p)?;
    let mut frozen_factories=vec![];
    for root in p.states.iter().filter(|_|!p.frozen.is_empty()) {
        if let Some(rows)=fixed.get(&root.name) {
            let Type::Table(k,v)=&root.ty else{return Err("frozen JavaScript root".into())};
            let key=captures.for_type(k)?;let value=captures.for_type(v)?;
            let rows=rows.iter().map(|(k,v)|json!([fixed_input(k),fixed_input(v)])).collect::<Vec<_>>();
            let data=quote(&serde_json::to_string(&rows).map_err(|e|e.to_string())?);
            frozen_factories.push(format!("()=>new Map(JSON.parse({data}).map(([k,v])=>[{key}(k,{{cells:1000000}},0,128),{value}(v,{{cells:1000000}},0,128)]))"));
        }else{frozen_factories.push("null".into());}
    }
    code.push_str(&captures.source());
    code.push_str(&format!("const __stateFrozenFactories=[{}];\n",frozen_factories.join(",")));
    code.push_str(&format!("const __stateQueryEquals=[{}];\n",equal_results.join(",")));
    code.push_str(&format!("const __stateRootEquals=[{}];\n",equal_roots.join(",")));
    code.push_str(&format!("const __stateBoundFactories=[{}];const __statePreflightFactories=[{}];\n",bound_factories.join(","),preflight_factories.join(",")));
    let roots=p.states.iter().map(|s|{let Type::Table(k,v)=&s.ty else{return Err("state root".into())};Ok(json!({"name":s.name,"key":descriptor(k,p,&mut BTreeSet::new())?,"value":descriptor(v,p,&mut BTreeSet::new())?,"snapshotKey":ink_core::snapshot_wire::descriptor(&layout.roots.iter().find(|(name,_,_)|name==&s.name).unwrap().1),"snapshotValue":ink_core::snapshot_wire::descriptor(&layout.roots.iter().find(|(name,_,_)|name==&s.name).unwrap().2)}))}).collect::<LangResult<Vec<_>>>()?;
    let events = p
        .events
        .iter()
        .map(|(n, t)| Ok(json!({"name":n,"type":descriptor(t,p,&mut BTreeSet::new())?,"snapshotType":ink_core::snapshot_wire::descriptor(&layout.events.iter().find(|(name,_)|name==n).unwrap().1)})))
        .collect::<LangResult<Vec<_>>>()?;
    let mut state = json!({"actions":actions,"roots":roots,"events":events,"keeps":keeps,"keepInvalidations":keep_invalidations,"lazyMaintenance":protocol.is_none(),"invariantChecks":p.contracts.invariant_checks,"outputPublication":protocol.is_some_and(|p|p.plan().output_publication),"snapshotRows":protocol.is_some_and(|p|p.plan().snapshot_rows),"eventColumns":protocol.is_some_and(|p|p.plan().event_columns),"eventRuns":protocol.is_some_and(|p|p.plan().event_runs),"compactCommits":protocol.is_some_and(|p|p.plan().compact_commits.is_some()),"snapshot":{"program":layout.program,"schema":layout.schema}});
    if let Some(protocol)=protocol {
        for prefix in &protocol.plan().columns {
            let i=p.states.iter().position(|s|s.name==prefix.table).unwrap();
            state["roots"][i]["columnPrefix"]=json!({"capacity":prefix.capacity,"exactNumbers":prefix.exact_numbers});
            if elisions.contains(&prefix.codec.record){return Err("column prefix cannot use an elided row carrier".into());}
        }
    }
    super::value_layout::snapshots(p,&mut state,elisions,sums)?;
    code.push_str(&format!(
        "const __stateMetadata={state};const __actions=[{}];const __stateInputCaptures=[{}];\n",
        (0..p.actions.len())
            .map(|i| format!("__action{i}"))
            .collect::<Vec<_>>()
            .join(","),
        capture_lists.join(",")
    ));
    code.push_str(
        "export function createState(){return __createState(__stateMetadata,__actions,__stateInputCaptures);}\n",
    );
    Ok((code, state))
}
