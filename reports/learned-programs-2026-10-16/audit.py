#!/usr/bin/env python3
"""Audit finite learned-program evidence; optionally replay plans with Ink."""
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

ROOT = Path(__file__).resolve().parent


def digest(data): return hashlib.sha256(data).hexdigest()
def raw(name):
    data=(ROOT/name).read_bytes()
    return gzip.decompress(data) if name.endswith('.gz') else data
def read(name): return json.loads(raw(name))
def unpack(name):
    with tarfile.open(fileobj=io.BytesIO(raw(name)),mode='r:') as archive:
        entries=archive.getmembers()
        assert all(e.isfile() and not e.name.startswith('/') and '..' not in Path(e.name).parts for e in entries)
        assert len(entries)==len({e.name for e in entries})
        return {e.name:archive.extractfile(e).read() for e in entries}
def run(command,success=True):
    result=subprocess.run(command,capture_output=True,text=True)
    assert (result.returncode==0)==success,result.stdout+result.stderr
    return result


def audit(ink=None):
    metadata=read('metadata.json')
    assert set(metadata['files'])=={str(p.relative_to(ROOT)) for p in ROOT.rglob('*')
        if p.is_file() and p.name!='metadata.json' and '__pycache__' not in p.parts}
    for name,expected in metadata['files'].items():assert digest((ROOT/name).read_bytes())==expected,name
    archives={}
    for name,expected in metadata['archives'].items():
        archives[name]=unpack(name)
        assert {n:digest(data) for n,data in archives[name].items()}==expected,name
    baseline,selected=archives['baseline.tar.gz'],archives['selected.tar.gz']
    for files in [baseline,selected]:
        manifest=json.loads(files['artifact.json'])
        assert set(files)==set(manifest['files'])|{'artifact.json'}
        for name,entry in manifest['files'].items():
            assert digest(files[name])==entry['sha256'] and len(files[name])==entry['bytes'],name
        receipt=json.loads(files['training.receipt.json'])
        assert receipt['updates']==387 and receipt['observations']==387
        assert digest(files['model.snapshot'])==receipt['snapshot_sha256']
        assert receipt['source_core_sha256']==digest(files['source.core.json'])
        assert files['trace.json']==raw('trace.json')
    for name in ['source.core.json','compiled.core.json','model.snapshot','deployment.snapshot','trace.json']:
        assert baseline[name]==selected[name],name
    plan=json.loads(selected['selection.json'])
    assert [s['kind'] for s in plan['steps']]==['extension','rewrite']
    assert plan['input_core_sha256']==digest(selected['compiled.core.json'])
    assert json.loads(selected['selected.core.json'])==plan['steps'][1]['package']['action_replacement']['selected']
    objects=plan['steps'][1]['package']['knowledge']['objects']
    assert any('GeneralizedInduction' in o['payload'].get('declaration',{}).get('Theorem',{}).get('proof',{}) for o in objects.values())
    names={a['name'] for a in json.loads(selected['selected.core.json'])['program']['actions']}
    assert names=={'initialize','retarget','retune','serve','structure','policy','loss','set_live'}
    learning=read('checks/learning.json')
    assert learning['matching_motifs']==11 and learning['initial_probability']==11/256
    assert 0.8<learning['trained_probability']<1
    assert raw('checks/training.snapshot')==baseline['model.snapshot']
    first=read('diagnostics/first-training-receipt.json')
    assert digest(raw('diagnostics/first-source.core.json.gz'))==first['source_core_sha256']
    assert digest(raw('diagnostics/first.snapshot'))==first['snapshot_sha256']
    first_probability=read('diagnostics/first-probability.json')
    assert first_probability['trained_mass']<first_probability['initial_mass']==11/256
    image=read('checks/compiler-image.json')
    assert image['status']=='passed' and image['source']==metadata['source']
    assert image['private_checkout'] and image['private_target'] and image['packages']==metadata['packages']
    assert digest(raw('checks/compiler-image.log.gz'))==image['log_sha256']
    assert digest(raw('sources/Cargo.lock.gz'))==image['resolution_lock_sha256']
    assert len(image['images']['baseline'])==9 and len(image['images']['selected'])==11
    for name,files in [('baseline',baseline),('selected',selected)]:
        for path,expected in image['images'][name].items():assert digest(files[path])==expected,path
    core=read('private-core.json');package=read('integration-core-package.json')
    assert core['status']=='passed' and core['private_checkout'] and core['private_target']
    assert (core['package'],core['source'],core['core_tree'])==(package['commit'],package['source'],package['core_tree'])
    assert digest(raw('private-core.log.gz'))==core['log_sha256']
    assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',raw('private-core.log.gz').decode())))==466
    tests=raw('checks/integration-parity.log.gz').decode()
    assert 'test result: ok. 13 passed;' in tests and 'test result: ok. 6 passed;' in tests
    assert 'wgpu: 9 results matched; 1 GPU calls' in tests and 'wgpu: 24 results matched; 11 GPU calls' in tests
    knowledge=raw('checks/knowledge-tests.log.gz').decode()
    assert 'Ran 19 tests' in knowledge and knowledge.rstrip().endswith('OK')
    for name,count,dispatches in [('adaptive',9,1),('frozen',24,11)]:
        receipt=read(f'checks/{name}-browser.json')
        assert receipt['status']=='passed' and receipt['comparisons']==3*count and receipt['gpuCalls']==dispatches
        assert receipt['results']==[dict(backend=b,observations=count) for b in ['javascript','cpu','gpu']]
        history=archives[f'{name}-history.tar.gz']
        assert len(json.loads(history['expected.json']))==count
    ratios={};final_packets=[]
    for prefix in ['performance/', 'performance/contended/']:
        local={}
        for index in range(6):
            packet=read(prefix+f'process-{index}.json.gz')
            if prefix=='performance/':final_packets.append(packet)
            assert packet['order']==(['baseline','selected'] if index%2==0 else ['selected','baseline'])
            assert packet['completeChecksumsAndCheckpointsAgree'] and packet['samples']==5
            for name,files in [('baseline',baseline),('selected',selected)]:
                assert packet['images'][name]['sourceModule']==digest(files['program.mjs.source.mjs'])
                assert packet['images'][name]['deployment']==digest(files['deployment.snapshot'])
            for phase in packet['phases']:
                key=phase['name'];a=packet['results']['baseline']['phases'][key];b=packet['results']['selected']['phases'][key]
                assert a['checksums']==b['checksums'] and a['checkpoint']==b['checkpoint']
                for result in [a,b]:
                    assert len(result['nsPerRequest'])==5 and all(v>0 and math.isfinite(v) for v in result['nsPerRequest'])
                    assert result['medianNs']==statistics.median(result['nsPerRequest'])
                local.setdefault(key,[]).append(a['medianNs']/b['medianNs'])
        if prefix=='performance/':ratios={key:math.exp(statistics.mean(map(math.log,values))) for key,values in local.items()}
    summary=read('performance/summary.json')
    for phase,ratio in ratios.items():
        assert summary[phase]['paired_geometric_ratio']==ratio
        for name in ['baseline','selected']:
            assert summary[phase][name+'_ns']==statistics.median(p['results'][name]['phases'][phase]['medianNs'] for p in final_packets)
    corpus=read('checks/corpus-report.json')
    assert corpus['context']['compiler_sha256']==metadata['corpus_compiler_sha256']
    if ink:
        with tempfile.TemporaryDirectory(prefix='ink-learned-program-audit-') as directory:
            folder=Path(directory)
            for name,data in selected.items():
                destination=folder/name;destination.parent.mkdir(parents=True,exist_ok=True);destination.write_bytes(data)
            run([str(ink),'verify-model',str(folder)])
            prototype=folder/'experimental-plan.json';prototype.write_bytes(raw('experimental/relevant-plan.json.gz'))
            run([str(ink),'check-plan',str(folder/'compiled.core.json'),str(prototype),'--core'])
            for name in ['wrong-accumulator','wrong-scope','wrong-rounding']:
                path=folder/(name+'.json');path.write_bytes(raw(f'negative-controls/{name}.json.gz'))
                rejected=run([str(ink),'knowledge-check',str(folder/'compiled.core.json'),str(path)],False)
                assert 'identity mismatch' not in rejected.stderr and 'interface mismatch' not in rejected.stderr
                assert 'requires CORE.json' not in rejected.stderr
                expected={'wrong-accumulator':'inductive proof proves a different statement',
                          'wrong-scope':'unknown logic hypothesis',
                          'wrong-rounding':'definitional computation does not prove equality'}
                assert rejected.returncode==1 and expected[name] in rejected.stderr
    print(json.dumps(dict(status='checked',training_updates=384,matching_motifs=11,
        trained_probability=learning['trained_probability'],private_core_tests=466,
        browser_comparisons=99,actual_browser_gpu_calls=12,paired_ratios=ratios,
        proof_replay=ink is not None,scope='Finite recorded conformance, reproducibility and paired diagnostics; no convergence, generalization, compiler-correctness or automatic-profitability proof.')))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--ink',type=Path)
    args=parser.parse_args();audit(args.ink.resolve() if args.ink else None)
