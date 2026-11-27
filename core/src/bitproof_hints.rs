//! Bounded, lossless RUP reference transport, independent of circuit meaning.
//! Five payload bits per ASCII digit, bit 5 continues; signed deltas use zigzag.
//! Decode incrementally: never allocate an expanded hint vector or skip replay.
use super::Step;
use crate::LangResult;

const MAX_HINTS: usize = 100_000;
const MAX_REFERENCE: usize = super::MAX_CLAUSES + super::MAX_STEPS;

pub(super) fn packed_indices(
    step: &Step,
) -> LangResult<impl Iterator<Item = LangResult<usize>> + '_> {
    let text = step
        .hint_deltas_v1
        .as_ref()
        .ok_or("packed bit proof hints required")?;
    if !step.hints.is_empty() {
        return Err("bit proof has both plain and packed hints".into());
    }
    if text.is_empty() || text.len() > MAX_HINTS * 4 {
        return Err("bit proof packed hint byte limit".into());
    }
    Ok(Deltas {
        bytes: text.as_bytes(),
        position: 0,
        previous: 0,
        count: 0,
    })
}

struct Deltas<'a> {
    bytes: &'a [u8],
    position: usize,
    previous: i64,
    count: usize,
}
impl Deltas<'_> {
    fn decode(&mut self) -> LangResult<usize> {
        if self.count == MAX_HINTS {
            return Err("bit proof packed hint count limit".into());
        }
        self.count += 1;
        let mut value = 0u32;
        for group in 0..4 {
            let byte = *self
                .bytes
                .get(self.position)
                .ok_or("truncated bit proof packed hint")?;
            self.position += 1;
            let digit = match byte {
                b'A'..=b'Z' => byte - b'A',
                b'a'..=b'z' => byte - b'a' + 26,
                b'0'..=b'9' => byte - b'0' + 52,
                b'-' => 62,
                b'_' => 63,
                _ => return Err("invalid bit proof packed hint digit".into()),
            };
            let payload = digit & 31;
            value |= u32::from(payload) << (5 * group);
            if digit & 32 == 0 {
                if group != 0 && payload == 0 {
                    return Err("noncanonical bit proof packed hint".into());
                }
                let delta = if value & 1 == 0 {
                    i64::from(value / 2)
                } else {
                    -i64::from(value / 2) - 1
                };
                let reference = self.previous + delta;
                if reference < 0 || reference >= MAX_REFERENCE as i64 {
                    return Err("bit proof packed hint reference range".into());
                }
                self.previous = reference;
                return Ok(reference as usize);
            }
        }
        Err("bit proof packed hint digit limit".into())
    }
}
impl Iterator for Deltas<'_> {
    type Item = LangResult<usize>;
    fn next(&mut self) -> Option<Self::Item> {
        if self.position == self.bytes.len() {
            return None;
        }
        let result = self.decode();
        if result.is_err() {
            self.position = self.bytes.len();
        }
        Some(result)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn packed(text: &str) -> Step {
        Step {
            clause: vec![],
            hints: vec![],
            hint_deltas_v1: Some(text.into()),
        }
    }
    fn decode(text: &str) -> LangResult<Vec<usize>> {
        packed_indices(&packed(text))?.collect()
    }
    #[test]
    fn signed_deltas_and_legacy_bytes_are_exact() {
        assert_eq!(decode("ACCBB").unwrap(), vec![0, 1, 2, 1, 0]);
        // Independent Python producer fixture spans every digit-width boundary
        // and the largest possible reference, including a large negative delta.
        assert_eq!(
            decode("AC8BC-9BC-_9BC-_wR9_wT").unwrap(),
            vec![0, 1, 31, 32, 1023, 1024, 32767, 32768, 319999, 0]
        );
        let legacy: Step = serde_json::from_str(r#"{"clause":[],"hints":[0,1]}"#).unwrap();
        assert_eq!(
            serde_json::to_string(&legacy).unwrap(),
            r#"{"clause":[],"hints":[0,1]}"#
        );
        assert_eq!(legacy.hints, vec![0, 1]);
        let wire = serde_json::to_string(&packed("AC")).unwrap();
        assert_eq!(
            serde_json::to_string(&serde_json::from_str::<Step>(&wire).unwrap()).unwrap(),
            wire
        );
    }
    #[test]
    fn ambiguous_malformed_and_unbounded_hints_reject() {
        let mut both = packed("A");
        both.hints.push(0);
        assert!(packed_indices(&both).is_err());
        for text in ["", "g", "gA", "ggggA", "B", "ggxT", "_____", "é", " ", "="] {
            assert!(decode(text).is_err(), "accepted {text:?}");
        }
        assert!(packed_indices(&packed(&"A".repeat(MAX_HINTS * 4 + 1))).is_err());
        assert_eq!(decode(&"A".repeat(MAX_HINTS)).unwrap().len(), MAX_HINTS);
        assert!(decode(&"A".repeat(MAX_HINTS + 1))
            .unwrap_err()
            .contains("count limit"));
        assert!(
            serde_json::from_str::<Step>(r#"{"clause":[],"hints":[],"hint_deltas_v2":"A"}"#)
                .is_err()
        );
        assert!(
            serde_json::from_str::<Step>(r#"{"clause":[],"hints":[],"hint_deltas_v1":0}"#).is_err()
        );
    }
}
