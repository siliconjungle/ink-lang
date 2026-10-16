//! Fixed-width counting primitives. No discovered equations or source patterns.
use super::*;

impl Circuit {
    pub(super) fn word_count(&mut self, op: &str, input: &[i32]) -> LangResult<Value> {
        let width = if op.starts_with("word32.") { 32 } else { 64 };
        if input.len() != 64 {
            return Err("word count circuit width".into());
        }
        let mut result = if op.ends_with(".popcount") {
            // Sum disjoint bits in a balanced tree, retaining the carry lane at
            // each level. The final count includes width itself for all ones.
            let mut rows: Vec<Vec<i32>> = input[..width].iter().map(|&bit| vec![bit]).collect();
            while rows.len() > 1 {
                let mut next = Vec::with_capacity(rows.len() / 2);
                for pair in rows.chunks_exact(2) {
                    let size = pair[0].len() + 1;
                    let mut left = pair[0].clone();
                    let mut right = pair[1].clone();
                    left.resize(size, -1);
                    right.resize(size, -1);
                    next.push(self.add(&left, &right, -1)?);
                }
                rows = next;
            }
            rows.pop().unwrap()
        } else {
            // The priority encoder starts with the defined zero-input result.
            // A later selected set bit replaces it. For leading zeros, higher
            // bits have priority; for trailing zeros, lower bits do.
            let leading = op.ends_with(".leading_zeros");
            let bits = if width == 32 { 6 } else { 7 };
            let mut count: Vec<i32> = (0..bits)
                .map(|bit| if width & (1 << bit) != 0 { 1 } else { -1 })
                .collect();
            for step in 0..width {
                let index = if leading { step } else { width - 1 - step };
                let value = if leading { width - 1 - index } else { index };
                for (bit, previous) in count.iter_mut().enumerate() {
                    let literal = if value & (1 << bit) != 0 { 1 } else { -1 };
                    *previous = self.select(input[index], literal, *previous)?;
                }
            }
            count
        };
        result.resize(64, -1);
        Ok(Value::Word(result))
    }
}
