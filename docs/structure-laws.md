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
| `choose(x > a, x, a)` (maximum) after `sort()` | sort erasure | not admitted |
| `[x].concat(a)` after `sort()` | sort erasure | none: order-sensitive |

The emitted JavaScript for the product checks `acc === 0n` each iteration and
matches a reference implementation, including inputs where wrapping arithmetic
reaches zero part-way through.

## Limits

- The maximum is correct but unproved: its swap needs antisymmetry of `>`, which
  normalisation does not decide. The same order decision procedure is what
  min/max/top-k maintenance needs ([incremental operators](incremental-operators.md)).
- Witnesses are deliberately small. An absorbing state that is not a canonical
  constant or a literal in the site is not found.
- Instances are checked at planning time, costing one `knowledge-check` process
  each (at most 64 per program, at most 20 seconds).
- Admission is not selection. An early exit adds a test to every iteration, and
  the study in `reports/knowledge-growth-2026-10-13` measured both gains and
  losses for the Boolean case. Measured selection still decides.
