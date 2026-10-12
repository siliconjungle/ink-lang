"""Ordinary universal proposals; no corpus body or measurement is read."""
from common import *
import sys,shutil
check_frozen();sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,entry,semantic_entry,canonical,identity
from ink_knowledge.law_templates import substitute_types,SEMANTICS
from producers.semantic_laws import value,arrow,var,bound,lam,op,law,term
A={'Named':'$A'};B={'Named':'$B'};S={'Named':'$S'}
a,b,s=value(A),value(B),value(S);boolean=value('Bool');la,lb=value({'List':A}),value({'List':B})
apply=lambda f,x:op(f['sort']['Arrow'][1],'apply',f,x)
reduce=lambda f,x,z:apply(apply(f,x),z)
fold=lambda name,xs,z,*callbacks:op(z['sort'],'call:'+name,xs,z,*callbacks)
choose=lambda p,x,y:op(x['sort'],'call:choose',p,x,y)
chain=lambda m,p,q:{'Trans':dict(middle=m,left=p,right=q)}
rows=[]
def add(name,family,roles,params,source,target,proof,dependencies={}):
 o=entry('definition',SEMANTICS,dict(type_parameters=roles,law=law(params,source,target,proof),dependencies=dependencies),dependencies.values())
 rows.append(dict(name=name,family=family,role='support lemma'if name.endswith('absorption')else'reusable endpoint',object=o));return identity(o)
for operation,absorber in [('||',True),('&&',False)]:
 xs=var(la,'xs');p=var(arrow(a,boolean),'p');z=var(boolean,'z');head,tail=var(a,'head'),var(la,'tail');constant=term(boolean,{'Bool':absorber})
 step=lam(a,lam(boolean,op(boolean,'binary:'+operation,bound(boolean,0),apply(p,bound(a,1)))))
 stop=lam(a,lam(boolean,bound(boolean,0)if absorber else choose(bound(boolean,0),term(boolean,{'Bool':False}),term(boolean,{'Bool':True}))))
 aux=add(('any'if absorber else'every')+'-absorption','absorbing-left-fold',['A'],dict(xs=la,p=p['sort']),fold('foldl',xs,constant,step),constant,{'Induction':dict(variable='xs',names=['head','tail'],base='Normalize',step='Normalize')})
 seed=op(boolean,'binary:'+operation,z,apply(p,head))
 use={'Use':dict(law='$absorb',arguments=dict(xs=tail,p=p),premises=[])}
 absorbing=chain(fold('foldl',tail,constant,step),'Normalize',chain(constant,use,'Normalize'))
 proceeding=chain(fold('foldl',tail,seed,step),'Normalize',chain(fold('fold_until',tail,seed,stop,step),{'GeneralizedHypothesis':dict(index=0,arguments={'z':seed})},'Normalize'))
 proof={'GeneralizedInduction':dict(variable='xs',generalize=['z'],names=['head','tail'],base='Normalize',step={'Cases':dict(condition=z,on_true=absorbing if absorber else proceeding,on_false=proceeding if absorber else absorbing)})}
 add('left-'+('any'if absorber else'every'),'absorbing-left-fold',['A'],dict(xs=la,z=boolean,p=p['sort']),fold('foldl',xs,z,step),fold('fold_until',xs,z,stop,step),proof,{'$absorb':aux})
xs,z=var(la,'xs'),var(s,'z');head,tail=var(a,'head'),var(la,'tail');f=var(arrow(a,b),'f');stop=var(arrow(b,arrow(s,boolean)),'stop');step=var(arrow(b,arrow(s,s)),'step');x,acc=bound(a,1),bound(s,0)
mapping=lambda seq:op(lb,'method:map',seq,f)
newstop=lam(a,lam(s,reduce(stop,apply(f,x),acc)));newstep=lam(a,lam(s,reduce(step,apply(f,x),acc)))
seed=reduce(step,apply(f,head),z);condition=reduce(stop,apply(f,head),z)
proceed=chain(fold('fold_until',mapping(tail),seed,stop,step),'Normalize',chain(fold('fold_until',tail,seed,newstop,newstep),{'GeneralizedHypothesis':dict(index=0,arguments={'z':seed})},'Normalize'))
proof={'GeneralizedInduction':dict(variable='xs',generalize=['z'],names=['head','tail'],base='Normalize',step={'Cases':dict(condition=condition,on_true='Normalize',on_false=proceed)})}
add('controlled-map','controlled-fold-fusion',['A','B','S'],dict(xs=la,z=s,f=f['sort'],stop=stop['sort'],step=step['sort']),fold('fold_until',mapping(xs),z,stop,step),fold('fold_until',xs,z,newstop,newstep),proof)
p=var(arrow(a,boolean),'p');stop=var(arrow(a,arrow(s,boolean)),'stop');step=var(arrow(a,arrow(s,s)),'step');filtering=lambda seq:op(la,'method:filter',seq,p)
newstop=lam(a,lam(s,op(boolean,'binary:&&',apply(p,x),reduce(stop,x,acc))));newstep=lam(a,lam(s,choose(apply(p,x),reduce(step,x,acc),acc)))
def proceed(seed):return chain(fold('fold_until',filtering(tail),seed,stop,step),'Normalize',chain(fold('fold_until',tail,seed,newstop,newstep),{'GeneralizedHypothesis':dict(index=0,arguments={'z':seed})},'Normalize'))
proof={'GeneralizedInduction':dict(variable='xs',generalize=['z'],names=['head','tail'],base='Normalize',step={'Cases':dict(condition=apply(p,head),on_false=proceed(z),on_true={'Cases':dict(condition=reduce(stop,head,z),on_true='Normalize',on_false=proceed(reduce(step,head,z)))})})}
add('controlled-filter','controlled-fold-fusion',['A','S'],dict(xs=la,z=s,p=p['sort'],stop=stop['sort'],step=step['sort']),fold('fold_until',filtering(xs),z,stop,step),fold('fold_until',xs,z,newstop,newstep),proof)
# Generic JSON remains data interpreted by the exact pinned instantiator.
growth=OUT/'growth';save(growth/'templates.json',rows)
objects={};attempts=[]
def instantiate(row,bindings):
 obj=row['object'];p=obj['payload'];candidate=substitute_types(p['law'],bindings);deps={k:instantiate(next(r for r in rows if identity(r['object'])==v),bindings)for k,v in p['dependencies'].items()}
 def references(v):
  if isinstance(v,dict):return {k:deps[x]if k=='law' and isinstance(x,str)and x in deps else references(x)for k,x in v.items()}
  if isinstance(v,list):return [references(x)for x in v]
  return v
 candidate=references(candidate);candidate['dependencies']=sorted(set(deps.values()));o=semantic_entry(candidate);i=identity(o);objects[i]=o;return i
carriers=['U32','F32','String',{'List':'U64'},{'Option':'U32'},{'Result':['String','Unit']}]
for row in rows:
 for idx in range(len(carriers)):
  params=row['object']['payload']['type_parameters'];bindings={n:carriers[(idx+j)%len(carriers)]for j,n in enumerate(params)};attempts.append(dict(name=row['name'],bindings=bindings,root=instantiate(row,bindings)))
context=growth/'empty.ink';context.parent.mkdir(parents=True,exist_ok=True);context.write_text('module context;fn zero()->u32{return 0;}\n')
assert not process([INK,'emit-core',context,'-o',growth/'core.json'],growth/'emit-process')['status']
st=Store.publish(growth/'admission-store',objects.values());view=growth/'view.json';view.write_bytes(canonical(st.bundle(sorted(objects))))
r=process([INK,'knowledge-check',growth/'core.json',view],growth/'check-process');save(growth/'admission.json',dict(instances=attempts,objects=len(objects),process=r))
if r['status']:raise SystemExit((growth/'check-process/stderr.txt').read_text())
# Retain canonical main plus cumulative additions. Disposable SQLite is omitted.
db=OUT/'database';db.mkdir(exist_ok=True);src=ROOT/'knowledge/store';dest=db/'store';dest.mkdir(exist_ok=True)
for folder in ['objects','trees','snapshots']:
 if not (dest/folder).exists():shutil.copytree(src/folder,dest/folder,copy_function=os.link)
for file in ['snapshot.json','names.json']:shutil.copy2(src/file,dest/file)
base=Store(db);names=read(dest/'names.json');checkpoints=[dict(label='current',snapshot=base.snapshot_id,added_families=0,added_templates=0,entries=len(base.members()),families=[])]
for family,label in [('absorbing-left-fold','absorption'),('controlled-fold-fusion','controlled')]:
 batch=[r for r in rows if r['family']==family];names.update({'growth/'+r['name']:identity(r['object'])for r in batch});t=time.perf_counter();base=base.extend([r['object']for r in batch],names);base.ensure_index();checkpoints.append(dict(label=label,snapshot=base.snapshot_id,added_families=len(checkpoints),added_templates=sum(len([r for r in rows if r['family']in ['absorbing-left-fold','controlled-fold-fusion'][:len(checkpoints)]] )for _ in [0]),entries=len(base.members()),families=['absorbing-left-fold','controlled-fold-fusion'][:len(checkpoints)],publication_index_seconds=time.perf_counter()-t))
full=base
for family in ['absorbing-left-fold','controlled-fold-fusion']:
 ids={identity(r['object'])for r in rows if r['family']==family};members=[full.object(i)for i in full.members()if i not in ids];abl=Store.publish(OUT/('ablation-'+family),members);abl.ensure_index();checkpoints.append(dict(label='without-'+family,snapshot=abl.snapshot_id,root=str(abl.root.relative_to(ROOT)),added_families=1,ablation=family,entries=len(abl.members())))
save(OUT/'checkpoints.json',checkpoints);check_frozen();print(json.dumps(checkpoints))
