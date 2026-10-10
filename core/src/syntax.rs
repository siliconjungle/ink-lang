use crate::LangResult;
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
        } else if ["->", "=>", "==", "!=", "<=", ">=", "&&", "||"]
            .iter()
            .any(|s| source[p..].starts_with(s))
        {
            p += 2;
        } else if b";:,.(){}<>+-*!=?".contains(&b[p]) {
            p += 1;
        } else {
            return Err(format!("unsupported character at byte {p}"));
        }
        ts.push(Token {
            text: source[start..p].into(),
            offset: start,
        });
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
}
impl Parser {
    // Precedence parsing builds left-associated and postfix chains in a loop,
    // so parser call depth alone does not bound the resulting AST. Check each
    // partial expression before extending it again; even an error then drops
    // only a bounded tree. This walk itself uses an explicit stack.
    fn bounded_expression(&self, expression: &Expr) -> LangResult<()> {
        let mut pending = vec![(expression, 0usize)];
        while let Some((e, depth)) = pending.pop() {
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
            kind @ ("List" | "Option") => {
                self.expect("<")?;
                let t = self.ty()?;
                self.expect(">")?;
                Ok(if kind == "List" {
                    Type::List(Box::new(t))
                } else {
                    Type::Option(Box::new(t))
                })
            }
            kind @ ("Result" | "Table") => {
                self.expect("<")?;
                let a = self.ty()?;
                self.expect(",")?;
                let b = self.ty()?;
                self.expect(">")?;
                Ok(if kind == "Result" {
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
                Ok(Type::Named(s.into()))
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
        let mut lhs = if self.eat("-") {
            Expr::Neg(Box::new(self.expr(7)?))
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
            let n = self.name()?;
            self.expect(")")?;
            self.expect("=>")?;
            Expr::Lambda(n, Box::new(self.expr(0)?))
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
            let name = self.name()?;
            if self.peek() == "{" && self.records.contains(&name) {
                self.expect("{")?;
                let mut fields = Vec::new();
                while !self.eat("}") {
                    let f = self.name()?;
                    self.expect(":")?;
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
                "==" | "!=" => 3,
                "<" | ">" | "<=" | ">=" => 4,
                "+" | "-" => 5,
                "*" => 6,
                _ => 0,
            };
            if prec == 0 || prec < min {
                break;
            }
            let op = self.take();
            let rhs = self.expr(prec + 1)?;
            lhs = Expr::Binary(op, Box::new(lhs), Box::new(rhs));
        }
        self.depth -= 1;
        Ok(lhs)
    }
    fn program(&mut self) -> LangResult<Program> {
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
        while self.peek() != "<eof>" {
            self.eat("pub");
            if self.eat("fn") {
                let name = self.name()?;
                let params = self.params()?;
                self.expect("->")?;
                let result = self.ty()?;
                self.expect("{")?;
                let mut bindings = Vec::new();
                while self.eat("let") {
                    let n = self.name()?;
                    let t = if self.eat(":") {
                        Some(self.ty()?)
                    } else {
                        None
                    };
                    self.expect("=")?;
                    let e = self.expr(0)?;
                    self.expect(";")?;
                    bindings.push((n, t, e));
                }
                self.expect("return")?;
                let mut body = self.expr(0)?;
                for (n, t, e) in bindings.into_iter().rev() {
                    body = Expr::Let(n, t.map(Box::new), Box::new(e), Box::new(body));
                }
                self.expect(";")?;
                self.expect("}")?;
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
            } else if self.eat("record") {
                let n = self.name()?;
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
            } else if self.eat("enum") {
                let n = self.name()?;
                self.expect("{")?;
                let mut vars = Vec::new();
                while !self.eat("}") {
                    vars.push(self.name()?);
                    self.expect(",")?;
                }
                if p.enums.insert(n.clone(), vars).is_some() {
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
                let body = self.block()?;
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
        Ok(p)
    }
    fn block(&mut self) -> LangResult<Vec<Statement>> {
        self.depth += 1;
        if self.depth > 128 {
            return Err(self.err("block nesting limit exceeded"));
        }
        self.expect("{")?;
        let mut body = Vec::new();
        while !self.eat("}") {
            if self.eat("let") {
                let n = self.name()?;
                let ty = if self.eat(":") {
                    Some(self.ty()?)
                } else {
                    None
                };
                self.expect("=")?;
                let e = self.expr(0)?;
                self.expect(";")?;
                body.push(Statement::Let(n, ty, e));
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
        self.depth -= 1;
        Ok(body)
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
        .filter(|w| w[0].text == "record")
        .map(|w| w[1].text.clone())
        .chain(imported_records)
        .collect();
    Parser {
        ts,
        at: 0,
        depth: 0,
        records,
    }
    .program()
}
