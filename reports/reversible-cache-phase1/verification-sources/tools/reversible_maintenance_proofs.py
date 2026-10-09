#!/usr/bin/env python3
"""Untrusted producer of saved/apply/restore expressions and their exact proofs."""
import argparse, hashlib, json, subprocess
from pathlib import Path
from integer_proofs import congruence, use, sym, trans
from inductive_proofs import var, call, construct, refl
ROOT=Path(__file__).resolve().parents[1]
def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory',type=Path)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink')
    parser.add_argument('--kernel',type=Path,default=ROOT/'build/reversible-original/lang')
    args=parser.parse_args();args.directory.mkdir(parents=True,exist_ok=True)
    evidence=json.loads((ROOT/'knowledge/delta-maintenance/delta.evidence.json').read_text())
    names=json.loads((ROOT/'knowledge/delta-maintenance/names.json').read_text())
    ids=evidence['model'];bundle=evidence['library'];objects=args.directory/'objects';objects.mkdir(exist_ok=True)
    for identity,raw in bundle['objects'].items():(objects/f'{identity}.json').write_text(raw)
    def references(v):
        if isinstance(v,list):return set().union(*(references(x) for x in v))
        if not isinstance(v,dict):return set()
        out=set()
        for k,x in v.items():
            if k in ('datatype','function','theorem') and isinstance(x,str):out.add(x)
            if k=='Data':out.add(x)
            out|=references(x)
        return out
    def theorem(name,params,left,right,proof):
        declaration=dict(params=params,conditions=[],**{'from':left,'to':right},proof=proof)
        raw=json.dumps(dict(schema=1,semantics=bundle['lock']['semantics'],name=name,
             dependencies=sorted(references(declaration)|{ids['Natural'],ids['Integer']}),
             declaration={'Theorem':declaration}),separators=(',',':'))+'\n'
        identity=hashlib.sha256(raw.encode()).hexdigest();names[name]=identity
        bundle['objects'][identity]=raw;bundle['lock']['objects'].append(identity)
        (objects/f'{identity}.json').write_text(raw)
        lock=args.directory/'lock.json';lock.write_text(json.dumps(bundle['lock'],indent=2)+'\n')
        subprocess.run([str(args.kernel.resolve()),'verify-library',str(lock)],check=True,capture_output=True)
        print(name+': checked by original kernel',flush=True);return identity
    I={'Data':ids['Integer']};x,y,total,old,new=map(var,('x','y','total','old','new'))
    Z=construct(ids['Integer'],0);add=lambda a,b:call(ids['addition'],a,b);sub=lambda a,b:call(ids['subtraction'],a,b)
    self_sub=theorem('subtraction_self',[['y',I]],sub(y,y),Z,
        trans(congruence(ids['subtraction'],sym(use(names['addition_zero_left'],y)),refl(y)),use(names['cancel_addition'],Z,y)))
    undo_sub=theorem('undo_subtraction',[['x',I],['y',I]],add(sub(x,y),y),x,
        trans(sym(use(names['addition_delta_first'],x,y,y)),congruence(ids['addition'],refl(x),use(self_sub,y)),refl(x)))
    v=lambda n:{'Var':n}
    binary=lambda op,a,b:{'Binary':[op,a,b]}
    applied=lambda op:binary(op,v('total'),v('saved'))
    action=lambda save,op,restore,forward,inverse:dict(save=save,apply=applied(op),restore=applied(restore),forward=forward,inverse=inverse)
    evidence['journal']=dict(
        insert=action(v('new'),'+','-',refl(add(total,new)),use(names['cancel_addition'],total,new)),
        replace=action(binary('-',v('new'),v('old')),'+','-',refl(add(total,sub(new,old))),use(names['cancel_addition'],total,sub(new,old))),
        remove=action(v('old'),'-','+',refl(sub(total,old)),use(undo_sub,total,old)))
    (args.directory/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    source=args.directory/'reversible.ink';source.write_text((ROOT/'knowledge/delta-maintenance/delta.ink').read_text())
    for name,journal in [('reversible',evidence['journal']),('snapshot',dict(
        insert=dict(save=v('total'),apply=binary('+',v('total'),v('new')),restore=v('saved'),forward=refl(add(total,new)),inverse=refl(total)),
        replace=dict(save=v('total'),apply=binary('+',v('total'),binary('-',v('new'),v('old'))),restore=v('saved'),forward=refl(add(total,sub(new,old))),inverse=refl(total)),
        remove=dict(save=v('total'),apply=binary('-',v('total'),v('old')),restore=v('saved'),forward=refl(sub(total,old)),inverse=refl(total))))]:
        (args.directory/f'{name}.ink').write_text(source.read_text())
        candidate=dict(evidence,journal=journal)
        path=args.directory/f'{name}.evidence.json';path.write_text(json.dumps(candidate,indent=2)+'\n')
        cert=args.directory/f'{name}.json'
        subprocess.run([str(args.compiler.resolve()),'prove-maintenance',str(source),'--evidence',str(path),'-o',str(cert)],check=True)
        subprocess.run([str(args.compiler.resolve()),'verify-maintenance',str(cert)],check=True)
if __name__=='__main__':main()
