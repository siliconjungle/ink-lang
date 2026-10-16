"""Same-input dispatch controls; loading proofs and checking them are separate."""
import argparse,cProfile,hashlib,importlib.util,json,platform,pstats,statistics,sys,time
from pathlib import Path
from unittest.mock import patch
from producers import frozen_laws
from ink_knowledge import pattern_index
p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);p.add_argument('--rounds',type=int,default=7);a=p.parse_args()
root=Path.cwd();d=root/'build/v8-head-discovery';spec=importlib.util.spec_from_file_location('prior_frozen_laws',d/'baseline-frozen.py');baseline=importlib.util.module_from_spec(spec);spec.loader.exec_module(baseline)
inputs=json.loads((d/'subjects.json').read_bytes());subjects={name:json.loads((root/row['path']).read_bytes())for name,row in inputs['subjects'].items()};libraries=sorted((root/'knowledge/producers/data').glob('*/index.json'));rows=[]
inputs_sha={str(f.relative_to(root)):hashlib.sha256(f.read_bytes()).hexdigest()for f in [*libraries,Path(frozen_laws.__file__),Path(pattern_index.__file__),root/'planner/ink_planner/semantic_search.py']}
def lookup(module,subject,library):
 with patch.object(module,'load',side_effect=lambda _,row:row['sha256']):return module.specialize(subject,library.parent,library.parent.name+'/')
for name,subject in subjects.items():
 for library in libraries:
  expected=lookup(baseline,subject,library);assert lookup(frozen_laws,subject,library)==expected,(name,library)
  times={'exhaustive':[],'indexed':[]};modules={'exhaustive':baseline,'indexed':frozen_laws}
  for i in range(a.rounds):
   for lane in (['exhaustive','indexed']if i%2==0 else['indexed','exhaustive']):
    start=time.perf_counter_ns();actual=lookup(modules[lane],subject,library);times[lane].append(time.perf_counter_ns()-start);assert actual==expected
  calls={}
  for lane,module in modules.items():
   profile=cProfile.Profile();profile.runcall(lookup,module,subject,library)
   calls[lane]=sum(v[1]for k,v in pstats.Stats(profile).stats.items()if k[2]=='match'and k[0].endswith('/ink_planner/semantic_search.py'))
  rows.append(dict(program=name,library=library.parent.name,matched=expected,match_calls=calls,nanoseconds=times,median_ns={k:statistics.median(v)for k,v in times.items()}))
assert all(hashlib.sha256((root/f).read_bytes()).hexdigest()==v for f,v in inputs_sha.items()),'query source/index changed'
result=dict(schema=1,inputs_sha256=inputs_sha,host=platform.platform(),python=sys.version,rounds=a.rounds,subjects=inputs,baseline_source_sha256=hashlib.sha256((d/'baseline-frozen.py').read_bytes()).hexdigest(),current_source_sha256=hashlib.sha256(Path(frozen_laws.__file__).read_bytes()).hexdigest(),current_index_source_sha256=hashlib.sha256(Path(pattern_index.__file__).read_bytes()).hexdigest(),rows=rows,totals=dict(match_calls={lane:sum(r['match_calls'][lane]for r in rows)for lane in ['exhaustive','indexed']},sum_median_ns={lane:sum(r['median_ns'][lane]for r in rows)for lane in ['exhaustive','indexed']}),scope='Required dispatch mechanism control on all ten frozen subjects and all three installed immutable libraries. Alternating same-process rounds per fresh process. Metadata file reading/parsing and subject head construction included; semantic subject JSON decoding, imports, proof decompression and kernel checking excluded. Shared host. Exact returned order/IDs must equal exhaustive dispatch. Not whole-compiler or runtime speedup evidence.')
a.output.write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result['totals']))
