#!/usr/bin/env python3
"""Untrusted static wrapping-word energy and complementary blend laws."""
import argparse
import json
from pathlib import Path
import sys
sys.path.insert(0,str(Path(__file__).resolve().parents[1]))
from ink_knowledge import Store,canonical,identity,semantic_entry
from producers.semantic_laws import binary,law,value,var,word


def named_laws():
    entries=[]
    for t in ('U32','I32','U64'):
        s=value(t)
        x,d,k=var(s,'x'),var(s,'d'),var(s,'k')
        def square(a):return binary('*',a,a)
        centered=binary('-',binary('+',square(x),square(d)),binary('*',binary('*',word(t,2),x),d))
        entries.append((f'centered_energy_{t.lower()}',law({'x':s,'d':s},centered,square(binary('-',x,d)))))
        complement=binary('-',word(t,1),k)
        blend=binary('+',binary('*',x,k),binary('*',binary('+',x,d),complement))
        entries.append((f'complementary_blend_{t.lower()}',law({'x':s,'d':s,'k':s},blend,binary('+',x,binary('*',d,complement)))))
        calibrated=binary('*',x,d)
        expanded=binary('+',binary('+',square(calibrated),binary('*',binary('*',word(t,2),calibrated),k)),square(k))
        entries.append((f'calibrated_energy_{t.lower()}',law({'x':s,'d':s,'k':s},expanded,square(binary('+',calibrated,k)))))
    return entries


def representative_source(t='u32'):
    return f'''module Compute7;
fn centered_energy(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>x*x+seed*seed-2*x*seed);}}
fn complementary_blend(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>x*k+(x+seed)*(1-k));}}
fn calibrated_energy(xs:List<{t}>,seed:{t},k:{t})->List<{t}>{{return xs.map(fn(x)=>(x*seed)*(x*seed)+2*(x*seed)*k+k*k);}}
'''


def publish(output):
    output=Path(output)
    named=named_laws()
    objects=[semantic_entry(candidate) for _,candidate in named]
    names={name:identity(semantic_entry(candidate)) for name,candidate in named}
    store=Store.publish(output,objects,names)
    store.rebuild()
    (output/'view.json').write_bytes(canonical(store.bundle(sorted(names.values())))+b'\n')
    manifest=dict(schema=1,laws=len(objects),names=names,snapshot=store.snapshot_id,
                  scope='Static wrapping-word centered/calibrated energies and complementary blend. No F32 reassociation, artificial loop or profitability assertion.')
    (output/'manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
    return store,manifest


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-store',type=Path,required=True)
    parser.add_argument('--examples',type=Path)
    args=parser.parse_args()
    _,manifest=publish(args.output_store)
    if args.examples:args.examples.write_text(representative_source())
    print(json.dumps(manifest))
