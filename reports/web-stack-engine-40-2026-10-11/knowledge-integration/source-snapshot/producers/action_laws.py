#!/usr/bin/env python3
"""Publish/recheck the fixed four-entry parametric table-removal library.

This authoring utility keeps research-library and canonical-store transport
separate. build_store.py imports the resulting immutable research objects.
"""
import argparse,hashlib,json,subprocess,sys
from pathlib import Path
from action_replacement import general_law,MATH

def build(directory,compiler):
    objects,roles=general_law();directory=Path(directory);(directory/'objects').mkdir(parents=True,exist_ok=True)
    translated={};names={};pending=dict(objects)
    def remap(value):
        if isinstance(value,str):return translated.get(value,value)
        if isinstance(value,list):return [remap(x) for x in value]
        if isinstance(value,dict):return {k:remap(v) for k,v in value.items()}
        return value
    while pending:
        ready=sorted(i for i,e in pending.items() if all(d in translated for d in e['dependencies']))
        if not ready:raise ValueError('cyclic library')
        for i in ready:
            obj=pending.pop(i);name=next(n for n,r in roles.items() if r==i)
            raw=(json.dumps(dict(schema=1,semantics=MATH,name=name,dependencies=[translated[d] for d in obj['dependencies']],declaration=remap(obj['payload']['declaration'])),separators=(',',':'))+'\n').encode()
            local=hashlib.sha256(raw).hexdigest();path=directory/'objects'/f'{local}.json'
            if path.exists() and path.read_bytes()!=raw:raise ValueError('immutable collision')
            path.write_bytes(raw);translated[i]=local;names[name]=local
    lock=dict(schema=1,semantics=MATH,objects=sorted(translated.values()));(directory/'lock.json').write_text(json.dumps(lock,indent=2)+'\n');(directory/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    r=subprocess.run([str(compiler),'verify-library',str(directory/'lock.json')],capture_output=True,text=True)
    if r.returncode:raise ValueError(r.stderr or r.stdout)
    return dict(objects=len(objects),canonical_roles=roles,checked=json.loads(r.stdout))
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);p.add_argument('--compiler',type=Path,required=True);a=p.parse_args()
    print(json.dumps(build(a.directory.resolve(),a.compiler.resolve())))
