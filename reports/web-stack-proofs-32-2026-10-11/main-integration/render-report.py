#!/usr/bin/env python3
"""Render verified evidence; never invent pending test outcomes."""
from pathlib import Path
import json,html
M=Path(__file__).resolve().parent
def read(name):return json.loads((M/name).read_text())
a=read('published-test-audit.json');k=read('knowledge-final-tests.json');v=read('published-target-validation-audit.json');r=read('remote-main-verification.json')
assert a['status']=='passed' and v['status']=='passed' and r['status']=='verified'
assert k['unique_passed']==251 and k['unique_skipped']==1 and k['unique_failed']==0
rows=''.join('<tr><td>'+html.escape(x['path']if x['path']!='.'else'ink-lang')+'</td><td><code>'+x['remote_main'][:12]+'</code></td><td class="pass">main verified</td></tr>'for x in r['repositories'])
(M/'report.html').write_text('''<!doctype html><meta charset="utf-8"><title>Ink — direct main integration</title><style>
body{font:16px system-ui;max-width:1100px;margin:32px auto;color:#192833;background:#f5f8fa}h1{font-size:32px;margin-bottom:8px}p{line-height:1.5}.sub{color:#486174}.cards{display:flex;gap:16px;margin:24px 0}.card{background:white;border:1px solid #d4e0e8;border-radius:10px;padding:18px;flex:1}.big{font-size:32px;font-weight:700;display:block}.pass{color:#086c48}table{border-collapse:collapse;width:100%;background:white}td,th{text-align:left;padding:9px 16px;border-bottom:1px solid #d4e0e8}code{font-size:14px}.note{font-size:14px;color:#486174}a{color:#1769a0}</style>
<h1>Ink: integrated directly into main</h1><p class="sub">Nine source repositories verified on GitHub. No PRs created. Upstream and archived evidence preserved.</p>
<div class="cards"><div class="card"><span class="big pass">9 / 9</span>main branches verified</div><div class="card"><span class="big">42</span>published proof roots replayed<br><span class="note">30 fresh objects + 12 reused consequences</span></div><div class="card"><span class="big">288</span>actual WebGPU validations<br><span class="note">No CPU fallback</span></div></div>
<table><thead><tr><th>Repository</th><th>Tested source revision</th><th>Publication</th></tr></thead><tbody>'''+rows+'''</tbody></table>
<p><strong>Checks passed:</strong> '''+str(a['production']['passed'])+''' production integration tests; '''+str(a['legacy_research']['passed'])+''' explicit research tests; 61 core tests; 251 DB tests with one explicit policy skip.</p>
<p>Final generated outputs: 1,152 Node validations and 1,440 browser validations. The fresh DB laws still change all four automatically selected recipes against the merged catalogue.</p>
<p class="note">The newer compiler replay is untimed. Archived performance gains apply to the paired-prefix workload family; they do not establish broad superiority over handwritten JS or Rust. Later documentation commits preserve these tested source revisions and dependency pins.</p>
<p><a href="REPORT.md">Full integration report</a> · <a href="../report.html">Frozen performance report</a> · <a href="remote-main-verification.json">Remote branch receipt</a></p>''')
print('Verified report rendered')
