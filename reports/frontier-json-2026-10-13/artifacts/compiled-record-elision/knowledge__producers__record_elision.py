"""Untrusted private record layout authoring, with ordinary bidirectional proofs.

The compiler exports fixed codecs. Knowledge proposes sites and proofs; measured
lifecycle evidence must select them. No record names or usage hints grant authority.
"""
import argparse, json, subprocess, tempfile
from pathlib import Path
from ink_knowledge import Store, identity
from ink_knowledge.store import entry
from producers.physical_capabilities import base, invoke, write
from producers.workspace import compiler_path

MATH='first-order-inductive-equality-v1'
def var(name): return {'Var':name}
def call(name,value): return {'Call':dict(function=name,arguments=[value])}
def construct(name,value): return {'Construct':dict(datatype=name,constructor=0,arguments=[value])}
def convert(left,right): return {'Convert':{'from':left,'to':right}}
def codec_objects(schema):
    wrapper=schema['wrapper'];enc=lambda x:call(schema['encode'],x);dec=lambda x:call(schema['decode'],x)
    wrapped=var('wrapped');payload=var('payload');node=construct(wrapper,payload)
    proofs=[
        ([['wrapped',{'Data':wrapper}]],dec(enc(wrapped)),wrapped,{'Cases':dict(variable='wrapped',**{'from':dec(enc(wrapped)),'to':wrapped},cases=[dict(bindings=['payload'],proof=convert(dec(enc(node)),node))])}),
        ([['payload',schema['payload']]],enc(dec(payload)),payload,convert(enc(dec(payload)),payload)),
    ]
    objects=list(schema['entries'].values());roots=[]
    for params,left,right,proof in proofs:
        obj=entry('theorem',MATH,{'declaration':{'Theorem':dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof)}},list(schema['entries']),parameters=dict(params))
        objects.append(obj);roots.append(identity(obj))
    return objects,roots

def produce(source,compiler,directory,records,source_core=False,physical=None):
    directory=Path(directory);directory.mkdir(parents=True,exist_ok=True)
    flags=['--core']if source_core else []
    objects=[];layouts=[]
    with tempfile.TemporaryDirectory(prefix='ink-record-codecs-')as temp:
        scratch=Path(temp)
        if physical is None:
            subjects=scratch/'subjects.json';invoke(compiler,'emit-bounds-obligations',source,*flags,'-o',subjects)
            plan=base(json.loads(subjects.read_bytes())['source'])
        else:plan=json.loads(json.dumps(physical))
        for record in sorted(set(records)):
            output=scratch/'codec.json';invoke(compiler,'emit-record-codec',source,*flags,'--entry',record,'-o',output)
            authored,roots=codec_objects(json.loads(output.read_bytes()));objects.extend(authored)
            layouts.append(dict(record=record,roundtrip=roots[0],inverse=roots[1]))
        store=Store.publish(directory,list({identity(o):o for o in objects}.values()))
        for layout in layouts:layout['knowledge']=store.bundle([layout['roundtrip'],layout['inverse']])
        plan['record_elisions']=layouts
        path=write(directory/'physical.json',plan);invoke(compiler,'check-physical-plan',source,path,*flags)
        write(directory/'plan.json',dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=plan['input_core_sha256'],steps=[dict(kind='physical',package=plan)]))
        return plan

def candidates(context,groupings=('all','individual')):
    if context.get('representation')or context.get('emit_target')!='javascript':
        yield dict(status='declined',label='record-elision',reason='requires source JavaScript carrier');return
    records=[name for name,fields in context['core']['program']['records'].items()if len(fields)==1]
    if not records:return
    with tempfile.TemporaryDirectory(prefix='ink-record-recipe-')as temp:
        directory=Path(temp);source=write(directory/'source.json',context['core']);eligible=[]
        for name in sorted(records):
            try:
                plan=produce(source,context['compiler'],directory/name,[name],True,context.get('physical'))
                eligible.append(name)
                if 'individual'in groupings:yield dict(status='proposal',label='record-elision/'+name,step=dict(kind='physical',package=plan))
            except (ValueError,subprocess.TimeoutExpired)as error:yield dict(status='declined',label='record-elision/'+name,reason=str(error))
        if eligible and 'all'in groupings:
            plan=produce(source,context['compiler'],directory/'all',eligible,True,context.get('physical'))
            yield dict(status='proposal',label='record-elision/all',step=dict(kind='physical',package=plan))

def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('source',type=Path);p.add_argument('--compiler',type=Path,default=compiler_path());p.add_argument('-o',type=Path,required=True);p.add_argument('--record',action='append',required=True);p.add_argument('--core',action='store_true');a=p.parse_args()
    plan=produce(a.source,a.compiler,a.o,a.record,a.core);print(json.dumps(dict(status='checked',records=len(plan['record_elisions']))))
if __name__=='__main__':main()
