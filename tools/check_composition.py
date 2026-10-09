#!/usr/bin/env python3
"""Native end-to-end check of a pinned seven-object proof dependency closure."""
import hashlib
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/database-composition'
LANG=ROOT/'target/debug/lang'

def run(command):
    result=subprocess.run([str(x) for x in command],cwd=ROOT,capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stdout+result.stderr)
    return result.stdout.strip()

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    compiler=sha(LANG)
    run(['python3',ROOT/'tools/composed_proofs.py',OUT/'database'])
    lock=OUT/'database/lock.json'
    run([LANG,'verify-database',lock])
    obj=OUT/'composed.o'
    command=[LANG,'build',ROOT/'examples/composed.lang','--database',lock,'-o',obj]
    run(command)
    plan=json.loads(Path(str(obj)+'.plan.json').read_text())
    assert len(plan['database_closure'])==7
    assert len(plan['applied_rule_ids'])==1
    assert sha(Path(str(obj)+'.c'))==plan['generated_c_sha256']
    for identity in plan['database_closure']:
        assert sha(OUT/'database/objects'/f'{identity}.json')==identity
    driver=OUT/'driver.c'
    driver.write_text('''#include <stdint.h>
#include <stdbool.h>
#include <assert.h>
#include <stdio.h>
bool lang_fn_decision(uint64_t,uint64_t,bool);
int main(void) {
    uint64_t xs[]={0,1,UINT64_C(9223372036854775808),UINT64_MAX};
    unsigned checks=0;
    for(unsigned x=0;x<4;++x) for(unsigned l=0;l<4;++l) for(unsigned f=0;f<2;++f) {
        assert(lang_fn_decision(xs[x],xs[l],f)==(xs[x]<xs[l])); ++checks;
    }
    printf("%u\\n",checks);
}
''')
    binary=OUT/'composed'
    run(['clang','-O3','-Wall','-Wextra','-Werror',driver,obj,'-o',binary])
    checks=int(run([binary]));assert checks==32 and sha(LANG)==compiler
    result=dict(compiler_sha256=compiler,compiler_unchanged=True,native_checks=checks,
                closure=plan['database_closure'],selected_rules=plan['applied_rule_ids'],
                command=[str(x) for x in command],clang=run(['clang','--version']),
                kind='native correctness and theorem composition; no timing claim')
    (OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    obj.unlink();binary.unlink()
    print(f'Passed {checks} native comparisons using {len(plan["database_closure"])} checked objects.')

if __name__=='__main__': main()
