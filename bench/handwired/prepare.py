#!/usr/bin/env python3
"""Prepare a matched browser benchmark in an existing pinned Handwired checkout.

Does not fetch repositories, select a runtime plan or start a browser. All Ink
kernels are emitted by the supplied compiler from the retained source files.
"""
import argparse,hashlib,json,shutil,subprocess
from pathlib import Path
HERE=Path(__file__).resolve().parent
PIN='09f23d276d3b9284cea4eec61ffd934950cc979e'
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--handwired',type=Path,required=True)
p.add_argument('--compiler',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
a=p.parse_args();hw=a.handwired.resolve();compiler=a.compiler.resolve();out=a.output.resolve()
def run(*args,**kw):return subprocess.run(list(map(str,args)),check=True,**kw)
revision=subprocess.check_output(['git','-C',str(hw),'rev-parse','HEAD'],text=True).strip()
if revision!=PIN:raise ValueError('Handwired revision differs from retained experiment')
run('git','-C',hw,'diff','--quiet');run('git','-C',hw,'diff','--cached','--quiet')
out.mkdir(parents=True,exist_ok=True)
page=hw/'ink-benchmark'
if page.exists():
 if not(page/'.ink-benchmark').is_file():raise ValueError('refusing to overwrite an unrelated directory')
 shutil.rmtree(page)
page.mkdir(exist_ok=True);(page/'.ink-benchmark').write_text('packed-circuits-v1\n')
for name in ['index.html','main.ts']:shutil.copy(HERE/'browser'/name,page/name)
shutil.copy(HERE/'baseline/ink.mjs',page/'ink-baseline.mjs')
run(compiler,'build',HERE/'literal-search.ink','--target','javascript','-o',page/'ink-utf8.mjs')
for source,name,entry in [('encoded-search.ink','dfa','counts_encoded'),('packed-search.ink','packed','counts_packed')]:
 emitted=out/name
 run(compiler,'build',HERE/source,'--target','webgpu','-o',emitted)
 manifest=json.loads((emitted/'manifest.json').read_bytes())
 function=next(f for f in manifest['functions']if f['name']==entry)
 bundle=emitted/function['bundle'] if 'bundle'in function else emitted
 shutil.copytree(bundle,page/('ink-'+name+'-gpu'),dirs_exist_ok=True,ignore=shutil.ignore_patterns('native','cpu','target'))
# Optional native lane; generate corpus with generate-workload.mjs.
run(compiler,'build',HERE/'literal-search.ink','--target','rust','-o',out/'native')
shutil.copytree(HERE/'native-harness',out/'native-harness',dirs_exist_ok=True)
shutil.copy(HERE/'collect.mjs',out/'collect.mjs')
root=HERE.parent.parent
ink_revision=subprocess.check_output(['git','-C',str(root),'rev-parse','HEAD'],text=True).strip()
ink_diff=subprocess.check_output(['git','-C',str(root),'diff','HEAD','--binary'])
metadata={'schema':1,'handwired':revision,'ink_revision':ink_revision,'ink_worktree_diff_sha256':hashlib.sha256(ink_diff).hexdigest(),'compiler_sha256':hashlib.sha256(compiler.read_bytes()).hexdigest(),'sha256':{str(path.relative_to(page)):hashlib.sha256(path.read_bytes()).hexdigest()for path in sorted(page.rglob('*'))if path.is_file()}}
(out/'build-info.json').write_text(json.dumps(metadata,indent=2)+'\n')
shutil.copy(out/'build-info.json',page/'build-info.json')
print(json.dumps({'page':'http://127.0.0.1:4324/ink-benchmark/','collector':str(out/'collect.mjs'),'metadata':str(out/'build-info.json')}))
