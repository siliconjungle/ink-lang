#!/usr/bin/env python3
"""Extend exact maintenance with a checked delta-first candidate, without a core change."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from integer_proofs import induction, congruence, use, sym, trans
from inductive_proofs import var, call, construct, refl

ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('directory',type=Path)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink');args=parser.parse_args()
    base=ROOT/'knowledge/exact-maintenance/canonical.evidence.json'
    evidence=json.loads(base.read_text());ids=evidence['model'];bundle=evidence['library']
    args.directory.mkdir(parents=True,exist_ok=True);objects=args.directory/'objects';objects.mkdir(exist_ok=True)
    for identity,data in bundle['objects'].items():(objects/f'{identity}.json').write_text(data)
    names=json.loads((ROOT/'knowledge/exact-integers/names.json').read_text())
    compiler=args.compiler.resolve()
    def references(value):
        if isinstance(value,list):return set().union(*(references(v) for v in value))
        if not isinstance(value,dict):return set()
        found=set()
        for key,item in value.items():
            if key in ('datatype','function','theorem') and isinstance(item,str):found.add(item)
            if key=='Data':found.add(item)
            found|=references(item)
        return found
    def theorem(name,params,left,right,proof):
        declaration=dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof)
        deps=sorted(references(declaration)|{ids['Natural'],ids['Integer']})
        raw=json.dumps(dict(schema=1,semantics=bundle['lock']['semantics'],name=name,
                            dependencies=deps,declaration={'Theorem':declaration}),separators=(',',':'))+'\n'
        identity=hashlib.sha256(raw.encode()).hexdigest();(objects/f'{identity}.json').write_text(raw)
        bundle['objects'][identity]=raw;bundle['lock']['objects'].append(identity);names[name]=identity
        lock=args.directory/'lock.json';lock.write_text(json.dumps(bundle['lock'],indent=2)+'\n')
        subprocess.run([str(compiler),'verify-library',str(lock)],check=True,capture_output=True)
        print(name+': checked',flush=True);return identity
    I={'Data':ids['Integer']};x,y,z,n=map(var,('x','y','z','n'))
    zero=construct(ids['Integer'],0);positive=lambda n:construct(ids['Integer'],1,n)
    negative=lambda n:construct(ids['Integer'],2,n)
    add=lambda a,b:call(ids['addition'],a,b);sub=lambda a,b:call(ids['subtraction'],a,b)
    neg=lambda a:call(ids['negation'],a)
    left=sub(x,y);right=add(x,neg(y))
    # The definition is opaque on a variable recursive parameter. Exhaustive
    # cases unfold the exact body; no subtraction axiom is installed.
    proof=induction('y',left,right,([],refl(sub(x,zero))),
                    (['n'],refl(sub(x,positive(n)))),(['n'],refl(sub(x,negative(n)))))
    sub_add=theorem('subtraction_as_addition',[['x',I],['y',I]],left,right,proof)
    left=add(x,sub(y,z));right=add(sub(x,z),y)
    proof=trans(congruence(ids['addition'],refl(x),use(sub_add,y,z)),
                congruence(ids['addition'],refl(x),use(names['addition_commutes'],y,neg(z))),
                sym(use(names['addition_associates'],x,neg(z),y)),
                congruence(ids['addition'],sym(use(sub_add,x,z)),refl(y)))
    delta=theorem('addition_delta_first',[['x',I],['y',I],['z',I]],left,right,proof)
    prefix,suffix,old,new=map(var,('prefix','suffix','old','new'))
    before=call(ids['sum_integers'],call(ids['append'],prefix,construct(ids['IntegerList'],1,old,suffix)))
    evidence['replace']=trans(use(delta,before,new,old),evidence['replace'])
    (args.directory/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    path=args.directory/'delta.evidence.json';path.write_text(json.dumps(evidence,indent=2)+'\n')
    source=args.directory/'delta.ink';source.write_text('''module exact_sum_delta;
fn insert(total: Int, new: Int) -> Int { return total + new; }
fn replace(total: Int, old: Int, new: Int) -> Int { return total + (new - old); }
fn remove(total: Int, old: Int) -> Int { return total - old; }
''')
    cert=args.directory/'delta.json'
    subprocess.run([str(compiler),'prove-maintenance',str(source),'--evidence',str(path),'-o',str(cert)],check=True)
    subprocess.run([str(compiler),'verify-maintenance',str(cert)],check=True)

if __name__=='__main__':main()
