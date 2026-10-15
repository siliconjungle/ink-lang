# Checked approximation contracts

An approximation names the reference computation and the permitted error. It
expands to an ordinary checked postcondition; it does not change exact equality
or grant a rewrite rule. Every implementation, selected refinement, caller and
state invariant is rechecked through the existing source-bound evidence path.

```ink
spec fn estimate(x:Int)->Int
 approximates x+8 within absolute 8;
implementation precise for estimate {return repeat(8,x,fn(i,acc)=>acc+1);}
implementation cheap for estimate {return x;}

spec fn percent()->Int approximates 100 within relative(1,100);
implementation rounded for percent {return 99;}

spec fn neighbor()->f32
 approximates f32_from_bits(1065353216) within ulps 1;
implementation next for neighbor {return f32_from_bits(1065353217);}
```

`absolute` supports explicit `Int`, `u32`, `u64` and `i32` results. Its meaning
is a nonnegative budget and both exact integer inequalities
`actual-reference <= budget` and `reference-actual <= budget`. Conversion to
`Int` happens before subtraction, so word and signed-boundary errors never wrap.
The reference and budget are captured once with fresh lexical names.

`relative(numerator,denominator)` supports the same integer results. Numerator
must be nonnegative and denominator positive. Exact arbitrary-size integer
products establish `abs(actual-reference)*denominator <= abs(reference)*numerator`.
A zero reference requires an exact result. There is no floating rounding in this
contract, even for full-width word arguments and rational factors.

`ulps` supports `f32` results and a nonnegative integer budget. Both values must
be finite. The distance counts steps in binary32's ordered finite values, with
both signed zeros sharing one position. Negative minimum subnormal to positive
minimum subnormal is two steps. NaNs and infinities do not satisfy the contract,
including identical nonfinite bit patterns. This specifies representation error
against a binary32 reference; it is not an absolute/relative real-number bound
for a mathematical transcendental function. Unsupported metric/type pairs fail.

The clauses add conjuncts to existing `ensures`; they do not weaken other clauses.
They use existing executable operations and core identities. Ordinary exact
functions remain exact. Approximate refinements compose only when their complete
final contracts check; two local tolerances do not silently become one tolerance.
General type aliases/generic numerical metrics are not added by this syntax.

## Finite probability and reusable mathematics

`import "std:approximation" as approx` supplies exact integer `absolute_error`,
`within_absolute`, rational `within_relative` and
`probability_at_least<T>(space,predicate,numerator,denominator)`.

The last operation enumerates every position of a finite list. It is true exactly
when the space is nonempty, `0 <= numerator <= denominator`, the denominator is
positive, and `successful_positions*denominator >= positions*numerator`.
Duplicates intentionally carry repeated probability mass. Probabilities use
exact integer products. Empty spaces and invalid ratios return false. A finite
space is an explicit model of uniformly selecting a position; this operation
does not validate an external random-number generator or infer an input
distribution from samples. It adds no hidden runtime randomness.

```ink
approx.probability_at_least<u32>([0,1,2,3],fn(seed)=>seed==0,1,4)
```

The database's twelve `approximation/` laws cover exact error translation,
scaling, reversal, upper/lower error composition and widening, and finite-space
all/none/map/complement operations. Composition explicitly charges both errors.
Every inequality condition remains a premise at use. `producers.approximation`
authors and replays ordinary canonical laws before extending a snapshot:

```sh
PYTHONPATH=knowledge:planner python3 -m producers.approximation \
  --compiler target/debug/ink --output-store knowledge
```

The same twelve statements are independently translated and checked in
`ink-to-lean`, including a false composition as a negative control. This checks
the translated mathematics, not the complete compiler. The exporter refuses
floating operations whose canonical-NaN semantics its prelude does not model.

## Execution, optimisation and assurance

`examples/approximation.ink` demonstrates an admitted inexact refinement and
finite probability. The ordinary contract-witness producer and planner can
propose cheaper bodies; no algorithm name receives authority. Performance
selection still requires comparable observations or a validated work model.
An admitted approximation may intentionally differ from the baseline's output.
Pure JavaScript and Rust measurement use the existing `plan-work` interpreter to
obtain each refined plan's own expected results, binding source, selected module,
full plan identity and call count. Emitted code must match that oracle before
and after timing and preserve the exact call schedule and inputs. A candidate
cannot validate itself. Other measurement/work-count adapters retain their exact
baseline-parity guard and may conservatively decline inexact refinements.
Explicit checked selection remains available.

The core suite covers word extremes, signed zero, adjacent floats, NaN/infinity,
negative/invalid budgets, binder capture and stale evidence. Mandatory
`source_contracts` tests compare parser-expanded observers with independent
integer/finite-space oracles across native Rust, JavaScript and Rust-Wasm. They
also execute a selected inexact refinement and reject a rehashed false one.
This is additional implementation assurance, not a universal backend proof.
Exact `Int` observers use GPU host fallback; this does not add device coverage.

`tools/bench_approximation.py` replays source-bound candidates through pure
JavaScript or Rust, using disjoint development/holdout inputs. Its complete warm
call measurements include the applicable portable/JSON transport and consume
the full output; setup is reported separately. The initial small eight-step
kernel retained its baseline on both targets because the conservative timing
guard did not establish sufficient gain. Correct approximation permission does
not imply profitability. Raw measurements are retained with the validation report.

General real-valued numerical bounds, continuous distributions and a scalable
HyperLogLog confidence proof remain outside this finite contract domain. Existing
sampled transcendental accuracy targets do not become certified universal bounds.
