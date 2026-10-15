# Smaller literal JavaScript bindings

The emitter reuses immutable locals and nonrecursive parameters instead of
emitting another const alias for each use. Mutable loop fields, recursive
parameters and branch slots retain snapshots. Field reads, calls, argument order,
arithmetic and public ownership boundaries are unchanged. No source syntax,
database equation or profitability authority changes.

JavaScript main is `104cdb3a84442e75746c88e1bdc885f2e0a424ce`; GPU bundles pin
it at `6097687bc5af56258fb7f28d194bf4a641301fa9`, and runtime main pins both at
`6d96ebcadf6e7e10c7101b0ad66ffa00502a08ca`. Each standalone graph resolves the
same `dfb9ae5ea9e31e36b6b566c45eb9ba6ed2f5c010` core package. Core is unchanged.

## Generated size

Each pair uses identical checked-core bytes from the earlier
[callback study](../prepared-loops-2026-10-16). Text compares with the
[finite literal artifact](../binary64-literals-2026-10-16/current.mjs);
collection/neural controls use the callback study's current artifacts. Subsequent
source-reverse package updates change no emission for these non-AD inputs.

| Complete module | Previous bytes | Current bytes | Reduction |
| --- | ---: | ---: | ---: |
| Binary64 prepared text | 585,283 | 572,856 | 2.12% |
| 244-parameter neural model | 873,903 | 848,138 | 2.95% |
| Prepared collection workloads | 169,422 | 168,509 | 0.54% |

These are emitted UTF-8 byte counts including shared support, not measurements of
allocation, retained memory, startup or execution speed.

## Performance diagnostics

Node 25.3 / Apple M4 Pro. Three fresh text processes use the existing runner:
nine samples of 32 complete counts, rotating lane order, all sixteen widths
checked against pinned Pretext after each batch. Capture/token setup and first
calls are separate. Times below are medians of process medians in ns/call; paired
gains are medians of process-pair ratios. Ordinary lanes remain in raw files.

| Segments | Previous prepared | Current prepared | Pretext | Paired gain |
| --- | ---: | ---: | ---: | ---: |
| 8 | 3,710 | 3,801 | 99 | 0.939× |
| 64 | 5,931 | 5,922 | 262 | 1.004× |
| 512 | 9,669 | 9,211 | 775 | 1.048× |

Small inputs regress and the large case still loses substantially to Pretext.
This short synthetic diagnostic does not establish held-out font/layout fidelity
or a general gain. One further collection process checks complete membership,
grouped aggregate and coefficient outputs. One isolated process per neural
artifact checks four outputs or loss/four outputs/all 244 gradients against
independent graph, dense and actual Handwired controls. Their seeds/corpora agree.
These exploratory timings also contain wins and losses; they establish neither
held-out rankings nor whole-training, optimizer, device-training or memory gains.

Carrier-check skipping, broader record splitting and loop-helper expansion were
explored and discarded. None is part of this release. The remaining change only
removes redundant immutable binding instructions.

## Validation and remaining work

The standalone JavaScript suite passes 51 tests, including 2,160 new exact-bit
cases through checked, trusted, compiled and prepared calls. Cases cover
shadowing, branch selection, arithmetic, NaN payloads, signed zero, iteration,
simultaneous swaps and changing recursive parameters. Inputs remain unchanged.
Standalone GPU/runtime suites pass 10/8 tests. Full required-target reruns pass
three prepared-text, four binary64 and two source-reverse tests: complete values,
errors, ordered events and snapshots agree, with five actual eligible GPU calls.
Both source-reverse histories also replay through browser JS/Rust-Wasm/WebGPU.
CPU tape execution is separate from the eligible device kernels.

Tests do not prove the emitter, checker, toolchain or driver. Full complex Pretext
preparation/layout, general fact consumers, frozen specialization, device training
and all three-project performance acceptance remain open.

```sh
ink build reports/prepared-loops-2026-10-16/text.core.json --core --target javascript -o build/text.mjs
node bench/prepared-text/measure.mjs reports/binary64-literals-2026-10-16/current.mjs build/text.mjs build/prepared-text-oracle/upstream/line-break.js build/text.json
python3 reports/immutable-bindings-2026-10-16/audit.py
```

The ledger binds retained bytes and observation coverage. It neither authenticates
timing records nor supplies proof or automatic selection authority.
