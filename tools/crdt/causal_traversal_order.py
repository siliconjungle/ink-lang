#!/usr/bin/env python3
"""Diagnose generic topological traversal orders, independently of text replay.

This is an untrusted work estimate, not a proof or timed implementation. Exact
ancestor bitsets are explicitly bounded to keep diagnostic memory predictable.
"""
import argparse,json
from pathlib import Path
from replay_counts import counts

def order(changes):
 n=len(changes);ends={};parents=[];children=[[]for _ in range(n+1)]
 for i,c in enumerate(changes):
  ps=sorted(set(ends[p]for p in c['parents']))
  parents.append(ps)
  for p in ps or [n]:children[p].append(i)
  ends[c['id']+c['remove']+len(c['text'])-1]=i
 # A compact descendant sketch ranks subtrees. It grants no semantic authority.
 sketch=[0]*n
 for i in range(n-1,-1,-1):
  value=1<<((i*2654435761)%64)
  for c in children[i]:value|=sketch[c]
  sketch[i]=value
 costs=[s.bit_count()for s in sketch]
 for ch in children:ch.sort(key=lambda i:(costs[i],i),reverse=True)
 missing=[len(ps)for ps in parents];visited=[False]*n;pending=list(children[n]);result=[]
 while pending:
  i=pending.pop()
  if visited[i] or missing[i]:continue
  visited[i]=True;result.append(i)
  ready=[]
  for c in children[i]:
   missing[c]-=1
   if missing[c]==0:ready.append(c)
  pending.extend(ready)
 if len(result)!=n:raise ValueError('incomplete traversal')
 rank={node:i for i,node in enumerate(result)}
 if any(rank[p]>=rank[i]for i,ps in enumerate(parents)for p in ps):raise ValueError('not topological')
 return result

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('cases',type=Path);p.add_argument('--max-changes',type=int,default=20000);p.add_argument('-o',type=Path,required=True);a=p.parse_args()
 if not 1<=a.max_changes<=60000:raise ValueError('diagnostic change limit')
 rows=[]
 for case in json.loads(a.cases.read_text()):
  changes=case['changes'][:a.max_changes];indices=order(changes)
  rows.append(dict(case=case['name'],complete=len(changes)==len(case['changes']),input=counts(changes),traversal=counts([changes[i]for i in indices])))
 a.o.write_text(json.dumps(dict(scope='bounded diagnostic only',rows=rows),indent=2)+'\n')
if __name__=='__main__':main()
