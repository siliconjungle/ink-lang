//! Fixed IEEE binary32-to-word correspondence. The source cast is fallible;
//! explicit range guards surround a significand/exponent decoder. These are
//! ordinary checked definitions over existing operations, not a new proof rule.
use super::*;

impl Lower<'_> {
    fn float_word_magnitude(&mut self) -> LangResult<String> {
        let key = "f32-word-magnitude";
        if let Some(id) = self.local_ops.get(key) {
            return Ok(id.clone());
        }
        // Valid conversions need shifts of at most 40 (u64) or 23 (right).
        // Six exponent bits suffice. Invalid inputs never expose this value.
        let mut factors = (0..6)
            .map(|bit| {
                choice(
                    b(
                        "==",
                        b(
                            "&",
                            b("quot", v("power"), Term::U64(1 << bit)),
                            Term::U64(1),
                        ),
                        Term::U64(0),
                    ),
                    Term::U64(1),
                    Term::U64(1u64 << (1 << bit)),
                )
            })
            .collect::<Vec<_>>();
        while factors.len() > 1 {
            factors = factors
                .chunks(2)
                .map(|pair| {
                    if pair.len() == 2 {
                        b("*", pair[0].clone(), pair[1].clone())
                    } else {
                        pair[0].clone()
                    }
                })
                .collect();
        }
        let power = self.function(
            vec![("power", Sort::U64)],
            Sort::U64,
            factors.pop().unwrap(),
            None,
        )?;
        let exponent = b(
            "&",
            b("quot", v("float_word"), Term::U64(1 << 23)),
            Term::U64(255),
        );
        let significand = b(
            "+",
            b("&", v("float_word"), Term::U64(0x7fffff)),
            Term::U64(1 << 23),
        );
        let body = self.bind(Sort::U64, exponent, |this, exponent| {
            this.bind(Sort::U64, significand, |_, significand| {
                Ok(choice(
                    b("<", exponent.clone(), Term::U64(127)),
                    Term::U64(0),
                    choice(
                        b("<", exponent.clone(), Term::U64(150)),
                        b(
                            "quot",
                            significand.clone(),
                            call(&power, vec![b("-", Term::U64(150), exponent.clone())]),
                        ),
                        b(
                            "*",
                            significand,
                            call(&power, vec![b("-", exponent, Term::U64(150))]),
                        ),
                    ),
                ))
            })
        })?;
        let id = self.function(vec![("float_word", Sort::U64)], Sort::U64, body, None)?;
        self.local_ops.insert(key.into(), id.clone());
        Ok(id)
    }

    pub(super) fn float_word_conversion(&mut self, name: &str) -> LangResult<String> {
        let key = format!("f32-word-cast:{name}");
        if let Some(id) = self.local_ops.get(&key) {
            return Ok(id.clone());
        }
        // Exact binary32 encodings of the inclusive lower and exclusive upper
        // powers of two. Truncation precedes the check, including (-1,0).
        let (ty, lower, upper) = match name {
            "u32_from_f32" => (Type::U32, 0, 0x4f800000),
            "u64_from_f32" => (Type::U64, 0, 0x5f800000),
            "i32_from_f32" => (Type::I32, 0xcf000000, 0x4f000000),
            _ => return Err("unknown float-to-word conversion".into()),
        };
        let result = self.sort(&Type::Option(Box::new(ty.clone())))?;
        let none = c(id(&result)?, 0, vec![]);
        let magnitude = self.float_word_magnitude()?;
        let value = call(&magnitude, vec![v("float_word")]);
        let value = if ty == Type::I32 {
            b(
                "&",
                choice(
                    b(
                        "!=",
                        b("&", v("float_word"), Term::U64(0x80000000)),
                        Term::U64(0),
                    ),
                    b("-", Term::U64(0), value.clone()),
                    value,
                ),
                Term::U64(u32::MAX as u64),
            )
        } else {
            value
        };
        let truncated = b("f32:trunc", v("float_word"), Term::U64(0));
        let body = choice(
            b("f32:>=", truncated.clone(), Term::U64(lower)),
            choice(
                b("f32:<", truncated, Term::U64(upper)),
                c(id(&result)?, 1, vec![value]),
                none.clone(),
            ),
            none,
        );
        let function = self.function(vec![("float_word", Sort::U64)], result, body, None)?;
        self.local_ops.insert(key, function.clone());
        Ok(function)
    }
}
