//! Fixed ordered key selection and transactional batch semantics. Algorithm
//! alternatives and maintenance laws are supplied by knowledge, not this model.
use super::*;
impl Lower<'_> {
    pub(super) fn upsert_function(&mut self, table: &Table) -> LangResult<String> {
        let key = self.sort(&table.key_type)?;
        let value = self.sort(&table.value_type)?;
        self.function(
            vec![
                ("rows", Sort::Data(table.datatype.clone())),
                ("key", key),
                ("value", value),
            ],
            Sort::Data(table.datatype.clone()),
            choice(
                call(&table.contains, vec![v("rows"), v("key")]),
                call(&table.replace, vec![v("rows"), v("key"), v("value")]),
                call(&table.insert, vec![v("rows"), v("key"), v("value")]),
            ),
            None,
        )
    }
    pub(super) fn intersect_table(
        &mut self,
        root: usize,
        keys: Term,
        state: &Term,
    ) -> LangResult<Term> {
        let table = self.tables[root].clone();
        let key = self.sort(&table.key_type)?;
        let list = self.sort(&Type::List(Box::new(table.key_type.clone())))?;
        let eq = self.operator(&table.key_type, "==", v("head"), v("key"))?;
        let contains = self.function(
            vec![("keys", list.clone()), ("key", key)],
            Sort::Bool,
            m(
                v("keys"),
                vec![
                    (vec![], Term::Bool(false)),
                    (
                        vec!["head".into(), "tail".into()],
                        choice(
                            eq,
                            Term::Bool(true),
                            Term::SelfCall(vec![v("tail"), v("key")]),
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let next = Term::SelfCall(vec![v("tail"), v("keys")]);
        let select = self.function(
            vec![
                ("rows", Sort::Data(table.datatype.clone())),
                ("keys", list.clone()),
            ],
            list.clone(),
            m(
                v("rows"),
                vec![
                    (vec![], c(id(&list)?, 0, vec![])),
                    (
                        vec!["key".into(), "value".into(), "tail".into()],
                        choice(
                            call(&contains, vec![v("keys"), v("key")]),
                            c(id(&list)?, 1, vec![v("key"), next.clone()]),
                            next,
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        Ok(call(&select, vec![self.root(state.clone(), root)?, keys]))
    }
    pub(super) fn bulk_table(
        &mut self,
        root: usize,
        method: &str,
        xs: &[Term],
        state: Term,
    ) -> LangResult<(Term, Term)> {
        let table = self.tables[root].clone();
        let rows = self.root(state.clone(), root)?;
        let keys = self.sort(&Type::List(Box::new(table.key_type.clone())))?;
        let table_sort = Sort::Data(table.datatype.clone());
        let unit = self.sort(&Type::Unit)?;
        if method == "remove_many" {
            let f = self.function(
                vec![("keys", keys), ("rows", table_sort)],
                Sort::Data(table.datatype.clone()),
                m(
                    v("keys"),
                    vec![
                        (vec![], v("rows")),
                        (
                            vec!["key".into(), "tail".into()],
                            Term::SelfCall(vec![
                                v("tail"),
                                call(&table.remove, vec![v("rows"), v("key")]),
                            ]),
                        ),
                    ],
                ),
                Some(0),
            )?;
            let new = self.update(state, root, call(&f, vec![xs[0].clone(), rows]))?;
            return Ok((c(id(&unit)?, 0, vec![]), new));
        }
        let values = self.sort(&Type::List(Box::new(table.value_type.clone())))?;
        let same = self.function(
            vec![("keys", keys.clone()), ("values", values.clone())],
            Sort::Bool,
            m(
                v("keys"),
                vec![
                    (
                        vec![],
                        m(
                            v("values"),
                            vec![
                                (vec![], Term::Bool(true)),
                                (vec!["value".into(), "vtail".into()], Term::Bool(false)),
                            ],
                        ),
                    ),
                    (
                        vec!["key".into(), "ktail".into()],
                        m(
                            v("values"),
                            vec![
                                (vec![], Term::Bool(false)),
                                (
                                    vec!["value".into(), "vtail".into()],
                                    Term::SelfCall(vec![v("ktail"), v("vtail")]),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let upsert = self.upsert_function(&table)?;
        let writes = self.function(
            vec![
                ("keys", keys),
                ("values", values),
                ("rows", table_sort.clone()),
            ],
            table_sort,
            m(
                v("keys"),
                vec![
                    (vec![], v("rows")),
                    (
                        vec!["key".into(), "ktail".into()],
                        m(
                            v("values"),
                            vec![
                                (vec![], v("rows")),
                                (
                                    vec!["value".into(), "vtail".into()],
                                    Term::SelfCall(vec![
                                        v("ktail"),
                                        v("vtail"),
                                        call(&upsert, vec![v("rows"), v("key"), v("value")]),
                                    ]),
                                ),
                            ],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        let valid = call(&same, vec![xs[0].clone(), xs[1].clone()]);
        let result = self.sort(&Type::Result(Box::new(Type::Unit), Box::new(Type::String)))?;
        let error = self.string_literal("table bulk length mismatch")?;
        let value = choice(
            valid.clone(),
            c(id(&result)?, 0, vec![c(id(&unit)?, 0, vec![])]),
            c(id(&result)?, 1, vec![error]),
        );
        let new = choice(
            valid,
            self.update(
                state.clone(),
                root,
                call(&writes, vec![xs[0].clone(), xs[1].clone(), rows]),
            )?,
            state,
        );
        Ok((value, new))
    }
}
