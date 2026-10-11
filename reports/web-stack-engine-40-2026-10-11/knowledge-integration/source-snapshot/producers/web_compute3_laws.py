#!/usr/bin/env python3
"""Untrusted captured-branch, complementary-blend and projection laws."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import binary, bound, lam, law, op, value, var, word


def induction():
    return {'Induction': dict(variable='n', names=['previous_count'],
                             base='Normalize', step='Normalize')}


def through_repeat(repeat, result):
    # Normalize the captured decision first. The induction goal then has no
    # branch-bearing endpoints whose normalization would change the IH shape.
    return {'Trans': dict(middle=repeat, left='Normalize', right={
        'Trans': dict(middle=result, left=induction(), right='Normalize')})}


def named_laws():
    entries = []
    for t in ('U32', 'I32', 'U64'):
        s = value(t)
        n, x, k, d = var('Nat', 'n'), var(s, 'x'), var(s, 'k'), var(s, 'd')
        c, a = var(value('Bool'), 'c'), bound(s, 0)
        count = op(s, 'nat.word', n)
        def choose(yes, no):
            return op(s, 'call:choose', c, yes, no)
        def repeat(initial, body):
            return op(s, 'call:repeat', n, initial, lam(value('U32'), lam(s, body)))
        plus, minus = binary('+', a, k), binary('-', a, d)
        added = binary('+', x, binary('*', count, k))
        subtracted = binary('-', x, binary('*', count, d))
        proof = {'Cases': dict(condition=c,
            on_false=through_repeat(repeat(x, minus), subtracted),
            on_true=through_repeat(repeat(x, plus), added))}
        entries.append((f'captured_branch_repeat_{t.lower()}', law(
            {'n': 'Nat', 'x': s, 'k': s, 'd': s, 'c': value('Bool')},
            repeat(x, choose(plus, minus)), choose(added, subtracted), proof)))

        complement = binary('-', word(t, 1), k)
        blend = binary('+', binary('*', a, k), binary('*', binary('+', a, d), complement))
        translated = binary('+', x, binary('*', count, binary('*', d, complement)))
        entries.append((f'affine_blend_repeat_{t.lower()}', law(
            {'n': 'Nat', 'x': s, 'k': s, 'd': s}, repeat(x, blend), translated, induction())))

        projected = choose(k, x)
        proof = {'Cases': dict(condition=c,
            on_false=through_repeat(repeat(x, a), x),
            on_true=through_repeat(repeat(k, k), k))}
        entries.append((f'captured_projection_repeat_{t.lower()}', law(
            {'n': 'Nat', 'x': s, 'k': s, 'c': value('Bool')},
            repeat(projected, choose(k, a)), projected, proof)))
    return entries


def representative_source(repetitions=256, t='u32'):
    return f'''module Compute3;
fn captured_branch_repeat(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>choose(x<seed,a+k,a-seed)));}}
fn affine_blend_repeat(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({repetitions},x,fn(i)=>fn(a)=>a*k+(a+seed)*(1-k)));}}
fn captured_mask_repeat(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>repeat({repetitions},choose(x<seed,seed,x),fn(i)=>fn(a)=>choose(x<seed,seed,a)));}}
'''


def publish(output):
    output = Path(output)
    named = named_laws()
    objects = [semantic_entry(candidate) for _, candidate in named]
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, objects, names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(objects), names=names, snapshot=store.snapshot_id,
                    scope='U32/I32/U64 wrapping words; fixed captured Bool decisions; no F32 reassociation or target profitability assertion.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    parser.add_argument('--examples', type=Path)
    parser.add_argument('--repeat-count', type=int, default=256)
    args = parser.parse_args()
    _, manifest = publish(args.output_store)
    if args.examples:
        args.examples.write_text(representative_source(args.repeat_count))
    print(json.dumps(manifest))


if __name__ == '__main__':
    main()
