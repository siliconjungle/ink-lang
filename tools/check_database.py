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
LANG = ROOT / 'target' / 'debug' / 'lang'

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
    parser.add_argument('--output', type=Path, default=OUT)
    args = parser.parse_args()
    OUT = args.output.resolve()
    OUT.mkdir(parents=True, exist_ok=True)
    before = digest(LANG)
    rules = json.loads((ROOT/'knowledge/boolean-rules.json').read_text())
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
        run(['python3', ROOT/'knowledge/tools/boolean_proofs.py', rule_file, database])
        run([LANG,'verify-database',database/'lock.json'])
        obj=OUT/f'variant-{count}.o'
        command=[LANG,'build',ROOT/'examples/boolean.lang','--database',database/'lock.json','-o',obj]
        run(command)
        plan=json.loads(Path(str(obj)+'.plan.json').read_text())
        assert len(plan['applied_rule_ids'])==count
        binary=OUT/f'variant-{count}'
        run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror',driver,obj,'-o',binary])
        assert run([binary])=='20'
        assert digest(LANG)==before
        evidence.append(dict(rule_count=count,applied=plan['applied_rule_ids'],
                             generated_c_sha256=digest(Path(str(obj)+'.c')),
                             native_checks=20,command=[str(a) for a in command]))
        # Keep portable sources, proof objects, manifests and evidence; omit machine binaries.
        obj.unlink(); binary.unlink()
    assert len({x['generated_c_sha256'] for x in evidence})==3
    result=dict(compiler_sha256=before,compiler_unchanged=True,
                platform=run(['uname','-sm']), clang=run(['clang','--version']),
                kind='architecture and native correctness; no timing claim',variants=evidence)
    (OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps(result,indent=2))

if __name__=='__main__': main()
