# A proved rewrite of the unchanged lexer

This experiment applies the stored `word_case_ranges` equality to the existing
ASCII lexer, then uses the same checked helper expansion and direct-buffer plan
as the baseline. The source algorithm is identical. The compiler reconstructs the
word circuit and replays its RUP certificate; the knowledge producer contains the
rewrite, not the target lowerer.

Build with `python3 bench/lexer-word/run.py --build-only` (Cargo available), then
run `python3 bench/lexer-word/run.py --measure-only` after compilation and other
measurements stop. The default compiler is the alternate word-checker build;
`--compiler` overrides it. Eight fresh paired processes alternate variant order.
Both binaries include the same independent Rust lexer and allocation/copy costs;
all tokens are compared outside timing before and after each cell. Raw samples,
build hashes and process-level bootstrap intervals are saved in
`build/lexer-word/results.json`. This measures CPU lexer execution, not GPU speed.

At 16,384 code units, the first paired run gives the following ratio of new time
to baseline time (less than one is better):

| Input | Ratio | 95% interval |
| --- | ---: | --- |
| Code-like text | 0.944 | 0.910–0.984 |
| Long identifiers | 0.871 | 0.837–0.894 |
| Numbers | 1.173 | 1.171–1.181 |
| Punctuation | 1.098 | 1.072–1.121 |
| Whitespace | 0.742 | 0.741–0.746 |
| Random ASCII | 1.082 | 1.051–1.104 |

The law is safe but not uniformly profitable. It remains a candidate, not an
unconditional rewrite. The separate `lexer-runs` experiment changes the explicit
scanning algorithm and yields a larger improvement; do not attribute those gains
to this law. Neither experiment is a complete parser or a benchmark of Oxc.
