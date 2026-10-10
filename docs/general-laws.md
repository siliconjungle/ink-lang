# General laws

Ink's proof database used to hold only *specific* laws: `map_double_integer`
over integer lists, `filter_is_positive`, and so on. The general form ("for
any `f`, any `p`, any element type") lived only in Lean and in producer code.
Every program had to re-prove its own instance.

The first-order kernel can now state a law once, over abstract symbols, check
it once, store it in the database, and apply it to any program by
instantiation.

## What the kernel gained

Three declarations (`core/src/logic.rs`):

| Declaration | Meaning | Restrictions |
| --- | --- | --- |
| `AbstractSort { name }` | an uninterpreted sort | no constructors: cannot be matched, constructed or used for induction |
| `AbstractFunction { name, params, result }` | an uninterpreted total function | calls never compute |
| `Assumption { params, conditions, from, to }` | a hypothesis schema, such as associativity | usable with `Use`, but makes everything that uses it parametric |

One proof rule, `Proof::Instance`:

```
Instance {
  theorem,                      // a general theorem
  sorts:       { abstract sort      -> sort },
  functions:   { abstract function  -> Lambda { params, body } },  // closed term
  definitions: { derived datatype/function -> existing definition },
  assumptions: { assumption         -> proof for this interpretation },
  arguments, premises,
}
```

The kernel checks an `Instance` in these steps:

1. **The interpretation is exact.** It must interpret exactly the theorem's
   abstract parameters: every abstract sort, function and assumption the
   theorem's meaning or validity depends on, and nothing else.
2. **Each function is a closed term of the instantiated type.** Its only free
   variables are its parameters, and it cannot contain `SelfCall`. So it
   denotes a total function.
3. **Each mapped definition matches.** Its declaration must equal the
   instantiated general one, up to binder names. For a datatype this means
   identical constructors. For a function it means an identical signature,
   recursion index and body, with the function arguments β-reduced
   capture-free. Every parametric definition that the statement reaches must
   be mapped, or the instance is rejected.
4. **Each assumption is proved.** It is proved for the interpretation, in its
   own context, with its own conditions as the only hypotheses.
5. **The conclusion is derived.** It is the instantiated statement, applied
   to the arguments like `Use`.

## Why it is sound

**Parametric symbols are tracked.** Every logic entry records the abstract
symbols and assumptions its meaning or validity depends on. A definition or
theorem inherits them from everything it references. An `Instance` is the
exception: it inherits only from its interpretations, because it discharges
the symbols it interprets.

**Closed obligations stay closed.** `Context::check` refuses any conclusion
that still depends on an abstract symbol or an assumption. Program-level
obligations, such as `verify-view`, go through `check`, so a general law
reaches them only through an `Instance` that proved its assumptions. This
holds even for an assumption with no abstract symbols, such as `0 = 1`. A
theorem proved from it is parametric, and instantiating that theorem would
require proving `0 = 1`.

**Proofs over abstract symbols are valid for every interpretation.** Abstract
symbols can't be inspected or computed. So a proof about them uses only rules
that hold for every interpretation. Assumptions are used only as hypotheses.
Mapped definitions are definitionally identical to the instantiated general
ones, so the instantiated equation is true of them.

The tests in `tests/general_laws.rs` check this behaviour:

- **Wrong mappings are rejected.** This includes a definition that computes
  something else, a missing or extra interpretation, an open or ill-typed
  lambda, an unmapped parametric definition, and mapping a closed definition.
- **The `zero = 1` counterexample is caught.** With `zero` interpreted as 1,
  `sum_filter` is false: the left side is 1 but the right side is 2. Its
  assumption `plus(a, zero) = a` cannot be proved, so the instance is refused.
- **Assumptions don't leak.** A concrete `0 = 1` derived from an assumption
  never reaches `check`.
- **Abstract sorts and functions stay opaque.** Abstract sorts cannot be
  matched, constructed, recursed on or inducted on, and abstract calls do not
  compute.
- **Instantiated lemmas are closed.** They can be reused with `Use`.

## The database

`knowledge/research/general-laws` holds 46 entries. These are imported into
the canonical store; the snapshot grows from 612 to 658 entries, and no
existing entry or name changes. The library contains:

- **Laws:** `sum_map`, `sum_filter`, `sum_congruence`, `sum_append`,
  `map_append`, `filter_append`, `map_fusion`, `filter_fusion`.
- **Their symbols and definitions:** the abstract sorts, functions and
  assumptions the laws are stated over, plus the derived definitions built
  from them.

See the package README for the statements.

## What uses it

Maintained-view proofs (`--prove-views`, [view-decomposition.md](view-decomposition.md))
are now built entirely from instances of `sum_map`, `sum_filter` and
`sum_congruence`. The per-program evidence contains no induction. Before this
change, each program carried one inductive lemma per stage. The bundles are
also smaller: at most 64 objects, down from up to 118.

## Limits

- The logic is still first-order. Abstract functions are instantiated by
  terms, not passed as values. That is enough for the "for any `f`" form of
  the laws.
- Datatypes are not parameterised. A general list is a datatype over an
  abstract element sort, mapped to the program's concrete list sort.
- Source programs cannot yet *state* laws. The laws are written by an
  untrusted producer in the logic's JSON form. A surface `law` syntax would
  need generic types and function-typed parameters in the source language.
