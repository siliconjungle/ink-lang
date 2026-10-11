"""Untrusted cache work-skipping analysis and ordinary equality proof producer.

The source projection and the core checker, not this analysis, establish meaning.
No metadata is used as a proof premise.
"""
from action_replacement import var, convert, trans


def variables(term):
    if isinstance(term, dict):
        if set(term) == {'Var'}:
            return {term['Var']}
        return set().union(*(variables(x) for x in term.values())) if term else set()
    if isinstance(term, list):
        return set().union(*(variables(x) for x in term)) if term else set()
    return set()


def leaves(normal, budget=256):
    pending = [normal]
    while pending:
        budget -= 1
        if budget < 0:
            raise ValueError('cache maintenance case limit')
        term = pending.pop()
        if 'If' in term:
            pending.extend([term['If']['on_true'], term['If']['on_false']])
        elif 'Construct' in term:
            yield term['Construct']
        else:
            raise ValueError('cache maintenance producer supports constructor/If action cases')


def unaffected(action, dependencies, state):
    """Conservative authoring heuristic; prove the resulting definition below."""
    for observation in leaves(action['case']['normal']):
        if observation['constructor'] == 1:  # Host failure retains state.
            continue
        args = observation['arguments']
        if args[1] == {'Bool': False}:
            continue
        if args[1] != {'Bool': True}:
            return False
        post = args[3].get('Construct', {})
        if post.get('datatype') != state or post.get('constructor') != 0:
            return False
        roots = post['arguments']
        if any(roots[i] != var(action['case']['bindings'][i]) for i in dependencies):
            return False
    return True


def cases(normal, left, right, hypotheses=0, leaf_proof=None):
    """Lift each Boolean branch equation through both exact goal contexts.

    Only the existing BoolSplit/Substitute/Convert rules are used. The core
    rechecks the complete equation, including every abort and host-failure leaf.
    """
    if 'If' not in normal:
        return leaf_proof(normal) if leaf_proof else convert(left(normal), right(normal))
    decision = normal['If']
    hole = {'If': {**decision, 'condition': var('replacement')}}
    proof = {'Hypothesis': hypotheses}
    substitute = lambda context: {'Substitute': dict(variable='replacement', context=context, equality=proof)}
    branches = {}
    for name in ['on_false', 'on_true']:
        chosen = decision[name]
        branches[name] = trans(
            substitute(left(hole)),
            cases(chosen, left, right, hypotheses + 1, leaf_proof),
            {'Sym': substitute(right(hole))},
        )
    return {'BoolSplit': dict(condition=decision['condition'], **{'from': left(normal), 'to': right(normal)}, **branches)}
