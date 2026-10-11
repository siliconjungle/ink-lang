"""Untrusted portable context construction for ordinary checked semantic laws.

No optimiser-specific proof rule: callers still supply Normalize/Use/Trans/etc.
Function signatures and exact typed bodies come from the checked semantic subject.
The independent checker validates definitions, identities and the resulting proof.
"""
import copy
from ink_knowledge import canonical, identity


def calls(value, names):
    found = set()

    def walk(v):
        if isinstance(v, dict):
            op = v.get('node', {}).get('Op') if isinstance(v.get('node'), dict) else None
            if op and op[0].startswith('call:') and op[0][5:] in names:
                found.add(op[0][5:])
            for child in v.values():
                walk(child)
        elif isinstance(v, list):
            for child in v:
                walk(child)

    walk(value)
    return found


def capture(core, subject, roots):
    program = core['program']
    functions = {f['name']: f for f in program['functions']}
    definitions = {}

    def visit(name, active):
        if name in definitions:
            return
        if name in active:
            raise ValueError('cyclic definition context')
        if len(active) >= 64 or len(active) + len(definitions) >= 128:
            raise ValueError('definition context closure limit')
        function = functions[name]
        body = subject['functions'][name]
        callees = calls(body, functions)
        for callee in sorted(callees):
            visit(callee, active | {name})
        definition = dict(params=copy.deepcopy(function['params']), result=function['result'],
                          body=copy.deepcopy(body),
                          callees={n: definitions[n]['sha256'] for n in sorted(callees)})
        definitions[name] = dict(sha256=identity(definition), definition=definition)

    for root in sorted(set(roots)):
        visit(root, set())
    context = dict(schema=1, definitions=dict(sorted(definitions.items())),
                   records=copy.deepcopy(program.get('records', {})),
                   enums=copy.deepcopy(program.get('enums', {})))
    if len(canonical(context)) > 4_000_000:
        raise ValueError('definition context byte limit')
    return context


def bind(law, core, subject, roots=None):
    result = copy.deepcopy(law)
    names = {f['name'] for f in core['program']['functions']}
    if roots is None:
        roots = calls(law, names)
    result['definition_context'] = capture(core, subject, roots)
    return result
