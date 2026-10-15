"""Fresh-process authoring control with complete normalized output consumption."""
import hashlib,json,random,statistics,time,sys
from pathlib import Path
from cases import groups,legacy
from producers.point_delta import normal
cases=groups();functions={'before':legacy(),'cached':normal};rng=random.Random(7193);sink=0;rows=[]
fingerprint=lambda value:hashlib.sha256(json.dumps(value,separators=(',',':')).encode()).hexdigest()
before=fingerprint(cases);expected={}
for group,batch in cases.items():
 expected[group]=[[fingerprint(functions['before'](term,case['objects']))for term in case['terms']]for case in batch]
 for fn in functions.values():
  assert [[fingerprint(fn(term,case['objects']))for term in case['terms']]for case in batch]==expected[group]
 def invoke(fn):
  global sink
  for case in batch:
   for term in case['terms']:
    value=fn(term,case['objects']);sink^=int(fingerprint(value)[:16],16)
 samples={lane:[]for lane in functions};counts={}
 for lane,fn in functions.items():
  for _ in range(2):invoke(fn)
  n=1
  while True:
   start=time.perf_counter_ns()
   for _ in range(n):invoke(fn)
   if time.perf_counter_ns()-start>=3_000_000 or n>=32:break
   n*=2
  counts[lane]=n
 for _ in range(9):
  lanes=list(functions);rng.shuffle(lanes)
  for lane in lanes:
   n=counts[lane];start=time.perf_counter_ns()
   for _ in range(n):invoke(functions[lane])
   samples[lane].append((time.perf_counter_ns()-start)//n//sum(len(c['terms'])for c in batch))
 for lane in functions:rows.append(dict(group=group,lane=lane,samples_ns=samples[lane],calls_per_batch=sum(len(c['terms'])for c in batch),batches_per_sample=counts[lane]))
 for fn in functions.values():assert [[fingerprint(fn(term,case['objects']))for term in case['terms']]for case in batch]==expected[group]
assert fingerprint(cases)==before
print(json.dumps(dict(schema=1,python=sys.version,rows=rows,input_sha256=before,sink=sink,scope='Complete authoring normalizer calls and full output hashing; fresh cache per invocation; excludes import/setup and kernel replay time; shared host')))
