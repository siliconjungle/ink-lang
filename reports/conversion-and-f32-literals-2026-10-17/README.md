# Bounded conversion repair and exact JavaScript F32 literals

The previous distribution's CI exposed a regression in speculative conversion:
the existing eight-operation frozen-program action proof exhausted the unchanged
work budget. All four captured failing jobs reach that same proof. The new
conversion path first checks whether an unfolded term can have the target's
outer syntax. It avoids substituting expensive arguments when the outer symbols
cannot match, then uses the existing reducer and alpha comparison. Variable-root
bodies retain substitution because their head can change. No proof rule, cached
verdict, theorem whitelist or resource-limit increase is introduced.

The exact failed action equation is retained as an ordinary authenticated bundle.
It fails with core `c13434d` and passes with `feaec2d`; removing its frozen-state
premise still rejects. All 488 standalone core tests pass across 81 integration
targets, library and doctests; examples build. The private receipt binds 228
files. The complete legacy first-order research-object hardening test also
passes. The existing frozen-program integration test matches 144 outcomes and
exact snapshots across reference, native Rust, JavaScript and Rust-Wasm. These
are finite implementation checks; GPU coverage awaits the distribution CI run.
The retained CI snapshot records the previous failing run, not a green release.

Combining the larger projected Buffer graph with frozen unrolling still exhausts
proof resources. Its negative log remains here. The repair restores existing
coverage; it does not claim general graph compilation is complete.

## Literal emission

Pure JavaScript modules now emit finite F32 constants as their exact binary64
embedding, avoiding a raw-bit conversion on every evaluation. Formatting the F32
directly would be incorrect: the shortest F32 decimal may parse as a different
JavaScript Number. Nonfinite constants keep explicit bit constructors, preserving
NaN payloads. Stateful raw-bit carriers and arithmetic rounding remain unchanged.
There is no new syntax or numerical approximation.

All 44 JavaScript integration targets, library and doctests pass against the new
standalone core. The dedicated test covers 4,265 constant bit patterns, both
carriers, ordinary/compiled/prepared calls, state queries and detached public NaN
wrappers. The retained full-suite receipt fingerprints the exact source,
manifest and lockfile. A previous monolithic test attempt ran out of disk while
linking; bounded batches subsequently passed every target. Both logs are kept.

A fresh normal Cargo build using the published JavaScript and core Git revisions
reproduces the measured `after.mjs` byte for byte. `emitter/` retains that small
tool, its manifest and genuine Cargo lockfile; `manifest.json` separates its
pins from the historical baseline. Reproduce from the repository root with:

```sh
python3 -c "import gzip,pathlib; pathlib.Path('/tmp/bench.core.json').write_bytes(gzip.decompress(pathlib.Path('reports/conversion-and-f32-literals-2026-10-17/literals/bench.core.json.gz').read_bytes()))"
cargo run --manifest-path reports/conversion-and-f32-literals-2026-10-17/emitter/Cargo.toml --locked -- \
  /tmp/bench.core.json /tmp/after.mjs --core
```

The source imports the pinned knowledge `std:learning`
library; the retained checked core contains its complete executable definitions.

## Measurements and limits

Node v22.22.1; six alternating fresh-process pairs. Every output is consumed;
checksums and the complete final Adam state agree within every pair. Import time,
module size, all raw samples and the unmodified F64 control are retained.

| Workload | Median before/after elapsed-time ratio |
| --- | ---: |
| Affine map, 1 value | 1.015× |
| Affine map, 32 values | 1.011× |
| Affine map, 512 values | 1.005× |
| Adam update, 244 parameters | 1.068× |
| F64 control, unchanged computation | 0.989× |

The small map differences are within the scale of the control's variation.
The Adam result is about 7% higher update throughput in this local experiment;
it is not end-to-end training, differentiation or whole-application performance.
The measured module shrinks from 217,765 to 216,838 bytes. Some individual finite
literal spellings can grow. This does not establish a universal speedup, a direct
Handwired comparison or a profitable automatic plan.

`literals/clean/` supplies the completed comparison. The earlier samples under
`literals/contended/` ran concurrently with a test build and are diagnostic only;
the first clean attempt also has a retained driver error. No completed clean
samples were discarded. `literals/paired.py` reruns six pairs with output paths
chosen by the caller. Compilation, peak memory, browser/device execution and
lifecycle profitability remain unmeasured here.

Run `python3 reports/conversion-and-f32-literals-2026-10-17/audit.py` to verify
retained hashes, validation logs, complete paired results and reported ratios.
Run the standalone core and JavaScript suites to execute their regression tests;
the audit is evidence consistency checking, not a proof of compiler correctness.
