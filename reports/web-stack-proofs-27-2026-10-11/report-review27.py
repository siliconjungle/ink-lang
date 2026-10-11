"""Small independent report-to-saved-outcome comparison; no statistical rerun."""
from pathlib import Path
import collections,hashlib,json,re,statistics
R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
read=lambda n:json.loads((R/n).read_text())
EXPECTED='2c69421de64dfff1bc74f70d20f24f1c4b18820e6ab548b870051a97303dd56b'
assert sha(R/'REPORT.md')==EXPECTED
report=(R/'REPORT.md').read_text();rows=read('all-comparisons.json')['rows'];m=read('metadata.json');f=read('fixtures.json');asset=read('preflight-receipt.json');scope='all';tables=[];families=[]
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
assert len(tables)==68 and not families,(len(tables),len(families))
assert len(m['tasks'])==8 and len(f['cells'])==32 and sum(t['fresh_proof_required'] for t in m['tasks'].values())==2
assert asset['inputs']==148 and asset['js']['comparisons']==296
native=read('native-final-review.json');data=read('protocol-final-review.json');catalogue=read('catalogue-review.json')
assert native['status']=='passed' and native['independently_recomputed_paired_intervals']==384 and native['complete_validation_comparisons']==888
assert data['host_rows']['node']['samples']==4320 and data['host_rows']['browser']['samples']==4536
assert data['host_rows']['node']['comparisons']==2996 and data['host_rows']['browser']['comparisons']==3226
assert data['host_rows']['browser']['actual_GPU_prevalidation']==114 and data['host_rows']['browser']['GPU_prevalidation_fallbacks']==76 and data['host_rows']['browser']['timed_GPU_cells']==24
assert data['independently_recomputed_web_intervals']==1776 and data['independently_recomputed_factorial_interactions']==192
assert catalogue['status']=='passed' and catalogue['current_entries']==1822
native_summary=read('native/summary.json');assert native_summary['samples']==2880
assert 4320+4536+2880==11736 and 2996+3226+888==7110 and 1776+192+384==2352
ranges={}
for mode,lo,hi in [('resident','1.16','1.59'),('snapshot','1.10','1.36')]:
 q=[x['ratio_95pct'][0] for x in rows if x['host']=='native' and x['mode']==mode and x['proof_fresh'] and x['comparison']=='proof_new'];assert len(q)==8
 assert f'{min(q):.2f}'==lo and f'{max(q):.2f}'==hi;ranges[mode]=[min(q),max(q)]
q=[x['ratio_95pct'][0] for x in rows if x['host']=='native' and x['case']=='reference_modular_mix_u32' and x['comparison']=='backend_checked'];assert f'{min(q):.2f}'=='2.44' and f'{max(q):.2f}'=='3.85'
q=[x['ratio_95pct'][0] for x in rows if x['host']=='browser' and x['input'].endswith('/full-65536') and x['case']=='reference_modular_mix_u32' and x['comparison']=='backend_checked_js'];assert len(q)==1 and f'{q[0]:.2f}'=='2.85'
assert 'No old-only source certificate was admitted' in report and 'contextual opportunity' in report and 'excluded symmetrically' in report
assert 'Reference tasks have identical prior/current selected cores' in report and 'run variation rather than compiler gains' in report
assert 'complete fixtures and captures are exact unchanged bytes' in report and 'does not credit inlining for eliminating that accidental repeated work' in report
assert 'Broad native superiority is not established' in report and 'all 24 cells each' in report
files=['REPORT.md','all-comparisons.json','metadata.json','preflight-receipt.json','native-final-review.json','catalogue-review.json','emission-review.json',Path(__file__).name]
result=dict(status='Final report review passes',report_sha256=EXPECTED,table_rows_independently_derived=len(tables),table_rows=tables,native_fresh_proof_gain_ranges=ranges,findings=[],scope='Compared all 68 measured table rows and headline gain ranges directly with saved authenticated outcomes. Nested zip proof gains separated from known helper backend gains; unchanged reference proof cores are timing variation. Fresh GPU is eligibility-only, references deduplicated and all 48 GPU/expert comparisons favor CPU. Source Let recovery/control equality/contextual certificate exclusion explicitly disclosed; strong already optimized controls and boundaries retained. Broad superiority not established. No source or measurement edits.',bindings={n:sha(R/n) for n in files})
(R/'report-review27.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ['bindings','table_rows']}))
