//! General action-value correspondence, independent of aggregate certificates.
//! Binding code and a canonical value carrier does not certify an interpreter.
use crate::{
    action_ir::CheckedActions,
    logic::{Constructor, Declaration, Sort, Term},
    registry::Bundle,
    source_syntax::{self, BoundSyntax},
    source_values::Limits,
    stateful::Value,
    syntax::{Program, Type},
    LangResult,
};
use num_bigint::{BigInt, Sign};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

pub const SEMANTICS: &str = "ink-action-values-v1";
#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(deny_unknown_fields)]
pub struct Roles {
    pub schema: u32,
    pub semantics: String,
    pub node: String,
    pub nodes: String,
    pub value: String,
}

/// A generic carrier; source types and nominal indices come from the complete
/// bound module. Tree markers are structural data, never ordinary Ink values.
pub fn definitions(words: &str, r: &Roles) -> Vec<(String, Declaration)> {
    fn datatype(xs: Vec<(&str, Vec<Sort>)>) -> Declaration {
        Declaration::Datatype {
            constructors: xs
                .into_iter()
                .map(|(name, fields)| Constructor {
                    name: name.into(),
                    fields,
                })
                .collect(),
        }
    }
    let w = || Sort::Data(words.into());
    vec![
        (
            r.node.clone(),
            datatype(vec![
                ("Unit", vec![]),
                ("Bool", vec![Sort::Bool]),
                ("U32", vec![Sort::U64]),
                ("U64", vec![Sort::U64]),
                ("Integer", vec![Sort::Bool, Sort::U64, w()]),
                ("String", vec![Sort::U64, w()]),
                ("Id", vec![Sort::U64, Sort::U64, Sort::U64]),
                ("Enum", vec![Sort::U64, Sort::U64]),
                ("Record", vec![Sort::U64, w()]),
                ("None", vec![]),
                ("Some", vec![Sort::U64]),
                ("Ok", vec![Sort::U64]),
                ("Err", vec![Sort::U64]),
                ("List", vec![w()]),
            ]),
        ),
        (
            r.nodes.clone(),
            datatype(vec![
                ("Empty", vec![]),
                ("Node", vec![Sort::Data(r.node.clone())]),
                ("Branch", vec![Sort::U64, Sort::SelfType, Sort::SelfType]),
            ]),
        ),
        (
            r.value.clone(),
            datatype(vec![(
                "Value",
                vec![Sort::Data(r.nodes.clone()), Sort::U64],
            )]),
        ),
    ]
}
pub struct ActionValues {
    syntax: BoundSyntax,
    codec: Codec,
}
struct Codec {
    program: Program,
    value: String,
    node: String,
    nodes: String,
    words: String,
}
impl ActionValues {
    pub fn bind(
        actions: &CheckedActions,
        bundle: &Bundle,
        syntax: &source_syntax::Roles,
        roles: &Roles,
    ) -> LangResult<Self> {
        if roles.schema != 1 || roles.semantics != SEMANTICS {
            return Err("incompatible action value carrier".into());
        }
        let ids = [&roles.node, &roles.nodes, &roles.value];
        for id in ids {
            crate::knowledge::identity(id)?;
        }
        if ids
            .into_iter()
            .collect::<std::collections::BTreeSet<_>>()
            .len()
            != 3
        {
            return Err("action value roles must be distinct".into());
        }
        if !bundle.roots.contains(&roles.value) {
            return Err("action value carrier is not a public root".into());
        }
        let syntax = BoundSyntax::bind(actions, bundle, syntax)?;
        for (id, d) in definitions(&syntax.roles().words, roles) {
            syntax.context().matches_definition(&id, &d)?;
        }
        Ok(Self {
            codec: Codec {
                program: actions.module().program().clone(),
                value: roles.value.clone(),
                node: roles.node.clone(),
                nodes: roles.nodes.clone(),
                words: syntax.roles().words.clone(),
            },
            syntax,
        })
    }
    pub fn source(&self) -> &BoundSyntax {
        &self.syntax
    }
    pub fn sort(&self) -> Sort {
        Sort::Data(self.codec.value.clone())
    }
    pub fn encode(&self, ty: &Type, value: &Value, limits: Limits) -> LangResult<Term> {
        self.codec.encode(ty, value, limits)
    }
    pub fn decode(&self, ty: &Type, value: &Term, limits: Limits) -> LangResult<Value> {
        self.codec.decode(ty, value, limits)
    }
    pub fn encode_arguments(
        &self,
        action: &str,
        values: &[Value],
        limits: Limits,
    ) -> LangResult<Vec<Term>> {
        let action = self.action(action)?;
        if action.params.len() != values.len() {
            return Err("action argument count mismatch".into());
        }
        let mut budget = Budget::new(limits)?;
        let mut terms = Vec::with_capacity(values.len());
        for ((_, ty), v) in action.params.iter().zip(values) {
            let term = self.encode(ty, v, limits)?;
            preflight_budget(&term, 0, &mut budget)?;
            terms.push(term);
        }
        Ok(terms)
    }
    pub fn decode_arguments(
        &self,
        action: &str,
        terms: &[Term],
        limits: Limits,
    ) -> LangResult<Vec<Value>> {
        let action = self.action(action)?;
        if action.params.len() != terms.len() {
            return Err("action argument count mismatch".into());
        }
        preflight_many(terms, limits)?;
        action
            .params
            .iter()
            .zip(terms)
            .map(|((_, ty), t)| {
                self.codec.validate_type(ty)?;
                self.decode(ty, t, limits)
            })
            .collect()
    }
    pub fn encode_result(&self, action: &str, value: &Value, limits: Limits) -> LangResult<Term> {
        self.encode(&self.action(action)?.result, value, limits)
    }
    pub fn decode_result(&self, action: &str, value: &Term, limits: Limits) -> LangResult<Value> {
        self.decode(&self.action(action)?.result, value, limits)
    }
    fn action(&self, name: &str) -> LangResult<&crate::syntax::Action> {
        self.codec
            .program
            .actions
            .iter()
            .find(|a| a.name == name)
            .ok_or("unknown bound source action".into())
    }
}
impl Codec {
    fn encode(&self, ty: &Type, value: &Value, limits: Limits) -> LangResult<Term> {
        self.validate_type(ty)?;
        let mut budget = Budget::new(limits)?;
        let nested = self.encode_value(ty, value, 0, &mut budget)?;
        let term = self.flatten(&nested, limits)?;
        preflight(&term, limits)?;
        Ok(term)
    }
    fn decode(&self, ty: &Type, term: &Term, limits: Limits) -> LangResult<Value> {
        self.validate_type(ty)?;
        preflight(term, limits)?;
        let nested = self.inflate(term, limits)?;
        let value = self.decode_value(ty, &nested)?;
        if self.encode(ty, &value, limits)? != *term {
            return Err("noncanonical typed action value image".into());
        }
        Ok(value)
    }
    fn flatten(&self, t: &Term, l: Limits) -> LangResult<Term> {
        fn go(c: &Codec, t: &Term, nodes: &mut Vec<Term>, b: &mut Budget) -> LangResult<u64> {
            let (tag, args) = c.parts(t)?;
            let mut args = args.to_vec();
            match tag {
                10..=12 => {
                    let [v] = args.as_slice() else {
                        return Err("malformed internal value".into());
                    };
                    args = vec![Term::U64(go(c, v, nodes, b)?)];
                }
                8 | 13 => {
                    let index = if tag == 8 { 1 } else { 0 };
                    let refs = c
                        .leaves(&args[index])?
                        .into_iter()
                        .map(|v| go(c, v, nodes, b))
                        .collect::<LangResult<Vec<_>>>()?;
                    args[index] = word_tree(&c.words, &refs, b)?;
                }
                _ => {}
            }
            let v = b.ctor(&c.node, tag, args)?;
            let i = nodes.len() as u64;
            nodes.push(v);
            Ok(i)
        }
        let mut b = Budget::new(l)?;
        let mut nodes = vec![];
        let root = go(self, t, &mut nodes, &mut b)?;
        let leaves = nodes
            .into_iter()
            .map(|n| b.ctor(&self.nodes, 1, vec![n]))
            .collect::<LangResult<Vec<_>>>()?;
        let table = ordered_tree(&self.nodes, &leaves, &mut b)?;
        b.ctor(&self.value, 0, vec![table, Term::U64(root)])
    }
    fn inflate(&self, t: &Term, l: Limits) -> LangResult<Term> {
        let (tag, args) = self.parts(t)?;
        let [table, root] = args else {
            return Err("malformed action value image".into());
        };
        if tag != 0 {
            return Err("malformed action value image".into());
        }
        let nodes = ordered_leaves(table, &self.nodes)?;
        let mut values: Vec<Option<(Term, usize)>> = vec![];
        let mut b = Budget::new(Limits {
            nodes: 100_000,
            depth: 128,
            bytes: 16_777_216,
        })?;
        for node in nodes {
            let [node] = node else {
                return Err("malformed value table leaf".into());
            };
            let (tag, a) = parts(node, &self.node)?;
            let mut a = a.to_vec();
            let mut depth = 0usize;
            let mut take = |i: u64| -> LangResult<Term> {
                let i = usize::try_from(i).map_err(|_| "value reference overflow")?;
                let (v, d) = values
                    .get_mut(i)
                    .and_then(Option::take)
                    .ok_or("shared, forward or invalid value reference")?;
                depth = depth.max(d + 1);
                if depth > l.depth {
                    return Err("action value depth budget exceeded".into());
                }
                Ok(v)
            };
            match tag {
                10..=12 => {
                    let [i] = a.as_slice() else {
                        return Err("malformed value reference".into());
                    };
                    a = vec![take(number(i)?)?];
                }
                8 | 13 => {
                    let index = if tag == 8 { 1 } else { 0 };
                    if a.len() != index + 1 {
                        return Err("malformed value references".into());
                    }
                    let refs = word_values(&self.words, &a[index])?;
                    let xs = refs
                        .into_iter()
                        .map(&mut take)
                        .collect::<LangResult<Vec<_>>>()?;
                    a[index] = self.tree(&xs, &mut b)?;
                }
                0..=13 => {}
                _ => return Err("malformed action value node".into()),
            }
            let v = b.ctor(&self.value, tag, a)?;
            values.push(Some((v, depth)));
        }
        let root = number(root)?;
        if root.checked_add(1) != Some(values.len() as u64) {
            return Err("noncanonical value image root".into());
        }
        let root = usize::try_from(root).map_err(|_| "value root overflow")?;
        let (v, _) = values
            .get_mut(root)
            .and_then(Option::take)
            .ok_or("missing value root")?;
        if values.iter().any(Option::is_some) {
            return Err("unused action value nodes".into());
        }
        Ok(v)
    }
    fn validate_type(&self, ty: &Type) -> LangResult<()> {
        let mut pending = vec![ty];
        let mut seen = std::collections::BTreeSet::new();
        let mut left = 100_000usize;
        while let Some(ty) = pending.pop() {
            left = left.checked_sub(1).ok_or("action type budget exceeded")?;
            match ty {
                Type::Unit
                | Type::Bool
                | Type::U32
                | Type::U64
                | Type::Int
                | Type::String
                | Type::I32
                | Type::F32 => {}
                Type::Vector(t, n)
                    if (2..=4).contains(n)
                        && matches!(t.as_ref(), Type::U32 | Type::I32 | Type::F32) =>
                {
                    pending.push(t)
                }
                Type::List(t) | Type::Option(t) => pending.push(t),
                Type::Result(a, b) => {
                    pending.push(a);
                    pending.push(b);
                }
                Type::Named(n)
                    if n == "ArithmeticError"
                        || self.program.ids.contains(n)
                        || self.program.enums.contains_key(n) => {}
                Type::Named(n) => {
                    let fields = self
                        .program
                        .records
                        .get(n)
                        .ok_or("unknown action value type")?;
                    if seen.insert(n) {
                        pending.extend(fields.iter().map(|(_, t)| t));
                    }
                }
                _ => return Err("unsupported or unresolved action value type".into()),
            }
        }
        Ok(())
    }
    fn nominal(&self, ty: &str, kind: usize) -> LangResult<u64> {
        let index = match kind {
            6 if self.program.ids.iter().any(|n| n == ty) => {
                Some(self.program.ids.iter().filter(|n| n.as_str() < ty).count())
            }
            7 if ty == "ArithmeticError" => Some(self.program.enums.len()),
            7 => self.program.enums.keys().position(|n| n == ty),
            8 => self.program.records.keys().position(|n| n == ty),
            _ => None,
        };
        index
            .map(|i| i as u64)
            .ok_or("unknown nominal action value type".into())
    }
    fn ctor(&self, b: &mut Budget, tag: usize, args: Vec<Term>) -> LangResult<Term> {
        b.ctor(&self.value, tag, args)
    }
    fn tree(&self, leaves: &[Term], b: &mut Budget) -> LangResult<Term> {
        match leaves.len() {
            0 => self.ctor(b, 14, vec![]),
            1 => self.ctor(b, 15, vec![leaves[0].clone()]),
            n => {
                let half = n / 2;
                let a = self.tree(&leaves[..half], b)?;
                let c = self.tree(&leaves[half..], b)?;
                self.ctor(b, 16, vec![Term::U64(half as u64), a, c])
            }
        }
    }
    fn bytes(&self, bytes: &[u8], b: &mut Budget) -> LangResult<Term> {
        b.ensure_bytes(bytes.len())?;
        let mut leaves = vec![];
        for bytes in bytes.chunks(8) {
            let mut word = [0; 8];
            word[..bytes.len()].copy_from_slice(bytes);
            leaves.push(b.ctor(&self.words, 1, vec![Term::U64(u64::from_le_bytes(word))])?);
        }
        fn tree(id: &str, xs: &[Term], b: &mut Budget) -> LangResult<Term> {
            match xs.len() {
                0 => b.ctor(id, 0, vec![]),
                1 => Ok(xs[0].clone()),
                n => {
                    let h = n / 2;
                    let a = tree(id, &xs[..h], b)?;
                    let c = tree(id, &xs[h..], b)?;
                    b.ctor(id, 2, vec![Term::U64(h as u64), a, c])
                }
            }
        }
        tree(&self.words, &leaves, b)
    }
    fn encode_value(&self, ty: &Type, v: &Value, depth: usize, b: &mut Budget) -> LangResult<Term> {
        b.depth(depth)?;
        let word = Term::U64;
        let (tag, args) = match (ty, v) {
            (Type::Unit, Value::Unit) => (0, vec![]),
            (Type::Bool, Value::Bool(x)) => (1, vec![Term::Bool(*x)]),
            (Type::U32, Value::U32(x)) => (2, vec![word(*x as u64)]),
            (Type::I32, Value::I32(x)) => (2, vec![word(*x as u32 as u64)]),
            (Type::F32, Value::F32(x)) => (2, vec![word(*x as u64)]),
            (Type::U64, Value::U64(x)) => (3, vec![word(*x)]),
            (Type::Int, Value::Int(x)) => {
                let size = x.bits() / 8 + u64::from(x.bits() % 8 != 0);
                b.ensure_bytes(usize::try_from(size).map_err(|_| "integer byte limit")?)?;
                let (sign, mut raw) = x.to_bytes_le();
                while raw.last() == Some(&0) {
                    raw.pop();
                }
                let bytes = self.bytes(&raw, b)?;
                (
                    4,
                    vec![
                        Term::Bool(sign == Sign::Minus),
                        word(raw.len() as u64),
                        bytes,
                    ],
                )
            }
            (Type::String, Value::String(s)) => {
                let bytes = self.bytes(s.as_bytes(), b)?;
                (5, vec![word(s.len() as u64), bytes])
            }
            (Type::Named(n), Value::Id(actual, x))
                if actual == n && self.program.ids.contains(n) =>
            {
                (
                    6,
                    vec![
                        word(self.nominal(n, 6)?),
                        word((x >> 64) as u64),
                        word(*x as u64),
                    ],
                )
            }
            (Type::Named(n), Value::Enum(actual, v))
                if actual == n
                    && (n == "ArithmeticError" || self.program.enums.contains_key(n)) =>
            {
                let variants = if n == "ArithmeticError" {
                    vec!["Overflow".to_owned()]
                } else {
                    self.program.enums[n].clone()
                };
                let index = variants
                    .iter()
                    .position(|x| x == v)
                    .ok_or("unknown enum variant")?;
                (7, vec![word(self.nominal(n, 7)?), word(index as u64)])
            }
            (Type::Named(n), Value::Record(actual, fields))
                if actual == n && self.program.records.contains_key(n) =>
            {
                let schema = &self.program.records[n];
                if fields.len() != schema.len() {
                    return Err("record field count mismatch".into());
                }
                let leaves = schema
                    .iter()
                    .map(|(f, t)| {
                        self.encode_value(
                            t,
                            fields.get(f).ok_or("missing record field")?,
                            depth + 1,
                            b,
                        )
                    })
                    .collect::<LangResult<Vec<_>>>()?;
                (8, vec![word(self.nominal(n, 8)?), self.tree(&leaves, b)?])
            }
            (Type::Option(_), Value::Option(None)) => (9, vec![]),
            (Type::Option(t), Value::Option(Some(x))) => {
                (10, vec![self.encode_value(t, x, depth + 1, b)?])
            }
            (Type::Result(ok, err), Value::Result(success, x)) => (
                if *success { 11 } else { 12 },
                vec![self.encode_value(if *success { ok } else { err }, x, depth + 1, b)?],
            ),
            (Type::List(t), Value::List(xs)) | (Type::Vector(t, _), Value::Vector(xs)) => {
                if let Type::Vector(_, n) = ty {
                    if xs.len() != *n as usize {
                        return Err("vector dimension mismatch".into());
                    }
                }
                if xs.len() > b.nodes {
                    return Err("action value node budget exceeded".into());
                }
                let leaves = xs
                    .iter()
                    .map(|x| self.encode_value(t, x, depth + 1, b))
                    .collect::<LangResult<Vec<_>>>()?;
                (13, vec![self.tree(&leaves, b)?])
            }
            _ => return Err("action value does not inhabit the declared source type".into()),
        };
        self.ctor(b, tag, args)
    }
    fn parts<'a>(&self, t: &'a Term) -> LangResult<(usize, &'a [Term])> {
        parts(t, &self.value)
    }
    fn leaves<'a>(&self, t: &'a Term) -> LangResult<Vec<&'a Term>> {
        let (tag, a) = self.parts(t)?;
        match (tag, a) {
            (14, []) => Ok(vec![]),
            (15, [x]) => Ok(vec![x]),
            (16, [n, l, r]) => {
                let mut left = self.leaves(l)?;
                let right = self.leaves(r)?;
                let total = left
                    .len()
                    .checked_add(right.len())
                    .ok_or("tree size overflow")?;
                if total < 2 || left.len() != total / 2 || number(n)? != left.len() as u64 {
                    return Err("noncanonical action value tree".into());
                }
                left.extend(right);
                Ok(left)
            }
            _ => Err("malformed action value tree".into()),
        }
    }
    fn decode_bytes(&self, len: &Term, tree: &Term) -> LangResult<Vec<u8>> {
        fn words(t: &Term, id: &str) -> LangResult<Vec<u64>> {
            let (tag, a) = parts(t, id)?;
            match (tag, a) {
                (0, []) => Ok(vec![]),
                (1, [n]) => Ok(vec![number(n)?]),
                (2, [n, l, r]) => {
                    let mut a = words(l, id)?;
                    let c = words(r, id)?;
                    let total = a.len().checked_add(c.len()).ok_or("word count overflow")?;
                    if total < 2 || a.len() != total / 2 || number(n)? != a.len() as u64 {
                        return Err("noncanonical byte tree".into());
                    }
                    a.extend(c);
                    Ok(a)
                }
                _ => Err("malformed byte tree".into()),
            }
        }
        let words = words(tree, &self.words)?;
        let len = usize::try_from(number(len)?).map_err(|_| "byte length overflow")?;
        if len.div_ceil(8) != words.len() {
            return Err("byte length mismatch".into());
        }
        let mut bytes = words
            .into_iter()
            .flat_map(u64::to_le_bytes)
            .collect::<Vec<_>>();
        if bytes[len..].iter().any(|&x| x != 0) {
            return Err("nonzero byte padding".into());
        }
        bytes.truncate(len);
        Ok(bytes)
    }
    fn decode_value(&self, ty: &Type, t: &Term) -> LangResult<Value> {
        let (tag, a) = self.parts(t)?;
        match (ty, tag, a) {
            (Type::Unit, 0, []) => Ok(Value::Unit),
            (Type::Bool, 1, [Term::Bool(x)]) => Ok(Value::Bool(*x)),
            (Type::U32, 2, [n]) => Ok(Value::U32(
                number(n)?.try_into().map_err(|_| "u32 width exceeded")?,
            )),
            (Type::I32, 2, [n]) => Ok(Value::I32(
                u32::try_from(number(n)?).map_err(|_| "i32 width exceeded")? as i32,
            )),
            (Type::F32, 2, [n]) => Ok(Value::F32(
                u32::try_from(number(n)?).map_err(|_| "f32 width exceeded")?,
            )),
            (Type::U64, 3, [n]) => Ok(Value::U64(number(n)?)),
            (Type::Int, 4, [Term::Bool(negative), len, tree]) => {
                let raw = self.decode_bytes(len, tree)?;
                if raw.last() == Some(&0) || (raw.is_empty() && *negative) {
                    return Err("noncanonical integer magnitude/sign".into());
                }
                Ok(Value::Int(BigInt::from_bytes_le(
                    if *negative { Sign::Minus } else { Sign::Plus },
                    &raw,
                )))
            }
            (Type::String, 5, [len, tree]) => Ok(Value::String(
                String::from_utf8(self.decode_bytes(len, tree)?)
                    .map_err(|_| "invalid value UTF-8")?,
            )),
            (Type::Named(n), 6, [nominal, hi, lo])
                if self.program.ids.contains(n) && number(nominal)? == self.nominal(n, 6)? =>
            {
                Ok(Value::Id(
                    n.clone(),
                    (u128::from(number(hi)?) << 64) | u128::from(number(lo)?),
                ))
            }
            (Type::Named(n), 7, [nominal, index])
                if (n == "ArithmeticError" || self.program.enums.contains_key(n))
                    && number(nominal)? == self.nominal(n, 7)? =>
            {
                let index = usize::try_from(number(index)?).map_err(|_| "enum index overflow")?;
                Ok(Value::Enum(
                    n.clone(),
                    (if n == "ArithmeticError" {
                        vec!["Overflow".to_owned()]
                    } else {
                        self.program.enums[n].clone()
                    })
                    .get(index)
                    .ok_or("enum variant index")?
                    .clone(),
                ))
            }
            (Type::Named(n), 8, [nominal, tree])
                if self.program.records.contains_key(n)
                    && number(nominal)? == self.nominal(n, 8)? =>
            {
                let leaves = self.leaves(tree)?;
                let fields = &self.program.records[n];
                if leaves.len() != fields.len() {
                    return Err("record field count mismatch".into());
                }
                let fields = fields
                    .iter()
                    .zip(leaves)
                    .map(|((name, ty), v)| Ok((name.clone(), self.decode_value(ty, v)?)))
                    .collect::<LangResult<BTreeMap<_, _>>>()?;
                Ok(Value::Record(n.clone(), fields))
            }
            (Type::Option(_), 9, []) => Ok(Value::Option(None)),
            (Type::Option(t), 10, [v]) => {
                Ok(Value::Option(Some(Box::new(self.decode_value(t, v)?))))
            }
            (Type::Result(ok, _), 11, [v]) => {
                Ok(Value::Result(true, Box::new(self.decode_value(ok, v)?)))
            }
            (Type::Result(_, err), 12, [v]) => {
                Ok(Value::Result(false, Box::new(self.decode_value(err, v)?)))
            }
            (Type::List(t), 13, [tree]) => Ok(Value::List(
                self.leaves(tree)?
                    .into_iter()
                    .map(|v| self.decode_value(t, v))
                    .collect::<LangResult<Vec<_>>>()?,
            )),
            (Type::Vector(t, n), 13, [tree]) => {
                let leaves = self.leaves(tree)?;
                if leaves.len() != *n as usize {
                    return Err("vector dimension mismatch".into());
                }
                Ok(Value::Vector(
                    leaves
                        .into_iter()
                        .map(|v| self.decode_value(t, v))
                        .collect::<LangResult<_>>()?,
                ))
            }
            _ => Err("logical value does not inhabit the declared source type".into()),
        }
    }
}
fn parts<'a>(t: &'a Term, id: &str) -> LangResult<(usize, &'a [Term])> {
    match t {
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } if datatype == id => Ok((*constructor, arguments)),
        _ => Err("action value datatype mismatch".into()),
    }
}
fn number(t: &Term) -> LangResult<u64> {
    if let Term::U64(n) = t {
        Ok(*n)
    } else {
        Err("word expected".into())
    }
}
fn ordered_tree(id: &str, xs: &[Term], b: &mut Budget) -> LangResult<Term> {
    match xs.len() {
        0 => b.ctor(id, 0, vec![]),
        1 => Ok(xs[0].clone()),
        n => {
            let h = n / 2;
            let a = ordered_tree(id, &xs[..h], b)?;
            let c = ordered_tree(id, &xs[h..], b)?;
            b.ctor(id, 2, vec![Term::U64(h as u64), a, c])
        }
    }
}
fn ordered_leaves<'a>(t: &'a Term, id: &str) -> LangResult<Vec<&'a [Term]>> {
    let (tag, a) = parts(t, id)?;
    match (tag, a) {
        (0, []) => Ok(vec![]),
        (1, a) => Ok(vec![a]),
        (2, [n, l, r]) => {
            let mut a = ordered_leaves(l, id)?;
            let c = ordered_leaves(r, id)?;
            let total = a.len().checked_add(c.len()).ok_or("tree size overflow")?;
            if total < 2 || a.len() != total / 2 || number(n)? != a.len() as u64 {
                return Err("noncanonical ordered tree".into());
            }
            a.extend(c);
            Ok(a)
        }
        _ => Err("malformed ordered tree".into()),
    }
}
fn word_tree(id: &str, xs: &[u64], b: &mut Budget) -> LangResult<Term> {
    let leaves = xs
        .iter()
        .map(|&x| b.ctor(id, 1, vec![Term::U64(x)]))
        .collect::<LangResult<Vec<_>>>()?;
    ordered_tree(id, &leaves, b)
}
fn word_values(id: &str, t: &Term) -> LangResult<Vec<u64>> {
    ordered_leaves(t, id)?
        .into_iter()
        .map(|a| match a {
            [n] => number(n),
            _ => Err("malformed word leaf".into()),
        })
        .collect()
}
struct Budget {
    nodes: usize,
    bytes: usize,
    max_depth: usize,
}
impl Budget {
    fn new(l: Limits) -> LangResult<Self> {
        if l.nodes > 100_000 || l.depth > 128 || l.bytes > 16_777_216 {
            return Err("action value limits exceed hard caps".into());
        }
        Ok(Self {
            nodes: l.nodes,
            bytes: l.bytes,
            max_depth: l.depth,
        })
    }
    fn depth(&self, n: usize) -> LangResult<()> {
        if n > self.max_depth {
            Err("action value depth budget exceeded".into())
        } else {
            Ok(())
        }
    }
    fn ensure_bytes(&self, n: usize) -> LangResult<()> {
        if n > self.bytes {
            Err("action value byte budget exceeded".into())
        } else {
            Ok(())
        }
    }
    fn charge(&mut self, nodes: usize, bytes: usize) -> LangResult<()> {
        self.nodes = self
            .nodes
            .checked_sub(nodes)
            .ok_or("action value node budget exceeded")?;
        self.bytes = self
            .bytes
            .checked_sub(bytes)
            .ok_or("action value byte budget exceeded")?;
        Ok(())
    }
    fn ctor(&mut self, id: &str, tag: usize, args: Vec<Term>) -> LangResult<Term> {
        let primitives = args
            .iter()
            .filter(|a| matches!(a, Term::Bool(_) | Term::U64(_)))
            .count();
        self.charge(1 + primitives, id.len() + primitives * 8)?;
        Ok(Term::Construct {
            datatype: id.into(),
            constructor: tag,
            arguments: args,
        })
    }
}
fn preflight(t: &Term, limits: Limits) -> LangResult<()> {
    preflight_many(std::slice::from_ref(t), limits)
}
fn preflight_budget(t: &Term, n: usize, b: &mut Budget) -> LangResult<()> {
    b.depth(n)?;
    match t {
        Term::Construct {
            datatype,
            arguments,
            ..
        } => {
            b.charge(1, datatype.len())?;
            for a in arguments {
                preflight_budget(a, n + 1, b)?;
            }
            Ok(())
        }
        Term::U64(_) | Term::Bool(_) => b.charge(1, 8),
        _ => Err("action codec accepts constructor values only".into()),
    }
}
fn preflight_many(terms: &[Term], limits: Limits) -> LangResult<()> {
    let mut budget = Budget::new(limits)?;
    for t in terms {
        preflight_budget(t, 0, &mut budget)?;
        crate::registry::canonical(t)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    fn codec() -> Codec {
        let module = crate::core::CheckedModule::from_source(crate::syntax::parse(
            "module values; id Left; id Right; enum Error { Missing, Overflow, } record Chain { value:u64, next:Option<Chain>, } record Pair { second:Option<Left>, first:Result<List<Int>,Error>, } query zero()->Unit{return ();}"
        ).unwrap()).unwrap();
        Codec {
            program: module.program().clone(),
            value: format!("{:064x}", 9),
            node: format!("{:064x}", 7),
            nodes: format!("{:064x}", 8),
            words: format!("{:064x}", 1),
        }
    }
    fn limits() -> Limits {
        Limits {
            nodes: 100_000,
            depth: 128,
            bytes: 16_777_216,
        }
    }
    fn roundtrip(c: &Codec, ty: Type, value: Value) -> Term {
        let t = c.encode(&ty, &value, limits()).unwrap();
        assert_eq!(c.decode(&ty, &t, limits()).unwrap(), value);
        let mut context = crate::logic::Context::default();
        let r = source_syntax::Roles {
            schema: 1,
            semantics: source_syntax::SEMANTICS.into(),
            words: c.words.clone(),
            fields: format!("{:064x}", 2),
            node: format!("{:064x}", 3),
            nodes: format!("{:064x}", 4),
            image: format!("{:064x}", 5),
            program: format!("{:064x}", 6),
        };
        context
            .declare(c.words.clone(), &source_syntax::grammar(&r)[0].1)
            .unwrap();
        let roles = Roles {
            schema: 1,
            semantics: SEMANTICS.into(),
            value: c.value.clone(),
            node: c.node.clone(),
            nodes: c.nodes.clone(),
        };
        for (id, d) in definitions(&c.words, &roles) {
            context.declare(id, &d).unwrap();
        }
        assert_eq!(context.evaluate(&[], &t).unwrap(), t);
        crate::registry::canonical(&t).unwrap();
        t
    }
    #[test]
    fn full_width_values_have_compact_canonical_kernel_inhabitants() {
        let c = codec();
        roundtrip(&c, Type::Unit, Value::Unit);
        for b in [false, true] {
            roundtrip(&c, Type::Bool, Value::Bool(b));
        }
        for x in [0, 1, u32::MAX] {
            roundtrip(&c, Type::U32, Value::U32(x));
        }
        for x in [0, 1, 1 << 63, u64::MAX] {
            roundtrip(&c, Type::U64, Value::U64(x));
        }
        for x in [i32::MIN, -1, 0, i32::MAX] {
            roundtrip(&c, Type::I32, Value::I32(x));
        }
        for bits in [0, 0x80000000, 1, 0x7f800000, 0x7fc12345, 0x7f812345] {
            roundtrip(&c, Type::F32, Value::F32(bits));
            roundtrip(
                &c,
                Type::Vector(Box::new(Type::F32), 2),
                Value::Vector(vec![Value::F32(bits), Value::F32(bits ^ 0x80000000)]),
            );
        }
        for x in [
            BigInt::from(0),
            BigInt::from(1),
            BigInt::from(-1),
            BigInt::from(u64::MAX),
            (BigInt::from(1) << 4095usize) + 17,
            -(BigInt::from(1) << 4095usize) - 17,
        ] {
            roundtrip(&c, Type::Int, Value::Int(x));
        }
        for s in ["", "\u{0}é🙂\r\n", "123456789"] {
            roundtrip(&c, Type::String, Value::String(s.into()));
        }
        for n in ["Left", "Right"] {
            roundtrip(&c, Type::Named(n.into()), Value::Id(n.into(), u128::MAX));
        }
        roundtrip(
            &c,
            Type::Named("ArithmeticError".into()),
            Value::Enum("ArithmeticError".into(), "Overflow".into()),
        );
    }
    #[test]
    fn nominal_order_recursive_records_results_and_wide_lists_preserve_values() {
        let c = codec();
        let mut chain = Value::Option(None);
        for i in 0..12 {
            chain = Value::Option(Some(Box::new(Value::Record(
                "Chain".into(),
                BTreeMap::from([("value".into(), Value::U64(i)), ("next".into(), chain)]),
            ))));
        }
        roundtrip(
            &c,
            Type::Option(Box::new(Type::Named("Chain".into()))),
            chain,
        );
        for value in [
            Value::Result(
                true,
                Box::new(Value::List(vec![
                    Value::Int(BigInt::from(-500)),
                    Value::Int(BigInt::from(600)),
                ])),
            ),
            Value::Result(
                false,
                Box::new(Value::Enum("Error".into(), "Missing".into())),
            ),
        ] {
            let pair = Value::Record(
                "Pair".into(),
                BTreeMap::from([
                    ("first".into(), value),
                    ("second".into(), Value::Option(None)),
                ]),
            );
            let term = roundtrip(&c, Type::Named("Pair".into()), pair);
            assert_eq!(
                c.decode(&Type::Named("Pair".into()), &term, limits())
                    .unwrap()
                    .json()["second"],
                serde_json::json!({"None":null})
            );
        }
        for n in [0, 1, 2, 3, 7, 8, 9, 127, 128, 129, 1024] {
            roundtrip(
                &c,
                Type::List(Box::new(Type::U64)),
                Value::List((0..n).map(Value::U64).collect()),
            );
        }
    }
    fn constructed(id: &str, tag: usize, args: Vec<Term>) -> Term {
        Term::Construct {
            datatype: id.into(),
            constructor: tag,
            arguments: args,
        }
    }
    fn image(c: &Codec, nodes: Vec<Term>, root: u64) -> Term {
        let mut b = Budget::new(limits()).unwrap();
        let nodes = nodes
            .into_iter()
            .map(|n| constructed(&c.nodes, 1, vec![n]))
            .collect::<Vec<_>>();
        constructed(
            &c.value,
            0,
            vec![
                ordered_tree(&c.nodes, &nodes, &mut b).unwrap(),
                Term::U64(root),
            ],
        )
    }
    fn refs(c: &Codec, values: &[u64]) -> Term {
        word_tree(&c.words, values, &mut Budget::new(limits()).unwrap()).unwrap()
    }
    #[test]
    fn flat_images_reject_aliasing_forward_unused_and_noncanonical_order() {
        let c = codec();
        let number = |n| constructed(&c.node, 3, vec![Term::U64(n)]);
        let list = |xs: &[u64]| constructed(&c.node, 13, vec![refs(&c, xs)]);
        let ty = Type::List(Box::new(Type::U64));
        for (nodes, root, reason) in [
            (vec![number(7), list(&[0, 0])], 1, "shared"),
            (vec![list(&[1]), number(7)], 1, "forward"),
            (vec![number(7), number(8), list(&[0])], 2, "unused"),
            (vec![number(7)], u64::MAX, "root"),
            (vec![number(7), number(8), list(&[1, 0])], 2, "noncanonical"),
        ] {
            let t = image(&c, nodes, root);
            let error = c.decode(&ty, &t, limits()).unwrap_err();
            assert!(error.contains(reason), "{reason}: {error}");
        }
        let mut nodes = vec![constructed(&c.node, 9, vec![])];
        for i in 0..40 {
            nodes.push(constructed(&c.node, 10, vec![Term::U64(i)]));
        }
        let t = image(&c, nodes, 40);
        assert!(c
            .decode(
                &Type::Option(Box::new(Type::U64)),
                &t,
                Limits {
                    depth: 32,
                    ..limits()
                }
            )
            .unwrap_err()
            .contains("depth"));
        let wrong_refs = constructed(
            &c.words,
            2,
            vec![Term::U64(0), refs(&c, &[0]), refs(&c, &[1])],
        );
        let t = image(
            &c,
            vec![
                number(7),
                number(8),
                constructed(&c.node, 13, vec![wrong_refs]),
            ],
            2,
        );
        assert!(c
            .decode(&ty, &t, limits())
            .unwrap_err()
            .contains("ordered tree"));
    }
    #[test]
    fn canonical_membership_rejects_width_nominal_padding_and_tree_corruption() {
        let c = codec();
        let word = Term::U64;
        let bad = [
            (Type::U32, constructed(&c.node, 2, vec![word(1 << 32)])),
            (Type::U32, constructed(&c.node, 3, vec![word(0)])),
            (Type::I32, constructed(&c.node, 2, vec![word(1 << 32)])),
            (Type::F32, constructed(&c.node, 2, vec![word(1 << 32)])),
            (Type::I32, constructed(&c.node, 3, vec![word(0)])),
            (Type::F32, constructed(&c.node, 3, vec![word(0)])),
            (Type::Unit, constructed(&c.node, 0, vec![word(1)])),
            (
                Type::Named("Left".into()),
                constructed(
                    &c.node,
                    6,
                    vec![word(c.nominal("Right", 6).unwrap()), word(0), word(0)],
                ),
            ),
            (
                Type::Int,
                constructed(
                    &c.node,
                    4,
                    vec![Term::Bool(true), word(0), constructed(&c.words, 0, vec![])],
                ),
            ),
            (
                Type::Int,
                constructed(
                    &c.node,
                    4,
                    vec![
                        Term::Bool(false),
                        word(1),
                        constructed(&c.words, 1, vec![word(0)]),
                    ],
                ),
            ),
            (
                Type::String,
                constructed(
                    &c.node,
                    5,
                    vec![word(1), constructed(&c.words, 1, vec![word(0x100)])],
                ),
            ),
            (
                Type::String,
                constructed(
                    &c.node,
                    5,
                    vec![word(1), constructed(&c.words, 1, vec![word(0xff)])],
                ),
            ),
            (
                Type::List(Box::new(Type::U64)),
                constructed(
                    &c.node,
                    13,
                    vec![constructed(
                        &c.node,
                        16,
                        vec![
                            word(0),
                            constructed(&c.node, 14, vec![]),
                            constructed(&c.node, 14, vec![]),
                        ],
                    )],
                ),
            ),
        ];
        for (t, v) in bad {
            assert!(
                c.decode(&t, &image(&c, vec![v], 0), limits()).is_err(),
                "{t:?}"
            );
        }
        for t in [
            Type::Unknown,
            Type::Option(Box::new(Type::Unknown)),
            Type::Vector(Box::new(Type::U64), 2),
            Type::Table(Box::new(Type::U32), Box::new(Type::U32)),
        ] {
            assert!(c.encode(&t, &Value::Option(None), limits()).is_err());
        }
        for ty in [Type::I32, Type::F32] {
            assert!(c.encode(&ty, &Value::U32(0), limits()).is_err());
            assert!(c
                .decode(
                    &Type::Vector(Box::new(ty.clone()), 2),
                    &c.encode(&Type::List(Box::new(ty)), &Value::List(vec![]), limits())
                        .unwrap(),
                    limits()
                )
                .is_err());
        }
        assert!(c
            .encode(
                &Type::Vector(Box::new(Type::I32), 2),
                &Value::Vector(vec![Value::I32(0)]),
                limits()
            )
            .is_err());
        assert!(c.encode(&Type::U32, &Value::U64(1), limits()).is_err());
        assert!(c
            .decode(&Type::U64, &Term::Var("untrusted".into()), limits())
            .is_err());
    }
    #[test]
    fn all_value_work_and_ignored_term_fields_are_bounded() {
        let c = codec();
        let small = Limits {
            nodes: 8,
            depth: 8,
            bytes: 1024,
        };
        assert!(c
            .encode(
                &Type::List(Box::new(Type::U64)),
                &Value::List(vec![Value::U64(1); 64]),
                small
            )
            .is_err());
        assert!(c
            .encode(
                &Type::Int,
                &Value::Int(BigInt::from(1) << 10000usize),
                small
            )
            .is_err());
        assert!(c
            .encode(&Type::String, &Value::String("x".repeat(2048)), small)
            .is_err());
        let large = constructed(&c.value, 0, vec![Term::U64(0); 100]);
        assert!(c
            .decode(&Type::Unit, &large, small)
            .unwrap_err()
            .contains("budget"));
        assert!(c
            .encode(
                &Type::Unit,
                &Value::Unit,
                Limits {
                    nodes: 100_001,
                    ..limits()
                }
            )
            .is_err());
    }
}
