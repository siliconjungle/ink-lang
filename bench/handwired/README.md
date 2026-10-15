# Matched Handwired workloads

This first experiment measures complete, non-overlapping ASCII literal counts on
100,000 of Handwired's generated documents. It is not a general regex, JSON
parsing or neural-training comparison. Both GPU implementations retain their
inputs; each measured search includes parameter construction/upload, dispatch,
count readback and consumption of every output. See the retained
[report](../../reports/handwired-packed-circuits-2026-10-15/README.md).

## Prepare

Use a separate Handwired checkout at
`09f23d276d3b9284cea4eec61ffd934950cc979e`, Node 22.22+, Python 3, the built Ink
compiler and the configured Rust/Wasm toolchain. The preparation script refuses
tracked changes in that checkout, then creates its own `ink-benchmark` directory.
It does not copy or vendor Handwired's implementation into Ink.

From the Ink distribution root:

```sh
cargo build --bin ink
python3 bench/handwired/prepare.py \
  --handwired /absolute/path/to/handwired \
  --compiler target/debug/ink --output build/handwired
node build/handwired/collect.mjs
```

In a second terminal, serve the Handwired checkout with Vite **8.3.4** on
`127.0.0.1:4324`, e.g. using a pinned existing Vite executable, or
`npx --yes vite@8.3.4 --host 127.0.0.1 --port 4324 --strictPort` from that checkout.
Visit `http://127.0.0.1:4324/ink-benchmark/` and click **Run matched comparison**.
The local collector writes exact raw receipts into `build/handwired/receipts`.
Nothing is sent to an external service.

Preparation records the compiler binary, distribution revision, tracked diff
digest and served asset hashes in `build-info.json`, which accompanies each new
receipt. The historical report retains its exact measured harness separately;
the current reproducer adds provenance outside the timed intervals.

Reload and repeat three times, then repeat with `?seed=20261015`. Include
`?count=100` and `?count=10000` controls. Use one run at a time, keep CPU/GPU
background work idle, and record hardware, browser, limits and revisions. A page
reload is not a fresh browser process. Warm blocks and requests after a requested
250 ms pause are separate observations. To claim cold-browser performance, use
fresh browser processes and retain those measurements separately.

The baseline JS fixture is literal emission from Ink `ede1da12`; preparation
emits the current candidate from the same `literal-search.ink` source. The direct
hot functions changed only in UTF-8 helpers and byte-length calls in the retained
experiment; newer unused prepared-call exports are outside the timed path.

## Native control

```sh
node bench/handwired/generate-workload.mjs \
  /absolute/path/to/handwired build/handwired/workload.json
cargo build --release --manifest-path build/handwired/native-harness/Cargo.toml
build/handwired/native-harness/target/release/ink-handwired-literal-comparison \
  build/handwired/workload.json
```

Repeat in three fresh processes and also generate seed `20261015`. Native Ink's
typed API consumes owned strings, including caller cloning in this benchmark;
the handwritten Rust control borrows strings and reuses its searcher per text.
Those are explicit different input ownership boundaries. Both return and consume
all counts, checked against an independent native JavaScript RegExp oracle.
Do not infer a compiler-only speed ratio from them.

## Audit the retained report

```sh
python3 bench/handwired/analyse.py \
  reports/handwired-packed-circuits-2026-10-15 --check
python3 tools/check_bit_circuit_laws.py --receipt build/bit-circuit-replay.json
```

The first command checks sample counts, corpus hashes, complete lane coverage,
answer agreement, receipt bytes and derived medians. The second independently
replays the stored scalar proof components and rejects damaged proofs. Neither
command establishes whole-compiler correctness or reruns a GPU benchmark.
