from pathlib import Path
import json,subprocess,time,hashlib,os
r=Path(__file__).resolve().parents[2];b=r/'build/numeric-text-primitives';out=r/'reports/numeric-text-primitives-2026-10-13';compiler=b/'compiler.fixed'
rows=[]
for name in ['base','grown']:
 dst=out/('quick-'+name);dst.mkdir(exist_ok=True);db=b/'databases'/name
 cmd=[os.sys.executable,'-m','ink_planner.compiled_planning','--compiler',str(compiler),'--source',str(r/'bench/numeric-text-primitives/choice.ink'),'--knowledge-root',str(db),'--snapshot',str(db/'pin.json'),'--target','javascript','--planning-effort','quick','--cache','off','--emit',str(dst/'output.mjs'),'-o',str(dst/'plan.json')]
 t=time.monotonic();p=subprocess.run(cmd,capture_output=True,text=True,env=dict(os.environ,PYTHONPATH=os.pathsep.join([str(r/'knowledge'),str(r/'planner')]),INK_DISTRIBUTION=str(r)))
 (dst/'stdout.txt').write_text(p.stdout);(dst/'stderr.txt').write_text(p.stderr);row=dict(checkpoint=name,seconds=time.monotonic()-t,status=p.returncode,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest());rows.append(row);assert p.returncode==0,p.stderr[-1000:]
 receipt=json.loads((dst/'plan.json.receipt.json').read_bytes());row.update(snapshot=receipt['source_snapshot'],admitted=receipt['admitted_states'],selected=receipt['selected'],selection=receipt['selection'],artifact_sha256=hashlib.sha256((dst/'output.mjs').read_bytes()).hexdigest());print(name, row['admitted'],round(row['seconds'],2),flush=True)
(out/'planning-probe.json').write_text(json.dumps(rows,indent=2)+'\n')
