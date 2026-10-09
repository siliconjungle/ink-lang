#!/usr/bin/env python3
"""Audit source row/key/projection bindings and external rollback proof packages.

No native representation or complete transaction admission is claimed.
"""
import argparse, hashlib, json, re, subprocess, tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(command):return subprocess.run(list(map(str,command)),cwd=ROOT,capture_output=True,text=True,check=True).stdout
def main():
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--compiler',type=Path,default=ROOT/'target/release/lang')
    p.add_argument('--kernel',type=Path,default=ROOT/'build/table-undo-original/lang')
    p.add_argument('--reproduce',action='store_true')
    p.add_argument('--python',default='python3')
    args=p.parse_args();compiler=args.compiler.resolve();kernel=args.kernel.resolve()
    identities={str(path):sha(path) for path in {compiler,kernel}}
    result=dict(compiler_sha256=sha(compiler),independent_preserved_kernel_sha256=sha(kernel),packages=[],scope='Logical source row/key/projection bindings and abstract undo. Native codecs/maps/protocol remain separate.')
    report=ROOT/'reports/source-row-undo-phase1'
    if (report/'verification.json').exists():
        receipt=json.loads((report/'verification.json').read_text())
        for name,want in receipt['source_sha256'].items():assert sha(report/'sources'/name)==want,name
        for name,want in receipt['artifact_sha256'].items():assert sha(report/name)==want,name
        for name,want in receipt['package_sha256'].items():assert sha(ROOT/name)==want,name
        assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(report/'tests.log').read_text())))==receipt['tests']==83
        result['archived_validation']=True
    for example,keep in [('source-row-undo','total'),('source-row-ledger','balance')]:
        source=ROOT/'examples'/f'{example}.ink'
        for variant,cert_name in [('reversible','table.json'),('snapshot','table-snapshot.json')]:
            folder=ROOT/'knowledge'/example/variant
            cert=ROOT/'knowledge/table-maintenance'/cert_name
            model=json.loads((folder/'source-model.json').read_text());proof_model=json.loads((folder/'model.json').read_text())
            bundle=json.loads((folder/'bundle.json').read_text());names=json.loads((folder/'names.json').read_text())
            binding=json.loads((folder/'binding.json').read_text())
            assert binding['description']==model['description']
            assert binding['library']==bundle
            assert binding['row_binding']==dict(wrapper=names['StoredRow'],projection=names['stored_row_part'])
            assert proof_model['source_description']==model['description']
            assert proof_model['source_row_model_sha256']==sha(folder/'source-model.json')
            assert set(bundle['lock']['objects'])==set(bundle['objects'])==set(names.values())
            assert set(p.stem for p in (folder/'objects').glob('*.json'))==set(bundle['objects'])
            for identity,raw in bundle['objects'].items():
                assert hashlib.sha256(raw.encode()).hexdigest()==identity
                assert (folder/'objects'/f'{identity}.json').read_bytes()==raw.encode()
            run([compiler,'verify-row-model',source,folder/'source-model.json','--maintenance',cert])
            run([compiler,'verify-row-model',source,folder/'binding.json','--maintenance',cert])
            run([kernel,'verify-library',folder/'lock.json'])
            if args.reproduce:
                with tempfile.TemporaryDirectory(prefix='source-row-replay-') as temp:
                    replay=Path(temp)
                    run([compiler,'model-row',source,keep,'--maintenance',cert,'-o',replay/'source-model.json'])
                    run([args.python,ROOT/'knowledge/tools/table_undo_proofs.py',replay,'--compiler',compiler,'--variant',variant,
                         '--source',source,'--source-model',replay/'source-model.json','--maintenance',cert])
                    for path in folder.rglob('*'):
                        if path.is_file():assert path.read_bytes()==(replay/path.relative_to(folder)).read_bytes(),str(path)
            result['packages'].append(dict(example=example,variant=variant,objects=len(bundle['objects']),
                source_definitions=len(model['description']['definitions']),new_undo_objects=len(proof_model['roles']),
                bundle_sha256=sha(folder/'bundle.json'),binding_sha256=sha(folder/'binding.json'),reproduced=args.reproduce))
    for path,want in identities.items():assert sha(Path(path))==want
    result['status']='passed';print(json.dumps(result,indent=2))
if __name__=='__main__':main()
