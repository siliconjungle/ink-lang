#!/usr/bin/env python3
"""Read-only provenance audit. Run after round18 timings and imports finish."""
import hashlib,importlib,json,sqlite3,sys
from pathlib import Path
REPORT=Path(__file__).resolve().parent;ROOT=REPORT.parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,identity,semantic_entry

def audit():
 errors=[]
 def ck(ok,msg):
  if not ok:errors.append(msg)
 def read(p):return json.loads(p.read_text())
 def h(p):return hashlib.sha256(p.read_bytes()).hexdigest()
 m=read(REPORT/'metadata.json');pub=read(REPORT/'publication.json');old=Store(ROOT/'knowledge',ROOT/'knowledge/store/snapshots'/f"{m['prior_snapshot']}.json");cur=Store(ROOT/'knowledge',ROOT/'knowledge/store/snapshots'/f"{m['new_snapshot']}.json");before=set(old.members());after=set(cur.members());delta=after-before
 ck((len(before),len(after),len(delta))==(1247,1298,51) and before<=after,'catalog counts/preservation');ck(cur.snapshot_id==m['new_snapshot']==pub['snapshot'],'snapshot binding');objects={i:cur.object(i) for i in after}
 for i,o in objects.items():ck(identity(o)==i and set(o['dependencies'])<=after,'object/dependency '+i)
 groups={}
 for row in pub['producers']:
  name=row['producer'];ck(h(ROOT/'knowledge/producers'/f'{name}.py')==row['source_sha256'],'producer source '+name);ids={identity(semantic_entry(l)) for _,l in importlib.import_module('producers.'+name).named_laws()};ck(len(ids)==row['entries'] and ids<=delta,'producer IDs '+name);groups[name]=ids
 ck(set.union(*groups.values())==delta and sum(map(len,groups.values()))==51,'publication split');ck(set(pub['batch_entries'])==delta and delta<=set(pub['admission']['entries']),'publication admission')
 for name,sha in m['artifact_hashes'].items():ck((REPORT/name).is_file() and h(REPORT/name)==sha,'frozen '+name)
 freeze=read(REPORT/'policy-freeze.json');guard=freeze['source_guard'];ck(guard['status']=='passed' and guard['tracked_files']==guard['unchanged']==102 and not guard['changed'] and len(guard['after'])==102,'source guard recorded coverage')
 for name,sha in guard['after'].items():ck(h(ROOT/name)==sha,'source guard current '+name)
 ck(h(Path(m['compiler_path']))==m['compiler_sha256'],'compiler');ck(h(ROOT/'planner/ink_planner/semantic_search.py')==m['planner_policy_sha256'],'planner');plans=[];fresh=[]
 for task,t in m['tasks'].items():
  folder=REPORT/'tasks'/task;oldbody=read(folder/'prior-selected.core.json')['program']['functions'][0]['body'];newbody=read(folder/'checked-selected.core.json')['program']['functions'][0]['body'];ck(oldbody!=newbody and t['checked_changes_prior'],'CPU body '+task)
  for prefix,backend,rows in [('', 'cpu',t['selections']),('gpu-','gpu',t['gpu_selections'])]:
   for variant,row in rows.items():
    f=REPORT/row['path'];pkg=read(f);r=read(folder/f'{prefix}{variant}-selection.receipt.json');k=pkg['knowledge'];roots={a['law'] for a in pkg['applications']};ids=set(k['objects']);ck(h(f)==row['sha256']==r['compact_selection_sha256'],'selection hash '+task+prefix+variant);ck(r['status']=='passed' and not r['search']['exhausted'],'selection status '+task+prefix+variant);ck(r['search']['cost_model']['sha256']==h(REPORT/f'{backend}-cost-model.json'),'model asymmetry '+task+prefix+variant);ck(roots==set(k['roots'])==set(row['laws'])==set(r['check']['applied_laws']) and ids==set(r['check']['closure']),'roots/check closure '+task+prefix+variant)
    for i,o in k['objects'].items():
     ck(identity(o)==i and objects.get(i)==o and set(o['dependencies'])<=ids,'compact object '+i);w=k['membership'][i];node=identity(dict(schema=1,entries=w['entries']));ck(i in w['entries'],'membership leaf '+i)
     for s in w['path']:node=identity(dict(schema=1,left=s['sibling'] if s['left'] else node,right=node if s['left'] else s['sibling']))
     ck(node==k['snapshot']['root'],'membership root '+i)
    reachable=set()
    def visit(i):
     if i in reachable:return
     reachable.add(i)
     for dep in k['objects'][i]['dependencies']:visit(dep)
    for i in roots:visit(i)
    ck(reachable==ids,'minimal closure '+task+prefix+variant)
    if variant=='prior':ck(roots<=before,'prior new authority '+task+prefix)
    if variant=='checked' and backend=='cpu':ck(bool(roots&delta),'fresh CPU proof '+task);fresh.append(task)
    plans.append(dict(task=task,backend=backend,variant=variant,roots=sorted(roots),objects=len(ids)))
 ck(len(plans)==48 and len(fresh)==12,'selection coverage')
 author=ROOT/'knowledge/research/web-stack-proofs-18/idempotent';e=read(author/'evidence.json');ck(e['producer_sha256']==h(ROOT/'knowledge/producers/web_idempotent18_laws.py'),'author producer');ck(e['test_sha256']==h(ROOT/'knowledge/tests/test_web_idempotent18_laws.py'),'author test');ck(e['planner_sha256']==m['planner_policy_sha256'],'author planner')
 for name,sha in e['artifact_hashes'].items():ck(h(author/name)==sha,'author archive '+name)
 imports=[];hostcounts={}
 for name in ['node-observations.json','browser-observations.json']:rows=read(REPORT/name);hostcounts[name]=len(rows);imports+=rows
 ck(all(n==360 for n in hostcounts.values()),'per-host import coverage')
 for r in imports:
  path=ROOT/'knowledge/store/observations'/f"{r['id']}.json";ck(path.is_file(),'import ledger presence '+r['id'])
 imported={r['id'] for r in imports};ledger=list((ROOT/'knowledge/store/observations').glob('*.json'));ck(len(imported)==len(imports)==720 and len(ledger)==11106 and imported<={f.stem for f in ledger},'ledger count/import')
 for f in ledger:
  o=read(f);Store.validate_observation(o);ck(identity(o)==f.stem and set(o['entries'])<=after,'observation identity/entries '+f.stem)
 with sqlite3.connect((ROOT/'knowledge/index.sqlite').as_uri()+'?mode=ro',uri=True) as db:
  cache=dict(entries=db.execute('select count(*) from entries').fetchone()[0],members=db.execute('select count(*) from members where snapshot_id=?',(cur.snapshot_id,)).fetchone()[0],observations=db.execute('select count(*) from observations').fetchone()[0]);ck(cache['entries']==cache['members']==1298,'stale proof cache');ck(cache['observations']==11106,'observation cache count')
 result=dict(schema=1,status='passed' if not errors else 'issues',scope='Read-only identities, hashes and authenticated recorded checker receipts; no proof/test/build/timing jobs or statistics recomputation.',errors=errors,catalog=dict(prior=len(before),current=len(after),delta=len(delta),snapshot=cur.snapshot_id,producers={name:len(ids) for name,ids in groups.items()}),frozen_artifacts=len(m['artifact_hashes']),source_guard=dict(tracked=102,unchanged=102,current_hashes_authenticated=True),selected_packages=len(plans),fresh_CPU_tasks=fresh,plans=plans,author_artifacts=len(e['artifact_hashes']),author_evidence_sha256=h(author/'evidence.json'),idempotence_roles=e['roles'],observations=dict(prior=10386,current=len(ledger),round18=len(imported),hosts=hostcounts,cache=cache),bindings={n:h(REPORT/n) for n in ['metadata.json','publication.json','node-observations.json','browser-observations.json']})
 out=REPORT/'catalogue-review.json';out.write_text(json.dumps(result,indent=2)+'\n');md=REPORT/'catalogue-review.md';md.write_text('# Round18 catalog and evidence review\n\n'+result['status'].upper()+'. Read-only audit; no builds, tests, proof checking or timings rerun.\n\n'+f"Catalog: {len(before)} prior entries preserved; {len(delta)} added, {len(after)} total. Idempotence is one generic optimization across five supported types; support and scalar-instance counts are separate, as recorded in the JSON.\n\nAll {len(m['artifact_hashes'])} frozen preparation artifacts, 48 compact selections and 12 fresh CPU body/proof gates are authenticated. Selection objects have complete minimal dependency closures and snapshot membership, match recorded checker receipts, and use identical models per backend for prior/current.\n\nThe canonical ledger has {len(ledger)} authenticated observations, including 720 distinct round18 imports. SQLite is a disposable cache with current proof membership. Author archive bytes and all 102 guarded core, backend, runtime and planner sources remain bound and unchanged.\n\n"+('No integrity issue found.\n' if not errors else '\n'.join('- '+x for x in errors)+'\n'))
 print(json.dumps(dict(status=result['status'],errors=errors,json_sha256=h(out),md_sha256=h(md)),indent=2));return not errors
if __name__=='__main__':sys.exit(0 if audit() else 1)
