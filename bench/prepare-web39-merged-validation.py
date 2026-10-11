#!/usr/bin/env python3
"""Preserve measured bundles; prepare separate untimed merged-host checks."""
from pathlib import Path
import json,hashlib,shutil
B=Path(__file__).resolve().parents[1];R=B/'reports/web-stack-engine-39-2026-10-11';G=R/'general-final';V=R/'merged-integration/verified';D=R/'merged-validation'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
assert json.loads((V/'byte-parity.json').read_text())['status']=='passed'
D.mkdir();meta=json.loads((G/'metadata.json').read_text())
for name,digest in meta['bindings'].items():
 source=G/name;assert sha(source)==digest;out=D/name;out.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,out)
for td in sorted((V/'targets').iterdir()):
 out=D/'targets'/td.name/'candidate';shutil.rmtree(out);shutil.copytree(td,out)
 p=out/'ink-gpu.mjs';s=p.read_text();anchor='    manifest,';assert s.count(anchor)==1;s=s.replace(anchor,anchor+'\n    benchmarkMemoryBytes(){return cpu?.memory.buffer.byteLength ?? 0;},',1);p.write_text(s)
 meta['selections'][td.name]['candidate']['compiler_sha256']=sha(V.parent/'ink-merged-frozen')
meta.update(status='prepared_untimed_merged',candidate_compiler_sha256=sha(V.parent/'ink-merged-frozen'),engine_scope='Post-merge correctness/ownership/GPU-counter validation only. Measurements remain associated with general-final frozen preintegration bundles.',integration_parity_sha256=sha(V/'byte-parity.json'))
meta['bindings']={str(p.relative_to(D)):sha(p)for p in sorted(D.rglob('*'))if p.is_file()}
(D/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n');print(json.dumps(dict(status='prepared_untimed_merged',bindings=len(meta['bindings']))))
