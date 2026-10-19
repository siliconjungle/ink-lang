# Native F32 helpers in stateful JavaScript modules

Eligible stateful modules now execute pure helpers with rounded JavaScript
Numbers and exact private NaN tags. Actions, keeps, stored rows, events and
portable snapshots retain their existing integer bit carriers. Typed private
bridges convert arguments before entering a helper and encode its result before
returning to the action. Calls between pure helpers stay in the native lane.

This is literal lowering support. Every source operation retains its binary32
rounding, operand order and grouping. The change supplies no arithmetic equality,
range assumption, derivative rewrite or profitability authority.

The bridge handles scalar F32, immutable records, lists, vectors, options and
results, including checked record elisions and result spines. Unchanged types,
including binary64, keep their existing carriers. It constructs fresh private
float-containing containers; public results remain detached. It never mutates
or transfers ownership of a caller's or state's container.

Unsupported float-containing owned handles and recursive float shapes keep the
existing module bit lane. Bridge generation is bounded by 4,096 schema helpers
and 262,144 source bytes; exhaustion also retains that lane. No source admission
or semantic limit is increased. These capability checks do not select an
algorithm or certify a speedup.

Stateful-module pure entries keep their previous eager typed input capture,
including accessor order. Their float descendants are normalized on ingress,
as are compiled-value captures and private state bridges. Helper emission may
therefore reuse those normalized carriers without repeating normalization at
every field read. This is not a finite-Number fact: exact NaN tags remain legal.
Pure-only modules retain their separate borrowed-input, lazy typed-read ABI.

State result conversion and typed bound F32 input conversion explicitly use the
state bit representation, independently of the helper representation. Portable
program/schema identities and checkpoint bytes do not change. The manifest's
`f32_storage` still describes stored state; `f32_computation` describes pure helper
execution. Snapshot compatibility is checked against the independent reference,
including copied signaling NaNs, negative zero, events and failed transactions.

The JavaScript `state_float` suite compares three complete 204-step histories
using ordinary, prepared and bound calls. It also covers host rollback, worker
execution, detached outputs, normalization of host doubles, exact NaN capture,
and the recursive-shape fallback. Distribution `javascript_package` includes
these tests. The existing bit-island suite explicitly retains an owned-float
fallback fixture so both representations continue to be exercised.

The [public lifecycle proof](../bench/functionality/state-native-f32/README.md)
retains generic reference/native/Wasm histories, exact snapshots, actual browser
workers and an eligible hardware GPU dispatch. It establishes conformance;
application-specific performance evidence has its own workload and source-access
boundary. Complete-call measurements must include capture, validation, arithmetic,
result ownership and any transaction/event work the application actually uses.
