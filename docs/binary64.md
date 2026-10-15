# Explicit binary64 computation

The CLI distribution integrates this capability through independently pinned
core, ABI, native-support and backend packages. The browser editor retains its
separate pinned compiler; this document does not update its language coverage.

Ink's `f64` values carry IEEE binary64 bits. They let authored layout and numeric
code retain JavaScript's precision rather than silently rounding measurements to
F32. This is groundwork for faithful Pretext integration, not text-layout parity.

```ink
module precise;
fn scale(width:f64,ratio:f64)->f64 {
    return width*ratio;
}
fn measured()->f64 {
    return 1.0000000000000002f64;
}
```

Decimal/exponent literals use an explicit `f64` suffix. Unsuffixed decimal literals
retain their historical F32 meaning. Integer literals in an F64 context must be
exactly representable; an explicit integer conversion permits rounding. Existing
nominal types or aliases named `f64` retain their declared meaning. Mixed F32/F64
arithmetic requires an explicit conversion. Scalar vectors remain 32-bit domains;
`List<f64>` and ordinary records are supported.

## Arithmetic and conversion

Addition, subtraction, multiplication, division and ordered sums retain separate
binary64 rounding points. Scalar equality follows IEEE rules: signed zeroes compare
equal and NaNs compare unequal. Structural stored-data equality compares float
bits, including signed zeroes and NaN payloads. Negation flips the raw sign bit.
Arithmetic/conversion NaNs use the canonical payload `0x7ff8000000000000`.

`sqrt`, `floor`, `ceil`, `trunc`, `round_ties_even`, `is_nan` and `is_finite`
accept typed F32 or F64 arguments. Literal-only arguments retain the older F32
default; use `sqrt(2f64)` for binary64. The independent reference square root uses
integer significands and exact rounding rather than the target's square root.

| Operation | Interface |
| --- | --- |
| Reinterpret bits | `f64_bits(value)` / `f64_from_bits(bits)` |
| Cross floating widths | `f64_from_f32(value)` / `f32_from_f64(value)` |
| Convert integers | `f64_from_u32`, `f64_from_u64`, `f64_from_i32`, `f64_from_int` |
| Checked conversion back | `u32_from_f64`, `u64_from_f64`, `i32_from_f64`, `int_from_f64` |

Checked conversions truncate toward zero, then check the destination domain and
return `Option`. Nonfinite values reject those conversions. An integer-to-F64
conversion rounds to nearest/even and can overflow to infinity.

## State, targets and transport

F64 values work in ordinary and trainable state, events, keeps, fallible actions,
portable checkpoints and restore. No implicit learning follows from the numeric
type. The complete [example](../examples/binary64.ink) includes authored mutations,
rollback, measurements, conversions and collections.

Rust/native and Rust-Wasm emit binary64 arithmetic. JavaScript uses native Numbers
for finite computation and private immutable tags where exact NaN payloads must
survive copying or negation. Public scalar, structured, binary, sealed, prepared
and destination interfaces retain the same declared bits. Ordinary finite JSON
numbers are accepted; exact raw payloads use a bounded unsigned decimal string:

```json
{"F64Bits":"9223372036854775808"}
```

That example is negative zero. Numeric bit tags, leading zeroes, overflow and extra
tag fields reject at checked boundaries. Packed compute values use low/high
little-endian U32 words. The shared handle kind appends F64 at tag 9 without
renumbering older kinds. Portable snapshots preserve all 64 bits.

WGSL binary64 arithmetic is explicitly unsupported. Mixed GPU bundles retain
compiled CPU execution for those functions; eligible F32 functions can still
dispatch. Host fallback is not device F64 execution or GPU model training.

## Proof and differentiation scope

Executable modules using F64 bind `ink-executable-core-v15`; typed action transport
uses V4. Existing sources in the retained compatibility corpus keep identical
checked bytes and law bundles. This is a corpus check, not universal compatibility.

The semantic proof domain currently rejects F64 scalar/container/function sorts,
including closed nested subterms. It does not inherit F32 normalization, word
arithmetic or NaN-reflexivity claims. Existing external F32 division laws retain
their canonical meaning. General binary64 numerical proofs remain required work.

Source `gradient`/JVP and the neural/Adam libraries retain their existing F32
domain. Authored F64 learning updates are possible, but this implementation does
not supply F64 AD, certified numerical error bounds, automatic frozen arithmetic
specialization or a complete Pretext port. The checker, translation, codecs,
backends and toolchain remain trusted implementation code.

## Evidence

The standalone core suite includes binary64 parsing, invalid mixed-width inputs,
version tampering, independent square-root checks, raw-bit state histories and
proof-boundary rejection. A dual-core audit compares 247 admitted modules and 45
admitted external law sources against core package `93eb41bf` with unchanged
canonical bytes/bundles. Rejected source fragments are counted separately.

The shared ABI suite checks 268 edge/random bit patterns across Rust and JavaScript,
wire/compact framing, packed words, typed JSON, resource limits and invalid carriers.
Native support tests cover separate rounding, canonical NaNs, signed zero and
integer conversion boundaries. The integrated 65-case history compares values,
errors and events across reference, Rust, JavaScript, Wasm and the native GPU host.
CPU targets compare every portable checkpoint; the GPU host compares its exact
final checkpoint and rejects changed frozen restore inputs. Each history requires
one F32 device dispatch. A further pure-JavaScript
diagnostic counts 53 operations across ordinary, sealed, prepared and binary
interfaces, plus destination conversion. Immutable rebinding has a separate
three-observation history across the same targets, including changed-row rejection
and another required F32 dispatch.
These checks are conformance evidence, not mathematical or compiler proofs.

[Exact sources, package pins, complete histories and isolated validation](../reports/binary64-2026-10-16/README.md).

## JavaScript constant execution

Finite binary64 constants now emit as round-tripping number literals in pure and
action code, avoiding repeated BigInt/DataView construction inside ordinary loops.
Signed zero and every arithmetic rounding point remain unchanged. Explicit
nonfinite bit construction and private payload carriers keep their existing
meaning; this supplies no F64 proof-domain or precision-narrowing authority.

The raw-bit regression checks 2,210 boundary/seeded values across pure, compiled,
prepared and action execution. The full standalone JavaScript suite and complete
binary64/text histories pass. A short three-process diagnostic improves the
large prepared text counter 1.49×, while Pretext remains about twelve times faster.
Small ordinary calls can regress. [Exact artifacts, samples, profile and scope](../reports/binary64-literals-2026-10-16/README.md)
retain that gap; this does not establish broad numeric performance or full Pretext.
