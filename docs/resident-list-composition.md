# Resident List composition between browser sessions

Prepared browser sessions can snapshot a current List result into another
session's reserved input:

```javascript
await producer.step();
const transfer = await consumer.writeFrom('values', producer, 'result');
await consumer.step();
const output = new Float32Array(capacity);
const {count} = await consumer.readInto('result', output);
```

Both sessions belong to the same runtime instance. Private WeakMap membership,
closed/iteration state and descriptor equality are checked using internal data;
public method/getter replacement cannot authenticate a source. Source capacity
must fit the target reservation; where a CPU-only source lacks a static GPU
capacity, its actual packed result count is checked. The API accepts Lists of
supported packed elements, including vector/record strides, rather than only
embedding vectors. Calls share runtime serialization.

GPU-to-GPU copies retain the actual length header and bounded payload on the
same queue, with zero host upload/readback. They are snapshots: subsequent source
steps, writes and close do not change the target. Aliasing an identical device
buffer needs no copy. Feedback writes update the carried value or cancel owed
publication exactly as ordinary writes. CPU and mixed-backend transport copies
owned packed values and reports the actual transfers. Neither path exposes a
borrowed source value. Normal consumer steps and public result reads remain
required. Resource/device failures keep the existing session semantics.

This is an explicit browser runtime/device operation. It changes no Ink
primitive, reduction order, rewrite theorem or automatic placement policy; native
Engine methods remain unchanged. Existing whole-pipeline composition is the
stronger control when the producer and consumer can share one session, because
it avoids the extra intermediate copy and host submissions.

The external experiment uses three frozen unrelated Ink programs: matrix-column
accumulation, feedback filters and image-channel energy, each followed by the
same compiled Ink scalar postprocess map. Three fresh Chrome processes compare
typed CPU round-tripping, resident device copying and a combined two-step
pipeline. Resident copying improves the measured cases by roughly 1.28–1.71x
over round-tripping; combined pipelines are usually faster still. All complete
results remain bit-exact. Explicit CPU/GPU mixed transfers and closing the
producer after copying are also checked on actual hardware.

A Potion embedding -> exact dot-product similarity example keeps corpus vectors
resident and returns the complete score matrix. At 16 queries x 256 documents,
resident copying measures 48.44 versus 62.50 microseconds/query for typed
round-tripping, and the combined pipeline measures 40.63. These are amortized
batch values with changing queries, input uploads, exact arithmetic and complete
final readback. Model/corpus preparation and correctness checks are outside
timing. No native-float approximation, top-k pruning, ANN quality or universal
placement gain follows from these measurements.

Raw measurements also retain runtime load, per-session preparation, corpus
upload/encoding and initial resident-copy costs. These occur outside the warm
call samples. Session opens run sequentially within a shared runtime and shader
cache, so their numbers are lifecycle observations, not independently cold
alternatives or a fitted placement policy. The report and exact emitted hosts,
shaders and source are retained in the external ink-static-embeddings experiment.
