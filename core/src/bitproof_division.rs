//! Fixed total machine quotient/remainder circuits. Source `quot_or`/`rem_or`
//! separately select their lazy fallback for zero and signed overflow.
use super::*;

impl Circuit {
    fn division_select(&mut self, condition: i32, yes: i32, no: i32) -> LangResult<i32> {
        // Gate sharing/simplification follows the selected existing encoding.
        // Do not change the historical select encoding or its proof identities.
        let yes = self.gate("and", condition, yes)?;
        let no = self.gate("and", -condition, no)?;
        self.gate("or", yes, no)
    }
    fn division_negate(&mut self, bits: &[i32]) -> LangResult<Vec<i32>> {
        self.add(&vec![-1; bits.len()], &bits.iter().map(|x| -*x).collect::<Vec<_>>(), 1)
    }
    fn division_sign(&mut self, bits: &[i32], sign: i32) -> LangResult<Vec<i32>> {
        let negative = self.division_negate(bits)?;
        bits.iter().zip(negative).map(|(&a, b)| self.division_select(sign, b, a)).collect()
    }
    pub(super) fn word_division(&mut self, name: &str, a: &[i32], b: &[i32]) -> LangResult<Value> {
        if a.len() != 64 || b.len() != 64 { return Err("division circuit word width".into()); }
        let width = if name.starts_with("word32.") { 32 } else { 64 };
        let signed = name.contains(".s");
        let remainder_result = name.ends_with("rem");
        let (mut dividend, mut divisor) = (a[..width].to_vec(), b[..width].to_vec());
        let (negative_a, negative_b) = if signed { (a[width-1], b[width-1]) } else { (-1,-1) };
        if signed {
            dividend = self.division_sign(&dividend, negative_a)?;
            divisor = self.division_sign(&divisor, negative_b)?;
        }
        let mut nonzero = -1;
        for &bit in &divisor { nonzero = self.gate("or", nonzero, bit)?; }
        // A width+1 remainder retains the carry from each left shift. Each
        // restoring step subtracts the zero-extended divisor and uses its
        // carry-out (no borrow) as the next quotient bit.
        divisor.push(-1);
        let mut remainder = vec![-1; width+1];
        let mut quotient = vec![-1; width];
        for index in (0..width).rev() {
            remainder.insert(0, dividend[index]); remainder.pop();
            let mut difference = Vec::with_capacity(width+1);
            let mut carry = 1;
            for (&a, &b) in remainder.iter().zip(&divisor) {
                let different = self.gate("xor", a, -b)?;
                difference.push(self.gate("xor", different, carry)?);
                let first = self.gate("and", a, -b)?;
                let second = self.gate("and", different, carry)?;
                carry = self.gate("or", first, second)?;
            }
            quotient[index] = carry;
            remainder = difference.into_iter().zip(&remainder)
                .map(|(difference, &original)| self.division_select(carry, difference, original))
                .collect::<LangResult<_>>()?;
        }
        let mut bits = if remainder_result { remainder[..width].to_vec() } else { quotient };
        if signed {
            let sign = if remainder_result { negative_a } else { self.gate("xor", negative_a, negative_b)? };
            bits = self.division_sign(&bits, sign)?;
        }
        // These total internal operators produce zero for divisor zero and a
        // wrapping quotient for MIN/-1. Source fallback selection is explicit
        // in the independently reconstructed typed source image.
        for bit in &mut bits { *bit = self.gate("and", nonzero, *bit)?; }
        bits.resize(64, -1);
        Ok(Value::Word(bits))
    }
}
