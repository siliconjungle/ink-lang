pub use crate::surface::SurfaceProgram;
mod query;
use crate::LangResult;
use sha2::{Digest, Sha256};
// Compatibility re-exports: the parser no longer owns executable IR types.
pub use crate::core::{
    Action, ActionKind, BindingDecl, Expr, Function, Program, Rewrite, Statement, Type,
};

#[derive(Clone, Debug)]
struct Token {
    text: String,
    offset: usize,
}

fn lex(source: &str) -> LangResult<Vec<Token>> {
    let b = source.as_bytes();
    let mut p = 0;
    let mut ts = Vec::new();
    while p < b.len() {
        if b[p].is_ascii_whitespace() {
            p += 1;
            continue;
        }
        if source[p..].starts_with("//") {
            while p < b.len() && b[p] != b'\n' {
                p += 1;
            }
            continue;
        }
        if source[p..].starts_with("/*") {
            let end = source[p + 2..]
                .find("*/")
                .ok_or_else(|| format!("unclosed comment at byte {p}"))?;
            p += end + 4;
            continue;
        }
        let start = p;
        if b[p] == b'"' {
            p += 1;
            let mut closed = false;
            while p < b.len() {
                if b[p] == b'\\' {
                    p += 2;
                } else if b[p] == b'"' {
                    p += 1;
                    closed = true;
                    break;
                } else {
                    p += 1;
                }
            }
            if !closed {
                return Err(format!("unclosed string at byte {start}"));
            }
        } else if b[p].is_ascii_alphabetic() || b[p] == b'_' {
            p += 1;
            while p < b.len() && (b[p].is_ascii_alphanumeric() || b[p] == b'_') {
                p += 1;
            }
        } else if b[p].is_ascii_digit() {
            p += 1;
            while p < b.len() && (b[p].is_ascii_alphanumeric() || b[p] == b'_') {
                p += 1;
            }
            if !source[start..p].starts_with("0x") {
                if p + 1 < b.len() && b[p] == b'.' && b[p + 1].is_ascii_digit() {
                    p += 1;
                    while p < b.len() && (b[p].is_ascii_digit() || b[p] == b'_') {
                        p += 1;
                    }
                }
                if p < b.len() && (b[p] == b'e' || b[p] == b'E') {
                    p += 1;
                    if p < b.len() && (b[p] == b'+' || b[p] == b'-') {
                        p += 1;
                    }
                    while p < b.len() && b[p].is_ascii_digit() {
                        p += 1;
                    }
                }
                // An exponent immediately following integer digits was consumed
                // above; its sign/digits still belong to this numeric token.
                if p > start && (b[p - 1] == b'e' || b[p - 1] == b'E') {
                    if p < b.len() && (b[p] == b'+' || b[p] == b'-') {
                        p += 1;
                    }
                    while p < b.len() && b[p].is_ascii_digit() {
                        p += 1;
                    }
                }
            }
        } else if ["->", "=>", "==", "!=", "<=", ">=", "&&", "||", ".."]
            .iter()
            .any(|s| source[p..].starts_with(s))
        {
            p += 2;
        } else if b";:,.(){}[]<>+-*/!=?&|^~".contains(&b[p]) {
            p += 1;
        } else {
            return Err(format!("unsupported character at byte {p}"));
        }
        ts.push(Token {
            text: source[start..p].into(),
            offset: start,
        });
        if ts
            .last()
            .is_some_and(|t| !t.text.starts_with('"') && t.text.len() > 128)
        {
            return Err(format!("token length limit at byte {start}"));
        }
    }
    ts.push(Token {
        text: "<eof>".into(),
        offset: p,
    });
    Ok(ts)
}

struct Parser {
    ts: Vec<Token>,
    at: usize,
    depth: usize,
    records: std::collections::BTreeSet<String>,
    fresh: usize,
    aliases: std::collections::BTreeMap<String, Type>,
    parameters: std::collections::BTreeMap<String, Vec<String>>,
    applications: std::collections::BTreeMap<String, (String, Vec<Type>)>,
    application_prefix: String,
    mutables: std::collections::BTreeMap<String, Type>,
    assignments: std::collections::BTreeMap<String, String>,
    generated_records: std::collections::BTreeMap<String, Vec<(String, Type)>>,
    generic_scope: Vec<String>,
    pure: bool,
    state_names: std::collections::BTreeSet<String>,
    callback_types: std::collections::BTreeMap<String, (Type, Type)>,
    payload_enums: std::collections::BTreeMap<String, Vec<String>>,
    matches: std::collections::BTreeMap<String, Vec<(String, String, Vec<String>)>>,
    constant_parameters: std::collections::BTreeMap<String, std::collections::BTreeSet<String>>,
    constant_scope: std::collections::BTreeSet<String>,
    /// External law sources accept `law` declarations; executable ones never do.
    law_mode: bool,
    laws: Vec<crate::law_syntax::LawDecl>,
}
impl Parser {
    // Precedence parsing builds left-associated and postfix chains in a loop,
    // so parser call depth alone does not bound the resulting AST. Check each
    // partial expression before extending it again; even an error then drops
    // only a bounded tree. This walk itself uses an explicit stack.
    fn bounded_expression(&self, expression: &Expr) -> LangResult<()> {
        let mut pending = vec![(expression, 0usize)];
        let mut nodes = 0usize;
        let mut bytes = 0usize;
        while let Some((e, depth)) = pending.pop() {
            nodes += 1;
            bytes = bytes.saturating_add(expression_weight(e));
            if nodes > 100_000 || bytes > 16_000_000 {
                return Err(self.err("expression elaboration size limit exceeded"));
            }
            if depth > 128 {
                return Err(self.err("expression tree nesting limit exceeded"));
            }
            let next = depth + 1;
            match e {
                Expr::Neg(a) | Expr::Lambda(_, a) | Expr::Field(a, _) | Expr::Try(a) => {
                    pending.push((a, next));
                }
                Expr::Binary(_, a, b) | Expr::Let(_, _, a, b) => {
                    pending.extend([(a.as_ref(), next), (b.as_ref(), next)]);
                }
                Expr::Call(_, args) => pending.extend(args.iter().map(|a| (a, next))),
                Expr::Method(receiver, _, args) => {
                    pending.push((receiver, next));
                    pending.extend(args.iter().map(|a| (a, next)));
                }
                Expr::Record(_, fields) => pending.extend(fields.iter().map(|(_, a)| (a, next))),
                _ => (),
            }
        }
        Ok(())
    }
    fn peek(&self) -> &str {
        &self.ts[self.at].text
    }
    fn err(&self, s: &str) -> String {
        format!(
            "{s} at byte {} (found '{}')",
            self.ts[self.at].offset,
            self.peek()
        )
    }
    fn take(&mut self) -> String {
        let s = self.peek().to_owned();
        if self.at + 1 < self.ts.len() {
            self.at += 1;
        }
        s
    }
    fn eat(&mut self, s: &str) -> bool {
        if self.peek() == s {
            self.take();
            true
        } else {
            false
        }
    }
    fn expect(&mut self, s: &str) -> LangResult<()> {
        // A type's closing bracket followed immediately by an initializer is
        // punctuation, not an expression comparison.
        if s == ">" && self.peek() == ">=" {
            self.ts[self.at].text = "=".into();
            self.ts[self.at].offset += 1;
            return Ok(());
        }
        if self.eat(s) {
            Ok(())
        } else {
            Err(self.err(&format!("expected '{s}'")))
        }
    }
    fn name(&mut self) -> LangResult<String> {
        let s = self.peek();
        if s.as_bytes()
            .first()
            .is_some_and(|x| x.is_ascii_alphabetic() || *x == b'_')
        {
            Ok(self.take())
        } else {
            Err(self.err("expected identifier"))
        }
    }
    fn ty(&mut self) -> LangResult<Type> {
        self.depth += 1;
        if self.depth > 128 {
            return Err(self.err("type nesting limit exceeded"));
        }
        let result = match self.take().as_str() {
            s if s.bytes().all(|c| c.is_ascii_digit()) => {
                let n = s
                    .parse::<u32>()
                    .map_err(|_| "constant type argument outside u32")?;
                Ok(Type::Named(format!("__ink_constant_{n}")))
            }
            "fn" => {
                self.expect("(")?;
                let input = self.ty()?;
                // Multi-argument signatures use existing curried callback types.
                let mut rest = vec![];
                while self.eat(",") {
                    rest.push(self.ty()?);
                }
                self.expect(")")?;
                self.expect("->")?;
                let mut output = self.ty()?;
                for later in rest.into_iter().rev() {
                    let name = format!(
                        "__ink_callback_type_{}_{}",
                        self.application_prefix, self.fresh
                    );
                    self.fresh += 1;
                    self.callback_types.insert(name.clone(), (later, output));
                    output = Type::Named(name);
                }
                let name = format!(
                    "__ink_callback_type_{}_{}",
                    self.application_prefix, self.fresh
                );
                self.fresh += 1;
                self.callback_types.insert(name.clone(), (input, output));
                Ok(Type::Named(name))
            }
            "u64" => Ok(Type::U64),
            "u32" => Ok(Type::U32),
            "i32" => Ok(Type::I32),
            "f32" => Ok(Type::F32),
            kind @ ("Vec2" | "Vec3" | "Vec4") => {
                self.expect("<")?;
                let t = self.ty()?;
                self.expect(">")?;
                Ok(Type::Vector(Box::new(t), kind.as_bytes()[3] - b'0'))
            }
            "Int" => Ok(Type::Int),
            "Unit" => Ok(Type::Unit),
            "String" => Ok(Type::String),
            "Bool" => Ok(Type::Bool),
            kind @ ("List" | "Buffer" | "Option") => {
                self.expect("<")?;
                let t = self.ty()?;
                self.expect(">")?;
                Ok(if kind == "Buffer" {
                    Type::Buffer(Box::new(t))
                } else if kind == "List" {
                    Type::List(Box::new(t))
                } else {
                    Type::Option(Box::new(t))
                })
            }
            kind @ ("Result" | "Map" | "Table") => {
                self.expect("<")?;
                let a = self.ty()?;
                self.expect(",")?;
                let b = self.ty()?;
                self.expect(">")?;
                Ok(if kind == "Map" {
                    Type::Map(Box::new(a), Box::new(b))
                } else if kind == "Result" {
                    Type::Result(Box::new(a), Box::new(b))
                } else {
                    Type::Table(Box::new(a), Box::new(b))
                })
            }
            s if s
                .as_bytes()
                .first()
                .is_some_and(|c| c.is_ascii_alphabetic() || *c == b'_') =>
            {
                let name = s.to_owned();
                if self.peek() == "<" {
                    let args = self.type_arguments()?;
                    Ok(Type::Named(self.application(name, args)?))
                } else {
                    Ok(Type::Named(name))
                }
            }
            s => Err(format!("invalid type {s}")),
        };
        self.depth -= 1;
        result
    }
    fn params(&mut self) -> LangResult<Vec<(String, Type)>> {
        self.expect("(")?;
        let mut ps = Vec::new();
        if !self.eat(")") {
            loop {
                let n = self.name()?;
                self.expect(":")?;
                let t = self.ty()?;
                ps.push((n, t));
                if self.eat(")") {
                    break;
                }
                self.expect(",")?;
            }
        }
        Ok(ps)
    }
    fn type_arguments(&mut self) -> LangResult<Vec<Type>> {
        self.expect("<")?;
        let mut args = vec![];
        loop {
            if args.len() >= 16 {
                return Err(self.err("generic argument limit exceeded"));
            }
            args.push(self.ty()?);
            if self.peek() == ">" || self.peek() == ">=" {
                self.expect(">")?;
                break;
            }
            self.expect(",")?;
        }
        Ok(args)
    }
    fn type_parameters(&mut self, name: &str) -> LangResult<()> {
        if !self.eat("<") {
            return Ok(());
        }
        let mut vars = vec![];
        let mut constants = std::collections::BTreeSet::new();
        loop {
            if vars.len() >= 16 {
                return Err(self.err("generic parameter limit exceeded"));
            }
            let constant = self.eat("const");
            let n = self.name()?;
            if constant {
                self.expect(":")?;
                self.expect("u32")?;
                constants.insert(n.clone());
            }
            vars.push(n);
            if self.peek() == ">" || self.peek() == ">=" {
                self.expect(">")?;
                break;
            }
            self.expect(",")?;
        }
        if self.parameters.insert(name.into(), vars).is_some() {
            return Err(self.err("duplicate generic declaration"));
        }
        if !constants.is_empty() {
            self.constant_parameters.insert(name.into(), constants);
        }
        Ok(())
    }
    fn application(&mut self, name: String, args: Vec<Type>) -> LangResult<String> {
        if self.applications.len() >= 4096 {
            return Err(self.err("surface application limit exceeded"));
        }
        let key = format!(
            "__ink_application_{}_{}",
            self.application_prefix,
            self.applications.len()
        );
        if self.ts.iter().any(|t| t.text == key) {
            return Err(self.err("generated application name collision"));
        }
        self.applications.insert(key.clone(), (name, args));
        Ok(key)
    }
    fn applied_expression(&self) -> bool {
        if self.peek() != "<" {
            return false;
        }
        let mut nesting = 0;
        for (i, token) in self.ts[self.at..].iter().take(128).enumerate() {
            match token.text.as_str() {
                "<" => nesting += 1,
                ">" => {
                    nesting -= 1;
                    if nesting == 0 {
                        return self
                            .ts
                            .get(self.at + i + 1)
                            .is_some_and(|t| t.text == "(" || t.text == "{" || t.text == ".");
                    }
                }
                s if s.bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_') || s == "," => (),
                _ => return false,
            }
        }
        false
    }
    fn args(&mut self) -> LangResult<Vec<Expr>> {
        self.expect("(")?;
        let mut xs = Vec::new();
        if !self.eat(")") {
            loop {
                xs.push(self.expr(0)?);
                if self.eat(")") {
                    break;
                }
                self.expect(",")?;
            }
        }
        Ok(xs)
    }
    fn expr(&mut self, min: u8) -> LangResult<Expr> {
        self.depth += 1;
        if self.depth > 128 {
            return Err(self.err("expression nesting limit exceeded"));
        }
        let mut lhs = if self.ordered_query_start() {
            self.ordered_query()?
        } else if self.peek() == "exists" && self.ts.get(self.at + 1).is_some_and(|t| t.text == "{") {
            self.take();
            self.query_expression(None)?
        } else if self.eat("match") {
            self.match_expression()?
        } else if self.eat("~") {
            Expr::Call("word_not".into(), vec![self.expr(11)?])
        } else if self.eat("!") {
            Expr::Binary(
                "==".into(),
                Box::new(self.expr(11)?),
                Box::new(Expr::Bool(false)),
            )
        } else if self.eat("if") {
            let condition = self.expr(0)?;
            let yes = self.branch_expression()?;
            self.expect("else")?;
            let no = self.branch_expression()?;
            Expr::Call("choose".into(), vec![condition, yes, no])
        } else if self.eat("[") {
            let mut items = Vec::new();
            if !self.eat("]") {
                loop {
                    items.push(self.expr(0)?);
                    if self.eat("]") {
                        break;
                    }
                    self.expect(",")?;
                    if self.eat("]") {
                        break;
                    }
                }
            }
            Expr::Call("list".into(), items)
        } else if self.eat("-") {
            Expr::Neg(Box::new(self.expr(11)?))
        } else if self.eat("(") {
            if self.eat(")") {
                Expr::Unit
            } else {
                let e = self.expr(0)?;
                self.expect(")")?;
                e
            }
        } else if self.peek().starts_with('"') {
            Expr::String(
                serde_json::from_str(&self.take()).map_err(|e| format!("invalid string: {e}"))?,
            )
        } else if self.eat("fn") {
            self.expect("(")?;
            let mut names = vec![self.name()?];
            // Multiple parameters elaborate to the same nested pure lambdas
            // in executable code and external laws.
            while self.eat(",") {
                names.push(self.name()?);
            }
            self.expect(")")?;
            self.expect("=>")?;
            let mut body = self.expr(0)?;
            for n in names.into_iter().rev() {
                body = Expr::Lambda(n, Box::new(body));
            }
            body
        } else if self.eat("true") {
            Expr::Bool(true)
        } else if self.eat("false") {
            Expr::Bool(false)
        } else if self.peek().as_bytes()[0].is_ascii_digit() {
            let s = self.take().replace('_', "");
            if !s.starts_with("0x") && (s.contains('.') || s.contains('e') || s.contains('E')) {
                let x = s
                    .parse::<f32>()
                    .map_err(|_| format!("invalid f32 literal {s}"))?;
                if !x.is_finite() {
                    return Err(self.err("f32 literal is outside finite range"));
                }
                Expr::Float(x.to_bits())
            } else {
                let n = if let Some(h) = s.strip_prefix("0x") {
                    u64::from_str_radix(h, 16)
                } else {
                    s.parse::<u64>()
                }
                .map_err(|_| format!("invalid u64 literal {s}"))?;
                Expr::Num(n)
            }
        } else {
            let base = self.name()?;
            let name = if self.applied_expression() {
                let args = self.type_arguments()?;
                self.application(base.clone(), args)?
            } else {
                base.clone()
            };
            if self.peek() == "{" && self.records.contains(&base) {
                self.expect("{")?;
                let mut fields = Vec::new();
                while !self.eat("}") {
                    let f = if self.eat("..") {
                        if !fields.is_empty() {
                            return Err(self.err("record update base must be first and unique"));
                        }
                        "..".into()
                    } else {
                        let f = self.name()?;
                        self.expect(":")?;
                        f
                    };
                    let value = self.expr(0)?;
                    fields.push((f, value));
                    if self.eat("}") {
                        break;
                    }
                    self.expect(",")?;
                }
                Expr::Record(name, fields)
            } else {
                Expr::Var(name)
            }
        };
        loop {
            self.bounded_expression(&lhs)?;
            if self.peek() == "(" {
                let name = if let Expr::Var(n) = lhs {
                    n
                } else {
                    return Err(self.err("only named functions can be called in this milestone"));
                };
                lhs = Expr::Call(name, self.args()?);
                continue;
            }
            if self.eat(".") {
                let m = self.name()?;
                lhs = if self.peek() == "(" {
                    Expr::Method(Box::new(lhs), m, self.args()?)
                } else {
                    Expr::Field(Box::new(lhs), m)
                };
                continue;
            }
            if self.eat("?") {
                lhs = Expr::Try(Box::new(lhs));
                continue;
            }
            let prec = match self.peek() {
                "||" => 1,
                "&&" => 2,
                "|" => 3,
                "^" => 4,
                "&" => 5,
                "==" | "!=" => 6,
                "<" | ">" | "<=" | ">=" => 7,
                "+" | "-" => 9,
                "*" | "/" => 10,
                _ => 0,
            };
            if prec == 0 || prec < min {
                break;
            }
            let op = self.take();
            let rhs = self.expr(prec + 1)?;
            lhs = if op=="/" { Expr::Call("f32_div".into(),vec![lhs,rhs]) } else if ["&", "|", "^"].contains(&op.as_str()) {
                Expr::Call(
                    match op.as_str() {
                        "&" => "word_and",
                        "|" => "word_or",
                        _ => "word_xor",
                    }
                    .into(),
                    vec![lhs, rhs],
                )
            } else {
                Expr::Binary(op, Box::new(lhs), Box::new(rhs))
            };
        }
        self.depth -= 1;
        Ok(lhs)
    }
    fn program(&mut self) -> LangResult<SurfaceProgram> {
        self.expect("module")?;
        let mut p = Program {
            module: self.name()?,
            ..Default::default()
        };
        while self.eat(".") {
            p.module.push('.');
            p.module.push_str(&self.name()?);
        }
        self.expect(";")?;
        let mut abstract_records=std::collections::BTreeMap::new();
        while self.peek() != "<eof>" {
            self.eat("pub");
            let abstract_record=self.eat("abstract");
            let refined = self.eat("refined");
            if refined && self.peek() != "record" { return Err(self.err("refined applies to record declarations")); }
            if abstract_record && self.peek() != "record" { return Err(self.err("abstract applies to record declarations")); }
            let private = self.eat("private");
            if private && self.peek() != "state" { return Err(self.err("private applies to state declarations")); }
            if private {
                p.contracts.private_states.push(self.ts.get(self.at + 1).ok_or("missing private state")?.text.clone());
            }
            if self.eat("spec") {
                let kind = match self.take().as_str() {
                    "fn" => None,
                    "change" => Some(ActionKind::Change),
                    "query" => Some(ActionKind::Query),
                    _ => return Err(self.err("spec requires fn, query or change")),
                };
                let name = self.name()?;
                self.type_parameters(&name)?;
                let params = self.params()?;
                self.expect("->")?;
                let result = self.ty()?;
                let (mut reads, mut writes, mut emits) = (vec![],vec![],vec![]);
                while ["reads","writes","emits"].contains(&self.peek()) {
                    let cap = self.take(); self.expect("(")?;
                    let mut ns = vec![];
                    if !self.eat(")") { loop { ns.push(self.name()?); if self.eat(")") { break; } self.expect(",")?; } }
                    match cap.as_str() { "reads" => reads.extend(ns), "writes" => writes.extend(ns), _ => emits.extend(ns) }
                }
                self.pure = kind.is_none();
                let (mut requires, mut ensures) = (vec![], vec![]);
                while ["requires","ensures","approximates"].contains(&self.peek()) {
                    if self.eat("approximates") {
                        let reference = self.expr(0)?;
                        self.expect("within")?;
                        let metric = self.take();
                        let (budget, denominator) = if metric == "relative" {
                            self.expect("(")?;
                            let numerator = self.expr(0)?;
                            self.expect(",")?;
                            let denominator = self.expr(0)?;
                            self.expect(")")?;
                            (numerator, Some(denominator))
                        } else { (self.expr(0)?, None) };
                        self.expect(";")?;
                        let names = [self.fresh_name(), self.fresh_name(), self.fresh_name(), self.fresh_name()];
                        ensures.push(if let Some(denominator) = denominator {
                            crate::approximation::relative(&result, reference, budget, denominator, names)?
                        } else { crate::approximation::predicate(&result, reference, &metric, budget, names)? });
                        if requires.len()+ensures.len()>64 { return Err(self.err("specification clause limit")); }
                        continue;
                    }
                    let pre = self.take() == "requires";
                    let predicate = self.expr(0)?; self.expect(";")?;
                    if pre { requires.push(predicate); } else { ensures.push(predicate); }
                    if requires.len()+ensures.len()>64 { return Err(self.err("specification clause limit")); }
                }
                self.eat(";");
                p.contracts.specifications.push(crate::contracts::Specification { name, kind, params, result, reads,writes,emits,requires,ensures });
            } else if self.eat("implementation") {
                let name = self.name()?; self.expect("for")?; let specification = self.name()?;
                self.mutables.clear();
                self.pure = p.contracts.specifications.iter().find(|s|s.name==specification).is_some_and(|s|s.kind.is_none());
                let body = self.block()?;
                p.contracts.implementations.push(crate::contracts::Implementation { name, specification, body });
            } else if self.eat("invariant") {
                p.contracts.invariants.push(self.expr(0)?); self.expect(";")?;
            } else if self.eat("fn") {
                let name = self.name()?;
                self.type_parameters(&name)?;
                let params = self.params()?;
                self.expect("->")?;
                let result = self.ty()?;
                self.mutables.clear();
                self.pure = true;
                self.generic_scope = self.parameters.get(&name).cloned().unwrap_or_default();
                self.constant_scope = self
                    .constant_parameters
                    .get(&name)
                    .cloned()
                    .unwrap_or_default();
                let (requires, ensures) = self.contracts()?;
                if self.eat("decreases") {
                    let measure = self.expr(0)?;
                    self.expect(";")?;
                    if p.termination.measures.insert(name.clone(), measure).is_some() {
                        return Err(self.err("duplicate termination measure"));
                    }
                }
                let statements = self.block()?;
                let body = self.pure_body(&statements, None)?;
                let body = self.contract_expression(body, &result, &requires, &ensures);
                p.functions.push(Function {
                    name,
                    params,
                    result,
                    body,
                });
            } else if self.eat("id") {
                let n = self.name()?;
                self.expect(";")?;
                p.ids.push(n);
            } else if self.eat("type") {
                let name = self.name()?;
                self.type_parameters(&name)?;
                self.expect("=")?;
                let ty = self.ty()?;
                self.expect(";")?;
                if self.aliases.insert(name.clone(), ty).is_some() {
                    return Err(format!("duplicate alias {name}"));
                }
            } else if self.eat("record") {
                let n = self.name()?;
                self.type_parameters(&n)?;
                self.expect("{")?;
                let mut fields = Vec::new();
                while !self.eat("}") {
                    let name = self.name()?;
                    self.expect(":")?;
                    let t = self.ty()?;
                    fields.push((name, t));
                    self.expect(",")?;
                }
                if p.records.insert(n.clone(), fields).is_some() {
                    return Err(format!("duplicate record {n}"));
                }
                if abstract_record {abstract_records.insert(n.clone(),p.module.clone());}
                if refined {
                    self.expect("invariant")?;
                    self.pure = true;
                    p.contracts.value_invariants.insert(n, self.expr(0)?);
                    self.expect(";")?;
                }
            } else if self.eat("enum") {
                let n = self.name()?;
                self.type_parameters(&n)?;
                self.expect("{")?;
                let mut vars = Vec::new();
                let mut payloads = Vec::new();
                let mut payload = false;
                while !self.eat("}") {
                    vars.push(self.name()?);
                    let mut fields = vec![];
                    if self.eat("(") {
                        payload = true;
                        if !self.eat(")") {
                            loop {
                                fields.push(self.ty()?);
                                if self.eat(")") {
                                    break;
                                }
                                self.expect(",")?;
                            }
                        }
                    }
                    payloads.push(fields);
                    self.expect(",")?;
                }
                if vars.is_empty()
                    || vars.len() > 64
                    || vars.iter().collect::<std::collections::BTreeSet<_>>().len() != vars.len()
                {
                    return Err(self.err("enum needs 1..64 distinct variants"));
                }
                if payload || self.parameters.contains_key(&n) {
                    let parameters = self.parameters.get(&n).cloned().unwrap_or_default();
                    let mut types = vec![];
                    for (i, fields) in payloads.into_iter().enumerate() {
                        // A nominal payload's identity depends on its declaring
                        // module/type/variant, not unrelated executable text.
                        // Its fields still bind the complete checked schema.
                        let stamp=serde_json::to_vec(&(&p.module,&n,&vars[i])).map_err(|e|e.to_string())?;
                        let record=format!("__ink_payload_{:x}",Sha256::digest(stamp));
                        if p.records.contains_key(&record) {return Err(self.err("generated payload name collision"));}
                        p.records.insert(
                            record.clone(),
                            fields
                                .into_iter()
                                .enumerate()
                                .map(|(i, t)| (format!("item{i}"), t))
                                .collect(),
                        );
                        let t = if parameters.is_empty() {
                            Type::Named(record)
                        } else {
                            self.parameters.insert(record.clone(), parameters.clone());
                            Type::Named(self.application(
                                record,
                                parameters.iter().cloned().map(Type::Named).collect(),
                            )?)
                        };
                        let _ = i;
                        types.push(t);
                    }
                    let mut sum = types.pop().unwrap();
                    for t in types.into_iter().rev() {
                        sum = Type::Result(Box::new(t), Box::new(sum));
                    }
                    if p.records
                        .insert(n.clone(), vec![("payload".into(), sum)])
                        .is_some()
                    {
                        return Err(format!("duplicate enum {n}"));
                    }
                    if self.payload_enums.insert(n, vars).is_some() {
                        return Err(self.err("duplicate payload enum"));
                    }
                } else if p.enums.insert(n.clone(), vars).is_some() {
                    return Err(format!("duplicate enum {n}"));
                }
            } else if self.peek() == "state" || self.peek() == "keep" {
                let kind = self.take();
                let name = self.name()?;
                self.expect(":")?;
                let ty = self.ty()?;
                self.expect("=")?;
                let value = self.expr(0)?;
                self.expect(";")?;
                let d = BindingDecl { name, ty, value };
                if kind == "state" {
                    p.states.push(d);
                } else {
                    p.keeps.push(d);
                }
            } else if self.eat("event") {
                let n = self.name()?;
                self.expect(":")?;
                let t = self.ty()?;
                self.expect(";")?;
                if p.events.insert(n.clone(), t).is_some() {
                    return Err(format!("duplicate event {n}"));
                }
            } else if self.peek() == "change" || self.peek() == "query" {
                let kind = if self.take() == "change" {
                    ActionKind::Change
                } else {
                    ActionKind::Query
                };
                let name = self.name()?;
                let params = self.params()?;
                self.expect("->")?;
                let result = self.ty()?;
                let mut reads = Vec::new();
                let mut writes = Vec::new();
                let mut emits = Vec::new();
                while ["reads", "writes", "emits"].contains(&self.peek()) {
                    let cap = self.take();
                    self.expect("(")?;
                    let mut ns = Vec::new();
                    if !self.eat(")") {
                        loop {
                            ns.push(self.name()?);
                            if self.eat(")") {
                                break;
                            }
                            self.expect(",")?;
                        }
                    }
                    match cap.as_str() {
                        "reads" => reads.extend(ns),
                        "writes" => writes.extend(ns),
                        _ => emits.extend(ns),
                    }
                }
                if self.eat("protocol") {
                    self.expect("(")?;
                    let execution = match self.take().as_str() {
                        "preflight" => crate::protocol::Execution::Preflight,
                        "transactional" => crate::protocol::Execution::Transactional,
                        _ => return Err(self.err("protocol requires preflight or transactional")),
                    };
                    self.expect(")")?;
                    p.contracts.action_protocols.insert(name.clone(), execution);
                }
                self.mutables.clear();
                self.pure = false;
                self.generic_scope.clear();
                let (requires, mut ensures) = self.contracts()?;
                let mut captured = Vec::new();
                let mut capture_names = std::collections::BTreeMap::new();
                for (name, ty) in &params {
                    if ensures.iter().any(|(result, c, e)| {
                        result != name
                            && (crate::analysis::references_free(c, name)
                                || crate::analysis::references_free(e, name))
                    }) {
                        let fresh = self.fresh_name();
                        capture_names.insert(name.clone(), fresh.clone());
                        captured.push(Statement::Let(
                            fresh,
                            Some(ty.clone()),
                            Expr::Var(name.clone()),
                        ));
                    }
                }
                for (name, c, e) in &mut ensures {
                    let mut names = capture_names.clone();
                    names.remove(name);
                    *c = rename_expression(c, &names);
                    *e = rename_expression(e, &names);
                }
                let statements = self.block()?;
                // Ordinary action blocks already have executable scope/return
                // semantics. Rewriting their branches changes authenticated IR.
                // Only mutable assignments need the surface continuation pass.
                let body = if self.action_assignments(&statements) {
                    self.action_body(&statements, vec![])?
                } else {
                    statements
                };
                let mut body = self.contract_returns(body, &result, &ensures);
                for (condition, error) in requires.into_iter().rev() {
                    let condition = self.readonly_contract(condition);
                    let error = self.readonly_contract(error);
                    body = vec![Statement::If(
                        condition,
                        body,
                        vec![Statement::Return(Expr::Call("Err".into(), vec![error]))],
                    )];
                }
                captured.extend(body);
                let body = captured;
                p.actions.push(Action {
                    name,
                    kind,
                    params,
                    result,
                    reads,
                    writes,
                    emits,
                    body,
                });
            } else if self.peek() == "law" {
                if !self.law_mode {
                    return Err(self.err(
                        "law declarations are external authoring source; check them with ink emit-laws",
                    ));
                }
                self.take();
                let law = self.law_declaration()?;
                if self.laws.len() >= 64 {
                    return Err(self.err("law declaration limit exceeded"));
                }
                self.laws.push(law);
            } else if self.eat("rewrite") {
                let name = self.name()?;
                let params = self.params()?;
                self.expect("{")?;
                self.expect("from")?;
                let from = self.expr(0)?;
                self.expect(";")?;
                self.expect("to")?;
                let to = self.expr(0)?;
                self.expect(";")?;
                self.expect("proof")?;
                self.expect("by")?;
                let tactic = self.name()?;
                self.expect(";")?;
                self.expect("}")?;
                p.rules.push(Rewrite {
                    name,
                    params,
                    from,
                    to,
                    tactic,
                });
            } else {
                return Err(self.err("unsupported declaration"));
            }
        }
        // A default implementation is a deterministic source-order choice.
        // Every declared implementation is checked, including unselected ones.
        let mut defaults = std::collections::BTreeSet::new();
        for implementation in &p.contracts.implementations {
            if let Some(parameters)=self.parameters.get(&implementation.specification).cloned(){
                self.parameters.insert(implementation.name.clone(),parameters);
                if let Some(constants)=self.constant_parameters.get(&implementation.specification).cloned(){self.constant_parameters.insert(implementation.name.clone(),constants);}
            }
            let spec = p.contracts.specifications.iter().find(|s|s.name==implementation.specification)
                .ok_or_else(||format!("unknown specification {}",implementation.specification))?;
            if let Some(kind) = &spec.kind {
                let action = Action { name: implementation.name.clone(), kind:kind.clone(), params:spec.params.clone(), result:spec.result.clone(), reads:spec.reads.clone(), writes:spec.writes.clone(), emits:spec.emits.clone(), body:implementation.body.clone() };
                if defaults.insert(spec.name.clone()) { let mut default=action.clone(); default.name=spec.name.clone(); p.actions.push(default); }
                p.actions.push(action);
            } else {
                let body = self.pure_body(&implementation.body,None)?;
                let function = Function { name:implementation.name.clone(), params:spec.params.clone(), result:spec.result.clone(), body };
                if defaults.insert(spec.name.clone()) { let mut default=function.clone(); default.name=spec.name.clone(); p.functions.push(default); }
                p.functions.push(function);
            }
        }
        p.records
            .extend(std::mem::take(&mut self.generated_records));
        crate::contracts::collections::resolve(&mut p)?;
        let mut surface=SurfaceProgram {
            program: p,
            aliases: std::mem::take(&mut self.aliases),
            parameters: std::mem::take(&mut self.parameters),
            applications: std::mem::take(&mut self.applications),
            callback_types: std::mem::take(&mut self.callback_types),
            payload_enums: std::mem::take(&mut self.payload_enums),
            matches: std::mem::take(&mut self.matches),
            constant_parameters: std::mem::take(&mut self.constant_parameters),
            abstract_records,
            access_origins: Default::default(),
        };
        if !surface.abstract_records.is_empty() {surface.mark_accesses()?;}
        Ok(surface)
    }
    // Contracts validate, never assume. Failure is the declared Result error.
    // They erase into normal lazy branches and lexical result bindings.
    fn contracts(&mut self) -> LangResult<(Vec<(Expr, Expr)>, Vec<(String, Expr, Expr)>)> {
        let mut requires = Vec::new();
        let mut ensures = Vec::new();
        while matches!(self.peek(), "requires" | "ensures") {
            if requires.len() + ensures.len() >= 16 {
                return Err(self.err("contract clause limit exceeded"));
            }
            let pre = self.take() == "requires";
            self.expect("(")?;
            if pre {
                if !ensures.is_empty() {
                    return Err(self.err("requires must precede ensures"));
                }
                let condition = self.expr(0)?;
                self.expect(",")?;
                let error = self.expr(0)?;
                requires.push((condition, error));
            } else {
                let name = self.name()?;
                self.expect("=>")?;
                let condition = self.expr(0)?;
                self.expect(",")?;
                let error = self.expr(0)?;
                ensures.push((name, condition, error));
            }
            self.expect(")")?;
        }
        Ok((requires, ensures))
    }
    fn readonly_contract(&mut self, e: Expr) -> Expr {
        let a = self.fresh_name();
        let b = self.fresh_name();
        let receiver = self.fresh_name();
        Expr::Let(
            receiver.clone(),
            Some(Box::new(Type::Option(Box::new(Type::Unit)))),
            Box::new(Expr::Call("Some".into(), vec![Expr::Unit])),
            Box::new(Expr::Method(
                Box::new(Expr::Var(receiver)),
                "fold".into(),
                vec![
                    Expr::Lambda(a, Box::new(e.clone())),
                    Expr::Lambda(b, Box::new(e)),
                ],
            )),
        )
    }
    fn contract_expression(
        &mut self,
        body: Expr,
        result: &Type,
        requires: &[(Expr, Expr)],
        ensures: &[(String, Expr, Expr)],
    ) -> Expr {
        let mut body = if ensures.is_empty() {
            body
        } else {
            let fresh = self.fresh_name();
            let mut continuation = Expr::Var(fresh.clone());
            for (name, condition, error) in ensures.iter().rev() {
                let names = std::collections::BTreeMap::from([(name.clone(), fresh.clone())]);
                let condition = self.readonly_contract(rename_expression(condition, &names));
                let error = self.readonly_contract(rename_expression(error, &names));
                continuation = Expr::Call(
                    "choose".into(),
                    vec![
                        condition,
                        continuation,
                        Expr::Call("Err".into(), vec![error]),
                    ],
                );
            }
            Expr::Let(
                fresh,
                Some(Box::new(result.clone())),
                Box::new(body),
                Box::new(continuation),
            )
        };
        for (condition, error) in requires.iter().rev() {
            let condition = self.readonly_contract(condition.clone());
            let error = self.readonly_contract(error.clone());
            body = Expr::Call(
                "choose".into(),
                vec![condition, body, Expr::Call("Err".into(), vec![error])],
            );
        }
        body
    }
    fn contract_returns(
        &mut self,
        body: Vec<Statement>,
        result: &Type,
        ensures: &[(String, Expr, Expr)],
    ) -> Vec<Statement> {
        body.into_iter()
            .map(|statement| match statement {
                Statement::Return(e) => {
                    Statement::Return(self.contract_expression(e, result, &[], ensures))
                }
                Statement::If(c, a, b) => Statement::If(
                    c,
                    self.contract_returns(a, result, ensures),
                    self.contract_returns(b, result, ensures),
                ),
                s => s,
            })
            .collect()
    }
    fn block(&mut self) -> LangResult<Vec<Statement>> {
        self.depth += 1;
        if self.depth > 128 {
            return Err(self.err("block nesting limit exceeded"));
        }
        self.expect("{")?;
        let outer = self.mutables.clone();
        let mut body = Vec::new();
        while !self.eat("}") {
            if self.peek() == "var" || self.peek() == "let" {
                let mutable = self.take() == "var";
                let n = self.name()?;
                let ty = if self.eat(":") {
                    Some(self.ty()?)
                } else {
                    None
                };
                self.expect("=")?;
                let e = self.expr(0)?;
                self.expect(";")?;
                if mutable {
                    self.mutables.insert(
                        n.clone(),
                        ty.clone().ok_or("var requires an explicit type")?,
                    );
                } else {
                    self.mutables.remove(&n);
                }
                body.push(Statement::Let(n, ty, e));
            } else if self.eat("for") {
                if !self.pure {
                    return Err(
                        self.err("effectful iteration requires an explicit checked action helper")
                    );
                }
                body.extend(self.for_loop()?);
            } else if self.eat("while") {
                if !self.pure {
                    return Err(
                        self.err("effectful iteration requires an explicit checked action helper")
                    );
                }
                body.extend(self.while_loop()?);
            } else if self.ts.get(self.at + 1).is_some_and(|t| t.text == "=") {
                let n = self.name()?;
                if self.state_names.contains(&n) && !self.mutables.contains_key(&n) {
                    if self.pure { return Err(self.err("pure functions cannot assign state")); }
                    self.expect("=")?; let value=self.expr(0)?; self.expect(";")?;
                    body.push(Statement::Expr(Expr::Call("__ink_state_assign".into(),vec![Expr::Var(n),value])));
                    continue;
                }
                let t = self
                    .mutables
                    .get(&n)
                    .cloned()
                    .ok_or_else(|| self.err("assignment requires a mutable local"))?;
                self.expect("=")?;
                let e = self.expr(0)?;
                self.expect(";")?;
                let marker = self.assignment(n);
                body.push(Statement::Let(marker, Some(t), e));
            } else if self.eat("return") {
                let e = self.expr(0)?;
                self.expect(";")?;
                body.push(Statement::Return(e));
            } else if self.eat("if") {
                let e = self.expr(0)?;
                let yes = self.block()?;
                let no = if self.eat("else") {
                    self.block()?
                } else {
                    vec![]
                };
                body.push(Statement::If(e, yes, no));
            } else if self.eat("emit") {
                let n = self.name()?;
                self.expect("(")?;
                let e = self.expr(0)?;
                self.expect(")")?;
                self.expect(";")?;
                body.push(Statement::Emit(n, e));
            } else {
                let e = self.expr(0)?;
                self.expect(";")?;
                body.push(Statement::Expr(e));
            }
        }
        self.mutables = outer;
        self.depth -= 1;
        Ok(body)
    }

    // Surface control flow has no independent executable meaning. Elaborate
    // lexical blocks and early returns into existing Let/lazy choose nodes.
    fn pure_body(
        &mut self,
        statements: &[Statement],
        continuation: Option<Expr>,
    ) -> LangResult<Expr> {
        if statements.len() > 128 {
            return Err(self.err("pure block elaboration limit exceeded"));
        }
        let Some((first, rest)) = statements.split_first() else {
            return continuation
                .ok_or_else(|| self.err("pure function can fall through without returning"));
        };
        let result = match first {
            Statement::Return(e) => {
                if !rest.is_empty() {
                    return Err(self.err("unreachable statements after return"));
                }
                e.clone()
            }
            Statement::Let(n, t, Expr::Try(value)) => {
                let next = self.pure_body(rest, continuation)?;
                let input = self.fresh_name();
                let error = self.fresh_name();
                let body = Expr::Let(
                    self.assignments.get(n).unwrap_or(n).clone(),
                    t.clone().map(Box::new),
                    Box::new(Expr::Var(input.clone())),
                    Box::new(next),
                );
                Expr::Method(
                    value.clone(),
                    "fold".into(),
                    vec![
                        Expr::Lambda(input, Box::new(body)),
                        Expr::Lambda(
                            error.clone(),
                            Box::new(Expr::Call("Err".into(), vec![Expr::Var(error)])),
                        ),
                    ],
                )
            }
            Statement::Let(n, t, e) => Expr::Let(
                self.assignments.get(n).unwrap_or(n).clone(),
                t.clone().map(Box::new),
                Box::new(e.clone()),
                Box::new(self.pure_body(rest, continuation)?),
            ),
            Statement::If(c, yes, no) => {
                // A fully returning conditional needs no continuation. Otherwise
                // both branches inherit the remaining lexical block.
                let next = if Self::returns(yes) && Self::returns(no) {
                    None
                } else {
                    Some(self.pure_body(rest, continuation)?)
                };
                if next.is_none() && !rest.is_empty() {
                    return Err(self.err("unreachable statements after returning conditional"));
                }
                let yes = self.scoped_branch(yes, &std::collections::BTreeMap::new());
                let no = self.scoped_branch(no, &std::collections::BTreeMap::new());
                let a = self.pure_body(&yes, next.clone())?;
                let b = self.pure_body(&no, next)?;
                Expr::Call("choose".into(), vec![c.clone(), a, b])
            }
            Statement::Expr(e) => {
                // Generated binders cannot collide with any source identifier.
                let n = self.fresh_name();
                Expr::Let(
                    n,
                    None,
                    Box::new(e.clone()),
                    Box::new(self.pure_body(rest, continuation)?),
                )
            }
            Statement::Emit(..) => return Err(self.err("pure functions cannot emit events")),
        };
        self.bounded_expression(&result)?;
        Ok(result)
    }
    fn returns(statements: &[Statement]) -> bool {
        statements.iter().any(|s| match s {
            Statement::Return(_) => true,
            Statement::If(_, yes, no) => Self::returns(yes) && Self::returns(no),
            _ => false,
        })
    }
    fn branch_expression(&mut self) -> LangResult<Expr> {
        self.expect("{")?;
        let value = self.expr(0)?;
        self.expect("}")?;
        Ok(value)
    }
    fn match_expression(&mut self) -> LangResult<Expr> {
        let value = self.expr(0)?;
        self.expect("{")?;
        let mut arms = vec![];
        let mut expressions = vec![value];
        while !self.eat("}") {
            let first = self.name()?;
            let (root, variant) = if self.eat(".") {
                (first, self.name()?)
            } else {
                (String::new(), first)
            };
            let mut names = vec![];
            if self.eat("(") && !self.eat(")") {
                loop {
                    names.push(self.name()?);
                    if self.eat(")") {
                        break;
                    }
                    self.expect(",")?;
                }
            }
            if names.len() > 16
                || names
                    .iter()
                    .collect::<std::collections::BTreeSet<_>>()
                    .len()
                    != names.len()
            {
                return Err(self.err("invalid pattern binders"));
            }
            self.expect("=>")?;
            let mut body = self.expr(0)?;
            // Keep pattern binders lexical while the linker and hygienic
            // elaboration walk ordinary expression nodes.
            for n in names.iter().rev() {
                body = Expr::Lambda(n.clone(), Box::new(body));
            }
            expressions.push(body);
            arms.push((root, variant, names));
            if self.eat("}") {
                break;
            }
            self.expect(",")?;
        }
        if arms.is_empty() || arms.len() > 64 {
            return Err(self.err("match requires 1..64 arms"));
        }
        let marker = format!("__ink_match_{}_{}", self.application_prefix, self.fresh);
        self.fresh += 1;
        self.matches.insert(marker.clone(), arms);
        Ok(Expr::Call(marker, expressions))
    }
    fn fresh_name(&mut self) -> String {
        loop {
            let name = format!("__ink_local_{}", self.fresh);
            self.fresh += 1;
            if !self.ts.iter().any(|t| t.text == name) {
                return name;
            }
        }
    }
    fn scoped_branch(
        &mut self,
        body: &[Statement],
        outer: &std::collections::BTreeMap<String, String>,
    ) -> Vec<Statement> {
        let mut names = outer.clone();
        body.iter()
            .map(|s| match s {
                Statement::Let(n, t, e) => {
                    let value = rename_expression(e, &names);
                    if let Some(target) = self.assignments.get(n).cloned() {
                        let marker = self.assignment(names.get(&target).unwrap_or(&target).clone());
                        return Statement::Let(marker, t.clone(), value);
                    }
                    let fresh = self.fresh_name();
                    names.insert(n.clone(), fresh.clone());
                    Statement::Let(fresh, t.clone(), value)
                }
                Statement::Return(e) => Statement::Return(rename_expression(e, &names)),
                Statement::Expr(e) => Statement::Expr(rename_expression(e, &names)),
                Statement::If(c, a, b) => Statement::If(
                    rename_expression(c, &names),
                    self.scoped_branch(a, &names),
                    self.scoped_branch(b, &names),
                ),
                Statement::Emit(n, e) => Statement::Emit(n.clone(), rename_expression(e, &names)),
            })
            .collect()
    }
    fn assignment(&mut self, target: String) -> String {
        let marker = self.fresh_name();
        self.assignments.insert(marker.clone(), target);
        marker
    }
    fn action_assignments(&self, body: &[Statement]) -> bool {
        let mut pending: Vec<_> = body.iter().collect();
        while let Some(statement) = pending.pop() {
            match statement {
                Statement::Let(name, ..) if self.assignments.contains_key(name) => return true,
                Statement::If(_, a, b) => {
                    pending.extend(a);
                    pending.extend(b);
                }
                _ => {}
            }
        }
        false
    }
    fn action_body(
        &mut self,
        body: &[Statement],
        continuation: Vec<Statement>,
    ) -> LangResult<Vec<Statement>> {
        // Split at guaranteed returns. Later source statements remain bound and
        // checked, but a returning segment must not inherit its caller's
        // continuation. Iteration avoids recursion through long dead tails.
        let mut result = Vec::new();
        let mut start = 0;
        for (i, statement) in body.iter().enumerate() {
            let returning = match statement {
                Statement::Return(_) => true,
                Statement::If(_, a, b) => Self::returns(a) && Self::returns(b),
                _ => false,
            };
            if returning {
                result.extend(self.action_segment(&body[start..=i], vec![])?);
                start = i + 1;
            }
        }
        let next = if start == 0 { continuation } else { vec![] };
        result.extend(self.action_segment(&body[start..], next)?);
        Ok(result)
    }
    fn action_segment(
        &mut self,
        body: &[Statement],
        continuation: Vec<Statement>,
    ) -> LangResult<Vec<Statement>> {
        // Flat blocks are iterative; only lexical branches recurse. Long legal
        // action bodies must reach the later bounded transition checker.
        let mut out: std::collections::VecDeque<Statement> = continuation.into();
        for (i, first) in body.iter().enumerate().rev() {
            match first {
                Statement::Return(e) => {
                    if i + 1 < body.len() {
                        return Err(self.err("unreachable statements after return"));
                    }
                    out = vec![Statement::Return(e.clone())].into();
                }
                Statement::If(c, a, b) => {
                    let returning = Self::returns(a) && Self::returns(b);
                    let next = if returning {
                        vec![]
                    } else {
                        std::mem::take(&mut out).into_iter().collect()
                    };
                    self.bounded_block(&next)?;
                    let a = self.scoped_branch(a, &Default::default());
                    let b = self.scoped_branch(b, &Default::default());
                    let a = self.action_body(&a, next.clone())?;
                    let b = self.action_body(&b, next)?;
                    // Legacy actions may keep a typed fallback after branches
                    // that both return. Preserve those source statements for
                    // complete-code binding; execution still stops in the branch.
                    out.push_front(Statement::If(c.clone(), a, b));
                }
                _ => {
                    let first = match first {
                        Statement::Let(n, t, e) => Statement::Let(
                            self.assignments.get(n).unwrap_or(n).clone(),
                            t.clone(),
                            e.clone(),
                        ),
                        _ => first.clone(),
                    };
                    out.push_front(first);
                }
            }
        }
        Ok(out.into_iter().collect())
    }
    fn bounded_block(&self, body: &[Statement]) -> LangResult<()> {
        let mut stack: Vec<_> = body.iter().collect();
        let mut nodes = 0usize;
        let mut bytes = 0usize;
        while let Some(s) = stack.pop() {
            nodes += 1;
            let expression = match s {
                Statement::Let(_, _, e)
                | Statement::Return(e)
                | Statement::Emit(_, e)
                | Statement::Expr(e) => e,
                Statement::If(e, a, b) => {
                    stack.extend(a);
                    stack.extend(b);
                    e
                }
            };
            let mut es = vec![expression];
            while let Some(e) = es.pop() {
                nodes += 1;
                bytes = bytes.saturating_add(expression_weight(e));
                match e {
                    Expr::Neg(x) | Expr::Field(x, _) | Expr::Lambda(_, x) | Expr::Try(x) => {
                        es.push(x)
                    }
                    Expr::Binary(_, a, b) | Expr::Let(_, _, a, b) => {
                        es.push(a);
                        es.push(b);
                    }
                    Expr::Call(_, a) => es.extend(a),
                    Expr::Method(x, _, a) => {
                        es.push(x);
                        es.extend(a);
                    }
                    Expr::Record(_, fs) => es.extend(fs.iter().map(|(_, e)| e)),
                    _ => (),
                }
                if nodes > 50_000 || bytes > 8_000_000 {
                    return Err(self.err("action elaboration size limit exceeded"));
                }
            }
        }
        Ok(())
    }
    // Bodies are hygienically renamed before this analysis: shadowed locals
    // and loop items have fresh identities, while assignments retain their
    // exact outer target. Keep readonly references as well as writes, so an
    // affine owner remains available across iterations without being captured.
    fn loop_variables(
        &self,
        mut variables: std::collections::BTreeMap<String, Type>,
        body: &[Statement],
        condition: Option<&Expr>,
    ) -> std::collections::BTreeMap<String, Type> {
        let mut used = std::collections::BTreeSet::new();
        if let Some(condition) = condition {
            used.extend(crate::analysis::free_variables(condition));
        }
        let mut pending: Vec<_> = body.iter().collect();
        while let Some(statement) = pending.pop() {
            match statement {
                Statement::Let(name, _, expression) => {
                    used.extend(crate::analysis::free_variables(expression));
                    if let Some(target) = self.assignments.get(name) {
                        used.insert(target.clone());
                    }
                }
                Statement::If(condition, yes, no) => {
                    used.extend(crate::analysis::free_variables(condition));
                    pending.extend(yes);
                    pending.extend(no);
                }
                Statement::Return(expression)
                | Statement::Expr(expression)
                | Statement::Emit(_, expression) => {
                    used.extend(crate::analysis::free_variables(expression));
                }
            }
        }
        variables.retain(|name, _| used.contains(name));
        variables
    }
    fn for_loop(&mut self) -> LangResult<Vec<Statement>> {
        let item = self.name()?;
        self.expect("in")?;
        let input = self.expr(0)?;
        let range = if self.eat("..") {
            let Expr::Num(start) = input else {
                return Err(self.err("range start requires a literal"));
            };
            let Expr::Num(end) = self.expr(0)? else {
                return Err(self.err("range end requires a literal"));
            };
            if start > u32::MAX as u64 || end > u32::MAX as u64 || end.saturating_sub(start) > 65536
            {
                return Err(self.err("range exceeds iteration bound"));
            }
            Some((start, end.saturating_sub(start)))
        } else {
            None
        };
        let all_variables = self.mutables.clone();
        self.mutables.remove(&item);
        let body = self.block()?;
        self.mutables = all_variables.clone();
        fn control(body: &[Statement]) -> bool {
            body.iter().any(|s| match s {
                Statement::Return(_) | Statement::Emit(..) => true,
                Statement::If(_, a, b) => control(a) || control(b),
                _ => false,
            })
        }
        if control(&body) {
            return Err(self.err("finite loop body cannot return or emit; use its carried state"));
        }
        let element = self.fresh_name();
        let scoped = self.scoped_branch(&body, &[(item, element.clone())].into_iter().collect());
        let variables = self.loop_variables(all_variables, &scoped, None);
        if variables.len() > 16 {
            return Err(self.err("loop state exceeds 16 mutable locals"));
        }
        let record = format!("__ink_loop_{}_{}", self.application_prefix, self.fresh);
        self.fresh += 1;
        if self.ts.iter().any(|t| t.text == record) {
            return Err(self.err("generated loop state collision"));
        }
        self.generated_records.insert(
            record.clone(),
            variables
                .iter()
                .map(|(n, t)| (n.clone(), t.clone()))
                .collect(),
        );
        let record = if self.generic_scope.is_empty() {
            record
        } else {
            self.parameters
                .insert(record.clone(), self.generic_scope.clone());
            self.constant_parameters
                .insert(record.clone(), self.constant_scope.clone());
            self.application(
                record,
                self.generic_scope
                    .iter()
                    .cloned()
                    .map(Type::Named)
                    .collect(),
            )?
        };
        let accumulator = self.fresh_name();
        let index = self.fresh_name();
        let fields = || {
            variables
                .keys()
                .map(|n| (n.clone(), Expr::Var(n.clone())))
                .collect()
        };
        let mut step = self.pure_body(&scoped, Some(Expr::Record(record.clone(), fields())))?;
        for (n, t) in variables.iter().rev() {
            step = Expr::Let(
                n.clone(),
                Some(Box::new(t.clone())),
                Box::new(Expr::Field(
                    Box::new(Expr::Var(accumulator.clone())),
                    n.clone(),
                )),
                Box::new(step),
            );
        }
        let iteration = if let Some((start, count)) = range {
            let value = if start == 0 {
                Expr::Var(index.clone())
            } else {
                Expr::Binary(
                    "+".into(),
                    Box::new(Expr::Var(index.clone())),
                    Box::new(Expr::Num(start)),
                )
            };
            step = Expr::Let(
                element,
                Some(Box::new(Type::U32)),
                Box::new(value),
                Box::new(step),
            );
            Expr::Call(
                "repeat".into(),
                vec![
                    Expr::Num(count),
                    Expr::Record(record.clone(), fields()),
                    Expr::Lambda(index, Box::new(Expr::Lambda(accumulator, Box::new(step)))),
                ],
            )
        } else {
            Expr::Call(
                "foldl".into(),
                vec![
                    input,
                    Expr::Record(record.clone(), fields()),
                    Expr::Lambda(element, Box::new(Expr::Lambda(accumulator, Box::new(step)))),
                ],
            )
        };
        let result = self.fresh_name();
        let ty = Type::Named(record);
        let mut out = vec![Statement::Let(result.clone(), Some(ty), iteration)];
        for (n, t) in variables {
            let marker = self.assignment(n.clone());
            out.push(Statement::Let(
                marker,
                Some(t),
                Expr::Field(Box::new(Expr::Var(result.clone())), n),
            ));
        }
        Ok(out)
    }
    fn while_loop(&mut self) -> LangResult<Vec<Statement>> {
        let condition = self.expr(0)?;
        self.expect("limit")?;
        let Expr::Num(limit) = self.expr(0)? else {
            return Err(self.err("while requires a literal iteration limit"));
        };
        if limit > 65536 {
            return Err(self.err("while exceeds iteration bound"));
        }
        let all_variables = self.mutables.clone();
        let body = self.block()?;
        fn control(body: &[Statement]) -> bool {
            body.iter().any(|s| match s {
                Statement::Return(_) | Statement::Emit(..) => true,
                Statement::If(_, a, b) => control(a) || control(b),
                _ => false,
            })
        }
        if control(&body) {
            return Err(self.err("bounded loop body cannot return or emit; use its carried state"));
        }
        let scoped = self.scoped_branch(&body, &Default::default());
        let variables = self.loop_variables(all_variables, &scoped, Some(&condition));
        if variables.len() > 16 {
            return Err(self.err("loop state exceeds 16 mutable locals"));
        }
        let record = format!("__ink_loop_{}_{}", self.application_prefix, self.fresh);
        self.fresh += 1;
        if self.ts.iter().any(|t| t.text == record) {
            return Err(self.err("generated loop state collision"));
        }
        self.generated_records.insert(
            record.clone(),
            variables
                .iter()
                .map(|(n, t)| (n.clone(), t.clone()))
                .collect(),
        );
        let record = if self.generic_scope.is_empty() {
            record
        } else {
            self.parameters
                .insert(record.clone(), self.generic_scope.clone());
            self.constant_parameters
                .insert(record.clone(), self.constant_scope.clone());
            self.application(
                record,
                self.generic_scope
                    .iter()
                    .cloned()
                    .map(Type::Named)
                    .collect(),
            )?
        };
        let acc = self.fresh_name();
        let index = self.fresh_name();
        let fields = || {
            variables
                .keys()
                .map(|n| (n.clone(), Expr::Var(n.clone())))
                .collect()
        };
        let mut step = self.pure_body(&scoped, Some(Expr::Record(record.clone(), fields())))?;
        let mut stop = Expr::Binary(
            "==".into(),
            Box::new(condition),
            Box::new(Expr::Bool(false)),
        );
        for (n, t) in variables.iter().rev() {
            let value = Expr::Field(Box::new(Expr::Var(acc.clone())), n.clone());
            step = Expr::Let(
                n.clone(),
                Some(Box::new(t.clone())),
                Box::new(value.clone()),
                Box::new(step),
            );
            stop = Expr::Let(
                n.clone(),
                Some(Box::new(t.clone())),
                Box::new(value),
                Box::new(stop),
            );
        }
        let iteration = Expr::Call(
            "repeat_until".into(),
            vec![
                Expr::Num(limit),
                Expr::Record(record.clone(), fields()),
                Expr::Lambda(acc.clone(), Box::new(stop)),
                Expr::Lambda(index, Box::new(Expr::Lambda(acc, Box::new(step)))),
            ],
        );
        let result = self.fresh_name();
        let mut out = vec![Statement::Let(
            result.clone(),
            Some(Type::Named(record)),
            iteration,
        )];
        for (n, t) in variables {
            let marker = self.assignment(n.clone());
            out.push(Statement::Let(
                marker,
                Some(t),
                Expr::Field(Box::new(Expr::Var(result.clone())), n),
            ));
        }
        Ok(out)
    }
}

// Include annotation trees in expansion bounds: surface branching duplicates
// types as well as expression nodes. The walk does not recurse on source depth.
fn expression_weight(e: &Expr) -> usize {
    let mut bytes = 256usize;
    match e {
        Expr::String(n)
        | Expr::Var(n)
        | Expr::Call(n, _)
        | Expr::Method(_, n, _)
        | Expr::Field(_, n)
        | Expr::Lambda(n, _) => bytes = bytes.saturating_add(n.len()),
        Expr::Record(n, fs) => {
            bytes = bytes.saturating_add(n.len());
            for (n, _) in fs {
                bytes = bytes.saturating_add(n.len() + 32);
            }
        }
        Expr::Let(n, t, _, _) => {
            bytes = bytes.saturating_add(n.len());
            let mut ts: Vec<&Type> = t.iter().map(|t| t.as_ref()).collect();
            while let Some(t) = ts.pop() {
                bytes = bytes.saturating_add(128);
                match t {
                    Type::Named(n) => bytes = bytes.saturating_add(n.len()),
                    Type::List(x) | Type::Buffer(x) | Type::Option(x) | Type::Vector(x, _) => {
                        ts.push(x)
                    }
                    Type::Result(a, b) | Type::Map(a, b) | Type::Table(a, b) => {
                        ts.push(a);
                        ts.push(b);
                    }
                    _ => (),
                }
            }
        }
        _ => (),
    }
    bytes
}

pub(crate) fn rename_expression(e: &Expr, names: &std::collections::BTreeMap<String, String>) -> Expr {
    let rename = |x: &Expr| Box::new(rename_expression(x, names));
    match e {
        Expr::Var(n) => Expr::Var(names.get(n).unwrap_or(n).clone()),
        Expr::Neg(a) => Expr::Neg(rename(a)),
        Expr::Binary(op, a, b) => Expr::Binary(op.clone(), rename(a), rename(b)),
        Expr::Call(n, a) => Expr::Call(
            n.clone(),
            a.iter().map(|e| rename_expression(e, names)).collect(),
        ),
        Expr::Method(x, n, a) => Expr::Method(
            rename(x),
            n.clone(),
            a.iter().map(|e| rename_expression(e, names)).collect(),
        ),
        Expr::Field(x, n) => Expr::Field(rename(x), n.clone()),
        Expr::Record(n, fs) => Expr::Record(
            n.clone(),
            fs.iter()
                .map(|(n, e)| (n.clone(), rename_expression(e, names)))
                .collect(),
        ),
        Expr::Try(x) => Expr::Try(rename(x)),
        Expr::Lambda(n, b) => {
            let mut local = names.clone();
            local.remove(n);
            Expr::Lambda(n.clone(), Box::new(rename_expression(b, &local)))
        }
        Expr::Let(n, t, a, b) => {
            let mut local = names.clone();
            local.remove(n);
            Expr::Let(
                n.clone(),
                t.clone(),
                rename(a),
                Box::new(rename_expression(b, &local)),
            )
        }
        _ => e.clone(),
    }
}

pub fn parse(s: &str) -> LangResult<Program> {
    parse_with_record_names(s, std::iter::empty())
}

/// Frontends may recognize imported record constructors while parsing. Names
/// confer no type authority: the assembled program must still pass all checks.
pub fn parse_with_record_names(
    s: &str,
    imported_records: impl IntoIterator<Item = String>,
) -> LangResult<Program> {
    parse_surface(s, imported_records)?.elaborate()
}

/// Linked frontends merge surface declarations before bounded elaboration.
/// This value confers no execution or checking authority.
pub fn parse_surface(
    s: &str,
    imported_records: impl IntoIterator<Item = String>,
) -> LangResult<SurfaceProgram> {
    parser(s, imported_records, false)?.program()
}

/// An external law source: its helper declarations and its `law` and
/// `rewrite` declarations. Laws are not executable declarations.
pub struct LawSource {
    pub program: Program,
    pub laws: Vec<crate::law_syntax::LawDecl>,
}

/// Parse an external law source. Function types of law parameters are
/// resolved here and do not reach executable elaboration.
pub fn parse_law_source(s: &str) -> LangResult<LawSource> {
    let mut p = parser(s, std::iter::empty(), true)?;
    // Law parameter function types were resolved and removed while parsing.
    let surface = p.program()?;
    let laws = std::mem::take(&mut p.laws);
    Ok(LawSource {
        program: surface.elaborate()?,
        laws,
    })
}

fn parser(
    s: &str,
    imported_records: impl IntoIterator<Item = String>,
    law_mode: bool,
) -> LangResult<Parser> {
    if s.len() > 1_000_000 {
        return Err("source exceeds 1 MB parser limit".into());
    }
    let imported_records: Vec<_> = imported_records.into_iter().take(1025).collect();
    if imported_records.len() > 1024 || imported_records.iter().any(|n| n.len() > 128) {
        return Err("imported record-name limit exceeded".into());
    }
    let ts = lex(s)?;
    let records = ts
        .windows(2)
        .filter(|w| w[0].text == "record" || w[0].text == "type")
        .map(|w| w[1].text.clone())
        .chain(imported_records)
        .collect();
    let state_names=ts.windows(2).filter(|w|w[0].text=="state").map(|w|w[1].text.clone()).collect();
    Ok(Parser {
        state_names,
        ts,
        at: 0,
        depth: 0,
        records,
        fresh: 0,
        aliases: Default::default(),
        parameters: Default::default(),
        applications: Default::default(),
        application_prefix: format!("{:x}", Sha256::digest(s.as_bytes())),
        mutables: Default::default(),
        assignments: Default::default(),
        generated_records: Default::default(),
        generic_scope: vec![],
        pure: false,
        callback_types: Default::default(),
        payload_enums: Default::default(),
        matches: Default::default(),
        constant_parameters: Default::default(),
        constant_scope: Default::default(),
        law_mode,
        laws: vec![],
    })
}


/// Law declarations and their proof tactics (external law sources only).
impl Parser {
    fn law_declaration(&mut self) -> LangResult<crate::law_syntax::LawDecl> {
        use crate::law_syntax::{AssumeDecl, LawDecl, Tactic};
        let name = self.name()?;
        let mut types = vec![];
        if self.eat("<") {
            loop {
                if types.len() >= 16 {
                    return Err(self.err("law type parameter limit exceeded"));
                }
                types.push(self.name()?);
                if self.peek() == ">" || self.peek() == ">=" {
                    self.expect(">")?;
                    break;
                }
                self.expect(",")?;
            }
        }
        let before: std::collections::BTreeSet<String> =
            self.callback_types.keys().cloned().collect();
        let raw = self.params()?;
        let params = raw
            .into_iter()
            .map(|(n, t)| Ok((n, self.law_sort(&t, 0)?)))
            .collect::<LangResult<Vec<_>>>()?;
        self.mutables.clear();
        self.pure = true;
        self.generic_scope = types.clone();
        self.constant_scope = Default::default();
        self.expect("{")?;
        let mut requires = vec![];
        let mut assumes = vec![];
        let mut statement = None;
        let mut proof = None;
        while !self.eat("}") {
            if self.eat("requires") {
                let label = if self.ts.get(self.at + 1).is_some_and(|t| t.text == ":")
                    && self.peek().bytes().all(|c| c.is_ascii_alphanumeric() || c == b'_')
                {
                    let n = self.name()?;
                    self.expect(":")?;
                    Some(n)
                } else {
                    None
                };
                requires.push((label, self.expr(0)?));
                self.expect(";")?;
            } else if self.eat("assume") {
                let name = self.name()?;
                let params = self.params()?;
                let mut conditions = vec![];
                if self.eat("requires") {
                    loop {
                        conditions.push(self.expr(0)?);
                        if !self.eat(",") {
                            break;
                        }
                    }
                }
                self.expect(":")?;
                let (from, to) = Self::equation(self.expr(0)?);
                self.expect(";")?;
                assumes.push(AssumeDecl {
                    name,
                    params,
                    requires: conditions,
                    from,
                    to,
                });
            } else if self.eat("proof") {
                if proof.is_some() {
                    return Err(self.err("duplicate law proof"));
                }
                self.expect("by")?;
                proof = Some(self.tactic()?);
                self.expect(";")?;
            } else if self.eat("from") {
                if statement.is_some() {
                    return Err(self.err("duplicate law statement"));
                }
                let from = self.expr(0)?;
                self.expect(";")?;
                self.expect("to")?;
                let to = self.expr(0)?;
                self.expect(";")?;
                statement = Some((from, to));
            } else {
                if statement.is_some() {
                    return Err(self.err("duplicate law statement"));
                }
                let e = self.expr(0)?;
                self.expect(";")?;
                statement = Some(Self::equation(e));
            }
        }
        // Function types of law parameters never reach executable elaboration.
        let created: Vec<String> = self
            .callback_types
            .keys()
            .filter(|k| !before.contains(*k))
            .cloned()
            .collect();
        for k in created {
            self.callback_types.remove(&k);
        }
        self.generic_scope.clear();
        let (from, to) = statement.ok_or_else(|| self.err("law requires a statement"))?;
        Ok(LawDecl {
            name,
            types,
            params,
            requires,
            assumes,
            from,
            to,
            proof: proof.unwrap_or(Tactic::Normalize),
        })
    }
    /// A top-level `a == b` is the equation a = b; any other statement is a
    /// Bool fact `e = true`.
    fn equation(e: Expr) -> (Expr, Expr) {
        match e {
            Expr::Binary(op, a, b) if op == "==" => (*a, *b),
            e => (e, Expr::Bool(true)),
        }
    }
    fn law_sort(&self, t: &Type, depth: usize) -> LangResult<crate::semantic::Sort> {
        if depth > 16 {
            return Err("law function type nesting limit".into());
        }
        Ok(match t {
            Type::Named(n) if self.callback_types.contains_key(n) => {
                let (a, b) = &self.callback_types[n];
                crate::semantic::arrow(self.law_sort(a, depth + 1)?, self.law_sort(b, depth + 1)?)
            }
            t => {
                if self.contains_callback(t) {
                    return Err("function types may only be law parameters".into());
                }
                crate::semantic::value(t.clone())
            }
        })
    }
    fn contains_callback(&self, t: &Type) -> bool {
        match t {
            Type::Named(n) => self.callback_types.contains_key(n),
            Type::List(x) | Type::Buffer(x) | Type::Option(x) | Type::Vector(x, _) => {
                self.contains_callback(x)
            }
            Type::Map(a, b) | Type::Table(a, b) | Type::Result(a, b) => {
                self.contains_callback(a) || self.contains_callback(b)
            }
            _ => false,
        }
    }
    fn tactics(&mut self) -> LangResult<Vec<crate::law_syntax::Tactic>> {
        self.expect("(")?;
        let mut out = vec![];
        if !self.eat(")") {
            loop {
                if out.len() >= 64 {
                    return Err(self.err("tactic list limit exceeded"));
                }
                out.push(self.tactic()?);
                if self.eat(")") {
                    break;
                }
                self.expect(",")?;
            }
        }
        Ok(out)
    }
    fn tactic(&mut self) -> LangResult<crate::law_syntax::Tactic> {
        use crate::law_syntax::{HypothesisRef, Tactic};
        self.depth += 1;
        if self.depth > 128 {
            return Err(self.err("proof nesting limit exceeded"));
        }
        let word = self.name()?;
        let t = match word.as_str() {
            "normalize" | "computation" => Tactic::Normalize,
            "provided" => Tactic::Provided,
            "hypothesis" => {
                let token = self.take();
                Tactic::Hypothesis(if token.bytes().all(|c| c.is_ascii_digit()) {
                    HypothesisRef::Index(token.parse().map_err(|_| "hypothesis index")?)
                } else {
                    HypothesisRef::Name(token)
                })
            }
            "ih" => {
                let mut args = vec![];
                if self.eat("(") {
                    loop {
                        let n = self.name()?;
                        self.expect("=")?;
                        args.push((n, self.expr(0)?));
                        if self.eat(")") {
                            break;
                        }
                        self.expect(",")?;
                    }
                }
                Tactic::Ih(args)
            }
            "symmetry" => {
                self.expect("(")?;
                let t = self.tactic()?;
                self.expect(")")?;
                Tactic::Symmetry(Box::new(t))
            }
            "congruence" => Tactic::Congruence(self.tactics()?),
            "calc" => {
                self.expect("{")?;
                self.expect("_")?;
                let mut middles = vec![];
                let mut proofs = vec![];
                loop {
                    self.expect("==")?;
                    let e = self.expr(0)?;
                    self.expect("by")?;
                    proofs.push(self.tactic()?);
                    self.expect(";")?;
                    if matches!(&e, Expr::Var(n) if n == "_") {
                        break;
                    }
                    if middles.len() >= 64 {
                        return Err(self.err("calculation step limit exceeded"));
                    }
                    middles.push(e);
                }
                self.expect("}")?;
                Tactic::Calc { middles, proofs }
            }
            "cases" => {
                let condition = self.expr(0)?;
                self.expect("{")?;
                if matches!(self.peek(), "none" | "some" | "ok" | "err") {
                    let Expr::Var(variable) = condition else {
                        return Err(self.err("variant cases take a variable"));
                    };
                    let mut slots: [Option<(Option<String>, Tactic)>; 4] = Default::default();
                    while !self.eat("}") {
                        let label = self.take();
                        let at = ["none", "some", "ok", "err"]
                            .iter()
                            .position(|l| *l == label)
                            .ok_or_else(|| self.err("variant cases are none/some or ok/err"))?;
                        let binder = if at == 0 {
                            None
                        } else {
                            self.expect("(")?;
                            let n = self.name()?;
                            self.expect(")")?;
                            Some(n)
                        };
                        self.expect("=>")?;
                        let t = self.tactic()?;
                        self.expect(";")?;
                        if slots[at].replace((binder, t)).is_some() {
                            return Err(self.err("duplicate variant case"));
                        }
                    }
                    let [none, some, ok, err] = slots;
                    let t = match (none, some, ok, err) {
                        (Some((_, a)), Some((Some(v), c)), None, None) => Tactic::Variants {
                            variable,
                            names: vec![v],
                            first: Box::new(a),
                            second: Box::new(c),
                        },
                        (None, None, Some((Some(v), a)), Some((Some(e), c))) => Tactic::Variants {
                            variable,
                            names: vec![v, e],
                            first: Box::new(a),
                            second: Box::new(c),
                        },
                        _ => return Err(self.err("variant cases need none and some, or ok and err")),
                    };
                    self.depth -= 1;
                    return Ok(t);
                }
                let mut on_true = None;
                let mut on_false = None;
                for _ in 0..2 {
                    let flag = self.take();
                    self.expect("=>")?;
                    let t = self.tactic()?;
                    self.expect(";")?;
                    let slot = match flag.as_str() {
                        "true" => &mut on_true,
                        "false" => &mut on_false,
                        _ => return Err(self.err("cases branches are true and false")),
                    };
                    if slot.replace(t).is_some() {
                        return Err(self.err("duplicate cases branch"));
                    }
                }
                self.expect("}")?;
                Tactic::Cases {
                    condition,
                    on_true: Box::new(on_true.ok_or("missing true branch")?),
                    on_false: Box::new(on_false.ok_or("missing false branch")?),
                }
            }
            "induction" => {
                let variable = self.name()?;
                let mut generalizing = vec![];
                if self.eat("generalizing") {
                    self.expect("(")?;
                    loop {
                        generalizing.push(self.name()?);
                        if self.eat(")") {
                            break;
                        }
                        self.expect(",")?;
                    }
                }
                let mut names = vec![];
                let mut base = Tactic::Normalize;
                let mut step = Tactic::Normalize;
                if self.eat("{") {
                    while !self.eat("}") {
                        let case = self.name()?;
                        match case.as_str() {
                            "nil" | "zero" => {
                                self.expect("=>")?;
                                base = self.tactic()?;
                            }
                            "succ" => {
                                self.expect("(")?;
                                names.push(self.name()?);
                                self.expect(")")?;
                                self.expect("=>")?;
                                step = self.tactic()?;
                            }
                            "cons" => {
                                self.expect("(")?;
                                names.push(self.name()?);
                                self.expect(",")?;
                                names.push(self.name()?);
                                self.expect(")")?;
                                self.expect("=>")?;
                                step = self.tactic()?;
                            }
                            _ => return Err(self.err("induction cases are nil/cons(head, tail) or zero/succ(previous)")),
                        }
                        self.expect(";")?;
                    }
                }
                Tactic::Induction {
                    variable,
                    generalizing,
                    names,
                    base: Box::new(base),
                    step: Box::new(step),
                }
            }
            "use" => {
                let law = self.name()?;
                let types = if self.peek() == "<" {
                    self.type_arguments()?
                } else {
                    vec![]
                };
                let args = self.args()?;
                let mut premises = vec![];
                let mut assumptions = vec![];
                let mut exact = false;
                loop {
                    if self.eat("requires") {
                        premises = self.tactics()?;
                    } else if self.eat("assuming") {
                        assumptions = self.tactics()?;
                    } else if self.eat("exactly") {
                        exact = true;
                    } else {
                        break;
                    }
                }
                Tactic::Use {
                    law,
                    types,
                    args,
                    premises,
                    assumptions,
                    exact,
                }
            }
            "assumption" => {
                let name = self.name()?;
                let args = self.args()?;
                let mut premises = vec![];
                let mut exact = false;
                loop {
                    if self.eat("requires") {
                        premises = self.tactics()?;
                    } else if self.eat("exactly") {
                        exact = true;
                    } else {
                        break;
                    }
                }
                Tactic::Assumption {
                    name,
                    args,
                    premises,
                    exact,
                }
            }
            "assert" => {
                let (from, to) = match self.expr(0)? {
                    Expr::Binary(op, a, b) if op == "==" => (*a, *b),
                    _ => return Err(self.err("assert takes an equality")),
                };
                self.expect("by")?;
                let premise = self.tactic()?;
                self.expect("then")?;
                let body = self.tactic()?;
                Tactic::Assert {
                    from,
                    to,
                    premise: Box::new(premise),
                    body: Box::new(body),
                }
            }
            "order" => {
                let atoms = self.args()?;
                self.expect("then")?;
                let body = self.tactic()?;
                Tactic::Order {
                    atoms,
                    body: Box::new(body),
                }
            }
            other => return Err(format!("unknown proof tactic {other}")),
        };
        self.depth -= 1;
        Ok(t)
    }
}
