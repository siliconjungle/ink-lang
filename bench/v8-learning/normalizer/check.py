"""Replay ordinary Convert proofs; the normalizer cache grants no authority."""
import json,os,subprocess,tempfile
from pathlib import Path
from cases import groups,legacy,MATH
from ink_knowledge import Store,entry,identity,canonical
from producers import point_delta as p
root=Path(__file__).resolve().parents[3];compiler=Path(os.environ.get('INK_COMPILER',root/'target/debug/ink')).resolve();directory=Path(__file__).resolve().parent
old=legacy();objects={};roots=[]
for group,cases in groups().items():
 for case in cases:
  for n,term in enumerate(case['terms']):
   before=old(term,case['objects']);after=p.normal(term,case['objects']);assert before==after
   if 'expected'in case:
    assert after==case['expected'][n]
    objects.update(case['objects']);eq={'from':term,'to':after}
    theorem=dict(params=[],conditions=[],**eq,proof={'Convert':eq})
    deps=set(case['objects'])
    obj=entry('theorem',MATH,dict(declaration={'Theorem':theorem}),deps,parameters={},conditions=[])
    ident=identity(obj);objects[ident]=obj;roots.append(ident)
with tempfile.TemporaryDirectory()as tmp:
 d=Path(tmp);source=d/'source.ink';source.write_text('module cache_replay;fn placeholder()->u64{return 0;}\n')
 subprocess.run([str(compiler),'emit-core',str(source),'-o',str(d/'core.json')],check=True,capture_output=True)
 store=Store.publish(d/'knowledge',objects.values());view=d/'view.json';view.write_bytes(canonical(store.bundle(roots)))
 checked=subprocess.run([str(compiler),'knowledge-check',str(d/'core.json'),str(view)],check=True,capture_output=True,text=True)
 # Re-authentication cannot make an incorrect converted result into a proof.
 import copy
 false=copy.deepcopy(objects[roots[-1]]);false['payload']['declaration']['Theorem']['to']['U64']+=1
 false['payload']['declaration']['Theorem']['proof']['Convert']['to']['U64']+=1
 bad=Store.publish(d/'bad',[*objects.values(),false]);badview=d/'bad.json';badview.write_bytes(canonical(bad.bundle([identity(false)])))
 rejected=subprocess.run([str(compiler),'knowledge-check',str(d/'core.json'),str(badview)],capture_output=True,text=True)
 assert rejected.returncode!=0
 report=dict(schema=1,checked=json.loads(checked.stdout),forged_result_rejected=True,groups={k:sum(len(c['terms'])for c in v)for k,v in groups().items()},scope='Exact old/new normal forms match; six helper DAG theorems independently replay through ordinary Convert with unchanged checker limits')
 (directory/'proof-validation.json').write_text(json.dumps(report,indent=2)+'\n')
 print(json.dumps(dict(theorems=len(roots),forged_result_rejected=True,normal_forms_checked=sum(report['groups'].values()))))
