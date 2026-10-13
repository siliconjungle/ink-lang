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
        // Local-owner helpers can remain symbolic until their inductive input
        // is exposed. These helpers have no SelfCall; the existing structural
        // definition form is total and emits the same literal body. This avoids
        // expanding every heap/search branch while proving an outer projection.
        fn owners(t:&SemanticTerm,p:&Program)->bool {
            matches!(&t.sort,SemanticSort::Value(ty) if crate::local_collections::owned(ty,p))
                || semantic::children(t).iter().any(|child|owners(child,p))
        }
        let recursive=if owners(&tree,self.program) {
            params.iter().position(|(_,sort)|matches!(sort,Sort::Data(_)))
        }else{None};
        let id = self.store(Declaration::Function {
            params,
            result,
            body,
            recursive,
        })?;
        self.helper_active.remove(&index);
        self.helpers.insert(index, id.clone());
        Ok(id)
    }

    fn pure_collection(
        &mut self,
        t: &SemanticTerm,
        op: &str,
        args: &[SemanticTerm],
        env: &BTreeMap<String, Term>,
        bound: &[Term],
        depth: usize,
    ) -> LangResult<Term> {
        let (lambda, initial) = if op == "call:foldr" {
            (&args[2], Some(&args[1]))
        } else {
            (&args[1], None)
        };
        let SemanticSort::Value(input_type) = &args[0].sort else {
            return Err("pure traversal input".into());
        };
        let SemanticSort::Value(output_type) = &t.sort else {
            return Err("pure traversal output".into());
        };
        let input = self.sort(input_type)?;
        let output = self.sort(output_type)?;
        let mut free = BTreeMap::new();
        let mut captured_bound = BTreeMap::new();
        fn captures(
            t: &SemanticTerm,
            d: usize,
            free: &mut BTreeMap<String, Type>,
            captured: &mut BTreeMap<usize, Type>,
        ) {
            match &t.node {
                Node::Free(n) => {
                    if let SemanticSort::Value(ty) = &t.sort {
                        free.insert(n.clone(), ty.clone());
                    }
                }
                Node::Bound(i) if *i >= d => {
                    if let SemanticSort::Value(ty) = &t.sort {
                        captured.insert(*i - d, ty.clone());
                    }
                }
                Node::Lambda(t) => captures(t, d + 1, free, captured),
                Node::Op(_, xs) => {
                    for x in xs {
                        captures(x, d, free, captured)
                    }
                }
                Node::Cons(a, z) => {
                    captures(a, d, free, captured);
                    captures(z, d, free, captured)
                }
                _ => {}
            }
        }
        captures(lambda, 0, &mut free, &mut captured_bound);
        let mut params = vec![("pure_rows".to_string(), input)];
        let mut arguments = vec![self.pure_term(&args[0], env, bound, depth + 1)?];
        let mut recursive = vec![v("pure_tail")];
        let mut local_env = BTreeMap::new();
        let mut local_bound = bound.to_vec();
        for (n, ty) in free {
            let name = self.fresh();
            params.push((name.clone(), self.sort(&ty)?));
            arguments.push(env.get(&n).cloned().ok_or("pure capture")?);
            recursive.push(v(&name));
            local_env.insert(n, v(&name));
        }
        for (i, ty) in captured_bound {
            let at = bound.len().checked_sub(i + 1).ok_or("pure bound capture")?;
            let name = self.fresh();
            params.push((name.clone(), self.sort(&ty)?));
            arguments.push(bound[at].clone());
            recursive.push(v(&name));
            local_bound[at] = v(&name);
        }
        let nil = if let Some(initial) = initial {
            params.push(("pure_initial".into(), output.clone()));
            arguments.push(self.pure_term(initial, env, bound, depth + 1)?);
            recursive.push(v("pure_initial"));
            v("pure_initial")
        } else {
            c(id(&output)?, 0, vec![])
        };
        let recur = Term::SelfCall(recursive);
        let Node::Lambda(body) = &lambda.node else {
            return Err("pure traversal lambda".into());
        };
        local_bound.push(v("pure_head"));
        let mapped = if initial.is_some() {
            let Node::Lambda(body) = &body.node else {
                return Err("pure fold accumulator".into());
            };
            local_bound.push(recur.clone());
            self.pure_term(body, &local_env, &local_bound, depth + 1)?
        } else {
            self.pure_term(body, &local_env, &local_bound, depth + 1)?
        };
        let cons = if op == "call:foldr" {
            mapped
        } else if op == "method:filter" {
            choice(
                mapped,
                c(id(&output)?, 1, vec![v("pure_head"), recur.clone()]),
                recur,
            )
        } else {
            c(id(&output)?, 1, vec![mapped, recur])
        };
        let function = self.store(Declaration::Function {
            params,
            result: output,
            body: m(
                v("pure_rows"),
                vec![
                    (vec![], nil),
                    (vec!["pure_head".into(), "pure_tail".into()], cons),
                ],
            ),
            recursive: Some(0),
        })?;
        Ok(call(&function, arguments))
    }

    pub(super) fn pure_term(
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
            Node::Word(n) if matches!(ty, Type::U64 | Type::U32 | Type::I32) => Ok(Term::U64(*n)),
            Node::Word(n) if *ty == Type::Int => self.integer_literal(*n),
            Node::Unit => Ok(c(id(&sort)?, 0, vec![])),
            Node::Nil => Ok(c(id(&sort)?, 0, vec![])),
            Node::Cons(head, tail) => {
                let h = self.pure_term(head, env, bound, depth + 1)?;
                let z = self.pure_term(tail, env, bound, depth + 1)?;
                Ok(c(id(&sort)?, 1, vec![h, z]))
            }
            Node::Float(bits) => Ok(Term::U64(*bits as u64)),
            Node::Bool(n) => Ok(Term::Bool(*n)),
            Node::String(text) => self.string_literal(text),
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
                if op=="call:repeat"||op=="call:repeat_until" {return self.pure_loop(t,op,args,env,bound,depth);}
                if let Some(value)=self.pure_local(t,op,args,env,bound,depth)? {return Ok(value);}
                if ["method:map", "method:filter", "call:foldr"].contains(&op.as_str()) {
                    return self.pure_collection(t, op, args, env, bound, depth);
                }
                if op == "method:fold" {
                    let [receiver, yes, no] = args.as_slice() else {
                        return Err("pure fold arity".into());
                    };
                    let value = self.pure_term(receiver, env, bound, depth + 1)?;
                    let yes_name = self.fresh();
                    let no_name = self.fresh();
                    let branch = |this: &mut Self, callback: &SemanticTerm, input: Term| {
                        let Node::Lambda(body) = &callback.node else {
                            return Err("pure fold callback".into());
                        };
                        let mut local = bound.to_vec();
                        local.push(input);
                        this.pure_term(body, env, &local, depth + 1)
                    };
                    let branches = match &receiver.sort {
                        SemanticSort::Value(Type::Option(_)) => {
                            let unit = self.sort(&Type::Unit)?;
                            vec![
                                (vec![], branch(self, no, c(id(&unit)?, 0, vec![]))?),
                                (vec![yes_name.clone()], branch(self, yes, v(&yes_name))?),
                            ]
                        }
                        SemanticSort::Value(Type::Result(..)) => vec![
                            (vec![yes_name.clone()], branch(self, yes, v(&yes_name))?),
                            (vec![no_name.clone()], branch(self, no, v(&no_name))?),
                        ],
                        _ => return Err("pure fold receiver".into()),
                    };
                    return Ok(m(value, branches));
                }
                if op == "neg" && matches!(ty, Type::Int | Type::I32 | Type::F32) {
                    let [value] = args.as_slice() else {
                        return Err("pure neg arity".into());
                    };
                    let x = self.pure_term(value, env, bound, depth + 1)?;
                    return if *ty == Type::Int {
                        let i = self.integer()?;
                        Ok(call(&i.negate, vec![x]))
                    } else if *ty == Type::F32 {
                        Ok(b("f32:neg", x, Term::U64(0)))
                    } else {
                        self.operator(ty, "-", Term::U64(0), x)
                    };
                }
                if let Some(name)=op.strip_prefix("call:") {
                    if ["sqrt","f32_div","floor","ceil","trunc","round_ties_even","is_nan","is_finite"].contains(&name) {
                        let x=self.pure_term(&args[0],env,bound,depth+1)?;
                        let y=if name=="f32_div"{self.pure_term(&args[1],env,bound,depth+1)?}else{Term::U64(0)};
                        return Ok(b(&format!("f32:{}",if name=="f32_div"{"div"}else{name}),x,y));
                    }
                    if name=="f32_bits"||name=="f32_from_bits" {let x=self.pure_term(&args[0],env,bound,depth+1)?;return Ok(b("&",x,Term::U64(u32::MAX as u64)));}
                }
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
                    "method:sort" if xs.len()==1 => {
                        let SemanticSort::Value(Type::List(element))=&args[0].sort else {
                            return Err("sort correspondence requires a list".into());
                        };
                        if !matches!(**element,Type::U32|Type::U64|Type::I32){
                            return Err("sort correspondence supports exact word order".into());
                        }
                        // Literal stable insertion-sort meaning of the existing
                        // primitive. This is correspondence, not a rewrite or an
                        // invariant recogniser; replacement still needs a proof.
                        let sequence=self.sort(&Type::List(element.clone()))?;
                        let datatype=id(&sequence)?.to_owned();
                        let scalar=self.sort(element)?;
                        let inserted=c(&datatype,1,vec![v("sort_item"),v("sort_rows")]);
                        let after=c(&datatype,1,vec![v("sort_head"),Term::SelfCall(vec![v("sort_item"),v("sort_tail")])]);
                        let condition=self.operator(element,"<=",v("sort_item"),v("sort_head"))?;
                        let insert=self.function(vec![("sort_item",scalar),("sort_rows",sequence.clone())],sequence.clone(),
                            m(v("sort_rows"),vec![
                                (vec![],c(&datatype,1,vec![v("sort_item"),c(&datatype,0,vec![])])),
                                (vec!["sort_head".into(),"sort_tail".into()],choice(condition,inserted,after)),
                            ]),Some(1))?;
                        let sorted=self.function(vec![("sort_rows",sequence.clone())],sequence,
                            m(v("sort_rows"),vec![
                                (vec![],c(&datatype,0,vec![])),
                                (vec!["sort_head".into(),"sort_tail".into()],call(&insert,vec![v("sort_head"),Term::SelfCall(vec![v("sort_tail")])])),
                            ]),Some(0))?;
                        Ok(call(&sorted,xs))
                    }
                    "call:count" | "call:sum" if xs.len() == 1 => {
                        let SemanticSort::Value(Type::List(inner)) = &args[0].sort else {
                            return Err("action model reduction list".into());
                        };
                        if op == "call:sum" && **inner == Type::F32 {
                            let sequence = self.sort(&Type::List(inner.clone()))?;
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
                            return Ok(call(&f, vec![xs[0].clone(), Term::U64(0)]));
                        }
                        if op == "call:sum"
                            && !matches!(**inner, Type::U64 | Type::U32 | Type::I32 | Type::Int)
                        {
                            return Err("unsupported pure sum correspondence".into());
                        }
                        let sequence = self.sort(&Type::List(inner.clone()))?;
                        let zero = if *ty == Type::Int {
                            self.integer_literal(0)?
                        } else {
                            Term::U64(0)
                        };
                        let head = if op == "call:count" {
                            if *ty == Type::Int {
                                self.integer_literal(1)?
                            } else {
                                Term::U64(1)
                            }
                        } else {
                            v("reduce_head")
                        };
                        let step =
                            self.operator(ty, "+", head, Term::SelfCall(vec![v("reduce_tail")]))?;
                        let f = self.function(
                            vec![("reduce_rows", sequence)],
                            sort,
                            m(
                                v("reduce_rows"),
                                vec![
                                    (vec![], zero),
                                    (vec!["reduce_head".into(), "reduce_tail".into()], step),
                                ],
                            ),
                            Some(0),
                        )?;
                        Ok(call(&f, xs))
                    }
                    "call:quot_or" | "call:rem_or" if xs.len() == 3 => {
                        self.division(ty, &op[5..], xs[0].clone(), xs[1].clone(), xs[2].clone())
                    }
                    "call:vec2" | "call:vec3" | "call:vec4" => Ok(c(id(&sort)?, 0, xs)),
                    "call:choose" if xs.len() == 3 => {
                        Ok(choice(xs[0].clone(), xs[1].clone(), xs[2].clone()))
                    }
                    _ if op.starts_with("binary:") && xs.len() == 2 => {
                        let operator = &op[7..];
                        Ok(match operator {
                            "&&" => choice(xs[0].clone(), xs[1].clone(), Term::Bool(false)),
                            "||" => choice(xs[0].clone(), Term::Bool(true), xs[1].clone()),
                            _ => {
                                let SemanticSort::Value(t) = &args[0].sort else {
                                    return Err("pure operator type".into());
                                };
                                self.operator(t, operator, xs[0].clone(), xs[1].clone())?
                            }
                        })
                    }
                    _ if op.starts_with("record:") => {
                        let name=&op[7..];
                        if self.recursive_records.contains_key(name) {self.recursive_record(name,xs)}
                        else {Ok(c(id(&sort)?,0,xs))}
                    },
                    _ if op.starts_with("field:") && xs.len() == 1 => {
                        if let SemanticSort::Value(Type::Vector(_, n)) = &args[0].sort {
                            let component = ["x", "y", "z", "w"]
                                .iter()
                                .position(|x| *x == &op[6..])
                                .ok_or("vector component")?;
                            let names = (0..*n).map(|_| self.fresh()).collect::<Vec<_>>();
                            return Ok(m(
                                xs[0].clone(),
                                vec![(names.clone(), v(&names[component]))],
                            ));
                        }
                        let SemanticSort::Value(Type::Named(record)) = &args[0].sort else {
                            return Err("action model pure field receiver".into());
                        };
                        let fields = &self.program.records[record];
                        let field = fields
                            .iter()
                            .position(|(n, _)| n == &op[6..])
                            .ok_or("action model pure field index")?;
                        if self.recursive_records.contains_key(record) {return self.recursive_field(record,field,xs[0].clone());}
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
