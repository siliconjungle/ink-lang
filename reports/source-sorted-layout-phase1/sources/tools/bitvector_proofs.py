#!/usr/bin/env python3
"""Untrusted SAT proof producer; Ink independently reconstructs and checks CNF.

Requires python-sat==1.9.dev5. The solver and hint search are never imported by Ink.
"""
import argparse
import hashlib
import json
import subprocess
import time
import threading
from pathlib import Path
from pysat.solvers import Glucose3
from inductive_proofs import SEMANTICS, var, binary

ROOT = Path(__file__).resolve().parents[1]


def source(term):
    kind, value = next(iter(term.items()))
    if kind == 'U64': return {'Num': value}
    if kind in ('Var', 'Bool'): return term
    if kind == 'Binary': return {'Binary': [value['op'], source(value['left']), source(value['right'])]}
    if kind == 'If': return {'Call': ['choose', [source(value[k]) for k in ['condition', 'on_true', 'on_false']]]}
    raise ValueError(kind)


def hints_for(clause, clauses):
    """Find a unit-propagation chain; it is checked independently in Rust."""
    values = {}; hints = []
    for lit in clause:
        v, value = abs(lit), lit < 0
        if v in values and values[v] != value: return []
        values[v] = value
    while True:
        progress = False
        for index, candidate in enumerate(clauses):
            if any(abs(lit) in values and values[abs(lit)] == (lit > 0) for lit in candidate): continue
            unknown = [lit for lit in candidate if abs(lit) not in values]
            if len(unknown) > 1: continue
            hints.append(index)
            if not unknown: return hints
            lit = unknown[0]; values[abs(lit)] = lit > 0; progress = True
        if not progress: raise ValueError('Solver step is not RUP; no unchecked RAT steps accepted')


def certificate(problem, seconds=60, conflicts=100_000):
    with Glucose3(bootstrap_with=problem['clauses'], with_proof=True) as solver:
        solver.conf_budget(conflicts)
        timer = threading.Timer(seconds, solver.interrupt)
        timer.daemon = True
        timer.start()
        try:
            result = solver.solve_limited(expect_interrupt=True)
        finally:
            timer.cancel()
        if result is None: raise ValueError('Proof search exhausted its time or conflict budget')
        if result: raise ValueError('Proposed equality is false; solver found a counterexample')
        trace = solver.get_proof()
    clauses = [list(c) for c in problem['clauses']]; steps = []
    for line in trace:
        if line.startswith('d '): continue  # Retaining earlier proved clauses is sound.
        numbers = [int(n) for n in line.split()]
        if not numbers or numbers[-1] != 0: raise ValueError('Malformed solver proof')
        clause = sorted(set(numbers[:-1]))
        hints = hints_for(clause, clauses)
        steps.append(dict(clause=clause, hints=hints)); clauses.append(clause)
        if not clause: break
    if not steps or steps[-1]['clause']:
        steps.append(dict(clause=[], hints=hints_for([], clauses)))
    return dict(problem_sha256=problem['sha256'], steps=steps)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--compiler', type=Path, default=ROOT / 'target/debug/ink')
    parser.add_argument('--case', action='append', help='generate only named examples')
    parser.add_argument('--solver-seconds', type=float, default=60)
    parser.add_argument('--conflicts', type=int, default=100_000)
    args = parser.parse_args(); directory = args.directory.resolve()
    if not 0 < args.solver_seconds <= 600 or not 0 < args.conflicts <= 1_000_000: parser.error('invalid proof-search budget')
    (directory / 'objects').mkdir(parents=True, exist_ok=True)
    scratch = ROOT / 'build/bitvector-producer'; scratch.mkdir(parents=True, exist_ok=True)
    compiler = args.compiler.resolve(); names = {}; proposals = []; sources = []; measurements = []

    def store(name, kind, declaration, dependencies=()):
        data = (json.dumps(dict(schema=1,semantics=SEMANTICS,name=name,dependencies=list(dependencies),declaration={kind:declaration}),separators=(',',':'))+'\n').encode()
        identity = hashlib.sha256(data).hexdigest(); path = directory / 'objects' / f'{identity}.json'
        if path.exists(): assert path.read_bytes() == data
        else: path.write_bytes(data)
        names[name] = identity; return identity

    datatype = store('List64', 'Datatype', dict(constructors=[dict(name='Nil',fields=[]),dict(name='Cons',fields=['U64','SelfType'])]))
    x, y = var('p0'), var('p1')
    examples = [
        ('add_zero', [['p0','U64']], binary('+',x,{'U64':0}), x),
        ('subtract_self', [['p0','U64']], binary('-',x,x), {'U64':0}),
        ('add_commute', [['p0','U64'],['p1','U64']], binary('+',x,y), binary('+',y,x)),
        ('cancel_add', [['p0','U64'],['p1','U64']], binary('-',binary('+',x,y),y), x),
        ('multiply_zero', [['p0','U64']], binary('*',x,{'U64':0}), {'U64':0}),
        ('unsigned_reflexive', [['p0','U64']], binary('<=',x,x), {'Bool':True}),
        ('unsigned_maximum', [['p0','U64']], binary('<=',x,{'U64':(1<<64)-1}), {'Bool':True}),
        ('choose_equal', [['p0','U64'],['p1','Bool']], {'If':dict(condition=y,on_true=x,on_false=x)}, x),
        ('given_equal', [['p0','U64'],['p1','U64']], binary('-',x,y), {'U64':0}),
    ]
    if args.case:
        known = {e[0] for e in examples}
        if set(args.case) - known: parser.error('unknown example name')
        examples = [e for e in examples if e[0] in args.case]
    from collection_proofs import render
    for name, params, left, right in examples:
        conditions = [dict(**{'from':x,'to':y})] if name == 'given_equal' else []
        goal = dict(params=params,conditions=conditions,**{'from':left,'to':right})
        path = scratch / f'{name}.goal.json'; path.write_text(json.dumps(goal))
        cnf = scratch / f'{name}.cnf.json'
        subprocess.run([compiler,'bitvector-obligation',path,'-o',cnf],check=True,capture_output=True)
        problem = json.loads(cnf.read_text()); start = time.perf_counter()
        proof = certificate(problem,args.solver_seconds,args.conflicts); elapsed = time.perf_counter()-start
        derivation = {'BitVector':dict(**{'from':left,'to':right},hypotheses=list(range(len(conditions))),certificate=proof)}
        identity = store(name,'Theorem',dict(**goal,proof=derivation))
        if not conditions: proposals.append(dict(function=name,**{'from':source(left),'to':source(right)},datatype=datatype,from_definitions=[],to_definitions=[],proof={'Use':dict(theorem=identity,arguments=[var(n) for n,_ in params],premises=[])}))
        result = 'Bool' if name in ('unsigned_reflexive','unsigned_maximum') else 'u64'
        if not conditions: sources.append(f'fn {name}('+', '.join(n+': '+('u64' if t=='U64' else t) for n,t in params)+f') -> {result} {{ return {render(source(left))}; }}')
        measurements.append(dict(name=name,conditions=len(conditions),variables=problem['variables'],clauses=len(problem['clauses']),steps=len(proof['steps']),hints=sum(len(s['hints']) for s in proof['steps']),producer_seconds=elapsed,problem_sha256=problem['sha256']))
        print(f'{name}: {len(proof["steps"])} checked-step proposals, {elapsed:.3f}s producer time',flush=True)
    (directory/'lock.json').write_text(json.dumps(dict(schema=1,semantics=SEMANTICS,objects=list(names.values())),indent=2)+'\n')
    (directory/'names.json').write_text(json.dumps(names,indent=2)+'\n')
    (directory/'proposal.json').write_text(json.dumps(dict(schema=1,semantics='source-collections-v1',library='lock.json',proposals=proposals),indent=2)+'\n')
    (directory/'kernels.ink').write_text('module bitvector_proofs;\n\n'+'\n\n'.join(sources)+'\n')
    (directory/'production.json').write_text(json.dumps(dict(solver='PySAT Glucose3',compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),measurements=measurements),indent=2)+'\n')
    subprocess.run([compiler,'verify-library',directory/'lock.json'],check=True,capture_output=True)
    subprocess.run([compiler,'emit-c',directory/'kernels.ink','--implementation',directory/'proposal.json','-o',scratch/'checked.c'],check=True,capture_output=True)
    print(f'Ink independently checked {len(examples)} arithmetic theorems and {len(proposals)} exact source replacements.',flush=True)


if __name__ == '__main__': main()
