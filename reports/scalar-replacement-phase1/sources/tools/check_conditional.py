#!/usr/bin/env python3
"""Native correctness of conditional rewrites, including inputs violating their premises."""
import argparse
import hashlib
import json
import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'reports/database-conditional'
LANG=ROOT/'target/debug/ink'

def run(command):
    result=subprocess.run([str(x) for x in command],cwd=ROOT,capture_output=True,text=True)
    if result.returncode: raise RuntimeError(result.stdout+result.stderr)
    return result.stdout.strip()

def sha(path): return hashlib.sha256(path.read_bytes()).hexdigest()

def main():
    global OUT
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True,help='fresh report directory')
    args=parser.parse_args();OUT=args.output.resolve()
    OUT.mkdir(parents=True,exist_ok=True)
    if any(OUT.iterdir()):parser.error('report directory must be empty')
    compiler=sha(LANG)
    run(['python3',ROOT/'knowledge/tools/conditional_proofs.py',OUT/'database'])
    lock=OUT/'database/lock.json';run([LANG,'verify-database',lock])
    converted=OUT/'logic'
    run(['python3',ROOT/'knowledge/tools/scalar_library.py','--library',lock,'--compiler',LANG,'--output-dir',converted])
    package=OUT/'package'
    run(['python3',ROOT/'knowledge/tools/rewrite_search.py',ROOT/'examples/conditional.lang',
         '--rules',converted/'rewrite-index.json','--compiler',LANG,'--output-dir',package])
    driver=OUT/'driver.c'
    driver.write_text('''#include <stdbool.h>
#include <stdint.h>
#include <assert.h>
#include <stdio.h>
bool lang_fn_conjunction(bool,bool,bool);
bool lang_fn_disjunction(bool,bool,bool);
bool lang_fn_unguarded(bool,bool);
bool lang_fn_numeric(uint64_t,uint64_t,bool,bool);
int main(void) {
    unsigned checks=0;
    for(unsigned a=0;a<2;++a) for(unsigned b=0;b<2;++b) for(unsigned c=0;c<2;++c) {
        assert(lang_fn_conjunction(a,b,c)==(bool)(a&&(b||c))); ++checks;
        assert(lang_fn_disjunction(a,b,c)==(bool)(a||(b&&c))); ++checks;
    }
    for(unsigned a=0;a<2;++a) for(unsigned b=0;b<2;++b) {
        assert(lang_fn_unguarded(a,b)==(bool)(a&&b)); ++checks;
    }
    uint64_t xs[]={0,1,UINT64_C(9223372036854775808),UINT64_MAX};
    for(unsigned x=0;x<4;++x) for(unsigned l=0;l<4;++l) for(unsigned b=0;b<2;++b) for(unsigned c=0;c<2;++c) {
        assert(lang_fn_numeric(xs[x],xs[l],b,c)==(bool)((xs[x]<xs[l])&&(b||c))); ++checks;
    }
    printf("%u\\n",checks);
}
''')
    variants=[]
    for enabled in [False,True]:
        obj=OUT/f'variant-{int(enabled)}.o'
        command=[LANG,'build',ROOT/'examples/conditional.lang','-o',obj]
        if enabled: command.extend(['--replacement',package/'replacement.json'])
        run(command)
        plan=json.loads(Path(str(obj)+'.plan.json').read_text())
        if enabled: assert len(plan['checked_replacement']['equality']['checked_proposals'])==3
        else: assert plan['checked_replacement'] is None
        assert sha(Path(str(obj)+'.c'))==plan['generated_c_sha256']
        binary=OUT/f'variant-{int(enabled)}'
        run(['clang','-O3','-std=c11','-Wall','-Wextra','-Werror',driver,obj,'-o',binary])
        checks=int(run([binary]));assert checks==84
        variants.append(dict(knowledge_enabled=enabled,native_checks=checks,plan=plan,
                             command=[str(x) for x in command]))
        obj.unlink();binary.unlink()
    assert sha(LANG)==compiler
    assert variants[0]['plan']['generated_c_sha256']!=variants[1]['plan']['generated_c_sha256']
    result=dict(compiler_sha256=compiler,compiler_unchanged=True,variants=variants,
                kind='conditional proof correctness and native lowering; no timing claim',
                clang=run(['clang','--version']))
    (OUT/'result.json').write_text(json.dumps(result,indent=2)+'\n')
    print('Passed 168 native checks with and without conditional knowledge.')

if __name__=='__main__': main()
