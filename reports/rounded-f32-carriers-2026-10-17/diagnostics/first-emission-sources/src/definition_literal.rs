//! Literal JavaScript bodies with an explicit call stack for inductive recursion.
//! No definition image, term evaluator, proof metadata or identity dispatcher.
use ink_core::{
    definition::CheckedDefinition,
    logic::{Declaration, Term},
    LangResult,
};
use std::{collections::BTreeMap, fmt::Write};
struct Lower {
    next: usize,
    generators: std::collections::BTreeSet<String>,
    direct: bool,
}
impl Lower {
    fn expr(
        &mut self,
        t: &Term,
        env: &BTreeMap<String, String>,
        current: &str,
        out: &mut String,
    ) -> LangResult<String> {
        if self.next > 100_000 {
            return Err("literal JS emission limit".into());
        }
        let name = format!("v{}", self.next);
        self.next += 1;
        if let Term::Var(n) = t {
            return env.get(n).cloned().ok_or("literal JS variable".into());
        }
        let value = match t {
            Term::Bool(b) => b.to_string(),
            Term::U64(n) => format!("{n}n"),
            Term::Construct {
                constructor,
                arguments,
                ..
            } => {
                let xs = arguments
                    .iter()
                    .map(|a| self.expr(a, env, current, out))
                    .collect::<LangResult<Vec<_>>>()?;
                if xs.is_empty() {
                    format!("__nullaryNode({constructor})")
                } else {
                    format!("__node({constructor},[{}])", xs.join(","))
                }
            }
            Term::Call { arguments, .. } | Term::SelfCall(arguments) => {
                let id = if let Term::Call { function, .. } = t {
                    function
                } else {
                    current
                };
                let xs = arguments
                    .iter()
                    .map(|a| self.expr(a, env, current, out))
                    .collect::<LangResult<Vec<_>>>()?;
                let recursive_lane = self.generators.contains(id);
                format!("{}{}_{id}({})",
                    if recursive_lane && !self.direct { "yield " } else { "" },
                    if recursive_lane && self.direct { "dFast" } else { "d" },
                    xs.join(","))
            }
            Term::Binary { op, left, right } => {
                let a = self.expr(left, env, current, out)?;
                let b = self.expr(right, env, current, out)?;
                if let Some(operator) = op.strip_prefix("f32:") {
                    format!("__fpWord({operator:?},{a},{b})")
                } else if op == "quot" || op == "rem" {
                    format!(
                        "({b}===0n?0n:({a} {} {b}))",
                        if op == "quot" { "/" } else { "%" }
                    )
                } else if ["+", "-", "*", "&"].contains(&op.as_str()) {
                    format!("BigInt.asUintN(64,({a}){op}({b}))")
                } else {
                    let op = match op.as_str() {
                        "==" => "===",
                        "!=" => "!==",
                        x => x,
                    };
                    format!("({a}){op}({b})")
                }
            }
            Term::If {
                condition,
                on_true,
                on_false,
            } => {
                let c = self.expr(condition, env, current, out)?;
                writeln!(out, "let {name};if({c}){{").unwrap();
                let a = self.expr(on_true, env, current, out)?;
                writeln!(out, "{name}={a};}}else{{").unwrap();
                let b = self.expr(on_false, env, current, out)?;
                writeln!(out, "{name}={b};}}").unwrap();
                return Ok(name);
            }
            Term::Match {
                scrutinee,
                branches,
            } => {
                let c = self.expr(scrutinee, env, current, out)?;
                writeln!(out, "let {name};switch({c}.c){{").unwrap();
                for (i, b) in branches.iter().enumerate() {
                    let mut local = env.clone();
                    for (j, n) in b.bindings.iter().enumerate() {
                        local.insert(n.clone(), format!("{c}.a[{j}]"));
                    }
                    writeln!(out, "case {i}:{{").unwrap();
                    let x = self.expr(&b.body, &local, current, out)?;
                    writeln!(out, "{name}={x};break;}}").unwrap();
                }
                out.push_str("default:throw Error('literal constructor projection');}\n");
                return Ok(name);
            }
            Term::Var(_) => unreachable!(),
        };
        writeln!(out, "const {name}={value};").unwrap();
        Ok(name)
    }
}
pub(crate) fn lower(
    checked: &CheckedDefinition,
    queries: &BTreeMap<String, Declaration>,
) -> LangResult<String> {
    let mut ds = checked.reachable_executable_declarations()?;
    ds.extend(queries.clone());
    let exports = checked
        .exports()
        .iter()
        .chain(queries.iter().filter_map(|(id,d)| matches!(d,Declaration::Function{..}).then_some(id)))
        .collect::<Vec<_>>();
    // Carriers remain private. Codecs capture inputs and construct owned public
    // outputs; literal bodies only construct/read nodes. No node is mutated.
    let mut out=String::from("const __nullaryNodes=[];\nfunction __nullaryNode(c){return __nullaryNodes[c]??=({c,a:[]});}\nfunction __node(c,a){return a.length===0?__nullaryNode(c):{c,a};}\nconst __deepCall=Symbol('private direct-call depth');let __directDepth=0;\nfunction __run(call){const stack=[call];let result;while(stack.length){const frame=stack[stack.length-1],step=frame.next(result);if(step.done){result=step.value;stack.pop();}else{result=undefined;stack.push(step.value);}}return result;}\n");
    fn calls(t: &Term, ids: &mut std::collections::BTreeSet<String>) {
        ink_core::logic::walk_term(t, |node| {
            if let Term::Call { function, .. } = node { ids.insert(function.clone()); }
        });
    }
    fn self_call(t: &Term) -> bool {
        let mut found = false;
        ink_core::logic::walk_term(t, |node| found |= matches!(node, Term::SelfCall(_)));
        found
    }
    let mut generators = ds
        .iter()
        .filter_map(|(id, d)| {
            matches!(d, Declaration::Function { body, .. } if self_call(body))
            .then_some(id.clone())
        })
        .collect::<std::collections::BTreeSet<_>>();
    loop {
        let mut changed = false;
        for (id, d) in &ds {
            if let Declaration::Function { body, .. } = d {
                let mut ids = std::collections::BTreeSet::new();
                calls(body, &mut ids);
                if ids.iter().any(|x| generators.contains(x)) {
                    changed |= generators.insert(id.clone());
                }
            }
        }
        if !changed {
            break;
        }
    }
    let mut lower = Lower {
        next: 0,
        generators,
        direct: false,
    };
    out.push_str(include_str!("definition-f32.mjs.txt"));
    for (id, d) in &ds {
        if let Declaration::Function { params, body, .. } = d {
            let env = params
                .iter()
                .enumerate()
                .map(|(i, (n, _))| (n.clone(), format!("a{i}")))
                .collect();
            let inputs = (0..params.len())
                .map(|i| format!("a{i}"))
                .collect::<Vec<_>>()
                .join(",");
            let mut code = String::new();
            let result = lower.expr(body, &env, id, &mut code)?;
            writeln!(
                out,
                "function{} d_{id}({inputs}){{{code}return {result};}}",
                if lower.generators.contains(id) {
                    "*"
                } else {
                    ""
                }
            )
            .unwrap();
        }
    }
    // Checked definitions are pure and carriers remain private. Shallow
    // recursion can use ordinary JS calls. A private depth sentinel unwinds the
    // whole attempted evaluation and replays it on the existing explicit stack;
    // neither source errors nor arbitrary host exceptions trigger replay.
    let mut fast_code = String::new();
    let mut direct = Lower { next: 0, generators: lower.generators.clone(), direct: true };
    for (id, d) in &ds {
        if !direct.generators.contains(id) { continue; }
        if let Declaration::Function { params, body, .. } = d {
            let env = params.iter().enumerate().map(|(i,(n,_))|(n.clone(),format!("a{i}"))).collect();
            let inputs = (0..params.len()).map(|i|format!("a{i}")).collect::<Vec<_>>().join(",");
            let mut code = String::new();
            let result = direct.expr(body, &env, id, &mut code)?;
            writeln!(fast_code,"function dFast_{id}({inputs}){{if(__directDepth>=128)throw __deepCall;__directDepth++;try{{{code}return {result};}}finally{{__directDepth--;}}}}").unwrap();
        }
    }
    let mut fast_exports = String::new();
    let mut stack_exports = String::new();
    for id in exports {
        let target = checked.choices().get(id).unwrap_or(id);
        let Declaration::Function { params, .. } = &ds[target] else {
            return Err("literal JS export".into());
        };
        let args = (0..params.len())
            .map(|i| format!("a{i}"))
            .collect::<Vec<_>>()
            .join(",");
        let stack_call = if lower.generators.contains(target) {
            format!("__run(d_{target}({args}))")
        } else { format!("d_{target}({args})") };
        writeln!(stack_exports,"function f_{id}({args}){{return {stack_call};}}").unwrap();
        if lower.generators.contains(target) {
            writeln!(fast_exports,"function f_{id}({args}){{try{{return dFast_{target}({args});}}catch(error){{if(error!==__deepCall)throw error;return __run(d_{target}({args}));}}}}").unwrap();
        } else {
            writeln!(fast_exports,"function f_{id}({args}){{return d_{target}({args});}}").unwrap();
        }
    }
    if out.len() + fast_code.len() + fast_exports.len() <= 16_000_000 {
        out.push_str(&fast_code);
        out.push_str(&fast_exports);
    } else {
        // The optional fast lane cannot reduce previously supported source size.
        out.push_str(&stack_exports);
    }
    if out.len() > 16_000_000 {
        return Err("literal JS source limit".into());
    }
    Ok(out)
}
