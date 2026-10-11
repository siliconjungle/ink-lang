"""Complete checked publication after disposable-index disk exhaustion."""
import hashlib,importlib,json,sqlite3,subprocess,sys
from pathlib import Path
R=Path(__file__).resolve().parent;ROOT=R.parents[1];sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store,canonical,identity,semantic_entry
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
compiler=ROOT.parent/'toolchain/ink-sequence-proofs';st=Store(ROOT/'knowledge');previous='3887fdf983708c93b660e5665120e540c0ea775bbfae7d2e62ddf188b523cc11';prior=Store(st.root,st.data/'snapshots'/f'{previous}.json');batch=[];provenance=[]
for name in ['cpu_sharing17_old_publication','cpu_sharing17_new_publication']:
 module=importlib.import_module('producers.'+name);rows=module.named_laws();batch.extend(identity(semantic_entry(v)) for _,v in rows);provenance.append(dict(producer=name,source_sha256=sha(Path(module.__file__)),entries=len(rows)))
assert len(batch)==len(set(batch))==19 and set(st.members())-set(prior.members())==set(batch)
source=R/'sharing-admission.ink';source.write_text('module Admission17;\npub fn identity(x:u32)->u32{return x;}\n');core=R/'sharing-admission.core.json';subprocess.run([str(compiler),'emit-core',str(source),'-o',str(core)],check=True,capture_output=True)
view=R/'sharing-admission.view.json';view.write_bytes(canonical(st.bundle(sorted(batch)))+b'\n');checked=subprocess.run([str(compiler),'knowledge-check',str(core),str(view)],check=True,capture_output=True,text=True);admission=json.loads(checked.stdout);assert set(admission['entries'])==set(json.loads(view.read_text())['objects'])
# Incrementally update the disposable discovery cache from checked canonical
# objects; this avoids a full second index on the nearly full filesystem.
# Prior indexed snapshot/observations remain available and canonical unchanged.
with sqlite3.connect(st.root/'index.sqlite') as db, db:
 db.execute('PRAGMA foreign_keys=ON')
 db.execute('INSERT INTO snapshots VALUES(?,?)',(st.snapshot_id,st.snapshot['root']))
 for i in batch:
  obj=st.object(i);iface=obj['interface'];encode=lambda x:canonical(x).decode()
  db.execute('INSERT INTO entries VALUES(?,?,?,?,?,?)',(i,obj['kind'],obj['semantics'],encode(iface['result']),encode(iface['parameters']),encode(iface['conditions'])))
  db.execute('INSERT INTO types VALUES(?,?,?,?)',(i,'result','',encode(iface['result'])))
  db.executemany('INSERT INTO types VALUES(?,?,?,?)',[(i,'parameter',n,encode(t)) for n,t in iface['parameters'].items()])
  db.executemany('INSERT INTO applicability VALUES(?,?,?)',[(i,n,encode(c)) for n,c in enumerate(iface['conditions'])])
  db.executemany('INSERT INTO operations VALUES(?,?)',[(i,x) for x in iface['operations']])
  db.executemany('INSERT INTO effects VALUES(?,?)',[(i,x) for x in iface['effects']])
  db.executemany('INSERT INTO dependencies VALUES(?,?)',[(i,d) for d in obj['dependencies']])
 for i,witness in st.members().items():db.execute('INSERT INTO members VALUES(?,?,?)',(st.snapshot_id,i,canonical(witness).decode()))
 for name,i in json.loads((st.data/'names.json').read_text()).items():db.execute('INSERT OR IGNORE INTO names VALUES(?,?)',(name,i))
 assert db.execute('PRAGMA integrity_check').fetchone()==('ok',)
 assert db.execute('PRAGMA foreign_key_check').fetchall()==[]
 assert db.execute('SELECT count(*) FROM entries').fetchone()[0]==1247
 assert db.execute('SELECT count(*) FROM observations').fetchone()[0]==9666
 assert db.execute('SELECT count(*) FROM members WHERE snapshot_id=?',(st.snapshot_id,)).fetchone()[0]==1247
result=dict(schema=1,status='checked',previous_snapshot=previous,snapshot=st.snapshot_id,previous_entries=1228,entries=1247,added_entries=19,batch_entries=sorted(batch),producers=provenance,compiler_sha256=sha(compiler),admission=admission,previous_snapshot_preserved=set(prior.members())<set(st.members()),scope='19checked sharing/old-only certificates. Previous failed operation had already published admitted immutable objects and pointer but failed disposable SQLite rebuild; complete dependency closure rechecked locally. Existing disposable index incrementally updated from all19checked canonical new objects and current1247membership, transactionally integrity/foreign-key/count checked; prior indexed snapshot and9666observations retained. Canonical observations and historical snapshots preserved; Store source unchanged.',recovery_log='sharing-publication.log')
(R/'sharing-publication.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(dict(status='checked',entries=1247,snapshot=st.snapshot_id)))
