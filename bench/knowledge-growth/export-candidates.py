"""Retain and freshly replay every automatic candidate, not just the winner."""
from common import *
import sys
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,identity
check_frozen();st=Store(OUT/'database');rows=[];unique={}
for lane in ['automatic','automatic-default']:
 for r in read(OUT/f'{lane}-compilation.json'):
  for c in r['receipt']['candidates']:
   key=(r['program'],c['candidate']);unique.setdefault(key,dict(program=r['program'],candidate=c['candidate'],plan=c['plan'],origins=[]))['origins'].append(dict(lane=lane,checkpoint=r['checkpoint'],capability=c.get('capability')))
for (program,i),r in unique.items():
 o=st.object(i);assert identity(o)==i;pkg=o['payload']['package'];assert identity(pkg)==r['plan'];d=OUT/'automatic-candidates'/program/i;d.mkdir(parents=True,exist_ok=True);packet=d/'plan.json';packet.write_bytes(canonical(pkg));(d/'canonical-entry.json').write_bytes(canonical(o));
 # Logical checks are separate from target capability; unsupported lowering
 # remains reported from each original candidate's capability receipt.
 result=process([INK,'check-plan',OUT/'baseline'/program/'core.json',packet,'--core'],d/'replay-process');r['replay']=result;rows.append(r);save(OUT/'candidate-replay.json',rows)
 if result['status']:raise SystemExit((d/'replay-process/stderr.txt').read_text())
print('freshly replayed',len(rows),'distinct automatic candidate plans')
