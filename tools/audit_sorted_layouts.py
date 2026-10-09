#!/usr/bin/env python3
"""Audit source-bound sorted/unique row/column invariant proof packages."""
import argparse,hashlib,json,re,subprocess,tempfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(command):return subprocess.run(list(map(str,command)),cwd=ROOT,check=True,capture_output=True,text=True).stdout
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler',type=Path,default=ROOT/'build/source-row-original/lang')
    parser.add_argument('--kernel',type=Path,default=ROOT/'build/table-undo-original/lang')
    parser.add_argument('--python',default='python3')
    parser.add_argument('--reproduce',action='store_true')
    args=parser.parse_args();compiler=args.compiler.resolve();kernel=args.kernel.resolve()
    identities={str(p):sha(p) for p in {compiler,kernel}}
    result=dict(status='passed',compiler_sha256=sha(compiler),preserved_kernel_sha256=sha(kernel),packages=[],
        scope='Sorted/unique source-bound sequence invariants. Native binary search, Vec, codecs, effects and candidate admission remain separate.')
    report=ROOT/'reports/source-sorted-layout-phase1'
    if (report/'verification.json').exists():
        receipt=json.loads((report/'verification.json').read_text())
        for name,want in receipt['source_sha256'].items():assert sha(report/'sources'/name)==want,name
        for name,want in receipt['artifact_sha256'].items():assert sha(report/name)==want,name
        for name,want in receipt['package_sha256'].items():assert sha(ROOT/name)==want,name
        for name,want in receipt['preserved_lifecycle_binary_sha256'].items():assert sha(ROOT/name)==want,name
        assert sum(map(int,re.findall(r'test result: ok\. (\d+) passed',(report/'tests.log').read_text())))==receipt['tests']==89
        result['archived_validation']=True
    for folder,parent,example in [('source-sorted-layout','source-column-layout','source-row-undo'),
                                   ('source-sorted-ledger','source-column-ledger','source-row-ledger')]:
        directory=ROOT/'knowledge'/folder;layout=ROOT/'knowledge'/parent;source=ROOT/'examples'/f'{example}.ink'
        source_model=ROOT/'knowledge'/example/'reversible/source-model.json';cert=ROOT/'knowledge/table-maintenance/table.json'
        bundle=json.loads((directory/'bundle.json').read_text());binding=json.loads((directory/'binding.json').read_text())
        names=json.loads((directory/'names.json').read_text());model=json.loads((directory/'model.json').read_text())
        assert binding['library']==bundle
        assert binding['description']==model['source_description']==json.loads(source_model.read_text())['description']
        assert model['parent_bundle_sha256']==sha(layout/'bundle.json')
        assert model['compiler_sha256']==sha(compiler)
        assert set(bundle['objects'])==set(bundle['lock']['objects'])==set(names.values())
        assert set(p.stem for p in (directory/'objects').glob('*.json'))==set(bundle['objects'])
        for identity,raw in bundle['objects'].items():
            assert hashlib.sha256(raw.encode()).hexdigest()==identity
            assert (directory/'objects'/f'{identity}.json').read_bytes()==raw.encode()
        run([compiler,'verify-row-model',source,directory/'binding.json','--maintenance',cert])
        run([kernel,'verify-library',directory/'lock.json'])
        if args.reproduce:
            with tempfile.TemporaryDirectory(prefix='sorted-layout-replay-') as temp:
                replay=Path(temp)
                run([args.python,ROOT/'knowledge/tools/sorted_layout_proofs.py',replay,'--compiler',compiler,'--layout',layout,
                    '--source',source,'--source-model',source_model,'--maintenance',cert])
                want={str(p.relative_to(directory)) for p in directory.rglob('*') if p.is_file()}
                actual={str(p.relative_to(replay)) for p in replay.rglob('*') if p.is_file()}
                assert want==actual,(folder,want^actual)
                for name in want:assert (directory/name).read_bytes()==(replay/name).read_bytes(),name
        result['packages'].append(dict(folder=folder,objects=len(bundle['objects']),new_objects=len(model['new_objects']),
            retained_parent_objects=model['retained_parent_objects'],bundle_sha256=sha(directory/'bundle.json'),
            binding_sha256=sha(directory/'binding.json'),reproduced=args.reproduce))
    for name,want in identities.items():assert sha(Path(name))==want
    print(json.dumps(result,indent=2))
if __name__=='__main__':main()
