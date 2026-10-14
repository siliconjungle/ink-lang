//! Fixed source key correspondence. UTF-8 lexicographic order, signed word
//! order and unsigned 128-bit identity are represented by ordinary total
//! first-order definitions.
use super::*;
impl Lower<'_> {
    pub(super) fn string_literal(&mut self, text: &str) -> LangResult<Term> {
        let sort = self.sort(&Type::String)?;
        let id = id(&sort)?;
        let mut tail = c(id, 0, vec![]);
        for byte in text.bytes().rev() {
            tail = c(id, 1, vec![Term::U64(byte as u64), tail]);
        }
        Ok(tail)
    }
    pub(super) fn key_less(&mut self, ty: &Type, a: Term, z: Term) -> LangResult<Term> {
        match ty {
            Type::U64 | Type::U32 => self.operator(ty, "<", a, z),
            // Signed key order as a strict total order on the whole word sort:
            // wrapping subtraction of 2^31 is a bijection on words that maps
            // every 32-bit i32 encoding, in signed order, onto ascending words.
            // On encoded keys it agrees with the masked biased comparison of
            // the `<` operator, and general order laws hold for every word, so
            // they need no range hypothesis.
            Type::I32 => {
                let shift = |x| b("-", x, Term::U64(1 << 31));
                Ok(b("<", shift(a), shift(z)))
            }
            Type::Bool => Ok(choice(a, Term::Bool(false), z)),
            Type::String => {
                let sort = self.sort(ty)?;
                let f = self.function(
                    vec![("key_left", sort.clone()), ("key_right", sort)],
                    Sort::Bool,
                    m(
                        v("key_left"),
                        vec![
                            (
                                vec![],
                                m(
                                    v("key_right"),
                                    vec![
                                        (vec![], Term::Bool(false)),
                                        (
                                            vec!["right_byte".into(), "right_tail".into()],
                                            Term::Bool(true),
                                        ),
                                    ],
                                ),
                            ),
                            (
                                vec!["left_byte".into(), "left_tail".into()],
                                m(
                                    v("key_right"),
                                    vec![
                                        (vec![], Term::Bool(false)),
                                        (
                                            vec!["right_byte".into(), "right_tail".into()],
                                            choice(
                                                b("==", v("left_byte"), v("right_byte")),
                                                Term::SelfCall(vec![
                                                    v("left_tail"),
                                                    v("right_tail"),
                                                ]),
                                                b("<", v("left_byte"), v("right_byte")),
                                            ),
                                        ),
                                    ],
                                ),
                            ),
                        ],
                    ),
                    Some(0),
                )?;
                Ok(call(&f, vec![a, z]))
            }
            Type::Named(n) if self.program.ids.contains(n) => Ok(m(
                a,
                vec![(
                    vec!["left_high".into(), "left_low".into()],
                    m(
                        z,
                        vec![(
                            vec!["right_high".into(), "right_low".into()],
                            choice(
                                b("==", v("left_high"), v("right_high")),
                                b("<", v("left_low"), v("right_low")),
                                b("<", v("left_high"), v("right_high")),
                            ),
                        )],
                    ),
                )],
            )),
            _ => Err("unsupported source key ordering".into()),
        }
    }
}
