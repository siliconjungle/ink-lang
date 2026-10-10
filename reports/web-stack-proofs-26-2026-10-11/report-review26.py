"""Small independent report-to-saved-outcome comparison; no statistical rerun."""
from pathlib import Path
import collections,hashlib,json,re,statistics
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
EXPECTED='6827cc410ebb3ff14861e4243643334a28e96f2ce10b7c9d6bd60c3825c8d39f'
assert sha(R/'REPORT.md')==EXPECTED
report=(R/'REPORT.md').read_text();rows=read('all-comparisons.json')['rows'];m=read('metadata.json');f=read('fixtures.json');asset=read('preflight-receipt.json');v=read('verification.json');scope='all';tables=[];families=[]
for line in report.splitlines():
 if line.startswith('## Fresh proof'):scope='fresh'
 elif line.startswith('## All '):scope='all'
 elif line.startswith('## Actual GPU'):scope='all'
 if line.startswith('| `'):
  cols=[q.strip() for q in line.strip('|').split('|')];case=cols[0].strip('`')
  for host,text in zip(['node','browser'],cols[1:]):
   q=[x for x in rows if x['host']==host and x['case']==case and x['comparison']=='backend_checked_js'];median=statistics.median(x['ratio_95pct'][0] for x in q)
   assert text==f'{median:.3f}×',(case,host,text,median);families.append(dict(case=case,host=host,median=median))
 if not line.startswith('| ') or not re.search(r'\| \d+/\d+ \|',line):continue
 cols=[q.strip() for q in line.strip('|').split('|')];location,display,numerator,slower,unknown=cols
 host,mode=(location.split(' / ',1)+[''])[:2] if ' / ' in location else (location,'')
 if display.startswith('Actual '):
  variant,expert=display[7:].split(' versus ');key=expert+'_over_'+variant
 elif host=='native':key={'backend on current proofs':'backend_checked','proofs on current backend':'proof_new','combined versus old prior':'combined','versus optimized native Rust':'current_over_expert'}[display]
 else:
  target='borrowed_js' if display.startswith('JS synchronous') else 'wasm' if display.startswith('Wasm ') else 'js'
  if ' · ' in display:key={'backend on current proofs':'backend_checked','proofs on current backend':'proof_new','combined versus old prior':'combined'}[display.split(' · ')[1]]+'_'+target
  else:key='ink_new_checked_'+target+'_over_'+('rust_expert_wasm' if target=='wasm' else 'js_expert_borrowed' if target=='borrowed_js' else 'js_expert')
 q=[x for x in rows if x['host']==host and x['mode']==mode and x['comparison']==key and (scope!='fresh' or x['proof_fresh'])];assert q,(host,key)
 c=collections.Counter(x['verdict'] for x in q);is_expert='expert' in key
 faster=c['Ink_faster' if is_expert else 'faster'];loss=c['expert_faster' if is_expert else 'slower'];inc=c['inconclusive']
 assert numerator==f'{faster}/{len(q)}' and int(slower)==loss and int(unknown)==inc,(host,mode,key,scope,cols,c)
 tables.append(dict(host=host,mode=mode,comparison=key,scope=scope,total=len(q),faster=faster,slower=loss,inconclusive=inc))
assert len(tables)==66 and len(families)==18,(len(tables),len(families))
assert len(m['tasks'])==9 and len(f['cells'])==56 and sum(t['fresh_proof_required'] for t in m['tasks'].values())==2
assert v['timing_samples']==20268 and v['complete_benchmark_comparisons']==9403 and v['independent_intervals']==4056 and v['adverse_comparisons_retained']==135
assert v['catalog_entries']==1790 and v['observations_added']==560 and v['canonical_observations']==17026
assert asset['inputs']==187 and asset['js']['comparisons']==374 and asset['python_input_values_exercised']==2055448
recovery=read('protocol-preparation-recovery26.json');assert recovery['status']=='passed' and recovery['failed_preparation_timing_samples']==0 and recovery['identical_selected_cores']==18
assert len(recovery['actual_GPU_references'])==3 and recovery['browser_merged']['timed_GPU_cells']==12
assert all(not x['fresh'] for x in recovery['actual_GPU_references'])
assert 'unchanged native/Wasm/GPU backend code cannot establish a JS-emitter gain' in report
assert 'complete Wasm bytes differ only in old/new DWARF debug paths' in report
assert 'no map profitability is claimed' in report and 'Broad superiority over optimized native implementations remains unachieved' in report
assert 'No measured workloads or controls changed in recovery' in report
files=['REPORT.md','all-comparisons.json','metadata.json','preflight-receipt.json','protocol-preparation-recovery26.json','native-final-review.json','catalogue-review.json','emission-review.json',Path(__file__).name]
result=dict(status='Final report review passes',report_sha256=EXPECTED,table_rows_independently_derived=len(tables),family_medians_independently_derived=len(families),table_rows=tables,family_medians=families,findings=[],scope='Compared final measured lead/tables and bounded claims with authenticated saved outcomes, correctness/capture source preflight and independent preparation recovery. Proof and backend attribution separate; identical fixed-core native/Wasm code variability is not a JS lowering speedup. GPU only unchanged references and every measured GPU/expert pair favors the expert. Negative and inconclusive outcomes retained; no general superiority claim. No source/measurement edits or full protocol rerun.',bindings={n:sha(R/n) for n in files})
(R/'report-review26.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['bindings','table_rows','family_medians']}))
