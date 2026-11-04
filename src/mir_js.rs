//! A thin JavaScript printer over the mid-level IR (docs/mid-level-ir.md).
//!
//! The printer makes no decisions: each node becomes one binding, `gamma`
//! becomes `if`/`else` over its branch regions (keeping laziness), `lambda`
//! becomes a curried arrow, and calls print as calls. Values use the compiled
//! JavaScript host's conventions (u32 and f32 as Numbers, enums as
//! `"Enum.Variant"`, Option/Result as `{Some}`/`{None}`/`{Ok}`/`{Err}`, records
//! as objects, lists as arrays). It covers pure functions over Bool, u32, f32,
//! String, enums, records, Option, Result and lists; anything else fails
//! closed. It is a demonstration that backends can print the IR, checked
//! against the reference evaluator by tests/mid_level_ir.rs, not a replacement
//! for the pinned JavaScript lowering.
use ink_core::{
    core::{Expr, Type},
    mir::{Graph, Kind, Mir, Node, Op, Region},
    LangResult,
};
use std::collections::BTreeSet;

const HELPERS: &str = "const __eq=(a,b)=>{if(a===b)return true;if(typeof a!=='object'||typeof b!=='object'||a===null||b===null)return false;const ka=Object.keys(a),kb=Object.keys(b);return ka.length===kb.length&&ka.every(k=>Object.hasOwn(b,k)&&__eq(a[k],b[k]));};\nconst __utf8=s=>new TextEncoder().encode(s);\n";

fn name(f: &str) -> String {
    format!("f_{}", f.replace(|c: char| !c.is_ascii_alphanumeric() && c != '_', "_"))
}

fn primitive(t: &Option<Type>) -> bool {
    matches!(t, Some(Type::U32 | Type::F32 | Type::Bool | Type::String | Type::Named(_)))
}

struct Printer<'a> {
    graphs: &'a [Graph],
    records: &'a std::collections::BTreeMap<String, Vec<(String, Type)>>,
    out: String,
    calls: BTreeSet<String>,
}

impl Printer<'_> {
    fn ty(&self, r: &Region, id: u32) -> Option<Type> {
        fn find(r: &Region, id: u32) -> Option<Option<Type>> {
            for n in &r.nodes {
                if n.id == id {
                    return Some(n.ty.clone());
                }
                for inner in &n.regions {
                    if let Some(t) = find(inner, id) {
                        return Some(t);
                    }
                }
            }
            None
        }
        find(r, id).flatten()
    }

    fn region(&mut self, root: &Region, r: &Region, indent: usize) -> LangResult<()> {
        for n in &r.nodes {
            self.node(root, n, indent)?;
        }
        Ok(())
    }

    fn node(&mut self, root: &Region, n: &Node, indent: usize) -> LangResult<()> {
        let pad = " ".repeat(indent);
        let v = |i: usize| format!("v{}", n.inputs[i]);
        let operand = n.inputs.first().and_then(|x| self.ty(root, *x)).or_else(|| n.inputs.get(1).and_then(|x| self.ty(root, *x)));
        let expr = match &n.op {
            Op::Param { .. } => return Ok(()),
            Op::Const { value } => match value {
                Expr::Num(x) if matches!(n.ty, None | Some(Type::U32)) && *x <= u32::MAX as u64 => x.to_string(),
                Expr::Float(bits) => {
                    let x = f32::from_bits(*bits);
                    if x.is_nan() { "NaN".into() } else if x.is_infinite() { if x > 0.0 { "Infinity".into() } else { "-Infinity".into() } } else if x == 0.0 && x.is_sign_negative() { "-0".into() } else { format!("Math.fround({x:?})") }
                }
                Expr::Bool(b) => b.to_string(),
                Expr::String(s) => serde_json::to_string(s).unwrap(),
                Expr::Unit => "null".into(),
                Expr::Var(x) if x == "None" => "{None: null}".into(),
                Expr::Field(e, variant) => match e.as_ref() {
                    Expr::Var(en) => serde_json::to_string(&format!("{en}.{variant}")).unwrap(),
                    _ => return Err("mir-js: unsupported constant".into()),
                },
                other => return Err(format!("mir-js: unsupported constant {other:?}")),
            },
            Op::Binary { operator } => {
                let (a, b) = (v(0), v(1));
                match (operand.clone(), operator.as_str()) {
                    (Some(Type::U32), "+") => format!("(({a} + {b}) >>> 0)"),
                    (Some(Type::U32), "-") => format!("(({a} - {b}) >>> 0)"),
                    (Some(Type::U32), "*") => format!("(Math.imul({a}, {b}) >>> 0)"),
                    (Some(Type::U32), op @ ("&" | "|" | "^")) => format!("(({a} {op} {b}) >>> 0)"),
                    (Some(Type::F32), op @ ("+" | "-" | "*" | "/")) => format!("Math.fround({a} {op} {b})"),
                    (Some(Type::U32 | Type::F32), op @ ("<" | "<=" | ">" | ">=")) => format!("({a} {op} {b})"),
                    (t, "==") if primitive(&t) => format!("({a} === {b})"),
                    (t, "!=") if primitive(&t) => format!("({a} !== {b})"),
                    (Some(_), "==") => format!("__eq({a}, {b})"),
                    (Some(_), "!=") => format!("!__eq({a}, {b})"),
                    (t, op) => return Err(format!("mir-js: unsupported operator {op} on {t:?}")),
                }
            }
            Op::Neg if operand == Some(Type::F32) => format!("Math.fround(-{})", v(0)),
            Op::Call { function } => {
                self.calls.insert(function.clone());
                format!("{}({})", name(function), n.inputs.iter().map(|x| format!("v{x}")).collect::<Vec<_>>().join(", "))
            }
            Op::Builtin { name: b } => match (b.as_str(), n.inputs.len()) {
                ("Some" | "Ok" | "Err", 1) => format!("{{{b}: {}}}", v(0)),
                ("string_byte_len", 1) => format!("__utf8({}).length", v(0)),
                ("string_concat", 2) => format!("({} + {})", v(0), v(1)),
                ("length", 1) => format!("{}.length", v(0)),
                ("f32_div", 2) => format!("Math.fround({} / {})", v(0), v(1)),
                ("f32_sqrt", 1) => format!("Math.fround(Math.sqrt({}))", v(0)),
                ("foldl", 3) => format!("{}.reduce((acc, x) => {}(x)(acc), {})", v(0), v(2), v(1)),
                _ => return Err(format!("mir-js: unsupported builtin {b}")),
            },
            Op::Method { name: m } => match (m.as_str(), n.inputs.len()) {
                ("unwrap_or", 2) => format!("(Object.hasOwn({0}, 'Some') ? {0}.Some : {1})", v(0), v(1)),
                ("fold", 3) => format!("(Object.hasOwn({0}, 'Some') ? {1}({0}.Some) : Object.hasOwn({0}, 'Ok') ? {1}({0}.Ok) : Object.hasOwn({0}, 'Err') ? {2}({0}.Err) : {2}(null))", v(0), v(1), v(2)),
                ("at_or", 3) => format!("({1} < {0}.length ? {0}[{1}] : {2})", v(0), v(1), v(2)),
                ("concat", 2) => format!("[...{}, ...{}]", v(0), v(1)),
                _ => return Err(format!("mir-js: unsupported method {m}")),
            },
            Op::Field { name: f } => format!("{}[{}]", v(0), serde_json::to_string(f).unwrap()),
            Op::Record { name: r, fields } => {
                if !self.records.contains_key(r) {
                    return Err(format!("mir-js: unknown record {r}"));
                }
                let parts: Vec<String> = fields.iter().zip(&n.inputs).map(|(f, x)| format!("{}: v{x}", serde_json::to_string(f).unwrap())).collect();
                format!("{{{}}}", parts.join(", "))
            }
            Op::Lambda { params } => {
                self.out.push_str(&format!("{pad}const v{} = ", n.id));
                for p in params {
                    let id = n.regions[0].nodes.iter().find(|x| matches!(&x.op, Op::Param { name } if name == p)).map(|x| x.id).ok_or("mir-js: lambda parameter")?;
                    self.out.push_str(&format!("(v{id}) => "));
                }
                self.out.push_str("{\n");
                self.region(root, &n.regions[0], indent + 2)?;
                self.out.push_str(&format!("{pad}  return v{};\n{pad}}};\n", n.regions[0].result.ok_or("mir-js: lambda result")?));
                return Ok(());
            }
            Op::Gamma => {
                self.out.push_str(&format!("{pad}let v{};\n{pad}if ({}) {{\n", n.id, v(0)));
                self.region(root, &n.regions[0], indent + 2)?;
                self.out.push_str(&format!("{pad}  v{} = v{};\n{pad}}} else {{\n", n.id, n.regions[0].result.ok_or("mir-js: branch result")?));
                self.region(root, &n.regions[1], indent + 2)?;
                self.out.push_str(&format!("{pad}  v{} = v{};\n{pad}}}\n", n.id, n.regions[1].result.ok_or("mir-js: branch result")?));
                return Ok(());
            }
            other => return Err(format!("mir-js: {} is not a pure operation", serde_json::to_string(other).unwrap_or_default())),
        };
        self.out.push_str(&format!("{pad}const v{} = {expr};\n", n.id));
        Ok(())
    }

    fn graph(&mut self, g: &Graph) -> LangResult<()> {
        if g.kind != Kind::Function {
            return Err(format!("mir-js: {} is not a pure function", g.name));
        }
        let params: Vec<String> = g.body.nodes.iter().filter(|n| matches!(n.op, Op::Param { .. })).take(g.params.len()).map(|n| format!("v{}", n.id)).collect();
        self.out.push_str(&format!("function {}({}) {{\n", name(&g.name), params.join(", ")));
        self.region(&g.body, &g.body, 2)?;
        self.out.push_str(&format!("  return v{};\n}}\n", g.body.result.ok_or("mir-js: function result")?));
        Ok(())
    }
}

/// An ES module exporting `call(name, args)` for `function` and every
/// function it reaches.
pub fn module(m: &Mir, records: &std::collections::BTreeMap<String, Vec<(String, Type)>>, function: &str) -> LangResult<String> {
    let mut p = Printer { graphs: &m.graphs, records, out: HELPERS.to_string(), calls: BTreeSet::new() };
    let mut done = BTreeSet::new();
    let mut pending = vec![function.to_string()];
    while let Some(f) = pending.pop() {
        if !done.insert(f.clone()) {
            continue;
        }
        let g = p.graphs.iter().find(|g| g.name == f).ok_or_else(|| format!("mir-js: {f} is not in the IR ({})", m.unsupported.get(&f).cloned().unwrap_or_default()))?;
        p.graph(g)?;
        pending.extend(std::mem::take(&mut p.calls));
    }
    let names: Vec<String> = done.iter().map(|f| format!("{}: {}", serde_json::to_string(f).unwrap(), name(f))).collect();
    p.out.push_str(&format!("const table = {{{}}};\nexport function call(name, args) {{ return table[name](...args); }}\n", names.join(", ")));
    Ok(p.out)
}
