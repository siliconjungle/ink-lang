#!/usr/bin/env python3
"""End-to-end architecture check: add checked knowledge without changing the compiler.
This is a correctness/extension test, not a performance benchmark.
"""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'reports' / 'database-equality'
LANG = ROOT / 'target' / 'debug' / 'ink'

def run(args):
    result = subprocess.run([str(a) for a in args], cwd=ROOT, text=True, capture_output=True)
    if result.returncode:
        raise RuntimeError(result.stdout + result.stderr)
    return result.stdout.strip()

def digest(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    global OUT
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, required=True, help='fresh report directory')
    args = parser.parse_args()
    OUT = args.output.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    if any(OUT.iterdir()): parser.error('report directory must be empty')
    before = digest(LANG)
    rules = json.loads((ROOT/'knowledge/research/boolean-rules.json').read_text())
    driver = OUT/'driver.c'
    driver.write_text('''#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
#include <stdio.h>
bool lang_fn_decision(bool, bool);
bool lang_fn_repeated(uint64_t, uint64_t);
int main(void) {
    unsigned checks=0;
    for (unsigned a=0;a<2;++a) for (unsigned b=0;b<2;++b) {
        assert(lang_fn_decision(a,b)==(bool)a); ++checks;
    }
    uint64_t values[]={0,1,UINT64_C(9223372036854775808),UINT64_MAX};
    for (unsigned a=0;a<4;++a) for (unsigned b=0;b<4;++b) {
        assert(lang_fn_repeated(values[a],values[b])==(values[a]<values[b])); ++checks;
    }
    printf("%u\\n",checks);
}
''')
    evidence = []
    for count in [0,1,2]:
        # Database is extended only after the preceding build has completed.
        rule_file=OUT/f'rules-{count}.json'
        rule_file.write_text(json.dumps(rules[:count]))
        database=OUT/f'db-{count}'
        run(['python3', ROOT/'knowledge/producers/boolean_proofs.py', rule_file, database])
        run([LANG,'verify-database',database/'lock.json'])
        converted=OUT/f'logic-{count}'
        run(['python3',ROOT/'knowledge/producers/scalar_library.py','--library',database/'lock.json',
             '--compiler',LANG,'--output-dir',converted])
        index_path=converted/'rewrite-index.json';index=json.loads(index_path.read_text())
        index['rules']=index['rules'][:count];index_path.write_text(json.dumps(index,indent=2)+'\n')
        package=OUT/f'package-{count}'
        run(['python3',ROOT/'planner/research/rewrite_search.py',ROOT/'examples/boolean.lang',
             '--rules',index_path,'--compiler',LANG,'--output-dir',package])
        obj=OUT/f'variant-{count}.o'
        command=[LANG,'build',ROOT/'examples/boolean.lang','--replacement',package/'replacement.json','-o',obj]
        run(command)
        plan=json.loads(Path(str(obj)+'.plan.json').read_text())
        assert len(plan['checked_replacement']['equality']['checked_proposals'])==count
        binary=OUT/f'variant-{count}'
        run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror',driver,obj,'-o',binary])
        assert run([binary])=='20'
        assert digest(LANG)==before
        evidence.append(dict(rule_count=count,applied_functions=[p['function'] for p in plan['checked_replacement']['equality']['checked_proposals']],
                             generated_c_sha256=digest(Path(str(obj)+'.c')),
                             native_checks=20,command=[str(a) for a in command]))
        # Keep portable sources, proof objects, manifests and evidence; omit machine binaries.
        obj.unlink(); binary.unlink()
    assert len({x['generated_c_sha256'] for x in evidence})==3
    baseline=OUT/'baseline.c';run([LANG,'emit-c',ROOT/'examples/boolean.lang','-o',baseline])
    assert baseline.read_bytes()==(OUT/'variant-0.o.c').read_bytes()
    result=dict(compiler_sha256=before,compiler_unchanged=True,
                platform=run(['uname','-sm']), clang=run(['clang','--version']),
                kind='architecture and native correctness; no timing claim',variants=evidence)
    (OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__': main()
