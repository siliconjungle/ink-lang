"""Bind the completed batch, preserved failed preparation and immutable DB delta."""
import hashlib, json
from pathlib import Path

R = Path(__file__).resolve().parent
B = R.parents[1]
P = B.parent
sha = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
read = lambda p: json.loads(p.read_text())
final = read(R/'final-binding.json')
assert final['status'] == 'bound'
for n,h in final['artifacts'].items():
    assert sha(R/n) == h, n
assert sha(P/'REPORT.md') == final['parent_report_sha256']
assert sha(P/'agent-ownership.json') == final['ownership_sha256']
assert read(R/'protocol-final-review.json')['status'] == 'Final review passes'
review = read(R/'report-review26.json')
assert review['status'] == 'Final report review passes'
assert review['report_sha256'] == sha(R/'REPORT.md')
for n,h in review['bindings'].items():
    assert sha(R/n) == h, n
metadata = read(R/'metadata.json')
pub = read(R/'publication.json')
files = {p for p in R.rglob('*') if p.is_file() and '__pycache__' not in p.parts
         and p.name != 'completion-binding.json'}
archive = B/'reports/web-stack-proofs-26-mis-pinned-preparation-2026-10-11'
files.update(p for p in archive.rglob('*') if p.is_file() and '__pycache__' not in p.parts)
files.update(p for p in (B/'knowledge/research/web-stack-proofs-26').rglob('*')
             if p.is_file() and '__pycache__' not in p.parts)
files.update([P/'REPORT.md', P/'agent-ownership.json', B/'knowledge/store/snapshot.json',
              B/'knowledge/store/snapshots'/f"{pub['snapshot']}.json"])
for oid in pub['batch_entries']:
    files.add(B/'knowledge/store/objects'/f'{oid}.json')
for host in ['node', 'browser']:
    files.update(B/'knowledge/store/observations'/f"{r['id']}.json"
                 for r in read(R/f'{host}-observations.json'))
files.update(Path(c['path']) for c in metadata['compilers'].values())
files.update(B/n for n in read(R/'source-boundary-after.json'))
files.update([B/'lowerings/js/tests/statements.rs', B/'lowerings/js/tests/early_exit.rs',
              B/'knowledge/producers/web_invariant26_laws.py',
              B/'knowledge/producers/web_static26_laws.py'])
assert all(p.is_file() for p in files), [str(p) for p in files if not p.is_file()]
binding = dict(status='completed-and-bound', snapshot=pub['snapshot'],
               catalogue_entries=1790, canonical_observations=17026,
               report_sha256=sha(R/'REPORT.md'),
               artifacts={str(p.relative_to(P)):sha(p) for p in sorted(files)},
               preserved_failed_preparation=True, all_timings_and_adverse_results_retained=True,
               broad_native_goal_achieved=False, no_commit_push_PR=True)
(R/'completion-binding.json').write_text(json.dumps(binding, indent=2)+'\n')
print(json.dumps({k:v for k,v in binding.items() if k != 'artifacts'} |
                 dict(artifacts=len(files), completion_binding_sha256=sha(R/'completion-binding.json'))))
