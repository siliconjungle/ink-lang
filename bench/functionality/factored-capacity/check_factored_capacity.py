import gzip
import hashlib
import json
from pathlib import Path
import subprocess
import sys
import tempfile

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root/'knowledge'))
from ink_knowledge import Store, canonical, identity
from ink_knowledge import store as store_module
from ink_knowledge.store import entry

store_module.MAX_VIEW_ENTRIES = 16_384
p = Path(__file__).resolve().parent
MATH = 'first-order-inductive-equality-v1'
objects = [entry('theorem', MATH, dict(declaration={'Theorem': dict(params=[], conditions=[],
    **{'from': {'U64': i}, 'to': {'U64': i}}, proof={'Refl': {'U64': i}})})) for i in range(9000)]
with tempfile.TemporaryDirectory(prefix='ink-capacity-proof-') as temporary:
    folder = Path(temporary)
    source = folder/'source.ink'; core = folder/'source.json'
    source.write_text('module factored_capacity;fn f(x:u32)->u32{return x;}')
    subprocess.run([p/'ink-capacity-frozen', 'emit-core', source, '-o', core], check=True, capture_output=True)
    store = Store.publish(folder/'proofs', objects)
    bundle = store.bundle(sorted(identity(obj) for obj in objects))
    wire = canonical(bundle); path = folder/'view.json'; path.write_bytes(wire)
    (p/'capacity-9000-view.json.gz').write_bytes(gzip.compress(wire, mtime=0))
    receipts = []
    for name, compiler, expected in [('prior', 'ink-validation-frozen', False), ('current', 'ink-capacity-frozen', True)]:
        result = subprocess.run([p/compiler, 'knowledge-check', core, path], capture_output=True, text=True, timeout=180)
        assert (result.returncode == 0) == expected, result.stderr
        (p/('capacity-9000-'+name+'.stdout')).write_text(result.stdout)
        (p/('capacity-9000-'+name+'.stderr')).write_text(result.stderr)
        receipts.append(dict(name=name, compiler_sha256=hashlib.sha256((p/compiler).read_bytes()).hexdigest(), exit_code=result.returncode))
        print(name, result.returncode, flush=True)
    altered = json.loads(json.dumps(objects[-1]))
    altered['payload']['declaration']['Theorem']['to'] = {'U64': 9000}
    invalid = Store.publish(folder/'invalid', [*objects[:-1], altered])
    forged = folder/'invalid-view.json'
    forged.write_bytes(canonical(invalid.bundle(sorted(identity(obj) for obj in [*objects[:-1], altered]))))
    result = subprocess.run([p/'ink-capacity-frozen', 'knowledge-check', core, forged], capture_output=True, text=True, timeout=180)
    assert result.returncode != 0 and 'resource limit' not in result.stderr, result.stderr
    (p/'capacity-9000-forged.stderr').write_text(result.stderr)
    receipts.append(dict(name='forged', exit_code=result.returncode, scope='Same-typed changed literal endpoint with authenticated rehashed entry; proof must still reject.'))
    (p/'capacity-9000-scope.json').write_text(json.dumps(dict(schema=1, objects=9000,
        uncompressed_bytes=len(wire), uncompressed_sha256=hashlib.sha256(wire).hexdigest(), receipts=receipts,
        scope='Authenticated generic literal equations exercise view capacity, complete ordinary mathematical replay, and rejection of a rehashed false claim. This does not establish complete network admission or execution.'), indent=2)+'\n')
    print('forged', result.returncode, flush=True)
