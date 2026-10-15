# Compiled authored objective portfolios

This milestone adds ordinary compiled Ink goal functions over complete eligible
candidate forecasts and captured typed context. The offline planner and adaptive
hosts use one Rust/Wasm decision contract. Goals can include learned parameters;
training and publication remain explicit application operations. This is opt-in
ranking of checked portfolios, not global learned compiler search.

Local validation:

- ABI: 27 tests, including sixteen native/Wasm objective conformance cases;
  signed scores, maximize/minimize, uncertainty, changed goals, stale full-request
  assessments, migration domains and resource limits.
- Independent runtime: locked dependency check, two library tests and twelve
  Node adaptive-host tests against the exact published ABI package.
- Real compiled source objective: six contexts agree with the independent
  reference on native, JavaScript and Wasm; GPU hosts use CPU fallback for these
  binary64 functions. The separate F32 control executes on the actual GPU.
- Real checked application variants: complete replies and exact checkpoints,
  sixteen application actions and two switches, latency/memory retargets,
  immutable captured context, stale updates, retained switch/resource limits,
  and disabled restore state. The offline command selects the same smaller
  variant using the compiled goal and shared ABI.
- Planner profile validation: two tests.

`goal-parity-*` records full inputs, independent expected results and actual
native GPU-host receipts. `offline-objective.json` is the offline proposal;
`objective-request.json`, `objective-config.json` and `previous-goal.json` retain
its conformance inputs. Profile costs and preferences here are deliberately
synthetic: the compact implementation is priced slower and smaller. These inputs
test policies; they establish no speedup, neural accuracy or resource guarantee.

`packages.json` binds the independently published packages. The core package
remains unchanged from the frozen-structure milestone. Local distribution builds
preserved the user's pre-existing `core/src/syntax/query.rs` edit (diff SHA256
750cc8098faaad5bd8278f93760af008129ce3c136a79471334c7f604aa564ab).
That edit is excluded from this publication. No whole-toolchain proof follows
from these tests; compiled adapters, codecs, forecasts and runtime remain in the
documented trust boundary. Full CI status must be checked separately.

See [the contract](../../docs/programmable-objectives.md) for APIs and remaining
integration boundaries.
