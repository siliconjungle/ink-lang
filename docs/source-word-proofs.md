# Checked word equalities in source laws

`laws::Proof::Word` connects ordinary source equalities to the existing bounded
bit-vector/RUP checker. The compiler reconstructs the obligation from the typed
law endpoints and the explicitly selected, already established hypotheses. It
checks the supplied certificate against that obligation. A hash, profile or
producer name grants no authority.

The current bridge admits first-order `u32`, `u64` and `Bool` expressions:
wrapping addition, subtraction and multiplication, bitwise AND/OR/XOR, unsigned
comparisons, Boolean connectives and choice. Each `u32` input and intermediate is
masked before an enclosing comparison. Input aliasing is preserved while uniform
renaming is permitted when a law is opened under a callback. Signed words,
floats, collections, opaque calls and binders within a word obligation fail
closed. This does not prove a whole lexer or a maintained representation.

OR and XOR are reconstructed from fixed finite-word meanings in the existing
circuit language. Generated copies consume the shared proof work budget before
allocation. The bridge adds no solver, algorithm recogniser or source syntax.
Authoring and search remain outside core; this is a new connection to existing
proof machinery, not a backend correctness proof.

`tools/author_semantic_word_examples.py` authors the experimental certificates
using an external SAT solver and the standalone core obligation exporter.
`core/tests/semantic_word_laws.rs` replays five examples and rejects changed
goals, missing premises, changed widths, unsupported types, invalid certificates
and exhausted budgets. The same certificate bytes are installed as untrusted
knowledge data in `producers/data/source-word-laws.json.gz`; `word_laws.py`
proposes matching laws through the ordinary producer catalogue. The standalone
core fixtures remain independent of the knowledge checkout.
`tools/prepare_word_example.py` exercises normal publication and checked selection
against a private knowledge store.

The portable integration test checks the original and selected ASCII range
predicate under callbacks. Separate native-oracle cases exercise all fixed word
operations at shift/rotation boundaries on unsigned and signed inputs, requiring
actual GPU execution when the GPU test environment is enabled. The two
integration tests pass across C, Rust, JavaScript, both Wasm targets
and actual GPU execution. The boundary test compares 1,470 records with eight
word results each against an independent Rust oracle; the original and selected
range predicates each execute four nonempty GPU calls. This tests the admitted
cases, not universal backend correctness.

Correctness, target eligibility and profitability remain separate. A proved
range-to-mask rewrite need not be faster, and retaining GPU eligibility is not a
performance result. The unchanged-lexer experiment in `bench/lexer-word` shows
that the law improves some inputs and regresses others. It remains a candidate,
never an unconditional replacement. The explicit scanner in `bench/lexer-runs`
is a separate algorithm experiment, not a proved whole-scanner replacement.

Browser validation adds 37 comparisons across JavaScript, packed C-to-Wasm and
WebGPU, including 11 required device calls. All fixed-word boundary values are
parsed losslessly, including U64 values above JavaScript's exact Number range.
The browser checks run from the existing mandatory browser conformance entry
point.

The fixed JavaScript planning corpus completed at distribution `6c6ce857` and
knowledge `36b2faab`: 10/10 programs compile, all ten admit rewrite alternatives,
two select an alternative, and eight reach the measurement-budget gate. There
are 35 admitted laws, six reused in multiple programs, and no admitted physical
representation. The stored Boolean-choice word law is used by admitted candidate
plans in both `text-lines` and `bulk-update`; neither program selects an alternative
under this budget. This demonstrates cross-program applicability, not a measured
speedup. The report, exact context hashes and entry attribution are preserved in
`reports/source-word-laws-2026-10-14`.

Newer unrelated state-protocol proposals and Frontier measurements were merged
after this frozen evaluation. The report describes its recorded revision pair;
it is not a rerun on the subsequently merged publication.

## Bounded RUP hint transport

A RUP step may optionally carry `hint_deltas_v1` with an empty `hints` array.
Absent that field, legacy certificate serialization stays byte-for-byte unchanged.
This is a lossless encoding of the same ordered zero-based clause references;
it is independent of circuit sharing and source-semantic versions. It introduces
no theorem, normalization, source-operator rule or trusted search.

References start from zero independently in each step. Each signed difference is
zigzag encoded (`2*d` for nonnegative differences, `-2*d-1` otherwise). Five payload
bits per digit are written least-significant first. Bit five means continuation;
digits use `ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_`.
The last group of a multi-digit value must be nonzero. Every value uses at most
four digits, yields a reference below 320,000 (the existing maximum CNF plus
learned-clause capacity), and each step retains the existing 100,000-hint bound.
Empty packed strings, ambiguous nonempty plain hints, malformed/overlong digits,
negative/out-of-range references and excess hints reject. Future format fields
remain unsupported. No expanded hint vector is allocated by the checker.

Every decoded reference goes through ordinary strict RUP propagation, including
missing/future clauses, satisfied or non-unit hints, unused hints after a conflict
and the final contradiction check. The circuit is independently reconstructed;
its hash and encoding must still match. Complete semantic and RUP work budgets,
clause/literal/step bounds, canonical authentication and object/catalogue limits
are unchanged. Packing never transfers an old proof identity, measurement or
selection decision to its new bytes.

The untrusted database helpers `rup_transport` and `conditional_cover` package
certificates and propose bounded exhaustive Boolean case trees. Case leaves
explicitly remap only their original selected premises; extra path facts do not
enter the reconstructed CNF. Both operations require complete ordinary replay.
The standalone bitvector author offers opt-in `--pack-hints`; default authoring
and unrelated frozen certificates retain their original bytes. Compaction can
read packed input without mistaking its empty plain array for an empty proof.

Eight retained conditional U64 self-quotient witnesses now form one unconditional
ordinary Cases proof. Lossless hint transport reduces its law from 23,762,435 to
8,305,056 canonical bytes. The complete proof checks under the unchanged shared
budgets and object limits; authentic rehashed malformed/future/ambiguous-hint and
changed-result objects reject. The database adds this source equality alongside
the preceding 337 integer laws, whose identities remain unchanged. This proof
capacity result is separate from target availability, compiled-program timing
and automatic profitability selection.
