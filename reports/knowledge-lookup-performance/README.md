# Knowledge cost lookup

Requested plans are now filtered in SQL before applying `limit`, and the
observation index includes the result ID for a covering lookup. Previously, the
query fetched and validated evidence for every plan sharing a program, target
and workload, then discarded unrelated plans. With a result budget, unrelated
records could also hide requested evidence entirely.

Three standalone trials of the complete `Store.observations` API produced:

| Catalog observations | Selected records | Previous median | New median | Speedup |
| ---: | ---: | ---: | ---: | ---: |
| 512 | 8 | 42.436 ms | 0.845 ms | 50.24× |
| 1,024 | 16 | 84.662 ms | 1.486 ms | 56.98× |

Each cell is the median of 27 samples across three processes. Every sample
averages three calls; nine rounds alternate implementation order, after three
warmup calls each. Both implementations return the same complete canonical
records. The corpus has 64 candidate plans with one requested plan, identical
program/target/workload and distinct deterministic samples. This is a synthetic
cost-discovery benchmark, not measured Ink action execution or representation
selection. No automatic selection is added.

Timing includes opening SQLite, querying IDs, opening evidence files, schema
validation, canonical hashing and comparability checks. Corpus generation,
observation ingestion and index rebuild are outside timing. Files are warm from
validation and prior calls; cold disk/network, ingestion throughput, peak memory,
concurrent writers and large-catalog production performance are unmeasured.
The Apple M2 desktop was shared and background activity was uncontrolled.

`baseline-store.py` and `index.sql` preserve the exact previous knowledge commit
`61f87e6f4893b15a5f6ed0cb12c689a623cf7775`. `driver.py` deterministically
recreates the corpus in a temporary directory and checks equal outputs before
timing. The new implementation uses `knowledge/ink_knowledge/store.py` and its
schema. Raw samples and hashes are archived alongside this document:

```sh
python3 reports/knowledge-lookup-performance/driver.py /tmp/lookup-trial.json
```

Tests separately cover the correctness case where the requested record sorts
after unrelated records and `limit=1`, multi-plan deterministic limits, zero
budgets, index rebuild, old-index compatibility, covering-index use and forged
index/content rejection. New indexes avoid reading unrelated canonical files.
Existing disposable indexes remain usable; rebuild them to gain index coverage.

State-reusing migration bridges in `knowledge/research/layout-switch` are a
separate improvement informed by the query profiles. They avoid encoding and
cached-query recomputation when switching compatible implementations, retaining
runtime logical validation. An encoder counter establishes avoided work; no
migration-latency measurement or constant-time claim accompanies these bridges.
No source syntax, mathematical checker, backend or snapshot wire format changed.
