# Universal optimisation boundaries

Keep program meaning stable. Let implementation knowledge accumulate.

A discovery should improve every capable target after a rebuild. It should not
require a language-specific recogniser or a compiler pass naming that discovery.
The database proposes implementations and proves their applicability. The core
checks general proofs and fixes the meaning of general execution mechanisms.
Backends emit the checked choice literally.

`foldr` visits a list from last to first. `fold_until(xs, initial, stop, step)`
visits it forward. On each element it evaluates `stop(item)(old_accumulator)`,
then `step(item)(old_accumulator)`, assigns the result, and terminates if the stop
flag was true. Both callbacks see the same prior state; empty lists return the
initial value. Item and accumulator types may differ. This is executable-core V6.

The database's first-replacement laws use ordinary induction and case proofs to
select early termination. Its untrusted producer also proposes nested decision
and captured-work candidates with complete checked proof dependencies. A result
or predicate depending on the remaining fold cannot receive this law. Rehashing
a false proof does not repair it. Callback order, empty inputs, shadowing, exact
word boundaries, float payloads and captured values have conformance tests.

Owned `Buffer.map`, `Buffer.map_indexed` and `Buffer.scan` explicitly consume and
update private storage. Their fixed extensional meanings correspond to the same
ordered list operations; `freeze` returns the logical list. Database equalities
select these representations. C and JavaScript no longer infer buffer reuse from
an immutable collection expression. Explicit destination APIs remain host-owned
storage mechanisms. Capability/resource limits may require CPU execution.

These equality proofs cover the admitted pure total-value domain. They do not
prove allocation failure behavior, equal fuel use, toolchain correctness or
floating GPU bit identity. Early-termination callbacks may evaluate a predicate
more than once. A mathematically valid alternative can still be slower.

`ink-abi` is the transport and host decision authority. Every lowering package
pins it; value descriptors, field order, packed widths and C headers have one
owner. Native and JavaScript implementations share conformance fixtures. The
adaptive/static decision and workload-feature code has one Rust implementation,
compiled to Wasm for browser hosts. Identical eligible candidates, profiles and
workload descriptors produce identical decisions. Device capabilities and
measured target prices may legitimately differ.

Knowledge owns structural search hypotheses, immutable observations and fitted
models. Planner owns bounded search and offline fitting. Runtime supplies eligible
implementations, executes the chosen one, enforces resource limits and handles
fallback. It performs no repeated profitability probes. Profiles bind exact code,
target, boundary and observed domains; missing comparable evidence retains CPU.
Costs have no mathematical authority.

`ink-native-support` contains emitted typed and dynamic value primitives, owned
collections and state exports. Their different representations remain explicit;
the reference evaluator remains independent in core. Shared visitors, binding
utilities and tree budgets also live in core, because they describe the program.

Legacy aggregate certificates, bounded caches, typed storage policies, source
maintenance evaluators and historical scalar loaders are removed completely.
Current maintained representations continue through database proofs. Archived
reports are evidence data, not an executable compatibility path.
