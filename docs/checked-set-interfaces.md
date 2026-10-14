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
Pure proof reuse also rechecks every supplied certificate, retaining direct uses
without adding duplicate wrapper theorems. Source unfolding and proposal attempts
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

This establishes a real Set interface and preservation proofs. It does not yet
provide interchangeable Set representations or a proved faster index algorithm.
The generic list implementation and invariant validation still have quadratic
worst-case work. Automatic contract proof discovery for arbitrary importers,
transport to additional physical consumers and full lifecycle/native/Wasm
performance measurements remain in progress. See `bench/checked-sets` for the
complete-call JavaScript measurements and strong u32 control.
