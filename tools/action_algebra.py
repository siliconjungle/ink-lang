#!/usr/bin/env python3
"""Report which actions of a module commute, from checked access descriptions.

For every pair of public actions this applies Bernstein's conditions to the
compiler's source-bound point accesses (`emit-access`, re-derived by
`check-access`) and declared events (`emit-effects`):

* `commute`: no potential read/write overlap remains after excluding distinct
  same-type literal keys, and at most one action emits events.
* `commute_when`: every conflict is between point accesses of one root, so the
  calls commute whenever the listed keys differ (`put(k1)` and `erase(k2)` with
  `k1 != k2`, say).
* `conflict`: a whole-root access, equal constant keys, or two ordered event
  streams make call order observable.

This is untrusted analysis, in the same standing as access descriptions: it
does not prove commutation and grants no reordering, batching, merge or
parallel-execution authority. Commuting calls still receive different commit
versions in each order. A proved certificate would be a whole-action equality
between `a; b` and `b; a` (see docs/action-algebra.md).

    python3 tools/action_algebra.py --compiler target/release/ink --source examples/grouped-state.ink
"""
import argparse
import itertools
import json
import subprocess
import tempfile
from pathlib import Path

SEMANTICS = 'ink-action-algebra-report-v1'


def render(symbol, names):
    if not isinstance(symbol, dict):
        return json.dumps(symbol)
    kind, value = next(iter(symbol.items()))
    if kind == 'Parameter':
        return names[value] if value < len(names) else f'arg{value}'
    if kind in ('Number', 'Bool', 'String'):
        return json.dumps(value)
    if kind == 'NumberAs':
        return str(value[1])
    if kind == 'Neg':
        return '-' + render(value[1], names)
    if kind == 'Binary':
        return '(' + render(value[2], names) + ' ' + value[1] + ' ' + render(value[3], names) + ')'
    if kind == 'Field':
        return render(value[0], names) + '.' + value[1]
    if kind == 'Record':
        return value[0] + '{' + ', '.join(f + ': ' + render(v, names) for f, v in value[1]) + '}'
    return kind


def constant(symbol):
    if not isinstance(symbol, dict):
        return True
    kind, value = next(iter(symbol.items()))
    if kind == 'Parameter':
        return False
    if kind in ('Number', 'Bool', 'String', 'NumberAs'):
        return True
    if kind == 'Neg':
        return constant(value[1])
    if kind == 'Binary':
        return constant(value[2]) and constant(value[3])
    if kind == 'Field':
        return constant(value[0])
    if kind == 'Record':
        return all(constant(v) for _, v in value[1])
    return False


def distinct_literals(first, second):
    """Recognize different literal values, never different expression trees.

    Symbols are checked source descriptions. Computed constants can collide
    through arithmetic or wrapping, so leave
    those comparisons as explicit key-difference conditions.
    """
    if not isinstance(first, dict) or not isinstance(second, dict):
        return False
    if len(first) != 1 or len(second) != 1:
        return False
    kind, value = next(iter(first.items()))
    other_kind, other_value = next(iter(second.items()))
    if kind != other_kind:
        return False
    if kind == 'NumberAs':
        return value[0] == other_value[0] and value[1] != other_value[1]
    return kind in ('Number', 'Bool', 'String') and value != other_value


def guards(access, names):
    return [('' if c['value'] else '!') + render(c['expression'], names) for c in access.get('conditions', [])]


def relate(first, second, access, effects):
    a, b = access[first], access[second]
    left, right = (first + '#1', second + '#2') if first == second else (first, second)
    an = [f'{left}.{n}' for n, _ in a['parameters']]
    bn = [f'{right}.{n}' for n, _ in b['parameters']]
    reasons, conditions, keys = [], [], []
    for x, y in itertools.product(a['accesses'], b['accesses']):
        if x['root'] != y['root'] or (x['mode'] != 'write' and y['mode'] != 'write'):
            continue
        what = f"{x['root']}: {first} {x['mode']}s, {second} {y['mode']}s"
        if 'Whole' in x['scope'] or 'Whole' in y['scope']:
            why = (x['scope'].get('Whole') or y['scope'].get('Whole') or {}).get('reason', 'whole-root access')
            reasons.append(f'{what} ({why})')
            continue
        kx, ky = x['scope']['Point']['key'], y['scope']['Point']['key']
        if constant(kx) and constant(ky) and kx == ky:
            reasons.append(f"{what} the same constant key {render(kx, an)}")
            continue
        if distinct_literals(kx, ky):
            continue
        guard = guards(x, an) + guards(y, bn)
        if not guard and set(kx) == {'Parameter'} and set(ky) == {'Parameter'}:
            keys.append([kx['Parameter'], ky['Parameter']])
        else:
            keys.append(None)
        condition = f'{render(kx, an)} != {render(ky, bn)}'
        if guard:
            condition += ' or not (' + ' and '.join(guard) + ')'
        if condition not in conditions:
            conditions.append(condition)
    emits = effects.get(first, {}).get('emits', []), effects.get(second, {}).get('emits', [])
    if emits[0] and emits[1]:
        reasons.append('both emit ordered events: ' + ', '.join(sorted(set(emits[0]) | set(emits[1]))))
    if reasons:
        return dict(relation='conflict', reasons=reasons)
    if conditions:
        row = dict(relation='commute_when', conditions=conditions)
        if keys and None not in keys:
            # Parameter positions whose difference the condition requires.
            row['key_parameters'] = [list(k) for k in dict.fromkeys(map(tuple, keys))]
        return row
    return dict(relation='commute')


def analyse(access, effects):
    actions = sorted(access['actions'])
    pairs = []
    for first, second in itertools.combinations_with_replacement(actions, 2):
        if access['actions'][first]['kind'] == 'Query' and access['actions'][second]['kind'] == 'Query':
            continue
        pairs.append(dict(first=first, second=second, **relate(first, second, access['actions'], effects)))
    summary = {}
    for row in pairs:
        summary[row['relation']] = summary.get(row['relation'], 0) + 1
    return dict(schema=1, semantics=SEMANTICS, source=access.get('source'),
                scope='Untrusted analysis of checked access descriptions; no reordering, batching or merge authority',
                actions={n: dict(kind=a['kind'], parameters=[p for p, _ in a['parameters']],
                                 writes=sorted({x['root'] for x in a['accesses'] if x['mode'] == 'write'}),
                                 emits=effects.get(n, {}).get('emits', []))
                         for n, a in sorted(access['actions'].items())},
                summary=summary, pairs=pairs)


def markdown(report):
    lines = ['| First | Second | Relation | Detail |', '|---|---|---|---|']
    for row in report['pairs']:
        detail = '; '.join(row.get('conditions') or row.get('reasons') or [])
        if row.get('certificate'):
            detail = (detail + '; ' if detail else '') + 'certificate: ' + row['certificate'] + (
                ' (' + row['reason'][:120] + ')' if row.get('reason') else '')
        lines.append(f"| {row['first']} | {row['second']} | {row['relation']} | {detail} |")
    return '\n'.join(lines) + '\n'


SCALARS = {'U8': 'u8', 'U16': 'u16', 'U32': 'u32', 'U64': 'u64', 'I32': 'i32', 'I64': 'i64', 'F32': 'f32'}


def ink_type(value):
    if isinstance(value, str):
        return SCALARS.get(value, value)
    kind, inner = next(iter(value.items()))
    if kind == 'Named':
        return inner
    if kind == 'Result':
        return f'Result<{ink_type(inner[0])},{ink_type(inner[1])}>'
    if kind in ('Option', 'List'):
        return f'{kind}<{ink_type(inner)}>'
    raise ValueError(f'unsupported type for a pair action: {kind}')


def error_type(action):
    result = action['result']
    return json.dumps(result['Result'][1], sort_keys=True) if isinstance(result, dict) and 'Result' in result else None


def pair_source(text, first, second, swapped, keys=None):
    """A change calling both actions and returning both replies, in one order.

    Nested calls share tentative state; an Err from either aborts the pair in
    both orders. The replies record makes reply changes observable too.
    With `keys` (parameter positions that must differ), the swapped order runs
    only when every pair of keys differs; otherwise the original order runs.
    Equality with the unswapped pair is then the conditional commutation.
    """
    errors = {error_type(a) for a in (first, second) if a['kind'] == 'Change'}
    if len(errors) > 1 or None in errors:
        raise ValueError('pair needs one shared error type for nested changes')
    error = ink_type(json.loads(next(iter(errors)))) if errors else 'Unit'
    params, calls = [], []
    for slot, action in (('first', first), ('second', second)):
        names = [f'{slot}_{n}' for n, _ in action['params']]
        params += [f'{n}:{ink_type(t)}' for n, (_, t) in zip(names, action['params'])]
        calls.append(f"let {slot}={action['name']}({','.join(names)});")
    original = list(calls)
    if swapped:
        calls.reverse()
    clause = lambda word, roots: f' {word}({",".join(sorted(set(roots)))})' if roots else ''
    reads = [r for a in (first, second) for r in a.get('reads', [])]
    writes = [r for a in (first, second) for r in a.get('writes', [])]
    emits = [e for a in (first, second) for e in a.get('emits', [])]
    if not writes:
        raise ValueError('pair of queries')
    done = 'return Ok(__PairReplies{first:first,second:second});'
    body = ''.join(calls) + done
    if keys:
        differ = ' && '.join(f"first_{first['params'][i][0]} != second_{second['params'][j][0]}" for i, j in keys)
        body = 'if ' + differ + ' {' + ''.join(calls) + done + '}' + ''.join(original) + done
    return (text + f"\nrecord __PairReplies {{ first:{ink_type(first['result'])}, second:{ink_type(second['result'])}, }}\n"
            + f"change __pair({','.join(params)})->Result<__PairReplies,{error}>{clause('reads', reads)}{clause('writes', writes)}{clause('emits', emits)}"
            + '{' + body + '}\n')


def certify(compiler, source, first, second, knowledge, directory, keys=None):
    """Ask the existing whole-action equality checker to admit `a;b == b;a`,
    or with `keys`, `a;b == (keys differ ? b;a : a;b)` on sorted tables."""
    root = Path(__file__).resolve().parents[1]
    d = Path(directory) / (f'{first}--{second}' + ('--keys-differ' if keys else ''))
    d.mkdir(parents=True, exist_ok=True)
    text = Path(source).read_text()
    run = lambda *command: subprocess.run([str(c) for c in command], capture_output=True, text=True)
    core = d / 'core.json'
    result = run(compiler, 'emit-core', source, '-o', core)
    if result.returncode:
        return dict(certificate='unavailable', reason=result.stderr.strip()[-300:])
    actions = {a['name']: a for a in json.loads(core.read_text())['program']['actions']}
    try:
        (d / 'ab.ink').write_text(pair_source(text, actions[first], actions[second], False))
        (d / 'ba.ink').write_text(pair_source(text, actions[first], actions[second], True, keys))
    except (ValueError, KeyError) as error:
        return dict(certificate='unavailable', reason=str(error))
    for name in ('ab', 'ba'):
        sorted_tables = ['--sorted-tables', d / f'{name}-sorted.json'] if keys and name == 'ab' else []
        for command in (['emit-core', d / f'{name}.ink', '-o', d / f'{name}-core.json'],
                        ['emit-action-model', d / f'{name}.ink', '-o', d / f'{name}-model.json', *sorted_tables]):
            result = run(compiler, *command)
            if result.returncode:
                return dict(certificate='unavailable', reason=result.stderr.strip()[-300:])
    environment = dict(__import__('os').environ, PYTHONPATH=f"{root / 'knowledge'}:{root / 'planner'}")
    proposal = subprocess.run([__import__('sys').executable, str(root / 'knowledge/producers/action_replacement.py'),
                               str(d / 'ab-model.json'), str(d / 'ba-model.json'), str(d / 'ba-core.json'),
                               '--knowledge', str(knowledge), '-o', str(d / 'proposal/selection.json'),
                               *(['--sorted-tables', str(d / 'ab-sorted.json')] if keys else [])],
                              capture_output=True, text=True, env=environment)
    if proposal.returncode:
        return dict(certificate='unavailable', reason=proposal.stderr.strip()[-300:])
    result = run(compiler, 'check-selection', d / 'ab-core.json', d / 'proposal/selection.json')
    if result.returncode:
        return dict(certificate='rejected', reason=result.stderr.strip()[-300:])
    evidence = json.loads(result.stdout)
    return dict(certificate='checked' if not keys else 'checked when keys differ', selection=str(d / 'proposal/selection.json'),
                input_core_sha256=evidence['input_core_sha256'], selected_core_sha256=evidence['selected_core_sha256'])


def describe(compiler, source):
    with tempfile.TemporaryDirectory(prefix='ink-action-algebra-') as directory:
        d = Path(directory)
        for command in (['emit-access', source, '-o', d / 'access.json'], ['check-access', source, d / 'access.json'],
                        ['emit-effects', source, '-o', d / 'effects.json']):
            result = subprocess.run([str(compiler), *map(str, command)], capture_output=True, text=True)
            if result.returncode:
                raise ValueError(result.stderr.strip()[-2000:])
        access = json.loads((d / 'access.json').read_text())
        effects = {n: a['access'] for n, a in json.loads((d / 'effects.json').read_text())['actions'].items()}
    return analyse(access, effects)


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument('--compiler', type=Path, required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--certify', type=Path, metavar='DIRECTORY',
                        help='for each commuting or conditionally commuting pair, ask the whole-action equality checker to admit a;b == b;a unconditionally')
    parser.add_argument('--knowledge', type=Path, default=Path(__file__).resolve().parents[1] / 'knowledge')
    parser.add_argument('-o', '--output', type=Path)
    args = parser.parse_args()
    report = describe(args.compiler, args.source)
    if args.certify:
        for row in report['pairs']:
            # A `commute_when` pair may still commute unconditionally (two
            # removals, a removal and a replacement); a checked certificate
            # then states the stronger fact.
            if row['relation'] in ('commute', 'commute_when'):
                first, second = row['first'].split('#')[0], row['second'].split('#')[0]
                row.update(certify(args.compiler, args.source, first, second, args.knowledge, args.certify))
                # Otherwise certify the conditional fact on sorted tables.
                if row['certificate'] != 'checked' and row.get('key_parameters'):
                    row.update(certify(args.compiler, args.source, first, second, args.knowledge, args.certify,
                                       row['key_parameters']))
    if args.output:
        args.output.write_text(json.dumps(report, indent=2) + '\n')
    print(markdown(report), end='')


if __name__ == '__main__':
    main()
