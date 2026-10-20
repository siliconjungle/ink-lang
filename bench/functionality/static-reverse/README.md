# Complete compiled reverse learning

The explicit compiled reverse requests evaluate the same 64-coordinate objective
and update as the original reverse requests. Only the request names differ between
`source.ink` and `baseline-source.ink`; `reproduce.py` checks this before running.
The preceding published compiler produced `baseline.mjs`. The candidate compiles
one complete bounded graph into scalar continuations, with shared primals,
ordered adjoints and liveness between blocks. Gradient and linearized interfaces
share a generated kernel.

These are opt-in authored requests. Original reverse calls keep their published
checked source images and checkpoints. Successful static elaboration changes the checked source image; existing
proof/checkpoint bindings must not be relabelled to bypass that boundary.
Unsupported shapes/control and optional resource exhaustion retain dynamic tapes.
See [the exact domain and API](../../../docs/static-reverse-tapes.md).

## Workload and controls

The model has eight eight-coordinate records. Its loss is the squared error of
an ordered sum of coordinate squares. Each update computes the full primal,
reverse gradient and new 64-coordinate weights, including public result ownership.
The logical tape has 193 nodes. Capacity 192 fails and 193 succeeds. A separate conformance case checks that
duplicate primal operations still consume distinct logical nodes. This is an independently
authored synthetic training workload, not a measurement of an external application.

The adapter checks 128 changing-weight updates against independent ordered F32
arithmetic, complete gradients and primals, exact capacity boundaries, and a tight
handwritten loop. Every timed batch consumes and compares its complete output.
The handwritten loop is a separate control; it does not stand in for a strong
neural library or establish upstream performance parity.

The unchanged engine policy uses three fresh processes per engine, at least
65,536 warmup calls, common calibrated batches, 15 alternating samples and an
independent byte-identical A/A control. Node 22.22.1, Node 26.1.0 and installed
Google Chrome are assessed separately. Setup, imports and verification remain
outside steady-state timing. Raw import costs and emitted bytes must be read
alongside throughput; they have no promotion budget. No frame-rate, production
server capacity, GPU training or universal speedup claim follows.

## Reproduction

Build the pinned distribution using its local Cargo entry point. On the owner
host this is the configured Cargo wrapper, which prepares exact pinned sources
without unpacking repository reports or knowledge. Keep untimed validation debug
and incremental output disabled. Use the absolute compiler artifact returned by
Cargo; do not assume the shared reuse target is `target/debug`.

Run `python3 bench/functionality/static-reverse/reproduce.py --compiler ...
--node22 ... --node26 ... --chrome ... --playwright ... --out ...`. The runner
compiles the candidate before measurement, binds all inputs/engines/producer bytes,
and fails on missing engines, regressions or inconclusive controls. Recheck its
receipt with `tools/engine-gate/gate.mjs --verify` before promotion. The required
CI engine job includes this corpus alongside the existing three regression floors.

The standalone `static_reverse` suite compares exact exceptional F32/F64 values
and logical capacity against dynamic tapes. A frozen prior-compiler identity
protects original F32/F64 reverse source images. A 2 MB-stack regression checks
60 helpers with 24 lexical bindings each and preserves the existing 64-call cutoff.
The `source_reverse` integration histories check complete results, events, failed
updates, restore and exact portable snapshots across native/JavaScript/Wasm and
both GPU hosts. Reverse execution remains on the CPU; eligible device dispatch is
measured separately. Normal checking and these tests do not prove the compiler.
