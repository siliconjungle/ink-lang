# Database-authored algorithms

An optimisation can now supply an implementation that was absent from the input
program. It consists of typed helper definitions and an ordinary equality proof.
The compiler does not recognise the algorithm's name or nominate a target body.

For example, the knowledge catalogue supplies this helper:

```ink
fn ge_count(xs: List<u32>, cut: u32) -> u64 {
    return foldr(xs, 0, fn(item) => fn(acc) =>
        if item >= cut { acc + 1 } else { acc });
}
```

Its inductive proof equates `count(xs.filter(fn(x) => x >= cut))` with the helper.
The input program need not define `ge_count`. The database provides its body,
the proof, and their relationship. The emitted code contains the admitted helper;
there is no runtime database lookup or algorithm interpreter.

## Admission and discovery

`ink-source-extension-v1` contains ordinary executable-core function definitions,
nominal IDs, records and enums. An `extension` step in a compiled plan authenticates
that data, prevents collisions with existing declarations and implicit source
references, and runs the normal type, binding, ownership, purity and termination
checks. It cannot add states, actions, events, host code or foreign instructions.
The extension alone grants no replacement authority. A subsequent `rewrite`
step must prove equality against the extended module's exact definition context.
Earlier representation, physical, property and routing certificates are invalidated
when the source changes.

`ink-source-algorithm-v1` is the reusable authoring layer. Each entry has:

- `type_parameters`: names for structural type substitution;
- `definitions`: ordinary core helpers and their intermediate types;
- `law`: a normal law template and its proof.

The installed `database-source-algorithms` recipe matches typed expressions,
instantiates the template, generates deterministic fresh global names, obtains a
checked extension, and constructs its ordinary proof-backed rewrite. It reuses
identical helpers already installed by an earlier step. No per-family compiler
or planner dispatch case is needed. Failed type checking or false proofs decline
the candidate; snapshot membership and producer identity do not establish truth.

The checked public functions and state declarations retain their original
signatures and meanings. Planned lowerers retain the original portable snapshot
layout even when new scratch types are introduced. The current core has no
separate visibility flag: generated helper functions may appear in low-level
function metadata/exports. Their generated names are implementation details,
not a stable library API.

Publish templates from the knowledge checkout:

```sh
python -m ink_knowledge.source_algorithms libraries/source-algorithms.json --root .
python -m producers.allocation_laws --root .
```

The templates are untrusted data until each concrete instance is checked.
`ink extend-core SOURCE REQUEST.json --core -o EXTENDED.json` exposes the same
conservative admission operation used by the producer. `ink compile SOURCE
--optimise KNOWLEDGE_DIRECTORY ...` discovers the installed recipe through the
normal adaptive planning path. Eligibility and profitability remain separate:
without comparable offline lifecycle evidence, the planner retains the baseline.

## Physical descriptions

Rust and Rust-Wasm capacity plans can carry an ordinary typed `capacity` expression,
for example `count(xs) + count(ys)`, instead of only one input-list projection.
A source-bound theorem must prove, in exact integers, that the result length is
at most that expression. The physical checker rejects unrelated, stale or false
bounds, affine input consumption and capacity calls that introduce recursion. The backend emits the expression and generic
collector. An unrepresentable machine-size hint falls back to normal growth; it
never truncates output. Recursive collectors and unsupported result sites fail
explicitly. More expensive bound computations still need profitability evidence.

The previous explicit Rust concat length formula has moved to eight database
cardinality laws, covering scalar, string, exact-integer and nested-list carriers.
Unselected concat uses ordinary ordered iterator collection. The generic capacity
producer reifies a theorem's right-hand expression; it contains no concat formula.

Packed first-order spines can now have 1–16 head fields followed by the tail.
The database datatype selects their product shape. Rust composes existing Boolean
bit blocks, exact word blocks and shared immutable data handles into field lanes.
Word lanes promote when needed; suffixes and shared owners retain their values.
This generalises the previous single-head-field ABI without adding an algorithm
case for every record shape. The current ABI still requires an empty first
constructor and a second constructor whose final field is the recursive tail.
It does not provide arbitrary tree, arena or mutable pointer layouts.

## What remains fixed

The database can define derived operations, algorithms, types, proofs, capacity
formulas and supported representation compositions. It cannot introduce an
unimplemented machine instruction or host effect by assigning it a name. The
fixed core defines meanings and checks proofs; lowerers implement the base
operations and their ownership/storage contracts. New machine capabilities should
be added as composable contracts with semantics and backend validation, rather
than per-algorithm recognition cases.

## Evidence

`tools/database_source_algorithms.py` grows a small catalogue under one unchanged
compiler. One template reaches three original functions. Four templates reach
seven functions across U32, I32, Boolean and String carriers, including new helper
calls, scratch record types and a rewrite below a lambda. The complete plan reuses
one helper across two functions and supplies a multi-input allocation formula.
These are designed capability checks, not an independent held-out performance
corpus or evidence that a larger database automatically speeds up every program.

`tests/database_source_algorithms.rs` compares 48 values, transaction outcomes,
events and exact snapshots against the independent reference on C, Rust,
JavaScript, C-Wasm and Rust-Wasm. The reserved Rust variant is exercised natively
and through Wasm. Eligible numeric work also executes on GPU. Negative checks
reject undersized reservations, shadowing, invalid bodies and foreign declarations;
a separate F32 instance rejects an invalid distributive arithmetic proof.

The machine-readable results and compiler identity are recorded in
[database-expressivity-evidence.json](database-expressivity-evidence.json).

Cold standalone semantic search now initialises its disposable index before producer discovery. Relocated installs therefore use indexed queries instead of repeated full-catalogue scans; the index still supplies discovery hints and every selected proof replays.

Planning-session receipts bind the raw request separately from the checked, default-normalised plan. Optional physical fields therefore no longer cause valid database proposals to be discarded as a hash mismatch. The checker still replays every step and the planner still enforces profitability independently.
