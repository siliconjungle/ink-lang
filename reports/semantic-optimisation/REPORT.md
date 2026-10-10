# Composable semantic optimisation validation

The shared typed checker admits database laws and their conditions, then replays
applications against the exact original module. External search traverses nested
expressions and explores compositions. No example optimisation pattern lives in
the compiler or matcher.

The full distribution passes 167 tests; the standalone offline core passes 11.
The 17 focused semantic tests cover universal natural/list induction, arbitrary
loop counts and increments, wrapping overflow, nested rule composition, rules
under binders, supporting lemmas for conditions, actual branch assumptions,
capture rejection, exact source-context/content pins, unsupported operations,
float reassociation/bit-equality rejection, every current pure expression form,
proved route emission and selection, invalid route rejection, and stateful event
outcomes after pure-helper optimisation. Two existing external routing-tool tests
also pass. C, Rust and GPU packages resolve/build against separately pinned core
revisions without distribution patches.

`composed.ink` initially has two maps and a ten-step repeated-add loop. Six checked
applications select one map whose element is `x * 3 + 10`. `selected.wgsl` shows the
resulting single GPU dispatch without the repeat loop. All 42 example catalogue
laws check in the exact program context. No fixed-count or triple-add recogniser
was added to the compiler.

The generated program was executed through compiled native C, native wgpu and
its compiled WebAssembly fallback in Node's WebAssembly engine. Each backend
passed empty, overflow/boundary and 1025-element inputs against the independent
wrapping integer oracle `(3*x + 10) mod 2^32`. Both nonempty GPU calls dispatched
on the actual adapter; the empty GPU call required no dispatch. Browser WebGPU
execution was not repeated for this milestone. The shader is shared WGSL, but
this evidence directly establishes the native wgpu and Wasm paths only.

Reproduction from the pinned distribution:

```sh
cargo test
cargo test --manifest-path core/Cargo.toml --offline
cargo test --test semantic_optimisation --test source_routing_tools
cargo build --bin ink
./target/debug/ink build reports/semantic-optimisation/composed.ink \
  --optimise knowledge/semantic/catalogue.json --target webgpu \
  --zig /path/to/zig -o build/semantic-composition
cargo run --manifest-path build/semantic-composition/native/Cargo.toml -- \
  compute arguments.json --backend gpu
```

Supply an argument document such as `[[0,1,4294967295,2147483648]]`; expect
`[10,13,7,2147483658]`. Repeat with `--backend cpu` to exercise compiled C.
`metadata.json` records exact input/selected identities and emitted artifact hashes.

Search cost is a structural estimate, not measured runtime. CPU/GPU placement is
a separate host profitability decision. These are total pure-value proofs;
allocation/fuel/failure traces, generated-instruction correctness, direct stateful
rewrites, snapshot migration and compute-v2 mixed-route transport remain outside
this milestone. See `docs/semantic-optimisation.md` for the trust boundary and
bounded search/catalogue scope.
