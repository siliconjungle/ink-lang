# Authenticated knowledge export

`Store.bundle` now uses one SQLite connection and read transaction per indexed
export. It retains authenticated witnesses during dependency traversal and
verifies identical membership proof bytes once within that call. Every requested
ID must still occur in the authenticated leaf, and every object is read,
validated and canonically hashed. Later indexed exports repeat those checks.

Previously, each entry opened a connection and verified membership while loading
its object, then did both again to construct the output witnesses. A real
85-entry representation bundle therefore opened 170 connections; it now opens
one. Canonical output bytes, mathematical snapshot and core admission are unchanged.

Three standalone process trials measured complete export:

| Bundle | Entries in closure | Previous median | New median | Speedup |
| --- | ---: | ---: | ---: | ---: |
| Synthetic graph, 32 leaves | 34 | 17.669 ms | 2.744 ms | 6.44× |
| Synthetic graph, 256 leaves | 259 | 185.757 ms | 20.800 ms | 8.93× |
| Synthetic graph, 768 leaves | 775 | 581.085 ms | 66.748 ms | 8.71× |
| Compact-query representation | 85 | 97.774 ms | 45.009 ms | 2.17× |

Each median combines 27 samples across three processes. Nine rounds alternate
implementation order; each sample averages three exports after nine warmup
exports per implementation. Fresh Store instances use indexed subset lookup
throughout, with no preloaded full tree. Both implementations produce byte-identical
canonical bundles, and bundle hashes agree across all trials.

Timing includes SQLite connection setup, dependency traversal, membership proof
authentication, object reads, schema validation and canonical object hashing.
Store construction, fixture/index creation, final bundle serialization and
Rust mathematical admission are outside timing. The fixtures are warm from
validation and previous calls. Cold disk/network latency, concurrent writers,
ingestion throughput, peak memory and Ink action execution are unmeasured.
The shared Apple M2 desktop had uncontrolled background activity; benchmark
processes ran sequentially after compilation and tests finished.

Synthetic graphs contain canonical store fixtures with shared dependencies,
not mathematical language implementations. The real case exports representation
`5b5f097d999cd17946d829fa7737ac5806f95893e091f188cf1613d92fdbf4e5`
from the unchanged 848-entry snapshot
`87357b19d8fdbe5832da67dd58d1fa1a1d35220efb264319708935fe9eb7defa`.
A separately exported real request passes all 14 source-representation obligations
in the existing Rust checker.

`baseline-store.py` and `index.sql` preserve the exact previous knowledge commit
`3d2c8379c6939b8a3a2247fb3080a89bd4563463`. `driver.py` reproduces synthetic
graphs in a temporary directory and uses a separate temporary index for the real
pinned store, without modifying its canonical files or current index. Raw trials
and input hashes are retained alongside this document:

```sh
python3 reports/knowledge-export-performance/driver.py /tmp/export-trial.json
```

Four new tests verify one connection, one shared-leaf authentication, exact
indexed/index-free output, object reads only within the selected closure,
rechecking after index/content tampering, rejection of an unlisted entry borrowing
a valid cached leaf, consistent reads during concurrent WAL index changes,
connection cleanup on failure and unchanged depth/1024-object limits. All 14
knowledge-store/producer tests and 18 representation integration tests pass;
four manual timing tests remain intentionally ignored.

This change improves database bundle assembly. It adds no source syntax, proof
rule, canonical entry, persistent indexed authentication cache or backend change.
