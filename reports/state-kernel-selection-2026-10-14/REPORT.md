# State kernels and paired lifecycle selection

This round adds database-selectable column event retention, exact compact commit
metadata with widening, optional literal aggregate-body inlining, fixed-index
scalar getters and retained dense lookup slots. Source arithmetic remains wrapping
full-width U64. Public versions, event commits and change boundaries remain BigInt.
The 53-bit metadata guard has 68 independently replayed RUP steps; it reuses an
existing universal word guard rather than introducing a new mathematical identity.

State acquisition now interleaves isolated candidate states in each fresh process.
The installed policy requires at least three processes and nine rounds per repeated
phase. The weighted sum of phase medians must improve by at least 10% in **every**
paired process. Module load, initialise, updates, failures, checkpoint and restore
remain explicit. Shared-process peak RSS conservatively includes all candidates.
This is an empirical profitability policy, not a confidence interval or proof.
Legacy/unpaired observations cannot authorize this paired switch; memory and
correctness gates remain separate. Holdout can reject the frozen training winner.

The final frozen five-candidate acquisition selected the inlined maintained dense
kernel and accepted it on independent holdout. Relative to the guarded general map,
its weighted process costs were about 27–44% lower in training and 24–36% lower on
holdout. The ordinary published-candidate planner command is tested separately;
its complete receipt is retained here. This establishes selection on these inputs,
not universal defaults for arbitrary schemas or missing workload evidence.

## State measurements

Three fresh Node processes, 4,096 rows, 120,000 warm calls per lane and 15 measured
rounds. Primary windows retain 16,384 events before acknowledgement; supplementary
windows retain 65,536. Each connected lane has one grouped consumer. Full-width
input histories and a hot-action commits/events control are checked separately.

| Merged compiler, primary window | Update + two reads | Connected update + reads |
|---|---:|---:|
| Ink compact commit kernel | 389.2 ns | 382.8 ns |
| Preact manual delta | 563.2 ns | 665.0 ns |
| Preact guarded Map delta | 498.4 ns | 491.0 ns |
| Preact guarded dense delta | **287.9 ns** | **322.8 ns** |
| Svelte manual delta | 601.4 ns | — |

| Merged compiler, longer retained window | Update + two reads | Connected update + reads |
|---|---:|---:|
| Ink compact commit kernel | 322.1 ns | 426.8 ns |
| Preact manual delta | 532.9 ns | 557.8 ns |
| Preact guarded Map delta | 369.4 ns | 479.2 ns |
| Preact guarded dense delta | **268.6 ns** | **357.4 ns** |

The added dense raw control receives the same 16,384-slot prefix opportunity and
exact BigInt sparse fallback. It remains faster. Raw controls omit versions,
ordered events, general transactions and portable restore. Ink retains those
contracts. The separate commits/events control matches only this hot action.
These results do not establish superiority over every state library or framework.
No DOM or rendering was measured.

An earlier quieter observation of the same compact strategy measured about
156 / 195 ns versus guarded Map 185 / 218 ns and guarded dense 121 / 148 ns.
That exact artifact is recovered and hash-checked against its original results.
The final merged run had different shared-host load; external controls slowed too.
Absolute timing differences across those runs do not establish a regression.
Process/sample extrema are retained; medians are not confidence bounds.
Unchanged reads remain close to, and sometimes slower than, raw signals.

After 65,536 retained events, median live-state heap growth following explicit GC
was 7,343,424 bytes with object events, 4,296,408 with column events and 2,735,928
with compact commit columns: about 63% less than object events. These include
changed rows and keeps, not isolated event-only allocations or peak RSS.

## Correctness and limits

Independent source histories cover twelve implementations, exact results/errors,
versions, ordered events and portable snapshots. The commit cases cover both sides
of 2^53, full-width sequence exhaustion, failure before commit, restore, rollback,
acknowledgement and typed change boundaries. Multiple channels and owned record
events use ordinary journals where needed. Forged guard/proof packets reject.
Scalar/flat native bodies may inline; other admitted definitions retain literal
fallback. No backend matcher authorizes an algebraic update or work-skipping rule.

The fixed storage/publication controllers and emitters remain trusted. The guard,
fold proofs and tests are not a whole-compiler correctness proof. These protocol
choices are JavaScript-only; unsupported target selections reject explicitly.
The frozen pure corpus subset is a catalogue regression check; it does not prove
state-protocol profitability or generality. Its funnel is retained separately.

All three frozen pure programs compiled. One admitted an alternative and one law;
none selected an alternative and there was no cross-program law reuse. All three
searches reached their planning time bound. This narrower result is retained rather
than borrowing an earlier corpus run's stronger funnel. The final tree passed
308 core tests, 35 standalone JavaScript tests against its actual Git core/ABI,
206 planner tests, 15 state/ledger/subscription tests and mandatory complete-target
parity, including eight observations and one actual eligible GPU call. Runtime
dependency metadata completed and its tracked lockfile remained unchanged.

Exact generated modules, complete admitted plan/proof packets, configurations,
sample data, lifecycle receipts, source, scripts and validation logs accompany
this report. Publication revisions and artifact hashes are recorded separately.
