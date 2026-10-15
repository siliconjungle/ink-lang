# Ink versus Frontier, 15 October 2026

The fresh comparison remains mixed. Ink wins the query-heavy state and retained
immutable JSON-edit fixtures. Frontier wins ordinary/prepared updates and the
complete JSON text pipeline. This is compiled JavaScript execution on a shared
arm64 development host, not compiler wall time or an all-metrics victory.

Three fresh process cohorts (1001–1003) each ran nine rotated rounds. JSON lanes
received 200 warmup calls. All complete state replies, rollback, versions, events,
logical state and Ink portable snapshots passed. JSON ownership, full values,
exact rendered text and message round trips passed. Compiler, source, generated
modules, harness and installed Frontier implementation hashes were unchanged
before/after timing. `before-provenance.json` and `after-provenance.json` bind the
run; distribution main was `aa976eb0ac2ba469c35b527724982d48385888ed`, knowledge
`c85f59361f52d03779d4e8da1b2367f570d7483b`, and the compiler SHA-256 was
`141c44c50e2404e1d8b81a7ba961c630e747733167c49e1871e138a7089b0bd6`.
Frontier npm remains 0.1.9, state npm 0.1.1, and state main remains
`9ff840ea690e55fd8c064934f92a26c1603a63fa`. Engine 0.1.1 and codec 0.1.4
remain the installed comparison dependencies. Their compiled bytes and transitive
Frontier dependencies are hashed, independently of Git revision labels.

| Fixture | Ink | Frontier | Observed result |
| --- | ---: | ---: | --- |
| Ordinary row updates, 4096 rows | 2.326 µs | 0.669 µs | Frontier 3.48× faster |
| Prepared row updates, 4096 rows | 0.637 µs | 0.433 µs | Frontier 1.47× faster |
| Mixed state work, 4096 rows | 43.988 µs | 132.140 µs | Ink 3.00× faster |
| Read-heavy state work, 4096 rows | 135.006 µs | 377.240 µs | Ink 2.79× faster |
| Retained immutable known JSON edit, 512 fields | 3.088 µs | 72.761 µs | Ink 23.56× faster |
| Fully detached known JSON edit, 512 fields | 91.096 µs | 96.246 µs | Near tie; Ink median 1.06× faster |
| Text parse/edit/UTF-8 output, 512 fields | 507.621 µs | 111.188 µs | Frontier 4.57× faster |

Numbers are medians of per-process medians of complete public-call samples, not
individual-operation instruction costs. State mixes include queries, writes and
abort paths in their declared proportions. Prepared capture is outside timing for
both libraries. Setup is recorded separately; ordinary throughput setup uses
Ink puts and Frontier bulk initialization and must not rank startup.

The large retained-edit win permits unchanged subtrees to be shared and times the
API return after complete-value preflight. Detaching every output nearly removes
the advantage. The separate UTF-8 pipeline parses input text, edits, renders,
UTF-8 encodes and digests every output byte. Its slower result includes deferred
string flattening; the historical returned-string-length boundary is preserved
as a separate group. Different binary/message formats retain their separate
contracts and schema-negotiation requirements. Ink has no general arbitrary JSON
snapshot-diff equivalent here; Frontier-only discovery rows are controls.

The manually supplied, proof-checked indexed plan is also retained. Its read-heavy
fixture takes 4.681 µs versus Frontier's 377.240 µs (80.59× faster), while updates
cost 24.458 µs versus 0.669 µs (36.57× slower). It is not the default compilation
choice or a universal asymptotic/profitability claim.

Independent fresh-process lifecycle diagnostics still show higher retained heap:
about 3.245 MB versus 0.839 MB for live state, and 3.766 MB versus 0.791 MB for
32 owned JSON trees. Forced-GC deltas and peak RSS include runtime/harness effects
and are not allocation counts or statistical memory bounds. Exact owned backing
buffers for 32 documents are 727,904/179,840 bytes portable and 227,872/179,840
bytes agreed-schema (Ink/Frontier); these protocols have different observations
and framing contracts.

The earlier ordinary-update loss persists. The earlier small prepared-update
advantage does not hold in this fresh cohort. Old and new timing epochs are not
pooled, and these measurements do not isolate a causal effect of V8-derived laws.
Plain `ink build` emits the literal baseline; the indexed control is explicit.

## Reproduction and evidence

Preparation used the unchanged `bench/frontier-json/prepare.py`, with pinned
Python proof dependencies and read-only shared Frontier/package inputs. Source,
fixtures, emitted modules, checked indexed plan and preparation receipts are in
`artifacts/`. Gzip files contain exact original bytes. Raw reports are in `raw/`;
`cohort.json` retains every throughput lane/case and process range, while
`summary.json` derives the matched headline pairs and lifecycle results.

The exact acquisition script is `acquisition.py`. It was executed from the
repository root as `build/proof-python/bin/python build/run-frontier-current.py`.
Its retained bytes are identical. Timing ran serially after preparation and smoke
checks, with no concurrent compilation or other benchmark started by this task.
Other host activity was not stopped or reserved.

The script invokes these commands for each process 1001, 1002 and 1003:

```sh
node --expose-gc bench/frontier-json/run.mjs 1001 --javascript-only --fixture=replace-4096
node --expose-gc bench/frontier-json/run.mjs 1001 --javascript-only --fixture=mixed-4096
node --expose-gc bench/frontier-json/run.mjs 1001 --javascript-only --fixture=read-heavy-4096
node --expose-gc bench/frontier-json/json-kernels.mjs 1001 --warmup-calls=200
node --expose-gc bench/frontier-json/lifecycle-compare.mjs 1001 --ink-module=build/frontier-json/ink.mjs
```

Use new process IDs for a new run: existing report paths refuse overwrites. The
historical output directory name `reports/frontier-json-2026-10-13` is retained by
the harness; the captured timestamps identify this new 15 October cohort.
`bench/frontier-json/README.md` lists toolchain/package/control preparation.

Two benchmark-only changes are recorded: JS-only JSON/lifecycle provenance no
longer requires an unused native executable, and JSON text now has an additional
full UTF-8 output consumer. No compiler, source algorithm or Frontier code was
changed to obtain these results.
