#!/usr/bin/env python3
"""Package a proved source alternative and missing helpers as untrusted data.

The generic source-algorithm producer instantiates the template; ordinary source
extension and equality checkers must admit every concrete application.
"""
import argparse,json,sys
from pathlib import Path
sys.path[:0]=[str(Path(__file__).resolve().parents[2]/'knowledge')]
from ink_knowledge import Store,entry,identity

def package(target,helpers,law_entry):
    payload=law_entry['payload'];context=payload['definition_context']
    old={f['name']for f in target['program']['functions']}
    supplied={f['name']:f for f in helpers['program']['functions']}
    missing=sorted(set(context['definitions'])-old)
    if not missing:raise ValueError('law needs no missing helper definitions')
    definitions=dict(functions=[supplied[n]for n in missing],records={},enums={},ids=[])
    needed=set()
    def references(v):
        if isinstance(v,dict):
            if isinstance(v.get('Named'),str):needed.add(v['Named'])
            if 'Record'in v:needed.add(v['Record'][0])
            if 'Op'in v and v['Op'][0].startswith('record:'):needed.add(v['Op'][0][7:])
            for child in v.values():references(child)
        elif isinstance(v,list):
            for child in v:references(child)
    references(definitions['functions'])
    for key in ['params','from','to','conditions','proof']:references(payload.get(key))
    visited=set()
    while needed-visited:
        name=min(needed-visited);visited.add(name)
        for kind in ['records','enums']:
            if name in context[kind]and name not in target['program'][kind]:
                definitions[kind][name]=helpers['program'][kind][name];references(definitions[kind][name])
    law=dict(payload,schema=1,semantics=law_entry['semantics'],dependencies=law_entry['dependencies'])
    return entry('definition','ink-source-algorithm-v1',dict(type_parameters=[],definitions=definitions,law=law),law_entry['dependencies'])

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__)
    for name in ['target-core','helper-core','law-store','root']:p.add_argument('--'+name,type=Path,required=True)
    p.add_argument('--law',required=True);p.add_argument('--name',required=True);a=p.parse_args()
    source=Store(a.law_store);obj=source.object(a.law)
    template=package(json.loads(a.target_core.read_bytes()),json.loads(a.helper_core.read_bytes()),obj)
    dependencies=source.bundle(obj['dependencies'])['objects']if obj['dependencies']else{}
    objects=[*dependencies.values(),template];names={'source-algorithms/'+a.name:identity(template)}
    result=Store(a.root).extend(objects,names)if(a.root/'store/snapshot.json').exists()else Store.publish(a.root,objects,names)
    print(json.dumps(dict(template=identity(template),snapshot=result.snapshot_id,scope='Untrusted template packaging; no new rewrite authority')))
