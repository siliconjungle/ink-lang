"""Compile exact emitted pure methods, with explicit Vec ingress/owned result ABI.
No lowering rewrite: original method bytes and their full module are archived.
"""
from pathlib import Path
import hashlib, json, re, subprocess

def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()

def methods(text):
    out=[]
    for match in re.finditer(r'pub fn function_l_[A-Za-z0-9_]+\(',text):
        start=match.start();brace=text.index('{',match.end());i=brace+1;depth=1
        while depth:
            depth+=(text[i]=='{')-(text[i]=='}');i+=1
        body=text[start:i]
        # This suite's pure numeric/list methods have no string/char literals;
        # reject unsupported free-runtime dependencies rather than reimplement them.
        if '"' in body:raise ValueError('quoted/runtime-dependent pure Rust method')
        out.append(body)
    if not out:raise ValueError('no emitted pure methods')
    return out

def adapter(report,version,tasks,compiler,log):
    report=Path(report);root=report/'rust-target'/version;root.mkdir(parents=True)
    funcs=[];seen=set();bindings=[]
    for t in tasks:
        core=report/'targets'/t['name']/(version+'.core.json');project=root/t['name']
        argv=[str(compiler),'build',str(core),'--core','--target','rust','-o',str(project)]
        run=subprocess.run(argv,text=True,capture_output=True);log.append(dict(argv=argv,exit_code=run.returncode,stdout=run.stdout,stderr=run.stderr))
        if run.returncode:raise ValueError('Rust emit unsupported '+t['name']+' '+run.stderr)
        emitted=project/'src/lib.rs';text=emitted.read_text();extracted=methods(text)
        for body in extracted:
            name=re.match(r'pub fn (function_l_\w+)\(',body)[1]
            if name in seen:raise ValueError('duplicate helper name '+name)
            seen.add(name);funcs.append(body)
        bindings.append(dict(task=t['name'],core_sha256=sha(core),module_path=str(emitted.relative_to(report)),module_sha256=sha(emitted),
                             method_sha256=[hashlib.sha256(x.encode()).hexdigest()for x in extracted]))
    vector=[];scalar=[]
    for i,t in enumerate(tasks):
        call='Emitted.function_l_'+t['name']+'(std::slice::from_raw_parts(x,nx).to_vec(),std::slice::from_raw_parts(y,ny).to_vec(),seed,k)'
        (vector if t['output_kind']=='list_u32'else scalar).append(f'{i}=>{call},')
    source='''#![allow(non_snake_case,unused_variables,unused_parens,dead_code,static_mut_refs)]
struct Emitted;
impl Emitted{
'''+ '\n'.join(funcs)+'''
}
static mut BENCH_OWNED:Option<Vec<u32>>=None;
#[no_mangle]pub unsafe extern "C" fn bench_eval_owned(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->usize{
 let value=match task{
'''+''.join(vector)+'''_=>panic!("unsupported vector task")};let n=value.len();BENCH_OWNED=Some(value);n
}
#[no_mangle]pub unsafe extern "C" fn bench_eval_scalar32(task:u32,x:*const u32,nx:usize,y:*const u32,ny:usize,seed:u32,k:u32)->u32{match task{
'''+''.join(scalar)+'''_=>panic!("unsupported scalar task")}}
#[no_mangle]pub unsafe extern "C" fn bench_owned_ptr()->*const u32{BENCH_OWNED.as_ref().unwrap().as_ptr()}
#[no_mangle]pub unsafe extern "C" fn bench_owned_clear(){BENCH_OWNED=None;}
#[no_mangle]pub extern "C" fn bench_alloc(n:usize)->*mut u32{let mut v=vec![0u32;n.max(1)];let p=v.as_mut_ptr();std::mem::forget(v);p}
#[no_mangle]pub unsafe extern "C" fn bench_free(p:*mut u32,n:usize){drop(Vec::from_raw_parts(p,n.max(1),n.max(1)))}
'''
    src=root/'adapter.rs';src.write_text(source);wasm=root/'ink-rust.wasm'
    argv=['rustc','--edition=2021','--crate-type=cdylib','--target','wasm32-unknown-unknown','-C','opt-level=3','-C','panic=abort','-C','target-feature=+simd128',str(src),'-o',str(wasm)]
    run=subprocess.run(argv,text=True,capture_output=True);log.append(dict(argv=argv,exit_code=run.returncode,stdout=run.stdout,stderr=run.stderr))
    if run.returncode:raise ValueError('Rust method adapter compilation unsupported '+run.stderr)
    return dict(status='prepared',wasm_path=str(wasm.relative_to(report)),adapter_path=str(src.relative_to(report)),adapter_sha256=sha(src),wasm_sha256=sha(wasm),emitted_methods=bindings,
                ingress='two Vec input copies per emitted call from resident/captured public words; exact emitted body may copy internally',
                result='fresh emitted Vec result; JS copies full result to owned Array and frees Vec inside each invocation',
                native='result Vec retained until full-word consumer then bench_reset drops; no output destination reuse claimed',
                trusted='public numeric/list method extraction, wrapper/toolchain/ABI; exact method body bytes are unchanged, not a semantic refinement proof')
