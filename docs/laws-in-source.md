# Laws in source

Ink has one source form for laws, `law`. It covers concrete rewrite laws and
general laws: type parameters, function parameters, conditions, quantified
assumptions and proofs. `rewrite` blocks are its concrete special case and keep
their identities. Laws live in external law sources (for example
`knowledge/libraries/general-laws.ink`) and are checked with `ink emit-laws`.
Executable sources reject `law` declarations.

```ink
module ink.knowledge.general_laws;

law map_fusion<A, B, C>(xs: List<A>, f: fn(A) -> B, g: fn(B) -> C) {
    xs.map(f).map(g) == xs.map(fn(x) => g(f(x)));
    proof by induction xs;
}

law fold_append<A, M>(xs: List<A>, ys: List<A>, w: fn(A) -> M, zero: M, plus: fn(M, M) -> M) {
    assume zero_left(a: M): plus(zero, a) == a;
    assume associates(a: M, b: M, c: M): plus(plus(a, b), c) == plus(a, plus(b, c));
    foldr(xs.concat(ys), zero, fn(x, acc) => plus(w(x), acc))
        == plus(foldr(xs, zero, fn(x, acc) => plus(w(x), acc)), foldr(ys, zero, fn(x, acc) => plus(w(x), acc)));
    proof by induction xs { ... };
}

// An instance: the assumptions hold for u64 addition by computation.
law sum_append_u64(xs: List<u64>, ys: List<u64>) {
    foldr(xs.concat(ys), 0, fn(x, acc) => x + acc)
        == foldr(xs, 0, fn(x, acc) => x + acc) + foldr(ys, 0, fn(x, acc) => x + acc);
    proof by use fold_append(xs, ys, fn(x) => x, 0, fn(a, b) => a + b);
}

law map_set_get_other<V>(m: Map<u32, V>, k: u32, j: u32, v: V, d: V) {
    requires distinct: (j == k) == false;
    m.set(k, v).get_or(j, d) == m.get_or(j, d);
}
```

```sh
ink emit-laws knowledge/libraries/general-laws.ink -o general-laws.json
python3 knowledge/producers/source_laws.py --compiler ink \
    --source knowledge/libraries/general-laws.ink --output-store STORE
```

## Declarations

```
law NAME<T, ...>(PARAMS) {
    requires [LABEL:] CONDITION;            // zero or more
    assume NAME(PARAMS) [requires C, ...]: LHS == RHS;   // zero or more
    LHS == RHS;                              // or: from LHS; to RHS;
    proof by TACTIC;                         // default: normalize
}
```

- **Type parameters** `<T, ...>` are opaque while the law is proved: no
  operation compares, orders, builds or computes with their values. So the
  proof holds for every type, and uses supply any type (`use law<u32, Bool>(...)`,
  or inferred from the value arguments).
- **Function parameters** `f: fn(A) -> B` are universally quantified total
  functions. `fn(A, B) -> C` is the curried `fn(A) -> fn(B) -> C`; apply it as
  `f(a, b)`, pass it bare (`xs.map(f)`), or write lambdas `fn(a, b) => e`.
- **Conditions** (`requires`) are hypotheses while proving and premises at
  every use. `a == b` is an equation (oriented from `a` to `b`); any other
  condition is a Bool fact `c == true`.
- **Assumptions** (`assume`) are quantified hypotheses about the parameters,
  such as associativity of a function parameter. Proofs use them with
  `assumption`. Every use of the law must prove each assumption for its
  instance (usually by `normalize`).
- **The statement** `LHS == RHS` is the law, oriented for rewriting. A
  statement that is not an equation is a Bool fact.

## Proofs

| Tactic | Meaning |
|---|---|
| `normalize` | both sides have the same normal form (computation, conditions as oriented rewrites, the polynomial decision procedure for words and `Int`) |
| `induction xs` | list induction; both cases by `normalize`, the step with the induction hypothesis |
| `induction xs { nil => P; cons(h, t) => Q; }` | explicit cases and names |
| `induction xs generalizing (s) { ... }` | the hypothesis is quantified over `s`; use it with `ih(s = e)` |
| `ih` / `ih(x = e, ...)` | the latest induction hypothesis |
| `cases c { true => P; false => Q; }` | Bool case split; `c == true/false` is added |
| `cases o { none => P; some(v) => Q; }` | Option cases |
| `cases r { ok(v) => P; err(e) => Q; }` | Result cases |
| `calc { _ == m1 by P; == m2 by Q; == _ by R; }` | a chain of equalities |
| `symmetry(P)` | swap the sides |
| `congruence(P, ...)` | equal heads, one proof per argument (one for a lambda body) |
| `use law<T...>(args) [requires (P, ...)] [assuming (P, ...)] [exactly]` | an earlier law, instantiated; premises and assumption instances default to `normalize`; both ends may differ from the instance up to normalisation unless `exactly` |
| `assumption name(args) [requires (...)] [exactly]` | an assumption of this law |
| `hypothesis N` / `hypothesis label` | a condition or case fact |
| `assert a == b by P then Q` | prove `(a == b) == true` (words, Bool), then use `a = b` |
| `provided` | kernel evidence supplied with `--proofs` |

Tactics only build kernel proofs. The checker in `core/src/laws.rs` checks
every law independently, against its own definition context.

## What the kernel gained

The semantic law kernel (`ink-conditional-laws-v1`) now has:

- `Law.types`: type parameters, added as fresh opaque identifier types while
  the law is proved and replaced by real types at a use.
- `Law.assumptions`: quantified hypotheses over the law's parameters and their
  own parameters, used by `Proof::Assume` inside the law.
- `Proof::Use { types, assumptions }`: instantiate a law's type parameters and
  prove each of its assumptions for the instance, universally in the
  assumption's own (fresh) parameters, under its conditions.
- `Proof::Variants`: exhaustive Option/Result case analysis of a variable.

Laws with type parameters or assumptions, or whose proofs use these rules,
carry the marker `ink-general-laws-v1`; all other laws keep
`ink-conditional-laws-v1`, so existing identities are unchanged. Executable
selection applies only concrete laws: a general law reaches a program through
a concrete law that uses it, so its assumptions are always proved.

The semantic fragment also gained Option/Result constructors (`Some`, `None`,
`Ok`, `Err`), their fold reductions, and `map`, `map_err` and `ok_or` as folds
that rebuild the variant. Programs using them can now be reasoned about and
optimised.

## Coverage

`knowledge/libraries/general-laws.ink` checks laws over:

| Data | Examples |
|---|---|
| lists | map/filter fusion, map/filter over append, concat associativity, lengths, `foldr`/`foldl` laws, the first-order library's sum laws for any monoid |
| Option, Result | map fusion and identity, `ok_or` with `map`, `map`/`map_err` commuting |
| maps (`Map<K, V>`, word or Bool keys) | get after set (same key, other key), contains after set, get after remove |
| buffers | freeze after push |
| records, vectors | field projection |
| `Int`, words, Bool, generic values | ring laws, wrapping, Bool cases, `choose` |

## Limits

- Type parameters have no operations. Laws needing equality, order or
  arithmetic on a parameter must be stated per type (or through function
  parameters and assumptions).
- Map keys are words or Bool, so generic map laws range over values, not keys.
- `Table` is a state root, not a value: laws about tables are action laws
  (`knowledge/producers/action_laws.py`), not yet in this form.
- Records have no eta rule and enums have no case analysis yet.
- The first-order kernel's general laws (`docs/general-laws.md`) remain
  library entries; the same laws are now stated and checked in source here.
