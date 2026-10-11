#!/usr/bin/env python3
"""Emit a closed Boolean equality derivation for the independent Lean kernel.
The translator is not verified. Ink's Rust check and exact input/output hashes
are retained; this tool grants no new optimisation authority.
"""
import argparse, hashlib, json, sys
from pathlib import Path

def emit(obj):
    params=obj['params']
    if len(params)>8 or any(t!='Bool' for _,t in params):
        raise ValueError('Lean verdict currently supports at most eight Boolean parameters')
    names={n:i for i,(n,_) in enumerate(params)}
    if len(names)!=len(params):raise ValueError('duplicate Boolean parameter')
    budget=[10000]
    def step(depth):
        budget[0]-=1
        if depth>64 or budget[0]<0:raise ValueError('Boolean verdict work/depth limit')
    def term(e,d=0):
        step(d)
        if not isinstance(e,dict) or len(e)!=1:raise ValueError('invalid Boolean term')
        if 'Var' in e:return f'(Term.var {names[e["Var"]]})'
        if 'Bool' in e and isinstance(e['Bool'],bool):return f'(Term.lit {str(e["Bool"]).lower()})'
        if 'Binary' in e:
            op,a,b=e['Binary'];kind={'&&':'and','||':'or','==':'eq','!=':'ne'}[op]
            return f'(Term.bin .{kind} {term(a,d+1)} {term(b,d+1)})'
        raise ValueError('unsupported Boolean term')
    def sub(e,n,v):
        if e=={'Var':n}:return {'Bool':v}
        if 'Binary' in e:
            op,a,b=e['Binary'];return {'Binary':[op,sub(a,n,v),sub(b,n,v)]}
        return e
    def proof(p,ctx,d=0):
        step(d)
        if not isinstance(p,dict) or len(p)!=1:raise ValueError('invalid proof')
        kind,value=next(iter(p.items()))
        if kind=='Refl':return f'(@Derives.refl {context(ctx)} {term(value)})'
        if kind=='Hypothesis':
            a,b=ctx[value];return f'(@Derives.hyp {term(a)} {term(b)} {context(ctx)} (by decide))'
        if kind=='Sym':return f'(Derives.sym {proof(value,ctx,d+1)})'
        if kind=='Trans':return f'(Derives.trans {proof(value[0],ctx,d+1)} {proof(value[1],ctx,d+1)})'
        if kind=='Binary':
            op={'&&':'and','||':'or','==':'eq','!=':'ne'}[value['op']]
            return f'(Derives.binary (o:=.{op}) {proof(value["left"],ctx,d+1)} {proof(value["right"],ctx,d+1)})'
        if kind=='Compute':
            a,b=term(value['from']),term(value['to'])
            return f'(@Derives.compute {a} {b} {context(ctx)} (by decide) (by decide) (by decide))'
        if kind=='BoolCases':
            n=value['variable'];a,b=term(value['from']),term(value['to'])
            branches=[proof(value['on_'+str(v).lower()],[(sub(x,n,v),sub(y,n,v)) for x,y in ctx],d+1) for v in [False,True]]
            return f'(@Derives.cases {context(ctx)} {names[n]} {a} {b} {branches[0]} {branches[1]})'
        # The remaining historical rules need explicit checked dependency expansion.
        raise ValueError('unsupported independent verdict rule: '+kind)
    def context(ctx):return '['+','.join(f'({term(a)},{term(b)})' for a,b in ctx)+']'
    a,b=term(obj['from']),term(obj['to'])
    derivation=proof(obj['proof'],[])
    return f'\nnamespace InkBoolean\ndef certificate : Derives [] {a} {b} := {derivation}\ntheorem verdict : ∀ ρ, eval ρ {a} = eval ρ {b} := closed_sound certificate\n#print axioms verdict\nend InkBoolean\n'

def main():
    ap=argparse.ArgumentParser(description=__doc__);ap.add_argument('input');ap.add_argument('-o',required=True,type=Path);args=ap.parse_args()
    raw=sys.stdin.buffer.read(1000001) if args.input=='-' else Path(args.input).read_bytes()
    if len(raw)>1000000:raise ValueError('Boolean verdict input exceeds byte limit')
    kernel=Path(__file__).resolve().parents[1]/'research/verified-kernel/BooleanKernel.lean'
    args.o.parent.mkdir(parents=True,exist_ok=True)
    args.o.write_text(kernel.read_text()+emit(json.loads(raw)))
    print(json.dumps({'input_sha256':hashlib.sha256(raw).hexdigest(),'kernel_sha256':hashlib.sha256(kernel.read_bytes()).hexdigest(),'lean_source_sha256':hashlib.sha256(args.o.read_bytes()).hexdigest()}))
if __name__=='__main__':main()
