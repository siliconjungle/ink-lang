//! Fixed literal state correspondence, including values without surface literals.
use super::*;
use crate::stateful::Value;

// Long literal spines belong in transparent, separately checked definitions.
// Keep small literals unchanged; every stored chunk remains within the existing
// canonical/term depth budgets. This shares data, never an equality verdict.
const INLINE_SPINE: usize = 32;
const SPINE_CHUNK: usize = 16;

impl Lower<'_> {
    fn fixed_chunk(&mut self, sort: &Sort, body: Term) -> LangResult<Term> {
        // Closed constructor data has no implicit match-field sorts. Import
        // exactly its syntax references so unrelated action helpers cannot
        // change the identity of the same fixed source value.
        let function = self.store_with_implicit_sorts(Declaration::Function {
            params: vec![], result: sort.clone(), body, recursive: None,
        }, false)?;
        Ok(call(&function, vec![]))
    }

    pub(super) fn literal_list(&mut self, sort: &Sort, xs: Vec<Term>) -> LangResult<Term> {
        let mut closed = xs.len() > INLINE_SPINE;
        if closed {
            let mut work = 0usize;
            for value in &xs {
                crate::logic::walk_term(value, |term| {
                    work += 1;
                    // Match binders could close Vars, but conservative refusal
                    // keeps this fast path limited to explicit closed syntax.
                    closed &= !matches!(term, Term::Var(_) | Term::SelfCall(_) | Term::Match { .. });
                });
            }
            self.work = self.work.checked_sub(work).ok_or("action model work limit")?;
        }
        let count = xs.len();
        let mut tail = c(id(sort)?, 0, vec![]);
        for (index, value) in xs.into_iter().rev().enumerate() {
            tail = c(id(sort)?, 1, vec![value, tail]);
            if closed && (index + 1) % SPINE_CHUNK == 0 && index + 1 < count {
                tail = self.fixed_chunk(sort, tail)?;
            }
        }
        Ok(tail)
    }

    fn fixed_value(&mut self, ty: &Type, value: &Value) -> LangResult<Term> {
        self.tick()?;
        let sort = self.sort(ty)?;
        Ok(match (ty, value) {
            (Type::Unit, Value::Unit) => c(id(&sort)?, 0, vec![]),
            (Type::Bool, Value::Bool(x)) => Term::Bool(*x),
            (Type::U32, Value::U32(x)) | (Type::F32, Value::F32(x)) => Term::U64(*x as u64),
            (Type::U64, Value::U64(x)) => Term::U64(*x),
            (Type::I32, Value::I32(x)) => Term::U64(*x as u32 as u64),
            (Type::Int, Value::Int(x)) => {
                let integer = self.integer()?;
                let mut magnitude = c(&integer.natural, 0, vec![]);
                for bit in (0..x.bits()).rev() {
                    self.tick()?;
                    magnitude = c(
                        &integer.natural,
                        if x.magnitude().bit(bit) { 2 } else { 1 },
                        vec![magnitude],
                    );
                }
                c(
                    &integer.value,
                    match x.sign() {
                        num_bigint::Sign::NoSign => 0,
                        num_bigint::Sign::Plus => 1,
                        num_bigint::Sign::Minus => 2,
                    },
                    if x.sign() == num_bigint::Sign::NoSign {
                        vec![]
                    } else {
                        vec![magnitude]
                    },
                )
            }
            (Type::String, Value::String(x)) => self.string_literal(x)?,
            (Type::Named(name), Value::Id(actual, x)) if name == actual => c(
                id(&sort)?,
                0,
                vec![Term::U64((*x >> 64) as u64), Term::U64(*x as u64)],
            ),
            (Type::Named(name), Value::Enum(actual, variant)) if name == actual => {
                let index = self
                    .program
                    .enums
                    .get(name)
                    .and_then(|xs| xs.iter().position(|s| s == variant))
                    .ok_or("fixed enum variant")?;
                c(id(&sort)?, index, vec![])
            }
            (Type::Named(name), Value::Record(actual, fields)) if name == actual => {
                let schema = self
                    .program
                    .records
                    .get(name)
                    .ok_or("fixed record schema")?
                    .clone();
                let values = schema
                    .iter()
                    .map(|(n, t)| self.fixed_value(t, fields.get(n).ok_or("fixed record field")?))
                    .collect::<LangResult<_>>()?;
                if self.recursive_records.contains_key(name) {
                    self.recursive_record(name, values)?
                } else {
                    c(id(&sort)?, 0, values)
                }
            }
            (Type::Vector(element, _), Value::Vector(xs)) => c(
                id(&sort)?,
                0,
                xs.iter()
                    .map(|x| self.fixed_value(element, x))
                    .collect::<LangResult<_>>()?,
            ),
            (Type::Option(element), Value::Option(x)) => match x {
                None => c(id(&sort)?, 0, vec![]),
                Some(x) => c(id(&sort)?, 1, vec![self.fixed_value(element, x)?]),
            },
            (Type::Result(yes, no), Value::Result(ok, x)) => c(
                id(&sort)?,
                if *ok { 0 } else { 1 },
                vec![self.fixed_value(if *ok { yes } else { no }, x)?],
            ),
            (Type::List(element), Value::List(xs)) => {
                let values = xs.iter().map(|x| self.fixed_value(element, x)).collect::<LangResult<Vec<_>>>()?;
                self.literal_list(&sort, values)?
            }
            _ => return Err("fixed value outside admitted source correspondence".into()),
        })
    }
    pub(super) fn fixed_initial_state(&mut self) -> LangResult<Option<Term>> {
        if self.program.frozen.is_empty() {
            return Ok(None);
        }
        let tables = crate::frozen::tables(self.program)?;
        let mut arguments = vec![];
        for (root, table) in self.program.states.iter().zip(self.tables.clone()) {
            let mut tail = c(&table.datatype, 0, vec![]);
            if let Some(rows) = tables.get(&root.name) {
                for (index, (key, value)) in rows.iter().rev().enumerate() {
                    tail = c(
                        &table.datatype,
                        1,
                        vec![
                            self.fixed_value(&table.key_type, key)?,
                            self.fixed_value(&table.value_type, value)?,
                            tail,
                        ],
                    );
                    if rows.len() > INLINE_SPINE
                        && (index + 1) % SPINE_CHUNK == 0
                        && index + 1 < rows.len()
                    {
                        tail = self.fixed_chunk(&Sort::Data(table.datatype.clone()), tail)?;
                    }
                }
            }
            arguments.push(tail);
        }
        Ok(Some(c(&self.state, 0, arguments)))
    }
}
