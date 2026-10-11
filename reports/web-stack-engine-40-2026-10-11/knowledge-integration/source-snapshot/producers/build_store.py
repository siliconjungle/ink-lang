#!/usr/bin/env python3
"""Reproduce the initial canonical snapshot from explicitly quarantined research fixtures.
This is an authoring/import tool, never a production discovery path.
"""
import argparse,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from ink_knowledge import Store,entry,identity,semantic_entry,canonical
from semantic_laws import examples
from local_collection_laws import examples as local_examples
from collection_pipeline_laws import examples as pipeline_examples
from shared_sequence_laws import examples as shared_examples
from sort_cardinality_laws import examples as sort_examples
from filtered_sort_laws import examples as filtered_sort_examples

def build(output):
    source={};names={};objects={};translated={};active=set()
    for p in sorted((ROOT/'research').glob('**/objects/*.json')):
        v=json.loads(p.read_text());source[p.stem]=v
        names[str(p.parent.parent.relative_to(ROOT/'research'))+'/'+v.get('name',p.stem)]=p.stem
    def remap(v):
        if isinstance(v,str) and v in source:return convert(v)
        if isinstance(v,list):return [remap(x) for x in v]
        if isinstance(v,dict):return {k:remap(x) for k,x in v.items()}
        return v
    def convert(old):
        if old in translated:return translated[old]
        if old in active:raise ValueError('cyclic research input')
        active.add(old);v=remap({k:x for k,x in source[old].items() if k not in ('schema','semantics','dependencies','name','kind')})
        deps=[convert(x) for x in source[old].get('dependencies',[])];sem=source[old]['semantics']
        if 'declaration' in v:
            tag,d=next(iter(v['declaration'].items()));kind='theorem' if tag=='Theorem' else 'definition'
            params=dict(d.get('params',[]));result=d.get('result');conditions=d.get('conditions',[])
        else:
            kind='definition' if source[old].get('kind')=='definition' else 'theorem'
            params=dict(v.get('params',[]));result=v.get('result');conditions=v.get('conditions',[])
            if kind=='theorem':v.setdefault('conditions',[])
        obj=entry(kind,sem,v,deps,parameters=params,result=result,conditions=conditions)
        i=identity(obj);objects[i]=obj;translated[old]=i;active.remove(old);return i
    for i in source:convert(i)
    names={n:translated[i] for n,i in names.items()};rewrites=[]
    for n,law in enumerate(examples()):
        obj=semantic_entry(law);i=identity(obj);objects[i]=obj;rewrites.append(i);names[f'rewrite/example-{n:02}']=i
    local_roots=[]
    for name,law in local_examples().items():
        obj=semantic_entry(law);i=identity(obj);objects[i]=obj;rewrites.append(i);local_roots.append(i);names['rewrite/'+name]=i
    pipeline_roots=[]
    for name,law in pipeline_examples().items():
        obj=semantic_entry(law);i=identity(obj);objects[i]=obj;rewrites.append(i);pipeline_roots.append(i);names['rewrite/'+name]=i
    shared_roots=[]
    for name,law in shared_examples().items():
        obj=semantic_entry(law);i=identity(obj);objects[i]=obj;rewrites.append(i);shared_roots.append(i);names['rewrite/'+name]=i
    sort_laws,sort_names=sort_examples();sort_roots=[]
    for name,law in sort_laws.items():
        obj=semantic_entry(law);i=identity(obj);objects[i]=obj;names['rewrite/'+name]=i
        if name in sort_names:rewrites.append(i);sort_roots.append(i)
    filtered_sort_laws,filtered_sort_names=filtered_sort_examples();filtered_sort_roots=[]
    for name,law in filtered_sort_laws.items():
        obj=semantic_entry(law);i=identity(obj);objects[i]=obj;names['rewrite/'+name]=i
        if name in filtered_sort_names:rewrites.append(i);filtered_sort_roots.append(i)
    store=Store.publish(output,objects.values(),names)
    store.rebuild()
    (Path(output)/'store/rewrite-view.json').write_bytes(canonical(store.bundle(rewrites))+b'\n')
    (Path(output)/'store/local-collection-view.json').write_bytes(canonical(store.bundle(local_roots))+b'\n')
    (Path(output)/'store/collection-pipeline-view.json').write_bytes(canonical(store.bundle(pipeline_roots))+b'\n')
    (Path(output)/'store/shared-sequence-view.json').write_bytes(canonical(store.bundle(shared_roots))+b'\n')
    (Path(output)/'store/sort-cardinality-view.json').write_bytes(canonical(store.bundle(sort_roots))+b'\n')
    (Path(output)/'store/filtered-sort-view.json').write_bytes(canonical(store.bundle(filtered_sort_roots))+b'\n')
    return store
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('--output',type=Path,required=True);a=p.parse_args()
    s=build(a.output);print(json.dumps(dict(snapshot=s.snapshot_id,entries=len(s.members()))))
