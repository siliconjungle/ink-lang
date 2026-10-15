# Prepared binary64 geometry baseline

This report retains the first source port of Pretext's **simple** prepared line
walkers. It is not completion of Pretext, general automatic staging or the speed
requirement. Complex breaks reject; segmentation, shaping and font measurements
are external facts, not verified by these walkers.

`source.capture.json` retains both exact Ink inputs, `source.core.json` their
checked binary64 module, and `current.mjs` its JavaScript output. Core identity:
`02416168b8726d91f7597110730e4dc1736b8709a6e1cf44bd7b74000999e30d`.
The implementation uses ordinary source algorithms, not compiler matchers or new
rewrite authority. `pretext-LICENSE.txt` retains upstream notices for the port.

## Conformance

The generator in `bench/prepared-text` executes unmodified Pretext revision
`0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8`, with source hashes retained in
`oracle.json`. Its 232 synthetic prepared-data cases compare complete counts,
heights, summary widths and line widths/cursors against the independent Ink
reference. Typed comparison preserves raw F64 bits. This is not browser accuracy
or proof of the source port, checker, translation or backends.

`validation.log` records all three mandatory tests passing. `script.json` and
`expected.json` retain the 182-observation history: Rust, JavaScript, Wasm and the
native GPU host compare values/errors/events, edits, failed-install rollback and
portable restoration. CPU targets compare every checkpoint; the GPU host compares
its exact final checkpoint. `gpu-receipts.json` requires one real dispatch for a
separate F32 kernel. F64 layout executes on CPU hosts.

## Diagnostic performance

One fresh Node process compares complete count results for 8/64/512 segments and
16 changing widths. Result materialization is included; capture and token setup
are separate. Raw samples, cold calls, setup costs and source hashes are retained
in `diagnostic.json`; both before/after authoring artifacts are retained. This
compares two authoring versions, not an isolated compiler change.

| Segments | Pretext direct median | Ink prepared median, current |
| --- | ---: | ---: |
| 8 | 348 ns | 2,398 ns |
| 64 | 158 ns | 4,345 ns |
| 512 | 811 ns | 16,581 ns |

These short diagnostic samples are insufficient for a portable ranking or precise
speedup claim. They do establish a large remaining gap on this machine. Moving
validation into `requires` did not consistently improve calls. No automatic plan
selection, full lifecycle break-even, memory improvement or upstream parity is
claimed. Further execution-overhead work and the complete complex/preparation
pipeline remain required; correctness alone does not finish this programme.

Run `python3 reports/prepared-text-2026-10-16/audit.py` for local binding checks.
Reproduction and required-target commands are in `bench/prepared-text/README.md`.
