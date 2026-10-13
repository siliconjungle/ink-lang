# In-place list appends

`xs.concat(ys)` builds a new list. When nothing can observe the old `xs`
afterwards, the JavaScript and C backends now extend `xs`'s storage instead of
copying it. Accumulating loops that were quadratic become linear:

```ink
pub fn distinct(xs:List<u32>)->List<u32>{
  return foldl(xs,S{seen:false,last:0,output:[]},fn(x)=>fn(a)=>
    choose(!a.seen || a.last!=x,S{seen:true,last:x,output:a.output.concat([x])},a)).output;
}
```

This is a lowering fact. It changes no program's meaning, adds no proof rule,
and is not a rewrite: every program keeps its exact values, and only where a
backend writes them changes.

## When storage is reused

`core/src/in_place.rs` decides, per function, which `concat` receivers may be
extended. A receiver (a variable, or a field of a variable) qualifies only if
all of the following hold:

1. **Final use.** No later evaluation can read the same place. Liveness is
   branch-aware: each arm of `choose` and the right side of `&&`/`||` is
   analysed separately, and field places (`s.out`) are tracked apart from
   their record.
2. **Unique storage.** The value's outer list was freshly allocated in this
   function and has only moved since:
   - Fresh allocations are list literals and list operations that build a new
     list (`concat`, `map`, `filter`, `take`, `drop`, `sort`, `scan`, `zip`,
     `map_indexed`).
   - Ownership moves through final uses, `let`, record fields, `choose`, and
     the accumulator of `foldl`/`foldr`. The accumulator is owned only when
     the initial value is owned and every step returns an owned accumulator;
     this is an induction over iterations. Any site found under a failed
     assumption is discarded.
3. **No retaining earlier use.** An earlier, non-final occurrence counts as a
   read only in these positions:
   - the receiver of a list operation;
   - an operand of a comparison or arithmetic;
   - the list folded over;
   - an argument to a function whose result contains no list.

   Anywhere else (bound to another name, stored in a record or list, returned
   from a branch, passed to a function that may return it) it may be retained,
   and the place is never reused.

Some values are never owned:
- parameters;
- list elements;
- anything a callback captures, since callbacks may run repeatedly;
- recursive functions, which keep the copying path.

Anything the analysis cannot type or bound fails closed to copying.

## Evidence

**Unit tests** (`core/src/in_place.rs`). The analysis accepts:
- accumulating loops;
- reads followed by a move.

It refuses:
- parameters;
- aliases;
- callee results;
- captures;
- elements;
- parameter-initialised and leaking accumulators.

**Conformance** (`bench/in-place/conformance.py --c`). `aliasing.ink`
contains 14 functions, covering every sharing pattern the analysis must refuse
and the loops it should speed up. On 168 random cases, the JavaScript and C
outputs equal the reference interpreter's, and no input is mutated. 8
JavaScript sites and 5 C sites are reused; JavaScript has more because each
list result also has a destination-passing variant.

**Timing.** Unplanned output was compared before and after this change, on
the planning corpus's 24 held-out inputs per program, using paired
interleaved samples (`bench/planning-corpus/evaluate.mjs`):

| Program | JavaScript geomean | Robust gains / losses | Largest input |
|---|---:|---:|---:|
| incremental-distinct | 10.05× | 17 / 1 | ~500× at 16,381 items |
| compact-set | 1.24× | 18 / 0 | 1.3–1.5× |

The one loss is `7-clustered` (0.82×), a 7-item input.

For C, process-level wall time includes startup and JSON decoding, so
instruction counts are the more reliable signal (callgrind, one 16,381-item
call):

| Program | Instructions before | After | Wall time (15 paired runs) |
|---|---:|---:|---:|
| incremental-distinct | 261.8 M | 120.6 M | 1.25× faster |
| compact-set | 468.5 M | 469.2 M | 0.90× (slower) |

In C, record construction and field reads copy list values, so reuse saves
less there. compact-set's slower wall time is not reflected in its instruction
count. Its inputs have at most 257 distinct values, so the appended list stays
small and the run time is dominated by membership tests the change does not
touch. The slowdown is reported as measured, without an explanation.

## Limits

- Only `concat` receivers are reused. `map` and `filter` over an owned list
  could also write in place; they still allocate.
- C's value ABI copies lists into records and out of fields, which limits what
  reuse can save there. Handle-based records would be the larger change.
- The analysis is per function and intraprocedural: a callee's parameter is
  never owned, even when every caller passes a fresh list.
