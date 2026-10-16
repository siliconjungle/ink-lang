# Factor literal equalities into ordinary database lemmas

Two source expressions can carry exactly the same fixed data through different
definitions: a frozen F32 payload is a raw word, while its explicit source
literal may use `f32_from_bits`. Expanding every transparent tail to compare
long lists needlessly destroys data sharing and can exhaust proof resources.

The knowledge producer now discovers candidate equalities between closed data
definitions. It processes acyclic dependencies first, compares bounded bodies
while keeping data calls opaque, and proposes ordinary closed theorems. A later
chunk reuses earlier theorems through checked congruence. Complete action proofs
then use those lemmas instead of expanding the entire value again.

Each equation is bound to exact typed definitions. Fingerprints, names, hashes,
scores and database membership only locate candidates; the ordinary checker
replays every theorem and every action equality. Candidate discovery excludes
dynamic variables, binders and recursive definitions. Its work/size limits are
optional opportunity bounds: exhaustion discards partial objects and retains
the previous checked tactic. No kernel bound, primitive or source syntax changes.

IEEE arithmetic remains ordinary source computation. These lemmas establish
exact stored-bit identity, including distinct NaN payloads and signed zero; they
do not equate all NaNs or authorize reassociation, precision changes or discarded
arithmetic. Source projection, F64 proof admission and owned-value domains retain
their existing boundaries. This extends verification capacity, with no new
runtime throughput or automatic profitability claim.

## Runnable build-stage example

```sh
ink build-model examples/frozen-parameters.ink \
    examples/frozen-parameters-training.json \
    --freeze-roots Model --specialize-frozen \
    --target javascript -o build/factored-parameters
ink verify-model build/factored-parameters --replay
```

The trace explicitly configures 244 raw F32 values, including subnormals,
signed zero, infinities and signaling/quiet NaN payloads. It also initializes a
separate trainable cell. The restricted package withdraws `configure`, retains
`retune`, preserves the complete checkpoint/outbox/version, and returns every
parameter. This is configuration and a live training API, not a fitted neural
model or a convergence result.

Build-stage packaging keeps the rebased plan sidecar as compact JSON, retaining
every field and proof. In the 244-value example, this reduces the selected
package from 4,131,526 to 1,704,472 inventoried bytes; the compact baseline is
296,952 bytes. Parsed plan values, executable images and selection proofs are
unchanged, and older pretty-printed packages still verify. This reduces storage
overhead; it is not a serving-speed measurement.

The producer's generated database view carries the closed lemmas with the
selected model; the default global catalogue is unchanged. Existing short
specializations keep their normal source/proof path. Large finite and exceptional
lists now specialize through 512 values in the retained tests. Negative checks
alter a NaN payload, rebuild the candidate's complete source-bound closure, and
require action-proof rejection. Another check publishes a rehashed invalid
theorem with valid membership and requires ordinary theorem rejection.

This resolves the exceptional-literal authoring limit recorded by the preceding
sharing report. Long generated action continuations, general graph/tape
specialization, device training and learned physical layouts still need work.
