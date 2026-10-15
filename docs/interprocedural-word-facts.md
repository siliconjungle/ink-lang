# Source-bound facts through helper calls

Conditional fact acquisition now expands bounded acyclic unsigned/Boolean helper
calls before range/known-bit analysis. A parameterized summary cache is local to
one acquisition and binds exact signatures and semantic bodies. Caller branch
facts are applied after substitution; they do not leak into cached helper bodies.
Recursive calls, unsupported carriers and expansion-budget exhaustion report
unknown. Substitution is checked for size before copying potentially repeated
arguments, and preserves lexical binders.

The [example](../examples/interprocedural-facts.ink) discovers that an excluded
input remains excluded through two wrapping-add helpers and that a relational
range guard supplied by a helper makes a mask redundant. Multiplication's
non-injectivity still blocks the superficially similar replacement.

Every candidate needs two independently checked steps: ordinary Normalize with an
exact definition context connects the source calls to the expanded body; then a
bit-vector certificate proves the proposed equation. The whole source-bound law
and the complete selection replay before database publication. Rehashing a changed
source does not make an old summary valid. No caller-trusted requirement, LLVM
nowrap flag, training observation or profile becomes a proof premise.

Two new complete-call laws are published through the normal knowledge snapshot;
`knowledge/store/call-facts-view.json` and the admission receipt retain the exact
scope. Acquire further laws with the existing `producers.conditional_facts` CLI.
This extends offline acquisition; it does not add runtime inference or authorize
automatic performance selection. Backward requirement diagnostics, broader type
summaries and cross-domain profitability evidence remain separate work.

Validation includes bounded expansion/recursion tests, stale-source rejection and
56 complete reference/Rust/JS/Wasm comparisons. GPU-host comparison executes these
scalar cases on the CPU; it does not establish a new device-kernel capability.
