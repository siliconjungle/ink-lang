#!/usr/bin/env python3
"""Author exact guarded specializations of ordinary pure computations.

Configuration values choose opportunities, never equality or profitability.
An opaque-callback law proves the guard; ordinary function equalities subsequently
specialize its closed branch. Mutable inputs keep the general source fallback.
"""
import argparse
import copy
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from ink_knowledge.store import entry
from producers.definition_context28 import bind
from producers.checked_core_image import write_checked_image
from producers.frozen_specialization import literal, source_free
from producers.semantic_laws import arrow, bound, lam, op, value, var, word


def author_guarded_substitution():
    a, b = value({'Named': 'A'}), value({'Named': 'B'})
    function, x, fixed = var(arrow(a, b), 'f'), var(a, 'x'), var(a, 'k')
    condition = op(value('Bool'), 'value:equal', x, fixed)
    before, after = op(b, 'apply', function, x), op(b, 'apply', function, fixed)
    return semantic_entry(dict(schema=1, semantics='ink-general-laws-v1', types=['A', 'B'],
        params=dict(f=function['sort'], x=a, k=a), conditions=[], dependencies=[],
        **{'from': before, 'to': op(b, 'call:choose', condition, after, before)},
        proof={'Cases': dict(condition=condition, on_false='Normalize', on_true={
            'Trans': dict(middle=after, left={'Congruence': ['Normalize', 'Normalize']}, right='Normalize')})}))


def guarded_substitution():
    store = Store(Path(__file__).resolve().parents[1]/'libraries/proofs/guarded-specialization')
    return store.object(store.names['guard/exact-configuration'])


def author_list_identity():
    carrier = value({'List': {'Named': 'A'}})
    x, fixed = var(carrier, 'x'), var(carrier, 'k')
    return semantic_entry(dict(schema=1, semantics='ink-general-laws-v1', types=['A'],
        params=dict(x=carrier, k=carrier), conditions=[], dependencies=[],
        **{'from': op(value('Bool'), 'value:equal', x, fixed),
           'to': op(value('Bool'), 'binary:==', x, fixed)}, proof='Normalize'))


def comparison_rule(carrier, core, subject):
    if isinstance(carrier['Value'], dict) and 'List' in carrier['Value']:
        store = Store(Path(__file__).resolve().parents[1]/'libraries/proofs/guarded-specialization')
        return store.object(store.names['guard/list-identity']), dict(A=carrier['Value']['List'])
    x, fixed = var(carrier, 'x'), var(carrier, 'k')
    law = dict(schema=1, semantics='ink-conditional-laws-v1', params=dict(x=carrier, k=carrier),
        conditions=[], dependencies=[], proof='Normalize',
        **{'from': op(value('Bool'), 'value:equal', x, fixed),
           'to': op(value('Bool'), 'binary:==', x, fixed)})
    return semantic_entry(bind(law, core, subject, roots=[])), {}


def guardable(ty, program, active=()):
    if isinstance(ty, str):
        return ty in ('U32', 'U64', 'I32', 'F32', 'Int', 'Bool', 'Unit', 'String')
    if not isinstance(ty, dict) or len(ty) != 1:
        return False
    if 'Named' in ty:
        name = ty['Named']
        if name in program['enums'] or name in program['ids'] or name in active:
            return True
        return name in program['records'] and all(guardable(t, program, (*active, name))
                                                  for _, t in program['records'][name])
    if 'List' in ty or 'Option' in ty:
        return guardable(next(iter(ty.values())), program, active)
    if 'Result' in ty:
        return all(guardable(t, program, active) for t in ty['Result'])
    if 'Vector' in ty:
        return guardable(ty['Vector'][0], program, active)
    return False


def configuration_literal(ty, data, program, depth=0):
    if depth > 32:
        raise ValueError('guard configuration depth limit')
    recur = lambda t, v: configuration_literal(t, v, program, depth+1)
    if ty in ('U32', 'U64', 'I32'):
        low, high = (-2**31, 2**31) if ty == 'I32' else (0, 2**(32 if ty == 'U32' else 64))
        if type(data) is not int or not low <= data < high:
            raise ValueError('guard configuration integer range/type')
        return {'Neg': {'Num': -data}} if data < 0 else {'Num': data}
    if ty == 'Bool':
        if type(data) is not bool:
            raise ValueError('guard configuration Bool type')
        return {'Bool': data}
    if ty == 'F32':
        return literal(ty, data, program)
    if ty == 'String':
        if type(data) is not str:
            raise ValueError('guard configuration String type')
        data.encode('utf8')
        return {'String': data}
    if ty == 'Unit':
        if data is not None:
            raise ValueError('guard configuration Unit must be null')
        return 'Unit'
    if ty == 'Int':
        if type(data) is not int or data.bit_length() > 1024:
            raise ValueError('guard configuration Int type/authoring size limit')
        n = abs(data); limbs = []
        while n:
            limbs.append(n & 0xffffffff); n >>= 32
        integer = lambda n: {'Call': ['Int', [{'Num': n}]]}
        result = integer(0)
        for limb in reversed(limbs):
            result = {'Binary': ['+', {'Binary': ['*', result, integer(2**32)]}, integer(limb)]}
        return {'Neg': result} if data < 0 else result
    if isinstance(ty, dict) and len(ty) == 1:
        if 'Named' in ty:
            name = ty['Named']
            if name in program['records']:
                fields = program['records'][name]
                if type(data) is not dict or set(data) != {n for n, _ in fields}:
                    raise ValueError('guard configuration record fields')
                return {'Record': [name, [[n, recur(t, data[n])] for n, t in fields]]}
            if name in program['enums']:
                if data not in [name+'.'+v for v in program['enums'][name]]:
                    raise ValueError('guard configuration enum variant')
                return literal(ty, data, program)
            if name in program['ids']:
                return {'Call': [name, [recur('U64', data)]]}
        if 'List' in ty:
            if type(data) is not list:
                raise ValueError('guard configuration List type')
            return {'Call': ['list', [recur(ty['List'], item) for item in data]]}
        if 'Vector' in ty:
            element, size = ty['Vector']
            if type(data) is not list or len(data) != size:
                raise ValueError('guard configuration vector size/type')
            return {'Call': ['vec'+str(size), [recur(element, item) for item in data]]}
        if 'Option' in ty:
            if data == {'None': None}:
                return {'Var': 'None'}
            if type(data) is dict and set(data) == {'Some'}:
                return {'Call': ['Some', [recur(ty['Option'], data['Some'])]]}
        if 'Result' in ty and type(data) is dict and len(data) == 1:
            for index, arm in enumerate(['Ok', 'Err']):
                if arm in data:
                    return {'Call': [arm, [recur(ty['Result'][index], data[arm])]]}
    raise ValueError('guard configuration has unsupported type/value')


def propose_source(source, function, parameter, data):
    program = source['program']
    original = next((f for f in program['functions'] if f['name'] == function), None)
    if original is None or parameter not in dict(original['params']):
        raise ValueError('guard requires an existing pure function and parameter')
    if parameter not in source_free(original['body']):
        raise ValueError('guard parameter is unused; no configuration specialization opportunity')
    ty = dict(original['params'])[parameter]
    if not guardable(ty, program):
        raise ValueError('guard requires an immutable value in the admitted proof domain')
    literal = configuration_literal(ty, data, program)
    occupied = {f['name'] for f in program['functions']}
    def fresh(name):
        while name in occupied:
            name += '_'
        occupied.add(name)
        return name
    name = fresh('guarded_fallback')
    fallback = copy.deepcopy(original); fallback['name'] = name
    configuration = dict(name=fresh('guarded_configuration'), params=[], result=ty, body=literal)
    constant = {'Call': [configuration['name'], []]}
    # Numeric scalar == has IEEE semantics. A singleton list requests exact
    # structural stored-bit comparison, including signed zero and NaN payloads.
    wrapped = ty == 'F32'
    actual = {'Var': parameter}
    guard_actual, guard_constant = (dict(Call=['list', [x]]) for x in [actual, constant]) if wrapped else (actual, constant)
    arguments = [{'Var': n} for n, _ in original['params']]
    fixed = [constant if n == parameter else {'Var': n} for n, _ in original['params']]
    selected = copy.deepcopy(source)
    body = {'Call': ['choose', [{'Binary': ['==', guard_actual, guard_constant]},
            {'Call': [name, fixed]}, {'Call': [name, arguments]}]]}
    next(f for f in selected['program']['functions'] if f['name'] == function)['body'] = body
    helpers = [fallback, configuration]
    selected['program']['functions'].extend(helpers)
    return selected, helpers, wrapped


def guard_proof(extended, before, after, function, parameter, fallback, wrapped):
    original = next(f for f in extended['program']['functions'] if f['name'] == function)
    params = {n: value(t) for n, t in original['params']}
    args = [var(params[n], n) for n, _ in original['params']]
    index = next(i for i, (n, _) in enumerate(original['params']) if n == parameter)
    left, right = before['functions'][function], after['functions'][function]
    condition = right['node']['Op'][1][0]
    x, fixed = condition['node']['Op'][1]
    c, result = x['sort'], left['sort']
    argument = op(params[parameter], 'method:at_or', bound(c, 0), word('U32', 0), fixed['node']['Cons'][0]) if wrapped else bound(c, 0)
    dynamic = op(result, 'call:'+fallback, *args)
    callback = lam(c, op(result, 'call:'+fallback, *[argument if i == index else arg for i, arg in enumerate(args)]))
    applied = op(result, 'apply', callback, x)
    chosen = op(result, 'call:choose', op(value('Bool'), 'value:equal', x, fixed),
                op(result, 'apply', callback, fixed), applied)
    rule = guarded_substitution(); key = identity(rule)
    use = {'Use': dict(law=key, types=dict(A=c['Value'], B=original['result']),
                       arguments=dict(f=callback, x=x, k=fixed), premises=[])}
    comparison, types = comparison_rule(c, extended, before)
    comparison_key = identity(comparison)
    comparison_use = dict(law=comparison_key, arguments=dict(x=x, k=fixed), premises=[])
    if types:
        comparison_use['types'] = types
    condition_proof = {'Use': comparison_use}
    # Balanced composition bounds written proof depth. Neither branch expands
    # the evaluated graph: beta/projection correspondence meets equal call heads.
    proof = {'Trans': dict(middle=applied,
        left={'Trans': dict(middle=dynamic, left='Normalize', right='Normalize')},
        right={'Trans': dict(middle=chosen, left=use,
                            right={'Congruence': [condition_proof, 'Normalize', 'Normalize']})})}
    law = dict(schema=1, semantics='ink-general-laws-v1', params=params, conditions=[],
               dependencies=sorted([key, comparison_key]), proof=proof, **{'from': left, 'to': right})
    return [rule, comparison], semantic_entry(bind(law, extended, before))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--function', required=True)
    parser.add_argument('--parameter', required=True)
    parser.add_argument('--value', required=True, type=Path, help='typed configuration as JSON; floats accept F32Bits')
    parser.add_argument('--prefix-plan', type=Path,
        help='replay an earlier plan before discovering and specializing the guarded function')
    parser.add_argument('--ink', required=True, type=Path)
    parser.add_argument('-o', '--output', required=True, type=Path)
    args = parser.parse_args()
    for path in [args.source, args.value, *([args.prefix_plan] if args.prefix_plan else [])]:
        if path.stat().st_size > 16_000_000:
            raise ValueError('guard source/configuration byte limit')
    def reject(token):
        raise ValueError('nonstandard JSON number '+token)
    config = json.loads(args.value.read_bytes(), parse_constant=reject)
    with tempfile.TemporaryDirectory(prefix='ink-guarded-specialization-') as temporary:
        folder = Path(temporary)
        def run(*command):
            result = subprocess.run([str(args.ink.resolve()), *map(str, command)], capture_output=True, timeout=180)
            result.check_returncode()
            return result.stdout
        original = json.loads(run('check-core', args.source))['core_sha256']
        state = folder/'state.json'
        plan = dict(schema=1, semantics='ink-compiled-plan-v1', input_core_sha256=original, steps=[])
        source = json.loads(args.source.read_bytes())
        working = original
        if args.prefix_plan:
            # Replay the complete prefix, including its non-core state. The final
            # combined replay preserves that state; extracting core here supplies
            # only the next producer's candidate input, never rewrite authority.
            run('check-plan', args.source, args.prefix_plan, '--core', '--state-out', state)
            prefix_state = json.loads(state.read_bytes())
            source, working = prefix_state['core'], prefix_state['source']
            plan = json.loads(args.prefix_plan.read_bytes())
        selected, helpers, wrapped = propose_source(source, args.function, args.parameter, config)
        obj = entry('definition', 'ink-source-extension-v1', dict(functions=helpers)); key = identity(obj)
        store = Store.publish(folder/'extensions', [obj])
        request = dict(schema=1, semantics='ink-source-extension-v1', input_core_sha256=working,
                       extension=key, knowledge=store.bundle([key]))
        plan['steps'].append(dict(kind='extension', package=request))
        packet = folder/'plan.json'; packet.write_bytes(canonical(plan))
        run('check-plan', args.source, packet, '--core', '--state-out', state)
        extended = json.loads(state.read_bytes())['core']; ext = folder/'extended.json'; ext.write_bytes(canonical(extended))
        candidate = folder/'candidate.json'
        selected = write_checked_image(selected, candidate, args.ink)
        def subject(path, name):
            output = folder/(name+'.json'); run('emit-semantic', path, '--core', '-o', output)
            return json.loads(output.read_bytes())
        rules, law = guard_proof(extended, subject(ext, 'before'), subject(candidate, 'after'),
                                args.function, args.parameter, helpers[0]['name'], wrapped)
        store = Store.publish(folder/'laws', [*rules, law]); key = identity(law)
        rewrite = dict(schema=1, semantics='ink-evidence-v1', input_core_sha256=json.loads(run('check-core', ext))['core_sha256'],
            knowledge=store.bundle([key]), applications=[dict(function=args.function, path=[], law=key,
                arguments={n: var(s, n) for n, s in law['payload']['params'].items()}, premises=[])])
        plan['steps'].append(dict(kind='rewrite', package=rewrite)); packet.write_bytes(canonical(plan))
        run('check-plan', args.source, packet, '--core', '--state-out', state)
        guarded = folder/'guarded.json'; guarded.write_bytes(canonical(json.loads(state.read_bytes())['core']))
        residual = folder/'residual.json'
        result = subprocess.run([sys.executable, str(Path(__file__).with_name('function_specialization.py')),
            str(guarded), '--functions', args.function, '--ink', str(args.ink.resolve()), '-o', str(residual)],
            capture_output=True, timeout=240)
        result.check_returncode()
        plan['steps'].extend(json.loads(residual.read_bytes())['steps']); packet.write_bytes(canonical(plan))
        run('check-plan', args.source, packet, '--core')
        args.output.parent.mkdir(parents=True, exist_ok=True)
        pending = None
        try:
            with tempfile.NamedTemporaryFile(prefix='.ink-guarded-', dir=args.output.parent, delete=False) as output:
                pending = Path(output.name); output.write(packet.read_bytes()); output.flush(); os.fsync(output.fileno())
            os.replace(pending, args.output); pending = None
        finally:
            if pending is not None:
                pending.unlink(missing_ok=True)
    print(json.dumps(dict(status='checked-proposal', function=args.function, parameter=args.parameter,
        steps=len(plan['steps']), profitability='unmeasured; explicit selection only')))


if __name__ == '__main__':
    try:
        main()
    except subprocess.CalledProcessError as error:
        sys.exit(error.stderr.decode(errors='replace').strip() or 'compiler rejected guarded specialization')
