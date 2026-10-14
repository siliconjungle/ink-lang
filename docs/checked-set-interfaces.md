# Checked Set interfaces

`knowledge/libraries/collections.ink` exports an abstract refined `Set<T>`.
Construction establishes that no prefix contains its next element; callers cannot
read the representation or forge a constructor. `elements`, `size` and `has`
are the public observations. `union`, `intersection` and `difference` accept
validated sets and preserve the invariant. Intersection and difference filter
once instead of normalising each input and normalising the result.

Element identity is structural equality, including record fields, nested lists
and the exact bits of floats. Equal NaN payloads collapse; positive and negative
zero stay distinct. List `contains` retains its ordinary scalar equality meaning.

```ink
import "../knowledge/libraries/collections.ink" as sets;
fn example()->List<u32>{
 return sets.elements<u32>(sets.union<u32>(
  sets.set<u32>([3,1,3]),sets.set<u32>([1,2])));
}
```

The result is `[3,1,2]`; construction and union preserve first occurrence order.
Trusted interface calls may use established invariant facts. Raw arguments,
returned values, state initialisation and restored snapshots still have explicit
validation boundaries. Failed state changes preserve the committed state and
ordered event stream.

The untrusted `producers.set_contracts` author derives ordinary semantic laws
from exact typed helper definitions and shared fold laws. It proves prefix
observation, append and insert preservation, guarded fold preservation, absence
under filtering and a relation between full and filtered scans. No Set name,
source hash or producer verdict grants authority. Every generated lemma replays
in the existing kernel; exact source obligations replay again at attachment.
Pure and state proof reuse both recheck every supplied certificate against the
original source obligation. They retain the same proof trees and direct uses
without adding duplicate wrapper theorems; induction search runs only for
obligations still lacking a checked certificate. Source unfolding and proposal attempts
have finite budgets and fail closed on exhaustion.

To author a program importing the library:

```sh
PYTHONPATH=knowledge:planner python3 -m producers.set_contracts \
  path/to/program.ink build/set-proofs --compiler path/to/ink
ink build path/to/program.ink --contract-proofs build/set-proofs/evidence.json \
  --target javascript -o build/program.mjs
```

The complete fixture has 49 pure obligations and 10 state obligations covering
u32, strings, records and float bits. Its target comparisons include values,
errors, ordered events, exact snapshots, rollback and invalid restoration.
A fresh canonical hash and valid snapshot membership do not rescue a false
preservation proof. Set code currently executes on CPU/GPU host paths; the
numeric GPU control is separate device coverage.

The library now also exports `set_indexed_u32`, `union_indexed_u32`,
`intersection_indexed_u32` and `difference_indexed_u32`. These ordinary source
algorithms use the existing affine Map and Buffer primitives. Construction
preserves first occurrence order without copying every prefix. Its checked loop
predicate combines uniqueness of the buffer with index coverage; initialization,
each map/buffer step, the complete fold and its final observation all replay.
The query laws additionally prove complete ordered-list equivalence. Construction
currently has a checked uniqueness postcondition and complete output controls;
automatic replacement of the generic constructor still needs its functional
equivalence proof. These are explicit source implementations, not automatic
representation selection or persistent indexes.

JavaScript `callCompiled` transports established value-interface guarantees on
module-owned immutable handles. Checked source outputs establish those guarantees;
captured/decoded/built raw values establish them only after a successful guard.
Only an exact source-derived conjunction of parameter type predicates can skip
its repeated check. Other requires clauses still execute. Foreign handles,
mutable materialized copies and unsuccessful validation cannot establish facts.
Eight Set consumers exercise this transport, including raw float bits.
`known_distinct` now returns the interface's established Boolean guarantee while
retaining its raw ingress guard.

At 256 inputs, the indexed constructor's complete JavaScript calls measured
12.23 us typed and 36.83 us wire, versus 10.90 us and 31.50 us for the strong
u32 control. A separate immutable-handle workload at 4096 inputs measured union
383.82 us versus 327.04 us and intersection 203.95 us versus 120.70 us, including
detached output materialization and full consumption. Membership still scans
the logical list: 3.18 us versus 0.022 us for a retained native Set. Capture,
construction, encoding, decoding and the first decoded invariant check are
recorded separately. These shared-machine samples do not establish general
profitability; see the immutable receipts and `bench/checked-sets/handles.mjs`.

Interchangeable persistent Set representations remain unfinished. The generic
list implementation and raw invariant validation retain quadratic worst-case
work. Automatic contract proof discovery for arbitrary importers,
transport to additional physical consumers and full lifecycle/native/Wasm
performance measurements remain in progress. See `bench/checked-sets` for the
complete-call JavaScript measurements and strong u32 control.

Checked compact and portable JavaScript boundary readers compose with the Set
interface without weakening its validation. A 1,300-case comparison includes
complete values, exact error names/messages, corrupted and truncated bytes,
invalid invariants and raw float bits. The native/Wasm paths retain ordinary
readers; unsupported boundary selections fail explicitly. The new full-call
samples show no Set speedup from reader selection alone.
