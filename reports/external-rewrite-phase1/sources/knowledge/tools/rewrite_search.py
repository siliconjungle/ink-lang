#!/usr/bin/env python3
"""Untrusted, bounded DB rewrite search producing checked whole-function proofs.

Supports scalar expressions and sum(input.map(scalar)). Unsupported functions
and exhausted searches retain their original implementation. Rewrite laws come
from an explicit index; this tool and its cost estimate are never proof authority.
"""
import argparse
import copy
import hashlib
import json
import shutil
import subprocess
from pathlib import Path
from collection_proofs import scalar, free, source_call, source_bin, source_var, lam
from inductive_proofs import SEMANTICS, var, call, construct, binary, refl


class Unsupported(ValueError):
    pass


def size(e):
    kind, value = next(iter(e.items()))
    if kind == 'Binary':
        return 1 + size(value[1]) + size(value[2])
    if kind in ('Num', 'Bool', 'Var'):
        return 1
    raise Unsupported('non-scalar expression')


def match(pattern, e, bindings):
    kind, value = next(iter(pattern.items()))
    if kind == 'Var':
        if value in bindings:
            return bindings[value] == e
        bindings[value] = e
        return True
    if kind == 'U64':
        return e == {'Num': value}
    if kind == 'Bool':
        return e == pattern
    if kind == 'Binary' and 'Binary' in e:
        op, a, b = e['Binary']
        return op == value['op'] and match(value['left'], a, bindings) and match(value['right'], b, bindings)
    return False


def substitute(term, bindings):
    kind, value = next(iter(term.items()))
    if kind == 'Var':
        return copy.deepcopy(bindings[value])
    if kind == 'U64':
        return {'Num': value}
    if kind == 'Bool':
        return copy.deepcopy(term)
    if kind == 'Binary':
        return {'Binary': [value['op'], substitute(value['left'], bindings), substitute(value['right'], bindings)]}
    raise Unsupported('unsupported theorem endpoint')


def search(e, env, rules, budget, used):
    if budget[0] <= 0:
        raise Unsupported('search budget exhausted')
    budget[0] -= 1
    kind, value = next(iter(e.items()))
    if kind == 'Binary':
        op, a, b = value
        left, lp = search(a, env, rules, budget, used)
        right, rp = search(b, env, rules, budget, used)
        current = {'Binary': [op, left, right]}
        proof = {'Binary': dict(op=op, left=lp, right=rp)}
    elif kind in ('Var', 'Num', 'Bool'):
        current, proof = copy.deepcopy(e), refl(scalar(e, env))
    else:
        raise Unsupported('non-scalar expression')
    for identity, theorem in rules:
        if budget[0] <= 0:
            raise Unsupported('search budget exhausted')
        budget[0] -= 1
        bindings = {}
        if not match(theorem['from'], current, bindings):
            continue
        try:
            replacement = substitute(theorem['to'], bindings)
            arguments = [scalar(bindings[n], env) for n, _ in theorem['params']]
        except (KeyError, ValueError):
            continue
        # This profitability heuristic belongs to the producer, not the checker.
        if size(replacement) >= size(current):
            continue
        step = {'Use': dict(theorem=identity, arguments=arguments, premises=[])}
        proof = {'Trans': [proof, step]}
        current = replacement
        used.append(identity)
    return current, proof


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--rules', type=Path, required=True)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--budget', type=int, default=10000, help='shared node/rule attempts across all functions')
    parser.add_argument('--fuse-mapped-sum', action='store_true', help='propose a right fold with an explicit induction proof')
    args = parser.parse_args()
    if not 0 <= args.budget <= 1000000:
        parser.error('budget must be between zero and one million')
    compiler, index_path, out = [p.resolve() for p in (args.compiler, args.rules, args.output_dir)]
    out.mkdir(parents=True, exist_ok=True)
    if any(out.iterdir()):
        parser.error('output directory must be empty')
    compiler_hash = hashlib.sha256(compiler.read_bytes()).hexdigest()
    subprocess.run([compiler, 'emit-core', args.source.resolve(), '-o', out / 'core.json'], check=True, capture_output=True)
    core = json.loads((out / 'core.json').read_text())
    program = core['program']
    if any(program[k] for k in ('states', 'keeps', 'actions', 'events', 'records', 'enums', 'ids')):
        parser.error('rewrite producer only supports pure programs')
    index = json.loads(index_path.read_text())
    if index['schema'] != 1 or index['semantics'] != 'untrusted-rewrite-index-v1' or len(index['rules']) > 128:
        parser.error('unsupported rewrite index')
    relative = Path(index['library'])
    if relative.is_absolute() or '..' in relative.parts:
        parser.error('index library must be relative without traversal')
    lock = index_path.parent / relative
    shutil.copytree(lock.parent / 'objects', out / 'objects')
    roots = json.loads(lock.read_text())
    rules = []
    for identity in index['rules']:
        if len(identity) != 64 or any(c not in '0123456789abcdef' for c in identity):
            parser.error('invalid rule identity')
        obj = json.loads((out / 'objects' / f'{identity}.json').read_text())
        theorem = obj['declaration']['Theorem']
        if theorem['conditions']:
            parser.error('this producer requires unconditional laws')
        rules.append((identity, theorem))

    def store(name, kind, declaration, dependencies=()):
        obj = dict(schema=1, semantics=SEMANTICS, name=name, dependencies=sorted(set(dependencies)), declaration={kind: declaration})
        data = (json.dumps(obj, separators=(',', ':')) + '\n').encode()
        identity = hashlib.sha256(data).hexdigest()
        (out / 'objects' / f'{identity}.json').write_bytes(data)
        if identity not in roots['objects']:
            roots['objects'].append(identity)
        return identity

    datatype = store('RewriteList64', 'Datatype', dict(constructors=[dict(name='Nil', fields=[]), dict(name='Cons', fields=['U64', 'SelfType'])]))

    def model_sum(body, binder, captures, label):
        # Match the fixed source semantics expected by the existing compiler bridge.
        params = [['input', {'Data': datatype}]] + [[f'c{i}', s] for i, (_, (s, _)) in enumerate(captures)]
        local = {n: (s, var(f'c{i}')) for i, (n, (s, _)) in enumerate(captures)}
        local[binder] = ('U64', var('head'))
        tail = {'SelfCall': [var('tail')] + [var(n) for n, _ in params[1:]]}
        mapping = store(label + '_map', 'Function', dict(params=params, result={'Data': datatype}, recursive=0,
            body={'Match': dict(scrutinee=var('input'), branches=[dict(bindings=[], body=construct(datatype, 0)),
                 dict(bindings=['head', 'tail'], body=construct(datatype, 1, scalar(body, local), tail))])}), [datatype])
        summation = store(label + '_sum', 'Function', dict(params=[['input', {'Data': datatype}]], result='U64', recursive=0,
            body={'Match': dict(scrutinee=var('input'), branches=[dict(bindings=[], body={'U64': 0}),
                 dict(bindings=['head', 'tail'], body=binary('+', var('head'), {'SelfCall': [var('tail')]}))])}), [datatype])
        return [mapping, summation]

    def model_fold(body, binder, captures, label):
        params = [['input', {'Data': datatype}]] + [[f'c{i}', s] for i, (_, (s, _)) in enumerate(captures)]
        local = {n: (s, var(f'c{i}')) for i, (n, (s, _)) in enumerate(captures)}
        local[binder] = ('U64', var('head'))
        tail = {'SelfCall': [var('tail')] + [var(n) for n, _ in params[1:]]}
        return store(label + '_fold', 'Function', dict(params=params, result='U64', recursive=0,
            body={'Match': dict(scrutinee=var('input'), branches=[dict(bindings=[], body={'U64': 0}),
                 dict(bindings=['head', 'tail'], body=binary('+', scalar(body, local), tail))])}), [datatype])

    budget, proposals, attempts = [args.budget], [], []
    for f in program['functions']:
        if len(proposals) >= 128:
            attempts.append(dict(function=f['name'], status='original', reason='replacement count limit'))
            continue
        used, old_ids, new_ids = [], [], []
        params = [(f'p{i}', t if t in ('U64', 'Bool') else {'Data': datatype}) for i, (_, t) in enumerate(f['params'])]
        env = {n: (s, var(p)) for (n, _), (p, s) in zip(f['params'], params)}
        try:
            if f['result'] not in ('U64', 'Bool'):
                raise Unsupported('unsupported result')
            body = f['body']
            if all(t in ('U64', 'Bool') for _, t in f['params']):
                replacement, proof = search(body, env, rules, budget, used)
            elif 'Call' in body and body['Call'][0] == 'sum' and len(body['Call'][1]) == 1:
                mapped = body['Call'][1][0]
                if 'Method' not in mapped:
                    raise Unsupported('requires a mapped input')
                input_, method, arguments = mapped['Method']
                if len(arguments) != 1 or 'Lambda' not in arguments[0]:
                    raise Unsupported('requires a single map lambda')
                binder, head = arguments[0]['Lambda']
                if method != 'map' or len(arguments) != 1 or 'Var' not in input_:
                    raise Unsupported('requires a single input map')
                input_name = input_['Var']
                if dict(f['params'])[input_name] != {'List': 'U64'} or any(t not in ('U64', 'Bool', {'List': 'U64'}) for _, t in f['params']):
                    raise Unsupported('unsupported parameters')
                local = dict(env)
                local[binder] = ('U64', var('head'))
                new_head, head_proof = search(head, local, rules, budget, used)
                if new_head == head and not args.fuse_mapped_sum:
                    raise Unsupported('no smaller checked-law candidate')
                captures_a = [(n, env[n]) for n in sorted(free({'Lambda': [binder, head]}))]
                captures_b = [(n, env[n]) for n in sorted(free({'Lambda': [binder, new_head]}))]
                old_ids = model_sum(head, binder, captures_a, f['name'] + '_from')
                lhs = call(old_ids[1], call(old_ids[0], env[input_name][1], *[v for _, (_, v) in captures_a]))
                if args.fuse_mapped_sum:
                    rest = 'rewrite_rest'
                    while rest == binder or rest in free(new_head):
                        rest += '_'
                    replacement = source_call('foldr', input_, {'Num': 0}, lam(binder, lam(rest, source_bin('+', new_head, source_var(rest)))))
                    new_ids = [model_fold(new_head, binder, captures_b, f['name'] + '_to')]
                    rhs = call(new_ids[0], env[input_name][1], *[v for _, (_, v) in captures_b])
                else:
                    replacement = source_call('sum', {'Method': [input_, 'map', [{'Lambda': [binder, new_head]}]]})
                    new_ids = model_sum(new_head, binder, captures_b, f['name'] + '_to')
                    rhs = call(new_ids[1], call(new_ids[0], env[input_name][1], *[v for _, (_, v) in captures_b]))
                proof = {'Induction': dict(variable=env[input_name][1]['Var'], **{'from': lhs, 'to': rhs}, cases=[
                    dict(bindings=[], proof=refl({'U64': 0})),
                    dict(bindings=['head', 'tail'], proof={'Binary': dict(op='+', left=head_proof, right={'Hypothesis': 0})})])}
            else:
                raise Unsupported('unsupported collection structure')
            if replacement == body:
                raise Unsupported('no smaller checked-law candidate')
            proposals.append(dict(function=f['name'], **{'from': body, 'to': replacement}, datatype=datatype,
                from_definitions=old_ids, to_definitions=new_ids, proof=proof))
            attempts.append(dict(function=f['name'], status='candidate', rules=used))
        except (Unsupported, KeyError, ValueError, TypeError) as e:
            attempts.append(dict(function=f['name'], status='original', reason=str(e)))
    (out / 'lock.json').write_text(json.dumps(roots, indent=2) + '\n')
    package = dict(schema=1, semantics='source-collections-v1', library='lock.json', proposals=proposals)
    lock_hash = hashlib.sha256((out / 'lock.json').read_bytes()).hexdigest()
    envelope = dict(schema=1, semantics='ink-checked-replacement-v1', core_semantics=core['semantics'],
        input_core_sha256=hashlib.sha256((out / 'core.json').read_bytes()).hexdigest(), observations='pure-total-values-v1',
        library_lock_sha256=lock_hash, package=package)
    (out / 'replacement.json').write_text(json.dumps(envelope, indent=2) + '\n')
    # Candidate generation has no authority: full input/definition/proof checks
    # happen in the unchanged compiler, including type-correct instantiations.
    subprocess.run([compiler, 'emit-c', out / 'core.json', '--core', '--replacement', out / 'replacement.json',
        '-o', out / 'checked.c'], check=True, capture_output=True)
    assert hashlib.sha256(compiler.read_bytes()).hexdigest() == compiler_hash
    receipt = dict(status='checked', compiler_sha256=compiler_hash, rules_index_sha256=hashlib.sha256(index_path.read_bytes()).hexdigest(),
        initial_budget=args.budget, remaining_budget=budget[0], fused_mapped_sum=args.fuse_mapped_sum, attempts=attempts,
        scope='bounded scalar and single mapped-sum proof production; optional fold fusion; node-count estimate is not a runtime measurement')
    (out / 'search.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(json.dumps(receipt))


if __name__ == '__main__':
    main()
