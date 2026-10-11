from contextlib import closing, nullcontext
import hashlib
import json
import os
import sqlite3
import tempfile
from pathlib import Path

SNAPSHOT = 'ink-knowledge-snapshot-v1'
KINDS = {'definition', 'theorem', 'rewrite', 'implementation', 'representation', 'maintenance', 'bridge'}

def canonical(value):
    def check(v,depth=0):
        if depth>128:raise ValueError("canonical object nesting limit")
        if isinstance(v, float): raise ValueError('canonical knowledge uses integer numbers; observations use decimal strings')
        if isinstance(v, int) and not -(1 << 63) <= v < (1 << 64): raise ValueError('integer outside canonical range')
        if isinstance(v, dict):
            if any(not isinstance(k, str) for k in v): raise ValueError('non-string object key')
            for x in v.values(): check(x,depth+1)
        elif isinstance(v, list):
            for x in v: check(x,depth+1)
    check(value)
    return json.dumps(value, sort_keys=True, separators=(',', ':'), ensure_ascii=False, allow_nan=False).encode()

def identity(value): return hashlib.sha256(canonical(value)).hexdigest()
def hash_id(value):
    if not isinstance(value, str) or len(value) != 64 or any(x not in '0123456789abcdef' for x in value): raise ValueError('invalid content identity')
    return value

def fields(v, names):
    if not isinstance(v, dict) or set(v) != set(names): raise ValueError('invalid object fields')

def operations(term):
    result = set()
    def walk(t):
        if isinstance(t, dict):
            node = t.get('node', {})
            if isinstance(node, dict) and 'Op' in node: result.add(node['Op'][0])
            for key,prefix in [('Binary','binary:'),('Call','call:'),('Method','method:')]:
                v=t.get(key)
                if isinstance(v,list) and v: result.add(prefix+str(v[1] if key=='Method' else v[0]))
                elif isinstance(v,dict) and key=='Binary' and 'op' in v: result.add(prefix+v['op'])
                elif isinstance(v,dict) and key=='Call' and 'function' in v: result.add(prefix+v['function'])
            for x in t.values(): walk(x)
        elif isinstance(t, list):
            for x in t: walk(x)
    walk(term)
    return sorted(result)

def entry(kind, semantics, payload, dependencies=(), *, parameters=None, result=None, effects=(), conditions=()):
    if kind not in KINDS: raise ValueError('unknown entry kind')
    value = dict(schema=1, kind=kind, semantics=semantics, dependencies=sorted(set(dependencies)),
                 interface=dict(parameters=parameters or {}, result=result, operations=operations(payload),
                                effects=sorted(set(effects)), conditions=list(conditions)), payload=payload)
    validate_entry(value)
    return value

def semantic_entry(law):
    payload = {k: v for k, v in law.items() if k not in ('schema', 'semantics', 'dependencies')}
    return entry('rewrite', law['semantics'], payload, law['dependencies'], parameters=law['params'],
                 result=law['from']['sort'], conditions=law['conditions'])

def validate_entry(v):
    fields(v, ('schema','kind','semantics','dependencies','interface','payload'))
    if type(v['schema']) is not int or v['schema'] != 1 or v['kind'] not in KINDS or not isinstance(v['semantics'],str) or not v['semantics']: raise ValueError('unsupported entry')
    fields(v['interface'], ('parameters','result','operations','effects','conditions'))
    if not isinstance(v['payload'],dict) or not isinstance(v['interface']['parameters'],dict) or not isinstance(v['interface']['conditions'],list): raise ValueError('invalid entry interface')
    for key in ['operations','effects']:
        a=v['interface'][key]
        if not isinstance(a,list) or any(not isinstance(x,str) for x in a) or a != sorted(set(a)): raise ValueError('invalid interface index')
    if not isinstance(v['dependencies'],list) or len(v['dependencies'])>128 or v['dependencies'] != sorted(set(v['dependencies'])): raise ValueError('dependencies must be unique and sorted')
    for i in v['dependencies']: hash_id(i)
    canonical(v)

def immutable(path, value):
    data=canonical(value)+b'\n';path.parent.mkdir(parents=True,exist_ok=True)
    if path.exists():
        if path.read_bytes() != data: raise ValueError('immutable object collision')
    else:
        with path.open('xb') as f: f.write(data)

def read(path):
    with path.open('rb') as f: raw=f.read(16_000_001)
    if len(raw)>16_000_000: raise ValueError('knowledge object byte limit')
    value=json.loads(raw)
    canonical(value)
    return value

class Store:
    def __init__(self, root, snapshot=None):
        self.root=Path(root).resolve(); self.data=self.root/'store'
        self.snapshot=read(Path(snapshot)) if snapshot else read(self.data/'snapshot.json')
        fields(self.snapshot, ('schema','semantics','root'))
        if self.snapshot['schema'] != 1 or self.snapshot['semantics'] != SNAPSHOT: raise ValueError('unsupported snapshot')
        hash_id(self.snapshot['root']);self.snapshot_id=identity(self.snapshot)
        self._members=None
        self._explicit_snapshot=snapshot is not None
    @classmethod
    def publish(cls, root, objects, names=None):
        root=Path(root);data=root/'store';ids=[]
        for obj in objects:
            validate_entry(obj);i=identity(obj);immutable(data/'objects'/f'{i}.json',obj);ids.append(i)
        ids=sorted(set(ids)); known=set(ids)
        for i in ids:
            if not set(read(data/'objects'/f'{i}.json')['dependencies']) <= known: raise ValueError('dependency absent from snapshot')
        nodes=[]
        for at in range(0,max(1,len(ids)),64):
            node=dict(schema=1,entries=ids[at:at+64]);i=identity(node);immutable(data/'trees'/f'{i}.json',node);nodes.append(i)
        while len(nodes)>1:
            next_nodes=[]
            for at in range(0,len(nodes),2):
                node=dict(schema=1,left=nodes[at],right=nodes[min(at+1,len(nodes)-1)]);i=identity(node);immutable(data/'trees'/f'{i}.json',node);next_nodes.append(i)
            nodes=next_nodes
        snapshot=dict(schema=1,semantics=SNAPSHOT,root=nodes[0]);sid=identity(snapshot)
        immutable(data/'snapshots'/f'{sid}.json',snapshot)
        for name,value in [('names.json',names or {}),('snapshot.json',snapshot)]:
            fd,tmp=tempfile.mkstemp(prefix='.ink-pointer-',dir=data)
            try:
                with os.fdopen(fd,'wb') as f:f.write(canonical(value)+b'\n')
                os.replace(tmp,data/name)
            finally:
                if Path(tmp).exists():Path(tmp).unlink()
        return cls(root)
    def members(self):
        if self._members is not None:return self._members
        members={};active=set()
        def walk(i,path,depth):
            if depth>64 or i in active:raise ValueError('invalid snapshot tree')
            active.add(i);node=read(self.data/'trees'/f'{hash_id(i)}.json')
            if identity(node)!=i or node['schema']!=1:raise ValueError('tree content mismatch')
            if 'entries' in node:
                fields(node,('schema','entries'));entries=node['entries']
                if len(entries)>64 or entries!=sorted(set(entries)):raise ValueError('invalid snapshot leaf')
                for item in entries:
                    hash_id(item)
                    if item in members:raise ValueError('duplicate snapshot member')
                    members[item]=dict(entries=entries,path=list(reversed(path)))
            else:
                fields(node,('schema','left','right'))
                walk(node['left'],path+[dict(sibling=node['right'],left=False)],depth+1)
                if node['right']!=node['left']:walk(node['right'],path+[dict(sibling=node['left'],left=True)],depth+1)
            active.remove(i)
        walk(self.snapshot['root'],[],0);self._members=members;return members
    def witness(self,i):
        hash_id(i)
        index=self.root/'index.sqlite'
        if self._members is not None or not index.exists():
            if i not in self.members():raise ValueError('entry absent from pinned snapshot')
            return self.members()[i]
        with closing(sqlite3.connect(index.as_uri()+'?mode=ro',uri=True)) as db:
            if self._explicit_snapshot and not db.execute('SELECT 1 FROM snapshots WHERE id=?',(self.snapshot_id,)).fetchone():
                if i not in self.members():raise ValueError('entry absent from pinned snapshot')
                return self.members()[i]
            return self._indexed_witness(i,db)
    def _indexed_witness(self,i,db,verified=None):
        row=db.execute('SELECT witness FROM members WHERE snapshot_id=? AND entry_id=?',(self.snapshot_id,i)).fetchone()
        if row is None:raise ValueError('entry absent from indexed snapshot; rebuild index')
        w=json.loads(row[0])
        # Only identical proof bytes may share authentication within one export.
        # Every requested ID must still occur in that authenticated leaf.
        if verified is not None and row[0] in verified:
            if i not in w['entries']:raise ValueError('invalid indexed membership proof')
            return w
        fields(w,('entries','path'))
        if len(w['entries'])>64 or w['entries']!=sorted(set(w['entries'])) or i not in w['entries'] or len(w['path'])>64:raise ValueError('invalid indexed membership proof')
        for x in w['entries']:hash_id(x)
        node=identity(dict(schema=1,entries=w['entries']))
        for step in w['path']:
            fields(step,('sibling','left'));hash_id(step['sibling'])
            if not isinstance(step['left'],bool):raise ValueError('invalid membership direction')
            node=identity(dict(schema=1,left=step['sibling'] if step['left'] else node,right=node if step['left'] else step['sibling']))
        if node!=self.snapshot['root']:raise ValueError('indexed membership does not match pinned snapshot')
        if verified is not None:verified.add(row[0])
        return w
    def object(self, i):
        hash_id(i)
        self.witness(i)
        return self._read_object(i)
    def _read_object(self,i):
        obj=read(self.data/'objects'/f'{i}.json');validate_entry(obj)
        if identity(obj)!=i:raise ValueError('entry content mismatch')
        return obj
    def bundle(self, roots):
        roots=sorted(set(roots));objects={};active=set();membership={};verified=set()
        index=self.root/'index.sqlite'
        indexed=bool(roots) and self._members is None and index.exists()
        with closing(sqlite3.connect(index.as_uri()+'?mode=ro',uri=True)) if indexed else nullcontext(None) as db:
            # Keep one SQLite read snapshot even if another process rebuilds or
            # writes the disposable index during traversal.
            if db is not None:db.execute('BEGIN')
            proof_db=db
            if db is not None and self._explicit_snapshot and not db.execute('SELECT 1 FROM snapshots WHERE id=?',(self.snapshot_id,)).fetchone():
                self.members();proof_db=None
            def visit(i,depth):
                if i in objects:return
                if depth>64 or i in active or len(objects)+len(active)>=1024:raise ValueError('active dependency closure limit')
                hash_id(i);active.add(i)
                membership[i]=self._indexed_witness(i,proof_db,verified) if proof_db is not None else self.witness(i)
                obj=self._read_object(i)
                for d in obj['dependencies']:visit(d,depth+1)
                active.remove(i);objects[i]=obj
            for i in roots:visit(i,0)
        return dict(schema=1,snapshot=self.snapshot,roots=roots,objects=dict(sorted(objects.items())),
                    membership={i:membership[i] for i in sorted(objects)})
    def rebuild(self):
        target=self.root/'index.sqlite'; fd,tmp=tempfile.mkstemp(prefix='.ink-index-',dir=self.root);os.close(fd)
        try:
            with closing(sqlite3.connect(tmp)) as db, db:
                db.executescript(Path(__file__).with_name("index.sql").read_text())

                db.execute('INSERT INTO snapshots VALUES(?,?)',(self.snapshot_id,self.snapshot['root']))
                objects=self.members()
                for i in objects:
                    obj=self.object(i)
                    iface=obj['interface'];encode=lambda x:canonical(x).decode()
                    db.execute('INSERT INTO entries VALUES(?,?,?,?,?,?)',(i,obj['kind'],obj['semantics'],encode(iface['result']),encode(iface['parameters']),encode(iface['conditions'])))
                    db.execute('INSERT INTO members VALUES(?,?,?)',(self.snapshot_id,i,encode(self.members()[i])))
                    db.execute('INSERT INTO types VALUES(?,?,?,?)',(i,'result','',encode(iface['result'])))
                    db.executemany('INSERT INTO types VALUES(?,?,?,?)',[(i,'parameter',n,encode(t)) for n,t in iface['parameters'].items()])
                    db.executemany('INSERT INTO applicability VALUES(?,?,?)',[(i,n,encode(c)) for n,c in enumerate(iface['conditions'])])
                    db.executemany('INSERT INTO operations VALUES(?,?)',[(i,x) for x in iface['operations']]);db.executemany('INSERT INTO effects VALUES(?,?)',[(i,x) for x in iface['effects']])
                    db.executemany('INSERT INTO dependencies VALUES(?,?)',[(i,d) for d in obj['dependencies']])
                for name,i in read(self.data/'names.json').items():
                    if i in objects:db.execute('INSERT INTO names VALUES(?,?)',(name,i))
                for p in sorted((self.data/'observations').glob('*.json')):
                    obj=read(p);self.validate_observation(obj)
                    if identity(obj)!=p.stem:raise ValueError('observation content mismatch')
                    db.execute('INSERT INTO observations VALUES(?,?,?,?,?,?)',(p.stem,obj['program'],obj['plan'],canonical(obj['target']).decode(),canonical(obj['workload']).decode(),canonical(obj['metrics']).decode()))
            os.replace(tmp,target)
        finally:
            if Path(tmp).exists():Path(tmp).unlink()
        return len(objects)
    def _canonical_query(self,kind,semantics,operation,result,effect,parameter_type,condition,after,limit):
        # Explicit immutable pins can coexist with the active disposable index.
        # Authenticate the pinned tree and each candidate object; no index write
        # or switch to a newer snapshot is needed for historical discovery.
        if after is not None:hash_id(after)
        result_key=None if result is None else canonical(result)
        parameter_key=None if parameter_type is None else canonical(parameter_type)
        condition_key=None if condition is None else canonical(condition)
        found=[]
        if limit==0:return found
        for ident in sorted(self.members()):
            if after is not None and ident<=after:continue
            obj=self.object(ident);iface=obj['interface']
            if kind is not None and obj['kind']!=kind:continue
            if semantics is not None and obj['semantics']!=semantics:continue
            if operation is not None and operation not in iface['operations']:continue
            if result_key is not None and canonical(iface['result'])!=result_key:continue
            if effect is not None and effect not in iface['effects']:continue
            if parameter_key is not None and not any(canonical(v)==parameter_key for v in iface['parameters'].values()):continue
            if condition_key is not None and not any(canonical(v)==condition_key for v in iface['conditions']):continue
            found.append(ident)
            if len(found)==limit:break
        return found

    def query(self, *, kind=None, semantics=None, operation=None, result=None, effect=None, parameter_type=None, condition=None, after=None, limit=1024):
        if not isinstance(limit,int) or not 0<=limit<=1024:raise ValueError('query limit')
        index=self.root/'index.sqlite'
        constraints=(kind,semantics,operation,result,effect,parameter_type,condition,after,limit)
        if not index.exists():
            if self._explicit_snapshot:return self._canonical_query(*constraints)
            self.rebuild()
        with closing(sqlite3.connect(index.as_uri()+'?mode=ro',uri=True)) as db:
            if not db.execute('SELECT 1 FROM snapshots WHERE id=?',(self.snapshot_id,)).fetchone():
                if self._explicit_snapshot:return self._canonical_query(*constraints)
                raise ValueError('index belongs to another snapshot; rebuild it')
            where=['m.snapshot_id=?'];args=[self.snapshot_id]
            for column,value in [('kind',kind),('semantics',semantics),('result',None if result is None else canonical(result).decode())]:
                if value is not None:where.append('e.'+column+'=?');args.append(value)
            for table,column,value in [('operations','operation',operation),('effects','effect',effect)]:
                if value is not None:where.append(f'EXISTS(SELECT 1 FROM {table} x WHERE x.entry_id=e.id AND x.{column}=?)');args.append(value)
            if parameter_type is not None:
                where.append("EXISTS(SELECT 1 FROM types t WHERE t.entry_id=e.id AND t.role='parameter' AND t.type=?)");args.append(canonical(parameter_type).decode())
            if condition is not None:
                where.append('EXISTS(SELECT 1 FROM applicability a WHERE a.entry_id=e.id AND a.condition=?)');args.append(canonical(condition).decode())
            if after is not None:where.append('e.id>?');args.append(hash_id(after))
            args.append(limit)
            return [r[0] for r in db.execute('SELECT e.id FROM entries e JOIN members m ON m.entry_id=e.id WHERE '+' AND '.join(where)+' ORDER BY e.id LIMIT ?',args)]
    @staticmethod
    def validate_observation(obj):
        fields(obj,('schema','program','entries','plan','target','workload','metrics'))
        if type(obj['schema']) is not int or obj['schema']!=1:raise ValueError('unsupported observation')
        if not isinstance(obj['entries'],list) or len(obj['entries'])>1024 or obj['entries']!=sorted(set(obj['entries'])):raise ValueError('invalid observation entries')
        hash_id(obj['program']);hash_id(obj['plan'])
        for i in obj['entries']:hash_id(i)
        fields(obj['target'],('hardware','driver','toolchain','backend','bridge'))
        fields(obj['workload'],('shape','distribution','concurrency','residency'))
        fields(obj['metrics'],('complete_call_ns','peak_bytes'))
        if any(not isinstance(v,str) or not v for v in obj['target'].values()):raise ValueError('missing target provenance')
        w=obj['workload']
        if not isinstance(w['shape'],(list,dict)) or not isinstance(w['distribution'],(str,dict)) or not w['distribution'] or type(w['concurrency']) is not int or not 1<=w['concurrency']<=65536 or not isinstance(w['residency'],str) or not w['residency']:raise ValueError('invalid workload provenance')
        samples=obj['metrics']['complete_call_ns']
        if not isinstance(samples,list) or not 1<=len(samples)<=256 or any(not isinstance(x,str) or not x.isascii() or not x.isdigit() or len(x)>40 for x in samples):raise ValueError('invalid performance samples')
        peak=obj['metrics']['peak_bytes']
        # Timing-only evidence must not invent a zero-allocation measurement.
        if peak is not None and (type(peak) is not int or peak<0):raise ValueError('invalid memory metric')
        canonical(obj)
    def observe(self,obj):
        self.validate_observation(obj)
        for i in obj['entries']:self.witness(i)
        i=identity(obj);immutable(self.data/'observations'/f'{i}.json',obj)
        index=self.root/'index.sqlite'
        if index.exists():
            with closing(sqlite3.connect(index)) as db,db:
                db.execute('INSERT OR IGNORE INTO observations VALUES(?,?,?,?,?,?)',(i,obj['program'],obj['plan'],canonical(obj['target']).decode(),canonical(obj['workload']).decode(),canonical(obj['metrics']).decode()))
        return i
    def observations(self,program,plans,target,workload,limit=1024):
        hash_id(program)
        if not 0<=limit<=1024:raise ValueError('observation query limit')
        plans=set(plans)
        if len(plans)>1024:raise ValueError('observation plan limit')
        for p in plans:hash_id(p)
        if not plans or limit==0:return []
        index=self.root/'index.sqlite'
        if not index.exists():self.rebuild()
        with closing(sqlite3.connect(index.as_uri()+'?mode=ro',uri=True)) as db:
            # Filter candidates before limiting; unrelated plans must not exhaust
            # the evidence budget. Old disposable indexes remain query-compatible.
            placeholders=','.join('?' for _ in plans)
            rows=db.execute(f'SELECT id FROM observations WHERE program_id=? AND plan_id IN ({placeholders}) AND target=? AND workload=? ORDER BY id LIMIT ?',
                            [program,*sorted(plans),canonical(target).decode(),canonical(workload).decode(),limit]).fetchall()
        result=[]
        for (i,) in rows:
            o=read(self.data/'observations'/f'{hash_id(i)}.json');self.validate_observation(o)
            if identity(o)!=i:raise ValueError('observation hash mismatch')
            # The disposable index cannot make incomparable measurements comparable.
            if o['program']==program and o['target']==target and o['workload']==workload and o['plan'] in plans:result.append(o)
        return result
