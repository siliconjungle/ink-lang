# Reuse immutable derived computation

A `keep` already names a value derived from application state. Compiled JavaScript,
Rust and Rust/Wasm now retain structured immutable keeps as well as scalar keeps.
A preparation function can return a record, list, optional/result value, vector,
string or recursive immutable structure. It runs lazily and is reused while its
checked input roots remain unchanged. Owned Buffer/Map descendants are excluded.

```ink
module prepared_points;
record Point { x:f32, y:f32, }
state Points:Table<u32,Point>=Table.empty();
keep Powers:List<f32>=Points.values().map(fn(p)=>p.x*p.x+p.y*p.y);
query total()->f32 reads(Powers){return sum(Powers);}
change put(key:u32,point:Point)->Result<Unit,String> writes(Points){
    Points.put(key,point);return Ok(());
}
```

Use an explicit derived value for a stable plan or measured input, then pass it to
ordinary pure computation. [The prepared neural example](../examples/prepared-neural.ink)
retains a network architecture while weights and Adam/control state continue to
change. Its model, training outcomes, rollback and full logical state match the
original example. This reuses computation; it does not specialize its arithmetic
or freeze the trainable parameters. Existing neural checkpoints remain bound to
their original source; the separate example has its own identity.

## Ownership and lifecycle

Checked effects derive every observed root, including transitive keeps and query
calls. Concrete writes invalidate the affected values. Unrelated writes retain
preparation. Ordinary action rollback restores valid private before-images on
JavaScript; native rollback discards derived caches. JavaScript host rollback
restores the prior cache image. Explicit restore and installed parallel snapshots
rebuild derived state lazily. Nothing from the keep cache is serialized into the
portable logical checkpoint.

JavaScript shares private immutable source values internally. Pure parameters
cannot gain unique mutable list storage, and public replies still cross an owned
copy boundary. Typed bound calls also capture composite inputs. Native keeps
return owned clones. Neither host input mutations nor mutations of returned
nested data can change future source observations. Source Result Err values may
be retained; thrown host exceptions are never cached.

There is one retained value per eligible keep, rather than a history of argument
keys. Its size can still be substantial. This literal execution mechanism changes
neither the keep expression nor a numerical operation. Different algorithms,
arithmetic, maintained representations and automatic plan selection retain their
ordinary database proof and profitability gates. No catalogue snapshot changed.

## Measured scope and costs

The [retained study](../reports/structured-preparation-2026-10-16/README.md) compares
the exact same checked source/checkpoint under the prior and current JavaScript
emitters, with an independent dense F32 neural control. On M4 Pro / Node 25.3.0,
held-out neural prediction improves from about 39.1 to 11.3 microseconds, 3.45×.
The dense kernel is still about 31× faster than the prepared state call, with a
narrower boundary that excludes state/ABI overhead.

Repeated selected names improve by roughly 3× at 128/4096 rows. Returning a
complete 4096-row structure improves only about 1.02×: public output construction
still dominates. Cold-cache setup, invalidation and memory can lose. The first
4096-row names read increases from 0.70 to 1.77 ms. One read per table update takes
about twice as long, while sixteen reads per update improve about 1.86×. An
isolated-process 16,384-row case retains about 1.7 MB more JavaScript heap.

Complete training/serving turns also depend on cadence. The measured training-only
case regresses about 24%; four or sixteen predictions per turn improve about 1.26×
and 2.07×. These are bounded workload observations, not automatic selection rules.
Use keeps for reuse over stable inputs; a direct query remains a useful control for
short-lived or frequently invalidated computation. Cost-aware retention choice,
broader staging, graph specialization and native performance ranking remain open.

The new tests compare 35 structured-value outcomes and ten neural-model outcomes
across reference, Rust, JavaScript, Wasm and GPU-host execution, including exact
checkpoints. A separate numeric call actually dispatches on GPU. Preparation and
training execute on CPU hosts. Instrumented checks verify reuse, private boundaries,
source errors, thrown errors, invalidation, rollback and restore. Four lexical
scope/cycle tests and a private standalone build strengthen implementation evidence;
they do not establish whole-checker, AD or compiler correctness.

The complete immutable collection API is available in pure helpers. Query-body
collection operations still have a narrower admitted surface; the scalar NaN
observation test uses an explicit pure helper. This mechanism does not close that
language parity gap, F64/Pretext fidelity, general source reverse AD or device
training.


[Prepared value-state initializers](prepared-initializers.md) now carry the same
explicit reuse into defaults for mutable cells. This avoids rebuilding a default
optimizer on every read, while preserving the strict fallback and live learning
state. Its source identity and lifecycle measurements are tracked separately.
