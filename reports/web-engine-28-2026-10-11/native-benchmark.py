from pathlib import Path
import json,ctypes,subprocess,random,time,hashlib,statistics,sys,math
R=Path(__file__).resolve().parent;B=R.parents[1];R27=B/'reports/web-stack-proofs-27-2026-10-11';N=R/'native'
read=lambda p:json.loads(p.read_text());sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
spec=read(R/'spec.json');frames=read(R/'fixtures.json')['inputs'];old=read(R27/'native/metadata.json');libraries={v:N/f'{v}.dylib' for v in ['baseline','current-owned','current-into','rust-expert']}
class Result(ctypes.Structure):_fields_=[('data',ctypes.POINTER(ctypes.c_uint32)),('len',ctypes.c_size_t),('scalar',ctypes.c_uint64)]
validation=[]
for variant,path in libraries.items():
 lib=ctypes.CDLL(str(path));lib.bench_call.argtypes=[ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.c_uint32,ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32)];lib.bench_call.restype=Result
 for frame in frames:
  task=next(t for t in spec['tasks'] if t['name']==frame['case']);xs=(ctypes.c_uint32*max(1,len(frame['xs'])))(*frame['xs']);ys=(ctypes.c_uint32*max(1,len(frame['ys'])))(*frame['ys']);out=(ctypes.c_uint32*(len(frame['xs'])+len(frame['ys'])+2))()
  value=lib.bench_call(task['index'],xs,len(frame['xs']),ys,len(frame['ys']),frame['seed'],frame['factor'],out)
  actual=value.scalar if task['scalar'] else [value.data[i] for i in range(value.len)]
  assert actual==frame['expected'][task['name']],(variant,frame['id']);assert list(xs)[:len(frame['xs'])]==frame['xs'] and list(ys)[:len(frame['ys'])]==frame['ys'];lib.bench_reset();validation.append({'variant':variant,'frame':frame['id'],'passed':True})
(N/'validation28.json').write_text(json.dumps({'status':'passed','comparisons':len(validation),'rows':validation},indent=2)+'\n')
if '--validate-only' in sys.argv:print('native validation passed',len(validation));sys.exit(0)
result={'native_common_prewarm_calls':3,'trial_journal':'native/trials28.jsonl','status':'running','validation_comparisons':len(validation),'samples':[],'calibration':[],'boundaries':['resident','snapshot'],'protocol':'same batch27 separately compiled C driver; complete output consumption and scratch reset timed, reused caller destination; native target controls from batch27 exact binaries; full output checked before timings'}
rng=random.Random(20261128)
for frame in frames:
 if len(frame['xs']) not in [32,65536]:continue
 task=next(t for t in spec['tasks'] if t['name']==frame['case']);payload=Path(old['binaries'][frame['id']])
 def invoke(variant,mode,n):
  p=subprocess.run([str(N/'driver'),str(libraries[variant]),str(payload),str(task['index']),str(int(not task['scalar'])),str(n),str(int(mode=='snapshot')),str(len(task['list_inputs']))],capture_output=True,text=True);assert p.returncode==0,p.stderr;row=json.loads(p.stdout);assert row['iterations']==n and math.isfinite(row['seconds']) and row['seconds']>=0;
  with (N/'trials28.jsonl').open('a') as journal:journal.write(json.dumps(dict(frame=frame['id'],variant=variant,mode=mode,**row))+'\n')
  expected=frame['expected'][task['name']]
  label=str(expected) if task['scalar'] else f'array:{len(expected)}:{sum(expected)&0xffffffff}:{sum((i+1)*v for i,v in enumerate(expected))&0xffffffff}'
  assert row['single']==label,(variant,frame['id'],row['single'],label)
  return row
 for mode in ['resident','snapshot']:
  iterations={}
  for variant in libraries:
   n=1
   while True:
    row=invoke(variant,mode,n)
    if row['seconds']>=0.008 or n>=5000000:break
    n=min(5000000,n*2)
   iterations[variant]=n;result['calibration'].append(dict(frame=frame['id'],variant=variant,mode=mode,iterations=n,seconds=row['seconds']))
  for round in range(9):
   order=list(libraries);rng.shuffle(order)
   for variant in order:
    row=invoke(variant,mode,iterations[variant]);assert row['seconds']>0;result['samples'].append(dict(name=task['name'],frame=frame['id'],size=len(frame['xs']),variant=variant,boundary=mode,round=round,ns_per_call=row['seconds']*1e9/row['iterations'],**row))
  print(frame['id'],mode,flush=True)
result['status']='passed';result['bindings']={v:sha(p) for v,p in libraries.items()};result['driver_sha256']=sha(N/'driver');(N/'results28.json').write_text(json.dumps(result,indent=2)+'\n');print('native passed',len(result['samples']))
