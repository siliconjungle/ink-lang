#!/usr/bin/env python3
"""Native controls for exactly the web19 fixtures, using one C timing driver.

Ink's emitted C is compiled for this machine; original/expert Rust use the same
recipe sources as the browser controls. No cross-library LTO, input generation,
dynamic loading or module setup is inside kernel timings. Output consumption and
Ink arena cleanup are included. Snapshot mode separately charges input copies.
"""
import argparse, ctypes, hashlib, importlib.util, json, math, os, platform, random
import re, shutil, statistics, struct, subprocess, sys, time
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'bench'))
import methodology as M
VARIANTS=['ink_baseline_native','ink_prior_native','ink_checked_native','rust_literal_native','rust_expert_native']
MASK=(1<<64)-1
HEADER='typedef struct {const uint32_t *data;size_t len;uint64_t scalar;} BenchResult;\n'
DRIVER=r'''#define _POSIX_C_SOURCE 200809L
#include <stdint.h>
#include <stddef.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>
#include <inttypes.h>
#include <dlfcn.h>
#ifdef __APPLE__
#include <mach/mach_time.h>
#endif
typedef struct {const uint32_t *data;size_t len;uint64_t scalar;} BenchResult;
typedef BenchResult(*Call)(uint32_t,const uint32_t*,size_t,const uint32_t*,size_t,uint32_t,uint32_t,uint32_t*);
typedef void(*Reset)(void);
#ifdef __APPLE__
static mach_timebase_info_data_t timebase;
static uint64_t ticks(void){return mach_absolute_time();}
static double elapsed(uint64_t start){return (double)(ticks()-start)*timebase.numer/timebase.denom*1e-9;}
#else
static uint64_t ticks(void){struct timespec t;clock_gettime(CLOCK_MONOTONIC,&t);return (uint64_t)t.tv_sec*1000000000+t.tv_nsec;}
static double elapsed(uint64_t start){return (ticks()-start)*1e-9;}
#endif
static uint64_t consume(BenchResult r,int vector,uint32_t *sum,uint32_t *weighted){
 if(!vector)return r.scalar;
 uint32_t s=0,w=0;for(size_t i=0;i<r.len;i++){s+=r.data[i];w+=(uint32_t)(i+1)*r.data[i];}
 *sum=s;*weighted=w;return (uint64_t)s+((uint64_t)w<<32)+(uint64_t)r.len;
}
int main(int argc,char **argv){
 if(argc!=8)return 2;
#ifdef __APPLE__
 mach_timebase_info(&timebase);
#endif
 void *lib=dlopen(argv[1],RTLD_NOW|RTLD_LOCAL);if(!lib){fprintf(stderr,"%s\n",dlerror());return 3;}
 Call call=(Call)dlsym(lib,"bench_call");Reset reset=(Reset)dlsym(lib,"bench_reset");if(!call||!reset)return 4;
 FILE *f=fopen(argv[2],"rb");if(!f)return 5;uint64_t nx,ny;uint32_t seed,k;
 if(fread(&nx,8,1,f)!=1||fread(&ny,8,1,f)!=1||fread(&seed,4,1,f)!=1||fread(&k,4,1,f)!=1)return 6;
 uint32_t *x=malloc((nx?nx:1)*4),*y=malloc((ny?ny:1)*4),*out=malloc((nx+ny+2)*4);
 if(!x||!y||!out||fread(x,4,nx,f)!=nx||fread(y,4,ny,f)!=ny)return 7;fclose(f);
 uint32_t task=(uint32_t)strtoul(argv[3],0,10);int vector=atoi(argv[4]),snapshot=atoi(argv[6]),inputs=atoi(argv[7]);
 uint64_t it=strtoull(argv[5],0,10),acc=0;uint32_t sum=0,weighted=0;size_t output_len=0;
 BenchResult r=call(task,x,nx,y,ny,seed,k,out);uint64_t single=consume(r,vector,&sum,&weighted);output_len=r.len;reset();
 for(int w=0;w<3;w++){r=call(task,x,nx,y,ny,seed,k,out);consume(r,vector,&sum,&weighted);reset();}
 uint64_t start=ticks();
 for(uint64_t i=0;i<it;i++){
  uint32_t *sx=x,*sy=y;
  if(snapshot){sx=malloc((nx?nx:1)*4);memcpy(sx,x,nx*4);if(inputs==2){sy=malloc((ny?ny:1)*4);memcpy(sy,y,ny*4);}}
  r=call(task,sx,nx,sy,ny,seed,k,out);acc+=consume(r,vector,&sum,&weighted);reset();
  if(snapshot){free(sx);if(inputs==2)free(sy);}
 }
 double seconds=elapsed(start);
 if(vector)printf("{\"single\":\"array:%zu:%"PRIu32":%"PRIu32"\",",output_len,sum,weighted);
 else printf("{\"single\":\"%"PRIu64"\",",single);
 printf("\"code\":\"%"PRIu64"\",\"checksum\":\"%"PRIu64"\",\"iterations\":%"PRIu64",\"seconds\":%.12f}\n",single,acc,it,seconds);
 free(x);free(y);free(out);dlclose(lib);return 0;
}
'''

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def invoke(argv,commands):
    start=time.perf_counter();r=subprocess.run(list(map(str,argv)),cwd=ROOT,text=True,capture_output=True)
    commands.append(dict(argv=list(map(str,argv)),seconds=time.perf_counter()-start,exit_code=r.returncode,stdout=r.stdout,stderr=r.stderr))
    if r.returncode:raise RuntimeError(str(argv)+'\n'+r.stderr+'\n'+r.stdout)
    return r.stdout
def observe(expected,task):
    if task['output_kind']!='list_u32':return str(expected),int(expected)
    s=sum(expected)&0xffffffff;w=sum((i+1)*x for i,x in enumerate(expected))&0xffffffff
    return f'array:{len(expected)}:{s}:{w}',(s+(w<<32)+len(expected))&MASK

def prepare(report):
    # Main preparation is the authority for exact recipes, C roots and controls.
    # Native builds consume those bytes directly; no knowledge/plan copies.
    main=read(report/'metadata.json')
    for name in ['spec.json','fixtures.json','literal.rs','expert.rs']:
        if sha(report/name)!=main['artifact_hashes'][name]:raise ValueError('main source drift: '+name)
    p=report/'native';p.mkdir(exist_ok=True)
    if (p/'metadata.json').exists():raise ValueError('native preparation already archived')
    tasks=read(report/'spec.json')['tasks'];fixture=read(report/'fixtures.json');commands=[]
    (p/'driver.c').write_text(DRIVER);shutil.copy2(__file__,p/'harness.py')
    cpu='-mcpu=native' if platform.machine()=='arm64' else '-march=native';shared=M.shared_link_flag();suffix=M.shared_suffix()
    invoke(['clang','-O3','-std=c11','-c',p/'driver.c','-o',p/'driver.o'],commands)
    invoke(['clang',p/'driver.o',*([] if M.DARWIN else ['-ldl']),'-o',p/'driver'],commands)
    libraries={};sources={}
    for kind in ['baseline','prior','checked']:
        chunks=['#include <stdint.h>\n#include <stddef.h>\n#include <stdlib.h>\n'+HEADER];calls=[];resets=[]
        for task in tasks:
            name=task['name'];codepath=report/kind/name/'cpu.c';code=codepath.read_text();prefix='n19_'+name+'_'
            tokens=sorted(set(re.findall(r'\b(?:ink_|lang_)[A-Za-z0-9_]+\b',code)))
            chunks.extend(f'#define {t} {prefix}{t}\n' for t in tokens)
            chunks.append('#include "'+str(codepath)+'"\n')
            chunks.extend(f'#undef {t}\n' for t in tokens)
            signature=re.search(r'(uint32_t|uint64_t|ink_l_uint32)\s+lang_fn_'+re.escape(name)+r'\(([^)]*)\)',code)
            if not signature:raise ValueError('native signature missing: '+name)
            packed='ink_l_uint32' in signature[2];args=[]
            for xs in task['list_inputs']:
                ptr,n=('x','nx') if xs=='xs' else ('y','ny')
                args.extend([f'({prefix}ink_l_uint32){{{ptr},{n}}}'] if packed else [ptr,n])
            args+=['seed','k'];call=f'{prefix}lang_fn_{name}('+','.join(args)+')'
            if task['output_kind']=='list_u32':calls.append(f'case {task["index"]}:{{{prefix}ink_l_uint32 r={call};return (BenchResult){{r.data,r.len,0}};}}')
            else:calls.append(f'case {task["index"]}:return (BenchResult){{0,0,(uint64_t)({call})}};')
            if 'ink_compute_reset' in tokens:resets.append(f'case {task["index"]}:{prefix}ink_compute_reset();break;')
            sources[str(codepath.relative_to(report))]=sha(codepath)
        chunks.append('static uint32_t active_task;\nBenchResult bench_call(uint32_t task,const uint32_t*x,size_t nx,const uint32_t*y,size_t ny,uint32_t seed,uint32_t k,uint32_t*out){(void)out;active_task=task;switch(task){'+''.join(calls)+'default:__builtin_unreachable();}}\n')
        chunks.append('void bench_reset(void){switch(active_task){'+''.join(resets)+'default:break;}}\n')
        src=p/f'ink-{kind}.c';src.write_text(''.join(chunks));lib=p/f'ink-{kind}.{suffix}'
        invoke(['clang','-O3',cpu,'-ffp-contract=off','-std=c11',shared,src,'-o',lib],commands);libraries[f'ink_{kind}_native']=str(lib)
    flags=','.join('1' if t['output_kind']=='list_u32' else '0' for t in tasks);words=','.join(str(t['scalar_words']) for t in tasks)
    # Compile the native ABI adapter with the Rust implementation itself, so it
    # has the same one-library boundary as Ink and can inline bench_eval.
    for mode in ['literal','expert']:
        source=report/f'{mode}.rs'
        native_source=p/f'rust-{mode}.rs'
        wrapper='\n#[repr(C)]pub struct BenchResult{data:*const u32,len:usize,scalar:u64}\n'
        wrapper+=f'const VECTOR:[bool;{len(tasks)}]=[{flags.replace("1","true").replace("0","false")}];\nconst WORDS:[usize;{len(tasks)}]=[{words}];\n'
        wrapper+='#[no_mangle]pub unsafe extern "C" fn bench_call(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32,out:*mut u32)->BenchResult{let n=bench_eval(task,x,nx,y,ny,seed,k,out);if VECTOR[task as usize]{BenchResult{data:out,len:n,scalar:0}}else{let v=*out as u64;if WORDS[task as usize]==2{BenchResult{data:std::ptr::null(),len:0,scalar:v|((*out.add(1) as u64)<<32)}}else{BenchResult{data:std::ptr::null(),len:0,scalar:v}}}}\n#[no_mangle]pub extern "C" fn bench_reset(){}\n'
        native_source.write_text(source.read_text()+wrapper)
        lib=p/f'rust-{mode}.{suffix}'
        invoke(['rustc','--edition=2021','--crate-type=cdylib','-C','opt-level=3','-C','target-cpu=native','-C','panic=abort',native_source,'-o',lib],commands)
        libraries[f'rust_{mode}_native']=str(lib)
        sources[str(source.relative_to(report))]=sha(source)
    binaries={}
    for x in fixture['inputs']:
        path=p/(hashlib.sha256(x['id'].encode()).hexdigest()+'.bin')
        payload=struct.pack('<QQII',len(x['xs']),len(x['ys']),x['seed'],x['factor'])+struct.pack('<'+'I'*(len(x['xs'])+len(x['ys'])),*x['xs'],*x['ys'])
        archived=ROOT/'reports/web-stack-proofs-15-2026-10-10/native'/path.name
        # Hardlink only immutable archived fixtures whose complete bytes match.
        # New callbacks/scalars never reuse a merely equal-length input file.
        if archived.is_file() and archived.read_bytes()==payload:
            os.link(archived,path)
        else:path.write_bytes(payload)
        binaries[x['id']]=str(path)
    meta=dict(status='prepared',libraries=libraries,binaries=binaries,sources=sources,environment=M.environment(),commands=commands,spec_sha256=sha(report/'spec.json'),fixtures_sha256=sha(report/'fixtures.json'),tasks=tasks,artifact_hashes={str(f.relative_to(p)):sha(f) for f in p.iterdir() if f.is_file()},scope='One common separately compiled C timing/observation driver; dynamically loaded variants; no cross-library LTO. Generated C and Rust -O3/native CPU. Resident and full input-snapshot modes separate; allocation/free for generated intermediates and outputs plus final consumption/arena-reset are timed. Expert Rust can reuse output destination. Calibration starts at one call and grows to at least1ms, bounded at5million calls; integer-difference mach_absolute_time on macOS avoids microsecond CLOCK_MONOTONIC quantization. Only the active Ink task arena is reset. Both implementations cross one shared-library call boundary; Rust ABI adapter compiles in the same unit as bench_eval. Input generation/loading and dynamic module startup excluded. Different LLVM versions and shared-machine limits recorded.')
    meta.update(main_metadata_sha256=sha(report/'metadata.json'),
        snapshots={key:main[key] for key in ['prior_snapshot','effective_prior_snapshot','new_snapshot']},
        cpu_cost_model_sha256=main['cost_model_sha256'],
        compact_selection_scope='Native consumes emitted C; main metadata authenticates replayed compact selection closures. No separate native proof search or duplicated catalogue envelope.')
    for name,digest in sources.items():
        if main['artifact_hashes'].get(name)!=digest:raise ValueError('native input differs from main archive: '+name)
    (p/'metadata.json').write_text(json.dumps(meta,indent=2)+'\n');print('Native prepared',flush=True)

class Result(ctypes.Structure):_fields_=[('data',ctypes.POINTER(ctypes.c_uint32)),('len',ctypes.c_size_t),('scalar',ctypes.c_uint64)]
def validate(report):
    p=report/'native';meta=read(p/'metadata.json');fixture=read(report/'fixtures.json');tasks={t['name']:t for t in meta['tasks']};count=0
    assert sha(report/'metadata.json')==meta['main_metadata_sha256']
    libs={k:ctypes.CDLL(v) for k,v in meta['libraries'].items()}
    for lib in libs.values():
        lib.bench_call.argtypes=[ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.POINTER(ctypes.c_uint32),ctypes.c_size_t,ctypes.c_uint32,ctypes.c_uint32,ctypes.POINTER(ctypes.c_uint32)];lib.bench_call.restype=Result;lib.bench_reset.argtypes=[]
    for x in fixture['inputs']:
        xs=(ctypes.c_uint32*max(1,len(x['xs'])))(*x['xs']);ys=(ctypes.c_uint32*max(1,len(x['ys'])))(*x['ys']);out=(ctypes.c_uint32*max(2,len(x['xs'])+len(x['ys'])))()
        for name,expected in x['expected'].items():
            task=tasks[name]
            for variant,lib in libs.items():
                r=lib.bench_call(task['index'],xs,len(x['xs']),ys,len(x['ys']),x['seed'],x['factor'],out)
                actual=[r.data[i] for i in range(r.len)] if task['output_kind']=='list_u32' else int(r.scalar)
                assert actual==(expected if isinstance(expected,list) else int(expected)),(variant,name,x['id'])
                lib.bench_reset();count+=1
    receipt=dict(status='passed',exact_comparisons=count,inputs=len(fixture['inputs']),metadata_sha256=sha(p/'metadata.json'),scope='Every complete native output against frozen independent web oracle, all five implementations before timing.')
    (p/'validation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(receipt,flush=True)

def timed(report,seconds,repeats,warmup):
    p=report/'native';meta=read(p/'metadata.json');fixture=read(report/'fixtures.json');assert read(p/'validation.json')['status']=='passed'
    assert sha(report/'metadata.json')==meta['main_metadata_sha256']
    if (p/'results.json').exists() or (p/'trials.jsonl').exists():raise ValueError('archived native timing or journal exists; preserve failed attempt before restart')
    tasks={t['name']:t for t in meta['tasks']};inputs={x['id']:x for x in fixture['inputs']};rng=random.Random(20261028);rows=[];calibration=[];calibration_trials=[];warm=[];commands=[]
    def sample(v,task,x,it,mode,allow_zero=False,phase='samples',phase_index=None):
        row=json.loads(invoke([p/'driver',meta['libraries'][v],meta['binaries'][x['id']],task['index'],int(task['output_kind']=='list_u32'),it,int(mode=='snapshot'),len(task['list_inputs'])],commands))
        single,code=observe(x['expected'][task['name']],task)
        assert row['single']==single and row['code']==str(code) and row['checksum']==str(code*it&MASK)
        assert math.isfinite(row['seconds']) and (row['seconds']>=0 if allow_zero else row['seconds']>0)
        result=dict(case=task['name'],input=x['id'],variant=v,mode=mode,ns_per_call=row['seconds']*1e9/it,**row)
        with (p/'trials.jsonl').open('a') as journal:journal.write(json.dumps(dict(phase=phase,phase_index=phase_index,calibrating=allow_zero,**result))+'\n')
        return result
    for cell in fixture['cells']:
        task=tasks[cell['case']];x=fixture['inputs'][cell['input']]
        for mode in ['resident','snapshot']:
            counts={}
            for v in VARIANTS:
                iterations=1;step=0
                while True:
                    r=sample(v,task,x,iterations,mode,allow_zero=True,phase="calibration_trials",phase_index=step);calibration_trials.append(dict(step=step,**r))
                    if r['seconds']>=.001 or iterations>=5000000:break
                    iterations=min(5000000,iterations*16 if r['seconds']==0 else max(iterations+1,min(iterations*16,math.ceil(.001/(r['seconds']/iterations)))));step+=1
                if r['seconds']<=0:raise ValueError('native calibration remained below clock resolution at maximum iterations')
                calibration.append(r);counts[v]=max(1,min(5000000,math.ceil(seconds/(r['seconds']/r['iterations']))))
            for w in range(warmup):
                for v in VARIANTS:warm.append(dict(warmup=w,**sample(v,task,x,counts[v],mode,phase="warmups",phase_index=w)))
            for round_index in range(repeats):
                order=VARIANTS[:];rng.shuffle(order)
                for v in order:rows.append(dict(round=round_index,**sample(v,task,x,counts[v],mode,phase="samples",phase_index=round_index)))
            print('Native finished',task['name'],x['id'],mode,flush=True)
    raw=dict(status='passed',samples=rows,calibration=calibration,calibration_trials=calibration_trials,warmups=warm,metadata_sha256=sha(p/'metadata.json'),validation_sha256=sha(p/'validation.json'),parameters=dict(repeats=repeats,warmup=warmup,seconds=seconds,seed=20261028),scope=meta['scope'],calibration_policy=dict(initial_iterations=1,target_seconds=.001,max_iterations=5000000,max_growth=16,zero_seconds_calibration="grow by16; warmup/measured positive"))
    (p/'results.json').write_text(json.dumps(raw,indent=2)+'\n');audit(report)

def audit(report):
    p=report/'native';meta=read(p/'metadata.json');raw=read(p/'results.json');fixture=read(report/'fixtures.json');tasks={t['name']:t for t in meta['tasks']};inputs={x['id']:x for x in fixture['inputs']};groups={};seen=set()
    assert sha(report/'spec.json')==meta['spec_sha256'] and sha(report/'fixtures.json')==meta['fixtures_sha256']
    assert sha(report/'metadata.json')==meta['main_metadata_sha256']
    for name,digest in meta['artifact_hashes'].items():assert sha(p/name)==digest,name
    for name,digest in meta['sources'].items():assert sha(report/name)==digest,name
    assert raw['metadata_sha256']==sha(p/'metadata.json') and raw['validation_sha256']==sha(p/'validation.json')
    for phase in ['samples','warmups','calibration','calibration_trials']:
        for r in raw[phase]:
            single,code=observe(inputs[r['input']]['expected'][r['case']],tasks[r['case']]);assert r['single']==single and r['code']==str(code) and r['checksum']==str(code*r['iterations']&MASK)
            assert math.isfinite(r['seconds']) and (r['seconds']>=0 if phase=='calibration_trials' else r['seconds']>0)
            assert r['iterations']>0
            assert math.isclose(r['ns_per_call'],r['seconds']*1e9/r['iterations'],rel_tol=1e-9)
            if phase=='samples':
                key=(r['case'],r['input'],r['mode'],r['variant'],r['round']);assert key not in seen;seen.add(key)
                groups.setdefault(key[:3],{}).setdefault(r['variant'],[]).append(r)
    expected={(c['case'],fixture['inputs'][c['input']]['id'],m) for c in fixture['cells'] for m in ['resident','snapshot']};assert set(groups)==expected
    phase_groups={(name,inp,mode,v) for name,inp,mode in expected for v in VARIANTS}
    def phase_key(r):return (r['case'],r['input'],r['mode'],r['variant'])
    assert len(raw['calibration'])==len(phase_groups) and {phase_key(r) for r in raw['calibration']}==phase_groups
    assert len(raw['warmups'])==len(phase_groups)*raw['parameters']['warmup']
    assert {(*phase_key(r),r['warmup']) for r in raw['warmups']}=={(*k,w) for k in phase_groups for w in range(raw['parameters']['warmup'])}
    trial_groups={}
    for r in raw['calibration_trials']:trial_groups.setdefault(phase_key(r),[]).append(r)
    assert set(trial_groups)==phase_groups
    for r in raw['calibration']:
        trials=trial_groups[phase_key(r)];assert [t['step'] for t in trials]==list(range(len(trials)))
        assert {k:v for k,v in trials[-1].items() if k!='step'}==r
        assert trials[0]['iterations']==1
        for a,b in zip(trials,trials[1:]):
            wanted=min(5000000,a['iterations']*16 if a['seconds']==0 else max(a['iterations']+1,min(a['iterations']*16,math.ceil(.001/(a['seconds']/a['iterations'])))))
            assert b['iterations']==wanted
    journal=[json.loads(line) for line in (p/'trials.jsonl').read_text().splitlines()]
    def signature(r):return json.dumps(r,sort_keys=True)
    wanted=[]
    for phase,index in [('calibration_trials','step'),('warmups','warmup'),('samples','round')]:
        for row in raw[phase]:
            q=dict(row);i=q.pop(index);wanted.append(signature(dict(phase=phase,phase_index=i,calibrating=phase=='calibration_trials',**q)))
    assert sorted(map(signature,journal))==sorted(wanted),'journal does not bind every calibration/warmup/sample call'
    measurements=[]
    for (name,inp,mode),variants in groups.items():
        assert set(variants)==set(VARIANTS)
        values={v:[r['ns_per_call'] for r in sorted(rows,key=lambda x:x['round'])] for v,rows in variants.items()};assert all(len(xs)==raw['parameters']['repeats'] for xs in values.values())
        pairs={'prior_over_checked':('ink_prior_native','ink_checked_native'),'baseline_over_checked':('ink_baseline_native','ink_checked_native'),'checked_over_rust_expert':('ink_checked_native','rust_expert_native'),'checked_over_rust_literal':('ink_checked_native','rust_literal_native')}
        measurements.append(dict(case=name,input=inp,mode=mode,median_ns={v:statistics.median(xs) for v,xs in values.items()},paired_ratios_95pct={k:M.ratio_ci(values[a],values[b]) for k,(a,b) in pairs.items()},ratio_variants={k:list(v) for k,v in pairs.items()}))
    summary=dict(status='passed',samples=len(raw['samples']),cells=len(groups),validation=read(p/'validation.json'),measurements=measurements,scope=raw['scope'],metadata_sha256=sha(p/'metadata.json'),results_sha256=sha(p/'results.json'))
    (p/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print('Native audit passed',summary['samples'],summary['cells'],flush=True)

if __name__=='__main__':
    a=argparse.ArgumentParser();a.add_argument('--report',type=Path,default=ROOT/'reports/web-stack-proofs-19-2026-10-11');a.add_argument('--seconds',type=float,default=.015);a.add_argument('--repeats',type=int,default=9);a.add_argument('--warmup',type=int,default=2)
    for name in ['prepare','validate','time','audit']:a.add_argument('--'+name,action='store_true')
    args=a.parse_args();report=args.report.resolve()
    if args.prepare:prepare(report)
    if args.validate:validate(report)
    if args.time:timed(report,args.seconds,args.repeats,args.warmup)
    if args.audit:audit(report)
