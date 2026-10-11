# Generic language foundations

The implementation and limits are specified in
[the scope document](../../docs/generic-language-foundations.md). Algorithms and
canonical laws are in the independently pinned knowledge package. No source label,
backend pattern, profile or content hash grants replacement authority.

Validation uses standalone core tests, adversarial proof/contract checks, imported
templates, canonical law publication/replay and database-selected compiled programs.
The new fixtures compare reference values, Result errors, events and exact portable
snapshots with C, Rust, JavaScript, C-Wasm and Rust-Wasm. Native GPU host execution
checks eligible device work and explicit compiled CPU fallback. The broader GPU
gaps stay in the enforced inventory; host fallback does not establish WGSL support.

Run with the repository's installed cross compiler and GPU adapter:

```sh
CARGO_PROFILE_DEV_DEBUG=0 CARGO_INCREMENTAL=0 cargo test --manifest-path core/Cargo.toml --offline
INK_PARITY_REQUIRE_ALL=1 INK_TEST_ZIG=/path/to/zig INK_TEST_WGPU=1 cargo test --offline --test language_foundations --test generic_libraries --test literal_collection_optimisation --test law_author --test modules --test semantic_optimisation --test action_optimisation
python3 tools/check_feature_parity.py --scope contract
```

The finite-list selection fixture independently checks every law, rejects rehashed
false statements and replays a selected programme across the complete CPU targets.
It exercises elimination of unused list element computation and exact count/
cancellation rewrites with integers exceeding 64 bits. These are conformance and
proof-admission results, not timing measurements or a general speedup claim.

The ownership follow-up checks scoped disjoint ranges, growth, nested partitions,
compaction, out-of-range writes and empty/full partitions across CPU targets.
Native clone counters and allocation pointers establish zero element clones and
reuse of the original allocation for a split/rejoin without resizing. JavaScript
checks the same backing-array identity. These mechanism checks do not establish a
complete-workload timing improvement.
