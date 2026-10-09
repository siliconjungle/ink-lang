#!/usr/bin/env python3
"""Independent Python arithmetic oracle versus Ink's CNF, using external SAT.

Requires python-sat==1.9.dev5. This validates encoding, not solver certificates
or all inputs. Accepted optimisation theorems still require the Rust checker.
"""
import argparse, hashlib, itertools, json, random, shutil, subprocess, threading
from pathlib import Path
from pysat.solvers import Glucose3

ROOT = Path(__file__).resolve().parents[1]
MASK = (1 << 64) - 1

def var(name): return {'Var':name}
def binary(op,left,right): return {'Binary':dict(op=op,left=left,right=right)}
def binding(encoded,value):
    if 'Bool' in encoded: return [encoded['Bool'] * (1 if value else -1)]
    return [literal if value & (1 << bit) else -literal for bit,literal in enumerate(encoded['Word'])]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink')
    parser.add_argument('--report',type=Path,default=ROOT/'reports/bitvector-proof-phase1')
    args=parser.parse_args();compiler=args.compiler.resolve();report=args.report.resolve()
    directory=report/'semantic-obligations';directory.mkdir(parents=True,exist_ok=True)
    scratch=ROOT/'build/bitvector-semantics';scratch.mkdir(parents=True,exist_ok=True)
    rng=random.Random(261019);boundary=[0,1,2,MASK,MASK-1,1<<63,(1<<63)-1]
    words=[dict(p0=x,p1=y) for x,y in itertools.product(boundary,repeat=2)]
    words += [dict(p0=rng.getrandbits(64),p1=rng.getrandbits(64)) for _ in range(64)]
    booleans=[dict(p0=x,p1=y) for x,y in itertools.product([False,True],repeat=2)]
    arithmetic={'+':lambda x,y:(x+y)&MASK,'-':lambda x,y:(x-y)&MASK,'*':lambda x,y:(x*y)&MASK}
    comparisons={'==':lambda x,y:x==y,'!=':lambda x,y:x!=y,'<':lambda x,y:x<y,'>':lambda x,y:x>y,'<=':lambda x,y:x<=y,'>=':lambda x,y:x>=y}
    cases=[]
    for i,(op,oracle) in enumerate({**arithmetic,**comparisons}.items()):
        result='U64' if op in arithmetic else 'Bool'
        cases.append((f'word_{i}',binary(op,var('p0'),var('p1')),[['p0','U64'],['p1','U64']],result,words,lambda p,f=oracle:f(p['p0'],p['p1'])))
    for i,(op,oracle) in enumerate({'==':comparisons['=='],'!=':comparisons['!='],'&&':lambda x,y:x and y,'||':lambda x,y:x or y}.items()):
        cases.append((f'bool_{i}',binary(op,var('p0'),var('p1')),[['p0','Bool'],['p1','Bool']],'Bool',booleans,lambda p,f=oracle:f(p['p0'],p['p1'])))
    for kind,fixtures in [('U64',words),('Bool',booleans)]:
        term={'If':dict(condition=var('b'),on_true=var('p0'),on_false=var('p1'))}
        inputs=[dict(**p,b=b) for p in fixtures for b in [False,True]]
        cases.append(('choose_'+kind,term,[['p0',kind],['p1',kind],['b','Bool']],kind,inputs,lambda p:p['p0'] if p['b'] else p['p1']))
    measurements=[]; checks=0
    for name,term,params,kind,fixtures,oracle in cases:
        goal=dict(params=params+[['out',kind]],conditions=[],**{'from':term,'to':var('out')})
        path=scratch/'goal.json';path.write_text(json.dumps(goal));out=scratch/'cnf.json'
        subprocess.run([str(compiler),'bitvector-obligation',str(path),'-o',str(out)],check=True,capture_output=True)
        problem=json.loads(out.read_text());compact=(json.dumps(problem,separators=(',',':'))+'\n').encode()
        (directory/f'{name}.goal.json').write_text(json.dumps(goal,indent=2)+'\n')
        (directory/f'{name}.cnf.json').write_bytes(compact)
        with Glucose3(bootstrap_with=problem['clauses']) as solver:
            timer=threading.Timer(60,solver.interrupt);timer.daemon=True;timer.start()
            try:
                for p in fixtures:
                    expected=oracle(p)
                    for corrupt in [False,True]:
                        candidate=((expected+1)&MASK) if kind=='U64' else not expected
                        values=dict(**p,out=candidate if corrupt else expected)
                        assumptions=[lit for variable,encoded in problem['inputs'].items() for lit in binding(encoded,values[variable])]
                        solver.conf_budget(100_000)
                        satisfiable=solver.solve_limited(assumptions=assumptions,expect_interrupt=True)
                        if satisfiable is None: raise ValueError(f'SAT resource limit: {name}')
                        # The core CNF asserts differing endpoints. Fixing the
                        # Python answer must make it UNSAT; a different answer
                        # must admit a model with these exact bound inputs.
                        assert satisfiable == corrupt,(name,p,expected,corrupt,satisfiable)
                        checks+=1
            finally: timer.cancel()
        measurements.append(dict(name=name,fixtures=len(fixtures),checks=2*len(fixtures),variables=problem['variables'],clauses=len(problem['clauses']),problem_sha256=problem['sha256'],cnf_file_sha256=hashlib.sha256(compact).hexdigest()))
        print(name,':',2*len(fixtures),'SAT/oracle checks passed',flush=True)
    source=report/'supplementary-tools/check_bitvector_semantics.py';source.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(__file__,source)
    result=dict(status='passed',seed=261019,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),checker_source_sha256=hashlib.sha256(source.read_bytes()).hexdigest(),checks=checks,operations=len(cases),measurements=measurements,scope='independent fixed-input Python oracle and external SAT: expected results UNSAT, mutated results SAT; all Bool inputs, U64 boundaries and random values; validation of fixed encoding, not a universal soundness proof')
    (report/'semantic-validation.json').write_text(json.dumps(result,indent=2)+'\n');print('Total:',checks,flush=True)

if __name__=='__main__':main()
