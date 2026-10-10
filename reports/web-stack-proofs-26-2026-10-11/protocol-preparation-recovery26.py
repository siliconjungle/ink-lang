"""Independent read-only preparation recovery, executable sections and GPU protocol audit."""
import hashlib,importlib.util,json
from pathlib import Path
R=Path(__file__).resolve().parent;B=R.parents[1]
read=lambda p:json.loads(Path(p).read_text());sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
bindings={}
def bind(p):
 p=Path(p);bindings[str(p.resolve())]=sha(p);return bindings[str(p.resolve())]
def sections(p):
 data=Path(p).read_bytes();assert data[:8]==b'\0asm\1\0\0\0';i=8;out=[]
 def leb(offset):
  value=shift=0
  while True:
   byte=data[offset];offset+=1;value|=(byte&127)<<shift
   if not byte&128:return value,offset
   shift+=7;assert shift<=35
 while i<len(data):
  kind=data[i];i+=1;n,i=leb(i);end=i+n;assert end<=len(data);name=None;payload=data[i:end]
  if kind==0:
   length,offset=leb(i);assert offset+length<=end;name=data[offset:offset+length].decode();payload=data[offset+length:end]
  out.append((kind,name,payload));i=end
 assert i==len(data);return out
m=read(R/'metadata.json');recovery=read(R/'preparation-recovery.json');archive=Path(recovery['archive']);am=read(archive/'metadata.json');assert bind(archive/'metadata.json')==recovery['initial_metadata_sha256']
assert recovery['status']=='preserved-before-timing' and recovery['timing_samples']==0
for name in ['node-results.json','browser-results.json','native/results.json']:assert not (archive/name).exists()
for compiler in m['compilers'].values():assert bind(compiler['path'])==compiler['sha256']
assert m['compilers']['old']['sha256']==read(R/'initial-pins.json')['prior_compiler_sha256']=='3e358acc9026c1dbcc9ab2183a11e1d240b02196d0f3d8ecbb8740603b3c06a2'
assert m['compilers']['new']['sha256']=='719fd6ff95ea7cd600d7f4078677b46c46fdd545ef2b21ae5643ca5eba085787'
for n,h in m['artifact_hashes'].items():assert bind(R/n)==h
names=['spec.py','spec.json','fixtures.json','fixture-profile.json','kernels.ink','literal.mjs','expert.mjs','literal.rs','expert.rs','generate.py','fixtures.py','runner.mjs','donor-fixtures.json','preflight-receipt.json','cpu-cost-model.json','gpu-cost-model.json']
equivalent={}
for n in names:
 assert (R/n).read_bytes()==(archive/n).read_bytes(),n;equivalent[n]=bind(R/n);bind(archive/n)
prior=(archive/'harness.py').read_text();current=(R/'harness.py').read_text()
fixed=prior.replace("default=ROOT.parent/'toolchain/ink-accepted-proofs');p.add_argument('--old-compiler',type=Path,default=ROOT.parent/'toolchain/ink-demand-proofs'", "default=ROOT.parent/'toolchain/ink-direct-js-proofs');p.add_argument('--old-compiler',type=Path,default=ROOT.parent/'toolchain/ink-accepted-proofs'")
assert fixed==current,'only default compiler line differs in copied harness'
assert bind(B/'bench/web-stack-proofs-26.py')==bind(R/'harness.py')==recovery['new_harness_sha256']
rows=[]
for task in m['tasks']:
 for proof in ['prior','checked']:
  selected=R/'tasks'/task/f'{proof}-selected.core.json';aselected=archive/'tasks'/task/f'{proof}-selected.core.json'
  assert selected.read_bytes()==aselected.read_bytes();bind(selected);bind(aselected)
  old,new=[R/backend/proof/task for backend in ['old','new']]
  assert (old/'cpu.c').read_bytes()==(new/'cpu.c').read_bytes();bind(old/'cpu.c');bind(new/'cpu.c')
  before=sections(old/'cpu.wasm');after=sections(new/'cpu.wasm');assert len(before)==len(after);debug=[]
  for a,b in zip(before,after):
   assert a[:2]==b[:2]
   if a[2]!=b[2]:
    assert a[0]==0 and a[1] in ['.debug_str','.debug_line'] and a[2].replace(b'/old/',b'/new/')==b[2]
    debug.append(a[1])
  bind(old/'cpu.wasm');bind(new/'cpu.wasm');rows.append(dict(task=task,proof=proof,identical_C=True,identical_executable_and_non_debug_sections=True,debug_path_only=debug))
# Reuse the frozen independently authored raw protocol functions; no algorithms or timings.
module=importlib.util.spec_from_file_location('protocol26',R/'protocol-final26.py');P=importlib.util.module_from_spec(module);module.loader.exec_module(P)
f=read(R/'fixtures.json');s=read(R/'spec.json');tasks={t['name']:t for t in s['tasks']};raw=read(R/'browser-results.json');manifest=read(R/'browser-batches/manifest.json');parts=[];union=[];unioncells=[];partrows=[]
for b in manifest['batches']:
 folder=R/'browser-batches'/f'b{b["batch"]}';bf=read(folder/'fixtures.json');part=read(folder/'browser-results.json')
 assert bind(folder/'fixtures.json')==b['fixtures_sha256'] and bind(folder/'spec.json')==b['spec_sha256'];bind(folder/'browser-results.json')
 P.shuffled_order(part,bf,m);groups,counts=P.audit_host(part,bf,m,tasks);partrows.append(dict(batch=b['batch'],**counts));parts.append(part);union+=bf['inputs'];unioncells +=[(c['case'],bf['inputs'][c['input']]['id']) for c in bf['cells']]
assert union==f['inputs'] and unioncells==[(c['case'],f['inputs'][c['input']]['id']) for c in f['cells']]
for phase in ['samples','calibration','warmups','availability']:assert raw[phase]==[q for p in parts for q in p[phase]]
assert raw['gpu_validation']['records']==[q for p in parts for q in p['gpu_validation']['records']]
_,counts=P.audit_host(raw,f,m,tasks)
actual=[]
for variant,by in m['gpu_manifest'].items():
 for task,d in by.items():
  if d['timing_eligible']:assert not m['tasks'][task]['fresh_proof_required'];actual.append(dict(task=task,variant=variant,fresh=False,bundle=d['bundle']))
assert len(actual)==3 and counts['timed_GPU_cells']==12 and sum(q['variant'].endswith('_gpu') for q in raw['samples'])==108
for n in ['metadata.json','preparation-recovery.json','wasm-debug-audit-recovery.json','protocol-final26.py','browser-results.json','browser-batches/manifest.json']:bind(R/n)
result=dict(status='passed',failed_preparation_timing_samples=0,equal_control_fixture_files=equivalent,identical_selected_cores=18,correct_compiler_pins=m['compilers'],sections=rows,browser_partitions=partrows,browser_merged=counts,actual_GPU_references=actual,GPU_samples=108,scope='Compiler-default correction happened before any accepted timing; exact source/controls/fixtures and selected cores match preserved failed preparation. C bytes and all executable/non-debug Wasm sections match across JS backend states; only authenticated DWARF old/new path strings differ. Browser partitions exact and complete; every GPU path is an unchanged reference, no fresh-proof GPU attribution. No build, test, algorithm timing, canonical write or frozen edit.',bindings=bindings)
(R/'protocol-preparation-recovery26.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['bindings','sections','equal_control_fixture_files']}))
