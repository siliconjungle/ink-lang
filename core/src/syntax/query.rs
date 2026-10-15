//! Ordered relational surface expressions. Elaboration introduces only existing
//! lexical bindings, folds and owned output construction. There is no query
//! primitive, implicit sorting or optimization admission rule.
use super::{Expr, LangResult, Parser, Type};
use std::collections::BTreeSet;

enum Clause {
    From { binder: String, source: Expr },
    Where(Expr),
}

fn var(name: &str) -> Expr {
    Expr::Var(name.into())
}
fn lambda(a: String, b: String, body: Expr) -> Expr {
    Expr::Lambda(a, Box::new(Expr::Lambda(b, Box::new(body))))
}

impl Parser {
    /// Preserve ordinary `list(...)` and user generic calls. Only a balanced
    /// `list<T> {` starts a query; the usual parser reports malformed types.
    pub(super) fn ordered_query_start(&self) -> bool {
        if self.peek() != "list" || !self.ts.get(self.at + 1).is_some_and(|t| t.text == "<") {
            return false;
        }
        let mut depth = 0usize;
        for (index, token) in self.ts.iter().enumerate().skip(self.at + 1) {
            match token.text.as_str() {
                "<" => depth += 1,
                ">" => {
                    depth = depth.saturating_sub(1);
                    if depth == 0 {
                        return self.ts.get(index + 1).is_some_and(|t| t.text == "{");
                    }
                }
                "{" | ";" | "<eof>" => return false,
                _ => (),
            }
        }
        false
    }

    pub(super) fn ordered_query(&mut self) -> LangResult<Expr> {
        self.expect("list")?;
        self.expect("<")?;
        let element = self.ty()?;
        self.expect(">")?;
        self.query_expression(Some(element))
    }

    /// A first `from` and every `join` input are evaluated once, left to right,
    /// before traversal. Additional `from` clauses are explicitly lateral:
    /// their input is evaluated once for each surviving prefix row.
    pub(super) fn query_expression(&mut self, element: Option<Type>) -> LangResult<Expr> {
        self.expect("{")?;
        self.expect("from")?;
        let mut clauses = Vec::new();
        let mut inputs = Vec::new();
        let mut binders = BTreeSet::new();
        let first = self.name()?;
        binders.insert(first.clone());
        self.expect("in")?;
        let source = self.expr(0)?;
        self.eat(";");
        let source_name = self.fresh_name();
        inputs.push((source_name.clone(), source));
        clauses.push(Clause::From {
            binder: first,
            source: var(&source_name),
        });
        let projection = loop {
            if clauses.len() > 16 {
                return Err(self.err("query clause limit exceeded (16)"));
            }
            if self.eat("from") || self.peek() == "join" {
                let join = self.eat("join");
                let binder = self.name()?;
                if !binders.insert(binder.clone()) {
                    return Err(self.err("duplicate query row binder"));
                }
                self.expect("in")?;
                let mut source = self.expr(0)?;
                if join {
                    let name = self.fresh_name();
                    inputs.push((name.clone(), source));
                    source = var(&name);
                }
                clauses.push(Clause::From { binder, source });
                if join {
                    self.expect("on")?;
                    clauses.push(Clause::Where(self.expr(0)?));
                }
                self.eat(";");
            } else if self.eat("where") {
                clauses.push(Clause::Where(self.expr(0)?));
                self.eat(";");
            } else if self.eat("select") {
                let value = self.expr(0)?;
                self.eat(";");
                self.expect("}")?;
                break value;
            } else if element.is_none() && self.eat("}") {
                break Expr::Bool(true);
            } else {
                return Err(self.err("expected from, join, where or select in query"));
            }
        };
        // A single generator is the ordinary map of its ordered filters. Keep
        // those existing logical operators visible to proof search and target
        // iterator lowering, rather than forcing an owned push accumulator.
        let mut body = if let Some(t) = &element {
            if let Some(body) = single_generator(&clauses, &projection) {
                let result = self.fresh_name();
                Expr::Let(
                    result.clone(),
                    Some(Box::new(Type::List(Box::new(t.clone())))),
                    Box::new(body),
                    Box::new(var(&result)),
                )
            } else {
                let initial_name = self.fresh_name();
                let initial = Expr::Method(Box::new(var("Buffer")), "empty".into(), vec![]);
                let body = self.query_fold(&clauses, &projection, &initial_name, true)?;
                Expr::Method(
                    Box::new(Expr::Let(
                        initial_name,
                        Some(Box::new(Type::Buffer(Box::new(t.clone())))),
                        Box::new(initial),
                        Box::new(body),
                    )),
                    "freeze".into(),
                    vec![],
                )
            }
        } else {
            let initial_name = self.fresh_name();
            let body = self.query_fold(&clauses, &projection, &initial_name, false)?;
            Expr::Let(
                initial_name,
                Some(Box::new(Type::Bool)),
                Box::new(Expr::Bool(false)),
                Box::new(body),
            )
        };
        for (name, source) in inputs.into_iter().rev() {
            body = Expr::Let(name, None, Box::new(source), Box::new(body));
        }
        self.bounded_expression(&body)?;
        Ok(body)
    }

    fn query_fold(
        &mut self,
        clauses: &[Clause],
        projection: &Expr,
        accumulator: &str,
        collect: bool,
    ) -> LangResult<Expr> {
        let Some((clause, rest)) = clauses.split_first() else {
            return Ok(if collect {
                Expr::Method(
                    Box::new(var(accumulator)),
                    "push".into(),
                    vec![projection.clone()],
                )
            } else {
                Expr::Binary(
                    "||".into(),
                    Box::new(var(accumulator)),
                    Box::new(projection.clone()),
                )
            });
        };
        match clause {
            Clause::Where(predicate) => Ok(Expr::Call(
                "choose".into(),
                vec![
                    predicate.clone(),
                    self.query_fold(rest, projection, accumulator, collect)?,
                    var(accumulator),
                ],
            )),
            Clause::From { binder, source } => {
                let next = self.fresh_name();
                let body = self.query_fold(rest, projection, &next, collect)?;
                let body = if collect {
                    body
                } else {
                    Expr::Call("choose".into(), vec![var(&next), Expr::Bool(true), body])
                };
                let step = lambda(binder.clone(), next.clone(), body);
                if collect {
                    Ok(Expr::Call(
                        "foldl".into(),
                        vec![source.clone(), var(accumulator), step],
                    ))
                } else {
                    let stop_item = self.fresh_name();
                    let stop_acc = self.fresh_name();
                    // fold_until observes old state then executes the terminal
                    // step. It may visit one lookahead row after a witness, but
                    // the guarded step performs no predicate, projection or
                    // lateral input evaluation after success.
                    let stop = lambda(stop_item, stop_acc.clone(), var(&stop_acc));
                    Ok(Expr::Call(
                        "fold_until".into(),
                        vec![source.clone(), var(accumulator), stop, step],
                    ))
                }
            }
        }
    }
}

fn single_generator(clauses: &[Clause], projection: &Expr) -> Option<Expr> {
    let (Clause::From { binder, source }, rest) = clauses.split_first()? else {
        return None;
    };
    let mut predicate = None;
    for clause in rest {
        let Clause::Where(next) = clause else {
            return None;
        };
        predicate = Some(match predicate {
            None => next.clone(),
            Some(previous) => Expr::Binary("&&".into(), Box::new(previous), Box::new(next.clone())),
        });
    }
    let source = if let Some(predicate) = predicate {
        Expr::Method(
            Box::new(source.clone()),
            "filter".into(),
            vec![Expr::Lambda(binder.clone(), Box::new(predicate))],
        )
    } else {
        source.clone()
    };
    Some(Expr::Method(
        Box::new(source),
        "map".into(),
        vec![Expr::Lambda(binder.clone(), Box::new(projection.clone()))],
    ))
}
