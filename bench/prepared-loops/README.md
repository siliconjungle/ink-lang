# Preparation through sequential callbacks

`workloads.ink` covers membership, grouped aggregates and a prepared numeric
coefficient table. Every observation is complete; empty, singleton and 32-item
requests share fixed captured inputs. The old and new JavaScript artifacts must
come from the **same checked core bytes**. `previous-emitter` binds the old emitter
and core package by immutable Git revisions and a tracked lock.

```
ink emit-core bench/prepared-loops/workloads.ink -o build/loops.core.json
cargo run --locked --manifest-path bench/prepared-loops/previous-emitter/Cargo.toml \
  -- build/loops.core.json build/loops-before.mjs
ink build build/loops.core.json --core --target javascript -o build/loops-current.mjs
node bench/prepared-loops/run.mjs build/loops-before.mjs build/loops-current.mjs OUTPUT.json SEED
```

The retained study uses three independent processes for development seed 73129
and three for holdout seed 99277. Each process times ordinary and prepared calls
from both artifacts, plus strong direct prepared controls. Input capture, token
setup and the first zero/one/many observations are separate; output materialization
is timed. Direct controls charge their own table construction separately. Raw
samples and full-output checks are retained. No timing grants selection authority.

Run `memory.mjs ARTIFACT OUTPUT.json` with `node --expose-gc` in separate processes.
Its zero/one/many and 100-call forced-GC phases retain three tokens. Heap/RSS are
process observations, not allocation counts or certified bounds.

The study also reuses `bench/prepared-helpers/run.mjs` for complete neural outputs,
loss and 244 gradients against direct graph, dense and Handwired controls, and
`bench/prepared-text/measure.mjs` for the binary64 layout counter. Retain regressions
alongside wins. See `reports/prepared-loops-2026-10-16` for exact artifacts, source
identities, receipts, logs, raw samples and the bounded audit.
