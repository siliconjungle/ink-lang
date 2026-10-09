# Small core, external optimisation knowledge

This is a binding architectural direction following the user's clarification: the compiler core contains no catalogue of optimisations. It provides well-defined semantics, general evidence checking, and efficient base execution/lowering. Rewrites, incremental algorithms, physical representations, specialisation strategies and their selection knowledge belong in an independently versioned database.

## Boundary

The core owns parsing/elaboration into a compact typed semantic representation, type/effect/ownership checks, the chosen logic's general proof rules, and a straightforward execution/lowering path. It can efficiently execute a primitive without knowing a transformation from one user program to another. Efficient maps, allocators and code emitters are implementation mechanisms; choosing a different map representation for a program is optimisation knowledge.

The database holds immutable semantic definitions, theorems, typed rewrite patterns, alternative implementation bodies, abstraction relations, initialisation and migration functions, applicability conditions and measurements. Proof-producing search, tactics and AI proposals are outside the trusted core. A general optimiser may search and instantiate database entries, but it cannot install assumptions or bypass evidence checking.

An empty database must still compile and execute the language correctly. It should introduce no language-level optimisation whose justification or alternative lives only in compiler source. Applying a new rule, aggregate implementation or representation package must not require rebuilding the compiler. The same pinned program, database closure, selection plan and toolchain should reproduce a static build.

The core must not grow a `cached_sum` proof rule, a `factor_polynomial` instruction, or a whitelist treating a package name as evidence. Mathematical lemmas and representation laws must ultimately be definitions and checked proof terms in the database. The trusted logic and semantic primitive set are fixed and explicit; database extensions cannot redefine them by supplying a matching name.

## What the prototype currently gets wrong

The present prototype is an implementation experiment, not yet this architecture:

| Location | Current mechanism | Required destination |
| --- | --- | --- |
| `proof.rs` | Polynomial normalisation plus rule matching/search | Proof producer and generic external search; core checks emitted proof terms |
| `aggregate.rs` | Built-in finite-map induction schema and row-pipeline recogniser | Definition/theorem/implementation objects and external applicability search |
| `state_native.rs` | Built-in bounded-sum analysis and alternative cache generation | Range-proof producer and database-defined representation/lowering plan |
| `native.rs` | Automatic map/filter/reduce fusion | Explicit database transformation over a baseline collection IR |
| Compiler commands | Direct package files and optimisation switches | A pinned database closure and explicit checked selection plan |

Moving these routines to another Rust module, or wrapping them in a package named “proof”, would not satisfy this requirement. They must stop being built-in sources of transformation authority. Existing measurements remain useful evidence about candidate implementations, but do not establish the desired architectural separation.

LLVM currently performs additional optimisation after generated C/Rust. The small-core claim must distinguish our language-level core from this external trusted toolchain. Replacing LLVM with a minimal backend is a separate engineering task; concealing its optimisation would be misleading.

## Database acceptance path

1. Resolve names to immutable content identities from an explicit lockfile. Load a bounded dependency closure; reject missing objects, cycles, incompatible semantics and altered content.
2. Type-check definitions and validate proof terms locally against exact statements and dependency identities. A server badge or receipt is provenance, not permission to assume a theorem.
3. Check that a proposed source-to-alternative mapping uses the theorem about those exact operations and observations. Discharge its conditions at the application site.
4. Record the selected alternative, theorem closure, discharged conditions and backend settings in a build plan.
5. Measure competing valid implementations separately. Profiles guide selection, never justify correctness. Trials cannot publish application events.

Representation packages must prove more than today's answer: initialisation, observations, successful and failing transitions, ordered events, tentative reads, future permitted changes and migration at a transaction boundary. Switching implementations must preserve committed user changes and outstanding outbox entries.

## Hunchroom findings relevant to this design

Hunchroom was read on 2026-10-09. The following are source-reported results and inspected statements, not proofs independently replayed by this project.

- Its verification workflow pins formal dependencies, distinguishes theorem checking from statement meaning, and describes a second checker plus replayable receipts. Our database should likewise separate content identity, local acceptance, semantic correspondence and measured usefulness. A signature alone cannot establish validity. [Verification](https://www.hunchroom.com/verification)
- Its incremental recomputation theorem assumes a correct old cache, query extensionality in declared dependencies and coverage of every changed field. Those are concrete obligations for an incremental package. The model uses pure total functions and fixed dependencies; it does not certify our effectful transactions or dynamic dependency discovery. [Result 72](https://www.hunchroom.com/p/72)
- Its operation-commutation theorem requires sound read/write footprints and cross-operation independence. Merely writing different fields is insufficient. We additionally need to preserve failures and ordered events before reordering our changes. [Result 70](https://www.hunchroom.com/p/70)
- Its sparse-counter refinement relates executable sparse and dense transitions over arbitrary finite future traces. That is the right shape for representation equivalence. Its two-replica natural-number model omits bounded-machine overflow, dynamic replicas and native lowering. [Result 75](https://www.hunchroom.com/p/75)
- Its checked-register work proves adjacent additive fusion and overwrite elimination inside sequential contexts. Its arithmetic is exact natural numbers, so the statements cannot simply be relabelled as our checked-u32 arithmetic or eventful changes. [Result 67](https://www.hunchroom.com/p/67)

These belong in an external research/proof-production workflow. An import must either translate to our core's proof language with the needed semantic correspondence, or disclose a separate checker and translation layer as trusted. No Lean dependency is being silently added to the user language, and no Hunchroom theorem is currently accepted as an optimisation certificate here.

## Required architecture tests

- Hash the compiler binary, add a new independently checked optimisation object to the database, and demonstrate a changed valid plan with the same compiler hash.
- An empty database produces a correct baseline with no database-selected transforms.
- Unknown theorem names, unchecked proof terms, altered dependencies and incompatible semantics fail closed.
- New algorithm and representation definitions work through the same general mechanism; a built-in aggregate whitelist is not enough.
- Removing a knowledge entry changes opportunity or performance, never the source program's meaning.
- Counterexamples cover intermediate assertions, reads of another operation's writes, missing dirty dependencies, event order and future updates after migration.

## First implemented proof-term path

`equality.rs` checks explicit equality derivations over the total scalar fragment (`Bool`, modular `u64`, existing scalar binary primitives). Its rules are reflexivity, symmetry, transitivity, literal primitive execution, binary congruence, Boolean case analysis and typed instantiation of previously checked theorems. Acyclic scalar definitions expand by simultaneous substitution; they introduce no axioms. Compute executes primitives only on literal arguments: it does not accept `x + 0 = x` as an arithmetic axiom. Cases check both Boolean branches with the split variable removed from context. Proof endpoints and operand types must agree exactly. This Rust checker has not itself been formally verified.

`knowledge.rs` reads an ordered lockfile and SHA-256 identities of exact object bytes, checks a bounded transitive dependency closure, and applies typed substitutions only within whole total scalar function bodies. Source calls, binders, collections and stateful expressions are excluded. Proof objects may call their explicitly imported, checked scalar definitions by content identity; the compiler expands these before matching source expressions. Object fields are closed; unknown proof rules and incompatible semantics are rejected. Dependencies are explicit and exact: another object being present in the database does not grant permission to use it. The SHA-256 is an identity, not a trust signal. Checker, parsing and rewrite budgets are bounded.

`tools/boolean_proofs.py` is an external, untrusted case-enumeration producer. Its first example data supplies absorption and duplicate-predicate elimination. `tools/check_database.py` builds an empty database and then extends it with one and two laws, verifies unchanged compiler identity, and compares native results with an independent C oracle. Database selection is explicit lock order and one bottom-up pass, not measured search or global optimality. Each proposed replacement is checked again as an exact theorem instantiation at the application site; a matcher result alone cannot authorise it. Clang may independently discover these simple laws, so this demonstrates architecture rather than a performance gain.

This path adds no optimisation law to the equality checker. It does not yet remove the legacy arithmetic/aggregate/collection paths listed above, and the empty-database guarantee for the entire language remains unmet. The full proof calculus (inductive data and recursive definitions, induction, conditional theorems and richer types), generic implementation IR and migration proof interface still need implementation. The existing domain-specific certificate checkers are explicitly transitional and remain in the trusted base.

### Definitions and dependency closure

Schema-1 theorem objects may contain a `dependencies` array of content identities. `Use { theorem, arguments }` instantiates a checked universal equality; arguments must match every declared parameter, including parameters unused in the result. `kind: "definition"` objects declare scalar `params`, `result` and `body`, plus dependencies. Proof AST calls use the existing `Call` encoding with the definition's full content identity. Definition bodies are checked before insertion, cannot recurse, and are stored fully expanded. Substitution does not recursively substitute inside an inserted argument.

The loader checks at most 128 objects, a dependency depth of 64, 4 MB per object and 16 MB total object bytes. It checks direct imports in isolated contexts and imports only opaque, already checked entries into dependent contexts. Shared dependencies are checked once per load. Only theorem roots listed in lock order become rewrite candidates; dependency lemmas are never implicitly enabled as rewrites. Definition roots may be loaded for validation without selecting a transformation. Build plans retain the sorted closure identities, input and selected AST hashes and emitted C hash. AST hashes are prototype identities, not a stable cross-version semantic encoding. Backend/toolchain reproducibility remains a separate requirement.

`tools/composed_proofs.py` creates a seven-object example: two Boolean lemmas, three total scalar definitions and two derived theorems. The selected theorem uses the general combination theorem on an unsigned comparison. Its proof reuses the earlier lemmas rather than enumerating the cases again. `tools/check_composition.py` checks the closure and compares generated native code against an independent C oracle. Like the simpler example, this establishes proof composition and correctness, not a speed advantage over Clang.
