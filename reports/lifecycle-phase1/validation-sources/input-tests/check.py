import sys,json,hashlib,subprocess
from pathlib import Path
root=Path(__file__).resolve().parents[2];sys.path.insert(0,str(root/'bench/state'));import lifecycle
archive=root/'reports/borrowed-outcomes-phase1';meta=json.loads((archive/'metadata.json').read_text());compiler=root/'target/release/lang';build=Path(__file__).parent
before=hashlib.sha256(compiler.read_bytes()).hexdigest()
positive=lifecycle.validate_inputs(compiler,archive,meta,build/'positive');assert positive['status']=='passed'
checks=[]
for kind in ['body','plan']:
 wrapper=build/(kind+'.py')
 wrapper.write_text('#!/usr/bin/env python3\nimport sys,json,subprocess\nfrom pathlib import Path\nroot=Path(__file__).resolve().parents[2]\nsubprocess.run([str(root/"target/release/lang"),*sys.argv[1:]],check=True)\nif sys.argv[1]=="emit-state":\n project=Path(sys.argv[sys.argv.index("-o")+1])\n'+(' (project/"src/lib.rs").write_text("pub struct State;\\n")\n' if kind=='body' else ' p=project/"plan.json";v=json.loads(p.read_text());v["module"]="wrong_module";p.write_text(json.dumps(v))\n'))
 wrapper.chmod(0o755)
 try:lifecycle.validate_inputs(wrapper,archive,meta,build/kind)
 except AssertionError:checks.append(kind+' mismatch rejected')
 else:raise AssertionError(kind+' mismatch accepted')
bad=json.loads(json.dumps(meta));bad['source_sha256']['examples/state-benchmark.lang']='0'*64
try:lifecycle.validate_inputs(compiler,archive,bad,build/'wrong-source')
except AssertionError:checks.append('source mismatch rejected')
else:raise AssertionError('source mismatch accepted')
assert hashlib.sha256(compiler.read_bytes()).hexdigest()==before
print(json.dumps({'status':'passed','exact_codegen_and_plan_replays':len(positive['exact_codegen_and_plan_replay']),'rejections':checks,'compiler_preserved':True},indent=2))
