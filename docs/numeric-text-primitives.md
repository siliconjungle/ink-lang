# Numerical and UTF-8 primitives

Executable core V11 adds fixed, typed scalar and text operations. Old programs
retain their existing semantics version; new core bytes cannot claim an older
version. The independent reference evaluator has an integer-significand square
root; generated programs execute literal primitives without a source evaluator.

## Exact binary32 operations

[Explicit binary64](binary64.md) adds a separate F64 domain in executable core
V15: suffixed literals, typed arithmetic/conversions and exact state/transport
across CPU targets. It does not widen the F32 libraries below, supply F64 source
AD or establish universal approximation/error contracts.

`sqrt(x:f32)->f32` rounds to nearest, ties to even. `sqrt(-0)` is `-0`,
`sqrt(+infinity)` is `+infinity`; negative nonzero arguments and all NaNs produce
canonical `F32Bits:2143289344` (`0x7fc00000`).

`a / b` elaborates to `f32_div(a,b)` and accepts F32 only. Every result rounds
separately to binary32. Signed zero and gradual underflow remain observable;
zero/zero and infinity/infinity produce canonical NaN. Nonzero divided by zero
produces signed infinity. Integer division retains `quot_or`/`rem_or`.

`is_nan` and `is_finite` return Bool. `floor`, `ceil`, `trunc` and
`round_ties_even` return F32, preserve signed zero/infinity, and canonicalise NaNs.
`round_ties_even` names its rounding rule; it is not JavaScript's `Math.round`.

`f32_bits` and `f32_from_bits` reinterpret a U32 without arithmetic, including
NaN payloads and signed zero. These are typed fixed meanings, not casts of host
objects or permission for arbitrary representation replacement.

| Operation | Input | Output | Meaning |
| --- | --- | --- | --- |
| `f32_from_u32`, `f32_from_u64`, `f32_from_i32`, `f32_from_int` | Named integer type | F32 | Nearest, ties to even; sufficiently large Int becomes signed infinity |
| `u32_from_f32`, `u64_from_f32`, `i32_from_f32`, `int_from_f32` | F32 | Option of named integer type | Truncate toward zero, then check range; NaN/infinity/out-of-range returns None |
| `popcount`, `leading_zeros`, `trailing_zeros` | U32, U64 or I32 | U32 | Fixed-width raw word counts; zero has 32/64 leading and trailing zeros |

The conversion of `-0.5` to an unsigned integer succeeds with zero: bounds apply
after truncation. There are no implicit conversions. I32 bit counts use its
32-bit two's-complement bits. JavaScript rounds BigInt directly to binary32,
avoiding the double-rounding errors of BigInt → Number → F32.

GPU square root, division, rounding, classification and integer-to-F32 conversion
use exact integer lanes. They do not use WGSL's approximate floating operations.
Fallible values, arbitrary Int and String use the complete host when a device
closure cannot express them. Required device execution reports that limitation;
a host fallback is not device coverage.

## String coordinates

Strings remain Unicode scalar text encoded as UTF-8 at the portable boundary.
Offsets and lengths below are **UTF-8 bytes**, not UTF-16 code units, Unicode
scalar counts or grapheme counts.

| Operation | Signature | Boundary behavior |
| --- | --- | --- |
| `string_byte_len` | String → U32 | UTF-8 byte length |
| `string_byte_at` | String, U32 → Option<U32> | Raw byte, including continuation bytes; absent past the end |
| `string_slice` | String, start:U32, end:U32 → Option<String> | Half-open range; None for reversed/out-of-bounds offsets or split code points |
| `string_concat` | String, String → String | Exact concatenation; lengths exceeding U32 fail |
| `string_find` | String, needle:String, start:U32 → Option<U32> | First exact occurrence at/after a valid starting boundary; byte offset; empty needle matches start |

For `aé😀z`, `é` occupies bytes [1,3), `😀` starts at byte 3; slicing [2,3)
fails. Embedded NUL and BOM are ordinary data. JavaScript's trusted standalone
input contract requires valid Unicode scalar strings, as does the checked ABI;
it does not assign semantics to lone UTF-16 surrogates. No cross-call host caches
or retained mutable inputs are introduced.

## Algorithms supplied by knowledge

`import "std:math" as math` loads `knowledge/libraries/math.ink`.
It provides `abs_f32`, `min_f32`, `max_f32`, `clamp_f32`, generic word variants,
scaled `length2`/`length3` and `normalise2`/`normalise3`. Float min/max propagate
canonical NaN and distinguish signed zeros. Reversed float clamp bounds return
canonical NaN. Normalisation rejects zero and non-finite vectors with None;
scaling before length avoids needless overflow and underflow.

The same library supplies deterministic `sin_approx`, `cos_approx`, `exp_approx`,
`exp2_approx`, `log_approx` and `log2_approx`. They return Option<F32> and have
explicit bounded domains: sine/cosine use |x| ≤ the nearest F32 to π; exponential
uses |x| ≤ 80; log accepts positive finite F32, including subnormals. `exp2_approx`
applies the exponential's domain check after its F32 conversion to natural units.
All non-finite or out-of-domain arguments return None. These are portable source
algorithms, not unrestricted or correctly rounded transcendental primitives.

Their accuracy acceptance targets are absolute error ≤ 1e-5 for sine/cosine,
relative error ≤ 2e-5 for exponentials, absolute error ≤ 2e-5 for natural log and
≤ 3e-5 for log2. The independent numerical suite checks 4,097 samples per function
and retains the worst observed error. This is tested accuracy coverage, not a
kernel-certified universal numerical error bound. Exact source semantics are the
stated ordered F32 polynomial/range-reduction computations; optimisation cannot
silently substitute these approximations for an exact expression or host `sin`.
Explicit [approximation contracts](approximation-contracts.md) now support
integer absolute/rational-relative bounds and finite-f32 ULP bounds against a
declared binary32 reference. They do not turn the sampled transcendental targets
above into universal real-number bounds.

`import "std:text" as text` loads ordinary chunked immutable text algorithms:
construction, append, fallible byte length, flatten, slice, search and insertion. This is
an example representation on existing lists, not a claim of balanced-rope storage
or cheap insertion at every scale. New balanced representations can be expressed
and evaluated separately using these primitives.

## Proof boundary and trust

The semantic bridge admits every new operation with its exact signature. General
congruence/case/list proofs can contain them; closed scalar/String/Option
computation replays through the fixed reference. Thirty-nine new ordinary choice
distribution laws cover individual operation arguments. They grant no float
reassociation, reciprocal multiplication or approximation replacement authority.

The first-order transition domain additionally admits square root, division,
rounding, classification, raw-bit reinterpretation and the fixed-width
`f32_from_u32`, `f32_from_u64` and `f32_from_i32` conversions. The named mathematical
operations preserve nearest-even rounding, U32 truncation and I32 sign
interpretation. Conversion arguments retain their original effect order and
transaction behavior. An integer-only rounding oracle checks boundary values and
1,024 additional words. This extends correspondence for existing executable
operations; it adds no float algebra or bit-circuit proof rule. Unbounded Int,
reverse float-to-integer and text transition projections remain fail-closed;
their pure semantic bridge is admitted.

Tests cover reference/native C/Rust/JavaScript/both Wasm, raw float adversaries,
U64 conversion midpoints, Int overflow, UTF-8 boundaries, committed events and
portable snapshots. Eligible GPU work is checked on the actual device. The type
checker, lowerings, native support, LLVM, JavaScript engine and GPU driver remain
trusted implementations; conformance is not a backend correctness proof.

Primary specifications informing target constraints:
[ECMAScript sqrt](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.sqrt)
and [WGSL floating accuracy](https://www.w3.org/TR/WGSL/#floating-point-accuracy).
