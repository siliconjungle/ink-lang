#!/usr/bin/env python3
"""Convert pinned paper patches into explicit causal batches without retieing IDs."""
import argparse,hashlib,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];B=ROOT/'build/crdt';D=B/'upstreams/egwalker-paper/datasets'
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--limit',type=int,default=0);p.add_argument('--out',type=Path,default=B/'batch-traces.json');a=p.parse_args()
mappings={Path(x['path']).stem:x for x in map(json.loads,(B/'trace-agents.jsonl').read_text().splitlines())};cases=[]
for name in ['S1','S2','S3','C1','C2','A1','A2']:
 raw=(D/(name+'.json')).read_bytes();data=json.loads(raw);mapping=mappings.get(name);ranks={n:i+1 for i,n in enumerate(sorted(set(mapping['names'])))}if mapping else{'single':1};heads=[];changes=[];original=[]
 for ti,txn in enumerate(data['txns']):
  m=mapping['transactions'][ti]if mapping else dict(name='single',sequence=0)
  parents=sorted(set(x for parent in txn['parents'] for x in heads[parent]))
  if m.get('empty'):heads.append(parents);continue
  rank=ranks[m['name']];counter=m['sequence']+1;before=counter
  for position,remove,text in txn['patches']:
   codepoints=list(map(ord,text));n=remove+len(codepoints)
   if not n:continue
   id=(rank<<32)|counter;changes.append(dict(id=id,parents=parents,position=position,remove=remove,text=codepoints));counter+=n;parents=[(rank<<32)|(counter-1)]
  heads.append(parents)
  if mapping:assert counter-before==m['events'],(name,ti,'scalar counts must match DT span')
  if a.limit and len(changes)>=a.limit:break
 complete=len(heads)==len(data['txns']);cases.append(dict(name=name+('-prefix'if not complete else''),changes=changes,expected=list(map(ord,data['endContent']))if complete else None,source_sha256=hashlib.sha256(raw).hexdigest(),original_agent_names=sorted(ranks,key=ranks.get)))
 print(name,'batches',len(changes),'complete',complete,flush=True)
a.out.write_text(json.dumps(cases)+'\n')
