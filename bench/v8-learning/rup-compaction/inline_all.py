"""Untrusted RUP graph factoring. Every result still needs ordinary kernel replay.

Root consequences become reusable unit lemmas. Single-use unit lemmas are then
inlined where strict unit propagation permits it. Finally only the dependency
closure of the last contradiction survives, with clause identities remapped.
There are no source operators, theorem identities or new proof rules here.
"""
from collections import defaultdict
import json
import time

from producers.bitvector_proofs import HintBuilder


def _bytes(certificate):
    return len(json.dumps(certificate, sort_keys=True, separators=(',', ':')).encode())


def _trim(certificate, original, steps, check):
    needed = {len(steps) - 1}
    pending = list(needed)
    while pending:
        check()
        for hint in steps[pending.pop()]['hints']:
            if hint >= original and hint - original not in needed:
                needed.add(hint - original)
                pending.append(hint - original)
    order = sorted(needed)
    remap = {old: original + i for i, old in enumerate(order)}
    return dict(certificate, steps=[dict(
        clause=list(steps[i]['clause']),
        hints=[h if h < original else remap[h - original] for h in steps[i]['hints']]
    ) for i in order])


def _factor(problem, certificate, deadline):
    builder = HintBuilder(problem['clauses'], deadline)
    original = len(builder.clauses)
    steps, values, reasons, queue = [], {}, {}, []

    def state(lit):
        return None if abs(lit) not in values else values[abs(lit)] == (lit > 0)

    def assign(lit, reason):
        values[abs(lit)] = lit > 0
        reasons[abs(lit)] = reason
        queue.append(lit)

    # Leave room for every original solver clause. These are authoring bounds,
    # not permission to enlarge the kernel's step/hint/work limits.
    limit = max(0, 20000 - len(certificate['steps']))
    conflict = bool(builder.empty)
    for index in tuple(builder.units):
        lit = builder.clauses[index][0]
        if state(lit) is False:
            conflict = True
            break
        if state(lit) is None:
            assign(lit, index)
    head = 0
    while not conflict and head < len(queue) and len(steps) < limit:
        builder.check_deadline()
        false = -queue[head]
        head += 1
        watched = builder.watches.setdefault(false, [])
        position = 0
        while position < len(watched) and len(steps) < limit:
            builder.check_deadline()
            index = watched[position]
            clause = builder.clauses[index]
            ps = builder.positions[index]
            slot = 0 if clause[ps[0]] == false else 1
            other = clause[ps[1 - slot]]
            if state(other) is True:
                position += 1
                continue
            replacement = next((i for i, lit in enumerate(clause)
                                if i not in ps and state(lit) is not False), None)
            if replacement is not None:
                ps[slot] = replacement
                watched[position] = watched[-1]
                watched.pop()
                builder.watches.setdefault(clause[replacement], []).append(index)
                continue
            if state(other) is False:
                conflict = True
                break
            hints = list(dict.fromkeys(reasons[abs(lit)] for lit in clause if lit != other)) + [index]
            steps.append(dict(clause=[other], hints=hints))
            unit = len(builder.clauses)
            builder.add([other])
            assign(other, unit)
            position += 1
    prefix = len(steps)
    if conflict:
        steps.append(dict(clause=[], hints=builder.hints([])))
    else:
        for step in certificate['steps']:
            builder.check_deadline()
            clause = step['clause']
            steps.append(dict(clause=list(clause), hints=builder.hints(clause)))
            builder.add(clause)
    return _trim(certificate, original, steps, builder.check_deadline), prefix


def _inline(problem, certificate, check):
    original = len(problem['clauses'])
    steps = [dict(clause=list(s['clause']), hints=list(s['hints'])) for s in certificate['steps']]
    clauses = problem['clauses'] + [s['clause'] for s in steps]
    active = set(range(len(steps)))
    uses = defaultdict(set)
    for i, step in enumerate(steps):
        check()
        for hint in step['hints']:
            uses[hint].add(i)

    def normalize(clause, hints):
        values, result = {}, []
        for lit in clause:
            if abs(lit) in values and values[abs(lit)] != (lit < 0):
                return []  # Negating a tautological clause already contradicts.
            values[abs(lit)] = lit < 0
        for hint in hints:
            check()
            source = clauses[hint]
            if any(abs(lit) in values and values[abs(lit)] == (lit > 0) for lit in source):
                continue
            unknown = [lit for lit in source if abs(lit) not in values]
            if len(unknown) > 1:
                return None
            result.append(hint)
            if not unknown:
                return result
            values[abs(unknown[0])] = unknown[0] > 0
        return None

    count = 0
    for passes in range(1, 9):
        changed = False
        for i, step in enumerate(steps):
            check()
            if i not in active or not step['clause']:
                continue
            consumers = uses[original + i] & active
            if len(consumers) != 1:
                continue
            j = next(iter(consumers))
            old = steps[j]['hints']
            expanded_size = len(old) + old.count(original + i) * (len(step['hints']) - 1)
            if expanded_size > 100000:
                continue
            expanded = [h for hint in old for h in (step['hints'] if hint == original + i else [hint])]
            new = normalize(steps[j]['clause'], expanded)
            if new is None:
                continue
            for hint in set(old):
                uses[hint].discard(j)
            for hint in set(new):
                uses[hint].add(j)
            steps[j]['hints'] = new
            active.remove(i)
            for hint in set(step['hints']):
                uses[hint].discard(i)
            count += 1
            changed = True
        if not changed:
            break
    return _trim(certificate, original, steps, check), count, passes


def compact_certificate(problem, certificate, seconds=30):
    """Return the smallest candidate plus observations, without changing inputs.

    This opt-in, bounded authoring pass never admits a proof or changes CNF. It
    preserves the exact problem hash, encoding and additional certificate fields.
    A timeout raises ValueError; callers may retain their original certificate.
    Byte selection is an untrusted packaging heuristic, not a kernel work bound.
    """
    if not 0 < seconds <= 600:
        raise ValueError('compaction budget must be in (0,600] seconds')
    if (certificate['problem_sha256'] != problem['sha256'] or
            certificate.get('encoding') != problem.get('encoding')):
        raise ValueError('certificate problem/encoding mismatch')
    original = len(problem['clauses'])
    steps = certificate['steps']
    if not steps or steps[-1]['clause']:
        raise ValueError('certificate must end in a contradiction')
    if len(steps) > 20000 or any(len(s['hints']) > 100000 for s in steps):
        raise ValueError('certificate exceeds compaction authoring bounds')
    deadline = time.monotonic() + seconds

    def check():
        if time.monotonic() >= deadline:
            raise ValueError('Proof compaction exceeded its total time budget')

    for i, step in enumerate(steps):
        check()
        if any(type(h) is not int or not 0 <= h < original + i for h in step['hints']):
            raise ValueError('certificate contains a non-earlier clause reference')
    factored, prefix = _factor(problem, certificate, deadline)
    inlined, count, passes = _inline(problem, factored, check)
    check()
    candidates = [certificate, factored, inlined]
    sizes = [_bytes(c) for c in candidates]
    check()
    selected = min(range(len(candidates)), key=lambda i: sizes[i])
    return candidates[selected], dict(
        candidate_bytes=sizes, selected=['original', 'factored', 'inlined'][selected],
        prefix_units=prefix, inlined_units=count, passes=passes)
