#!/usr/bin/env python3
"""Re-author current source-bound replay fixtures; preserve historical requests."""
import argparse
import hashlib
import json
import subprocess
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'knowledge/producers')]
from ink_knowledge import Store,identity
from ink_knowledge.store import entry
from ink_knowledge.implementation_candidates import identity_selection,publish_candidates
from producers.representations import generate,refs,subst,var,call,convert,trans,MATH,MIG

def write(path,value):
    path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,separators=(',',':'))+'\n');return path

def bridge(old,new,directory):
    objects={**old['knowledge']['objects'],**new['knowledge']['objects']}
    a,b=(objects[r['representation']]['payload']for r in (old,new))
    assert len(b['relations'])==1
    reuse=a['physical_state']==b['physical_state'] and a['relations']==b['relations']
    declaration={'Function':dict(params=[['physical',a['physical_state']]],result=b['physical_state'],body=var('physical')if reuse else call(b['encode'],[call(a['decode'],[var('physical')])]),recursive=None)}
    obj=entry('definition',MATH,{'declaration':declaration},refs(declaration),parameters={'physical':a['physical_state']},result=b['physical_state']);fid=identity(obj);objects[fid]=obj
    rel=b['relations'][0];p=call(fid,[var('physical')]);logical=var('logical')
    left=call(rel['left'],[p,logical]);right=call(rel['right'],[p,logical])
    proof={'Hypothesis':0}if reuse else trans(convert(left,call(b['encode'],[call(a['decode'],[var('physical')])])),subst(a['snapshot'],call(b['encode'],[var('replacement')])),convert(call(b['encode'],[logical]),right))
    payload={'from':old['representation'],'to':new['representation'],'function':fid,'preservation':[proof]}
    obj=entry('bridge',MIG,payload,refs(payload));obj['interface']['operations']=['migrate'];rid=identity(obj);objects[rid]=obj
    store=Store.publish(directory,objects.values());return dict(root=rid,knowledge=store.bundle([rid]))

def prepare(compiler,output):
    compiler=compiler.resolve();output=output.resolve();receipts=[];compiler_hash=hashlib.sha256(compiler.read_bytes()).hexdigest()
    def run(*args):
        result=subprocess.run([str(compiler),*map(str,args)],cwd=ROOT,capture_output=True,text=True)
        if result.returncode:raise RuntimeError(result.stderr)
        return json.loads(result.stdout)if result.stdout.strip().startswith('{')else None
    def model(source,name):
        path=ROOT/'build/composable-fixtures'/name/'model.json';path.parent.mkdir(parents=True,exist_ok=True);run('emit-action-model',source,'-o',path);return json.loads(path.read_text())
    def candidate(source,directory,name,request):
        path=write(directory/(name+'.json'),request);checked=run('check-representation',source,path)
        receipts.append(dict(name=str(path.relative_to(output)),source=checked['source'],representation=checked['representation']));return path
    def migration(source,directory,name,old,new,request):
        path=write(directory/(name+'.json'),request);run('check-migration',source,old,new,path);return path
    source=ROOT/'examples/point-query-delta.ink';d=output/'point-delta';m=model(source,'point')
    refresh=generate(m,ROOT/'build/composable-fixtures/point-refresh',cache_query='zero',preserve_cache=True)
    delta=generate(m,ROOT/'build/composable-fixtures/point-delta',cache_query='zero',preserve_cache=True,delta_query=True)
    direct,refreshed,changed=[candidate(source,d,n,r)for n,r in [('direct',refresh['requests'][0]),('refresh',refresh['requests'][1]),('delta',delta['requests'][1])]]
    migration(source,d,'migration',direct,changed,delta['migration'])
    migration(source,d,'forward',refreshed,changed,bridge(refresh['requests'][1],delta['requests'][1],ROOT/'build/composable-fixtures/point-forward'))
    migration(source,d,'reverse',changed,refreshed,bridge(delta['requests'][1],refresh['requests'][1],ROOT/'build/composable-fixtures/point-reverse'))
    store,ids=publish_candidates(output/'implementation-candidates',[identity_selection(m['source']),delta['requests'][1]])
    write(store.root/'publication.json',dict(source=m['source'],snapshot=store.snapshot_id,baseline=ids[0],candidates=ids[1:]))
    source=ROOT/'knowledge/research/source-representations/app.ink';d=output/'source-representations';m=model(source,'retention')
    result=generate(m,ROOT/'build/composable-fixtures/retention',cache_query='zero',preserve_cache=True)
    left,right=[candidate(source,d,n,r)for n,r in zip(['retained-direct','retained-query-cache'],result['requests'])]
    migration(source,d,'retained-migration',left,right,result['migration'])
    source=ROOT/'examples/filtered-aggregate.ink';d=output/'filtered-aggregate';m=model(source,'filtered')
    refresh=generate(m,ROOT/'build/composable-fixtures/filtered-refresh',cache_query='total_query',preserve_cache=True)
    direct=candidate(source,d,'direct',refresh['requests'][0]);candidate(source,d,'refresh',refresh['requests'][1])
    for label,query in [('sum','total_query'),('count','count_query')]:
        result=generate(m,ROOT/('build/composable-fixtures/filtered-'+label),cache_query=query,preserve_cache=True,aggregate_query=True)
        changed=candidate(source,d,label+'-delta',result['requests'][1]);migration(source,d,label+'-forward',direct,changed,result['migration'])
    source=ROOT/'examples/representation-cache-maintenance.ink';d=output/'compact-queries';m=model(source,'compact')
    previous=generate(m,ROOT/'build/composable-fixtures/previous',cache_query='zero',preserve_cache=True)
    cached=generate(m,ROOT/'build/composable-fixtures/compact',cache_query='zero',preserve_cache=True,compact_queries=True)
    left=candidate(source,d,'previous',previous['requests'][1]);right=candidate(source,d,'cached',cached['requests'][1])
    migration(source,d,'forward',left,right,bridge(previous['requests'][1],cached['requests'][1],ROOT/'build/composable-fixtures/compact-forward'))
    if hashlib.sha256(compiler.read_bytes()).hexdigest()!=compiler_hash:raise RuntimeError('compiler changed during fixture admission')
    write(output/'fixtures-admission.json',dict(schema=1,status='checked',compiler_sha256=compiler_hash,fixtures=receipts,scope='Fresh proposals checked against current source; archived fixture bytes remain unchanged.'))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/'knowledge/research/composable-state');a=p.parse_args();prepare(a.compiler,a.output)
