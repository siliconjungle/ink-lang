"""Untrusted exact sharing proposals for pure scalar source expressions.

Lexical scopes are kept separate. Existing lambda/application syntax supplies
explicit sharing, and every whole-function candidate needs an ordinary Normalize
proof and the usual source binding. These bounds limit proposal work only.
"""
from collections import Counter
from ink_knowledge import canonical
from ink_planner.semantic_search import children, positions, replace, set_child, shift
from producers.semantic_laws import bound, lam, law, op
from producers.beta_specialization15 import free_parameters

SCALARS = ('U32', 'U64', 'I32', 'F32', 'Bool')


def candidates(scope):
    counts, terms, sizes = Counter(), {}, {}
    pending = [scope]
    key_bytes = 0
    while pending:
        term = pending.pop()
        node = term['node']
        if isinstance(node, dict) and 'Lambda' in node:
            continue
        if isinstance(term['sort'], dict) and term['sort'].get('Value') in SCALARS and isinstance(node, dict) and 'Op' in node:
            key = canonical(term)
            key_bytes += len(key)
            if key_bytes > 2_000_000:
                return []
            counts[key] += 1
            terms[key] = term
        pending.extend(children(term))
    for key, term in terms.items():
        if counts[key] > 1:
            sizes[key] = sum(1 for _ in positions(term))
    return [terms[k] for k in sorted(sizes, key=lambda k: (-(sizes[k]-1)*(counts[k]-1), k))[:4]
            if sizes[k] >= 3]


def share(scope, expression):
    """Insert a binder while retaining every pre-existing outer reference."""
    moved = shift(scope, 1)
    needle = canonical(shift(expression, 1))
    def visit(term):
        if canonical(term) == needle:
            return bound(expression['sort'], 0)
        if isinstance(term['node'], dict) and 'Lambda' in term['node']:
            return term
        for i, child in enumerate(children(term)):
            term = set_child(term, i, visit(child))
        return term
    return op(scope['sort'], 'apply', lam(expression['sort'], visit(moved)), expression)


def specialize(subject, core):
    rows = []
    for name, body in sorted(subject.get('functions', {}).items()):
        sites = []
        for path, term in positions(body):
            sites.append((path, term))
            if len(sites) > 4096:
                break
        if len(sites) > 4096:
            continue
        scopes = [((), body)] + [(path+(0,), term['node']['Lambda']) for path, term in sites
                                if isinstance(term['node'], dict) and 'Lambda' in term['node']]
        for path, scope in scopes[:32]:
            for expression in candidates(scope):
                target = replace(body, path, share(scope, expression))
                rows.append(('share/'+name+'/'+str(len(rows)), law(free_parameters(body), body, target)))
                if len(rows) >= 128:
                    return rows
    return rows
