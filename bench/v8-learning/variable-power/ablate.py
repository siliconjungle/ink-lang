from pathlib import Path
import hashlib,json,os,subprocess,time
from ink_planner.corpus import clone_knowledge
b=Path('build/v8-variable-power-cases/search-profile');core=Path('build/v8-variable-power-cases/corpus/inputs/44dc64a74456ff85189fc9d8969a5d23ca8b1fdfc43db8a28b18656980a840b3.core.json').resolve();rows=[]
for label,leaf,compiler in [('wide-final-cli',64,'build/v8-proof-dependencies-final-cli/frozen/ink-integrated'),('compact-final-cli',2,'build/v8-proof-dependencies-final-cli/frozen/ink-integrated'),('compact-previous-cli',2,'build/v8-proof-dependencies-merged/frozen/ink-integrated')]:
 out=b/label;out.mkdir();start=time.monotonic();root=out/'knowledge';clone_knowledge('knowledge',root);copy_seconds=time.monotonic()-start;path=root/'ink_knowledge/proposal_views.py';original=path.read_text();modified=original.replace('identities,{},2)','identities,{},'+str(leaf)+')');temporary=path.with_suffix('.trial');temporary.write_text(modified);os.replace(temporary,path)
 env=dict(os.environ,PYTHONPATH=str(Path('planner').resolve())+os.pathsep+str(root.resolve()));start=time.monotonic();r=subprocess.run([str(Path(compiler).resolve()),'--version'],capture_output=True,text=True,check=True)
 cmd=[str(Path('build/proof-python/bin/python').resolve()),'-m','ink_planner.compiled_planning','--compiler',str(Path(compiler).resolve()),'--source',str(core),'--core','--knowledge-root',str(root.resolve()),'--target','javascript','--planning-effort','quick','-o',str((out/'plan.json').resolve())];r=subprocess.run(cmd,capture_output=True,text=True,env=env,timeout=600);(out/'stdout').write_text(r.stdout);(out/'stderr').write_text(r.stderr);row=dict(label=label,leaf=leaf,exit_status=r.returncode,copy_seconds=str(copy_seconds),seconds=str(time.monotonic()-start),compiler_sha256=hashlib.sha256(Path(compiler).read_bytes()).hexdigest())
 if r.returncode==0:
  receipt=json.loads((out/'plan.json.receipt.json').read_bytes());row.update(attempts=receipt['attempts'],admitted_states=receipt['admitted_states'],semantic=receipt['diagnostics']['semantic'],recipe_seconds=receipt['diagnostics']['recipe_seconds'])
 rows.append(row);print(json.dumps(row),flush=True)
(b/'ablation-terminal.json').write_text(json.dumps(dict(schema=1,exit_status=0,rows=rows),indent=2))
