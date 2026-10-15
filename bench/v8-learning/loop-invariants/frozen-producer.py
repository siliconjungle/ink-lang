"""Guarded lexical hoisting proposals, replayed as ordinary source equalities.

Only strict regions of non-stopping list callbacks are examined. The empty-list
guard retains the original expression when no callback executes. Bounds and
structural costs constrain proposal work; neither grants equality authority.
"""
from ink_knowledge import canonical
from ink_planner.semantic_search import children, extract_hole, positions, replace, set_child, shift
from producers.beta_specialization15 import free_parameters
from producers.common_subexpressions import barrier, SCALARS
from producers.semantic_laws import bound, lam, law, op, value, word

CALLBACKS = {'method:map': (1, 1), 'method:filter': (1, 1), 'call:foldl': (2, 2), 'call:foldr': (2, 2)}


def callback_body(loop):
    node = loop['node']
    call = node.get('Op') if isinstance(node, dict) else None
    if not call or call[0] not in CALLBACKS:
        return None
    index, depth = CALLBACKS[call[0]]
    args = call[1]
    if len(args) != index + 1:
        return None
    receiver = args[0]
    if not isinstance(receiver['node'], dict) or not ({'Free','Bound'} & receiver['node'].keys()):
        return None
    if not isinstance(receiver['sort'], dict) or not isinstance(receiver['sort'].get('Value'), dict) or 'List' not in receiver['sort']['Value']:
        return None
    inner = args[index]
    for _ in range(depth):
        if not isinstance(inner['node'], dict) or 'Lambda' not in inner['node']:
            return None
        inner = inner['node']['Lambda']
    return index, depth, inner


def candidates(body, depth):
    pending, found, key_bytes = [body], {}, 0
    while pending:
        term = pending.pop()
        node = term['node']
        if isinstance(term['sort'], dict) and term['sort'].get('Value') in SCALARS and isinstance(node, dict) and 'Op' in node:
            try:
                extracted = extract_hole(term, depth)
            except ValueError:
                pass
            else:
                size = sum(1 for _ in positions(term))
                if size >= 8:
                    key = canonical(term)
                    key_bytes += len(key)
                    if key_bytes > 2_000_000:
                        return []
                    found[key] = (size, term, extracted)
        # A whole lazy expression may move, but its conditional children never
        # become unconditional. A nested callback gets its own proposal site.
        if not barrier(term):
            pending.extend(children(term))
    return [found[k][1:] for k in sorted(found, key=lambda k: (-found[k][0], k))[:4]]


def hoist(loop, index, depth, expression, extracted):
    moved = shift(loop, 1)
    needle = canonical(shift(expression, 1, depth))
    def visit(term):
        if canonical(term) == needle:
            return bound(expression['sort'], depth)
        if barrier(term):
            return term
        for i, child in enumerate(children(term)):
            term = set_child(term, i, visit(child))
        return term
    def descend(term, remaining):
        return set_child(term, 0, descend(children(term)[0], remaining-1)) if remaining else visit(term)
    moved = set_child(moved, index, descend(children(moved)[index], depth))
    cached = op(loop['sort'], 'apply', lam(expression['sort'], moved), extracted)
    nonempty = op(value('Bool'), 'binary:!=', op(value('U64'), 'call:count', children(loop)[0]), word('U64', 0))
    return op(loop['sort'], 'call:choose', nonempty, cached, loop)


def specialize(subject, core):
    rows = []
    for name, body in sorted(subject.get('functions', {}).items())[:256]:
        sites = []
        for path, term in positions(body):
            sites.append((path, term))
            if len(sites) > 4096:
                break
        if len(sites) > 4096:
            continue
        loops = 0
        for path, loop in sites:
            info = callback_body(loop)
            if info is None:
                continue
            loops += 1
            if loops > 32:
                break
            index, depth, inner = info
            for expression, extracted in candidates(inner, depth):
                target = replace(body, path, hoist(loop, index, depth, expression, extracted))
                rows.append(('hoist/'+name+'/'+str(len(rows)), law(free_parameters(body), body, target)))
                if len(rows) >= 128:
                    return rows
    return rows
