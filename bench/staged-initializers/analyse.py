#!/usr/bin/env python3
"""Audit captured observations and derive scoped gains and costs; no authority."""
import argparse,hashlib,json,statistics
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
NAMES=('scalar','keeps','defaults')
def sha(b):return hashlib.sha256(b).hexdigest()
def read(root,name):return json.loads((root/name).read_text())
def median(xs):return statistics.median(xs)
def bound(root,name):
 p=(root/name).resolve()
 if not p.is_relative_to(root.resolve()) or not p.is_file():raise ValueError('unbound report path')
 return p

def logical(path):
 b=path.read_bytes();assert len(b)>=116
 assert b[:12]==bytes([86,76,83,84,65,84,69,0,1,0,1,0])
 assert hashlib.sha256(b[:-32]).digest()==b[-32:]
 assert int.from_bytes(b[76:84],'little')==len(b)-116
 value={'schema':b[44:76].hex(),'payload':b[84:-32].hex()}
 return sha(json.dumps(value,separators=(',',':')).encode())

def summarize(root):
 records=read(root,'measurements.json')['records'];memory=read(root,'memory.json')['records'];phases=read(root,'phases.json')['rows']
 assert {(r['cohort'],r['process'])for r in records}=={(c,p)for c in ['development','holdout']for p in range(3)}
 assert len(records)==6 and len(memory)==9 and len(phases)==6
 sources=read(root,'metadata.json')['sources']
 for r in records:
  assert r['sources']==sources and len(r['rows'])==44 and len(r['training'])==99
  assert {(x['sample'],x['name'])for x in r['rows']}=={(i,n)for i in range(11)for n in (*NAMES,'dense')}
  assert {(x['sample'],x['name'],x['reads'])for x in r['training']}=={(i,n,k)for i in range(11)for n in NAMES for k in [0,4,16]}
  for x in r['rows']:assert x['count']==2000 and x['ns']>0
  for x in r['training']:assert x['ns_per_turn']>0
  for i in range(11):
   assert len({x['sink']for x in r['rows']if x['sample']==i})==1
   for reads in [0,4,16]:assert len({x['sink']for x in r['training']if x['sample']==i and x['reads']==reads})==1
  assert len({x['logical_sha256']for x in r['training']})==1
  assert len({x['feedback_sha256']for x in r['training']})==1
  assert len({r['cold'][n]['output_sha256']for n in NAMES})==1
  for n in NAMES:assert r['cold'][n]['first_call_ms']>0
 assert len({r['node']for r in records+memory})==1
 assert {(r['process'],r['name'])for r in memory}=={(p,n)for p in range(3)for n in NAMES}
 assert len({r['sink']for r in memory})==1
 for r in memory:
  assert r['source']==sources[r['name']]
  assert r['heap_delta']==r['after']['heapUsed']-r['before']['heapUsed']
 assert {(r['process'],r['name'])for r in phases}=={(p,n)for p in range(3)for n in ['keeps','defaults']}
 for r in phases:assert r['source_sha256']==sources[r['name']] and r['check_ms']>0 and r['emit_ms']>0
 held=[r for r in records if r['cohort']=='holdout']
 prediction={n:median(median(x['ns']for x in r['rows']if x['name']==n)for r in held)for n in (*NAMES,'dense')}
 training={str(k):{n:median(median(x['ns_per_turn']for x in r['training']if x['name']==n and x['reads']==k)for r in held)for n in NAMES}for k in [0,4,16]}
 return dict(node=records[0]['node'],prediction_ns=prediction,keeps_over_defaults=prediction['keeps']/prediction['defaults'],scalar_over_defaults=prediction['scalar']/prediction['defaults'],defaults_over_dense=prediction['defaults']/prediction['dense'],training_ns=training,
  cold_prediction_ms={n:median(r['cold'][n]['first_call_ms']for r in held)for n in NAMES},
  heap_delta_bytes={n:median(r['heap_delta']for r in memory if r['name']==n)for n in NAMES},
  cli_phase_ms={n:{k:median(r[k+'_ms']for r in phases if r['name']==n)for k in ['check','emit']}for n in ['keeps','defaults']},
  paired_prediction_ratios=[dict(cohort=r['cohort'],process=r['process'],keeps_over_defaults=median(x['ns']for x in r['rows']if x['name']=='keeps')/median(x['ns']for x in r['rows']if x['name']=='defaults'))for r in records],
  scope='Observed CPU JavaScript source-staging lifecycles; no universal performance, automatic selection, upstream parity or implementation-correctness proof.')

def audit(root):
 m=read(root,'metadata.json')
 for name,record in m['files'].items():
  b=bound(root,name).read_bytes();assert len(b)==record['bytes']and sha(b)==record['sha256'],name
 for name,expected in m['scripts'].items():
  assert name.startswith('bench/staged-initializers/')
  assert sha(bound(ROOT,name).read_bytes())==expected,name
 previous=ROOT/'reports/structured-preparation-2026-10-16'
 for name,record in m['previous_inputs'].items():
  b=bound(previous,name).read_bytes();assert sha(b)==record['sha256']and len(b)==record['bytes'],name
 assert logical(root/'neural/model.snapshot')==logical(previous/'neural/model.snapshot')
 for n,path in [('defaults',root/'neural/source.core.json'),('keeps',previous/'neural/source.core.json')]:assert sha(path.read_bytes())==m['sources'][n]
 assert m['sources']['scalar']==m['sources']['keeps']
 verification=read(root,'model-verification.json');assert verification['status']=='checked'and verification['training_replayed']
 assert verification['source_core_sha256']==m['sources']['defaults']
 core=read(root,'core-private.json');assert core['status']=='passed'and core['private_checkout']and core['private_target']
 assert core['log_sha256']==sha((root/'core-private.log').read_bytes())
 data=read(root,'measurements.json')['records'];expected=logical(root/'neural/model.snapshot')
 assert logical(root/'frozen/model.snapshot')==expected
 frozen=read(root,'frozen/source.core.json')
 assert frozen['semantics']=='ink-executable-core-v14'and frozen['program']['frozen']
 learning=frozen['program'].get('contracts',{}).get('learning',{})
 assert not learning.get('trainable',[])and not learning.get('learn',[])
 assert all(not a['writes']for a in frozen['program']['actions'])
 assert all(r['initial_logical_sha256']==expected for r in data)
 assert all(r['logical_sha256']==expected for r in read(root,'memory.json')['records'])
 for r in read(root,'phases.json')['rows']:
  p=root/'neural/program.mjs.source.mjs'if r['name']=='defaults'else previous/'neural/program.mjs.source.mjs'
  assert r['javascript_sha256']==sha(p.read_bytes())
 return summarize(root)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=Path);p.add_argument('--check',action='store_true');a=p.parse_args()
 result=audit(a.directory);path=a.directory/'summary.json'
 if a.check:assert read(a.directory,'summary.json')==result,'derived summary drift'
 else:path.write_text(json.dumps(result,indent=2)+'\n')
 print(json.dumps({'status':'checked','keeps_over_defaults':result['keeps_over_defaults'],'scope':result['scope']}))
if __name__=='__main__':main()
