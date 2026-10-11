# Small core, external implementation knowledge

Keep program meaning stable. Let implementation knowledge accumulate.

Ink separates what a program means from the ways it can run. Its independently
versioned knowledge database contains implementation alternatives, transformations,
applicability conditions and checked equality evidence. New admitted knowledge can
improve existing programs when they are rebuilt, without changing their source or
adding an optimisation pass to the compiler.

## Boundaries

The language core owns syntax, types, effects, ownership, fixed primitive semantics,
shared expression and binding analysis, and general evidence checking. It must
compile and execute a program correctly with an empty database. A general mechanism
can be added when an alternative cannot yet be expressed; an algorithm recogniser
or certificate whitelist cannot be added as a substitute for checking evidence.

`ink-knowledge` owns immutable laws and implementation definitions, their discovery
metadata, untrusted proof producers, cost observations and model provenance.
`ink-planner` proposes applications, performs bounded search and fits cost models.
The core independently checks the exact selected dependency closure against the
input program. Content hashes authenticate bytes; they do not prove correctness.

Lowerers execute the admitted program literally. They implement general language
mechanisms and target constraints. They do not decide to replace a reverse fold
with an early exit, reuse an immutable intermediate buffer, or inline a helper.
Those choices are externally proposed and checked. General `fold_until` and owned
`Buffer.map`, `Buffer.map_indexed`, `Buffer.scan` and stable `Buffer.filter` operations express those
alternatives on every backend. See [universal optimisation](universal-optimisation.md)
for the operation contracts and proof scope.

[`ink-abi`](https://github.com/siliconjungle/ink-abi) owns value descriptors, packed
layouts, value kind tags, transport fixtures and the common execution decision
contract. All lowerers and hosts consume that package. Browser hosts execute the
same decision code as native hosts through its Wasm artifact. Eligible targets and
resource availability can differ; the decision rule and workload features cannot.
Runtime applies a saved, target-bound model or retains the compiled CPU baseline.
Device errors and resource limits remain runtime responsibilities.

[`ink-native-support`](https://github.com/siliconjungle/ink-native-support) owns
support emitted into native applications. Dynamic C values and statically typed
Rust values retain their separate representations while consuming the shared ABI.
The source reference evaluator remains independent for differential testing.
Representations compile to standalone native state; the generic proof-aware
Session, executor adapters and per-call logical snapshot validation are removed.
Portable checkpoint/restore switches compiled implementations only after restore
succeeds; direct mathematical bridge checking remains a compile-time capability.

## Current state and ambitions

Canonical semantic transformations and source-bound physical representations have
checked admission and executable selection. The database now includes general
early-termination and owned-buffer laws; installed database producers can propose
source-specific decision-tree and definition-unfolding proofs during planning.
A portable selection records the exact input, admitted laws and dependency closure
so rebuilding is reproducible.

Legacy aggregate certificates, storage policies, maintenance commands, bounded
cache authority and the old scalar database loader have been removed. There is no
compatibility feature that restores them. Archived observations remain evidence
about earlier experiments, not executable optimisation authority.

The ambition is broader reusable implementation knowledge: algorithms, data
representations, incremental maintenance, hardware choices and measured cost models
that improve programs while preserving their meaning. The current checker covers
documented equality and action-transition domains; it is not a proof of generated
C, Rust, JavaScript, Wasm, GPU drivers or arbitrary stateful optimisation. LLVM and
other downstream toolchains remain trusted and can perform their own optimisation.
Performance claims require measured workloads, rather than equality proofs or
structural search prices.
