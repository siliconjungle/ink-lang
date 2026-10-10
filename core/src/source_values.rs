//! Bounded source-value correspondence, not optimisation authority.
//!
//! A witness can only be made from a checked module and a source-bound model.
//! It translates canonical runtime inhabitants, preserving nominal identity,
//! word widths and ordered table keys. It does not certify action execution,
//! native lowering or arbitrary representations supplied by a database.
use crate::{
    aggregate::Certificate,
    core::CheckedModule,
    library,
    logic::{Constructor, Context, Declaration, Sort, Term},
    row_model::{self, Description, Model},
    stateful::Value,
    syntax::{Program, Type},
    LangResult,
};
use num_bigint::{BigInt, Sign};
use num_traits::ToPrimitive;
use std::collections::BTreeMap;

#[derive(Clone, Copy, Debug)]
pub struct Limits {
    pub nodes: usize,
    pub depth: usize,
    pub bytes: usize,
}
impl Default for Limits {
    fn default() -> Self {
        Self {
            nodes: 10_000,
            depth: 128,
            bytes: 1_048_576,
        }
    }
}
struct Budget {
    left: Limits,
    max_depth: usize,
}
impl Budget {
    fn new(limits: Limits) -> LangResult<Self> {
        if limits.nodes > 100_000 || limits.depth > 128 || limits.bytes > 16_777_216 {
            return Err("source value limits exceed hard caps".into());
        }
        Ok(Self {
            left: limits,
            max_depth: limits.depth,
        })
    }
    fn depth(&self, depth: usize) -> LangResult<()> {
        if depth > self.max_depth {
            return Err("source value depth budget exceeded".into());
        }
        Ok(())
    }
    fn charge(&mut self, depth: usize, bytes: usize) -> LangResult<()> {
        self.depth(depth)?;
        self.left.nodes = self
            .left
            .nodes
            .checked_sub(1)
            .ok_or("source value node budget exceeded")?;
        self.left.bytes = self
            .left
            .bytes
            .checked_sub(bytes)
            .ok_or("source value byte budget exceeded")?;
        Ok(())
    }
    fn ctor(
        &mut self,
        id: &str,
        constructor: usize,
        arguments: Vec<Term>,
        depth: usize,
    ) -> LangResult<Term> {
        self.charge(depth, id.len())?;
        Ok(Term::Construct {
            datatype: id.into(),
            constructor,
            arguments,
        })
    }
    fn word(&mut self, n: u64, depth: usize) -> LangResult<Term> {
        self.charge(depth, 8)?;
        Ok(Term::U64(n))
    }
}

/// Fields are private: neither callers nor database objects can forge binding.
pub struct SourceValues {
    program: Program,
    description: Description,
    context: Context,
    natural: String,
    key: String,
}
impl SourceValues {
    pub fn bind(
        module: &CheckedModule,
        certificate: &Certificate,
        model: &Model,
    ) -> LangResult<Self> {
        row_model::verify(module.program(), certificate, model)?;
        let evidence = certificate
            .evidence
            .as_ref()
            .ok_or("source model needs exact evidence")?;
        let table = evidence
            .table
            .as_ref()
            .ok_or("source model needs table evidence")?;
        Ok(Self {
            program: module.program().clone(),
            description: model.description.clone(),
            context: library::load_bundle(&model.library)?.context,
            natural: evidence
                .model
                .get("Natural")
                .ok_or("missing natural sort")?
                .clone(),
            key: table
                .model
                .get("TableKey128")
                .ok_or("missing table key sort")?
                .clone(),
        })
    }
    pub fn context(&self) -> &Context {
        &self.context
    }
    fn data(&self, ty: &Type) -> LangResult<&str> {
        match self
            .description
            .types
            .get(&serde_json::to_string(ty).map_err(|e| e.to_string())?)
        {
            Some(Sort::Data(id)) => Ok(id),
            _ => Err("type is not a bound source datatype".into()),
        }
    }
    pub fn encode_row(&self, value: &Value, limits: Limits) -> LangResult<Term> {
        self.encode(
            &self.description.row_type,
            value,
            1,
            &mut Budget::new(limits)?,
        )
    }
    pub fn decode_row(&self, term: &Term, limits: Limits) -> LangResult<Value> {
        preflight(term, limits)?;
        self.decode(&self.description.row_type, term)
    }
    pub fn encode_key(&self, value: &Value, limits: Limits) -> LangResult<Term> {
        self.encode(
            &self.description.key_type,
            value,
            1,
            &mut Budget::new(limits)?,
        )
    }
    /// Accept a checked datatype by its structure, without an entry-name list.
    pub fn table<'a>(&'a self, datatype: &str) -> LangResult<SourceTable<'a>> {
        self.context.matches_definition(
            datatype,
            &Declaration::Datatype {
                constructors: vec![
                    Constructor {
                        name: "Nil".into(),
                        fields: vec![],
                    },
                    Constructor {
                        name: "Cons".into(),
                        fields: vec![
                            Sort::Data(self.key.clone()),
                            self.description.row_sort.clone(),
                            Sort::SelfType,
                        ],
                    },
                ],
            },
        )?;
        Ok(SourceTable {
            values: self,
            datatype: datatype.into(),
        })
    }
    fn encode(
        &self,
        ty: &Type,
        value: &Value,
        depth: usize,
        budget: &mut Budget,
    ) -> LangResult<Term> {
        budget.depth(depth)?;
        match (ty, value) {
            (Type::U32, Value::U32(n)) => budget.word(*n as u64, depth),
            (Type::U64, Value::U64(n)) => budget.word(*n, depth),
            (Type::Bool, Value::Bool(b)) => {
                budget.charge(depth, 1)?;
                Ok(Term::Bool(*b))
            }
            (Type::Unit, Value::Unit) => budget.ctor(self.data(ty)?, 0, vec![], depth),
            (Type::Int, Value::Int(n)) => {
                let id = self.data(ty)?;
                if n.sign() == Sign::NoSign {
                    return budget.ctor(id, 0, vec![], depth);
                }
                // Check BEFORE expanding a possibly enormous runtime integer.
                let magnitude = n
                    .magnitude()
                    .to_usize()
                    .ok_or("integer exceeds bounded unary source model")?;
                budget.depth(
                    depth
                        .checked_add(magnitude)
                        .ok_or("integer depth overflow")?,
                )?;
                let mut natural = budget.ctor(&self.natural, 0, vec![], depth + magnitude)?;
                for i in (1..magnitude).rev() {
                    natural = budget.ctor(&self.natural, 1, vec![natural], depth + i)?;
                }
                budget.ctor(
                    id,
                    if n.sign() == Sign::Plus { 1 } else { 2 },
                    vec![natural],
                    depth,
                )
            }
            (Type::String, Value::String(s)) => {
                budget.depth(depth.checked_add(s.len()).ok_or("string depth overflow")?)?;
                let id = self.data(ty)?;
                let mut tail = budget.ctor(id, 0, vec![], depth + s.len())?;
                for (i, b) in s.bytes().enumerate().rev() {
                    let head = budget.word(b as u64, depth + i + 1)?;
                    tail = budget.ctor(id, 1, vec![head, tail], depth + i)?;
                }
                Ok(tail)
            }
            (Type::List(inner), Value::List(xs)) => {
                budget.depth(depth.checked_add(xs.len()).ok_or("list depth overflow")?)?;
                let id = self.data(ty)?;
                let mut tail = budget.ctor(id, 0, vec![], depth + xs.len())?;
                for (i, x) in xs.iter().enumerate().rev() {
                    let head = self.encode(inner, x, depth + i + 1, budget)?;
                    tail = budget.ctor(id, 1, vec![head, tail], depth + i)?;
                }
                Ok(tail)
            }
            (Type::Option(inner), Value::Option(x)) => {
                let arguments = match x {
                    None => vec![],
                    Some(x) => vec![self.encode(inner, x, depth + 1, budget)?],
                };
                budget.ctor(self.data(ty)?, usize::from(x.is_some()), arguments, depth)
            }
            (Type::Result(ok, error), Value::Result(success, x)) => {
                let child = self.encode(if *success { ok } else { error }, x, depth + 1, budget)?;
                budget.ctor(self.data(ty)?, usize::from(!success), vec![child], depth)
            }
            (Type::Named(name), Value::Id(actual, n))
                if name == actual && self.program.ids.contains(name) =>
            {
                let high = budget.word((n >> 64) as u64, depth + 1)?;
                let low = budget.word(*n as u64, depth + 1)?;
                budget.ctor(self.data(ty)?, 0, vec![high, low], depth)
            }
            (Type::Named(name), Value::Record(actual, fields)) if name == actual => {
                let declared = self.program.records.get(name).ok_or("unknown record")?;
                if declared.len() != fields.len() {
                    return Err("source record field mismatch".into());
                }
                let mut arguments = Vec::new();
                for (field, ty) in declared {
                    arguments.push(self.encode(
                        ty,
                        fields.get(field).ok_or("missing source field")?,
                        depth + 1,
                        budget,
                    )?);
                }
                budget.ctor(self.data(ty)?, 0, arguments, depth)
            }
            (Type::Named(name), Value::Enum(actual, variant)) if name == actual => {
                let i = self
                    .program
                    .enums
                    .get(name)
                    .and_then(|vs| vs.iter().position(|v| v == variant))
                    .ok_or("unknown enum variant")?;
                budget.ctor(self.data(ty)?, i, vec![], depth)
            }
            _ => Err("runtime value does not inhabit bound source type".into()),
        }
    }
    fn decode(&self, ty: &Type, term: &Term) -> LangResult<Value> {
        match (ty, term) {
            (Type::U32, Term::U64(n)) => Ok(Value::U32(
                (*n).try_into().map_err(|_| "source u32 out of range")?,
            )),
            (Type::U64, Term::U64(n)) => Ok(Value::U64(*n)),
            (Type::Bool, Term::Bool(b)) => Ok(Value::Bool(*b)),
            _ => {
                let (i, args) = constructor(term, self.data(ty)?)?;
                match ty {
                    Type::Unit if i == 0 && args.is_empty() => Ok(Value::Unit),
                    Type::Int if i == 0 && args.is_empty() => Ok(Value::Int(BigInt::from(0))),
                    Type::Int if (i == 1 || i == 2) && args.len() == 1 => {
                        let mut n = 1usize;
                        let mut tail = &args[0];
                        loop {
                            let (j, fields) = constructor(tail, &self.natural)?;
                            match (j, fields) {
                                (0, []) => break,
                                (1, [next]) => {
                                    n += 1;
                                    tail = next;
                                }
                                _ => return Err("invalid canonical natural".into()),
                            }
                        }
                        let n = BigInt::from(n);
                        Ok(Value::Int(if i == 1 { n } else { -n }))
                    }
                    Type::String | Type::List(_) => {
                        let id = self.data(ty)?;
                        let mut tail = term;
                        let mut bytes = Vec::new();
                        let mut values = Vec::new();
                        loop {
                            let (j, fields) = constructor(tail, id)?;
                            match (j, fields) {
                                (0, []) => break,
                                (1, [head, next]) => {
                                    if let Type::List(inner) = ty {
                                        values.push(self.decode(inner, head)?);
                                    } else {
                                        bytes.push(
                                            word(head)?
                                                .try_into()
                                                .map_err(|_| "UTF-8 byte out of range")?,
                                        );
                                    }
                                    tail = next;
                                }
                                _ => return Err("invalid canonical source list".into()),
                            }
                        }
                        if matches!(ty, Type::String) {
                            Ok(Value::String(
                                String::from_utf8(bytes).map_err(|_| "invalid source UTF-8")?,
                            ))
                        } else {
                            Ok(Value::List(values))
                        }
                    }
                    Type::Option(_) if i == 0 && args.is_empty() => Ok(Value::Option(None)),
                    Type::Option(inner) if i == 1 && args.len() == 1 => {
                        Ok(Value::Option(Some(Box::new(self.decode(inner, &args[0])?))))
                    }
                    Type::Result(ok, error) if i <= 1 && args.len() == 1 => Ok(Value::Result(
                        i == 0,
                        Box::new(self.decode(if i == 0 { ok } else { error }, &args[0])?),
                    )),
                    Type::Named(name)
                        if self.program.ids.contains(name) && i == 0 && args.len() == 2 =>
                    {
                        Ok(Value::Id(
                            name.clone(),
                            ((word(&args[0])? as u128) << 64) | word(&args[1])? as u128,
                        ))
                    }
                    Type::Named(name) if self.program.records.contains_key(name) && i == 0 => {
                        let fields = &self.program.records[name];
                        if fields.len() != args.len() {
                            return Err("invalid source record arity".into());
                        }
                        let values = fields
                            .iter()
                            .zip(args)
                            .map(|((field, ty), term)| Ok((field.clone(), self.decode(ty, term)?)))
                            .collect::<LangResult<BTreeMap<_, _>>>()?;
                        Ok(Value::Record(name.clone(), values))
                    }
                    Type::Named(name)
                        if args.is_empty() && self.program.enums.contains_key(name) =>
                    {
                        let variant = self.program.enums[name]
                            .get(i)
                            .ok_or("invalid source enum constructor")?;
                        Ok(Value::Enum(name.clone(), variant.clone()))
                    }
                    _ => Err("invalid canonical source value".into()),
                }
            }
        }
    }
    fn key_number(&self, value: &Value) -> LangResult<u128> {
        match (&self.description.key_type, value) {
            (Type::U32, Value::U32(n)) => Ok(*n as u128),
            (Type::U64, Value::U64(n)) => Ok(*n as u128),
            (Type::Named(name), Value::Id(actual, n))
                if name == actual && self.program.ids.contains(name) =>
            {
                Ok(*n)
            }
            _ => Err("invalid source table key type".into()),
        }
    }
    fn decode_key(&self, term: &Term) -> LangResult<Value> {
        let (i, args) = constructor(term, &self.key)?;
        if i != 0 || args.len() != 2 {
            return Err("invalid table key encoding".into());
        }
        let high = word(&args[0])?;
        let low = word(&args[1])?;
        match &self.description.key_type {
            Type::U32 if high == 0 => Ok(Value::U32(
                low.try_into().map_err(|_| "table u32 key out of range")?,
            )),
            Type::U64 if high == 0 => Ok(Value::U64(low)),
            Type::Named(name) if self.program.ids.contains(name) => Ok(Value::Id(
                name.clone(),
                ((high as u128) << 64) | low as u128,
            )),
            _ => Err("table key does not inhabit source key type".into()),
        }
    }
}
pub struct SourceTable<'a> {
    values: &'a SourceValues,
    datatype: String,
}
impl SourceTable<'_> {
    pub fn encode(&self, rows: &[(Value, Value)], limits: Limits) -> LangResult<Term> {
        let mut budget = Budget::new(limits)?;
        budget.depth(
            1usize
                .checked_add(rows.len())
                .ok_or("table depth overflow")?,
        )?;
        let mut previous = None;
        for (key, _) in rows {
            let n = self.values.key_number(key)?;
            if previous.is_some_and(|p| p >= n) {
                return Err("source table keys must be strictly increasing".into());
            }
            previous = Some(n);
        }
        let mut tail = budget.ctor(&self.datatype, 0, vec![], 1 + rows.len())?;
        for (i, (key, row)) in rows.iter().enumerate().rev() {
            let n = self.values.key_number(key)?;
            let high = budget.word((n >> 64) as u64, i + 3)?;
            let low = budget.word(n as u64, i + 3)?;
            let key = budget.ctor(&self.values.key, 0, vec![high, low], i + 2)?;
            let row =
                self.values
                    .encode(&self.values.description.row_type, row, i + 2, &mut budget)?;
            tail = budget.ctor(&self.datatype, 1, vec![key, row, tail], i + 1)?;
        }
        Ok(tail)
    }
    pub fn decode(&self, term: &Term, limits: Limits) -> LangResult<Vec<(Value, Value)>> {
        preflight(term, limits)?;
        let mut rows = Vec::new();
        let mut previous = None;
        let mut tail = term;
        loop {
            let (i, args) = constructor(tail, &self.datatype)?;
            match (i, args) {
                (0, []) => return Ok(rows),
                (1, [key, row, next]) => {
                    let key = self.values.decode_key(key)?;
                    let n = self.values.key_number(&key)?;
                    if previous.is_some_and(|p| p >= n) {
                        return Err("noncanonical source table order or duplicate key".into());
                    }
                    rows.push((
                        key,
                        self.values.decode(&self.values.description.row_type, row)?,
                    ));
                    previous = Some(n);
                    tail = next;
                }
                _ => return Err("invalid canonical source table".into()),
            }
        }
    }
}
fn constructor<'a>(term: &'a Term, id: &str) -> LangResult<(usize, &'a [Term])> {
    match term {
        Term::Construct {
            datatype,
            constructor,
            arguments,
        } if datatype == id => Ok((*constructor, arguments)),
        _ => Err("source value datatype mismatch".into()),
    }
}
fn word(term: &Term) -> LangResult<u64> {
    match term {
        Term::U64(n) => Ok(*n),
        _ => Err("expected source word".into()),
    }
}
/// Iterative inspection before recursive decoding; never clone an unchecked term.
fn preflight(term: &Term, limits: Limits) -> LangResult<()> {
    let mut budget = Budget::new(limits)?;
    let mut pending = vec![(term, 1usize)];
    while let Some((term, depth)) = pending.pop() {
        match term {
            Term::U64(_) => budget.charge(depth, 8)?,
            Term::Bool(_) => budget.charge(depth, 1)?,
            Term::Construct {
                datatype,
                arguments,
                ..
            } => {
                budget.charge(depth, datatype.len())?;
                if arguments.len() > budget.left.nodes.saturating_sub(pending.len()) {
                    return Err("source value node budget exceeded".into());
                }
                for child in arguments.iter().rev() {
                    pending.push((child, depth + 1));
                }
            }
            _ => return Err("source codec requires closed canonical values".into()),
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn preflight_bounds_untrusted_branching_and_rejects_expressions() {
        let term = Term::Construct {
            datatype: "x".into(),
            constructor: 0,
            arguments: vec![Term::U64(0); 1024],
        };
        assert!(preflight(
            &term,
            Limits {
                nodes: 10,
                ..Limits::default()
            }
        )
        .is_err());
        assert!(preflight(&Term::Var("unbound".into()), Limits::default()).is_err());
        assert!(preflight(
            &Term::U64(0),
            Limits {
                depth: 0,
                ..Limits::default()
            }
        )
        .is_err());
    }
}
