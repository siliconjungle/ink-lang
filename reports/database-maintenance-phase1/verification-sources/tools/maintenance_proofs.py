#!/usr/bin/env python3
"""Untrusted producer of exact source maintenance proofs from the local database.

The compiler independently checks the library, its source meanings, and all
three proposed update expressions. No built-in polynomial authority is used.
"""
import argparse, json, subprocess
from pathlib import Path
from integer_proofs import use, trans
from inductive_proofs import call, construct, var

ROOT = Path(__file__).resolve().parents[1]
ROLES = ('Natural', 'Integer', 'successor', 'predecessor', 'negation',
         'repeat_successor', 'repeat_predecessor', 'addition', 'subtraction',
         'IntegerList', 'sum_integers', 'append')

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('directory', type=Path)
    parser.add_argument('--library', type=Path, default=ROOT/'knowledge/exact-integers')
    parser.add_argument('--compiler', type=Path, default=ROOT/'target/release/ink')
    args = parser.parse_args()
    ids = json.loads((args.library/'names.json').read_text())
    lock = json.loads((args.library/'lock.json').read_text())
    # This producer includes the complete checked package. The core grants
    # visibility only to roots and verifies the exact dependency closure.
    bundle = dict(lock=lock, objects={i:(args.library/'objects'/f'{i}.json').read_text()
                                    for i in lock['objects']})
    model = {role:ids[role] for role in ROLES}
    prefix, suffix, old, new = map(var, ('prefix', 'suffix', 'old', 'new'))
    add = lambda a,b:call(ids['addition'],a,b)
    sub = lambda a,b:call(ids['subtraction'],a,b)
    total = lambda rows:call(ids['sum_integers'],rows)
    joined = lambda a,b:call(ids['append'],a,b)
    cons = lambda h,t:construct(ids['IntegerList'],1,h,t)
    rest = total(joined(prefix,suffix))
    before = total(joined(prefix,cons(old,suffix)))
    canonical = dict(insert=use(ids['sum_insert'],prefix,suffix,new),
                     replace=use(ids['sum_replace'],prefix,suffix,old,new),
                     remove=use(ids['sum_remove'],prefix,suffix,old))
    commuted = dict(insert=trans(use(ids['addition_commutes'],new,rest),canonical['insert']),
                    replace=trans(use(ids['addition_commutes'],new,sub(before,old)),canonical['replace']),
                    remove=canonical['remove'])
    args.directory.mkdir(parents=True,exist_ok=True)
    for name,proofs,insert,replace in [
        ('canonical',canonical,'total + new','total - old + new'),
        ('commuted',commuted,'new + total','new + (total - old)'),
    ]:
        evidence = dict(library=bundle,model=model,**proofs)
        path=args.directory/f'{name}.evidence.json'
        path.write_text(json.dumps(evidence,indent=2)+'\n')
        source=args.directory/f'{name}.ink'
        source.write_text(f'''module exact_sum_{name};
fn insert(total: Int, new: Int) -> Int {{ return {insert}; }}
fn replace(total: Int, old: Int, new: Int) -> Int {{ return {replace}; }}
fn remove(total: Int, old: Int) -> Int {{ return total - old; }}
''')
        certificate=args.directory/f'{name}.json'
        subprocess.run([str(args.compiler.resolve()),'prove-maintenance',str(source),
                        '--evidence',str(path),'-o',str(certificate)],check=True)
        subprocess.run([str(args.compiler.resolve()),'verify-maintenance',str(certificate)],check=True)
        print(f'{name}: actual source update expressions checked against database proofs',flush=True)

if __name__=='__main__':main()
