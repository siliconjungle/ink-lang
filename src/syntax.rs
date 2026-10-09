use crate::LangResult;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Type {
    U64,
    Bool,
    List(Box<Type>),
}

#[derive(Clone, Debug, PartialEq, Eq, Serialize, Deserialize)]
pub enum Expr {
    Num(u64),
    Bool(bool),
    Var(String),
    Binary(String, Box<Expr>, Box<Expr>),
    Call(String, Vec<Expr>),
    Method(Box<Expr>, String, Vec<Expr>),
    Lambda(String, Box<Expr>),
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Function {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub result: Type,
    pub body: Expr,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct Rewrite {
    pub name: String,
    pub params: Vec<(String, Type)>,
    pub from: Expr,
    pub to: Expr,
    pub tactic: String,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct Program {
    pub module: String,
    pub functions: Vec<Function>,
    pub rules: Vec<Rewrite>,
}

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
        if b[p].is_ascii_alphabetic() || b[p] == b'_' {
            p += 1;
            while p < b.len() && (b[p].is_ascii_alphanumeric() || b[p] == b'_') {
                p += 1;
            }
        } else if b[p].is_ascii_digit() {
            p += 1;
            while p < b.len() && (b[p].is_ascii_alphanumeric() || b[p] == b'_') {
                p += 1;
            }
        } else if ["->", "=>", "==", "!=", "<=", ">=", "&&", "||"]
            .iter()
            .any(|s| source[p..].starts_with(s))
        {
            p += 2;
        } else if b";:,.(){}<>+-*!".contains(&b[p]) {
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
}
impl Parser {
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
        match self.take().as_str() {
            "u64" => Ok(Type::U64),
            "Bool" => Ok(Type::Bool),
            "List" => {
                self.expect("<")?;
                let t = self.ty()?;
                self.expect(">")?;
                Ok(Type::List(Box::new(t)))
            }
            s => Err(format!(
                "type {s} is not implemented in this compiler milestone"
            )),
        }
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
        let mut lhs = if self.eat("(") {
            let e = self.expr(0)?;
            self.expect(")")?;
            e
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
            let n = if let Some(h) = s.strip_prefix("0x") {
                u64::from_str_radix(h, 16)
            } else {
                s.parse::<u64>()
            }
            .map_err(|_| format!("invalid u64 literal {s}"))?;
            Expr::Num(n)
        } else {
            Expr::Var(self.name()?)
        };
        loop {
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
                let a = self.args()?;
                lhs = Expr::Method(Box::new(lhs), m, a);
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
                self.expect("return")?;
                let body = self.expr(0)?;
                self.expect(";")?;
                self.expect("}")?;
                p.functions.push(Function {
                    name,
                    params,
                    result,
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
                return Err(self.err("declaration not yet implemented; expected fn or rewrite"));
            }
        }
        Ok(p)
    }
}

pub fn parse(s: &str) -> LangResult<Program> {
    if s.len() > 1_000_000 {
        return Err("source exceeds 1 MB parser limit".into());
    }
    Parser {
        ts: lex(s)?,
        at: 0,
        depth: 0,
    }
    .program()
}
