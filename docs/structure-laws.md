# Structure laws

Most optimisation knowledge in the store is stated about one kernel at a time:
3,783 concrete rewrites against 24 general laws, with only 23 of 417 measured
entries attributed to more than one program (`knowledge/tools/knowledge_health.py`).
Structure laws state a consequence of an algebraic property once, for every
step that has the property, and reach programs only through instances whose
assumptions the kernel checks for the program's actual step.

## Library

`knowledge/libraries/structure-laws.ink` (source laws) and
`knowledge/producers/structure_laws.py` (JSON laws that need sorted insertion,
which source syntax cannot name) define:

| Law | Statement | Assumption on the step |
|---|---|---|
| `absorbing_foldl<A, S>` | `foldl(xs, z, op) == fold_until(xs, z, fn(x, t) => absorbed(t), op)` | `absorbs(x, t) requires absorbed(t): op(x, t) == t` |
| `absorbed_stays<A, S>` | lemma: an absorbed accumulator is a fixed point of `foldl` | same |
| `fold_sort_{u32,u64,i32}<M>` | `foldr(xs.sort(), z, step) == foldr(xs, z, step)` | `swaps(a, b, s): step(a, step(b, s)) == step(b, step(a, s))` |
| `insert_fold_{u32,u64,i32}<M>` | lemma: `foldr(insert(x, ys), z, step) == step(x, foldr(ys, z, step))` | same |

Each law is checked once by the kernel when it is authored and again whenever a
proof view containing it is admitted. Mutating a proof (dropping the swap step or
an assumption) is rejected, as `knowledge/tests/test_structure_instances.py`
checks. The fold step is a single function parameter. Ink programs write steps as
lambdas, so a parameter in operator position (`plus(w(x), acc)`) would never
match a program's `x + acc`; whole-step parameters bind by ordinary Miller-pattern
matching.

Publish the library into a store with:

```sh
python3 knowledge/producers/structure_laws.py --compiler target/release/ink --root knowledge
```

## Instances at planning time

`knowledge/ink_knowledge/structure_instances.py` runs with the other plan-time
producers (`ink_knowledge.proposals.generate`). For each published general law
with assumptions and no conditions whose operations occur in the program:

1. Match its left side at program sites, binding type parameters and function
   parameters (`TemplateSites` and `higher_patterns`).
2. Enumerate small witnesses for parameters the site does not mention: for a
   predicate over `S`, `fn(t) => t == c` for `c` in `false`/`true`, `0`, or a
   literal from the site.
3. Build a concrete law: the exact site, the instantiated right side, and a
   proof that is `Use` of the general law with one proof per assumption.
   Assumption proofs are tried as normalisation, as an equality asserted from the
   assumption's own condition (for witness predicates), and as case splits on
   the step's `choose` conditions after beta reduction.
4. Keep the instance only if `ink knowledge-check` admits it against the module.

Semantic search treats laws with type parameters or assumptions as dependencies,
not rewrite roots, since the checker never applies them directly.

## Results on probes

| Program step | Law | Instance |
|---|---|---|
| `a && x < cut` (start `true`) | absorbing | admitted, absorbed at `false` |
| `a \|\| x > cut` (start `false`) | absorbing | admitted, absorbed at `true` |
| `a * (x + k)` over u64 | absorbing | admitted, absorbed at `0` |
| `a + x` | absorbing | none: no absorbing state |
| `x + a` after `sort()` | sort erasure | admitted, and selected by structural cost |
| `choose(x > k, a + 1, a)` after `sort()` | sort erasure | admitted after a case split on `x > k` |
| `choose(x > a, x, a)` (maximum), u32 and i32 | sort erasure | admitted by order analysis |
| `choose(x < a, x, a)` (minimum), u64 | sort erasure | admitted by order analysis |
| a maximum clamped at a captured `cap` | sort erasure | admitted by order analysis (4 atoms) |
| `x` (keep the first item) after `sort()` | sort erasure | none: not order-independent |
| `[x].concat(a)` after `sort()` | sort erasure | none: order-sensitive |

The emitted JavaScript for the product checks `acc === 0n` each iteration and
matches a reference implementation, including inputs where wrapping arithmetic
reaches zero part-way through.

## Limits

- Order analysis ([below](#order-analysis)) decides comparisons among at most
  five atoms of one sort. Steps that compare derived values (`x + 1 > a`)
  need the atoms chosen accordingly; the instance producer only offers the
  comparison operands it finds.
- Witnesses are deliberately small. An absorbing state that is not a canonical
  constant or a literal in the site is not found.
- Instances are checked at planning time, costing one `knowledge-check` process
  each (at most 64 per program, at most 20 seconds).
- Admission is not selection. An early exit adds a test to every iteration, and
  the study in `reports/knowledge-growth-2026-10-13` measured both gains and
  losses for the Boolean case. Measured selection still decides.

## Order analysis

Swapping the steps of a maximum needs transitivity and antisymmetry of `>`,
which normalisation cannot supply. The kernel therefore has one more proof
step, `Proof::Order { atoms, body }`, written in law sources as
`order(a, b, s) then normalize`:

```ink
fn max(x: u32, y: u32) -> u32 { return choose(x > y, x, y); }
law max_swap(a: u32, b: u32, s: u32) {
    max(a, max(b, s)) == max(b, max(a, s));
    proof by order(a, b, s) then normalize;
}
```

It checks `body` once for every weak ordering of the atoms: 3 orderings for
two atoms, 13 for three, 75 for four, 541 for five.

**Hypotheses added in each ordering.**
- Atoms that are equal in that ordering are rewritten to their class's first
  member.
- Each comparison between class representatives becomes `true` or `false`.
  Only operators that occur in the normalised goal or hypotheses get these
  facts.

**Why it is sound.**
- Under any valuation the atoms fall into exactly one weak ordering, and every
  fact emitted for that ordering is true there.
- An ordering is skipped only if it cannot occur:
  - two literal atoms contradict it, with signed comparison for i32; or
  - normalising a hypothesis under the ordering's facts gives `true == false`.

**Restrictions.**
- Atoms must be 2–5 distinct terms of one sort: u32, u64, i32 or exact Int.
- `f32` is refused because NaN is unordered.

A new proof form carries the newer law marker (`ink-general-laws-v1`), so
older checkers reject such laws instead of misreading them.

**Instances.** `ink_knowledge/structure_instances.py` offers this proof for an
assumption whose sides compare a few atoms, after looking through `choose`
results. The kernel then decides, as with every other strategy.

**Tests.**
- `core/src/laws.rs`, `order_analysis_*`:
  - maxima and minima swap for every sort and operator;
  - false claims are rejected;
  - transitivity is derived from hypotheses, and fails without them;
  - limits and types are enforced;
  - literal signedness is handled.
- `tests/law_source.rs`, `order_analysis_is_an_authored_tactic`.
- `knowledge/tests/test_structure_instances.py`,
  `test_extrema_steps_commute_by_order_analysis`.
