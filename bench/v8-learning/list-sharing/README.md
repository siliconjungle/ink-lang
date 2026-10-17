# Checked sharing of immutable numeric lists

V8's value numbering and Maglev common-subexpression processors reuse eligible
expressions only inside their valid effect/control scope. Ink's database sharing
producer now also proposes exact repeated immutable numeric lists, including
nested lists. Each candidate introduces an ordinary lexical binding and requires
a complete source-bound `Normalize` proof. Lambda and lazy Boolean/choice regions
stay separate. Buffer owners, arbitrary named types, strings and unsupported F64
proof terms remain outside this proposal domain.

The new required CPU conformance extends the existing V8 suite to 354 complete
reference/native Rust/JavaScript/Rust-Wasm outcomes with exact snapshots. It adds 21 list cases with
captured arithmetic, nested/empty lists, both lazy branches full-width U64 values, signed overflow, Boolean lists and binary32 bit
patterns including signed zero, subnormal, infinities and NaN payloads. Focused
knowledge tests independently replay each source equation and reject a rehashed
wrong result; owner/type controls decline unsupported sharing.

The retained study compares explicit literal and checked shared JavaScript on
three callers: two different folds of one map, complete duplicated list output,
and a conditional fold caller. Three fresh Node processes per split measure
eleven rounds of complete compact calls. Each phase has two changing inputs.
Lengths are 0, 32, 512 and 4,096. Python wrapping-word oracles and independent Ink
reference calls check complete values; the installed adapter validates full
encoded outputs and unchanged inputs before and after timing. Input decoding,
execution, output encoding and full consumption are timed. Input encoding and
setup are excluded; cold/lifecycle costs are not established.

On held-out length 4,096, median paired process ratios are 1.075 for the two-fold
caller, 1.014 for full list output, and 1.030 for the mixed conditional caller.
Small and empty controls are mostly flat, including regressions. All process
samples are retained. These shared-host observations do not pass a universal
profitability claim or install automatic selection evidence; existing gates still
apply. No native, Wasm or GPU runtime speedup is inferred from CPU conformance.

Reproduce into a fresh directory using the recorded source/package pins:

```sh
PYTHONPATH=knowledge:planner python3 bench/v8-learning/list-sharing/run.py \
  --ink /absolute/path/to/ink --out /absolute/path/to/new-results
```

`evidence/selection.json` is the complete checked packet. `evidence/summary.json`
records the exact compiler image hash and per-process ratios. Corpus diagnostics
are independent of these runtime timings and are recorded under `corpus/`.

The final frozen ten-program cohort compiles all ten programs. Nine have checked
alternatives and none selects one. It observes 24 previously attributed law
identities, six reused across programs, and no new attribution against the prior
count-lane cohort. All quick budgets expire; nine final gates require measurement
evidence and one has no alternative. No near-miss reason is recorded. The
49.4895-second median excludes private preparation and is an unpaired observation,
not a causal compiler/runtime comparison. The final source context is unchanged.
All 47 focused knowledge regressions pass. A separate owned-output check mutates
nested results and confirms independent sibling containers, original inputs and
fresh calls. Both measured splits fail the conservative 10% full-workload sample
guard; these observations are retained outside automatic selection evidence.
