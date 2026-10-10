//! Fixed correspondence for total helpers in the existing word/Boolean domain.
//! Reuse the checked binder-safe semantic tree; this contains no rewrite rules.
use super::*;
use crate::semantic::{self, Node, Sort as SemanticSort, Term as SemanticTerm};

impl Lower<'_> {
    pub(super) fn pure_function(&mut self, index: usize) -> LangResult<String> {
        self.tick()?;
        if let Some(id) = self.helpers.get(&index) {
            return Ok(id.clone());
        }
        if self.helper_active.len() >= 32 || !self.helper_active.insert(index) {
            return Err("action model pure helper call depth/cycle limit".into());
        }
        let f = self.program.functions[index].clone();
        let types = f.params.iter().cloned().collect();
        let tree = semantic::elaborate(&f.body, &types, self.program, &f.result)?;
        let mut env = BTreeMap::new();
        let mut params = vec![];
        for (i, (name, ty)) in f.params.iter().enumerate() {
            let n = format!("pure_arg_{i}");
            params.push((n.clone(), self.sort(ty)?));
            env.insert(name.clone(), v(&n));
        }
        let result = self.sort(&f.result)?;
        let body = self.pure_term(&tree, &env, &[], 0)?;
        let id = self.store(Declaration::Function {
            params,
            result,
            body,
            recursive: None,
        })?;
        self.helper_active.remove(&index);
        self.helpers.insert(index, id.clone());
        Ok(id)
    }

    fn pure_term(
        &mut self,
        t: &SemanticTerm,
        env: &BTreeMap<String, Term>,
        bound: &[Term],
        depth: usize,
    ) -> LangResult<Term> {
        self.tick()?;
        if depth > 128 {
            return Err("action model pure term depth limit".into());
        }
        let SemanticSort::Value(ty) = &t.sort else {
            return Err("unsupported standalone action model pure lambda".into());
        };
        let sort = self.sort(ty)?;
        match &t.node {
            Node::Word(n) if *ty == Type::U64 => Ok(Term::U64(*n)),
            Node::Bool(n) => Ok(Term::Bool(*n)),
            Node::Free(n) => env
                .get(n)
                .cloned()
                .ok_or("unbound action model pure name".into()),
            Node::Bound(i) => bound
                .iter()
                .rev()
                .nth(*i)
                .cloned()
                .ok_or("unbound action model pure index".into()),
            Node::Op(op, args) => {
                if op == "apply" {
                    let [function, argument] = args.as_slice() else {
                        return Err("action model pure application arity".into());
                    };
                    let Node::Lambda(body) = &function.node else {
                        return Err("unsupported action model pure application".into());
                    };
                    let SemanticSort::Value(argument_type) = &argument.sort else {
                        return Err("unsupported action model pure argument".into());
                    };
                    let value = self.pure_term(argument, env, bound, depth + 1)?;
                    let argument_sort = self.sort(argument_type)?;
                    return self.bind(argument_sort, value, |this, value| {
                        let mut local = bound.to_vec();
                        local.push(value);
                        this.pure_term(body, env, &local, depth + 1)
                    });
                }
                let xs = args
                    .iter()
                    .map(|x| self.pure_term(x, env, bound, depth + 1))
                    .collect::<LangResult<Vec<_>>>()?;
                match op.as_str() {
                    "call:choose" if xs.len() == 3 => {
                        Ok(choice(xs[0].clone(), xs[1].clone(), xs[2].clone()))
                    }
                    _ if op.starts_with("binary:") && xs.len() == 2 => {
                        let operator = &op[7..];
                        Ok(match operator {
                            "&&" => choice(xs[0].clone(), xs[1].clone(), Term::Bool(false)),
                            "||" => choice(xs[0].clone(), Term::Bool(true), xs[1].clone()),
                            _ => b(operator, xs[0].clone(), xs[1].clone()),
                        })
                    }
                    _ if op.starts_with("record:") => Ok(c(id(&sort)?, 0, xs)),
                    _ if op.starts_with("field:") && xs.len() == 1 => {
                        let SemanticSort::Value(Type::Named(record)) = &args[0].sort else {
                            return Err("action model pure field receiver".into());
                        };
                        let fields = &self.program.records[record];
                        let field = fields
                            .iter()
                            .position(|(n, _)| n == &op[6..])
                            .ok_or("action model pure field index")?;
                        let names = (0..fields.len()).map(|_| self.fresh()).collect::<Vec<_>>();
                        Ok(m(xs[0].clone(), vec![(names.clone(), v(&names[field]))]))
                    }
                    _ if op.starts_with("call:") => {
                        let index = self
                            .program
                            .functions
                            .iter()
                            .position(|f| f.name == op[5..])
                            .ok_or_else(|| {
                                format!("unsupported action model pure operation {op}")
                            })?;
                        let function = self.pure_function(index)?;
                        Ok(call(&function, xs))
                    }
                    _ => Err(format!("unsupported action model pure operation {op}")),
                }
            }
            _ => Err("unsupported action model pure term".into()),
        }
    }
}
