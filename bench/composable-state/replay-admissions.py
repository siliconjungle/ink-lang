#!/usr/bin/env python3
"""Replay immutable admissions with a rebuilt compiler; never rebind source pins."""
import argparse,hashlib,json,subprocess,sys,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store

def sha(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def replay(compiler,report,math_sources,evidence):
    compiler=compiler.resolve();before=sha(compiler);store=Store(ROOT/'knowledge')
    general_path=evidence/('mathematics-admission.json'if(evidence/'mathematics-admission.json').exists()else'admission-final.json')
    source_path=evidence/('representations-admission.json'if(evidence/'mathematics-admission.json').exists()else'representations-admission-final.json')
    general=json.loads(general_path.read_text())
    source=json.loads(source_path.read_text())
    assert general['status']==source['status']=='checked'
    paths=subprocess.check_output(['rg','--files','examples','knowledge/research'],cwd=ROOT,text=True).splitlines()
    sources={sha(ROOT/p):ROOT/p for p in paths if p.endswith('.ink')}
    results=[];mathematics=[]
    def run(*args):
        result=subprocess.run([str(compiler),*map(str,args)],cwd=ROOT,capture_output=True,text=True)
        if result.returncode:raise RuntimeError(result.stderr)
        return json.loads(result.stdout)if result.stdout.strip().startswith('{')else None
    with tempfile.TemporaryDirectory(prefix='ink-admission-replay-')as temp:
        temp=Path(temp)
        def check_math(name,core,roots):
            view=temp/(name+'-view.json');view.write_text(json.dumps(store.bundle(roots)))
            checked=run('knowledge-check',core,view)
            if checked['status']!='checked':raise RuntimeError('missing mathematical admission')
            mathematics.append(dict(name=name,roots=roots,core_file_sha256=sha(core),view_sha256=sha(view)))
        subject=temp/'subject.ink';subject.write_text('module state_admission;fn identity(x:u32)->u32{return x;}')
        core=temp/'subject.json';run('emit-core',subject,'-o',core)
        check_math('state-calculus',core,general['admission']['entries'])
        for item in source['mathematics']:
            name=item['name'];path=math_sources[name]if name in math_sources else math_sources[name.removeprefix('current/')];core=temp/(name.replace('/','-')+'-core.json');run('emit-core',path,'-o',core)
            if sha(core)!=item['core_file_sha256']:raise RuntimeError('source mathematics core changed')
            check_math(item['name'].replace('/','-'),core,item['roots'])
        for number,item in enumerate(source['candidates']):
            path=sources[item['source_file_sha256']]
            request=dict(schema=1,semantics='ink-source-representation-v1',input_core_sha256=item['source'],knowledge=store.bundle([item['representation']]),representation=item['representation'])
            proposal=temp/f'request-{number}.json';proposal.write_text(json.dumps(request))
            checked=run('check-representation',path,proposal)
            if checked['status']!='checked' or checked['source']!=item['source'] or checked['representation']!=item['representation']:raise RuntimeError('source admission mismatch')
            results.append(dict(**item,source_file=str(path.relative_to(ROOT)),request_sha256=sha(proposal)))
    if sha(compiler)!=before:raise RuntimeError('compiler changed during replay')
    if Store(ROOT/'knowledge').snapshot_id!=store.snapshot_id:raise RuntimeError('knowledge pointer changed during replay')
    receipt=dict(schema=1,status='checked',compiler_sha256=before,snapshot=store.snapshot_id,candidates=results,mathematics=mathematics,previous_admission_receipts={'mathematics':sha(general_path),'representations':sha(source_path)},scope='Fresh checking of the same immutable canonical objects and exact source pins with the rebuilt compiler. No snapshot, source pin or earlier compiler receipt is rewritten. Profitability remains a separate obligation.')
    report.parent.mkdir(parents=True,exist_ok=True);report.write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(dict(status='checked',candidates=len(results),mathematics=len(mathematics),compiler_sha256=before)))

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--report',type=Path,default=ROOT/'knowledge/research/composable-state-current/compiler-replay.json');p.add_argument('--evidence',type=Path,default=ROOT/'knowledge/research/composable-state-current');p.add_argument('--mathematics-source',action='append',nargs=2,default=[],metavar=('NAME','SOURCE'));a=p.parse_args();replay(a.compiler,a.report,{name:(ROOT/path).resolve()for name,path in a.mathematics_source},a.evidence)
