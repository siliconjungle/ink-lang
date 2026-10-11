"""Re-sign a false theorem and its entire authenticated dependency closure."""
import json, sys, tempfile
sys.path.insert(0, 'knowledge')
from ink_knowledge import Store
from ink_knowledge.store import identity
r = json.load(open(sys.argv[1]))
objects = r['knowledge']['objects']
for e in objects.values():
    t = e.get('payload', {}).get('declaration', {}).get('Theorem', {})
    if not any(p[0] == sys.argv[2] for p in t.get('params', [])):
        continue
    to = t['to']
    if 'Binary' in to:
        to['Binary']['left'] = {'U64': 0}
    else:
        result = objects[to['Call']['function']]['payload']['declaration']['Function']['result']['Data']
        t['to'] = {'Construct': dict(datatype=result, constructor=0, arguments=[])}
    break
else:
    raise ValueError('missing theorem to forge')
renamed = {}; pending = dict(objects); rebuilt = {}
def rewrite(x):
    if isinstance(x, str): return renamed.get(x, x)
    if isinstance(x, list): return [rewrite(v) for v in x]
    if isinstance(x, dict): return {k: rewrite(v) for k, v in x.items()}
    return x
while pending:
    ready = [k for k, e in pending.items() if not any(d in pending for d in e.get('dependencies', []))]
    assert ready, 'dependency cycle'
    for old in ready:
        e = rewrite(pending.pop(old)); e['dependencies'] = sorted(set(e['dependencies']))
        new = identity(e); renamed[old] = new; rebuilt[new] = e
r['representation'] = renamed[r['representation']]
with tempfile.TemporaryDirectory() as directory:
    r['knowledge'] = Store.publish(directory, rebuilt.values()).bundle(list(rebuilt))
    print(json.dumps(r))
