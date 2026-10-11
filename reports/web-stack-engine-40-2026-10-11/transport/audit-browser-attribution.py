"""Audit fixed attribution matrix/bindings and independently reconstruct transfer contracts."""
from pathlib import Path
import json,hashlib,math
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def width(t):return width(t['element'])if t['kind']=='list'else t['size']*width(t['element'])if t['kind']=='vector'else 2 if t['kind']=='u64'else 1
def physical(f,args,expected):
 counts=[len(v)if p['type']['kind']=='list'else 1 for v,p in zip(args,f['params'])]
 sizes=[4*(n*width(p['type'])+int(p['type']['kind']=='list'))for n,p in zip(counts,f['params'])];upload=sum(sizes)
 if f['graph_required']:
  caps=[]
  for node in f['graph']['nodes']:
   refs=node['capacity']['args'];values=[counts[node['args'][i]['param']]if 'param'in node['args'][i]else caps[node['args'][i]['node']]for i in refs];kind=node['capacity']['kind'];caps.append(values[0]if kind=='same'else min(values)if kind=='min'else max(values)if kind=='max'else sum(values)if kind=='sum'else 1)
  result=f['result'];payload=4*(len(expected)*width(result['element'])if result['kind']=='list'else width(result));read=payload+4*int(result['kind']=='list');live=sum(max(4,s)for s in sizes)+sum(max(4,4*(cap*width(node['result'])+int(node['result']['kind']=='list')))for cap,node in zip(caps,f['graph']['nodes']))+max(4*int(result['kind']=='list'),payload)
  return dict(upload_bytes=upload,readback_bytes=read,dispatches=len(caps),live_buffer_bytes=live)
 n=max(counts[i]for i in f['lengths']);out=4*(1+n*width(f['result']));return dict(upload_bytes=upload+4*(len(args)+1),readback_bytes=out,dispatches=int(n>0),live_buffer_bytes=sum(max(4,s)for s in sizes)+3*max(4,out)+4*(len(args)+1))
def consumption(v,t):
 words=[]
 def walk(v,t):
  if t['kind']in ['list','vector']:
   for x in v:walk(x,t['element'])
  else:words.append(int(v)&0xffffffff)
 walk(v,t);return dict(consumed_words=len(words),checksum=(len(words)+sum((i+1)*x for i,x in enumerate(words)))%2**32)
def audit(timed=False):
 protocol=R/'browser-attribution/protocol.json';controls=R/'browser-attribution-controls.json';p=json.loads(protocol.read_text());c=json.loads(controls.read_text());bound={**p['bindings'],**c['bindings']}
 for name,h in bound.items():assert sha(B/name)==h,name
 result=R/('attribution-results.json'if timed else'attribution-validation.json');j=json.loads(result.read_text());assert j['status']=='passed'and j['protocol_sha256']==sha(protocol)and j['controls_sha256']==sha(controls)and j['host_sha256']==p['hosts']
 frames={f['id']:f for f in p['frames']};seen=set();gpu=0
 expected={(f['id'],v,r,k)for f in p['frames']for v in ['original','candidate']for r in p['routes']for k in (range(p['rounds'])if timed else[None])}
 def check(row):
  nonlocal gpu
  key=(row['frame'],row['version'],row['requested'],row['round']);assert key not in seen;seen.add(key);frame=frames[row['frame']];folder=R/p['layouts'][frame['layout']][row['version']]['folder'];m=json.loads((folder/'manifest.json').read_text());f=next(x for x in m['functions']if x['name']==frame['name']);assert row['backend']==('javascript'if row['requested']=='auto'else row['requested']);assert row['complete_output'];assert row['consumption']==consumption(frame['expected'],f['result'])
  if row['backend']=='gpu':
   gpu+=1
   for k,v in physical(f,frame['args'],frame['expected']).items():assert row['counters'][k]==v,(key,k)
  if timed:
   assert all(math.isfinite(row[k])and row[k]>=0 for k in ['submission_ms','return_ms','consumer_ms','total_ms']);assert row['submission_ms']<=row['return_ms']<=row['total_ms'];assert abs(row['return_ms']+row['consumer_ms']-row['total_ms'])<1e-7
   for i,s in enumerate(row['spans']):assert s['id']==i and(s['parent']is None or 0<=s['parent']<i)and s['end']>=s['start']and abs(s['end']-s['start']-s['elapsed_ms'])<1e-7
 for row in j['rows']:check(row)
 assert seen==expected
 if timed:
  seen=set()
  for row in j['warmups']:check(row)
  assert seen=={(f['id'],v,r,None)for f in p['frames']for v in ['original','candidate']for r in p['routes']}
 else:assert j['warmups']==[]and j['timing_samples']==0 and j['input_capture_mutation']
 assert gpu==j['actual_gpu_calls']and j['complete_owned_output']and j['all_words_consumed']and j['owned_lifetime_after_next_call_and_close']
 receipt=dict(status='passed',instrumented=timed,rows=len(j['rows']),warmups=len(j['warmups']),actual_gpu_calls=gpu,bound_files=len(bound),bindings={x.relative_to(B).as_posix():sha(x)for x in [protocol,controls,result,Path(__file__)]},limits=p['limits']+['The saved receipt contains complete-value verdicts, not raw output arrays; bound runner performs full equality before saving.'])
 (R/('attribution-audit.json'if timed else'attribution-validation-audit.json')).write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':
 import sys;audit('--timed'in sys.argv)
