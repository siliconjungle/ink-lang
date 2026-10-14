# Authored decreasing measures

Pure functions can declare an unsigned measure instead of using only the built-in
structural descent patterns:

```ink
fn steps(n:u32,stride:u32)->u32 decreases n; {
 if stride>0 && n>=stride {return steps(n-stride,stride)+1;}
 return 0;
}
fn forward(limit:u32,index:u32)->u32 decreases limit-index; {
 if index<limit {return forward(limit,index+1)+1;}
 return 0;
}
```

Every recursive call must strictly decrease the declared `u32` or `u64` value,
interpreted as a natural number. Wrapping arithmetic retains its actual word
meaning; a guard against underflow or overflow must be established rather than
assumed. The measure can be a derived expression or an independently total pure
helper. Imported and generic declarations retain their lexical parameters and
specialize normally. Local shadowing cannot change the original entry measure.

An explicit `decreases [a,b];` declares an ordered lexicographic product of
1..16 unsigned components. A call decreases the first differing component; later
ones may reset only after an earlier decrease. Each component keeps its own word
width and actual wrapping meaning. The exported Boolean goal states this full
relation, and the same RUP checker verifies it. An empty product, nonword component
or increase in the first component rejects. This syntax is measure metadata;
it adds no executable list allocation or runtime check.

`termination::obligations` and `ink emit-termination-obligations` export unadmitted
source goals. They produce no executable witness. The shared source scalar
projection derives actual call arguments, lexical bindings and lazy branch facts;
it uses the same unsigned-word meanings as checked bounds. No contract predicate
is an entry premise. Unsupported scalar computations widen to independent typed
values. Calls in an unvisited callback domain reject instead of disappearing.

```sh
python -m producers.termination_measures source.ink proof-store --compiler ./target/debug/ink
ink check-termination source.ink --termination-proofs proof-store/evidence.json
ink emit-core source.ink --termination-proofs proof-store/evidence.json -o core.json
ink check-core core.json
```

The untrusted producer lives in ink-knowledge. It proposes RUP refutations and
publishes immutable canonical entries. Core independently reconstructs each goal
and Boolean circuit and checks the supplied hints. Exact executable source,
measure declarations, call-site coverage, goal identity, membership and proof
bytes are checked. The source identity omits contract metadata and proof bytes:
descent is universal and uses no contract assumptions. Actual generated guard
bodies, types, source functions and measures remain bound. This permits separate
contract authoring without a circular identity; contracts still require their own
admission.

Missing, repeated, stale, malformed, wrong-domain or incomplete certificates fail.
Measures that invoke recursion fail. Mutual recursion remains rejected by the
ordinary dependency checker. Existing syntactic recursion keeps its previous
contract and needs no database. New measure-bearing modules bind executable-core
V12; replay derives the version and rejects a downgrade.

Measures and their proof bytes add no executable check inside the function body.
CPU lowerers execute the original body. Measured recursive closures use the
complete CPU host; unrelated eligible functions can still dispatch on the GPU.
Checked module/reference sessions reuse their immutable admission. Raw programs
remain independently checked, with argument validation, invariant ingress and
evaluation fuel retained.

This extends trusted source checking and correspondence; it adds no proof variant
or solver to the core. The implemented scalar projection, RUP checker and lowerers
remain trusted Rust implementations. The design follows the decreasing-measure
principle described in [Lean's recursion reference](https://lean-lang.org/doc/reference/latest/Definitions/Recursive-Definitions/).
It does not implement Lean's proof calculus or establish a verified compiler.

The checked fixture covers variable strides, derived distance, increasing indices,
generic string payloads, imports, zero work, lexicographic resets and word boundaries. Sixteen replies
and exact snapshots match C, Rust, JavaScript, both Wasm paths and the wgpu host,
including one eligible numerical GPU dispatch. Core-only replay includes complete
proof bytes and requires no knowledge checkout. Counterexamples include unsigned
underflow, unchanged arguments, shadowed entry parameters, recursive/nonword
measures, omitted calls and rehashed authentic invalid RUP evidence.

Remaining work includes recursive datatype
measures, induction/source correspondence for these recursive helpers, more
callback domains and proof transport when a selected rewrite changes the bound
source. Search failure cannot grant termination or silently broaden GPU support.
These limits remain in the full [implementation programme](general-machinery-plan.md).
