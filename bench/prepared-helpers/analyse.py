#!/usr/bin/env python3
"""Audit retained bytes and the complete isolated-process measurement matrix.
This ledger is not an authenticity, correctness or profitability certificate.
"""
import argparse,hashlib,json,statistics,re
from pathlib import Path

def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def analyse(root):
 metadata=json.loads((root/'metadata.json').read_text())
 for name,sha in metadata['files'].items():
  assert digest(root/name)==sha,name
 sources={}
 for artifact in ['previous','current']:
  p=root/f'{artifact}.mjs';text=p.read_text();m=re.search(r'^export const metadata = (.*);$',text,re.M);assert m
  interface=json.loads(m[1]);assert interface['core_sha256']==metadata['source_core']
  sources[artifact]=digest(p)
 # Ordinary function emission is byte-identical. Prepared functions and module
 # layout differ; this does not assert identical engine performance.
 old=(root/'previous.mjs').read_text();new=(root/'current.mjs').read_text()
 ordinary=old[old.index('function __fn0('):old.index('function __prepareFn')]
 assert ordinary in new
 groups={};corpora={};oracles={}
 for cohort,seed in [('development',72131),('holdout',99173)]:
  groups[cohort]={}
  for artifact in ['previous','current']:
   samples={}
   for rep in range(3):
    p=root/'raw'/f'{cohort}-{rep}-{artifact}.json';data=json.loads(p.read_text())
    assert data['artifact']==artifact and data['seed']==seed
    assert data['node']=='v25.3.0' and data['source_core']==metadata['source_core']
    assert data['sources'][artifact]['sha256']==sources[artifact]
    assert data['upstream_sha256']==metadata['upstream_file_sha256']
    assert data['operations']=={'ink':232,'handwired':664,'handwired_ranges':232}
    assert corpora.setdefault(seed,data['corpus_sha256'])==data['corpus_sha256']
    assert oracles.setdefault(seed,data['oracle_sha256'])==data['oracle_sha256']
    expected={(task,name,i) for task in ['predict','derivatives']for name in [artifact+'_ordinary',artifact+'_prepared','handwired','handwired_ranges','direct_graph']+(['dense_predict']if task=='predict'else[])for i in range(11)}
    actual=set();rows={}
    for row in data['records']:
     key=(row['task'],row['name'],row['sample']);assert key not in actual;actual.add(key)
     assert row['count']==(1024 if row['task']=='predict'else 128)
     assert row['ns_per_call']>0
     rows.setdefault(row['task']+'/'+row['name'],[]).append(row['ns_per_call'])
    assert actual==expected,(p,expected-actual,actual-expected)
    for key,values in rows.items():samples.setdefault(key,[]).append(statistics.median(values))
   groups[cohort][artifact]={k:{'process_medians_ns':v,'median_ns':statistics.median(v)}for k,v in samples.items()}
 memory={}
 for artifact in ['previous','current']:
  rows=[json.loads((root/'raw'/f'memory-{artifact}-{rep}.json').read_text())for rep in range(3)]
  assert all(r['module_sha256']==sources[artifact]and r['source_core']==metadata['source_core']for r in rows)
  memory[artifact]={key:statistics.median(r[key]for r in rows)for key in ['import_ms','setup_ms','capture_ms','token_ms','first_call_ms','heap_delta_bytes','max_rss_kib']}
 gains={}
 for cohort,items in groups.items():
  gains[cohort]={}
  for task in ['predict','derivatives']:
   old=items['previous'][task+'/previous_prepared']['median_ns'];new=items['current'][task+'/current_prepared']['median_ns']
   gains[cohort][task]={'previous_ns':old,'current_ns':new,'speedup':old/new,'ordinary_previous_ns':items['previous'][task+'/previous_ordinary']['median_ns'],'ordinary_current_ns':items['current'][task+'/current_ordinary']['median_ns'],'handwired_ranges_ns':items['current'][task+'/handwired_ranges']['median_ns']}
 return dict(schema=1,groups=groups,gains=gains,memory=memory,ordinary_functions_sha256=hashlib.sha256(ordinary.encode()).hexdigest(),scope='Median of three fresh-process medians in each cohort/artifact; eleven interleaved samples per task/lane/process. Each process loads one Ink module. Complete detached F32 results are checked, including all 244 gradients. No automatic selection or universal performance claim.')

if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('report',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args();result=analyse(a.report);dest=a.report/'summary.json'
 if a.check:assert json.loads(dest.read_text())==result,'summary changed'
 else:dest.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'status':'passed','gains':result['gains'],'memory':result['memory']}))
