#!/usr/bin/env python3
"""Re-author composable products against current source; all authority is checked."""
import argparse,json,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'knowledge/producers')]
from producers.partition_index_representation import generate as index
from producers.representations import generate
from producers.compose_representations import compose
from producers.source_grouped_laws import generate as grouped

def prepare(compiler,output):
    compiler=compiler.resolve();output=output.resolve();output.mkdir(parents=True,exist_ok=True)
    records=[]
    def run(*args):
        p=subprocess.run([str(compiler),*map(str,args)],cwd=ROOT,capture_output=True,text=True)
        if p.returncode:raise RuntimeError(p.stderr)
        return json.loads(p.stdout)if p.stdout.strip().startswith('{')else None
    def write(path,value):path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value,separators=(',',':'))+'\n');return path
    def model(source,name):
        path=output/(name+'-model.json');run('emit-action-model',source,'-o',path);return json.loads(path.read_text())
    def candidate(source,name,request):
        path=write(output/(name+'.json'),request);checked=run('check-representation',source,path)
        records.append(dict(name=name,source=str(source.relative_to(ROOT)),request=str(path.relative_to(ROOT)),checked={k:checked[k]for k in ["status","source","representation"]}));return request
    source=ROOT/'knowledge/research/keep-parity/app.ink';m=model(source,'keep')
    proposed=generate(m,output/'keep-authoring',cache_query='zero',preserve_cache=True,delta_query=True)
    for i,r in enumerate(proposed['requests']):candidate(source,'keep/representation-'+str(i),r)
    write(output/'keep/migration.json',proposed['migration'])
    partition=candidate(source,'point-index',index(m,output/'point-index-authoring'))
    cache=candidate(source,'keep-point',proposed['requests'][1])
    candidate(source,'index-point-cache',compose(m,[partition,cache],output/'point-product-authoring',{'get':0,'zero':1}))
    source=ROOT/'examples/field-sensitive-point.ink';m=model(source,'field')
    field=generate(m,output/'field-authoring',cache_query='zero_field',preserve_cache=True,delta_query=True)
    candidate(source,'field-point',field['requests'][1])
    source=ROOT/'examples/composable-filtered-state.ink';m=model(source,'aggregate')
    partition=index(m,output/'aggregate-index-authoring')
    candidate(source,'aggregate-index',partition)
    total=generate(m,output/'total-authoring',cache_query='total_query',preserve_cache=True,aggregate_query=True)
    count=generate(m,output/'count-authoring',cache_query='count_query',preserve_cache=True,aggregate_query=True)
    candidate(source,'aggregate-direct',total['requests'][0]);candidate(source,'aggregate-total',total['requests'][1]);candidate(source,'aggregate-count',count['requests'][1])
    first=candidate(source,'index-total-cache',compose(m,[partition,total['requests'][1]],output/'first-product-authoring',{'get':0,'total_query':1,'count_query':0}))
    candidate(source,'index-two-aggregates',compose(m,[first,count['requests'][1]],output/'full-product-authoring',{'get':0,'total_query':0,'count_query':1}))
    source=ROOT/'examples/grouped-state.ink';m=model(source,'grouped');view=grouped(m,output/'grouped-authoring')
    path=write(output/'source-group-view.json',view);core=output/'source-group-core.json';run('emit-core',source,'-o',core);checked=run('knowledge-check',core,path)
    write(output/'products-admission.json',dict(schema=1,status='checked',products=records,mathematics=checked))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--output',type=Path,default=ROOT/'knowledge/research/composable-state/main-integration');a=p.parse_args();prepare(a.compiler,a.output)
