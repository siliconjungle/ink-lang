"""Batch34 derived independent map demand laws, source binding and full-word replay."""
import copy, hashlib, json, os, random, subprocess, sys, unittest
from pathlib import Path
B = Path(__file__).resolve().parents[2]
sys.path[:0] = [str(B / 'knowledge'), str(B / 'planner')]
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import value, var, word, term, law, lam, binary, bound
from producers.web_pipeline34_laws import named_laws, reference_laws, source_functions, specialize, publish, law_roles
from producers.web_pipeline32_laws import apply
from tests.test_web_pipeline32_laws import alpha, wrap, frames
C = B / 'reports/web-stack-proofs-32-2026-10-11/main-integration/ink-main-publish'
R = Path(os.environ.get('INK_PIPELINE34_PROOFS_DIR', str(B / 'reports/web-stack-proofs-34-2026-10-11/proofs')))


def oracle(name, args, staged):
    xs, ys, seed, k = args
    discarded, selected = (xs, ys) if '_left_' in name else (ys, xs)
    if staged:
        if 'heldout' in name:
            discarded = [((x // k if k else 0) + (x % k if k else 0) + seed) & 0xffffffff for x in discarded]
        else:
            discarded = [((x // k if k else 0) + (x % k if k else 0) + seed) & 0xffffffff for x in discarded]
        for _ in range(2 if 'heldout' in name else 0):
            state, out = 0, []
            for x in discarded:
                state = (state + x) & 0xffffffff
                out.append(state)
            discarded = out
        values = [y for _, y in zip(discarded, selected)]
    else:
        values = selected[:min(len(xs), len(ys))]
    if 'heldout' in name:
        return [((y // k if k else 0) + seed if y < seed else (y % k if k else 0) + k) & 0xffffffff for y in values]
    return [(y + k if y < seed else y - k) & 0xffffffff for y in values]


class Pipeline34(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        R.mkdir(parents=True, exist_ok=True)
        assert hashlib.sha256(C.read_bytes()).hexdigest() == '04f42856696cbc9a4d5b0523e4a2c5d9d84ae28e0e039f0fd9c305fe2d0a5536'
        cls.commands, cls.units, fresh, shared = [], [], [], []
        dummy = B / 'reports/web-stack-proofs-32-2026-10-11/proofs/dummy.core.json'
        (R / 'dummy.core.json').write_bytes(dummy.read_bytes())
        for held in (False, True):
            for name, t, source in source_functions(held):
                d = R / 'checks' / name
                d.mkdir(parents=True, exist_ok=True)
                src, core, sem = d / 'source.ink', d / 'input.core.json', d / 'subject.json'
                src.write_text('module Pipeline34;\n' + source + '\n')
                cls.run_(C, 'emit-core', src, '-o', core)
                cls.run_(C, 'emit-semantic', core, '--core', '-o', sem)
                cp, subject = json.loads(core.read_text()), json.loads(sem.read_text())
                rows, controls = specialize(subject, cp), specialize(subject, cp, optimize=False)
                assert len(rows) == 1 and len(controls) == int(held), (name, len(rows), len(controls))
                fresh += rows
                shared += controls
                cls.units.append(dict(name=name, type=t, folder=d, core=core, subject=subject, row=rows[0], shared=controls[0] if controls else None))
        cls.store = publish(R / 'validated-store', fresh + shared)
        cls.run_(C, 'knowledge-check', R / 'dummy.core.json', cls.store.root / 'view.json')
        prior = Store(B/'knowledge')
        assert all(identity(semantic_entry(v)) in prior.members() for _,v in reference_laws())
        assert all(identity(semantic_entry(v)) in prior.members() for _,v in shared)
        candidate = [dict(name=n,law=v,id=identity(semantic_entry(v)),role=law_roles().get(n,'definition_bound_source_certificate')) for n,v in named_laws()+fresh]
        (R.parent/'candidate-rows.json').write_text(json.dumps(candidate,indent=2)+'\n')
        (R / 'source-witnesses.json').write_text(json.dumps([dict(name=n, law=v, id=identity(semantic_entry(v)), role='definition_bound_source_certificate') for n, v in fresh], indent=2) + '\n')
        (R / 'shared-source-witnesses.json').write_text(json.dumps([dict(name=n, law=v, id=identity(semantic_entry(v)), role='shared_existing_scan_certificate') for n, v in shared], indent=2) + '\n')

    @classmethod
    def run_(cls, *args):
        p = subprocess.run(list(map(str, args)), capture_output=True, text=True)
        cls.commands.append(dict(argv=list(map(str, args)), exit_code=p.returncode, stdout=p.stdout, stderr=p.stderr))
        (R / 'test-commands.json').write_text(json.dumps(cls.commands, indent=2) + '\n')
        assert not p.returncode, p.stderr
        try:
            return json.loads(p.stdout)
        except json.JSONDecodeError:
            return p.stdout

    def test_complete_source_replay(self):
        records = []
        for u in self.units:
            name, d, core = u['name'], u['folder'], u['core']
            _, l = u['row']
            oid = identity(semantic_entry(l))
            pkg = dict(schema=1, semantics='ink-evidence-v1', input_core_sha256=u['subject']['input_core_sha256'], knowledge=self.store.bundle([oid]), applications=[dict(function=name, path=[], law=oid, arguments={n:var(s,n) for n,s in l['params'].items()}, premises=[])])
            sel, selected = d / 'selection.json', d / 'selected.core.json'
            sel.write_bytes(canonical(pkg) + b'\n')
            receipt = self.run_(C, 'check-selection', core, sel)
            (d / 'replay.json').write_text(json.dumps(receipt, indent=2) + '\n')
            self.run_(C, 'emit-core', core, '--core', '--selection', sel, '-o', selected)
            self.assertNotIn('method:scan', canonical(l['to']).decode())
            self.assertNotIn('method:map', canonical(l['to']).decode())
            self.assertIn('call:selected_word', canonical(l['to']).decode())
            self.assertNotIn('call:discarded_word', canonical(l['to']).decode())
            rng = random.Random(3303)
            replay_frames = frames('u32') + [([rng.getrandbits(32) for _ in range(nx)], [rng.getrandbits(32) for _ in range(ny)], 0xffffffff, 0) for nx, ny in [(128,1),(1,128),(128,97),(97,128)]]
            for i, args in enumerate(replay_frames):
                f = d / f'args-{i}.json'
                f.write_text(json.dumps(args) + '\n')
                before = self.run_(C, 'run', core, name, f, '--core')
                after = self.run_(C, 'run', selected, name, f, '--core')
                self.assertEqual(before, after)
                self.assertEqual(before, oracle(name, args, True))
                self.assertEqual(before, oracle(name, args, False))
                self.assertEqual(len(before), min(len(args[0]), len(args[1])))
                records.append(dict(name=name, frame=i, lengths=[len(args[0]),len(args[1])], equal=True))
        (R / 'interpreter.json').write_text(json.dumps(dict(status='passed', typed_sources=4, frames=len(records), records=records), indent=2) + '\n')

    def test_novelty_current_full_catalogue(self):
        st = Store(B / 'knowledge')
        members = st.members()
        self.assertEqual(len(members), 2485)
        new = {alpha(v):n for n,v in named_laws()}
        duplicates, count = [], 0
        for oid in members:
            p = st.object(oid)['payload']
            if not isinstance(p.get('from'),dict) or 'node' not in p['from']:
                continue
            count += 1
            for direction, q in [('forward',p),('reverse',dict(p, **{'from':p['to'],'to':p['from']}))]:
                if alpha(q) in new:
                    duplicates.append(dict(candidate=new[alpha(q)], prior_id=oid, direction=direction))
        self.assertFalse(duplicates)
        self.assertFalse({identity(semantic_entry(v)) for _,v in named_laws()} & set(members))
        (R / 'novelty.json').write_text(json.dumps(dict(status='passed', prior_entries=len(members), prior_snapshot=st.snapshot_id, prior_semantic_pairs=count, duplicates=duplicates, mechanisms=0, derived_endpoints=6, prior_proof_dependencies=15, roles=law_roles()), indent=2) + '\n')

    def test_all_typed_arbitrary_maps(self):
        from ink_planner.semantic_search import substitute
        roots = dict(named_laws())
        checks = []
        for t in ('u32','i32','u64'):
            bits = 64 if t == 'u64' else 32
            mask = (1 << bits) - 1
            s, ls = value(t.upper()), value({'List':t.upper()})
            def lit(xs):
                out = term(ls,'Nil')
                for x in reversed(xs):
                    out = term(ls,{'Cons':[word(t.upper(),x & mask),out]})
                return out
            for side in ('left','right'):
                endpoint = roots['independent_'+side+'_map_projection_erasure_'+t]
                for xs, ys, a, k in frames(t)[:7]:
                    f = lam(s,binary('+',binary('*',bound(s,0),word(t.upper(),k & mask)),word(t.upper(),a & mask)))
                    g = lam(s,binary('-',bound(s,0),word(t.upper(),a & mask)))
                    args = dict(xs=lit(xs),ys=lit(ys),f=f,g=g)
                    ends = [substitute(endpoint[key],args) for key in ('from','to')]
                    expected = lit([wrap(y-a,t) for y in ys[:min(len(xs),len(ys))]])
                    objects = [semantic_entry(law({},v,expected)) for v in ends]
                    d = R/'typed-map-checks'/f'{t}-{side}-{len(checks)}'
                    st = Store.publish(d,objects)
                    view = d/'view.json'
                    view.write_bytes(canonical(st.bundle([identity(o) for o in objects]))+b'\n')
                    self.run_(C,'knowledge-check',R/'dummy.core.json',view)
                    checks.append(dict(type=t,side=side,lengths=[len(xs),len(ys)],seed=a,multiplier=k))
        (R/'typed-map-checks.json').write_text(json.dumps(dict(status='passed',checks=checks),indent=2)+'\n')

    def test_observed_prefix_callbacks_do_not_specialize(self):
        from producers.semantic_laws import op
        s, ls = value('U32'), value({'List':'U32'})
        xs, ys = var(ls,'xs'), var(ls,'ys')
        records = []
        for side in ('left','right'):
            ignored = 1 if side == 'left' else 0
            for nested in (False,True):
                if nested:
                    # A nested closure captures the supposedly discarded prefix.
                    payload = apply(lam(s,binary('+',bound(s,ignored+1),bound(s,0))),bound(s,1-ignored))
                else:
                    payload = binary('+',bound(s,ignored),bound(s,1-ignored))
                cb = lam(s,lam(s,payload))
                mapped = op(ls,'method:map',xs,lam(s,binary('+',bound(s,0),word('U32',1))))
                left, right = (mapped,ys) if side == 'left' else (ys,mapped)
                body = op(ls,'method:zip',left,right,cb)
                self.assertEqual(specialize(dict(functions={'observed':body})),[])
                records.append(dict(side=side,nested_capture=nested,specializations=0))
        (R/'projection-scope-controls.json').write_text(json.dumps(dict(status='passed',records=records),indent=2)+'\n')

    def test_rehashed_false_theorem_and_changed_helper(self):
        bad = copy.deepcopy(named_laws()[0][1])
        # False endpoint drops truncation and would expose all retained values.
        bad['to'] = dict(sort=bad['to']['sort'], node={'Op':['method:map',[var(value({'List':'U32'}),'ys'),var(bad['params']['g'],'g')]]})
        obj, objects = semantic_entry(bad), {}
        oid = identity(obj)
        objects[oid] = obj
        def add(i):
            if i not in objects:
                objects[i] = self.store.object(i)
            for dependency in objects[i]['dependencies']:
                if dependency not in objects:
                    add(dependency)
        for i in obj['dependencies']:
            add(i)
        st = Store.publish(R/'false'/'wrong_truncation',objects.values())
        view = st.root/'view.json'
        view.write_bytes(canonical(st.bundle([oid]))+b'\n')
        p = subprocess.run([str(C),'knowledge-check',str(R/'dummy.core.json'),str(view)],capture_output=True,text=True)
        self.assertNotEqual(p.returncode,0)
        u = next(x for x in self.units if x['name']=='pipeline33_left_projection_heldout_u32')
        cp = json.loads(u['core'].read_text())
        next(f for f in cp['program']['functions'] if f['name']=='selected_word')['body'] = {'Num':1}
        changed, sem = u['folder']/'changed.core.json', u['folder']/'changed.subject.json'
        changed.write_bytes(canonical(cp)+b'\n')
        self.run_(C,'emit-semantic',changed,'--core','-o',sem)
        sel = json.loads((u['folder']/'selection.json').read_text())
        sel['input_core_sha256'] = json.loads(sem.read_text())['input_core_sha256']
        path = u['folder']/'changed.selection.json'
        path.write_bytes(canonical(sel)+b'\n')
        q = subprocess.run([str(C),'check-selection',str(changed),str(path)],capture_output=True,text=True)
        self.assertNotEqual(q.returncode,0)
        cp2 = json.loads(u['core'].read_text())
        next(f for f in cp2['program']['functions'] if f['name']=='discarded_word')['body'] = {'Num':2}
        changed2, sem2 = u['folder']/'changed-discarded.core.json', u['folder']/'changed-discarded.subject.json'
        changed2.write_bytes(canonical(cp2)+b'\n')
        self.run_(C,'emit-semantic',changed2,'--core','-o',sem2)
        sel['input_core_sha256'] = json.loads(sem2.read_text())['input_core_sha256']
        path2 = u['folder']/'changed-discarded.selection.json'
        path2.write_bytes(canonical(sel)+b'\n')
        q2 = subprocess.run([str(C),'check-selection',str(changed2),str(path2)],capture_output=True,text=True)
        self.assertNotEqual(q2.returncode,0)
        (R/'negative-controls.json').write_text(json.dumps(dict(status='rejected',semantic_false=dict(id=oid,content_hash_valid=True,exit_code=p.returncode,stderr=p.stderr),correctly_rehashed_context_mismatch=dict(exit_code=q.returncode,stderr=q.stderr),correctly_rehashed_discarded_context_mismatch=dict(exit_code=q2.returncode,stderr=q2.stderr)),indent=2)+'\n')

    def test_transitive_helper_context_mutations(self):
        u = next(x for x in self.units if x['name']=='pipeline34_left_projection_u32')
        _, l = u['row']
        oid = identity(semantic_entry(l))
        original = dict(schema=1,semantics='ink-evidence-v1',input_core_sha256=u['subject']['input_core_sha256'],knowledge=self.store.bundle([oid]),applications=[dict(function=u['name'],path=[],law=oid,arguments={n:var(s,n) for n,s in l['params'].items()},premises=[])])
        records=[]
        for helper in ('repair_word','calibrate_word'):
            cp=json.loads(u['core'].read_text())
            next(f for f in cp['program']['functions'] if f['name']==helper)['body']={'Num':3}
            changed, sem = u['folder']/(helper+'-changed.core.json'),u['folder']/(helper+'-changed.subject.json')
            changed.write_bytes(canonical(cp)+b'\n')
            self.run_(C,'emit-semantic',changed,'--core','-o',sem)
            packet=copy.deepcopy(original)
            packet['input_core_sha256']=json.loads(sem.read_text())['input_core_sha256']
            selection=u['folder']/(helper+'-changed.selection.json')
            selection.write_bytes(canonical(packet)+b'\n')
            p=subprocess.run([str(C),'check-selection',str(changed),str(selection)],capture_output=True,text=True)
            self.assertNotEqual(p.returncode,0)
            records.append(dict(helper=helper,correctly_rehashed_source=True,exit_code=p.returncode,stderr=p.stderr))
        (R/'transitive-context-controls.json').write_text(json.dumps(dict(status='rejected',records=records),indent=2)+'\n')

if __name__ == '__main__':
    unittest.main()
