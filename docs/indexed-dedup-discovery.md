# Proved ordered deduplication discovery

The knowledge recipe `indexed-ordered-dedup` proposes an index and an owned
output buffer for an ordinary first-occurrence deduplication loop. Discovery
handles a direct list fold or a list observed through record fields, including
records introduced when the frontend elaborates mutable local variables.
The producer recognises membership folds with either order of word equality,
and the structural singleton comparison used by the Set library for word keys.
List observations may occur inside a returned record; the complete enclosing
result, including unrelated fields, remains the equality obligation. Structural
float identity is not replaced with scalar float equality.
It currently proposes U32, U64 and I32 alternatives; other element sorts are
outside this producer's domain.

A proposal adds hygienically named ordinary functions and a private record
through `ink-source-extension-v1`. Its source-bound rewrite composes:

- Predicate-parametric Boolean fold accumulation equivalence.
- The concrete membership bridge, including checked equality symmetry.
- A generic fold-observation law whose complete step obligation must hold for
  every carrier state, not just states encountered in a test.
- The encoded ordered-deduplication law, proved with generic finite-map algebra
  and the existing buffer observation semantics.

The producer does not add a primitive, public syntax, trusted pattern matcher,
state interpreter, or exception to profitability selection. Recognition proposes
proofs; `check-plan` independently replays the extension and equality. Changed
predicates and changed appended values must
not acquire equality authority by matching a nearby pattern. A profile can rank
an admitted implementation but cannot make an invalid proposal executable.

An existing accumulator may be nonempty: its original order and duplicates are
preserved, and only newly appended items are filtered by membership.

The current result is a pure-call alternative. Index construction, output-buffer
construction, lookups and final output materialisation all occur within that
call. The index is not retained between calls. Small inputs can lose to a scan;
ordinary measured selection must retain the baseline when evidence is missing
or fails its gain and memory gates. Automatic discovery alone is not evidence
that the candidate is faster or selected by default.

Validation lives in `knowledge/tests/test_indexed_dedup_discovery.py` and
`tests/indexed_dedup.rs`. The discovery tests exercise renamed programs, the
frozen compact-set source, word widths, record observers, exact first-occurrence
order, unchanged input, and rehashed false proofs. Actual cross-target execution
and performance reports must identify which source, candidate and compiler were
used; earlier explicit-selection timings are not measurements of a new source.

The compact-set source was frozen before this producer existed, but was then used
to develop its discovery. Its subsequent results are development results for this
change, not evidence from an untouched program. Separately generated validation
inputs can reject a selection; only a further, unused evaluation split measures
that selection without influencing it.
