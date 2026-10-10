"""Measure complete pipelines. Never infer a performance guarantee from device type."""
import json,subprocess,sys,math
from pathlib import Path
import importlib.util
spec=importlib.util.spec_from_file_location('oracles',Path(__file__).with_name('compute-fixtures.py'));oracles=importlib.util.module_from_spec(spec);spec.loader.exec_module(oracles)
binary,scratch,output=sys.argv[1:];scratch=Path(scratch);scratch.mkdir(parents=True,exist_ok=True)
f=oracles.particle_plan(65536,120)
script=[{'call':'indexed','args':[[1,2,3]],'backend':'auto'}]*33+[{'pipeline':f['pipeline'],'backend':'auto'}]*2
path=scratch/'selection.json';path.write_text(json.dumps(script,separators=(',',':')))
r=subprocess.run([binary,'--script',str(path)],capture_output=True,text=True,check=True)
rows=[json.loads(s)for s in r.stdout.splitlines()];assert len(rows)==35
assert all(r['backend']=='cpu'and r['value']==[-2,9,-6]for r in rows[:33]);assert rows[0]['profile']['uses']==1 and rows[31]['profile']['uses']==32 and rows[32]['profile']['uses']==1
for r in rows[33:]:
    assert 'profile'in r,r
    for key in f['expected']:
        for actual,expected in zip(r['values'][key],f['expected'][key]):
            assert all(math.isclose(a,b,rel_tol=2e-5,abs_tol=2e-5)for a,b in zip(actual,expected))
    p=r['profile'];assert (r['backend']=='gpu')==(p['gpu_ms']+p['setup_ms']/32<p['cpu_ms']*.9)
receipt={'status':'passed','small_and_recheck':[rows[0],rows[31],rows[32]],'large_pipeline':[{k:v for k,v in r.items()if k!='values'}for r in rows[33:]],'particles':65536,'iterations':120,'profiling_trials':3}
Path(output).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
