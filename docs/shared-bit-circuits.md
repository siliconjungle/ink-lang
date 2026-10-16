# Versioned Boolean circuits

The bit-vector checker now offers two explicit, fixed encodings of the same
supported total Bool/U64 semantics. `literal-v1` remains the default; existing
certificates omit the encoding field and reconstruct their original CNF.
`shared-v2` folds Boolean constants, repeated/opposite operands and commuted
identical gates. The table is invocation-local. It does not search for source
rewrites, import laws, change supported operators or grant proof authority.

```
ink bitvector-obligation goal.json --circuit shared-v2 -o cnf.json
```

New certificates specify `"encoding":"shared-v2"`. The checker reconstructs that
CNF from the typed statement and selected premises, then checks every hinted RUP
step. Mode substitution, a changed statement, malformed hints and unknown modes
reject. The encoding has its own circuit semantics label and identity. Legacy
CNF identity and serialized bytes remain unchanged; no old proof is silently
re-encoded. Solver/hint construction remains outside Core, in knowledge producers.

`producers/tagged_word_codecs.py` authors 48 bounded word-packing equations for
1–12 tag bits: extraction of tag and aligned payload, removal of tag, and the
53-bit bound. Payload and tag bounds are explicit premises. These are ordinary
locally replayed mathematical theorems. They do not establish correctness of
JavaScript arithmetic, string conversion, native object layouts or a compiler
backend. No private datatype layout is currently admitted or selected by them.

One tagged-word obligation shrinks from 23,523 variables / 78,828 clauses to
631 / 1,763. The 48 new theorem objects total about 1.52 MB; the largest is about
101 KB. Literal generation previously exceeded the 16 MB knowledge-object limit.
This is proof/authoring infrastructure evidence, not a compiled-workload speedup.

The full Core suite, exhaustive Boolean assignments, legacy identity comparison,
all tagged-word replays and corrupted/rehashed certificate tests pass. Distribution
hardening passes 14/16: `fuzz_logic_objects` encounters a historical corpus circuit
identity mismatch and `regression_logic_substitution_copies_are_charged` expects a
resource rejection that the baseline accepts. Both failures reproduce unchanged
against an isolated git archive of `8c2471e6`; they remain open and are not hidden
by excluding tests. See the immutable logs in
`reports/frontier-json-2026-10-13/artifacts/private-value-layout/`.

## Conditional circuits

The opt-in `shared-select-v3` encoding also shares exact conditional gates,
normalizes a negated condition by exchanging its arms, and reduces constant
conditions, identical arms and Boolean constant arms. Its invocation-local table
uses complete circuit-literal tuples. Every stored selection allocates a bounded
circuit variable; existing variable, clause, term, proof-step and replay-work
limits remain unchanged. It uses the same fixed Boolean meanings as the other
encodings, with a distinct CNF label and identity.

```sh
ink semantic-bitvector-obligation source.core.json goal.json --core \
  --semantics fixed-counts-v5 --encoding shared-select-v3 -o cnf.json
```

First-order obligations use `--circuit shared-select-v3`. Certificates explicitly
name the encoding; the checker reconstructs it before ordinary hinted RUP replay.
Literal-v1 and shared-v2 retain their exact identities. No old certificate is
silently migrated, and no circuit tuple supplies source-rewrite authority.
Source equations, solver search and certificate-size choices remain database
work. A smaller CNF does not guarantee a smaller SAT certificate or faster
compiled execution.
