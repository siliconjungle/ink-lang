"""Retain a real open conversion and an authenticated false-endpoint control."""
import copy
import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[2]
p = Path(__file__).resolve().parent
sys.path.insert(0, str(root/'knowledge'))
from ink_knowledge import Store, canonical
from producers.fold_chunks import FoldChunks, compose
from producers.open_equations import OpenEquations

wire = json.loads(gzip.decompress((root/'knowledge/tests/fixtures/open-equation-conversion.json.gz').read_bytes()))
original = wire['objects'][wire['roots'][0]]['payload']['declaration']['Theorem']
chunks = FoldChunks(wire['objects'], [])
chunks.gates = {key for key, obj in chunks.objects.items()
    if (f := obj['payload'].get('declaration', {}).get('Function'))
    and f['recursive'] is not None and key not in chunks.folds and chunks.acyclic(key)}
author = OpenEquations(chunks)
left, first = author.normalize(original['from'], dict(original['params']))
right, second = author.normalize(original['to'], dict(original['params']))
proof = compose([first, author.closed.conversion(left, right), {'Sym': second}])
changed = copy.deepcopy(original['to'])
pending = [changed['If']['on_true']]
while pending:
    node = pending.pop()
    if isinstance(node, dict):
        if 'U64' in node:
            before = node['U64']; node['U64'] ^= 1; after = node['U64']; break
        pending.extend(reversed(list(node.values())))
    elif isinstance(node, list):
        pending.extend(reversed(node))
else:
    raise AssertionError('missing error word')
receipts = []
with tempfile.TemporaryDirectory() as temporary:
    folder = Path(temporary)
    source = folder/'input.ink'; core = folder/'input.json'
    source.write_text('module open_computation;fn f(x:u32)->u32{return x;}')
    subprocess.run([p/'ink-step-frozen', 'emit-core', source, '-o', core], check=True, capture_output=True)
    for good, target in [(True, original['to']), (False, changed)]:
        key = chunks.theorem(original['params'], original['from'], target, proof)
        store = Store.publish(folder/str(good), list(chunks.objects.values()))
        data = canonical(store.bundle([key]))
        view = folder/'view.json'; view.write_bytes(data)
        label = 'step-conversion' if good else 'step-conversion-forged'
        (p/(label+'.json.gz')).write_bytes(gzip.compress(data, mtime=0))
        result = subprocess.run([p/'ink-step-frozen', 'knowledge-check', core, view], capture_output=True, timeout=180)
        (p/(label+'.stdout')).write_bytes(result.stdout)
        (p/(label+'.stderr')).write_bytes(result.stderr)
        assert (result.returncode == 0) == good, result.stderr[-3000:]
        receipts.append(dict(label=label, root=key, objects=len(json.loads(data)['objects']),
            raw_bytes=len(data), sha256=hashlib.sha256(data).hexdigest(), exit_code=result.returncode))
    redex = {'Binary': dict(op='+', left={'U64': 2}, right={'U64': 3})}
    key = chunks.theorem([], redex, {'U64': 6}, {'Step': redex})
    store = Store.publish(folder/'wrong-result', list(chunks.objects.values()))
    data = canonical(store.bundle([key])); view.write_bytes(data)
    label = 'step-wrong-result'
    (p/(label+'.json.gz')).write_bytes(gzip.compress(data, mtime=0))
    result = subprocess.run([p/'ink-step-frozen', 'knowledge-check', core, view], capture_output=True, timeout=180)
    (p/(label+'.stdout')).write_bytes(result.stdout)
    (p/(label+'.stderr')).write_bytes(result.stderr)
    assert result.returncode != 0 and b'inductive proof proves a different statement' in result.stderr, result.stderr
    receipts.append(dict(label=label, root=key, objects=1, raw_bytes=len(data),
        sha256=hashlib.sha256(data).hexdigest(), exit_code=result.returncode))
scope = dict(schema=1, compiler_sha256=hashlib.sha256((p/'ink-step-frozen').read_bytes()).hexdigest(),
    source='edccc528c48244d7c955c4c7265c72b4cf772125',
    package='c90aa3b0338cb87c893f1d3bb636189acb33fc56',
    authoring_work=chunks.work, altered_error_word=[before, after], receipts=receipts)
(p/'step-conversion-scope.json').write_text(json.dumps(scope, indent=2)+'\n')
print(json.dumps(scope))
