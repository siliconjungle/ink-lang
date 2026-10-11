#!/usr/bin/env python3
"""Untrusted laws over fixed affine-storage semantics; no optimiser patterns."""
import argparse,json,sys
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from semantic_laws import value,arrow,term,var,bound,lam,word,op,law

def examples():
    result={};boolean=value('Bool');true=term(boolean,{'Bool':True})
    for k in ('U32','U64','I32','Bool'):
        for v in ('U32','U64','I32','F32','Bool'):
            scalar=value(v);keysort=value(k);mapsort=value({'Map':[k,v]})
            m=var(mapsort,'m');key=var(keysort,'key');x=var(scalar,'x');fallback=var(scalar,'fallback')
            updated=op(mapsort,'method:set',m,key,x)
            prefix=f'owned-map/{k.lower()}-{v.lower()}'
            result[prefix+'/read-write']=law({'m':mapsort,'key':keysort,'x':scalar,'fallback':scalar},op(scalar,'method:get_or',updated,key,fallback),x)
            result[prefix+'/contains-write']=law({'m':mapsort,'key':keysort,'x':scalar},op(boolean,'method:contains',updated,key),true)
            removed=op(mapsort,'method:remove',m,key)
            result[prefix+'/read-remove']=law({'m':mapsort,'key':keysort,'fallback':scalar},op(scalar,'method:get_or',removed,key,fallback),fallback)
            result[prefix+'/contains-remove']=law({'m':mapsort,'key':keysort},op(boolean,'method:contains',removed,key),term(boolean,{'Bool':False}))
            if k=='Bool':
                for name in list(result):
                    if name.startswith(prefix):result[name]['proof']={'Cases':dict(condition=key,on_false='Normalize',on_true='Normalize')}
            # Ordinary let application is part of the semantic tree. Publish
            # binder-shaped endpoints rather than teaching the matcher a map case.
            for name in list(result):
                if not name.startswith(prefix):continue
                original=result[name];receiver=original['from']['node']['Op'][1][0]
                body=dict(original['from']);body={'sort':body['sort'],'node':{'Op':[body['node']['Op'][0],[bound(mapsort,0),*body['node']['Op'][1][1:]]]}}
                wrapped=op(original['from']['sort'],'apply',lam(mapsort,body),receiver)
                result[name+'/let']=law(original['params'],wrapped,original['to'],original['proof'])
            for output in dict.fromkeys((v,'Bool')):
                result_sort=value(output);answer=var(result_sort,'answer')
                result[prefix+'/discard-let-'+output.lower()]=law({'initial':mapsort,'answer':result_sort},op(result_sort,'apply',lam(mapsort,answer),var(mapsort,'initial')),answer)
    for v in ('U32','U64','I32','F32','Bool'):
        buffer=value({'Buffer':v});sequence=value({'List':v});scalar=value(v)
        xs=var(sequence,'xs');x=var(scalar,'x')
        left=op(value('U32'),'method:len',op(buffer,'method:push',op(buffer,'call:buffer',xs),x))
        right=op(value('U32'),'binary:+',op(value('U32'),'call:length',xs),word('U32',1))
        result[f'owned-buffer/push-length-{v.lower()}']=law({'xs':sequence,'x':scalar},left,right,{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')})
        initial=var(buffer,'initial');stoptype=arrow(buffer,boolean);steptype=arrow(value('U32'),arrow(buffer,buffer))
        result[f'owned-loop/zero-buffer-{v.lower()}']=law({'initial':buffer,'stop':stoptype,'step':steptype},op(buffer,'call:repeat_until',word('U32',0),initial,var(stoptype,'stop'),var(steptype,'step')),initial)
        for output in dict.fromkeys((v,'U32')):
            result_sort=value(output);answer=var(result_sort,'answer')
            result[f'owned-buffer/discard-let-{v.lower()}-{output.lower()}']=law({'initial':buffer,'answer':result_sort},op(result_sort,'apply',lam(buffer,answer),var(buffer,'initial')),answer)
    return result

def publish(output):
    output=Path(output);previous=Store(output)
    objects=[previous.object(i) for i in previous.members()];names=json.loads((output/'store/names.json').read_text());roots=json.loads((output/'store/rewrite-view.json').read_text())['roots'];laws=examples()
    for name,proof in laws.items():
        obj=semantic_entry(proof);i=identity(obj);objects.append(obj);names['rewrite/'+name]=i;roots.append(i)
    store=Store.publish(output,objects,names);store.rebuild()
    (output/'store/rewrite-view.json').write_bytes(canonical(store.bundle(sorted(set(roots))))+b'\n')
    (output/'store/owned-collection-view.json').write_bytes(canonical(store.bundle([identity(semantic_entry(x)) for x in laws.values()]))+b'\n')
    return store
if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output-store',type=Path,required=True);a=p.parse_args();store=publish(a.output_store);print(json.dumps(dict(laws=len(examples()),snapshot=store.snapshot_id)))
