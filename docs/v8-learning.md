# Learning from V8

Ink uses V8's optimizer as a source of proposals. The database owns optimization
laws and proof production; the compiler retains general checking and literal
lowering. V8's speculative types, maps, feedback and machine flags supply no
premises. Correctness, source applicability and profitability remain separate.

The upstream source revision is `c4e049d3cbda775e2c3af9410f6e18b18388d68b`.
`bench/v8-learning/upstream-inventory.json` records 607 compiler, Maglev and
supporting source files (18,254,266 bytes). Inventory and search results are not
completed review. The audit ledger records partial reads and outstanding families;
this is an ongoing audit, not a claim that every V8 optimization has been adopted.

Reproduce the source inputs without a complete V8 checkout:

```sh
python3 tools/acquire_v8_optimizer.py build/v8-source
```

The downloader streams the archive and verifies every selected file's bytes
against the inventory. It does not retain the archive or unrelated V8 source.

## Checked word and branch laws

The first family covers compatible bitfield tests, complementary masks,
wrapped-add/subtract/xor comparison cancellation, redundant shift-count masks,
shift distribution over bitwise operations, lossy shift round trips, overflowing
consecutive shifts, repeated branch conditions and shared-condition selects.
There are 63 admitted word/conversion laws. Four variable-count combination
proposals exhausted the initial proof budget; a multiplication-narrowing proposal
exhausted its time/conflict budget. Those five proposals remain unadmitted. A
budget failure does not establish that an equality is false.

Every frozen word law is a normal `ink-conditional-laws-v1` object with a hinted-RUP
bitvector certificate. Shift counts are U32 and reduce modulo the value width,
including counts 32, 64 and UINT32_MAX. Consecutive shifts may discard all bits;
wrapping their combined count without the appropriate premise is invalid.
Bitfield combination requires in-mask expected values and compatible overlap.
Conditions are checked at the exact source site. Branch facts stay inside the
whole source equality; they cannot escape to a sibling branch or later merge.

Authoring runs offline:

```sh
PYTHONPATH=knowledge:planner python3 -m producers.author_word_identities \
  --family v8 --library --compiler target/debug/ink \
  --output-store build/v8-authoring \
  --data knowledge/producers/data/v8-word-laws --seconds 15
```

Partial acquisitions preserve previously checked laws. The indexed frozen-library
mechanism separates lightweight pattern metadata from immutable, compressed proof
files. Discovery opens matching proofs only. Index/proof identities and pattern
metadata must agree, and the independent checker still admits every proof and
application. No checker limit was raised to accommodate this family. Arbitrary
packages containing too much proof data still fail the existing resource limits.

The existing generic semantic search consumes the producer through the knowledge
catalogue. No V8 matcher, target-specific rewrite or solver was added to core,
runtime or the backends. Search scores remain unmeasured hypotheses. A checked
alternative does not automatically replace the compiled baseline.

## Evidence and remaining work

Mandatory hardening includes frozen-library integrity, lazy proof loading,
partial-publication preservation, all admitted proofs replayed independently,
missing-condition and tampered-proof rejection, renamed program discovery,
source-identity binding and incorrect shift-mask rejection. Seeded value checks
exercise all proposal templates, including proposals without admitted proofs;
these examples do not substitute for proof.

`proved_refinement_parity` also replays word/conversion laws and literal loop expansions and exact scalar sharing on 154 requests, including
wrapping overflow, oversized counts, both branch directions and overlapping
bitfields. The shared harness compares original reference outcomes and exact
snapshots against generated native, JavaScript and Rust-Wasm execution. CPU
conformance does not establish a speedup or GPU execution coverage.

Evaluate generalization on the unchanged planning corpus, using private knowledge
publications and frozen compiler/producer sources. Record the funnel, failed
premises, shared law use and selection gates; distinguish measured speedups from
proof and conformance. A corpus with no matching word patterns is a useful
negative control, not evidence of broad application gains.

The completed first corpus run compiled all ten unchanged programs. Initial
sources had no direct V8 pattern matches, but generic planning subsequently
admitted `u32/branch_condition_value` for `ast-ancestor`. That program retained
the baseline after the measurement-budget gate. No new V8 law was observed in
multiple held-out programs. Both runs selected one alternative, on different
programs; their time-bounded shared-machine funnel differences are not speedup
evidence. See `bench/v8-learning/corpus-summary.json` for the exact frozen scope.

## Literal loop expansion

`producers.literal_loop_laws` proposes expansion for literal iteration counts
0 through 8 using the existing fixed `repeat` meaning and ordinary `Normalize`
proofs. The proposal bound limits code growth. There is no approximate trip-count
premise or new loop rule in the compiler. A single construction works for words,
lists and declared records, including callbacks capturing surrounding binders.
The normal source checker still enforces ownership, lexical binding and bounds.
Every admitted instance is source-bound before literal emission. Tests reject a
rehashed proof with an incorrect iteration index, retain the configured proposal
bound and compare compiled list/record/captured-callback results across CPU paths.
Profitability remains a separate planner gate.

The audit must continue through the remaining machine reducers, floating point,
branch threading, loop transforms, type/representation analysis, load/store
elimination, escape/allocation analysis, string handling, SIMD, feedback/tiering
and lowering infrastructure. Some mechanisms may already be supplied by Ink's
host Rust/JavaScript/Wasm compilers. Such delegation needs an explicit assessment;
it cannot be inferred from a passing scalar test. Runtime specialization needs
checked guards and exact fallback; speculative V8 observations alone cannot
create unconditional database laws.

## Exact repeated expressions

`producers.common_subexpressions` supplies bounded proposals for explicit sharing
of exact repeated pure scalar terms. Each callback scope is handled separately;
new binders shift surrounding references before replacing occurrences. The
proposal uses existing lambda/application syntax, which emits an ordinary lexical
binding. A whole-function `Normalize` certificate and normal source binding are
required. No hash, occurrence count or savings estimate grants proof authority.
Mutable state reads, allocation identity and alias epochs are not inferred from
V8's representation.

A repeated list-fold workload measured about 1.97 times lower complete JavaScript
call time after sharing. Three fresh Node processes used each of two disjoint
training/holdout input sets, with list lengths 256, 2,048 and 8,192. The existing
measurement adapter validates outcomes and unchanged inputs before and after
timing and consumes complete outputs. The retained source, proof packet, emitted
modules, workload packets and samples are in `bench/v8-learning/sharing`. This
result concerns that workload on Node 26.1.0 on the shared arm64 host; it does not
establish memory costs, other-backend gains or universal profitability.

The second ten-program corpus evaluation compiled all programs and admitted
alternatives; three were selected under existing gates. Only the earlier
`u32/branch_condition_value` word law was attributable to this V8 library, on
`ast-ancestor`; no literal-loop law was observed. All programs exhausted the
quick search budget. It used newer planner/knowledge inputs than the first pair
and cannot isolate their effects. See `bench/v8-learning/corpus-second-summary.json`.
