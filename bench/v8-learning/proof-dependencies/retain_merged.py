"""Retain terminal merged-emitter inputs once, referencing identical baseline bytes."""
from pathlib import Path
import hashlib,json,tarfile

def retain(scratch,here):
    scratch=Path(scratch);here=Path(here)
    terminal=json.loads((scratch/'terminal.json').read_bytes())
    assert terminal['exit_status']==0 and terminal['actual_device_calls']==8
    report=json.loads((scratch/'device.stdout').read_bytes());assert len(report['results'])==8
    baseline=json.loads((here/'selected-inputs-index.json').read_bytes())
    assert hashlib.sha256((here/'selected-inputs.tar.gz').read_bytes()).hexdigest()==baseline['archive_sha256']
    by_digest={r['sha256']:name for name,r in baseline['files'].items()}
    files={str(p.relative_to(scratch)):p for p in sorted(scratch.rglob('*'))if p.is_file()and'cpu-target'not in p.relative_to(scratch).parts}
    hashes={name:hashlib.sha256(p.read_bytes()).hexdigest()for name,p in files.items()}
    external={name:by_digest[digest]for name,digest in hashes.items()if digest in by_digest}
    with tarfile.open(here/'merged-emission-inputs.tar.gz','w:gz',compresslevel=9)as archive:
        for name,p in files.items():
            if name not in external:archive.add(p,arcname=name,recursive=False)
    result=dict(schema=1,terminal=terminal,report=report,archive_sha256=hashlib.sha256((here/'merged-emission-inputs.tar.gz').read_bytes()).hexdigest(),files=hashes,source_archive_sha256=baseline['archive_sha256'],external_inputs=external,scope='Merged compiler proof/conformance only. Identical declared inputs are retained once in the selected baseline archive; no performance-context transfer.')
    (here/'merged-emission.json').write_text(json.dumps(result,indent=2)+'\n')
    print('Retained',len(files)-len(external),'new inputs and',len(external),'exact baseline references')

if __name__=='__main__':
    retain('build/v8-proof-dependencies-merged/device',Path(__file__).resolve().parent)
