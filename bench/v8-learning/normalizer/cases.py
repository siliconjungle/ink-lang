"""Exact normalizer inputs: shared helper DAGs and captured contract obligations."""
import gzip,json
from pathlib import Path
from ink_knowledge import entry,identity
from producers import point_delta as p
ROOT=Path(__file__).resolve().parent
MATH='first-order-inductive-equality-v1'

def legacy():
 namespace=dict(vars(p))
 exec(compile((ROOT/'frozen-normal.py').read_text(),str(ROOT/'frozen-normal.py'),'exec'),namespace)
 return namespace['normal']

def dag(depth,seed):
 objects={};previous=None
 for i in range(depth+1):
  body=p.var('x')if previous is None else p.binary('+',p.call(previous,[p.var('x')]),p.call(previous,[p.var('x')]))
  declaration=dict(params=[['x','U64']],result='U64',recursive=None,body=body)
  dependencies=[] if previous is None else [previous,*objects[previous]['dependencies']]
  obj=entry('definition',MATH,dict(declaration={'Function':declaration}),dependencies,parameters={'x':'U64'},result='U64')
  previous=identity(obj);objects[previous]=obj
 return dict(objects=objects,terms=[p.call(previous,[{'U64':seed}])],expected=[{'U64':(seed*(1<<depth))&((1<<64)-1)}])

def groups():
 out={}
 for split,depths,seeds in [('training',[6,8,10],[1,3,5]),('holdout',[7,9,11],[7,11,13])]:
  out['dag-'+split]=[dag(d,s)for d,s in zip(depths,seeds)]
 for name in ['contract','state']:
  data=json.loads(gzip.decompress((ROOT/(name+'.json.gz')).read_bytes()))
  out['captured-'+name]=[data]
 return out
