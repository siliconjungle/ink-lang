from common import *
import statistics,html,math
curves=read(OUT/'curves.json');rows=read(OUT/'cases.json');programs=read(OUT/'corpus.json');points=read(OUT/'checkpoints.json');pins=read(OUT/'protocol.json')['pins'];admission=read(OUT/'growth/admission.json');auto=read(OUT/'automatic-default-compilation.json');forced=read(OUT/'forced-compilation.json');replays=read(OUT/'candidate-replay.json');memory=read(OUT/'memory-summary.json');overlap=read(OUT/'ablation-overlap.json')
full=next(r for r in curves if r['lane']=='forced'and r['checkpoint']=='controlled');ordinary=next(r for r in curves if r['lane']=='automatic-default'and r['checkpoint']=='controlled')
ci=full['timing_only_fixed_corpus_ci'];fmt=lambda x:f'{x:.3f}'
lines=[f'''# Frozen knowledge-growth experiment, 13 October 2026

**The database supplies useful checked alternatives, but the ordinary planner did
not deliver an execution improvement in this cohort.** All 30 builds using the
installed balanced defaults selected the original program. The forced lane's
fixed, nonempty ten-program geometric mean is {full['program_geomean_speedup']:.3f}×
(95% timing-only interval {ci[0]:.3f}–{ci[1]:.3f}×) over its current-catalogue baseline.
This is a capability result for typed ports, not an automatic-selection result or
a claim about arbitrary software. The actual upstream controls are retained.

The compiler, all backends, runtime, ABI, native support, planner and installed
producer/instantiator code stayed fixed in this experimental epoch. Only ordinary
library/authoring data and six templates were added. The source programs and 260
fixture files were frozen before law authoring. The runtime corpus contains 240
evaluation cells; the headline cohort keeps the same 180 nonempty cells and equal
program/size/distribution weighting at every point. Empty cases stay in the raw
results and loss tables. Twenty separate inputs were reserved for development;
none of the heldout runtime measurements guided selection or repaired a law.

The two incremental reusable proof families are absorbing Boolean **left** folds
and controlled-fold map/filter fusion. They extend established early-exit and
fusion ideas; they are not six new algorithms. Four endpoints, two support lemmas,
36 representative carrier instances and source-bound adapters are counted
separately. An exact alpha-equivalent endpoint audit found no duplicates among
537 prior canonical endpoints mentioning `foldl` or `fold_until`; this is not a
solver for arbitrary algorithm equivalence. Templates remain untrusted authoring
data. Every chosen concrete application and its entire proof closure were checked
against the actual module; there are no conditions learned from timings, hashes,
producer identity or membership.

## Performance and selection

![Performance and compilation cost](performance-and-cost.png)

| Lane | Checkpoint | Additional families | Selected / useful program coverage / 10 | Fixed-corpus speedup | Changed-artifact gains / losses | Complete compile median, seconds |
|---|---|---:|---:|---:|---:|---:|''']
for r in curves:
 if r['lane']=='automatic':continue
 lines.append(f"| {r['lane']} | {r['checkpoint']} | {r['added_families']} | {r['selected_program_coverage']} / {r['useful_program_coverage']} | {r['program_geomean_speedup']:.3f}× | {r['robust_changed_artifact_gains']} / {r['robust_changed_artifact_regressions']} | {r['complete_compile_median_seconds']:.3f} |")
lines += [f'''
A robust cell requires both a paired interval excluding one and at least a 5%
change. The tables also retain every interval, lesser change and same-artifact
variation in [cases.csv](cases.csv) and [regressions.json](regressions.json).
Identical emitted bytes can still produce statistically significant timing
variation between separately loaded modules; that variation is labelled and is
not attributed to a law. Hash identity is not mathematical evidence.

The forced policy gives new families priority, then chooses structural cost,
and checks the complete chain before emission. It exercises capability and can
choose unprofitable work. It is not a production recommendation. The ordinary
lane uses the actual installed balanced defaults, with no supplied profiles or
heldout measurements. It replays the winner and retains the baseline when no
comparable lifecycle cost evidence exists. The separate short-budget `automatic`
matrix is supplemental: it has explicit 512-attempt / 16-state / eight-second
bounds and must not be described as the default configuration.

Installed defaults made {sum(r['receipt']['attempts']for r in auto):,} proposal
attempts and reported {sum(r['receipt']['admitted_states']-1 for r in auto):,}
additional admitted states across the matrix. These can overlap and include
properties and physical choices; they are not new algorithm families. All
{len(replays):,} distinct automatic candidate packages were exported from the
canonical publication and passed fresh logical replay. Their complete packages,
capability receipts and replay outputs are in [automatic-candidates.tar.xz](automatic-candidates.tar.xz)
and [candidate-replay.json](candidate-replay.json). Target availability is separate
from logical admission. The final selected packets have zero steps in every
ordinary-default build.

[Forced discovery](forced-compilation.json), [default receipts](automatic-default-compilation.json)
and [bounded receipts](automatic-compilation.json) retain matched proposals,
attempts, rejected edges, admitted states, budgets, exact snapshots, target
capability and final selection. Automatic attempts are counted from the stock
planner; the count is not every conceivable or latent alternative. Forced
matched-proposal counts may revisit the same endpoint.

## Attribution and adverse cases

![Program-level results](programs.png)
![Conditional family removal](ablations.png)

Removing each complete family, including its support entries, keeps the same
compiler, programs, fixtures and measurement boundary. Removal effects are
conditional on the other family and on the forced sequence. In the observed
nonempty cells, {overlap['cells_with_both']} cells have robust contributions from
both removals and {overlap['cells_with_one']} from one. They are not added or
multiplied into a combined speedup. Full per-cell effects are in
[ablations.csv](ablations.csv) and [ablation-overlap.json](ablation-overlap.json).
The drawing-query composition combines a Boolean termination rule with controlled
map/filter fusion; the pre-existing AST first-result alternative is not credited
as new knowledge. Unchanged complete-output and text/distinct-trace programs stay
in the cohort.

## Costs and memory

The complete ordinary-default compilation mean is
{statistics.mean(r['seconds']for r in auto):.2f} seconds per program across the
30 builds, including discovery, checking, candidate publication/indexing and
emission. These are single runs in checkpoint/source order on a shared desktop;
cache warming and system contention confound comparisons of offline latency.
The per-process peak RSS, raw command, output and errors are retained. The
budget constrains search, not every catalogue preparation or teardown operation.
Do not interpret a later shorter compile as a causal benefit of more knowledge.

Forced compilation has three clean repeated cohorts, acquired after the bounded
matrix. Index-refresh time is recorded separately and excluded from the warm
cohort means plotted in the compilation panel. Whiskers show their observed
range, not a well-estimated population interval from three observations. Two
initial repeats overlapped compilation because an earlier failed preflight marker
existed; they remain raw but are excluded, as recorded in
[acquisition-contention.json](acquisition-contention.json). The lanes use different
discovery procedures, so their latency ratio is not a compiler acceleration claim.

The 36 carrier instances passed the frozen checker in
{admission['process']['seconds']:.4f} seconds in one batch; that is one measurement,
not a precise checking-cost scaling law. The two cumulative publication/index
operations cost {points[1]['publication_index_seconds']:.2f} and
{points[2]['publication_index_seconds']:.2f} seconds. The full setup/removal rebuild
cost and late OS RSS samples are in [setup-cost.json](setup-cost.json). It
reconstructs whole historical removal stores and indexes and includes old material;
it is not the cost of appending only six objects. The process termination interval
includes teardown after the final log. Late RSS samples do not establish a
whole-run memory peak. Initial upstream acquisition was not fully instrumented;
its download/setup cost remains unknown, rather than zero.

Runtime times include complete calls, output construction and bit-aware consumption
of every result field/word. Module import, fixture/oracle construction and per-lane
input adaptation are excluded and separately sampled. Inputs are checked unchanged
before/after. All selected variants match independent reference/JS oracles and the
actual upstream result wherever a control is declared. Empty, small, large,
early/late/absent-match and adversarial cases remain visible. Some domain labels
share identical inputs: [curves.json](curves.json) includes a unique-input-identity
sensitivity result, without changing the preregistered primary weighting.

Memory uses separate per-variant processes. [memory-summary.csv](memory-summary.csv)
records sampled RSS/heap, post-GC retained-heap deltas, logical JSON output bytes
and whole-process high-water RSS. It includes the harness, immutable input copies,
oracle outputs, setup and validation; it is not exact peak-live heap or total
allocated bytes. Retained deltas can be negative. Upstream index/subscription
controls are separately labelled. [runtime-contention.json](runtime-contention.json)
records active process CPU/RSS samples; no exclusive-machine claim is made.

## Source cohort and exact limits

The programs are held out of law development but are handwritten declarative
ports. Their syntax can favour a transformation. Lodash/RBush already implement
early exits; improving a fold port can recover an expert algorithm without
improving the original upstream routine. The drawing composition is authored,
not a verbatim tldraw function. These are material limits on independently chosen
software generalisation. [Research notes](research/NOTES.md) connect each primary
source to reusable algorithms and remaining source/action proof obligations.

| Program | Upstream source / role | Observation and limit |
|---|---|---|''']
for p in programs:
 scope=read(OUT/'scope-corrections.json').get(p['name'],p['scope']);lines.append(f"| {p['name']} | {p['upstream']} | {scope} |")
lines += ['''
Actual controls use Lodash 4.17.21, TypeScript 5.9.3, RBush 4.0.1, gl-matrix 3.4.4
and RxJS 7.8.2. Tarball integrity, source revisions, per-file hashes and dependency
pins are retained. The RBush control includes `new`, bulk index construction and
one query on each call; it does not rank resident indexes. The TypeScript control
uses a captured parent chain, excluding parse/bind/construction. The gl-matrix
control agrees with the source binary32 steps on the frozen exact dyadic domain,
not arbitrary F64 inputs. The RxJS control observes a synchronous finite ordered
trace through `distinctUntilChanged` and `toArray`, excluding cancellation,
reentrancy and failure semantics. Partial kernels are not whole editors, parsers,
drawing systems, simulations, dataflows or ECS applications.

| Alternative / stage | Exact limitation in this study |
|---|---|
| Absorbing Boolean left folds | Expressed, discovered, checked and lowered in forced replay; profitable only in some input regimes. Default selection retains the baseline without comparable cost evidence |
| Controlled map/filter fusion | Expressed, discovered and checked on a composed query. Mapper/predicate evaluation can duplicate work; validity does not establish profitability |
| Source helper callbacks | Chained callable results/multi-argument function-type syntax hit the fixed ordinary source elaboration boundary. `FoldInput<T,S>` records provide the same authoring data without changing compiler machinery |
| Binary search / compressed IDs | The arbitrary-ID source contract proves no sortedness, uniqueness or representation invariant. No such shortcut is admitted. This does not assert that the compiler cannot express binary search |
| Piece/finger trees and retained spatial summaries | The flat kernel interfaces have no lifetime/update contract. No source/action-bound maintained-tree candidate was supplied at these checkpoints; no expressivity impossibility claim follows |
| Differential arrangements and broader incremental views | A finite distinct-value trace provides no frontiers, retained trace/index invariant or update/query lifecycle. No arrangement candidate is present; no whole-system result is claimed |
| Bulk state / eventful operations | Returned row values have no transaction/event authority. Event ordering, errors, rollback and snapshots cannot be inferred from the pure kernel |
| Other execution targets | Helper value/error-free snapshot conformance passes C/Rust/JS/both Wasm; no GPU or non-JS execution-time extrapolation is made |

The tests preserve stopping-item semantics, wrapping words, empty results and exact
portable snapshots. The generic proof rules preserve original iteration and
binary32 grouping; they assume no associativity. The admitted pure-total
observation domain excludes resource exhaustion, allocation failures and host
traps. Those are not silently promoted into checked error-preservation claims.
No arbitrary JSON, CRDT or new host primitive was introduced. Rejected authoring
attempts and erroneous preflight CLI invocations remain archived separately.

## Frozen epoch and publication

| Package | Exact measured revision |
|---|---|''']
for name,pin in pins.items():lines.append(f'| {name} | `{pin}` |')
lines += [f'''
Compiler binary SHA256: `{read(OUT/'compiler.json')['sha256']}`.
[Execution file manifest](execution-files.json), [complete tracked-source audit](complete-machinery-audit.json), [frozen machinery archive](frozen-machinery.tar.xz), [protocol](protocol.json),
[search protocols](default-automatic-protocol.json), [corpus](corpus.json),
[fixtures](fixtures.json), [upstream provenance](upstreams.json),
[duplicate audit](duplicate-endpoint-audit.json), [helper parity](helper-validation/all-targets.log)
and [artifact audit](audit.json) bind the measured material. Hashes bind bytes;
the replayed proofs establish the admitted transformations. Historical experiments
remain unchanged and are not spliced into this fixed-cohort curve.

The ongoing compiler/discovery/physical work advances `main` separately. Any use
of that new machinery requires a new experimental epoch. Publication may include
newer package pins; that does not change which executable produced these samples.
The integration record names the final public revision separately from the
measured revision. The goal of ordinary independently chosen software acceleration
is **not established** by this limited cohort. The evidence instead identifies
working reusable capabilities, adverse regimes, a costly search/publication path,
and the missing profitability evidence at ordinary selection.

Reproduce with [the harness](../../bench/knowledge-growth/README.md). Keep exact
pins, immutable raw samples, all programs/weights and every adverse result. Do not
replace the original epoch with a newer compiler or retune on its heldout times.
''']
text='\n'.join(lines);(OUT/'README.md').write_text(text)
body=''.join(f'<p>{html.escape(line)}</p>'for line in text.splitlines()if line and not line.startswith('!['));(OUT/'report.html').write_text('<!doctype html><meta charset="utf-8"><title>Frozen Ink knowledge growth</title><style>body{max-width:1100px;margin:40px auto;font:16px/1.5 system-ui;color:#18212a}img{width:100%}p{margin:.5em 0}</style><h1>Frozen Ink knowledge growth</h1><img src="performance-and-cost.png">'+body+'<img src="programs.png"><img src="ablations.png">')
print('report written')
