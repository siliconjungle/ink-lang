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
There are 56 admitted U32/U64 laws. Four additional variable-count combination
proposals exhausted the initial proof budget and remain unadmitted. This says
nothing about whether those equalities are false.

Every law is a normal `ink-conditional-laws-v1` object with a hinted-RUP
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

`proved_refinement_parity` also replays six database laws on 117 requests, including
wrapping overflow, oversized counts, both branch directions and overlapping
bitfields. The shared harness compares original reference outcomes and exact
snapshots against generated native, JavaScript and Rust-Wasm execution. CPU
conformance does not establish a speedup or GPU execution coverage.

Evaluate generalization on the unchanged planning corpus, using private knowledge
publications and frozen compiler/producer sources. Record the funnel, failed
premises, shared law use and selection gates; distinguish measured speedups from
proof and conformance. A corpus with no matching word patterns is a useful
negative control, not evidence of broad application gains.

The audit must continue through the remaining machine reducers, floating point,
branch threading, loop transforms, type/representation analysis, load/store
elimination, escape/allocation analysis, string handling, SIMD, feedback/tiering
and lowering infrastructure. Some mechanisms may already be supplied by Ink's
host Rust/JavaScript/Wasm compilers. Such delegation needs an explicit assessment;
it cannot be inferred from a passing scalar test. Runtime specialization needs
checked guards and exact fallback; speculative V8 observations alone cannot
create unconditional database laws.
