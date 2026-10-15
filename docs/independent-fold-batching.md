# Proved independent fold batching

`knowledge/libraries/independent-fold-batching.ink` proves, for arbitrary item
and state types and a total pure step:

```ink
states.map(fn(state) => foldl(xs, state, step))
== foldl(xs, states, fn(item, current) =>
     current.map(fn(state) => step(item, state)))
```

The proof is induction over the input list, generalising the states. It composes
the ordinary map identity and map fusion laws. Every state sees the same input
order and the same sequence of step applications. No associativity, commutativity,
floating-point reassociation or fixed list length is assumed. A state may be a
record containing an immutable column index and a changing accumulator.

This permits one input traversal to advance several independent results. It is
one ingredient of matrix blocking, but does not yet prove chunking, introduce
fixed-width tiles, or automatically replace the existing matrix multiplication
library. This first template excludes a callback which captures the original
outer seed when it cannot express it as a step shared by every lane. The source
template below supplies that missing state conversion as another proved option.

## Database authoring and discovery

`ink_knowledge.law_templates.from_general(store, law_id)` creates an indexed
template for a snapshot-owned polymorphic semantic law without assumptions or
conditions. It preserves the type parameters, both endpoints and the law's
parameters; an instantiated proof uses the original law. Assumption-bearing laws
still need explicit premise synthesis and cannot pass through this factory.

Templates can now declare `fixed_dependencies` alongside dependencies that are
themselves type-instantiated templates. Fixed dependencies must be rewrite
entries authenticated in the pinned snapshot. Their identities remain in the
concrete proof closure. Limits on dependency count, template count and depth
continue to apply. The same mechanism can expose other authored general laws;
there is no batching-specific matcher or compiler rule.

Publish the checked law bundle with `Store.extend`, create the template with
`from_general`, and extend the same store with that template. The existing
structural index and higher-order matcher infer the applicable types and callback
arguments from ordinary source. They produce concrete laws and source adapters.
Normal kernel replay checks the generic law, all supporting lemmas, type
instantiation and the exact source endpoint. Template metadata grants no proof
authority. Publication never makes supporting lemmas into search rules unless
they too have an indexed template.

## Validation and selection limits

`knowledge/tests/test_general_templates.py` checks discovery for wrapping words,
non-associative floating-point arithmetic and record states. It checks rejection
of a captured-seed mismatch, a consistently rehashed dropped-input rewrite,
missing snapshot dependencies, a dependency with the wrong role, and an attempt
to erase a law's unproved conditions.

`tests/independent_batches.rs` checks 63 cases against original reference
evaluation and the selected reference, Rust, JavaScript and Rust-Wasm programs,
including exact portable snapshots. Cases cover empty inputs and states,
wrapping indices, missing matrix elements, signed zero, subnormal values,
infinities and raw NaN inputs. These are conformance checks, not performance
measurements or evidence of device GPU execution.

The transformation can increase intermediate allocations or change locality in
an unhelpful way. It remains an alternative for ordinary offline planning;
selection requires comparable lifecycle evidence. There is no static dominance
exception for batching and no claim of automatic matrix speedups from these
checks.

## Captured per-result data

`producers.captured_fold_batching.templates(map_fusion_id)` authors a second
database template for this ordinary source form:

```ink
envs.map(fn(env) => foldl(xs, initial(env),
    fn(item, state) => step(env, item, state)))
```

The template introduces a private record with `environment` and `state` fields,
initialises one record per result, advances their states in an input traversal,
and projects the final states. Every record retains the original environment.
The type parameters cover input items, environments and accumulators
independently. Callback captures from the surrounding function remain bound.
The proof generalises the initial-state function in an induction over `xs` and
uses the supplied general map-fusion law. It does not assume arithmetic laws.

This is source-algorithm data: typed record declarations, expressions and an
ordinary proof. The existing extension checker authenticates the enlarged
source image. The general source-algorithm producer now shares the same
higher-order adapter builder as law templates: exact source endpoint, checked
normalisation, and ordinary use of the instantiated theorem. It does not add a
compiler matcher or select an implementation on correctness evidence alone.

The adapter rejects open lexical sites. Conditions remain explicit proof
obligations; matching does not discharge them or any quantified assumptions.
When each result iterates a different input sequence, the shared-input template
does not match. Tests cover both a directly captured list and an input filtered
by the environment. A rehashed change that substitutes the evolving accumulator
for the original environment fails proof replay. Normal quick search finds the
extension/rewrite composition and retains the baseline without cost evidence.

Both original independent batching and captured-state batching pass the 63-case
reference/Rust/JavaScript/Rust-Wasm suite. The latter composes four source
rewrites, including the original-seed callback, floating arithmetic and matrix
column records. This demonstrates automatic carrier introduction and checked
composition, not profitable fixed-width matrix blocking. Private records and
intermediate lists can add allocation; selection still needs lifecycle timings.

## Fixed product reductions

`producers.product_fusion` also proposes ordered traversal sharing for independent
record fields and Vec2/Vec3/Vec4 lanes. It derives the callbacks and seeds from
the actual source, proves the complete product replacement by generalized
induction, and lets normal discovery offer the checked alternative. The same
database construction covers left folds and equally bounded `repeat_until`
reductions with a constant-false stop. Different input sequences, unequal bounds
and nonconstant stops are excluded. No arithmetic reassociation is assumed.

Vector products use the existing vector constructors and field meanings. No core
primitive, executable syntax or backend algorithm matcher is added. The source
test covers wrapping words, non-associative floating operations, and a four-output
matrix microtile; consistently rehashed coupled-lane and changed-count/index
variants fail kernel replay. Discovery tests use synthetic structural prices to
reach the rewrites; those prices do not establish a performance improvement.
The mandatory `independent_batches` suite compares 44 vector-product cases on
original/selected reference evaluation, native Rust, JavaScript and Rust-Wasm,
including float bit patterns, empty inputs, wrapping indices and exact snapshots.
Introducing tiles throughout an arbitrary matrix iteration space and selecting
them profitably remain separate work.
