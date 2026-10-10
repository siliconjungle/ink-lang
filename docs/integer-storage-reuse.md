# Reusing exact integer storage

Native cache updates now move the existing BigInt into its final use. `num-bigint` can then reuse that allocation instead of constructing another owned result from borrowed inputs. This is efficient lowering of the selected expression, not an algebraic optimisation law. The database still selects and proves the arithmetic and journal.

The emitter preserves the expression tree and left-to-right arithmetic order. If `total` appears more than once, earlier occurrences copy it and the last occurrence consumes it. The same generic lowering handles `+`, `-` and `*`, and applies to forward cache updates and inverse journal restores. The saved expression is evaluated first against the unchanged total. Absent-to-absent removals move the cache back unchanged. Other borrowed operands remain borrowed. Unused old totals can be dropped after computing the saved value.

The bounded u128 path is unchanged. Its emitted inventory source is byte-identical to the previous report. The proof kernel, exact source bridge, reference transaction runtime, certificates and knowledge objects are unchanged as well. Efficient primitive ownership belongs in the base backend; no cancellation, reassociation or candidate-selection catalogue was added to the core.

This backend remains trusted. The current proof objects establish exact cache arithmetic and inverse identity, not Rust ownership refinement or allocator semantics. These pure arithmetic fragments expose no user callback or recoverable error during evaluation; process-level OOM/panic behavior is outside the existing value proof. Moving a cache value temporarily out of its field would require a stronger effect contract if observable callbacks or resumable failures were added. Signed operations can still allocate when the required output buffer differs, and owned queries/rows remain sources of copies.

## Evidence

All 65 tests pass. The native integration test additionally executes a valid candidate with repeated `total` uses and multiplication, alongside scanning, ordinary maintenance, large constants and checked reversible journals. Existing suites cover signed wide values, multi-table aborts, repeated writes/removals, tentative reads, event order, continued checkpoints, commit exhaustion and bounded fallback. New ownership lowering has been validated natively; this milestone does not claim a fresh browser/Wasm validation.

[The controlled storage experiment](../reports/storage-reuse-phase1/REPORT.md) has **560 samples, 16 cells and 5,120 independent native observation comparisons**. It emits the same source and version-3 snapshot/journal certificates using the preserved previous compiler (`c72942c`) and current compiler. It includes a handwritten Rust BigInt baseline and keeps all five variants' measured sources and binary hashes.

Old/new journal time ratios are 1.356× overall, 1.728× on the small-changing-row profile and 1.064× on wide-changing-row profiles, using geometric means of cell medians. At anchor exponent 8192 with a small changing signed row and no query per update, the journal median falls from **98.4 ns to 46.5 ns**, a **2.12×** speedup. Handwritten Rust takes **40.2 ns**, leaving Ink at **1.16×** its time in that case. Across all cells Ink remains at **1.90×** Rust time. This interactive shared-host experiment is not a universal speed claim.

Separate instrumented builds count update allocations/reallocations and requested bytes. In the 8192-exponent small-row case, old journal calls fall from **1.492 per update to zero**, matching the Rust baseline in that scope. The full-snapshot candidate falls from 2.492 to 1.0 calls per update. Wide-changing-row journal updates still use 8.469 calls/update, compared with Rust's 2.492; the remaining work is substantial. Setup, query digests and observations are excluded from these allocation counts. They are neither timing data nor peak/live memory measurements.

[The maintained inventory comparison](../reports/storage-inventory-phase1/REPORT.md) has **756 samples, 18 cells, 12,030 independent native comparisons and 4,010 reference outcomes** against C, C++ and Rust, including failures and events. Bounded Ink remains at **1.77×** handwritten Rust u128 time by geometric mean. This milestone mainly helps wide exact integers with small deltas; it does not make the overall language faster than these baselines.

Both reports include raw samples, emitted code/plans, sources, toolchains, compiler identities, full test evidence and an executed audit. The audit checks hashes and sample matrices, recomputes summaries, replays 188 native streams using original measured binaries, regenerates old/new emitted code and plans, reproduces both unchanged database candidates, and replays all 40 allocation cases. Timed binaries are not rebuilt during the audit.

```sh
python3 dev.py test
python3 dev.py build --release
# Restore/rebuild the recorded previous compiler separately at
# build/storage-original/lang before running the before/after experiment.
python3 bench/storage-reuse.py
python3 bench/state/run.py \
  --maintenance knowledge/research/reversible-maintenance/reversible.json \
  --output reports/storage-inventory-phase1 \
  --build-directory build/storage-inventory-bench
python3 tools/cache_allocations.py \
  --report reports/storage-reuse-phase1 --benchmark bench/storage-reuse.py \
  --build-directory build/storage-allocation-audit
python3 tools/audit_storage_reports.py --execute
```

The original compiler is an ignored local audit artifact, not a binary distributed in Git. Reports pin its commit and SHA-256; reproducing the comparison requires the recorded toolchain and old commit. Native libraries/executables are preserved locally with recorded hashes.

The [Hunchroom review](../reports/hunchroom-review-20261010/REVIEW.md) reinforces the next architectural dependency: prove actual state transitions and all-future observations, then safely admit representations and measure bounded selection. It supplies relevant operational models, not automatic authority for Ink's emitted backend. Durability, full state refinement, adaptive migration and the complete language/benchmark requirements remain active in `PLAN.md`.
