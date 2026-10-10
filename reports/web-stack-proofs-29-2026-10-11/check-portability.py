"""Independent renamed-helper/composed-stage check against fresh generic laws."""
from pathlib import Path
import hashlib, json, subprocess, sys
R = Path(__file__).resolve().parent
B = R.parents[1]
sys.path[:0] = [str(B/'knowledge'), str(B/'planner'), str(B/'bench')]
from ink_knowledge import Store
from compact_selection28 import plan

pins = json.loads((R/'initial-pins.json').read_text())
compiler = Path(pins['compiler'])
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()
assert sha(compiler) == pins['compiler_sha256']
P = R/'portability'; P.mkdir(exist_ok=True)
candidate = Store(R/'pipeline/candidate-store')
generic = {n: i for n, i in json.loads((candidate.data/'names.json').read_text()).items()
           if n.startswith(('scan_cardinality_', 'indexed_cardinality_'))}
assert len(generic) == 14
bundle = candidate.bundle(list(generic.values()))
isolated = Store.publish(P/'generic-store', bundle['objects'].values(), generic)
isolated.rebuild()
commands = []
def run(argv):
    argv = list(map(str, argv))
    p = subprocess.run(argv, capture_output=True, text=True, cwd=B)
    commands.append(dict(argv=argv, exit_code=p.returncode, stdout=p.stdout, stderr=p.stderr))
    (P/'commands.json').write_text(json.dumps(commands, indent=2)+'\n')
    assert p.returncode == 0, p.stderr
    return p.stdout

parts = ['module UnseenComposition;']
for t in ['u32','i32','u64']:
    parts.append(f'fn independent_batch_{t}(xs:List<{t}>,k:{t})->List<{t}>'
                 '{return xs.filter(fn(x)=>x>k).filter(fn(x)=>x!=k+1);}')
    parts.append(f'fn discarded_stage_{t}(i:u32,x:{t},k:{t})->{t}'
                 '{return choose(rem_or(i,7,0)==0,x*k,x+k);}')
    parts.append(f'pub fn composed_{t}(xs:List<{t}>,k:{t})->u64'
                 '{return count(independent_batch_'+t+'(xs,k).map_indexed(fn(i)=>fn(x)=>discarded_stage_'+t+'(i,x,k)).scan().scan());}')
source = P/'source.ink'; source.write_text('\n'.join(parts)+'\n')
core = P/'literal.core.json'; selected = P/'selected.core.json'
run([compiler,'emit-core',source,'-o',core])
selection = P/'selection.json'
receipt = plan(compiler,core,isolated,B/'reports/web-stack-proofs-27-2026-10-11/cpu-cost-model.json',selection)
package = json.loads(selection.read_text())
assert len(package['applications']) >= 6
run([compiler,'emit-core',core,'--core','--selection',selection,'-o',selected])
run([compiler,'build',selected,'--core','--target','javascript','-o',P/'selected.mjs'])
frames=[]
for t in ['u32','i32','u64']:
    for values, k in [([],7),([0,7,8,9,31],7),([i*17 for i in range(129)],31)]:
        expected = sum(x>k and x!=k+1 for x in values)
        path = P/'args.json'; path.write_text(json.dumps([values,k]))
        for variant, program in [('literal',core),('selected',selected)]:
            actual=json.loads(run([compiler,'run',program,'composed_'+t,path,'--core']))
            assert actual == expected, (t,variant,actual,expected)
            frames.append(dict(type=t,variant=variant,length=len(values),expected=expected))
assert sha(compiler)==pins['compiler_sha256']
result=dict(status='passed',generic_snapshot=isolated.snapshot_id,compiler_sha256=sha(compiler),
            input_core_sha256=receipt['check']['input_core_sha256'],
            selection_sha256=sha(selection),applications=len(package['applications']),
            selected_laws=sorted({x['law'] for x in package['applications']}),
            interpreter_comparisons=len(frames),frames=frames,
            scope='Renamed helper definitions and nested indexed-map plus two scans; unchanged frozen CPU cost model selects generic laws without source-specific context certificates. No runtime checks or timing.')
(P/'evidence.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result,indent=2))
