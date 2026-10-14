# Predicate action kernels: completed performance round

This round adds reusable proof and execution mechanisms for maintained state. It
does not establish that Ink beats every state library, nor measure UI frameworks.
The remaining short-window differences against a strong handwritten signals
control make a different compiler performance angle more useful than continuing
to tune this one fixture.

## Shipped mechanisms

- A database-supplied, universally checked row-aware replacement function. Its
  equation binds arbitrary totals, keys, old rows and new rows; implementations
  remain literal database definitions rather than compiler algebra recognisers.
- Five full-width wrapping-word certificates, containing 58,636 RUP steps in
  total, for Boolean and predicate transition arithmetic. Source factorisation,
  signatures, hygienic instantiation and equality proofs remain admission gates.
- Separate lean result-only action entrypoints, embedded aggregate kernels,
  retained dense slots and removal of busy-flag writes on checked callback-free
  preflight paths. Fallible paths and host transactions retain the generic journal.
- Cold subscription schedules and direct changed-output delivery, preserving
  batching, reentry, errors and committed publication.
- Exact contiguous event commit runs with materialisation on gaps or repeated
  commits and widening beyond exact Number representation.
- Dense restore spare reuse, preserving candidate validation before installation,
  row ownership, ordering and sparse full-width key fallback.

The column scratch/plain-word experiment measured slower and was removed from
the shipped implementation. Typed columns already supported by other checked
plans remain available; this experiment supplied no authority to select them.

## Steady-state results

Three fresh processes per window, 15 measured rounds, 120,000 warmup calls,
256/4,096/16,384 rows. Values below are medians of process medians in nanoseconds
per operation. These runs use the frozen generated artifacts archived beside this
report; the host was shared and results varied between processes.

| Event window | Rows | Ink kernel update | Ink event runs update | Trusted dense Preact update | Ink kernel connected | Ink event runs connected | Trusted dense Preact connected |
|---|---:|---:|---:|---:|---:|---:|---:|
| 16,384 | 256 | 138.8 | 134.1 | 124.1 | 154.2 | 142.4 | 262.4 |
| 16,384 | 4,096 | 166.5 | 158.4 | 182.3 | 173.8 | 189.1 | 230.7 |
| 16,384 | 16,384 | 167.8 | 212.6 | 156.3 | 239.1 | 249.7 | 213.9 |
| 65,536 | 256 | 214.7 | 191.3 | 216.6 | 208.5 | 196.1 | 264.6 |
| 65,536 | 4,096 | 242.1 | 224.8 | 232.4 | 280.8 | 263.6 | 347.7 |
| 65,536 | 16,384 | 248.3 | 226.5 | 265.6 | 308.1 | 370.1 | 437.1 |

Ink often wins connected and retained-window comparisons, but not every size or
phase. Scalar reads are near a tie and sometimes slower. The trusted dense control
uses the same canonical key assumption as bound Ink; the historical guarded lane
remains separately reported. Raw controls omit Ink's events, versions, failures,
transactions and snapshots. These numbers compare state operations, not DOM or
framework rendering, and do not renew historical Frontier comparisons.

## Selection and generalisation

The first complete-lifecycle candidate was correctly rejected on held-out traces
(ratios 0.626, 0.661, 1.198). After dense restore reuse, the measured winner was
the earlier guarded scalar kernel, with held-out ratios 0.723, 0.669, 0.642 against
the general guarded-map implementation. The new row arithmetic was not the
winner of that profile. Ordinary CLI planning admitted five state candidates and
accepted its frozen selected candidate on held-out evidence.

The frozen pure planning corpus compiled 3/3 programs, admitted one law and found
one alternative, but selected none and demonstrated no cross-program law reuse.
Two programs stopped at the time budget, one at the measurement budget. This
leaves planning cost and broader generalisation as concrete future directions;
entry count alone is not evidence of either.

## Validation and scope

Checks cover full-width wrapping and keys, forged/stale proofs, source failures,
owned results, event history, rollback, grouped callbacks, reentry, repeated and
malformed restores. Independent source histories compare outcomes and portable
snapshots. Final integration results are archived in the accompanying wrap logs,
including mandatory native C/Rust/JavaScript/both Wasm and actual eligible GPU
work. Tests and algebra proofs do not prove whole-compiler correctness.

The archived benchmark artifacts predate the final merge of upstream numeric/text
operations and maintained extrema support. Final conformance checks validate that
integration; benchmark claims refer specifically to the archived frozen artifacts.

Final core validation passed 315 tests; planner validation passed 208 tests and
knowledge proof-hygiene validation passed seven tests. The failed initial wrap
logs are retained as integration history, not counted as successful checks.

The independently pinned JavaScript package passed 41 tests, including the
upstream native word-operation suite. The standalone runtime passed a locked
check against actual Git dependencies with a single ink-core revision.

The final state rerun passed 16 tests (three maintained-state, eight signals-state,
five protocol). The six checked-set integration tests passed separately. Actual
GPU runs matched 13 source observations and eight protocol observations, one
GPU dispatch in each suite; both Wasm targets matched exact snapshots.
