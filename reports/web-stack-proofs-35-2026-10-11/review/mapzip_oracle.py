"""Finite independent corroboration, not a proof or emitted target check."""
from pathlib import Path
import itertools,json,random,hashlib
R=Path(__file__).resolve().parent
counts={};rng=random.Random(2026113507)
def check(xs,ys,bits,signed=False):
 mask=(1<<bits)-1
 def word(x):
  x=x&mask
  return x-(1<<bits) if signed and x>=(1<<(bits-1)) else x
 f=lambda x:word(x*3+5)
 r=lambda y:word((y//3 if y>=0 else -((-y)//3))+7)
 hs=[lambda a,b:word(a-3*b),lambda a,b:word(a+b*7)if a<b else word(a-b),lambda a,b:word(a^word(b*5))]
 for family in ['left','right','both']:
  fx=f if family!='right'else lambda x:x
  ry=r if family!='left'else lambda x:x
  a,b=list(map(fx,xs)),list(map(ry,ys))
  for h in hs:
   original=[h(x,y)for x,y in zip(a,b)]
   fused=[h(fx(xs[i]),ry(ys[i]))for i in range(min(len(xs),len(ys)))]
   assert original==fused and len(fused)==min(len(xs),len(ys))
   name=('i'if signed else'u')+str(bits)+'_'+family
   counts[name]=counts.get(name,0)+1
lists=[list(x)for n in range(3)for x in itertools.product(range(4),repeat=n)]
for xs,ys in itertools.product(lists,repeat=2):check(xs,ys,4)
for bits,signed in [(32,False),(32,True),(64,False)]:
 for _ in range(1200):
  def data():
   x=rng.getrandbits(bits)
   return x-(1<<bits)if signed and x>=(1<<(bits-1))else x
  xs=[data()for _ in range(rng.choice([0,1,2,7,32,97]))];ys=[data()for _ in range(rng.choice([0,1,2,7,32,128]))]
  check(xs,ys,bits,signed)
# Incorrect argument reversal and max-length result extent demonstrably disagree.
x,y=[1],[2,3];h=lambda a,b:a-3*b
assert [h(a,b)for a,b in zip(x,y)] != [h(b,a)for a,b in zip(x,y)]
assert len(list(zip(x,y))) != max(len(x),len(y))
out={'status':'passed','comparisons':sum(counts.values()),'by_type_and_family':counts,'negative_order_and_max_extent':'distinguished','scope':'Pure total finite models for U32/I32/U64-style wrapping operations and noncommutative h, eager original mapping versus min-prefix fusion. No kernel or target correspondence claim. No float instance tested.','script_sha256':hashlib.sha256(Path(__file__).read_bytes()).hexdigest()}
(R/'mapzip-oracle.json').write_text(json.dumps(out,indent=2)+'\n');print(json.dumps(out))
