# Generic indexed and grouped validation

The final published producer was revalidated and measured separately in
[`current/`](current/README.md). The samples below retain their original
acquisition identities.

The admitted fixture contains nested serializable row types, String, nominal IDs,
exact Int, word/floating vectors, compound predicates, parameterized queries, two
tables, all four replace/remove pairs, intermediate reads, events and rollback.
`backend-checks.json` records 410 history steps with exact replies/errors, portable
snapshots and outboxes on all seven host lanes. Both complete packages pass the
ordinary checker. Three freshly rehashed corruptions (second key, event, cached
summary) fail mathematical admission. Core checks include exact borrowed/generic
canonical bytes and hashes, float rejection and nesting boundaries.

The JavaScript benchmark uses 1024 rows, 96 calls, five alternating rounds and
separate warm-up states. Replies and snapshots agree across ordinary, indexed
and grouped programs. Medians in this shared-host sample show cached weighted
and label queries about 150x and 125x faster than ordinary evaluation for the
ungrouped indexed candidate. Grouping improves three write patterns relative to
the indexed candidate (about 8–20%) and slows remove/replace by about 5%.
Both physical candidates lose to ordinary Map writes. Dynamic,
owner-parameterized and floating queries keep exact evaluation and are slower
in the physical candidate. These are workload-specific samples, not a universal
batching speed claim. Peak memory was not measured.

The cold automatic planner integration generates both candidates without a local
proof cache or SAT installation, checks them, retains the baseline when evidence
is missing, selects grouped/indexed/baseline with synthetic lifecycle costs,
replays through actual emission and rejects stale target evidence. Synthetic
policy costs are not performance measurements. Real speed samples remain in
`javascript.json` with the acquisition manifest in `provenance.json`.
`select-benchmark.py` imports those real samples through the existing selector:
warm writes and dynamic reads retain ordinary code, cached reads including setup
and clean teardown select indexed code, and warm paired erases from an indexed
baseline select grouped code. Offline proof/search/compiler costs, dirty teardown
and memory are unpriced; no live migration is claimed. Archived samples retain
their original compiler bindings under `historical/`.

Reproduce from the pinned distribution:

```sh
cargo build --release --bin ink
PYTHONPATH=knowledge:planner python3 planner/tests/automatic_candidates_integration.py target/release/ink planner/tests/fixtures/generic-batching.ink
PYTHONPATH=knowledge INK_COMPILER=target/release/ink python3 -m unittest discover -s knowledge/tests -p test_generic_indexed.py
INK_TEST_ZIG=/absolute/path/to/zig INK_PARITY_REQUIRE_ALL=1 cargo test --test representation_parity generic_indexed_products_and_grouped_actions_preserve_all_targets
```

Generate both packages with `ink emit-action-model`, then
`python3 -m producers.generic_indexed MODEL.json -o GROUPED/request.json` and the
same command with a separate output directory and `--no-batching`. Every emitted
program rechecks the package. Emit ordinary JavaScript with `ink build --target
javascript`; emit each physical package with `ink emit-representation --target
javascript`. Run `node --expose-gc bench.mjs ORDINARY.mjs INDEXED.mjs GROUPED.mjs
OUTPUT.json`. The compiler-only declaration index and borrowed canonical encoding
preserve generated program bytes and hash protocols; they remove repeated proof
processing without changing execution algorithms.
