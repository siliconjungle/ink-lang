"""Exact archived primary fixtures plus an independently defined extension.

Primary bytes are never regenerated. Extension arrays refer to frozen primary
inputs, then are materialized in memory for the common runner/native protocol.
"""
import ast,copy,hashlib,json
from functools import lru_cache
from pathlib import Path
from spec import TASKS
HERE=Path(__file__).resolve().parent
MASK=2**32-1

@lru_cache(maxsize=128)
def parsed(text):return ast.parse(text,mode="eval").body

def expression(text,x,seed,k,a=0):
 def go(n):
  if isinstance(n,ast.Name):return dict(x=x,seed=seed,k=k,a=a)[n.id]
  if isinstance(n,ast.Constant):return n.value
  if isinstance(n,ast.Compare):
   v,w=go(n.left),go(n.comparators[0]);return v<w if isinstance(n.ops[0],ast.Lt) else v>w
  if isinstance(n,ast.Call):
   if n.func.id=='choose':return go(n.args[1]) if go(n.args[0]) else go(n.args[2])
   v,w,z=map(go,n.args);return z if w==0 else v//w
  v,w=go(n.left),go(n.right)
  return ({ast.Add:lambda:v+w,ast.Sub:lambda:v-w,ast.Mult:lambda:v*w}[type(n.op)]())&MASK
 return go(parsed(text))

def source_values(t,xs,seed,k):
 values=list(xs)
 for stage in {'filter':['filter'],'map_filter':['map','filter'],'filter_map':['filter','map']}[t['pipeline']]:
  values=[expression(t['mapper_expression'],x,seed,k) for x in values] if stage=='map' else [x for x in values if expression(t['predicate_expression'],x,seed,k)]
 return values

def literal(t,xs,seed,k):
 if t['extension']=='weight':return sum(expression(t['contribution'],x,seed,k) for x in xs)&MASK
 values=source_values(t,xs,seed,k);a=seed
 for x in reversed(values):a=expression(t['reducer_expression'],x,seed,k,a)
 return a

def oracle(t,xs,seed,k):
 if t['extension']=='weight':
  selected=(x for x in xs if not t['masked'] or (x>k if t['cohort']=='heldout' else x<seed))
  # Independent unbounded polynomial/absolute-distance contribution; modulus
  # applied only after accumulation/weighting, permitted by the word-ring laws.
  total=sum(x*x+seed if t['cohort']=='heldout' else abs(x-seed) for x in selected)
  return (total*(k-seed if t['combine']=='subtract' else k+seed))&MASK
 # Build the accepted sequence independently, preserving original stage order.
 values=[]
 for raw in xs:
  mapped=lambda x:abs(x-seed)&MASK if t['cohort']=='heldout' else (3*x+k)&MASK
  x=mapped(raw) if t['pipeline']=='map_filter' else raw
  accepted=x>k if t['cohort']=='heldout' else x<seed
  if not accepted:continue
  values.append(mapped(x) if t['pipeline']=='filter_map' else x)
 if t['cohort']=='discovery':
  # Closed composition of affine maps x+alpha(x)*acc, evaluated FORWARD.
  # This is independent of the literal reverse interpreter's recurrence.
  product=1;total=0;cutoff=seed//2
  for x in values:
   total=(total+product*x)&MASK
   product=product*(k if x<cutoff else -1)&MASK
  return (total+seed*product)&MASK
 # Piecewise accumulator-dependent reducer is not a polynomial closed form.
 # This explicit state-machine oracle retains right-fold order and checks each
 # conditional before the modular update; no F32 or reassociation is involved.
 state=seed
 for x in values[::-1]:state=(x-state if state<seed else x+state)&MASK
 return state

def observation(v):return str(v),int(v)
def make_fixtures(args=None):
 primary=json.loads((HERE/'round15-fixtures.json').read_text())
 if args is not None:
  for key in ['repeats','warmup','seconds','seed','sizes']:
   if hasattr(args,key) and getattr(args,key)!=primary['parameters'][key]:raise ValueError('fixed primary parameter '+key)
 result=copy.deepcopy(primary);base={x['id']:x for x in primary['inputs']};timed={primary['inputs'][c['input']]['id'] for c in primary['cells']};extension=[];profiles=[]
 for t in TASKS:
  if t['primary']:continue
  for donor in primary['inputs']:
   if donor['case']!=t['donor']:continue
   xs=donor['xs'];seed=donor['seed'];k=donor['factor'];label=donor['id'].split('/',1)[1]
   expected=oracle(t,xs,seed,k)
   if literal(t,xs,seed,k)!=expected:raise ValueError('literal/oracle mismatch '+t['name']+'/'+label)
   row=dict(id=t['name']+'/'+label,case=t['name'],xs=xs,ys=[],seed=seed,factor=k,expected={t['name']:expected},reused_input=donor['id'])
   index=len(result['inputs']);result['inputs'].append(row);extension.append({key:value for key,value in row.items() if key not in ['xs','ys']})
   if donor['id'] not in timed:continue
   result['cells'].append(dict(case=t['name'],input=index))
   if t['extension']=='ordered':
    values=source_values(t,xs,seed,k);state=seed;yes=no=0
    for x in reversed(values):
     condition=state<seed if t['cohort']=='heldout' else x<seed//2
     yes+=bool(condition);no+=not condition;state=expression(t['reducer_expression'],x,seed,k,state)
    accepted=len(values)
   else:
    accepted=sum((x>k if t['cohort']=='heldout' else x<seed) for x in xs) if t['masked'] else len(xs);yes=no=None
   profiles.append(dict(case=t['name'],input=row['id'],length=len(xs),seed=seed,factor=k,accepted_count=accepted,rejected_count=len(xs)-accepted,reducer_true=yes,reducer_false=no,reused_input=donor['id'],scope='Frozen extension instantiation, source-order predicate and right-fold reducer outcomes.'))
 result['cases']=[t['name'] for t in TASKS];result['profiles']=primary['profiles']+profiles
 result['scope']='Exact round15 primary18tasks/234fixtures plus12preset extension instances. CPU prior/current use the same frozen CPU model; separate GPU plans use one frozen GPU model. Complete captured calls, borrowed JS and native resident/snapshot boundaries remain separate. Pure total callbacks; timed U32 only; no general language superiority.'
 result['primary_fixture_sha256']=hashlib.sha256((HERE/'round15-fixtures.json').read_bytes()).hexdigest()
 result['primary_input_count']=len(primary['inputs']);result['extension_input_count']=len(extension)
 result['python_literal_checks']=primary['python_literal_checks']+sum(max(1,len(base[x['reused_input']]['xs'])) for x in extension)
 return result

def write_extension():
 combined=make_fixtures();rows=combined['inputs'][combined['primary_input_count']:]
 data=dict(schema=1,primary_fixture_sha256=combined['primary_fixture_sha256'],inputs=[{k:v for k,v in x.items() if k not in ['xs','ys']} for x in rows],profiles=combined['profiles'][len(json.loads((HERE/'round15-fixtures.json').read_text())['profiles']):],scope='Arrays are references to exact immutable primary IDs; scalar parameters and independent expected outputs frozen separately.')
 (HERE/'extension-fixtures.json').write_text(json.dumps(data,separators=(',',':'))+'\n')
 return dict(tasks=len(combined['cases']),inputs=len(combined['inputs']),cells=len(combined['cells']),primary_inputs=combined['primary_input_count'],extension_inputs=len(rows))
if __name__=='__main__':print(json.dumps(write_extension()))
