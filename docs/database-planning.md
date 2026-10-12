# Database-authored implementation planning

`ink compile` searches implementation knowledge, checks complete transformation
chains and emits literal applications. Search and proof work happen before the
application runs. A resource budget bounds work; it does not impose a layer order
or a fixed number of optimisation rounds.

```sh
ink compile app.ink --optimise /path/to/ink-knowledge \
  --snapshot /path/to/ink-knowledge/store/snapshots/SNAPSHOT.json \
  --target rust --search-budget 16384 --state-limit 4096 \
  --planning-seconds 3600 -o build/app.rs

ink compile app.ink --plan build/app.rs.planning.json \
  --target rust -o build/replayed.rs
```

The first command saves its selected proof packet, search receipt and independently
admitted candidates in the database. Supply `--profile`, `--workload` and
`--target-profile` to rank the candidates with comparable lifecycle measurements.
Without comparable evidence, physical selection retains the source baseline.
An old measurement cannot silently become evidence for a new compiler, emission
lane, source, boundary or target. Frozen replay rechecks proofs and requires no
Python search process.

The Python entry point, `planner/compile_plan.py`, additionally exposes semantic
search, process, memory and proposal budgets. Omitting `--semantic-rounds` permits
search to a fixed point or a resource limit. Zero proof budget still distinguishes
untrusted discovery from admission. An explicit snapshot pins discovery; immutable
step views keep their original snapshot bindings after candidate publication.

## Knowledge owns transformations and strategies

`knowledge/ink_knowledge/implementation-recipes.json` declares installed producer
recipes, input requirements, parameter domains, stages and proof obligations.
Canonical `definition` entries with semantics `ink-planning-recipes-v1` and a
`recipe` payload extend the pinned recipe set; a published recipe may override a
resource preset with the same ID. Conflicting published IDs fail closed. Adding an
implementation family changes knowledge, rather than planner algorithm dispatch. A recipe cannot download and execute an arbitrary command. It chooses an
installed, independently pinned producer; its output remains untrusted.

Recipes cover semantic laws and installed specialisers, complete action replacement,
published implementation packages, all public representation producer options,
indexed and grouped maintenance, caches and deltas, column and packed layouts,
partitions, sequence trees, scalar carriers, compact observers, representation
products, general first-order definition choices, properties, physical choices,
pure placement and migration bridges. Publication and discovery are paginated.
The coverage audit authenticates every catalogue entry and fails on an unknown
kind/semantic domain. Dependencies and diagnostic evidence are distinguished from
standalone replacement candidates. Inapplicable families, unsupported capabilities,
rejected proofs and exhausted budgets have explicit receipts.

Recipe input metadata permits exact, process-local reuse of untrusted proposals when their source, requirements, compiler, code, pin and budgets are unchanged. Final admission is never cached by a producer. Discovery visits every registered family before spending the state's proof budget,
and interleaves their proposals. Streaming retains complete rows from a producer
that reaches a process limit. A full catalogue pass does not mean every theorem
applies to a particular source or target; applicability still requires proof.

Core and the lowerers no longer construct reduced observers or synthesise query/transition envelopes. The residual-execution producer authors smaller private carriers, reconstructs the complete observer from decoded next state and proves the full observer, compact observer and state-preservation equations with the unchanged kernel. A database representation can supply
an ordinary equality proof and a compact observer. Without one, the complete
observer executes. `collection_facts` now contains only lexical place and alias
helpers. Collection length, capture, freshness and field analyses are producer
hints; a hint cannot grant aliasing, allocation, ownership or rewrite authority.

## Checked properties and physical plans

A source property specifies a function, a typed observation of its actual result,
a value and an equality proof. The observation must mention its distinguished
subject. The checker elaborates the real function body and validates the equation
under its real parameters. Property packets bind the complete source image.
Semantic search can reuse certified equations as premises; final selection replay
checks those proofs again with their exact dependency closure.

A physical plan names ordered/indexed table storage, lexical list or stored-row
borrow sites, shared/packed datatype storage and identity memo sites. Site identities
select expressions or declarations already admitted under an exact source and
representation. Generic carrier, key, lexical typing, ownership and lifetime checks
remain mandatory. Representation plans cannot request irrelevant source-table
strategies. Rust and Rust-Wasm implement borrowing, indexing, packed storage and
memoisation. Other backends explicitly decline those physical capabilities.

The backend emits the strategy selected in the packet. ABI correctness, ownership
primitives, native/JavaScript code generation, toolchains and device drivers remain
trusted. These certificates do not prove generated machine code correct.

## Recursive composition and selection

A sealed compiled plan contains independently checked rewrite, representation,
definition, property, physical and routing steps. Expression and complete-action
rewrites stay separate proof steps, but may recur anywhere in a search chain.
A changed source invalidates stale representations, properties and placement.
Every resulting module must preserve the original public signatures, effects,
logical state schema and checkpoint namespace. Definition replacements compose by
replaying earlier exported-function equations in the new admitted closure.

The planner memoises exact typed implementation states and checked edges. A process-local checker reuses sealed prefixes only after comparing exact canonical proof bytes; modified prefixes are checked anew. Frozen output receives a fresh whole-chain replay. Backend-ineligible intermediate states remain searchable, while final physical ranking excludes unavailable emission capabilities. Layout,
maintenance, memory and placement differences stay distinct. Semantic search retains
admitted alternatives and deferred branches, including a temporarily more expensive
route to a better later result. Cycles, proof work, retained bytes, process time and
state count bound exploration. None of these hashes confer proof authority.

All retained complete chains can be published and measured. There is no 32-candidate
ceiling. Measurement paging covers more than 1024 plans and repetitions. Lifecycle
profiles can charge proof checking, compilation, construction, actions, checkpoint,
restore and migration; a memory limit requires measured memory, never an invented
zero. Comparable complete measurements govern selection. Structural prices only
order exploration. Historical target-work diagnostic models with incompatible
cohorts or explicitly provisional publication status do not become default policy.

## Pure placement with maintained state

For `wgpu`/`webgpu`, a representation and pure route emit one application facade.
Native `State` provides ordinary state methods and `call_json`; browser
`ink-plan.mjs` provides `loadInk` and `createState`. Transactional actions retain
ordered host execution. The selected public pure entry executes its checked route;
other public pure functions retain literal CPU implementations. Snapshot restore,
acknowledgement and transaction boundaries belong to the maintained state component.
A CPU emission lane rejects placement rather than silently ignoring it.

Placement controls public pure entry execution. It does not move arbitrary calls
inside a transaction onto a GPU. Recursive maintained definitions remain on the
host, and device failure retains the existing CPU fallback contract. Backend
capability and complete lifecycle profitability remain separate gates.

## Validation

`tests/database_planning.rs` and `tools/database_planning_conformance.py` exercise a
real action rewrite → representation → compact observer → residual execution → properties → discovered
endpoint theorem → physical choice → pure route chain. The independent original
source supplies replies, errors, ordered events and exact portable checkpoints.
The executable tests include failed changes, acknowledgement, transaction rollback,
restore after every request, corrupt snapshots and counter exhaustion. With the
mandatory environment they run all five CPU lanes and actual wgpu work.

Planner tests exercise recursive layers beyond old ceilings, cycles, alternative
proofs, expensive intermediate states, reusable property premises and resource
exhaustion. Store tests authenticate paged measurements across 1200 candidates and
2400 observations, including forged disposable-index rows. Registry tests prevent
new representation parameters or semantic domains from silently lacking discovery.
Conformance establishes tested correspondence; it is not a universal speed claim.

The checked validation receipts are in
`reports/database-planning-2026-10-12/checks.json` and `registry-audit.json`.
The mandatory CPU run passed 136 tests in 29 suites. Browser validation compared
22 exact state histories and required an actual WebGPU stage. The registry audit
covered 14,268 authenticated entries and 1,605 operation names, visiting all 36
families under its discovery budget. Separate package-loaded sequence-tree
authoring and kernel admission validate the import repair found by that audit.

A broader historical Python sweep ran 311 tests: 110 passed, 136 skipped and 65
reported missing archived research fixtures or frozen compiler binaries. Those
historical files were not replaced with current proofs or compilers. The current
planner, registry, store, candidate-publication and independently pinned package
checks pass; the receipt lists every historical missing-file error.

The relocated bundle test passes recursive planning and candidate publication.
It then removes planner/database resources and empties `PATH`; frozen replay
produces byte-identical Rust output using only the installed checker.

PR28 was integrated with current main’s Boolean keys, recursive nominal rows,
small authenticated proof leaves and borrowed admission. The combined graph
passes121 standalone core tests,71 planner tests,22 store tests, all54 grouping
law families, all-key and recursive-row histories on every CPU lane, actual
wgpu/WebGPU execution, and relocated cold discovery plus offline replay.
`main-integration-checks.json` preserves exact package/compiler provenance and
keeps earlier benchmark acquisition identities separate from this refactor.

Database algorithms can also introduce checked source helpers and intermediate types before proving replacements. See [database-authored algorithms](database-executable-extensions.md) for the extension protocol, generic recipe and physical description capabilities.
