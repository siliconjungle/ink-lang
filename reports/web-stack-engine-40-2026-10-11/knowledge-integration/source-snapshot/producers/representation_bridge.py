#!/usr/bin/env python3
"""Propose a state-reusing bridge between representations with identical relations.

Eligibility is an authoring restriction, not correctness authority. The existing
representation migration checker must admit both endpoints and every equation.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, identity
from ink_knowledge.store import entry, read
from representations import MATH, MIG, refs, subst
from action_replacement import call, convert, trans, var


def generate(before, after, directory, via_logical=False):
    a = before['knowledge']['objects'][before['representation']]['payload']
    b = after['knowledge']['objects'][after['representation']]['payload']
    if before['input_core_sha256'] != after['input_core_sha256']:
        raise ValueError('bridge source mismatch')
    for field in (('source_objects', 'logical_state') if via_logical else ('source_objects', 'logical_state', 'physical_state', 'relations')):
        if a[field] != b[field]:
            raise ValueError('state-reusing bridge requires identical ' + field)
    objects = dict(before['knowledge']['objects'])
    for key, value in after['knowledge']['objects'].items():
        if key in objects and objects[key] != value:
            raise ValueError('conflicting endpoint object')
        objects[key] = value
    declaration = {'Function': dict(params=[['physical', a['physical_state']]],
                                   result=b['physical_state'], body=(call(b['encode'], [call(a['decode'], [var('physical')])]) if via_logical else var('physical')),
                                   recursive=None)}
    function = entry('definition', MATH, {'declaration': declaration}, refs(declaration),
                     parameters={'physical': a['physical_state']}, result=b['physical_state'])
    fid = identity(function)
    objects[fid] = function
    proofs = []
    for index, relation in enumerate(b['relations']):
        before_term = lambda side: call(relation[side], [var('physical'), var('logical')])
        after_term = lambda side: call(relation[side], [call(fid, [var('physical')]), var('logical')])
        if via_logical:
            encoded = call(b['encode'], [call(a['decode'], [var('physical')])])
            proofs.append(trans(convert(after_term('left'), encoded),
                                subst(a['snapshot'], call(b['encode'], [var('replacement')])),
                                convert(call(b['encode'], [var('logical')]), after_term('right'))))
            continue
        proofs.append(trans(convert(after_term('left'), before_term('left')),
                            {'Hypothesis': index},
                            convert(before_term('right'), after_term('right'))))
    payload = dict(**{'from': before['representation'], 'to': after['representation']},
                   function=fid, preservation=proofs)
    bridge = entry('bridge', MIG, payload, refs(payload))
    bridge['interface']['operations'] = ['migrate']
    bid = identity(bridge)
    objects[bid] = bridge
    store = Store.publish(directory, objects.values(), {'migration/state-reusing': bid})
    return dict(root=bid, knowledge=store.bundle([bid]))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('before', type=Path)
    parser.add_argument('after', type=Path)
    parser.add_argument('-o', '--output', type=Path, required=True)
    parser.add_argument('--via-logical', action='store_true', help='propose decode/encode bridge; replay must prove preservation')
    args = parser.parse_args()
    args.output.parent.mkdir(parents=True, exist_ok=True)
    result = generate(read(args.before), read(args.after), args.output.parent / 'database', args.via_logical)
    args.output.write_text(json.dumps(result, indent=2) + '\n')


if __name__ == '__main__':
    main()
