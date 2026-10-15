//! Literal source list traversal and keep recomputation. No maintenance policy.
use super::*;
impl Lower<'_> {
    pub(super) fn table_sequence(
        &mut self,
        root: usize,
        method: &str,
        state: &Term,
    ) -> LangResult<Term> {
        let table = self.tables[root].clone();
        let element = if method == "keys" { table.key_type } else { table.value_type };
        let output = self.sort(&Type::List(Box::new(element)))?;
        let table_sort = Sort::Data(table.datatype);
        let head = if method == "keys" {
            v("sequence_key")
        } else {
            v("sequence_value")
        };
        let f = self.function(
            vec![("sequence_rows", table_sort)],
            output.clone(),
            m(
                v("sequence_rows"),
                vec![
                    (vec![], c(id(&output)?, 0, vec![])),
                    (
                        vec![
                            "sequence_key".into(),
                            "sequence_value".into(),
                            "sequence_tail".into(),
                        ],
                        c(
                            id(&output)?,
                            1,
                            vec![head, Term::SelfCall(vec![v("sequence_tail")])],
                        ),
                    ),
                ],
            ),
            Some(0),
        )?;
        Ok(call(&f, vec![self.root(state.clone(), root)?]))
    }
    pub(super) fn reduce_expr(
        &mut self,
        body: &Body,
        name: &str,
        arguments: &[NodeId],
        env: &BTreeMap<usize, Term>,
        state: &Term,
    ) -> LangResult<Term> {
        let [argument] = arguments else {
            return Err("reduction arity".into());
        };
        let ExprType::Value(Type::List(element)) = &body.nodes[*argument].ty else {
            return Err("reduction list type".into());
        };
        if name == "sum" && **element == Type::F32 {
            let sequence = self.sort(&Type::List(element.clone()))?;
            let step = Term::SelfCall(vec![
                v("float_tail"),
                b("f32:+", v("float_acc"), v("float_head")),
            ]);
            let f = self.function(
                vec![("float_rows", sequence), ("float_acc", Sort::U64)],
                Sort::U64,
                m(
                    v("float_rows"),
                    vec![
                        (vec![], v("float_acc")),
                        (vec!["float_head".into(), "float_tail".into()], step),
                    ],
                ),
                Some(0),
            )?;
            let value = self.expr(body, *argument, env, state)?;
            return Ok(call(&f, vec![value, Term::U64(0)]));
        }
        if name == "sum" && !matches!(**element, Type::U64 | Type::U32 | Type::I32 | Type::Int) {
            return Err("unsupported reduction numerical correspondence".into());
        }
        let sequence = self.sort(&Type::List(element.clone()))?;
        let ExprType::Value(result_type) = &body.nodes[arguments[0]].ty else {
            unreachable!()
        };
        let _ = result_type;
        let result_type = if name == "count" {
            Type::Int
        } else {
            (**element).clone()
        };
        let result_sort = self.sort(&result_type)?;
        let zero = if result_type == Type::Int {
            self.integer_literal(0)?
        } else {
            Term::U64(0)
        };
        let head = if name == "count" {
            self.integer_literal(1)?
        } else {
            v("reduce_head")
        };
        let step = self.operator(
            &result_type,
            "+",
            head,
            Term::SelfCall(vec![v("reduce_tail")]),
        )?;
        let f = self.function(
            vec![("reduce_rows", sequence)],
            result_sort,
            m(
                v("reduce_rows"),
                vec![
                    (vec![], zero),
                    (vec!["reduce_head".into(), "reduce_tail".into()], step),
                ],
            ),
            Some(0),
        )?;
        let value = self.expr(body, *argument, env, state)?;
        Ok(call(&f, vec![value]))
    }
    pub(super) fn collection_expr(
        &mut self,
        body: &Body,
        receiver: NodeId,
        method: &str,
        arguments: &[NodeId],
        env: &BTreeMap<usize, Term>,
        state: &Term,
    ) -> LangResult<Term> {
        self.collection_value(body,receiver,method,arguments,env,state,None)
    }
    pub(super) fn collection_value(
        &mut self, body:&Body, receiver:NodeId, method:&str, arguments:&[NodeId],
        env:&BTreeMap<usize,Term>, state:&Term, evaluated:Option<Term>,
    ) -> LangResult<Term> {
        if ["keys", "values"].contains(&method) {
            let Kind::State(root) = body.nodes[receiver].kind else {
                return Err("collection requires source table".into());
            };
            return self.table_sequence(root, method, state);
        }
        let [lambda] = arguments else { return Err("list traversal arity".into()); };
        let Kind::Lambda { parameter, body: expression } = body.nodes[*lambda].kind else { return Err("list traversal lambda".into()); };
        if matches!(&body.nodes[receiver].ty,ExprType::Value(Type::Option(_))) && method=="map" {
            let ExprType::Value(result_type)=&body.nodes[expression].ty else{return Err("option mapper result".into());};
            let output=self.sort(&Type::Option(Box::new(result_type.clone())))?;
            let input=match &evaluated {Some(value)=>value.clone(),None=>self.expr(body,receiver,env,state)?};
            let name=self.fresh();let mut local=env.clone();local.insert(parameter,v(&name));
            let mapped=self.expr(body,expression,&local,state)?;
            return Ok(m(input,vec![(vec![],c(id(&output)?,0,vec![])),(vec![name],c(id(&output)?,1,vec![mapped]))]));
        }
        let ExprType::Value(Type::List(_)) = &body.nodes[receiver].ty else { return Err("list traversal receiver".into()); };
        let input_type = match &body.nodes[receiver].ty { ExprType::Value(t) => t, _ => unreachable!() };
        let input_sort = self.sort(input_type)?;
        let output_type = if method == "filter" {
            input_type.clone()
        } else {
            let ExprType::Value(t) = &body.nodes[expression].ty else {
                return Err("list mapper result".into());
            };
            Type::List(Box::new(t.clone()))
        };
        let output = self.sort(&output_type)?;
        let mut params = vec![("traverse_rows".to_string(), input_sort)];
        let mut args = vec![match evaluated {Some(value)=>value,None=>self.expr(body,receiver,env,state)?}];
        let mut recursive = vec![v("traverse_tail")];
        // Conservatively capture state only when the lambda contains a state read.
        // A pure row mapper has no hidden whole-table parameter.
        fn dependencies(body: &Body, n: NodeId, slots: &mut BTreeSet<usize>) -> bool {
            match &body.nodes[n].kind {
                Kind::State(_) | Kind::Keep(_) => true,
                Kind::Table { arguments, .. }
                | Kind::QueryCall { arguments, .. }
                | Kind::ChangeCall { arguments, .. } => {
                    for argument in arguments {
                        dependencies(body, *argument, slots);
                    }
                    true
                }
                Kind::Local(slot) => {
                    slots.insert(*slot);
                    false
                }
                Kind::Field { receiver, .. }
                | Kind::VectorField { receiver, .. }
                | Kind::Neg { value: receiver }
                | Kind::Try { value: receiver } => dependencies(body, *receiver, slots),
                Kind::Binary { left, right, .. }
                | Kind::And { left, right }
                | Kind::Or { left, right } => {
                    dependencies(body, *left, slots) | dependencies(body, *right, slots)
                }
                Kind::Builtin { arguments, .. } | Kind::PureCall { arguments, .. } => arguments
                    .iter()
                    .fold(false, |state, x| dependencies(body, *x, slots) | state),
                Kind::Record { fields, .. } => fields
                    .iter()
                    .fold(false, |state, (_, x)| dependencies(body, *x, slots) | state),
                Kind::Method {
                    receiver,
                    arguments,
                    ..
                } => {
                    let state = dependencies(body, *receiver, slots);
                    arguments
                        .iter()
                        .fold(state, |state, x| dependencies(body, *x, slots) | state)
                }
                Kind::Lambda {
                    body: expression, ..
                } => dependencies(body, *expression, slots),
                Kind::Bind {
                    value,
                    body: expression,
                    ..
                } => dependencies(body, *value, slots) | dependencies(body, *expression, slots),
                Kind::Number(_)
                | Kind::Float(_)
                | Kind::String(_)
                | Kind::Bool(_)
                | Kind::Unit
                | Kind::None
                | Kind::Enum { .. } => false,
            }
        }
        let mut captured_slots = BTreeSet::new();
        let stateful = dependencies(body, expression, &mut captured_slots);
        let lambda_state = if stateful {
            params.push(("traverse_state".into(), Sort::Data(self.state.clone())));
            args.push(state.clone());
            recursive.push(v("traverse_state"));
            v("traverse_state")
        } else {
            Term::Bool(false)
        };
        let mut local = BTreeMap::new();
        for (slot, term) in env {
            if !captured_slots.contains(slot) {
                continue;
            }
            let name = format!("traverse_capture_{slot}");
            let sort = self.sort(&body.slots[*slot].ty)?;
            params.push((name.clone(), sort));
            args.push(term.clone());
            recursive.push(v(&name));
            local.insert(*slot, v(&name));
        }
        local.insert(parameter, v("traverse_head"));
        let mapped = self.expr(body, expression, &local, &lambda_state)?;
        let tail = Term::SelfCall(recursive);
        let step = if method == "filter" {
            choice(
                mapped,
                c(id(&output)?, 1, vec![v("traverse_head"), tail.clone()]),
                tail,
            )
        } else {
            c(id(&output)?, 1, vec![mapped, tail])
        };
        let f = self.store(Declaration::Function {
            params,
            result: output.clone(),
            body: m(
                v("traverse_rows"),
                vec![
                    (vec![], c(id(&output)?, 0, vec![])),
                    (vec!["traverse_head".into(), "traverse_tail".into()], step),
                ],
            ),
            recursive: Some(0),
        })?;
        Ok(call(&f, args))
    }
}

impl Lower<'_> {
    pub(super) fn table_scan(&mut self, body:&Body, root:usize, method:&str, lambda:NodeId,
        env:&BTreeMap<usize,Term>, state:&Term, result_type:&Type) -> LangResult<Term> {
        let Kind::Lambda {parameter,body:expression}=body.nodes[lambda].kind else {return Err("scan projection lambda".into());};
        let table=self.tables[root].clone();let result=self.sort(result_type)?;
        let zero=if *result_type==Type::Int {self.integer_literal(0)?}else{Term::U64(0)};
        let mut params=vec![("scan_rows".into(),Sort::Data(table.datatype)),("scan_acc".into(),result.clone()),("scan_state".into(),Sort::Data(self.state.clone()))];
        let mut arguments=vec![self.root(state.clone(),root)?,zero,state.clone()];
        let mut local=BTreeMap::new();let mut captures=vec![];
        for (slot,term) in env {
            let name=format!("scan_capture_{slot}");let sort=self.sort(&body.slots[*slot].ty)?;
            params.push((name.clone(),sort));arguments.push(term.clone());captures.push(v(&name));local.insert(*slot,v(&name));
        }
        local.insert(parameter,v("scan_value"));
        let contribution=self.expr(body,expression,&local,&v("scan_state"))?;
        let contribution=if method=="count_where" {choice(contribution,self.integer_literal(1)?,self.integer_literal(0)?)}else{contribution};
        let next=self.operator(result_type,"+",v("scan_acc"),contribution)?;
        let mut recur=vec![v("scan_tail"),next,v("scan_state")];recur.extend(captures);
        let function=self.store(Declaration::Function {params,result,body:m(v("scan_rows"),vec![(vec![],v("scan_acc")),(vec!["scan_key".into(),"scan_value".into(),"scan_tail".into()],Term::SelfCall(recur))]),recursive:Some(0)})?;
        Ok(call(&function,arguments))
    }
}
