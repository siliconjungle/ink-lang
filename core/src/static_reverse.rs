//! Literal compilation of a bounded, statically shaped reverse tape.
//!
//! This is another elaboration of the reverse interfaces, not an algebraic
//! rewrite. Every active source operation still occupies its own logical tape
//! node, and edges accumulate in the dynamic runtime's exact descending order.
//! Scalar SSA values cross shallow continuation blocks only while live. Unsupported source
//! keeps the ordinary owned tape, without consuming its expansion budget.
use super::*;

const MAX_NODES: usize = 256;
const MAX_STEPS: usize = 768;
const MAX_LIVE: usize = 192;
const BLOCK: usize = 24;

#[derive(Clone)]
enum Value {
    Atom(Type, String, Option<usize>),
    Record(String, Vec<(String, Value)>),
}
impl Value {
    fn atom(&self, scalar: Scalar) -> Option<(String, Option<usize>)> {
        match self {
            Self::Atom(t, n, id) if *t == scalar.ty() => Some((n.clone(), *id)),
            _ => None,
        }
    }
}
#[derive(Clone)]
struct Node {
    op: u8,
    a: Option<usize>,
    b: Option<usize>,
    av: String,
    bv: String,
    value: String,
}
type Step = (String, Type, Expr);
struct Plan<'a> {
    b: &'a Builder,
    prefix: String,
    next: usize,
    work: usize,
    steps: Vec<Step>,
    nodes: Vec<Node>,
    primals: BTreeMap<(u8, String, String), String>,
    active: BTreeSet<String>,
}
impl Plan<'_> {
    fn fresh(&mut self) -> String {
        let n = format!("{}{}", self.prefix, self.next);
        self.next += 1;
        n
    }
    fn step(&mut self, depth: usize) -> Option<()> {
        if depth > 32 || self.work == 0 {
            return None;
        }
        self.work -= 1;
        Some(())
    }
    fn bind(&mut self, t: Type, e: Expr) -> Option<String> {
        if self.steps.len() >= MAX_STEPS {
            return None;
        }
        let n = self.fresh();
        self.steps.push((n.clone(), t, e));
        Some(n)
    }
    fn node(&mut self, node: Node) -> Option<usize> {
        if self.nodes.len() >= MAX_NODES {
            return None;
        }
        let id = self.nodes.len();
        self.nodes.push(node);
        Some(id)
    }
    fn input(&mut self, t: &Type, e: Expr, tracked: bool, depth: usize) -> Option<Value> {
        self.step(depth)?;
        if *t == self.b.scalar.ty() {
            let value = self.bind(t.clone(), e)?;
            let id = if tracked {
                Some(self.node(Node {
                    op: 0,
                    a: None,
                    b: None,
                    av: value.clone(),
                    bv: value.clone(),
                    value: value.clone(),
                })?)
            } else {
                None
            };
            return Some(Value::Atom(t.clone(), value, id));
        }
        let Type::Named(n) = t else { return None };
        if self.b.blocked.contains(n) || self.b.source.contracts.value_invariants.contains_key(n) {
            return None;
        }
        let fields = self.b.source.records.get(n)?.clone();
        let mut values = vec![];
        for (name, t) in fields {
            values.push((
                name.clone(),
                self.input(&t, f(e.clone(), &name), tracked, depth + 1)?,
            ));
        }
        Some(Value::Record(n.clone(), values))
    }
    fn operation(&mut self, op: u8, a: Value, b: Option<Value>) -> Option<Value> {
        let scalar = self.b.scalar;
        let (av, aid) = a.atom(scalar)?;
        let (bv, bid) = match b {
            Some(b) => b.atom(scalar)?,
            None => (av.clone(), None),
        };
        let e = match op {
            1 => bin("+", v(&av), v(&bv)),
            2 => bin("-", v(&av), v(&bv)),
            3 => bin("*", v(&av), v(&bv)),
            4 => call(scalar.division(), vec![v(&av), v(&bv)]),
            5 => Expr::Neg(Box::new(v(&av))),
            6 => call("sqrt", vec![v(&av)]),
            _ => return None,
        };
        // These operands are evaluated immutable scalar locals. Reuse only the
        // identical fixed operation, never an algebraic identity or wire id.
        // A repeated active operation still appends its distinct logical node.
        let key = (op, av.clone(), bv.clone());
        let value = if let Some(value) = self.primals.get(&key) {
            value.clone()
        } else {
            let value = self.bind(scalar.ty(), e)?;
            self.primals.insert(key, value.clone());
            value
        };
        let id = if aid.is_some() || bid.is_some() {
            Some(self.node(Node {
                op,
                a: aid,
                b: bid,
                av,
                bv,
                value: value.clone(),
            })?)
        } else {
            None
        };
        Some(Value::Atom(scalar.ty(), value, id))
    }
    fn function(&mut self, fun: &Function, args: Vec<Value>, depth: usize) -> Option<Value> {
        self.step(depth)?;
        if !self.active.insert(fun.name.clone()) || args.len() != fun.params.len() {
            return None;
        }
        Scalar::check_requirements(&self.b.source, &fun.name, "reverse differentiation").ok()?;
        let types = check::params_env(&fun.params).ok()?;
        check::infer_as(&fun.body, &types, &self.b.source, &fun.result).ok()?;
        let env = fun
            .params
            .iter()
            .zip(args)
            .map(|((n, _), a)| (n.clone(), a))
            .collect();
        let value = self.expr(&fun.body, &env, &types, Some(&fun.result), depth + 1)?;
        self.active.remove(&fun.name);
        Some(value)
    }
    fn expr(
        &mut self,
        e: &Expr,
        env: &BTreeMap<String, Value>,
        types: &Env,
        want: Option<&Type>,
        depth: usize,
    ) -> Option<Value> {
        self.step(depth)?;
        let ty = check::infer_context(e, types, &self.b.source, want).ok()?;
        match e {
            Expr::Var(n) => env.get(n).cloned(),
            Expr::Float(_) | Expr::Double(_) | Expr::Num(_) if ty == self.b.scalar.ty() => {
                Some(Value::Atom(ty.clone(), self.bind(ty, e.clone())?, None))
            }
            Expr::Let(n, annotation, x, body) => {
                let t =
                    check::infer_context(x, types, &self.b.source, annotation.as_deref()).ok()?;
                let value = self.expr(x, env, types, Some(&t), depth + 1)?;
                let mut local = env.clone();
                let mut ts = types.clone();
                local.insert(n.clone(), value);
                ts.insert(n.clone(), t);
                self.expr(body, &local, &ts, Some(&ty), depth + 1)
            }
            Expr::Record(name, fields) => {
                if self.b.blocked.contains(name)
                    || self.b.source.contracts.value_invariants.contains_key(name)
                {
                    return None;
                }
                let mut values = vec![];
                for (n, x) in fields {
                    let t = &self
                        .b
                        .source
                        .records
                        .get(name)?
                        .iter()
                        .find(|(f, _)| f == n)?
                        .1;
                    values.push((n.clone(), self.expr(x, env, types, Some(t), depth + 1)?));
                }
                Some(Value::Record(name.clone(), values))
            }
            Expr::Field(x, name) => {
                let Value::Record(_, fields) = self.expr(x, env, types, None, depth + 1)? else {
                    return None;
                };
                fields.into_iter().find(|(n, _)| n == name).map(|(_, v)| v)
            }
            Expr::Neg(x) if ty == self.b.scalar.ty() => {
                let a = self.expr(x, env, types, Some(&ty), depth + 1)?;
                self.operation(5, a, None)
            }
            Expr::Binary(op, a, b)
                if ty == self.b.scalar.ty() && matches!(op.as_str(), "+" | "-" | "*") =>
            {
                let a = self.expr(a, env, types, Some(&ty), depth + 1)?;
                let b = self.expr(b, env, types, Some(&ty), depth + 1)?;
                self.operation(
                    match op.as_str() {
                        "+" => 1,
                        "-" => 2,
                        _ => 3,
                    },
                    a,
                    Some(b),
                )
            }
            Expr::Call(name, args) => {
                // User definitions take their ordinary precedence. Never
                // identify a derivative, network, optimizer or library name.
                if let Some(fun) = self
                    .b
                    .source
                    .functions
                    .iter()
                    .find(|f| &f.name == name)
                    .cloned()
                {
                    let mut values = vec![];
                    if args.len() != fun.params.len() {
                        return None;
                    }
                    for (arg, (_, t)) in args.iter().zip(&fun.params) {
                        values.push(self.expr(arg, env, types, Some(t), depth + 1)?);
                    }
                    self.function(&fun, values, depth + 1)
                } else if name == "repeat" && args.len() == 3 {
                    let Expr::Num(limit) = args[0] else {
                        return None;
                    };
                    if limit > 32 {
                        return None;
                    }
                    let Expr::Lambda(index, callback) = &args[2] else {
                        return None;
                    };
                    let Expr::Lambda(state, body) = callback.as_ref() else {
                        return None;
                    };
                    let mut value = self.expr(&args[1], env, types, Some(&ty), depth + 1)?;
                    for i in 0..limit {
                        let mut local = env.clone();
                        let mut ts = types.clone();
                        let n = self.bind(Type::U32, Expr::Num(i))?;
                        local.insert(index.clone(), Value::Atom(Type::U32, n, None));
                        ts.insert(index.clone(), Type::U32);
                        local.insert(state.clone(), value);
                        ts.insert(state.clone(), ty.clone());
                        value = self.expr(body, &local, &ts, Some(&ty), depth + 1)?;
                    }
                    Some(value)
                } else if name == self.b.scalar.division() && args.len() == 2 {
                    let a = self.expr(&args[0], env, types, Some(&ty), depth + 1)?;
                    let b = self.expr(&args[1], env, types, Some(&ty), depth + 1)?;
                    self.operation(4, a, Some(b))
                } else if name == "sqrt" && args.len() == 1 && ty == self.b.scalar.ty() {
                    let a = self.expr(&args[0], env, types, Some(&ty), depth + 1)?;
                    self.operation(6, a, None)
                } else {
                    None
                }
            }
            _ => None,
        }
    }
    fn gradient(&self, shape: &Value, gradients: &[Expr]) -> Option<Expr> {
        match shape {
            Value::Atom(_, _, Some(id)) => Some(gradients[*id].clone()),
            Value::Record(n, fields) => Some(Expr::Record(
                n.clone(),
                fields
                    .iter()
                    .map(|(n, x)| Some((n.clone(), self.gradient(x, gradients)?)))
                    .collect::<Option<_>>()?,
            )),
            _ => None,
        }
    }
    fn backward(&mut self, output: Option<usize>, stop: &str) -> Option<Vec<Expr>> {
        let scalar = self.b.scalar;
        let zero = scalar.number(0.0);
        let mut gradients = vec![zero.clone(); self.nodes.len()];
        if let Some(id) = output {
            let seed = self.bind(scalar.ty(), bin("+", zero.clone(), scalar.number(1.0)))?;
            gradients[id] = v(&seed);
        }
        for node in self.nodes.clone().into_iter().enumerate().rev() {
            let (id, node) = node;
            if node.op == 0 {
                continue;
            }
            // Snapshot the cotangent before either edge is accumulated. The
            // second repeated edge still reads the first edge's updated slot.
            let amount = self.bind(scalar.ty(), gradients[id].clone())?;
            let skip = self.bind(
                Type::Bool,
                bin("&&", v(stop), bin("==", v(&amount), zero.clone())),
            )?;
            let neg = |x| Expr::Neg(Box::new(x));
            let div = |a, b| call(scalar.division(), vec![a, b]);
            let a = v(&amount);
            let edges = match node.op {
                1 => vec![(node.a, a.clone()), (node.b, a)],
                2 => vec![(node.a, a.clone()), (node.b, neg(a))],
                3 => vec![
                    (node.a, bin("*", a.clone(), v(&node.bv))),
                    (node.b, bin("*", a, v(&node.av))),
                ],
                4 => vec![
                    (node.a, div(a.clone(), v(&node.bv))),
                    (
                        node.b,
                        neg(div(
                            bin("*", a, v(&node.av)),
                            bin("*", v(&node.bv), v(&node.bv)),
                        )),
                    ),
                ],
                5 => vec![(node.a, neg(a))],
                6 => vec![(node.a, div(a, bin("*", scalar.number(2.0), v(&node.value))))],
                _ => return None,
            };
            for (input, contribution) in edges {
                // Even an inactive edge evaluates its chain-rule operand when
                // the node is visited, as R_add's strict argument does.
                let next = match input {
                    Some(input) => bin("+", gradients[input].clone(), contribution),
                    None => contribution,
                };
                let prior = input
                    .map(|i| gradients[i].clone())
                    .unwrap_or_else(|| zero.clone());
                let n = self.bind(scalar.ty(), call("choose", vec![v(&skip), prior, next]))?;
                if let Some(input) = input {
                    gradients[input] = v(&n);
                }
            }
        }
        Some(gradients)
    }
}

/// Scalar liveness across shallow helper blocks. No operation is reordered or
/// removed: dead primal/edge work executes but occupies no later parameter slot.
fn schedule(
    b: &mut Builder,
    steps: Vec<Step>,
    inputs: Vec<(String, Type)>,
    result: Type,
    tail: Expr,
) -> Option<(String, Vec<String>)> {
    let mut types: BTreeMap<String, Type> = inputs.into_iter().collect();
    for (n, t, _) in &steps {
        types.insert(n.clone(), t.clone());
    }
    let mut live = crate::analysis::free_variables(&tail);
    let mut boundaries = vec![];
    for (i, (n, _, e)) in steps.iter().enumerate().rev() {
        live.remove(n);
        live.extend(crate::analysis::free_variables(e));
        if i % BLOCK == 0 {
            if live.len() > MAX_LIVE || live.iter().any(|n| !types.contains_key(n)) {
                return None;
            }
            boundaries.push(live.iter().cloned().collect::<Vec<_>>());
        }
    }
    if steps.is_empty() {
        return None;
    }
    boundaries.reverse();
    let mut next: Option<(String, Vec<String>)> = None;
    for (index, block) in steps.chunks(BLOCK).enumerate().rev() {
        let name = b.fresh();
        let out = match next {
            None => tail.clone(),
            Some((ref function, ref params)) => {
                call(function, params.iter().map(|n: &String| v(n)).collect())
            }
        };
        let body = Builder::lets(block.to_vec(), out);
        let params = boundaries[index]
            .iter()
            .map(|n| (n.clone(), types[n].clone()))
            .collect();
        b.out.functions.push(Function {
            name: name.clone(),
            params,
            result: result.clone(),
            body,
        });
        next = Some((name, boundaries[index].clone()));
    }
    next
}

pub(super) fn compile(b: &mut Builder, fun: &Function, kind: &str) -> Option<String> {
    if b.static_work == 0 {
        return None;
    }
    let mut p = Plan {
        b,
        prefix: format!("{}whole{}_", b.prefix, b.next),
        next: 0,
        work: 8192,
        steps: vec![],
        nodes: vec![],
        primals: BTreeMap::new(),
        active: BTreeSet::new(),
    };
    let mut args = vec![];
    for (i, (n, t)) in fun.params.iter().enumerate() {
        args.push(p.input(t, v(n), i == 0, 0)?);
    }
    let shape = args[0].clone();
    let value = p.function(fun, args, 0)?;
    let (primal, output) = value.atom(b.scalar)?;
    let node_count = p.nodes.len();
    let forward_steps = std::mem::take(&mut p.steps);
    let stop = p.fresh();
    let gradients = p.backward(output, &stop)?;
    let gradient = p.gradient(&shape, &gradients)?;
    // Both interfaces share the complete kernel, not just scalar primitives.
    // Projecting its plain gradient does not retain values across invocations.
    let linear_record = p.fresh();
    let result = Type::Named(linear_record.clone());
    let tail = Expr::Record(
        linear_record.clone(),
        vec![("value".into(), v(&primal)), ("gradient".into(), gradient)],
    );
    let backward_steps = p.steps;
    // Preflight both schedules before mutating the enclosing expansion. The
    // maximum live set and step count are separate bounded optional resources.
    let all_types: BTreeMap<String, Type> = forward_steps
        .iter()
        .map(|(n, t, _)| (n.clone(), t.clone()))
        .collect();
    let mut needed = crate::analysis::free_variables(&tail);
    for (n, _, e) in backward_steps.iter().rev() {
        needed.remove(n);
        needed.extend(crate::analysis::free_variables(e));
    }
    needed.remove(&stop);
    if needed.len() > MAX_LIVE || needed.iter().any(|n| !all_types.contains_key(n)) {
        return None;
    }
    let forward_fields = needed
        .iter()
        .map(|n| (n.clone(), all_types[n].clone()))
        .collect::<Vec<_>>();
    // Emission is transactional and has its own aggregate output budget.
    let old_next = b.next;
    let old_occupied = b.occupied.clone();
    let old_records = b.out.records.clone();
    let old_functions = b.out.functions.len();
    let attempt = (|| {
        b.out.records.insert(
            linear_record,
            vec![
                ("value".into(), b.scalar.ty()),
                ("gradient".into(), fun.params[0].1.clone()),
            ],
        );
        let mut backward_inputs = forward_fields;
        backward_inputs.push((stop.clone(), Type::Bool));
        let (backward, back_params) =
            schedule(b, backward_steps, backward_inputs, result.clone(), tail)?;
        let maximum = b.fresh();
        let wrapper = b.fresh();
        let output = Type::Result(Box::new(result), Box::new(Type::String));
        let success = call(
            "choose",
            vec![
                bin("<", v(&maximum), Expr::Num(node_count as u64)),
                call(
                    "Err",
                    vec![Expr::String(
                        "reverse differentiation tape capacity exceeded".into(),
                    )],
                ),
                call(
                    "Ok",
                    vec![call(&backward, back_params.iter().map(|n| v(n)).collect())],
                ),
            ],
        );
        let mut forward_inputs = fun.params.clone();
        forward_inputs.push((maximum.clone(), Type::U32));
        forward_inputs.push((stop.clone(), Type::Bool));
        let (forward, forward_params) =
            schedule(b, forward_steps, forward_inputs, output.clone(), success)?;
        let mut params = vec![
            fun.params[0].clone(),
            (maximum.clone(), Type::U32),
            (stop, Type::Bool),
        ];
        params.extend(fun.params.iter().skip(1).cloned());
        let body = call(
            "choose",
            vec![
                bin(">", v(&maximum), Expr::Num(1_000_000)),
                call(
                    "Err",
                    vec![Expr::String(
                        "reverse differentiation capacity exceeds one million nodes".into(),
                    )],
                ),
                call(&forward, forward_params.iter().map(|n| v(n)).collect()),
            ],
        );
        b.out.functions.push(Function {
            name: wrapper.clone(),
            params: params.clone(),
            result: output,
            body,
        });
        let projection = b.fresh();
        let value = b.fresh();
        b.out.functions.push(Function {
            name: projection.clone(),
            body: method(
                call(&wrapper, params.iter().map(|(n, _)| v(n)).collect()),
                "map",
                vec![lambda(&[value.clone()], f(v(&value), "gradient"))],
            ),
            params,
            result: Type::Result(Box::new(fun.params[0].1.clone()), Box::new(Type::String)),
        });
        let mut remaining = b.static_work;
        for fun in &b.out.functions[old_functions..] {
            remaining =
                remaining.checked_sub(crate::analysis::node_count(&fun.body, remaining)?)?;
            remaining = remaining.checked_sub(fun.params.len())?;
        }
        for (n, fields) in &b.out.records {
            if !old_records.contains_key(n) {
                remaining = remaining.checked_sub(fields.len())?;
            }
        }
        b.static_work = remaining;
        Some((wrapper, projection))
    })();
    if attempt.is_none() {
        b.next = old_next;
        b.occupied = old_occupied;
        b.out.records = old_records;
        b.out.functions.truncate(old_functions);
    }
    let (linear, gradient) = attempt?;
    let suffix = if kind.ends_with("piecewise") {
        "_piecewise"
    } else {
        ""
    };
    b.wrappers.insert(
        (
            fun.name.clone(),
            format!("compiled_reverse_linearize{suffix}"),
        ),
        linear.clone(),
    );
    b.wrappers.insert(
        (
            fun.name.clone(),
            format!("compiled_reverse_gradient{suffix}"),
        ),
        gradient.clone(),
    );
    Some(if kind.starts_with("reverse_linearize") {
        linear
    } else {
        gradient
    })
}
