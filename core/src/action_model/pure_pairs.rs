//! Fixed pure paired-list and sum mapping semantics. Callbacks execute in
//! source order; paired lists stop at the shorter input and sums stay lazy.
use super::*;
use crate::semantic::{Node, Sort as SemanticSort, Term as SemanticTerm};

impl Lower<'_> {
    pub(super) fn pure_sum_map(
        &mut self,
        t: &SemanticTerm,
        args: &[SemanticTerm],
        env: &BTreeMap<String, Term>,
        bound: &[Term],
        depth: usize,
    ) -> LangResult<Term> {
        let [receiver, callback] = args else {
            return Err("pure sum map arity".into());
        };
        let Node::Lambda(body) = &callback.node else {
            return Err("pure sum map callback".into());
        };
        let SemanticSort::Value(output) = &t.sort else {
            return Err("pure sum map result".into());
        };
        let output = self.sort(output)?;
        let input = self.pure_term(receiver, env, bound, depth + 1)?;
        let payload = self.fresh();
        let mut local = bound.to_vec();
        local.push(v(&payload));
        let mapped = self.pure_term(body, env, &local, depth + 1)?;
        let branches = match &receiver.sort {
            SemanticSort::Value(Type::Option(_)) => vec![
                (vec![], c(id(&output)?, 0, vec![])),
                (vec![payload], c(id(&output)?, 1, vec![mapped])),
            ],
            SemanticSort::Value(Type::Result(..)) => {
                let error = self.fresh();
                vec![
                    (vec![payload], c(id(&output)?, 0, vec![mapped])),
                    (vec![error.clone()], c(id(&output)?, 1, vec![v(&error)])),
                ]
            }
            _ => return Err("pure sum map receiver".into()),
        };
        Ok(m(input, branches))
    }

    pub(super) fn pure_zip(
        &mut self,
        t: &SemanticTerm,
        args: &[SemanticTerm],
        env: &BTreeMap<String, Term>,
        bound: &[Term],
        depth: usize,
    ) -> LangResult<Term> {
        let [left, right, callback] = args else {
            return Err("pure zip arity".into());
        };
        let (
            SemanticSort::Value(Type::List(_)),
            SemanticSort::Value(Type::List(_)),
            SemanticSort::Value(output_type),
        ) = (&left.sort, &right.sort, &t.sort)
        else {
            return Err("pure zip types".into());
        };
        let SemanticSort::Value(left_type) = &left.sort else {
            unreachable!()
        };
        let SemanticSort::Value(right_type) = &right.sort else {
            unreachable!()
        };
        let left_sort = self.sort(left_type)?;
        let right_sort = self.sort(right_type)?;
        let output = self.sort(output_type)?;
        let mut free = BTreeMap::new();
        let mut slots = BTreeMap::new();
        fn captures(
            t: &SemanticTerm,
            depth: usize,
            free: &mut BTreeMap<String, Type>,
            slots: &mut BTreeMap<usize, Type>,
        ) {
            match &t.node {
                Node::Free(n) => {
                    if let SemanticSort::Value(ty) = &t.sort {
                        free.insert(n.clone(), ty.clone());
                    }
                }
                Node::Bound(i) if *i >= depth => {
                    if let SemanticSort::Value(ty) = &t.sort {
                        slots.insert(*i - depth, ty.clone());
                    }
                }
                Node::Lambda(t) => captures(t, depth + 1, free, slots),
                _ => {
                    for child in crate::semantic::children(t) {
                        captures(child, depth, free, slots)
                    }
                }
            }
        }
        captures(callback, 0, &mut free, &mut slots);
        let mut params = vec![
            ("zip_left".into(), left_sort),
            ("zip_right".into(), right_sort),
        ];
        let mut arguments = vec![
            self.pure_term(left, env, bound, depth + 1)?,
            self.pure_term(right, env, bound, depth + 1)?,
        ];
        let mut recursive = vec![v("zip_left_tail"), v("zip_right_tail")];
        let mut local_env = BTreeMap::new();
        let mut local_bound = bound.to_vec();
        for (name, ty) in free {
            let parameter = self.fresh();
            params.push((parameter.clone(), self.sort(&ty)?));
            arguments.push(env.get(&name).cloned().ok_or("pure zip capture")?);
            recursive.push(v(&parameter));
            local_env.insert(name, v(&parameter));
        }
        for (slot, ty) in slots {
            let at = bound
                .len()
                .checked_sub(slot + 1)
                .ok_or("pure zip bound capture")?;
            let parameter = self.fresh();
            params.push((parameter.clone(), self.sort(&ty)?));
            arguments.push(bound[at].clone());
            recursive.push(v(&parameter));
            local_bound[at] = v(&parameter);
        }
        let Node::Lambda(body) = &callback.node else {
            return Err("pure zip first callback".into());
        };
        let Node::Lambda(body) = &body.node else {
            return Err("pure zip second callback".into());
        };
        local_bound.push(v("zip_left_head"));
        local_bound.push(v("zip_right_head"));
        let mapped = self.pure_term(body, &local_env, &local_bound, depth + 1)?;
        let nil = c(id(&output)?, 0, vec![]);
        let body = m(
            v("zip_left"),
            vec![
                (vec![], nil.clone()),
                (
                    vec!["zip_left_head".into(), "zip_left_tail".into()],
                    m(
                        v("zip_right"),
                        vec![
                            (vec![], nil),
                            (
                                vec!["zip_right_head".into(), "zip_right_tail".into()],
                                c(id(&output)?, 1, vec![mapped, Term::SelfCall(recursive)]),
                            ),
                        ],
                    ),
                ),
            ],
        );
        let function = self.store(Declaration::Function {
            params,
            result: output,
            body,
            recursive: Some(0),
        })?;
        Ok(call(&function, arguments))
    }
}
