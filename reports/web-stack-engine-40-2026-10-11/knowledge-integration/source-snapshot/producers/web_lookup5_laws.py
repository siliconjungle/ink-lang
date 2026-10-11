#!/usr/bin/env python3
"""Untrusted executable mapped-head work skipping with exact mapped fallback."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store, canonical, identity, semantic_entry
from producers.semantic_laws import binary, bound, lam, law, op, value, var, word


def named_laws():
    result = []
    for t in ('U32', 'I32', 'U64', 'F32'):
        s, ls = value(t), value({'List': t})
        xs, z, k, c = var(ls, 'xs'), var(s, 'z'), var(s, 'k'), var(s, 'c')
        head = op(s, 'method:at_or', xs, word('U32', 0), z)
        proof = {'Induction': dict(variable='xs', names=['head', 'tail'],
                                  base='Normalize', step='Normalize')}
        transforms = [
            ('scaled_head', s, {'xs': ls, 'z': s, 'k': s},
             lambda item: binary('*', item, k)),
            ('affine_head', s, {'xs': ls, 'z': s, 'k': s, 'c': s},
             lambda item: binary('+', binary('*', item, k), c)),
            ('threshold_head', value('Bool'), {'xs': ls, 'z': s, 'k': s},
             lambda item: op(value('Bool'), 'binary:<', item, k)),
        ]
        for name, output, params, transform in transforms:
            output_list = value({'List': 'Bool'}) if name == 'threshold_head' else ls
            mapped = op(output_list, 'method:map', xs, lam(s, transform(bound(s, 0))))
            source = op(output, 'method:at_or', mapped, word('U32', 0), transform(z))
            result.append((name+'_'+t.lower(), law(params, source, transform(head), proof)))
    return result


def source_functions():
    result = []
    for name, _ in named_laws():
        t = name.rsplit('_', 1)[1]
        params = f'xs:List<{t}>,z:{t},k:{t}'
        if name.startswith('scaled_head_'):
            body, output = 'xs.map(fn(x)=>x*k).at_or(0,z*k)', t
        elif name.startswith('affine_head_'):
            params += f',c:{t}'
            body, output = 'xs.map(fn(x)=>x*k+c).at_or(0,z*k+c)', t
        else:
            body, output = 'xs.map(fn(x)=>x<k).at_or(0,z<k)', 'Bool'
        result.append((name, f'pub fn {name}({params})->{output}{{return {body};}}'))
    return result


def publish(output):
    output = Path(output)
    named = named_laws()
    names = {name: identity(semantic_entry(candidate)) for name, candidate in named}
    store = Store.publish(output, [semantic_entry(candidate) for _, candidate in named], names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest = dict(schema=1, laws=len(named), snapshot=store.snapshot_id, names=names,
        scope='Scaled, affine and threshold mapped first-element lookup; mapped fallback and F32 operation order preserved; no timing premise.')
    (output/'manifest.json').write_text(json.dumps(manifest, indent=2)+'\n')
    return store, manifest


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store', type=Path, required=True)
    _, manifest = publish(parser.parse_args().output_store)
    print(json.dumps(manifest))
