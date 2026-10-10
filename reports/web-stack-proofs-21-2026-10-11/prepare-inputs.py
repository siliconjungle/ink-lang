"""Freeze exact source inputs and an unmodified historical catalogue before timing."""
import hashlib,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
HERE=Path(__file__).resolve().parent
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'bench/web-stack-proofs-21')]
from ink_knowledge import Store
from spec import TASKS,source
PRIOR='1846f49f86f1451f7e4a21406ff48327691563f0bb36787925439d348c41da91'
COMPILER=ROOT.parent/'toolchain/ink-sequence-proofs'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 out=HERE/'input-preparation';out.mkdir(exist_ok=True)
 if (out/'preparation.json').exists():raise ValueError('immutable preparation already exists')
 old=Store(ROOT/'knowledge',ROOT/f'knowledge/store/snapshots/{PRIOR}.json')
 overlay=out/'prior-overlay';objects=overlay/'store/objects';objects.mkdir(parents=True,exist_ok=True)
 for i in old.members():
  target=objects/f'{i}.json'
  if not target.exists():os.link(old.data/'objects'/f'{i}.json',target)
 pinned=Store.publish(overlay,[old.object(i) for i in sorted(old.members())]);pinned.rebuild()
 assert pinned.snapshot_id==PRIOR
 commands=[];sources=[]
 for t in TASKS:
  folder=out/t['name'];folder.mkdir(exist_ok=True);src=folder/'source.ink';src.write_text('module Recipe;\n'+source(t)+'\n');core=folder/'input.core.json';semantic=folder/'input.semantic.json'
  for argv in [[COMPILER,'emit-core',src,'-o',core],[COMPILER,'emit-semantic',core,'--core','-o',semantic]]:
   r=subprocess.run(list(map(str,argv)),cwd=ROOT,capture_output=True,text=True);commands.append(dict(argv=list(map(str,argv)),exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
   if r.returncode:raise RuntimeError(r.stderr)
  sources.append(dict(task=t['name'],cohort=t['cohort'],input_core=str(core),input_core_sha256=sha(core),input_subject=str(semantic),input_subject_sha256=sha(semantic),source_sha256=sha(src)))
 receipt=dict(status='passed',historical_snapshot=PRIOR,effective_prior_snapshot=pinned.snapshot_id,prior_overlay=str(pinned.root),shared_old_witness_ids=[],new_composed_witness_ids=[],sources=sources,compiler_sha256=sha(COMPILER),cost_model_sha256=sha(HERE/'cpu-cost-model.json'),gpu_cost_model_sha256=sha(HERE/'gpu-cost-model.json'),commands=commands,scope='Historical1372 frozen before publication and timing; source core and semantic inputs prepared independently. Fair old/new static certificate derivation follows before target preparation.')
 (out/'preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(dict(status='passed',sources=len(sources),prior_entries=len(old.members()))))
if __name__=='__main__':main()
