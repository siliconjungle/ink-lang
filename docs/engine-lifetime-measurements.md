# Complete-engine measurements

`executeSession` owns an engine from creation through disposal. Its observations
fit an `ink-resident-engine-v1` profile, separate from a resident session profile.
Acquisition includes input/profile copies, backend setup, upload, requested
steps, one full owned read, and session/engine close. Browser startup, common
module import, input generation and the output oracle are outside the timer.
Module, network and driver caches can be warm. CPU and driver memory are not
measured; GPU buffer counters do not measure total process memory.

The benchmark currently covers the existing ECS integer update and floating-point
Euler/bounce kernels. It is not Box2D, a full game engine, or evidence of transfer
to unfamiliar programs. Held-out sizes, iteration counts and seeds test workload
interpolation within those two programs.

Build a bundle and choose a protocol with disjoint training/evaluation sizes,
horizons and seeds. Freeze the compiler, bundle, acquisition scripts, planner,
knowledge cost basis and protocol before measurement. Use fresh browser processes
for at least three training and three evaluation acquisitions:

```sh
ink build bench/gpu/resident-profile.ink --target webgpu -o build/engine-bundle
node bench/gpu/engine-profile-browser.mjs train results/train-0.json build/engine-bundle protocol.json
# Repeat training with distinct output files train-1.json and train-2.json.
python3 bench/gpu/fit-engine-profile.py results/profile.json results/train-0.json results/train-1.json results/train-2.json
node bench/gpu/engine-profile-browser.mjs evaluation results/evaluation-0.json build/engine-bundle protocol.json results/profile.json
# Repeat evaluation with distinct output files evaluation-1.json and evaluation-2.json.
python3 bench/gpu/analyse_engine_profile.py --receipt results/engine-fit-receipt.json --profile results/profile.json --evaluation results/evaluation-0.json results/evaluation-1.json results/evaluation-2.json -o results/report.json
```

The acquisition server snapshots and hashes every served JavaScript, Wasm and
WGSL asset before running. Later filesystem changes cannot change served bytes.
Each record binds the protocol and supplied profile bytes and retains all eight
interleaved rounds, including the actual backend, decision and resource counters.
Each block balances backend positions and every directed within-round adjacent
backend pair, using a recorded process seed. This avoids always measuring one
path immediately after GPU disposal. Across-round boundaries and unrelated
machine activity still require caution. Output correctness is checked for every execution outside the timed call.

The report verifies the fitting receipt's training files and profile, consistent
source/device/protocol provenance, disjoint processes and input splits, full
case coverage, timing samples and actual GPU dispatch. It includes every supplied
evaluation process and every case, even when the profile is slower. Ratios compare
process medians; they are descriptive, not confidence bounds. Acquisition records
alone do not establish machine isolation. Retain process/load evidence alongside
the frozen experiment before making clean performance claims.

Explicit CPU, forced GPU, unprofiled automatic and profiled automatic calls are
separate measurements. A correct profile that chooses CPU can still lose to an
explicit CPU call because profile preparation and selection add work. Training
fits forced CPU/GPU calls; it does not establish that the profiled automatic path
recovers its own selection overhead. Held-out end-to-end results must establish
that profitability separately. Do not use evaluation records to refit a profile
and then report those same records as held-out validation.

Set `profile_mode` to `prepared` in the protocol to reuse an immutable prepared
profile across calls (`inline` is the default). Acquisition times preparation
once before the calls. It also measures the shared decision ABI's initial Wasm
load separately, before interleaving, and charges that common startup once to
each compared workload total. Thus the first sampled path does not absorb setup
on behalf of the other paths. `workload_totals` reports the number of profile
calls, common startup, profile preparation, execution sums and the complete
CPU/profile ratio. Per-case ratios still describe engine calls alone. Preparation
is not free and a prepared profile is not automatically profitable for a short
workload. Compare the complete totals before claiming a gain.
