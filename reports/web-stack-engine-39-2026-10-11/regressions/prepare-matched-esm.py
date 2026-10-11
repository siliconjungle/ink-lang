"""Generate exact matched ESM controls without executing or timing kernels."""
import pathlib,json,re,hashlib
B=pathlib.Path(__file__).resolve().parents[3];R=pathlib.Path(__file__).resolve().parent;P=B/'reports/web-stack-proofs-38-2026-10-11/targets/targets';out=R/'matched-esm'
sha=lambda b:hashlib.sha256(b).hexdigest();rows=[]
pattern=re.compile(r'const (v\d+)=new Array\((v\d+)\+(v\d+)\);\nfor\(let (v\d+)=0;\4<\2;\4\+\+\)\{\1\[\4\]=(v\d+)\[\4\];\}\nfor\(let (v\d+)=0;\6<\3;\6\+\+\)\{\1\[\2\+\6\]=(v\d+)\[\6\];\}')
for side in ['left','right']:
 task=f'pipeline38_{side}_padded_zip_heldout_u32'
 for variant,version in [('prior_original_esm','prior'),('prior_unchanged_clone_esm','prior'),('prior_no_padding_esm','prior'),('checked_original_esm','checked'),('checked_unchanged_clone_esm','checked'),('checked_no_pluszero_esm','checked')]:
  original=P/task/version/'program.mjs';src=original.read_text();primary,rest=src.split('function __fn1',1);transformed=primary
  if variant=='prior_no_padding_esm':
   transformed,count=pattern.subn(lambda m:f'const {m[1]}={m[5]}; // diagnostic: appended suffix is not materialized',primary);assert count==1
  elif variant=='checked_no_pluszero_esm':assert primary.count('+0')==4;transformed=primary.replace('+0','')
  module=transformed+'function __fn1'+rest
  if 'original' in variant:path=original
  else:
   path=out/task/variant/'program.mjs';path.parent.mkdir(parents=True,exist_ok=True)
   with path.open('x') as f:f.write(module)
  row={'task':task,'variant':variant,'original_path':str(original.relative_to(B)),'path':str(path.relative_to(B)),'original_sha256':sha(src.encode()),'sha256':sha(module.encode()),'primary_function_name':'__fn0','primary_array_sites':transformed.count('new Array('),'primary_loops':transformed.count('for('),'rest_of_module_unchanged':module.split('function __fn1',1)[1]==rest,'esm_strictness':True}
  if 'clone' in variant:assert row['sha256']==row['original_sha256']
  if 'original' not in variant:
   counted=module.replace(transformed,transformed.replace('new Array(','__diagArray('),1)+'\nlet __diagAllocations=[];function __diagArray(n){__diagAllocations.push(n);return new Array(n)}\nexport function __diagnosticAllocations(){return __diagAllocations.slice()}\nexport function __resetDiagnosticAllocations(){__diagAllocations=[]}\n'
   ipath=out/task/variant/'counted.mjs'
   with ipath.open('x') as f:f.write(counted)
   row['allocation_only_path']=str(ipath.relative_to(B));row['allocation_only_sha256']=sha(counted.encode())
  rows.append(row)
manifest={'status':'prepared_untimed','rows':rows,'frames':[f'pipeline38_{o}_padded_zip_heldout_u32-high-{n}' for o in ['left','right'] for n in [4096,65536]],'limits':'Counted constructors modify code and are untimed only. Unchanged original/clones detect module path/context effects. Timed controls modify only primary body, preserving all remaining module bytes.'}
with (R/'matched-esm-manifest.json').open('x') as f:json.dump(manifest,f,indent=2);f.write('\n')
print(json.dumps({'status':manifest['status'],'modules':12,'counted_modules':8}))
