#!/usr/bin/env python3
"""Build combined-main outputs for correctness only; never time or publish."""
import argparse, hashlib, json, pathlib, subprocess
P=pathlib.Path(__file__).resolve().parent
ROOT=P.parents[3]
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 a=argparse.ArgumentParser(); a.add_argument('--compiler',type=pathlib.Path,required=True); a.add_argument('--zig',type=pathlib.Path,required=True); o=a.parse_args()
 replay=P.parent/'proof-replay'/'published-main-run'; review=read(replay/'review.json'); assert review['status']=='passed'; assert review['compiler']['sha256']==sha(o.compiler),'proof/target compiler mismatch'
 tasks=read(P/'spec.json')['tasks']; inputs={r['name']:r for r in read(replay/'target-inputs.json')['tasks']}; commands=[]
 for t in tasks:
  name=t['name']; dest=P/'targets'/name; dest.mkdir(parents=True,exist_ok=True)
  # All three inputs were freshly compiled/replayed by the combined CLI.
  def run(argv):
   p=subprocess.run(list(map(str,argv)),capture_output=True,text=True,cwd=ROOT); commands.append(dict(argv=list(map(str,argv)),exit_code=p.returncode,stdout=p.stdout,stderr=p.stderr)); (P/'commands.json').write_text(json.dumps(commands,indent=2)+'\n'); assert p.returncode==0,p.stderr+'\n'+p.stdout
  for version in ['literal','prior','checked']:
   src=pathlib.Path(inputs[name][version]['core_path']); assert sha(src)==inputs[name][version]['core_sha256']; (dest/(version+'.core.json')).write_bytes(src.read_bytes())
  for version in ['literal','prior','checked']:
   target=dest/version; assert not target.exists(),'preserve existing emitted bundles'
   run([o.compiler,'build',dest/(version+'.core.json'),'--core','--target','webgpu','--zig',o.zig,'-o',target])
   host=target/'ink-gpu.mjs'; text=host.read_text(); anchor='    manifest,'; assert text.count(anchor)==1,'memory accessor anchor'; host.write_text(text.replace(anchor,anchor+'\n    benchmarkMemoryBytes(){return cpu?.memory.buffer.byteLength ?? 0;},',1))
 bindings={str(p.relative_to(P)):sha(p)for p in P.rglob('*')if p.is_file()and p.suffix!='.log' and p.name not in ['metadata.json','node-validation.json','browser-validation.json']}
 metadata=dict(status='prepared',scope='Combined-main untimed complete-output and ownership replay. No frozen timing result is attributed to this compiler.',compiler=str(o.compiler.resolve()),compiler_sha256=sha(o.compiler),proof_replay_sha256=sha(replay/'review.json'),protocol=dict(seed=320000,mode='validate-only',timing_enabled=False),bindings=bindings)
 (P/'metadata.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(dict(status='prepared',bundles=12,bindings=len(bindings))))
if __name__=='__main__':main()
