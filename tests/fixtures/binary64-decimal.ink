module Binary64DecimalTest;
import "std:binary64_decimal" as decimal;

query format_bits(bits: List<Vec2<u32>>) -> List<Option<String>> {
    return bits.map(fn(word) => format_word(word));
}

fn format_word(word: Vec2<u32>) -> Option<String> {
    let bits = wrapping_shl(word_widen_u32_to_u64(word.x), 32) | word_widen_u32_to_u64(word.y);
    return decimal.finite(f64_from_bits(bits));
}
