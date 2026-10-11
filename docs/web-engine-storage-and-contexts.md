# Portable contexts and destination execution

The engine supplies checking, evaluation and execution mechanisms. Equality laws,
representation alternatives and profitability observations remain ordinary DB
objects. No helper name, backend name or published certificate hash grants
mathematical authority. Target code generation remains trusted and is tested
against the interpreter.

A semantic law may carry a bounded transitive definition context. Each definition
binds its name, signature and typed semantic body by content identity. Admission
reconstructs and checks that context before using the existing equality proof
rules. Application binds it to the original checked module, including every
transitive callee. A context-free certificate cannot borrow a caller module's
helper definitions implicitly. Changed definitions require fresh certificates;
hashing a false equation does not make it admissible.

Collection operand materialization is literal lowering. A list-producing receiver
is evaluated once before its length and elements are read, including when bounded
helper expansion falls back to a call. Lazy branches keep their operands inside
the chosen branch. This does not authorize map fusion, predicate reordering or
elimination of source stages; those choices still require a checked replacement.

Destination entrypoints expose a physical lifetime contract for list results.
The ordinary value-returning ABI retains its existing behavior. JavaScript
`functionsInto[name](...args, destination)` returns a logical element count;
C `lang_fn_NAME_into(...args, element_destination)` does the same. The packed C
and Wasm `ink_compute_into(function, data, lengths, destination)` returns a count
of 32-bit words. Capacity, correct declared types, alignment and nonaliasing are
caller obligations. These APIs do not inspect caller values to validate those
obligations. Only the returned prefix is written; remaining destination capacity
is left alone. Source intermediates are still materialized unless a DB law has
already replaced them.

The runtime's `callInto` supports an explicit JavaScript or Wasm CPU backend.
JavaScript uses native values, including BigInt for U64. The CPU transport writes
native values into the caller destination after packed execution. That transport
is measured separately from direct destination execution.

`prepareCpuCall(name, args, capacityWords)` captures inputs once in a dedicated
Wasm instance. `writeArgument(index, words, logicalCount)` updates an already
reserved packed argument. `run()` returns a borrowed Uint32Array of packed words.
The view expires on the next run, argument update or close, and must not be kept
across memory growth. Every run restores a saved allocation mark after executing
scratch producers; captured arguments and destination storage precede that mark.
Other prepared calls own different instances. The caller supplies sufficient
argument and output capacity and respects that lifetime.

Native generated hosts expose unsafe `Engine::call_packed_into` for caller-owned
packed storage. The destination requires eight-byte alignment, sufficient
capacity and disjoint input storage; packed argument counts are logical elements.
The method resets call scratch before and after execution. A live arena-backed
result cannot cross that boundary.

GPU graph execution expands supported composed functions into literal stages,
keeping intermediate buffers resident. Ordered reductions preserve the source
sequence and rounding rather than introducing an unproved parallel reassociation.
Availability is a capability; profitability still requires whole-call measurements
including transfers, allocation, dispatch and readback. Unsupported types,
operations or device capabilities retain explicit CPU fallback. Mixed modules
recognize literal graph descriptors as well as scalar-pipeline descriptors, and
use the host API emitted for each part. Awaiting module disposal closes both
kinds of device host. Generated mixed native projects explicitly disable Cargo's
implicit library target, so an old pure-project library in a reused output
directory cannot intercept native link dependencies.

CPU transport decodes a terminal arena result before reset instead of first
copying its packed words. Values crossing a later arena reset still receive an
owned copy. Destination decoding writes directly to the caller prefix. Captured
adaptive automatic U32 JavaScript calls can read their already private typed input buffer;
public packed results retain the owned Array contract. GPU mapped readback still
copies to owned host words before unmap; a header-free subview avoids a second
copy while the decoder consumes those owned words. These mechanisms preserve
ordinary result lifetimes and do not enable caller checks.

The pure value semantics does not model allocation traces or certify physical
ownership correspondence. Destination ABI and allocation marks are trusted
backend/runtime mechanisms with differential, lifetime and allocation tests.
This change does not introduce a new mathematical optimisation rule.
