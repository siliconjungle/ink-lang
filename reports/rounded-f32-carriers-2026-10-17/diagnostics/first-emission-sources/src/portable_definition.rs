//! Literal first-order definition emission from a sealed core witness.
//! Proof checking stays in core; JavaScript emission remains trusted.
use ink_core::{
    definition::CheckedDefinition,
    library::Object,
    logic::{Declaration, Sort, Term},
    LangResult,
};
use serde_json::json;
use std::collections::{BTreeMap, BTreeSet};
pub struct Emission {
    pub javascript: String,
    pub manifest: serde_json::Value,
}
fn q(s: &str) -> String {
    serde_json::to_string(s).unwrap()
}
struct Lower<'a> {
    objects: &'a BTreeMap<String, Object>,
    selected: BTreeSet<String>,
    next: usize,
    nodes: usize,
}
impl Lower<'_> {
    fn fresh(&mut self) -> String {
        let n = format!("v{}", self.next);
        self.next += 1;
        n
    }
    fn select_sort(&mut self, s: &Sort) -> LangResult<()> {
        if let Sort::Data(id) = s {
            self.select(id)?;
        }
        Ok(())
    }
    fn select(&mut self, id: &str) -> LangResult<()> {
        if !self.selected.insert(id.into()) {
            return Ok(());
        }
        let d = self
            .objects
            .get(id)
            .ok_or("missing definition dependency")?
            .declaration
            .clone();
        match d {
            Declaration::Datatype { constructors } => {
                for c in constructors {
                    for s in c.fields {
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
            _ => return Err("non-executable definition dependency".into()),
        }
        Ok(())
    }
    fn step(&mut self, depth: usize) -> LangResult<()> {
        self.nodes += 1;
        if depth > 128 || self.nodes > 200000 {
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
    fn expr(
        &mut self,
        t: &Term,
        env: &BTreeMap<String, String>,
        current: &str,
        lines: &mut String,
        depth: usize,
    ) -> LangResult<String> {
        self.step(depth)?;
        let value = match t {
            Term::Var(n) => {
                return env
                    .get(n)
                    .cloned()
                    .ok_or("unbound definition variable".into())
            }
            Term::Bool(b) => b.to_string(),
            Term::U64(n) => format!("{n}n"),
            Term::Construct {
                datatype,
                constructor,
                arguments,
            } => {
                let args = arguments
                    .iter()
                    .map(|a| self.expr(a, env, current, lines, depth + 1))
                    .collect::<LangResult<Vec<_>>>()?;
                format!(
                    "({{datatype:{},constructor:{constructor},arguments:[{}]}})",
                    q(datatype),
                    args.join(",")
                )
            }
            Term::Call {
                function,
                arguments,
            } => self.call(function, arguments, env, current, lines, depth)?,
            Term::SelfCall(arguments) => {
                self.call(current, arguments, env, current, lines, depth)?
            }
            Term::Binary { op, left, right } => {
                let a = self.expr(left, env, current, lines, depth + 1)?;
                let b = self.expr(right, env, current, lines, depth + 1)?;
                if let Some(operator)=op.strip_prefix("f32:") { format!("__fpWord({operator:?},{a},{b})") } else {match op.as_str() {
                    "quot" | "rem" => format!("({b}===0n?0n:({a} {} {b}))",if op=="quot"{"/"}else{"%"}),
                    "&" => format!("({a}&{b})"),
                    "+" | "-" | "*" => format!("BigInt.asUintN(64,({a}){op}({b}))"),
                    "==" => format!("__defEqual({a},{b})"),
                    "!=" => format!("!__defEqual({a},{b})"),
                    "&&" => format!("Boolean(({a})&({b}))"),
                    "||" => format!("Boolean(({a})|({b}))"),
                    "<" | "<=" | ">" | ">=" => format!("(({a}){op}({b}))"),
                    _ => return Err("unsupported definition primitive".into()),
                }}
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                let c = self.expr(condition, env, current, lines, depth + 1)?;
                let out = self.fresh();
                lines.push_str(&format!("let {out};if({c}){{"));
                let a = self.expr(on_true, env, current, lines, depth + 1)?;
                lines.push_str(&format!("{out}={a};}}else{{"));
                let b = self.expr(on_false, env, current, lines, depth + 1)?;
                lines.push_str(&format!("{out}={b};}}"));
                return Ok(out);
            }
            Term::Match {
                scrutinee,
                branches,
            } => {
                let v = self.expr(scrutinee, env, current, lines, depth + 1)?;
                let out = self.fresh();
                lines.push_str(&format!("let {out};switch({v}.constructor){{"));
                for (i, b) in branches.iter().enumerate() {
                    let mut local = env.clone();
                    lines.push_str(&format!("case {i}:{{"));
                    for (j, n) in b.bindings.iter().enumerate() {
                        let binder = self.fresh();
                        lines.push_str(&format!("const {binder}={v}.arguments[{j}];"));
                        local.insert(n.clone(), binder);
                    }
                    let value = self.expr(&b.body, &local, current, lines, depth + 1)?;
                    lines.push_str(&format!("{out}={value};break;}}"));
                }
                lines.push_str("default:throw Error('definition constructor mismatch');}");
                return Ok(out);
            }
        };
        let out = self.fresh();
        lines.push_str(&format!("const {out}={value};"));
        Ok(out)
    }
    fn call(
        &mut self,
        id: &str,
        args: &[Term],
        env: &BTreeMap<String, String>,
        current: &str,
        lines: &mut String,
        depth: usize,
    ) -> LangResult<String> {
        let args = args
            .iter()
            .map(|a| self.expr(a, env, current, lines, depth + 1))
            .collect::<LangResult<Vec<_>>>()?;
        Ok(format!(
            "d_{id}(ctx{})",
            if args.is_empty() {
                String::new()
            } else {
                format!(",{}", args.join(","))
            }
        ))
    }
}
pub fn lower(checked: &CheckedDefinition) -> LangResult<Emission> {
    let objects = checked
        .bundle()
        .objects
        .iter()
        .map(|(id, raw)| {
            Ok((
                id.clone(),
                serde_json::from_str::<Object>(raw).map_err(|e| e.to_string())?,
            ))
        })
        .collect::<LangResult<BTreeMap<_, _>>>()?;
    let mut lower = Lower {
        objects: &objects,
        selected: BTreeSet::new(),
        next: 0,
        nodes: 0,
    };
    for id in checked.exports() {
        lower.select(checked.choices().get(id).unwrap_or(id))?;
    }
    let mut source = include_str!("definition.mjs").to_owned()+include_str!("definition-f32.mjs.txt");
    let mut types = BTreeMap::new();
    for id in lower.selected.clone() {
        match &objects[&id].declaration {
            Declaration::Datatype { constructors } => {
                types.insert(
                    id.clone(),
                    constructors
                        .iter()
                        .map(|c| {
                            c.fields
                                .iter()
                                .map(|s| {
                                    if *s == Sort::SelfType {
                                        Sort::Data(id.clone())
                                    } else {
                                        s.clone()
                                    }
                                })
                                .collect::<Vec<_>>()
                        })
                        .collect::<Vec<_>>(),
                );
            }
            Declaration::Function { params, body, .. } => {
                let mut env = BTreeMap::new();
                let mut args = vec![];
                for (n, _) in params {
                    let v = lower.fresh();
                    env.insert(n.clone(), v.clone());
                    args.push(v);
                }
                let mut lines = String::new();
                let value = lower.expr(body, &env, &id, &mut lines, 0)?;
                source.push_str(&format!("function d_{id}(ctx{}){{if(--ctx.fuel<0)throw Error('definition execution budget');{lines}return {value};}}\n",if args.is_empty(){String::new()}else{format!(",{}",args.join(","))}));
            }
            _ => return Err("non-executable selected definition".into()),
        }
    }
    source.push_str(&format!(
        "const __defTypes={};\n",
        serde_json::to_string(&types).map_err(|e| e.to_string())?
    ));
    source.push_str("const __defExports=new Map([\n");
    for id in checked.exports() {
        let Declaration::Function { params, .. } = &objects[id].declaration else {
            return Err("definition export is not a function".into());
        };
        source.push_str(&format!(
            "[{},{{params:{},fn:d_{}}}],\n",
            q(id),
            serde_json::to_string(&params.iter().map(|(_, s)| s).collect::<Vec<_>>()).unwrap(),
            checked.choices().get(id).unwrap_or(id)
        ));
    }
    source.push_str("]);\n");
    if source.len() > 16000000 {
        return Err("definition source size limit".into());
    }
    let identity = ink_core::registry::identity(&(
        "ink-sealed-executable-v1",
        checked.bundle_sha256(),
        checked.exports(),
        checked.choices(),
    ))?;
    Ok(Emission {
        manifest: json!({"schema":1,"semantics":"ink-definition-javascript-v1","executable":identity,"exports":checked.exports(),"checked_closure":checked.closure(),"executable_closure":lower.selected,"trusted":["literal JavaScript emitter","value codecs","JavaScript engine"]}),
        javascript: source,
    })
}
