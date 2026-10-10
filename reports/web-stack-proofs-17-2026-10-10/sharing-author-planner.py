#!/usr/bin/env python3
"""Bounded, untrusted search over arbitrary typed semantic term patterns.
No operation recognisers determine applicability. Every proposed step and every
premise is replayed by the independent compiler checker. Cost guides search only.
"""
import argparse
import copy
import hashlib
import json
import subprocess
import tempfile
from pathlib import Path
SEMANTICS = 'ink-conditional-laws-v1'


def children(t):
    n = t['node']
    if 'Op' in n: return n['Op'][1]
    if 'Lambda' in n: return [n['Lambda']]
    if 'Cons' in n: return n['Cons']
    return []


def set_child(t, i, child):
    t = copy.deepcopy(t); n = t['node']
    if 'Op' in n: n['Op'][1][i] = child
    elif 'Lambda' in n: n['Lambda'] = child
    elif 'Cons' in n: n['Cons'][i] = child
    else: raise ValueError('invalid child')
    return t


def shift(t, amount, cutoff=0):
    t = copy.deepcopy(t); n = t['node']
    if 'Bound' in n and n['Bound'] >= cutoff:
        n['Bound'] += amount
        if n['Bound'] < cutoff: raise ValueError('binder capture')
    else:
        for i, child in enumerate(children(t)):
            t = set_child(t, i, shift(child, amount, cutoff + int('Lambda' in n)))
    return t


def extract_hole(t, depth, local=0):
    n = t['node']
    if 'Bound' in n and local <= n['Bound'] < local + depth:
        raise ValueError('hole captures pattern binder')
    for child in children(t): extract_hole(child, depth, local + int('Lambda' in n))
    return shift(t, -depth)


def match(pattern, t, params, bindings, depth=0):
    if pattern['sort'] != t['sort']: return False
    n = pattern['node']; actual = t['node']
    if 'Free' in n and n['Free'] in params:
        try: arg = extract_hole(t, depth)
        except ValueError: return False
        name = n['Free']
        if name in bindings: return bindings[name] == arg
        bindings[name] = arg; return True
    if type(n) != type(actual): return False
    if not isinstance(n, dict): return n == actual
    if set(n) != set(actual): return False
    if 'Op' in n and n['Op'][0] != actual['Op'][0]: return False
    if not children(pattern): return n == actual
    if len(children(pattern)) != len(children(t)): return False
    return all(match(a, b, params, bindings, depth + int('Lambda' in n))
               for a, b in zip(children(pattern), children(t)))


def substitute(t, args, depth=0):
    n = t['node']
    if isinstance(n, dict) and 'Free' in n and n['Free'] in args:
        return shift(args[n['Free']], depth)
    for i, child in enumerate(children(t)):
        t = set_child(t, i, substitute(child, args, depth + int('Lambda' in n)))
    return t


def positions(t, path=()):
    yield path, t
    for i, child in enumerate(children(t)): yield from positions(child, path + (i,))


def replace(t, path, new):
    if not path: return new
    return set_child(t, path[0], replace(children(t)[path[0]], path[1:], new))


def estimated_list_length(t, fallback):
    """Conservative structural cardinality for an optional search hypothesis."""
    n = t['node']
    if n == 'Nil': return 0
    if isinstance(n, dict):
        if 'Cons' in n: return 1 + estimated_list_length(n['Cons'][1], fallback)
        if 'Op' in n:
            name, args = n['Op']
            if name == 'method:concat' and len(args) == 2:
                return sum(estimated_list_length(a, fallback) for a in args)
            if name == 'method:zip' and len(args) >= 2:
                return min(estimated_list_length(a, fallback) for a in args[:2])
            if name in ('method:map', 'method:filter') and args:
                return estimated_list_length(args[0], fallback)
    return fallback


def cost(t, operation_costs=None):
    """Structural estimate, never runtime evidence or correctness authority."""
    n = t['node']; costs = [cost(x, operation_costs) for x in children(t)]
    if isinstance(n, dict) and 'Op' in n:
        name, args = n['Op']
        # A generic list callback repeats work; scalar work outside it does not.
        # This preset is an untrusted search hypothesis, never proof authority.
        # Inspect sorts rather than theorem IDs, backend names or callback shape.
        repetitions = (operation_costs or {}).get('estimate:loop_iterations', 1)
        if args and len(args) > 1 and isinstance(args[0].get('sort'), dict) and isinstance(args[-1].get('sort'), dict):
            first = args[0]['sort'].get('Value')
            if isinstance(first, dict) and 'List' in first and 'Arrow' in args[-1]['sort']:
                if (operation_costs or {}).get('estimate:list_cardinality', 0):
                    repetitions = estimated_list_length(args[0], repetitions)
                costs[-1] *= repetitions
        # A statically known lambda application reifies to a local binding,
        # not a dynamic callback invocation. The optional binding price still
        # counts evaluation of both the argument and the lambda body.
        binding = (operation_costs or {}).get('estimate:let_binding')
        if binding is not None and name == 'apply' and len(args) == 2:
            if isinstance(args[0].get('node'), dict) and 'Lambda' in args[0]['node']:
                return binding + sum(costs)
        if operation_costs is not None and name in operation_costs:
            return operation_costs[name] + sum(costs)
        if name == 'call:repeat':
            count = args[0]['node'].get('Nat', 16)
            return costs[1] + count * (costs[2] + 2)
        # Lists carry their length and support direct indexing. Computing the
        # receiver still pays its full structural cost, e.g. map/filter/concat.
        if name in ('method:at_or', 'call:count'):
            return 1 + sum(costs)
        if name.startswith('method:') or name in ('call:sum', 'call:count', 'call:foldr'):
            return 40 + sum(costs)
        if name == 'nat.word': return 0
        if name == 'apply': return sum(costs)
    return 1 + sum(costs)


def key(v): return json.dumps(v, sort_keys=True, separators=(',', ':'))

def condition_proof(goal, catalogue, depth=0):
    """General bounded proof production: instantiate a checked lemma, or lift
    child proofs through an unchanged operator. Normalization is the fallback.
    The checker, including actual branch facts, remains the only authority.
    """
    if depth >= 3: return 'Normalize'
    # Supporting lemmas need not be enabled as rewrite roots. The compiler
    # admits only the dependency closure, so unreachable objects cannot confer authority.
    for ident, law in catalogue['objects'].items():
        args = {}
        if match(law['from'], goal['from'], law['params'], args) and set(args) == set(law['params']):
            if substitute(law['to'], args) == goal['to']:
                premises = [condition_proof({'from': substitute(c['from'], args), 'to': substitute(c['to'], args)},
                                            catalogue, depth + 1) for c in law['conditions']]
                return {'Use': dict(law=ident, arguments=dict(sorted(args.items())), premises=premises)}
    left, right = goal['from'], goal['to']; ln, rn = left['node'], right['node']
    if left['sort'] == right['sort'] and isinstance(ln, dict) and isinstance(rn, dict) and 'Op' in ln and 'Op' in rn:
        if ln['Op'][0] == rn['Op'][0] and len(children(left)) == len(children(right)):
            proofs = [condition_proof({'from': a, 'to': b}, catalogue, depth + 1)
                      for a, b in zip(children(left), children(right))]
            if any(p != 'Normalize' for p in proofs): return {'Congruence': proofs}
    return 'Normalize'


def search(subject, catalogue, check, budget=128, width=4, rounds=12, operation_costs=None):
    objects = catalogue['objects']
    # Index on the typed root constructor. New operation combinations require
    # data entries, never a new matching case. Root-variable laws are universal.
    index = {}
    def shape(t):
        n = t['node']
        return (key(t['sort']), 'Op:' + n['Op'][0] if isinstance(n, dict) and 'Op' in n else
                next(iter(n)) if isinstance(n, dict) else str(n))
    for ident in catalogue['roots']:
        law = objects[ident]; pattern = law['from']
        if isinstance(pattern['node'], dict) and 'Free' in pattern['node'] and pattern['node']['Free'] in law['params']:
            root = (key(pattern['sort']), '*')
        else: root = shape(pattern)
        index.setdefault(root, []).append(ident)
    start = subject['functions']; initial = sum(cost(t, operation_costs) for t in start.values())
    frontier = [(initial, start, [])]; best = frontier[0]; seen = {key(start)}
    rejected = 0; checked = 0; exhausted = False
    for _ in range(rounds):
        candidates = []
        for _, bodies, applications in frontier:
            for name, body in bodies.items():
                for path, target in positions(body):
                    ids = index.get(shape(target), []) + index.get((key(target['sort']), '*'), [])
                    for ident in ids:
                        law = objects[ident]; args = {}
                        if not match(law['from'], target, law['params'], args): continue
                        if set(args) != set(law['params']): continue
                        new = substitute(law['to'], args)
                        if new == target: continue
                        updated = dict(bodies); updated[name] = replace(body, path, new)
                        fingerprint = key(updated)
                        if fingerprint in seen: continue
                        seen.add(fingerprint)
                        if checked >= budget: exhausted = True; break
                        step = dict(function=name, path=list(path), law=ident, arguments=dict(sorted(args.items())),
                                    premises=['Normalize'] * len(law['conditions']))
                        proposal = applications + [step]; checked += 1
                        if not check(proposal):
                            rejected += 1
                            alternatives = [condition_proof({'from': substitute(c['from'], args),
                                                             'to': substitute(c['to'], args)}, catalogue)
                                            for c in law['conditions']]
                            if alternatives == step['premises'] or checked >= budget: continue
                            step = dict(step, premises=alternatives); proposal = applications + [step]; checked += 1
                            if not check(proposal): rejected += 1; continue
                        score = sum(cost(t, operation_costs) for t in updated.values())
                        state = (score, updated, proposal)
                        candidates.append(state)
                        if score < best[0]: best = state
                    if exhausted: break
                if exhausted: break
            if exhausted: break
        if not candidates or exhausted: break
        candidates.sort(key=lambda x: (x[0], len(x[2]), key(x[1])))
        frontier = candidates[:width]
    return best[2], dict(initial_cost=initial, selected_cost=best[0], attempts=checked,
                         rejected=rejected, exhausted=exhausted, estimate='structural; not measured runtime')


def load_cost_model(path):
    """Untrusted operation prices guide search, never applicability or replay."""
    model=json.loads(Path(path).read_text())
    if not isinstance(model,dict) or set(model)!={'schema','operation_costs'} or type(model['schema']) is not int or model['schema']!=1:
        raise ValueError('invalid cost model schema')
    prices=model['operation_costs']
    if not isinstance(prices,dict) or len(prices)>1024:
        raise ValueError('invalid operation prices')
    for name,price in prices.items():
        if not isinstance(name,str) or not name or len(name)>256 or type(price) is not int or not 0<=price<=1000000:
            raise ValueError('invalid operation price')
    return prices


def main():
    a = argparse.ArgumentParser(); a.add_argument('--compiler', type=Path, required=True)
    a.add_argument('--core', type=Path, required=True); a.add_argument('--snapshot', type=Path, required=True)
    a.add_argument('--knowledge-root', type=Path)
    a.add_argument('-o', type=Path, required=True); a.add_argument('--budget', type=int, default=128)
    a.add_argument('--cost-model',type=Path,help='Untrusted JSON operation prices; default structural estimate when omitted')
    args = a.parse_args()
    operation_costs=load_cost_model(args.cost_model) if args.cost_model else None
    cost_model_receipt=None if args.cost_model is None else dict(path=str(args.cost_model.resolve()),sha256=hashlib.sha256(args.cost_model.read_bytes()).hexdigest(),operation_costs=operation_costs,scope='Untrusted compile-time search hypothesis, not measured runtime')
    if not 0 <= args.budget <= 4096: a.error('budget must be between 0 and 4096')
    compiler = args.compiler.resolve(); original_hash = hashlib.sha256(compiler.read_bytes()).hexdigest()
    from ink_knowledge import Store
    snapshot = args.snapshot.resolve()
    storage = snapshot.parent.parent if snapshot.parent.name == 'snapshots' else snapshot.parent
    store = Store(args.knowledge_root or storage.parent, snapshot)
    with tempfile.TemporaryDirectory(prefix='ink-semantic-search-') as tmp:
        tmp = Path(tmp); subject_path = tmp / 'subject.json'; candidate = tmp / 'candidate.json'
        subprocess.run([compiler, 'emit-semantic', args.core.resolve(), '--core', '-o', subject_path], check=True, capture_output=True)
        subject = json.loads(subject_path.read_text())
        # Type-indexed discovery visits only value sorts present in this subject.
        # A rewrite preserves sort; all intermediate operations of each sort remain candidates.
        sorts={}
        def walk(v):
            if isinstance(v,dict):
                if 'sort' in v:sorts[key(v['sort'])]=v['sort']
                for x in v.values():walk(x)
            elif isinstance(v,list):
                for x in v:walk(x)
        walk(subject)
        roots=set()
        for sort in sorts.values():roots.update(store.query(kind='rewrite',semantics=SEMANTICS,result=sort,limit=min(1024,max(1,args.budget))))
        view=store.bundle(sorted(roots))
        def law(e):return dict(schema=1,semantics=e['semantics'],dependencies=e['dependencies'],**e['payload'])
        catalogue=dict(roots=view['roots'],objects={i:law(e) for i,e in view['objects'].items()})
        package = dict(schema=1, semantics='ink-evidence-v1', input_core_sha256=subject['input_core_sha256'],
                       knowledge=view, applications=[])
        # One checker process validates the dependency closure once, then checks
        # each candidate independently against the same exact input module.
        candidate.write_text(json.dumps(view))
        session = subprocess.Popen([compiler, 'selection-session', args.core.resolve(), candidate],
                                   stdin=subprocess.PIPE, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        try:
            ready = session.stdout.readline()
            if not ready or not json.loads(ready).get('ready'):
                session.wait(timeout=10)
                raise ValueError('compiler rejected catalogue: ' + session.stderr.read())
            def check(applications):
                session.stdin.write(json.dumps(applications) + '\n'); session.stdin.flush()
                response = session.stdout.readline()
                return bool(response and json.loads(response).get('checked'))
            if not check([]): raise ValueError('compiler rejected the catalogue')
            applications, receipt = search(subject, catalogue, check, args.budget, operation_costs=operation_costs)
            package['applications'] = applications
            if not check(applications): raise ValueError('compiler rejected final selection')
        finally:
            session.stdin.close()
            try: session.wait(timeout=10)
            except subprocess.TimeoutExpired: session.kill(); session.wait()
        args.o.parent.mkdir(parents=True, exist_ok=True); args.o.write_text(json.dumps(package, indent=2) + '\n')
    if hashlib.sha256(compiler.read_bytes()).hexdigest() != original_hash: raise ValueError('compiler changed during search')
    print(json.dumps(dict(compiler_sha256=original_hash, database=dict(snapshot_sha256=store.snapshot_id,entries=len(view["roots"]),loaded_objects=len(view["objects"])), cost_model=cost_model_receipt, **receipt)))
if __name__ == '__main__': main()
