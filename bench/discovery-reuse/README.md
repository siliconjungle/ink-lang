# Discovery reuse and traversal elimination

Run from the distribution checkout:

```sh
python3 bench/discovery-reuse/run.py
python3 bench/discovery-reuse/traversals.py
python3 bench/discovery-reuse/report.py
```

`run.py` retrieves the previous knowledge implementation from the exact Git
revision recorded in the report. It compares four interleaved lanes: previous
head matching and instantiation; structural matching alone; instance/adapter/site
reuse alone; both improvements. The compiler and catalogue stay fixed. Every
lane must emit byte-identical canonical law objects. Generated laws additionally
replay through the kernel. Timings include full catalogue discovery and
instantiation, excluding process startup and compiler execution. Seven samples
per cell are retained. Python traced peak allocations are measured in an extra,
untimed invocation, not presented as process RSS.

The 12-function corpus is the existing typed proof-growth fixture. Larger modules
repeat those same functions four and sixteen times while retaining helper names;
this is controlled reuse/module growth, not new unseen source programs.

The separate same-head experiment uses 32/128/256 valid identity-map patterns
whose bodies contain different constant equality/choose expressions. All patterns
match exactly one typed site. This measures matching plus index construction;
it excludes database reads, proof generation and checking. Those variants are
stress fixtures, not additional optimization families. Equivalent instances were
admitted in the previous composable-knowledge experiment. This experiment checks
identical ordered match sets, including inferred type bindings.

`traversals.py` instantiates six new universal families, builds a forced checked
plan and compares complete trusted JavaScript calls with the original emitted
program. Input construction is outside timing; outputs are consumed, values
checked and input immutability checked. Empty inputs remain visible. The kernels
are designed to exercise the new laws; automatic planner profitability selection
and held-out generalisation are not established by these measurements.

The root `composable_knowledge` test independently compares original and selected
reference values and executes C/Rust/JavaScript/both-Wasm parity, including empty
inputs, strings and maximum-width integers. The existing imported-algorithm test
also exercises 24 actual GPU calls after the discovery change.

The measurements run on a shared developer machine. Interleaved samples and
fixed-cell bootstrap intervals describe sample variability, not an unseen-program
population. The raw samples and fingerprints are committed with the report.

`native.py` additionally builds original/selected Rust and Rust-Wasm modules:

```sh
python3 bench/discovery-reuse/native.py
python3 bench/discovery-reuse/report.py
```

These samples charge the complete JSON call, including input validation and
conversion plus full output serialization and consumption. Inputs are resident
inside the native/Wasm host, and their setup is measured separately. Native uses
fresh processes with warm calls and seven interleaved samples; Wasm uses the same
emitted functions in a persistent instance. Backend ratios compare that backend's
original and selected programs. These are different contracts from trusted JS;
they cannot support direct comparisons of backend speed.

The additional `bounded-read` discovery lane isolates descriptor-sized canonical
file reads. The original reader requests the 128 MB transport ceiling even for a
tiny proof. New reads allocate from the opened descriptor's size, retain the byte
ceiling and reject growth instead of silently accepting a truncated prefix.
All other lanes retain the original reader, except combined. This separates
memory improvements from proof-instance reuse and structural matching.
