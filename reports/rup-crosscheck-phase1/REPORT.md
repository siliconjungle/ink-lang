# Independent replay of accepted bit-proof certificates

`tests/rup_crosscheck.rs` loads every proof-library lockfile in the pinned
knowledge catalogue with `library::load`. While it does so,
`bitproof::audit_accepted` records each hinted-RUP refutation that Ink's checker
*accepts*. The hook only observes: it never changes acceptance, and it records
nothing outside that call.

Each distinct refutation is exported three ways:
- the CNF as DIMACS
- the steps as DRAT (clauses only)
- the steps as LRAT (Ink's zero-based hints become one-based clause IDs)

Three independent checkers then replay them:

| Checker | Input | Source |
| --- | --- | --- |
| drat-trim (searches its own propagation) | DRAT | github.com/marijnheule/drat-trim @ 2e3b2dc0 |
| lrat-check (follows the given hints) | LRAT | same repository, `lrat-check.c` |
| **cake_lpr** (formally verified in CakeML/HOL4) | LRAT | github.com/tanyongkiam/cake_lpr @ a36874a8, `cake_lpr.S` sha256 2f3af32d… |

**Control.** Each certificate is also replayed against the CNF with its final
clause removed. That clause asserts the two endpoints differ, and without it the
formula is satisfiable. All three checkers must reject the original proof there.

## Result (ink-lang c012588 + this branch, knowledge pin 0db77af8)

- 34 lockfiles were found. 31 proof libraries load. The other 3 are old
  `verify-database` scalar-rule locks with no bit proofs.
- There are **17 distinct accepted refutations**:
  - 6–22,753 variables
  - 14–76,322 clauses
  - 9,371 lemmas in total
- **All 17 verify in drat-trim, lrat-check and cake_lpr.**
- **All 17 goal-free controls are rejected.**
- There are no disagreements.

Per-refutation data is in `report-external.json`. It was written by the run with all three checkers configured, and its `checkers` field lists them. An export-only run writes `report-export-only.json` instead.

## Scope

This establishes that Ink's RUP checker accepted only refutations of the CNFs it
built. It does not establish that a CNF encodes the source equation. That
circuit encoding (`bitproof.rs` Tseitin construction) stays trusted, and is
exercised separately by the circuit-evaluation unit tests and
`tools/check_bitvector_semantics.py`.

## Reproduce

```sh
git clone https://github.com/marijnheule/drat-trim && (cd drat-trim && make && gcc -O2 -o lrat-check lrat-check.c)
git clone --depth 1 https://github.com/tanyongkiam/cake_lpr && (cd cake_lpr && make cake_lpr)
INK_DRAT_TRIM=$PWD/drat-trim/drat-trim INK_LRAT_CHECK=$PWD/drat-trim/lrat-check \
INK_CAKE_LPR=$PWD/cake_lpr/cake_lpr cargo test --release --test rup_crosscheck -- --nocapture
```

Without the environment variables, the test still exports and audits every
refutation, and skips the external replay. cake_lpr is run with
`--CML_HEAP_SIZE=2048 --CML_STACK_SIZE=1024`.
