"""Independent full-pair and radix oracles for the source draft."""
import pathlib,subprocess,json,math,random,struct,hashlib,time
here=pathlib.Path(__file__).resolve().parent;root=here.parents[1];compiler=root/'build/cold-release-compiler/ink';source=here/'main.ink';output=root/'build/broadphase';output.mkdir(parents=True,exist_ok=True)
def decode(x):return struct.unpack('<f',struct.pack('<I',x['F32Bits']))[0] if isinstance(x,dict) else struct.unpack('<f',struct.pack('<f',x))[0]
def box(a,b,c,d):return dict(min_x=a,min_y=b,max_x=c,max_y=d)
def oracle(boxes):
 bs=[{k:decode(v)for k,v in b.items()}for b in boxes]
 def valid(b):return all(map(math.isfinite,b.values())) and b['min_x']<=b['max_x'] and b['min_y']<=b['max_y']
 def overlaps(a,b):return a['min_x']<=b['max_x'] and a['max_x']>=b['min_x'] and a['min_y']<=b['max_y'] and a['max_y']>=b['min_y']
 return [dict(a=i,b=j)for i,a in enumerate(bs)for j,b in enumerate(bs)if j>i and valid(a)and valid(b)and overlaps(a,b)]
cases=[[],[box(0,0,1,1)],[box(0,0,1,1),box(1,1,2,2)], [box(-2,-2,-1,-1),box(-1,-1,0,0),box(0,0,1,1)], [box(-0.0,-0.0,0.0,0.0),box(0.0,0.0,-0.0,-0.0)], [box(1,0,0,1),box(0,0,1,1)], [box(0,0,1,1)]*12]
for bits in [0x7fc00001,0xffc12345,0x7f800000,0xff800000,0x80000000,1,0x80000001,0x7f7fffff,0xff7fffff]:
 cases.append([box(0,0,1,1),box({'F32Bits':bits},0,1,1)])
rng=random.Random(8931)
for n in [2,3,4,7,16,31,32]:
 xs=[]
 for i in range(n):
  x=rng.randrange(-10,10)/2;y=rng.randrange(-10,10)/2;xs.append(box(x,y,x+rng.randrange(0,6)/2,y+rng.randrange(0,6)/2))
 cases.append(xs)
results=[]
def run(name,args,expected,label):
 path=output/'reference-args.json';path.write_text(json.dumps(args));start=time.monotonic()
 p=subprocess.run([compiler,'run',source,name,path],text=True,capture_output=True,check=True);actual=json.loads(p.stdout);assert actual==expected,(label,name,actual,expected)
 results.append(dict(label=label,function=name,arguments=args,result=actual,seconds=time.monotonic()-start))
for i,boxes in enumerate(cases):
 for name in ['all_pairs','sweep','bvh']:run(name,[boxes],oracle(boxes),f'boxes-{i}')
for i,(keys,order)in enumerate([([],[]),([0,0xffffffff,0x80000000,255,256,0,0x7fffffff],[0,1,2,3,4,5,6]),([3,1,3,2],[3,2,1,0,2]),([9,2],[2,1,0,9])]):
 run('radix',[keys,order],sorted(order,key=lambda j:keys[j]if j<len(keys)else 0),f'radix-{i}')
report=dict(status='passed',scope='Independent reference evaluator only; no compiled backend or speed claim',calls=len(results),source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),source_hashes={str(p.relative_to(root)):hashlib.sha256(p.read_bytes()).hexdigest()for p in [source,root/'knowledge/libraries/broadphase.ink',here/'check-reference.py']},compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),cases=results)
(output/'reference-results.json').write_text(json.dumps(report,indent=2)+'\n');print('Passed',len(results),'independent reference checks.')
