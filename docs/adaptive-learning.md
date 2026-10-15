# Explicit adaptive computation and learning

Ink now accepts three declaration modifiers:

```ink
trainable state Model:Table<u32,Weights> = Table.empty();
adaptive fn score(context:Context,weights:Weights)->f32 { /* ordinary pure code */ }
adaptive query suggest(context:Context)->f32 reads(Model) { /* readonly code */ }
learn change observe(context:Context,target:f32,rate:f32)
    ->Result<f32,String> reads(Model) writes(Model) { /* authored update */ }
```

See the complete runnable [contextual layout example](../examples/adaptive-layout.ink).
Its model learns a function of width and document length, including their product.
Those interactions let it represent a preference that an additive-only model
cannot fit. Normal queries use the current parameters deterministically. Learning
happens only when a `learn change` is invoked, using explicit observations and an
explicit objective/update rule. Neural networks, search, discrete policies and
other update algorithms can also be ordinary Ink code; these modifiers do not
choose one implicitly.

The checker enforces a write boundary: learning actions may write only designated
trainable states; ordinary changes may not write those states. Existing action
capabilities enforce that restriction through nested calls. Pure adaptive functions
still receive all inputs explicitly and cannot read state. Adaptive queries remain
readonly. Generic adaptive functions carry their marker into concrete instances.
Module imports rename and merge the declarations. Metadata survives executable
transport and is checked again after decoding; it is not an unchecked source hint.
`private trainable state` and `trainable private state` also restrict source imports.

## Offline and online use

```sh
ink train examples/adaptive-layout.ink examples/adaptive-layout-training.json -o model.snapshot
ink build examples/adaptive-layout.ink --target rust -o compiled-layout
ink execute examples/adaptive-layout.ink observations.json --restore model.snapshot
```

`train` runs before deployment or compilation. The trace has schema 1, an explicit
positive epoch count and an `observations` array of `{ "call": "observe", "args": [...] }`.
Only marked learning actions are admitted. At most 100,000 updates are permitted;
each action retains the reference evaluator's normal fuel bound. A rejected update
fails training without exporting a model. The result is a portable checkpoint and
an adjacent `.receipt.json` binding the exact checked module, serialized trace,
checkpoint bytes and update counts. The trace digest hashes its deterministic JSON
serialization, including floating JSON numbers; it is not a knowledge proof hash.
There is no implicit sampling, shuffle, convergence claim or profitability decision.

Restore that checkpoint through the compiled host's ordinary portable restore API.
The checkpoint includes commit history and any explicitly emitted learning events;
it is a full logical snapshot, not merely a tensor file. This first implementation
loads trained data at startup; it does not bake weights into code or constant-fold
through a trained model. Train and compile the same module: a different source
identity requires the existing explicit migration machinery.

At runtime, invoke the same learning action when feedback arrives. Its writes,
errors, event publication, rollback and checkpoints retain ordinary Ink semantics.
No training runs during a query or merely because an adaptive function executes.
Host snapshot restoration remains an explicit state replacement boundary.

## Constraints and mathematical scope

The example fits squared error using an authored SGD update, validates finite
training inputs and bounded candidate weights before mutation, and applies an
authored output projection into `[0.1,0.8]`. A loss penalty alone never authorizes
an illegal output. Other programs must similarly enforce their intended legality
through construction, validations or admitted invariant proofs. The declaration
modifier alone supplies no numerical error or application-specific invariant proof.

The fixed layout/scoring algorithms remain authored code. Learning changes only
the explicitly mutable data. Changing program structure, replacing exact code with
an approximate model and choosing an implementation for performance still need
their own contracts and ordinary proof/applicability/profitability gates.

Automatic differentiation through general source, nonlinear neural model libraries,
explicit hard-decision gradient policies and frozen-weight compiler specialization
remain open work. F32 arithmetic here keeps its existing rounding semantics; an
analytic real-valued derivative must not be described as the exact derivative of
rounded machine arithmetic.

## Validation

The mandatory `adaptive_learning` suite exercises metadata tampering, nested-write
bypasses, imports/generic instances, offline CLI receipts, repeatable fitting of a
non-additive contextual target and held-out contexts. It compares 24 online results
and exact snapshots across reference, Rust, JavaScript and Rust-Wasm, including
rejected updates and rollback after a write. The GPU host compares those results
and performs one required eligible numeric kernel dispatch; learning actions run
on the host. This is conformance evidence, not a proof of the checker or backend.
