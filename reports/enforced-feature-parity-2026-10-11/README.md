# Enforced feature parity — 2026-10-11

The supported contract requires the complete executable source language on C,
Rust, JavaScript, C-Wasm and Rust-Wasm. GPU execution uses
`eligible-pure-exact-v1`: eligible pure kernels have exact u64 and binary32
semantics, actual device dispatch, and `gpu-required` reports an explicit error
instead of falling back. Stateful transactions, arbitrary-size integers,
general dynamic maps and recursive physical state execute on CPU hosts.
The default unrestricted GPU audit intentionally remains nonzero on 30
explicit coverage gaps. Passing the supported contract is not unrestricted GPU
language parity.

## Implementation and evidence

- Complete CPU parallel mapping uses bounded native or host workers, sealed
  callback identities, immutable captures and ordered results. Tests require
  multiple actual worker identities and a dispatch-count increase. Small or
  nested work can execute sequentially.
- Sealed physical definitions execute literally on all five CPU targets through
  the portable Session tooling and the independently generated standalone
  applications. The shared suite checks replies/errors, events, exact snapshots,
  restoration, migration and admitted numerical/collection representations.
- The checked JavaScript representation host maintains admitted fixed-key keep
  results, including guarded overwrite and removal. Ordinary baseline keeps
  still recompute. These fixtures supply no incremental Int aggregate candidate.
- Required GPU calls compare full-width u64 and raw binary32 bits, including
  signed zero, subnormals, infinities and NaNs. Arithmetic NaNs are canonical
  `0x7fc00000`; identity and sign-bit negation preserve payload bits.
- Async parallel state execution captures inputs, stages private transactions,
  validates replacement checkpoints and publishes atomically. Rejected work
  preserves the original state. Durable native hosts also check crash/retry and
  outbox behavior.
- The inventory has 15 feature entries and 17 mandatory conformance suites.
  Missing targets, unsupported required capabilities, omitted tests and changed
  source Type/Expr/Statement inventories fail. Fault injection exercises these
  failures and the required GPU contract.

## Reproduction

```sh
# Requires Rust, Node, the Wasm Rust target, Zig and Chrome.
CARGO_BUILD_JOBS=2 INK_TEST_ZIG=/path/to/zig \
INK_TEST_LEAN=/path/to/lean INK_TEST_CHROME=/path/to/chrome \
python3 tools/check_feature_parity.py --scope contract --run \
  --receipt build/enforced-parity/contract-integrated-final.json

# Audits unrestricted device coverage; expected exit status is 1.
python3 tools/check_feature_parity.py \
  --receipt build/enforced-parity/unrestricted-gpu-final.json
```

The committed JSON receipts bind the checked package revisions and record the
completed local run. `provenance.json` separately records the final pin update
for nominal ID wire validation and its three-suite-test/all-five-target delta
check; valid-domain semantics and GPU kernels are unchanged. Final Linux CI
results appear in the integration PR check runs. Large generated programs and build logs stay under ignored
`build/enforced-parity`. Supporting package PRs were merged before the
integration PR. Source syntax and the portable snapshot format are unchanged;
float programs use executable-core V6 and stale semantics markers are rejected.

## Trust and limits

The external definitions and update/migration obligations pass the general
checker. The source correspondence, checker implementation, codecs, literal
emitters, toolchains and host scheduling remain trusted implementations.
Differential conformance is not a formal compiler-correctness proof or a measured
speedup. The numerical correspondence integrated from e9e7fe9 includes disclosed
general equality/bit mechanisms; it is not an unchanged proof-kernel claim.

Portable definition transport is bounded (16 MiB, 100,000 nodes, depth 64).
Standalone generated APIs have their separate documented resource limits and
caller-trusted argument contract. Browser parallel workers require cross-origin
isolation and asynchronous entry. Device/private-buffer, composition and repeat
bounds remain explicit; unsupported required-GPU execution fails. The packed
pure C ABI uses sequential mapping; the complete C target uses native/host workers.

The local mandatory run passed 62 tests across 17 suites;
browser replay passed 499 comparisons and 141 GPU calls. The independent core
passed 73 checks, with 50 additional admission checks, three standalone Rust
worker/storage checks and the targeted merged boundary checks.

Linux replay initially lacked numeric Wasm artifacts because its first numeric
run had no Zig configured. The browser CI step now explicitly builds both
required-GPU numeric fixtures with Zig before copying them. The native GPU and
exact numeric checks had passed; the missing artifact failure was not suppressed.

The first Linux CPU/Wasm run reached the destination-storage oracle before GCC
rejected its unbraced sentinel assertion loop under `-Werror=misleading-indentation`.
The independently published C test fixture now has explicit braces; production
library source is unchanged. Both standalone fixture tests pass locally. Strict
GCC warnings remain enabled, and the integration CI verifies the corrected test.
