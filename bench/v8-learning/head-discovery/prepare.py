import json,subprocess,hashlib
from pathlib import Path
root=Path.cwd();d=root/'build/v8-head-discovery';compiler=root/'build/v8-signed-division/frozen/ink-final-merged';context=json.loads((root/'bench/v8-learning/corpus-integer-division/context.json').read_bytes());subjects={}
for name,row in context['corpus_inputs'].items():
 core=root/'bench/v8-learning/corpus-integer-division/inputs'/(row['core_sha256']+'.core.json');output=d/(name+'.semantic.json')
 subprocess.run([compiler,'emit-semantic',core,'--core','-o',output],capture_output=True,check=True)
 subjects[name]=dict(path=str(output.relative_to(root)),sha256=hashlib.sha256(output.read_bytes()).hexdigest(),core=str(core.relative_to(root)),core_sha256=row['core_sha256'])
(d/'subjects.json').write_text(json.dumps(dict(compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),subjects=subjects),indent=2)+'\n');print('subjects',len(subjects))
