# Balanced computation with live weights

This acquisition compiles 32- and 128-operation frozen programs through typed
helper extensions and complete action proofs. The source/pin ledger is
`metadata.json`. It extends the earlier eight-operation study; it is not a new
Handwired comparison or general neural-graph compilation result.

The knowledge producer emits at most eight operations in each leaf and combines
leaves in a balanced tree. The cases use 7/31 helpers with maximum helper depths
3/5. Ordinary cons/prefix lemmas preserve the exact order of the original fold;
complete action equations preserve live weight updates, failed transactions,
ordered events and the original portable checkpoint namespace. No learned score,
fingerprint, helper name or database membership grants equality authority.

An earlier linear chain passed the CLI's proof check but overflowed the execution
test's thread stack at 128 operations. Its log is retained. Balancing replaces
that chain. The checker additionally seeks an existing continuation call through
bounded ordinary definition reductions, then checks all its arguments. Existing
work/depth allowances remain unchanged; a unit regression checks that a large
unchanged continuation is not expanded to establish a small chunk equation.

## Warm serving on Apple M4 Pro / Node 25.3.0

Six fresh processes alternate baseline/selected order for each size. Each phase
warms 2,500 requests and records five samples of 25,000 complete bound calls.
Values below are geometric means of process medians in nanoseconds per request.
Updates and event acknowledgement are inside the corresponding timed loop.

| Operations | Weight update stride | Baseline ns | Selected ns | Speedup | Paired range |
| --- | --- | ---: | ---: | ---: | --- |
| 32 | None | 333.36 | 242.28 | 1.376× | 1.338–1.411× |
| 32 | Every request | 543.35 | 466.03 | 1.166× | 1.145–1.183× |
| 32 | Every 16 | 293.90 | 211.00 | 1.393× | 1.359–1.405× |
| 32 | Every 256 | 269.38 | 189.83 | 1.419× | 1.391–1.438× |
| 128 | None | 1136.35 | 874.39 | 1.300× | 1.290–1.309× |
| 128 | Every request | 1081.95 | 881.28 | 1.228× | 1.210–1.236× |
| 128 | Every 16 | 833.55 | 619.61 | 1.345× | 1.336–1.356× |
| 128 | Every 256 | 807.98 | 598.53 | 1.350× | 1.333–1.367× |

Every scalar result is consumed. Aggregate result checksums and ending checkpoint
hashes agree in each timed phase; separate conformance checks every reply and
checkpoint. Compare variants within each row. Different update phases also use
different live weights and JIT histories, so cross-row times are not an estimate
of isolated update overhead.

## Costs and limits

The selected JavaScript grows from 226,567 to 245,196 bytes at 32 operations and
from 227,745 to 312,961 bytes at 128. Complete portable plans are 849,462 and
3,631,618 bytes, respectively; they carry 10/34 ordinary theorems in 67/118
mathematical objects, in addition to their source-extension view.

One-shot startup observations are adverse. Median import time is 3.49/3.88 ms
baseline/selected at 32 operations and 3.53/4.87 ms at 128. Median first binding
and call is 275/363 microseconds and 289/680 microseconds, respectively.
Create/restore medians are about 2.13/2.01 ms and 2.77/2.59 ms. These diagnostic
observations do not establish a cold-start or retained-memory advantage. Source
checking, proof construction, compilation and import are outside warm serving
samples. Automatic choice requires comparable complete-lifecycle evidence.

The initial short 5,000-read probe was mixed and is retained separately. Its
startup `firstBindCallUs` interval also included checkpoint verification; use
only its warm samples, not that startup field. The final twelve process samples
use the corrected interval and the documented 25,000-read protocol.

The trace explicitly configures the opcode sequence and initial weights. Runtime
`retune` exercises a live learning API; this does not demonstrate fitting the
sequence, neural convergence, general reinforcement learning or GPU training.
The new producer is an explicit composed-plan compilation path. Normal
`build-model --specialize-frozen` artifact publication/verifier integration is
still required, along with broader capture abstraction and graph/tape domains.
See [commands and opportunity limits](../../docs/frozen-composition.md).

## Validation and implementation assurance

- 458 tests pass from the exact standalone core tree in a private checkout and
  fresh Cargo target. It includes the published exact-F32 and lexical-proof work
  alongside bounded continuation comparison; the source receipt excludes the
  unrelated uncommitted query-parser edit in the working tree.
- All 12 frozen-state integration tests pass with Rust/Wasm/GPU coverage flags
  required. Both longer cases compare 144 complete observations and exact
  checkpoints across Rust, JavaScript and Rust/Wasm. Native GPU hosts perform
  one actual pure GPU control per case; serving/training remain CPU work.
- Browser replays add 864 complete comparisons, twelve valid restores and six
  rejections of checksum-valid checkpoints containing a changed frozen opcode.
  Rejected restores preserve the live browser state.
- Focused knowledge coverage comprises 18 frozen-library/composition tests,
  five closed-data tests and three exact-float-law tests. The three composition
  tests were repeated after the final producer cleanup; they are not additional
  distinct tests. Rust's 20 library tests, JavaScript's full 57 tests and the
  GPU package's 12 tests pass; Wasm/runtime package compilation also passes.
- A fresh committed compiler/package rebuild recreates the 128-operation
  baseline package's executed images/startup state, regenerates the exact
  composed plan, checks the selected core identity and reproduces the exact
  measured selected JavaScript. Neither compiler source nor target is borrowed
  from the working tree. The two measured modules remain byte-identical after
  final package reconciliation.

This is finite implementation/reproducibility evidence. Source correspondence,
checker implementation, generated code, ABI, runtime, toolchain and driver still
contain trusted code; it is not a whole-chain correctness proof. General F64
proofs, automatic profitability and matched upstream parity remain open.

Run `python3 audit.py` to verify file bindings, inventories, histories and every
paired sample. `--ink /absolute/path/to/ink` replays both complete plans;
`--chrome /absolute/path/to/Chrome` replays the retained browser images. Archives
contain regular files only and omit Cargo targets and generated native projects.
