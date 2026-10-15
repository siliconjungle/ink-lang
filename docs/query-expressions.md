# Typed ordered query expressions

Ordered query expressions expose composition through existing checked list
operations. They do not add a trusted query optimizer or a database backend.

```ink
fn active(xs:List<u32>,minimum:u32)->List<u32>{
 return list<u32>{
   from x in xs;
   where x>=minimum;
   select x*3;
 };
}
```

The explicit element type is checked even when an enclosing context expects a
different result. Inputs must be ordinary finite lists. Results preserve source
order and every duplicate. A single generator elaborates to existing ordered
filters and mapping; nested generators use existing owned output accumulation.
There is no numerical reassociation, deduplication or unspecified enumeration.
Generic element types and nested query expressions use normal specialization.

```ink
record Match{left:u32,right:u32,}
fn matches(xs:List<u32>,ys:List<u32>)->List<Match>{
 return list<Match>{
   from x in xs;
   join y in ys on x==y;
   where x>0;
   select Match{left:x,right:y};
 };
}
```

The first source and every `join` source evaluate once, in written order, before
traversal, even if a source is empty. Join sources are outside the row-binder
scope; use another `from` for a correlated/lateral input:

```ink
fn neighbors(xs:List<u32>)->List<u32>{
 return list<u32>{
   from x in xs;
   where x>0;
   from y in [x,x+1];
   select y;
 };
}
```

Each additional `from` evaluates its source for every surviving prefix row.
Joins enumerate left-major, then right-major, preserving the complete product
of matching duplicate rows. Predicates retain written short-circuit order.
Semicolons separate clauses and may be omitted where the next clause is clear.
Duplicate row binder names reject. Queries admit at most sixteen lowered clauses
(a join includes its generator and predicate), under the normal expression,
specialization and runtime resource limits. At least one `from` is required.

## Existence without materializing matches

```ink
fn overlap(xs:List<u32>,ys:List<u32>)->Bool{
 return exists{from x in xs;join y in ys on x==y;};
}
fn contains(xs:List<u32>,target:u32)->Bool{
 return exists{from x in xs;select x==target;};
}
```

`exists` returns Bool. Its optional `select` is a Bool predicate; omitting it
means true for each surviving row. Empty input has no witness. Existing stopping
fold semantics may visit one lookahead row after success, but no subsequent
predicate, projection or lateral source is evaluated. Independent join sources
have already evaluated once. There is no random choice or hidden clock.

## Actions, proof authority and execution

Actions may use query expressions. Independent input actions remain outside the
pure traversal and execute once in source order. Pure compute regions needing
folds or locally owned storage become ordinary generated helpers with immutable
lexical captures and no escaping owner. This is general surface elaboration,
also available for supported pure folds/temporary regions written directly in
actions. Captured owners, effectful row callbacks, missing capabilities and
unproved helper preconditions still reject during normal whole-module checking.
Failures, staged events and rollback retain the existing transaction boundary.

Elaboration introduces existing typed lexical bindings, callbacks, map/filter,
folds and Buffer operations. There is no executable-core operation/version change
or privileged query theorem. Database laws and candidate packages must establish
every replacement against the resulting checked module. Merely writing a query
does not authorize a different join order, index, maintained result or layout.
Comparable lifecycle evidence remains necessary for automatic selection.

The mandatory generic-library suite compares independent host expectations,
reference execution and native Rust/JavaScript/Rust-Wasm outputs, transactions,
ordered events and exact portable snapshots/restore. GPU hosts retain compiled
CPU execution for unsupported nested collection queries. Eligible single-source
filter/map and existence queries, plus an independent numerical entry, require
real device dispatch in the wgpu leg. Core controls cover hygiene, invalid types/scopes/owners,
unchecked callback requirements, early stopping and raw float bits.

Run the standalone core suite and compiled fixture with the documented toolchains:

```sh
cargo test --manifest-path core/Cargo.toml --test query_expressions
INK_TEST_WASM=1 INK_PARITY_REQUIRE_ALL=1 INK_TEST_WGPU=1 \
 cargo test --test generic_libraries \
 typed_queries_match_host_oracles_and_preserve_transaction_observations -- --nocapture
python3 tools/bench_queries.py --compiler target/debug/ink \
 --output build/query-benchmark --processes 3
```

The benchmark retains complete warm call/output-consumption samples, independent
development/holdout inputs, three fresh processes, randomized lane order,
small/empty/adverse cases and separate emission/build/setup costs. Native Ink
typed calls own their inputs and include cloning reusable caller data; handwritten
Rust controls borrow it. JavaScript compares exported trusted calls with direct
handwritten functions. These boundaries are explicit; a kernel comparison does
not establish storage-engine or whole-application superiority.

The first milestone's [validation and measurements](../reports/ordered-query-expressions-2026-10-15/README.md)
include complete raw samples and handwritten controls. The simple query and
pipeline have similar filter costs; copying, selective filters and nested joins
still expose material gaps. Eligible device execution is conformance evidence,
not a measurement of GPU profitability.

This is the ordered-query foundation of the complete
[implementation programme](optimisation-language-programme.md). Bag/set query
semantics, grouping, distinct/order/top-k/windows, other joins, fixed points,
source-query optimization proposals and external storage remain open. Explicit
List outputs materialize their finite results. Relational/producer interfaces and
physical plans must eventually allow chunked/out-of-core execution and pushdown
without forcing complete source materialization.
