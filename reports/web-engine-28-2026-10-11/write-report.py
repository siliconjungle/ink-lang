from pathlib import Path
import json,hashlib,datetime,html
R=Path(__file__).resolve().parent;B=R.parents[1];P=B.parent
read=lambda p:json.loads(p.read_text())
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
a=read(R/'analysis.json');o=read(R/'observations.json');pub=read(R/'publication.json')
def agg(host,reference,current,boundary,size='all'):
 return next(x for x in a['aggregates'] if (x['host'],x['reference'],x['current'],x['boundary'],x['size'])==(host,reference,current,boundary,size))
nr=agg('native','current-owned','current-into','resident');ns=agg('native','current-owned','current-into','resident',32);nl=agg('native','current-owned','current-into','resident',65536)
proof=agg('context','literal_javascript','selected_javascript','captured');rust=agg('native','rust-expert','current-into','resident')
node=agg('owned-node','expert_js_owned','current_js_owned','captured-js-owned');browser=agg('owned-browser','expert_js_owned','current_js_owned','captured-js-owned')
link=lambda label,p:f'[{label}]({p})'
report=f'''# Web engine and portable proof contexts — batch 28

All four requested mechanisms are implemented. Ink source syntax is unchanged.
The checking core supplies definition binding and proof applicability; lowering
and runtime packages supply evaluation, storage lifetimes and device execution.
Equality laws, concrete contextual certificates, search policy and measured
profitability stay in the external knowledge/planner packages. No runtime proof
optimizer, helper-name whitelist or caller-validation wrapper was introduced.

| Request | Implemented behavior | Boundary |
| --- | --- | --- |
| Proofs through helper calls | Certificates carry typed transitive definitions and callee content hashes. Admission reconstructs/checks them; application independently matches the original module. | Existing equality proof rules; bounded nonrecursive contexts. Changed definitions require fresh evidence. |
| Preserve shared list work | C lowering materializes collection operands before length/data access, including bounded-inline fallback, zip, indexing and lazy branches. | Evaluation order and lazy branches retained. No unproved fusion. |
| Reuse output storage | C/JS list functions expose destination entrypoints; packed native/Wasm hosts expose destination execution. Prepared Wasm captures once, reuses storage and rewinds scratch allocations after each call. | Terminal allocation can disappear. Source intermediates remain until a DB rewrite removes them. Ordinary results keep their previous lifetime. |
| Broader GPU pipelines | Literal graphs compose map/indexed map/filter/zip/scan/concat/count/sum/foldr and bounded pure helpers. Dynamic lengths feed following stages; buffers are reused across requested iterations. | Ordered reductions initially use serial stages. Wide arithmetic, lazy collection control flow and graph feedback can still fall back to CPU. |

The trusted destination contract leaves capacity, declared types and nonaliasing
to callers. JS returns a logical element count; packed C/Wasm returns a 32-bit
word count. Prepared results are borrowed. Full CPU `callInto` still pays input
capture, packing, decode and destination-copy costs; it is distinct from direct
destination kernels and resident prepared calls.

## Evidence and measured gains

There are **{a['samples']:,} accepted timing samples** and **{o['new_observations']:,}
new immutable DB observations**. The DB grew from 1,822 to **1,831 entries** with
nine definition-bound certificates; prior objects, names and observations were
preserved. Observation total is **{o['total_observations']:,}**. These measurements
provide cost evidence; they do not prove equations.

Ratios below are reference time / Ink time, so greater than 1 means Ink is
faster. Aggregates are equal-cell geometric means, with all losses retained.
Per-cell classifications use 95% paired-round bootstrap intervals with 4,000
resamples. Repeated trials on this one machine are not independent hardware
replication. The fixed eight-task corpus uses 32 and 65,536 elements, small/full
distributions, identical batch27 selected cores and frozen goldens. Context proofs
also exercise 4,096 elements. Boundaries are compared within each host.

| Comparison | Cells | Ratio | Supported wins / losses / uncertain |
| --- | ---: | ---: | --- |
| Native destination vs current owned, resident list calls | {nr['cells']} | {nr['geomean_ratio']:.3f}× | {nr['classifications']['win']} / {nr['classifications']['loss']} / {nr['classifications']['uncertain']} |
| Native destination vs owned, 32 elements | {ns['cells']} | {ns['geomean_ratio']:.3f}× | {ns['classifications']['win']} / {ns['classifications']['loss']} / {ns['classifications']['uncertain']} |
| Native destination vs owned, 65,536 elements | {nl['cells']} | {nl['geomean_ratio']:.3f}× | {nl['classifications']['win']} / {nl['classifications']['loss']} / {nl['classifications']['uncertain']} |
| New helper-bound checked replay vs literal JS | {proof['cells']} | {proof['geomean_ratio']:.3f}× | {proof['classifications']['win']} / {proof['classifications']['loss']} / {proof['classifications']['uncertain']} |
| Native Ink destination vs Rust expert, resident | {rust['cells']} | {rust['geomean_ratio']:.3f}× | {rust['classifications']['win']} / {rust['classifications']['loss']} / {rust['classifications']['uncertain']} |
| Matched owned Array Ink vs fused JS, Node | {node['cells']} | {node['geomean_ratio']:.3f}× | {node['classifications']['win']} / {node['classifications']['loss']} / {node['classifications']['uncertain']} |
| Matched owned Array Ink vs fused JS, browser | {browser['cells']} | {browser['geomean_ratio']:.3f}× | {browser['classifications']['win']} / {browser['classifications']['loss']} / {browser['classifications']['uncertain']} |

The portable helper proof cases improve captured JS by approximately
**1.04–2.03×** across all 12 cells. Wasm gains are predominantly indistinguishable
from noise in this experiment. This is **explicit checked replay**: the saved
frozen CPU-cost probe selects zero steps. No automatic-selection gain is claimed.
The underlying map-fusion mathematics is reused from the existing DB; the nine
new objects supply portable contextual derivations rather than nine new axioms.
U32/I32/U64/F32 primary/held-out contexts are checked; performance here measures
the two U32 cases only.

JS destination reuse is mixed: the small-call geometric ratios are approximately
0.751× in Node and 0.727× in browser; large-call ratios are 1.062× and 1.016×.
Avoiding an output allocation does not guarantee a faster JS call. The follow-up
owned-Array expert writes fresh Arrays directly, removing the extra conversion
in the initial reused-typed-buffer expert wrapper. The follow-up comparison is
the stronger owned-result JS control; the initial wrapper results remain saved
and are not evidence of broad superiority over optimal hand-written JavaScript.

GPU coverage passes **all 148 fixed-corpus frames on the actual device**, plus
75 composed/ordered graph oracle cases and a three-iteration native/browser
pipeline. Two exceptional F32 graph cases correctly use CPU fallback. There are
1,728 GPU-suite timing samples and 3,258 measured GPU invocations with checked
transfer/dispatch counters. **GPU loses all 32 cells to optimized JS and Rust
Wasm controls** at this instrumented full-call boundary. It beats original staged
JS only on two large modular-mix cells; those are exploratory algorithmic
comparisons. Better coverage is not a general GPU speedup claim.

Broad superiority over native Rust/Wasm/JS has not been demonstrated. The native
reuse gains are largest for allocation-dominated small calls. Large native calls
are near parity with the previous owned path, and optimized Rust remains ahead
in the aggregate. Prepared resident Wasm closes much of the transport gap but
still trails its Rust Wasm control overall. Peak host memory was not measured;
DB `peak_bytes=0` for those observations is explicitly labeled an unknown
sentinel in workload provenance. GPU observations record device-buffer peaks.

## Validation and preserved failures

New context checking, planner filtering, C/JS destination tests, arena lifetime
sanitizer checks and runtime tests pass. New C/JS target comparisons total 1,716
and 1,300; existing C/JS suites retain 1,941 and 2,290 logged comparisons. Node
and browser each validate 1,298 fixed-suite outputs; native validates 592.
Additional helper proof preparation checks 48 interpreter outputs and 128
complete JS/Wasm outputs. Native GPU validates 78 complete results. Standalone
fold and arithmetic-aggregate modules verify the packed Wasm ABI, and the syntax
example is accepted by the old compiler and executes through the new JS API.

Three older regression limits remain disclosed: bounded semantic search does not
produce the historically asserted expression under the accumulated catalogue;
the optimized CLI fixture exceeds its existing input-size limit; the planner
research test has an archive-count cap. The first two reproduce under the pinned
previous compiler. No budget/policy/size limit was silently raised. The historical
compact-selection22 utility remains unchanged; the new compact-selection28 tool
prefilters contextual applicability, which the checker still enforces.

Operational failures and repaired preparations are retained. Canonical publication
recovered idempotently after a scripting-method error and disk exhaustion during
disposable-index rebuilding. GPU timing first stopped on a zero-duration
calibration trial, then failed closed on its stale runner binding. The final
protocol permits zero only in calibration and requires positive accepted samples.
Freeze chains bind these two measurement-only repairs. Existing sources, metrics,
losses and prior reports were preserved; only reproducible build caches were
removed to recover disk space.

## Source syntax and APIs

```ink
module Example;
fn bump(xs: List<u32>, k: u32) -> List<u32> {{
    return xs.map(fn(x) => x + k);
}}
pub fn process(xs: List<u32>, k: u32) -> List<u32> {{
    return bump(xs, k).filter(fn(x) => x > k).map(fn(x) => x * 3);
}}
```

Generated JavaScript adds an output API without changing the Ink function:

```javascript
const output = new Uint32Array(xs.length);
const count = program.functionsInto.process(xs, k, output);
```

With `xs=[0,1,2]` and `k=2`, this writes `[9,12]`, returns 2 and leaves the
remaining destination element untouched. The normal `functions.process` remains
available. No proof or ownership annotation was added to source syntax.

## Bindings and review artifacts

- Compiler: `{read(R/'compiler-final.json')['compiler_sha256']}`.
- DB snapshot: `{pub['snapshot']}`.
- {link('Contracts and trust boundaries',B/'docs/web-engine-storage-and-contexts.md')}.
- {link('Final source inventory',R/'source-final.json')}.
- {link('Publication and final admissions',R/'publication.json')}.
- {link('All performance comparisons and intervals',R/'analysis.json')}.
- {link('DB observations and measurement plans',R/'observations.json')}.
- {link('Independent context audit',R/'context-performance/independent-audit.json')}.
- {link('Independent GPU audit',R/'gpu-performance/independent-review.json')}.
- {link('Independent destination/lifetime review',R/'independent-destination-review.md')}.
- {link('Final comparison review',R/'gpu-performance/final-comparison-review.json')}.
- {link('Follow-up owned-result controls',R/'owned-js-control/metadata.json')}.
- {link('Independent owned-result control review',R/'owned-js-control/final-review.json')}.
'''
(R/'REPORT.md').write_text(report)
body=f'''<!doctype html><meta charset="utf-8"><title>Ink web engine 28 — verified</title><style>body{{background:#111827;color:#e5e7eb;font:17px system-ui;max-width:1100px;margin:35px auto}}h1{{font-size:32px}}.grid{{display:grid;grid-template-columns:1fr 1fr;gap:16px}}section{{background:#1f2937;border-radius:12px;padding:16px 20px}}strong{{color:#9ae6b4}}small{{color:#cbd5e1}}a{{color:#93c5fd}}td,th{{padding:9px;text-align:left;border-bottom:1px solid #374151}}table{{width:100%}}</style><h1>Ink web engine 28</h1><p>All four mechanisms implemented. Source syntax unchanged.</p><div class="grid"><section><strong>Portable helper proofs</strong><p>Typed definitions and transitive callee hashes checked on admission and application.</p><strong>Shared collection work</strong><p>List-producing operands evaluated once, including helper fallback and lazy branches.</p></section><section><strong>Reusable output storage</strong><p>JS / native / Wasm destinations and prepared scratch lifetimes. Caller-owned buffers.</p><strong>Composed GPU graphs</strong><p>148 fixed-corpus device outputs pass. Ordered reductions and helper pipelines covered.</p></section></div><h2>Measured results</h2><table><tr><th>Matched comparison</th><th>Reference / Ink time</th></tr><tr><td>Native buffer reuse, small resident calls</td><td><strong>{ns['geomean_ratio']:.2f}×</strong> ·14/14 supported wins</td></tr><tr><td>New helper proof replay, captured JS</td><td><strong>1.04–2.03×</strong> ·12/12 supported wins</td></tr><tr><td>Native destination vs Rust expert</td><td>{rust['geomean_ratio']:.2f}× · Rust ahead overall</td></tr><tr><td>Matched owned JS vs fused expert</td><td>{node['geomean_ratio']:.2f}× Node / {browser['geomean_ratio']:.2f}× browser · mixed</td></tr><tr><td>GPU full calls vs optimized CPU controls</td><td>0/32 wins · wider coverage, transfer costs remain</td></tr></table><p><strong>{a['samples']:,} timing samples</strong> ·1,831 DB entries ·{o['new_observations']:,} new observations</p><small>One-machine measurements; losses and failed preparations retained. Helper gains use checked replay; frozen cost model does not select them automatically. Greater than1 means Ink faster.</small><p><a href="REPORT.md">Full report</a> · <a href="analysis.json">Raw comparisons</a> · <a href="publication.json">Checked publication</a></p>'''
(R/'report.html').write_text(body)
print('report written',a['samples'],o['new_observations'])
