import json,hashlib
from pathlib import Path
B=Path('/Users/james/Documents/ChatGPT/3d-modelling/research/ink-optimisation-2026-10-10/ink-lang');R=B/'reports/web-stack-proofs-26-2026-10-11'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest();m=read(R/'metadata.json');claimed=read(R/'emission-review.json');assert claimed['status']=='passed';pairs=[]
def uleb(data,pos):
 result=0
 for shift in range(0,35,7):
  assert pos<len(data);b=data[pos];pos+=1;result|=(b&127)<<shift
  if b<128:return result,pos
 raise AssertionError('invalid32bitLEB')
def sections(path):
 data=path.read_bytes();assert data[:8]==bytes.fromhex('0061736d01000000');pos=8;result=[]
 while pos<len(data):
  start=pos;kind=data[pos];pos+=1;size,pos=uleb(data,pos);end=pos+size;assert end<=len(data);content=data[pos:end];name=''
  if kind==0:
   size,n=uleb(content,0);assert n+size<=len(content);name=content[n:n+size].decode('utf-8')
  result.append(dict(kind=kind,name=name,payload=content,complete=data[start:end]));pos=end
 assert pos==len(data);return result
for task,t in m['tasks'].items():
 for proof in ('prior','checked'):
  dirs={backend:R/t['matrix_bundles'][backend+'_'+proof]['bundle'] for backend in ('old','new')};row=next(x for x in claimed['rows'] if x['task']==task and x['proof']==proof);bindings={}
  for backend,d in dirs.items():
   for file in ('cpu.c','cpu.wasm','program.mjs','manifest.json'):
    relative=str((d/file).relative_to(R));assert sha(d/file)==m['artifact_hashes'][relative];bindings[relative]=sha(d/file)
  assert (dirs['old']/'cpu.c').read_bytes()==(dirs['new']/'cpu.c').read_bytes();s={b:sections(d/'cpu.wasm') for b,d in dirs.items()};assert len(s['old'])==len(s['new']);debug=[];equal_sections=[]
  for i,(a,b) in enumerate(zip(s['old'],s['new'])):
   assert (a['kind'],a['name'])==(b['kind'],b['name'])
   if a['complete']==b['complete']:equal_sections.append(dict(index=i,kind=a['kind'],name=a['name'],sha256=hashlib.sha256(a['complete']).hexdigest()))
   else:
    assert a['kind']==0 and a['name'] in ('.debug_str','.debug_line');assert a['payload'].replace(b'/old/',b'/new/')==b['payload'];assert b'/old/' in a['payload'];debug.append(a['name'])
  assert row['unchanged_non_js_outputs']['debug_path_only_differences']==debug and row['unchanged_non_js_outputs']['wasm_executable_and_other_custom_sections'] and row['unchanged_non_js_outputs']['cpu.c'];assert not row['unchanged_non_js_outputs']['cpu.wasm']
  pairs.append(dict(task=task,proof=proof,changed_debug_sections=debug,byte_identical_complete_sections=equal_sections,bindings=bindings))
assert len(pairs)==len(claimed['rows'])==18
before=read(R/'source-boundary-before.json');after=read(R/'source-boundary-after.json');assert len(before)==102 and set(before)==set(after);changed=[]
for p,h in before.items():
 assert sha(B/p)==after[p]
 if after[p]!=h:assert sha(R/'original-source'/p)==h;changed.append(p)
assert set(changed)=={'lowerings/js/src/lib.rs','lowerings/js/tests/differential.rs'}
recovery=read(R/'wasm-debug-audit-recovery.json');assert recovery['status']=='corrected-before-timing' and recovery['target_bytes_modified'] is False
failure=(R/'emission-review-run.log').read_text();assert "('invariant_fold_u32', 'prior', 'non-JS backend unexpectedly changed')" in failure
freeze=read(R/'policy-freeze.json');supplement=read(R/'pretime-review-bindings.json')
assert freeze['status']=='frozen-before-performance' and supplement['status']=='bound-before-timing'
for relative,h in m['artifact_hashes'].items():assert sha(R/relative)==h,relative
for relative,h in freeze['artifacts'].items():assert sha(B/relative)==h,relative
for relative,h in supplement['artifacts'].items():assert sha(R/relative)==h,relative
files=[Path(__file__),R/'metadata.json',R/'emission-review.json',R/'emission-review.py',R/'emission-review-sections26.py',R/'emission-review-run.log',R/'emission-review-sections-run.log',R/'wasm-debug-audit-recovery.json',R/'policy-freeze.json',R/'pretime-review-bindings.json',R/'compiler-build.json',R/'source-boundary-before.json',R/'source-boundary-after.json']
v=dict(schema=1,status='PASS',blocking_findings=[],paired_artifacts=len(pairs),frozen_bindings=dict(metadata_artifacts=len(m['artifact_hashes']),policy_artifacts=len(freeze['artifacts']),supplemental_artifacts=len(supplement['artifacts'])),source_guard=dict(keys=102,unchanged=100,changed=changed,production_changed=['lowerings/js/src/lib.rs']),pairs=pairs,bindings={str(p.relative_to(B)):sha(p) for p in files},scope='Independent strict bounds-checked Wasm parsing verifies complete executable and all non-debug custom sections byte-for-byte. Two differing debug sections require exact old/new directory substring replacement. Target artifacts match frozen metadata, no bytes edited. Root-function JS counts do not include private helper bodies, machine-code proofs, allocation counts or actual executed-loop count.',limitations=['Wasm debug-path differences are real full-file differences; CPU source and all executable/non-debug sections are identical, not entire files.','Two syntactically emitted fold loops are mutually exclusive branches; both profiles still execute one ordered traversal.','Retired-helper counts in emission-review describe exported root function only; private modular_mix_word and necessary representation/sort helpers are outside that counter.','No timing reruns, compiler tests, builds or canonical writes in this independent audit.'])
(R/'emission-recovery-independent-review.json').write_text(json.dumps(v,indent=2)+'\n');print(json.dumps(dict(status='PASS',pairs=len(pairs),sha256=sha(R/'emission-recovery-independent-review.json'))))
