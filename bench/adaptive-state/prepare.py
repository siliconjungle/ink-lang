"""Prepare literal and proved cached variants using the ordinary producer/checker."""
import argparse,json,subprocess,sys
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--point',action='store_true');p.add_argument('--target-key',required=True);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];sys.path[:0]=[str(root/'planner'),str(root/'knowledge')]
from ink_planner.adaptive_state import prepare
from producers.representations import generate
source=root/('examples/point-query-delta.ink'if a.point else 'bench/adaptive-state/aggregate.ink')
a.o.mkdir(parents=True,exist_ok=True);model=a.o/'model.json'
subprocess.run([str(a.compiler.resolve()),'emit-action-model',str(source),'-o',str(model)],check=True)
v=generate(json.loads(model.read_text()),a.o/'database',cache_query='zero',preserve_cache=True,compact_queries=True,delta_query=a.point,aggregate_query=not a.point)
source_id=v['requests'][0]['input_core_sha256']
for name,steps in [('direct',[]),('cached',[dict(kind='representation',package=v['requests'][1])])]:
 (a.o/(name+'.plan.json')).write_text(json.dumps(dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=source_id,steps=steps)))
index=a.o/'variants.json';index.write_text(json.dumps([dict(id=n,plan=n+'.plan.json')for n in ['direct','cached']]))
prepare(a.compiler,source,index,a.target_key,a.o/'bundle')
