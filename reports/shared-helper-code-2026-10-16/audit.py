#!/usr/bin/env python3
"""Check shared/expanded code evidence, complete artifacts and paired samples."""
import argparse
import gzip
import hashlib
import io
import json
import math
from pathlib import Path
import re
import statistics
import subprocess
import tarfile
import tempfile

ROOT=Path(__file__).resolve().parent
REPOSITORY=ROOT.parents[1]
def digest(data): return hashlib.sha256(data).hexdigest()
def raw(name):
    data=(ROOT/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))
def gm(values): return math.exp(statistics.mean(map(math.log,values)))
def run(command,**kwargs):
    result=subprocess.run(command,capture_output=True,text=True,**kwargs)
    assert result.returncode==0,result.stdout+result.stderr

def audit(ink=None,chrome=None):
    m=read('metadata.json')
    assert set(m['files'])=={str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name!='metadata.json' and '__pycache__' not in p.parts}
    for name,expected in m['files'].items():assert digest((ROOT/name).read_bytes())==expected,name
    def archive(name):
        with tarfile.open(fileobj=io.BytesIO(raw(name)),mode='r:') as tar:
            entries=tar.getmembers()
            assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
            assert len(entries)==len({e.name for e in entries})
            files={e.name:tar.extractfile(e).read() for e in entries}
        assert {n:digest(b) for n,b in files.items()}==m['archives'][name]
        return files
    text=raw('checks/frozen-all.log.gz').decode()
    assert 'test result: ok. 12 passed;' in text and 'FAILED' not in text
    for name in ['parity','artifacts']:
        text=raw('checks/'+name+'.log.gz').decode()
        assert 'test result: ok. 1 passed;' in text and 'FAILED' not in text
    text=raw('checks/knowledge.log.gz').decode()
    assert 'Ran 19 tests' in text and text.rstrip().endswith('OK')
    clean=read('checks/compiler-image.json')
    assert clean['status']=='passed' and clean['source']==m['source'] and clean['packages']==m['packages']
    assert clean['private_checkout'] and clean['private_target']
    assert digest(raw('checks/compiler-image.log.gz'))==clean['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz'))==clean['resolution_lock_sha256']
    assert 'fold chunk proposal work budget' in raw('negative-controls/512-producer.log.gz').decode()
    assert len(read('negative-controls/512-input.core.json.gz')['program']['frozen']['Structure'][0][1])==512
    integrated=read('checks/integration-compiler.json')
    assert integrated['status']=='passed' and integrated['private_checkout'] and integrated['private_target']
    assert integrated['source']==m['integration_source'] and integrated['packages']==m['integration_packages']
    assert integrated['images']==clean['images']
    assert digest(raw('sources/integration-Cargo.lock.gz'))==integrated['resolution_lock_sha256']
    text=raw('checks/integration-frozen.log.gz').decode()
    assert 'test result: ok. 12 passed;' in text and 'FAILED' not in text
    assert digest(raw('checks/integration-compiler.log.gz'))==integrated['log_sha256']
    core=read('checks/integration-core.json');package=read('integration-core-package.json')
    assert core['status']=='passed' and core['private_checkout'] and core['private_target']
    assert core['source']==package['source']==m['integration_source']
    assert core['package']==package['commit'] and core['core_tree']==package['core_tree']
    text=raw('checks/integration-core.log.gz').decode()
    assert digest(text.encode())==core['log_sha256']
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',text)))==464
    assert 'FAILED' not in text
    expanded=raw('expanded128-plan.json.gz')
    assert digest(expanded)=='2501a03a2ab827cd5f50c161ddebea4fd126462114799225e1f420f19d547b4e'
    plans={}
    for count,number in [('32',3),('128',5)]:
        packet=read(count+'/plan.json.gz');plans[count]=packet
        assert [s['kind'] for s in packet['steps']]==['extension','rewrite']
        extension=packet['steps'][0]['package']
        helpers=extension['knowledge']['objects'][extension['extension']]['payload']['functions']
        assert len(helpers)==number
        assert digest(raw(count+'/frozen.core.json.gz'))==packet['input_core_sha256']
        assert read(count+'/selected.core.json.gz')==packet['steps'][1]['package']['action_replacement']['selected']
        names={f['name'] for f in helpers}
        def calls(value):
            if isinstance(value,list):return set().union(*(calls(v) for v in value)) if value else set()
            if isinstance(value,dict):
                call=value.get('Call');here={call[0]} if isinstance(call,list) and call[0] in names else set()
                return here|set().union(*(calls(v) for v in value.values()))
            return set()
        graph={f['name']:calls(f['body']) for f in helpers}
        def depth(name,active=frozenset()):
            assert name not in active
            return 1+max((depth(n,active|{name}) for n in graph[name]),default=0)
        assert max(map(depth,names))==number
    artifacts={}
    for target in ['baseline','javascript','native','rust','wasm32','webgpu']:
        files=archive('artifacts/'+target+'.tar.gz');artifacts[target]=files
        manifest=json.loads(files['artifact.json'])
        assert set(files)==set(manifest['files'])|{'artifact.json'}
        for name,entry in manifest['files'].items():
            assert digest(files[name])==entry['sha256'] and len(files[name])==entry['bytes']
        if target in ['baseline','javascript']:
            for name,expected in clean['images']['baseline' if target=='baseline' else 'selected'].items():
                assert digest(files[name])==expected,name
        if target!='baseline':
            assert json.loads(files['selection.json'])==plans['128']
            assert files['selected.core.json']==raw('128/selected.core.json.gz')
            assert files['deployment.snapshot']==raw('128/initial.snapshot')
    summary=read('performance/summary.json')
    for comparison in ['baseline','previous-selected']:
        for count in ['32','128']:
            prefix='performance/'+comparison+'/'+count+'/'
            modules={n:raw(prefix+file+'.gz') for n,file in [('baseline','baseline.mjs'),('selected','program.mjs')]}
            if count=='128':assert modules['selected']==artifacts['javascript']['program.mjs.source.mjs']
            rows=[read(prefix+f'process-{i}.json') for i in range(6)]
            for i,row in enumerate(rows):
                assert row['order']==(['baseline','selected'] if i%2==0 else ['selected','baseline'])
                assert row['readsPerSample']==25000 and row['samples']==5 and row['warmupReads']==2500
                assert row['completeChecksumsAndCheckpointsAgree']
                assert row['seed']==digest(raw(prefix+'initial.snapshot'))==digest(raw(count+'/initial.snapshot'))
                for n,b in modules.items():assert row['images'][n]==dict(module=digest(b),bytes=len(b))
                for stride in ['0','1','16','256']:
                    a,b=[row['results'][n]['phases'][stride] for n in ['baseline','selected']]
                    assert a['sums']==b['sums'] and a['snapshot']==b['snapshot']
                    for phase in [a,b]:
                        assert len(phase['nsPerRequest'])==5 and all(v>0 for v in phase['nsPerRequest'])
                        assert statistics.median(phase['nsPerRequest'])==phase['medianNs']
            for stride in ['0','1','16','256']:
                a,b=[[r['results'][n]['phases'][stride]['medianNs'] for r in rows] for n in ['baseline','selected']]
                ratios=[x/z for x,z in zip(a,b)];expected=summary[comparison][count][stride]
                for n,v in dict(baselineNs=gm(a),sharedNs=gm(b),speedup=gm(ratios)).items():
                    assert math.isclose(expected[n],v,rel_tol=1e-12)
                assert expected['pairedRange']==[min(ratios),max(ratios)]
            for n in ['baseline','selected']:
                for field in ['importUs','createRestoreUs','firstBindCallUs']:
                    assert summary[comparison][count]['startup'][n][field]==statistics.median(r['results'][n][field] for r in rows)
    corpus=archive('corpus.tar.gz');report=json.loads(corpus['report.json'])
    headline=report['headline']
    assert headline['programs']==10 and headline['compiled']==10
    assert headline['programs_with_rewrite_alternative']==10 and headline['programs_selecting_alternative']==0
    assert headline['laws_admitted']==54 and headline['laws_admitted_in_multiple_programs']==7
    assert headline['last_gates']=={'measurement_budget':10}
    assert report['context']==json.loads(corpus['context.json'])
    assert len(json.loads(corpus['records.json']))==10
    history=archive('prefix-history.tar.gz');scope=json.loads(history['scope.json'])
    assert scope['prefixOperations']==64 and scope['rawFloatClasses']==11 and not scope['root128']['gpu']
    assert len(json.loads(history['expected.json']))==155
    browser=read('checks/browser-prefix.json')
    assert browser['status']=='passed' and browser['comparisons']==465 and browser['gpuCalls']==12
    assert browser['restores']==6 and browser['restoreRejections']==3 and browser['initializedChecks']==6
    with tempfile.TemporaryDirectory(prefix='ink-shared-helper-audit-') as temporary:
        temporary=Path(temporary)
        for target,files in artifacts.items():
            for name,data in files.items():
                p=temporary/target/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
            if ink:run([str(Path(ink).resolve()),'verify-model',str(temporary/target),'--replay'])
        if ink:
            for count in ['32','128']:
                core=temporary/(count+'.core.json');core.write_bytes(raw(count+'/frozen.core.json.gz'))
                packet=temporary/(count+'.plan.json');packet.write_bytes(raw(count+'/plan.json.gz'))
                run([str(Path(ink).resolve()),'check-plan',str(core),str(packet),'--core'])
        if chrome:
            for name,data in history.items():
                p=temporary/'history'/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
            receipt=temporary/'browser.json'
            run(['node',str(REPOSITORY/'bench/gpu/replay-source-history-browser.mjs'),str(Path(chrome).resolve()),
                 'history',str(receipt),'--initialized','webgpu'],cwd=temporary)
            assert json.loads(receipt.read_bytes())==browser
    print('Verified typed helper DAGs, six artifact inventories, 24 paired processes and actual GPU prefix history'
        +(' with complete proof/training replay' if ink else '')+(' and fresh browser replay' if chrome else ''))

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--ink');parser.add_argument('--chrome')
    args=parser.parse_args();audit(args.ink,args.chrome)
