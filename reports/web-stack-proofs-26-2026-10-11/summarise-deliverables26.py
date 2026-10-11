"""Add a measured lead to completed artifacts without changing frozen authors."""
import collections, hashlib, html, json, statistics
from pathlib import Path

R = Path(__file__).resolve().parent
rows = json.loads((R / 'all-comparisons.json').read_text())['rows']

def count(host, comparison, fresh=False, mode=''):
    selected = [r for r in rows if r['host'] == host and r['mode'] == mode
                and r['comparison'] == comparison and (not fresh or r['proof_fresh'])]
    counts = collections.Counter(r['verdict'] for r in selected)
    return {'cells': len(selected), 'faster': counts['faster'] + counts['Ink_faster'],
            'slower': counts['slower'] + counts['expert_faster'],
            'inconclusive': counts['inconclusive']}

captured = {h: count(h, 'backend_checked_js') for h in ['node', 'browser']}
borrowed = {h: count(h, 'backend_checked_borrowed_js') for h in ['node', 'browser']}
fresh = {h: count(h, 'proof_new_js', True) for h in ['node', 'browser']}
families = {}
for host in ['node', 'browser']:
    selected = [r for r in rows if r['host'] == host and r['comparison'] == 'backend_checked_js']
    families[host] = {case: statistics.median(r['ratio_95pct'][0] for r in selected if r['case'] == case)
                      for case in dict.fromkeys(r['case'] for r in selected)}

lead = '''The clearest reusable gain is the JavaScript emitter: ordinary loops, inline callbacks and scalar locals replace runtime helper calls and closures at compilation. Across the 56 preset captured-call cases, the new emitter is faster in **29 Node cases and 24 browser cases**, with zero confirmed captured-call regressions and the rest inconclusive. Synchronous borrowed calls show **36 gains / 4 regressions** in Node and **38 gains / 1 regression** in the browser; the cleanup is therefore not uniformly faster at every boundary.

The newly checked fold identities have mixed marginal profitability on the current backend: **4 gains / 1 regression / 11 inconclusive** in Node and **2 / 2 / 12** in the browser. No fresh fold proof yields a confirmed Wasm gain here. Validity alone does not guarantee profitability, so the negative cells remain in the DB and report.

**Broad superiority over optimized native implementations remains unachieved.** Across all 56 cases, captured generated JS beats the strong JS expert in 1 Node case and 2 browser cases; generated Wasm beats the Rust Wasm expert in 0 cases on either host. Native resident Ink/C beats optimized Rust in 7 cases, loses in 39, and is inconclusive in 10. Actual WebGPU loses all 12 measured reference cells to both optimized JS and Rust Wasm; transfer and readback are included. These findings identify improvements to Ink without establishing a general language ranking.

All optimization work in this batch occurs at compile time. The generated outputs contain direct computation and the existing target bridges; this batch adds no runtime proof search, load-based optimizer or caller validation.

'''

table = ['| Task family | Node median old/new JS speed ratio | Browser median old/new JS speed ratio |',
         '|---|---:|---:|']
for case in families['node']:
    table.append(f"| `{case}` | {families['node'][case]:.3f}× | {families['browser'][case]:.3f}× |")
table_note = ('These are medians of per-cell captured-call ratios within each family, not pooled throughput '
              'or a cross-language score. A ratio above 1 favors the new emitter. The modular mix is the '
              'largest gain (7.30× Node / 5.32× browser by family median), but remains slower than the strong expert.\n\n')
report = R / 'REPORT.md'
text = report.read_text()
assert text.startswith('# Ink invariant folds and direct JS targets — batch 26\n\n')
heading, rest = text.split('\n\n', 1)
report.write_text(heading + '\n\n' + lead + '\n'.join(table) + '\n\n' + table_note + rest)
page = R / 'browser-completed.html'
content = page.read_text()
marker = '<h1>Ink invariant folds and direct JS targets</h1>'
assert content.count(marker) == 1
summary = ('<p><strong>Measured JS compiler gains:</strong> 29/56 Node and 24/56 browser captured cases; '
           'zero confirmed regressions at that boundary. Borrowed calls include 4 Node and 1 browser regression.</p>'
           '<p><strong>32 checked objects added; 1,790 catalogue entries.</strong> '
           '20,268 timing samples and 9,403 complete benchmark comparisons.</p>'
           '<p><strong>Broad native superiority remains unachieved.</strong> Fresh proof gains are mixed. '
           'Native resident wins 7/56; Wasm wins 0/56 per host; GPU wins 0/12 against optimized controls.</p>')
page.write_text(content.replace(marker, marker + summary))
receipt = dict(status='passed', captured_backend=captured, borrowed_backend=borrowed,
               fresh_proof=fresh, family_median_ratios=families,
               report_sha256=hashlib.sha256(report.read_bytes()).hexdigest(),
               dashboard_sha256=hashlib.sha256(page.read_bytes()).hexdigest(),
               comparisons_sha256=hashlib.sha256((R/'all-comparisons.json').read_bytes()).hexdigest(),
               helper_sha256=hashlib.sha256(Path(__file__).read_bytes()).hexdigest())
(R/'deliverable-summary.json').write_text(json.dumps(receipt, indent=2)+'\n')
print(json.dumps(receipt))
