#!/usr/bin/env python3
"""Matched standalone lifecycle measurements for checked maintenance proposals.

Alternating complete JSON calls, portable snapshot equality and separately
instrumented heap samples. Candidate construction/checking costs are recorded;
measurements grant no correctness or default-selection authority.
"""
import argparse,hashlib,json,os,platform,statistics,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'knowledge/producers'));sys.path.insert(0,str(ROOT/'knowledge'))
from representations import generate
from representation_product import generate as product
from representation_bridge import generate as bridge
import runpy
PACKED_DRIVER=runpy.run_path(str(ROOT/'bench/frontier-packed-storage.py'))['DRIVER']
import gzip
COUNT=PACKED_DRIVER[PACKED_DRIVER.index('use std::'):PACKED_DRIVER.index('trait Database')]
PHASE=PACKED_DRIVER[PACKED_DRIVER.index('fn phase('):PACKED_DRIVER.index('fn sample<')]
DRIVER='mod before;\nmod after;\n'+COUNT+r'''
trait Database:Sized{fn new()->Self;fn restore(b:&[u8])->Self;fn checkpoint(&self)->Vec<u8>;fn call(&mut self,name:&str,args:&Json)->Json;fn ack(&mut self);}
macro_rules! adapter{($m:ident)=>{impl Database for $m::State{
fn new()->Self{Self::new().unwrap()}fn restore(b:&[u8])->Self{Self::restore(b).unwrap()}fn checkpoint(&self)->Vec<u8>{Self::checkpoint(self).unwrap()}
fn call(&mut self,name:&str,args:&Json)->Json{self.invoke_json(name,args).unwrap()}fn ack(&mut self){self.acknowledge_through(u64::MAX,u64::MAX)}
}}}adapter!(before);adapter!(after);
'''+PHASE+r'''
fn configuration(kind:&str,n:usize)->(Vec<Json>,&'static str,Json,&'static str,Json,&'static str,Json){
 let mid=(n/2)as u64;
 match kind{
 "grid"=>{let width=(n as f64).sqrt()as usize;let value=json!({"grid":vec![0;n],"width":width,"start":0,"goal":n-1,"limit":n*8});(vec![json!([0,value,false])],"route",json!([]),"put",json!([1,value,false]),"put",json!([0,value,true]))},
 "heap"=>{let value:Vec<_>=(0..n).rev().map(|i|(i%7)as u32).collect();(vec![json!([0,value,false])],"sorted",json!([]),"put",json!([1,value,false]),"put",json!([0,value,true]))},
 "field"=>(vec![json!([41,0])],"cached",json!([]),"label",json!([99,false]),"label",json!([17,true])),
 "shared"=>( (0..n).map(|i|json!([i,i])).collect(),"zero",json!([]),"put",json!([mid,99]),"erase",json!([mid,true])),
 "ordered"=>( (0..n).map(|i|json!([i,i,i%2==0,false])).collect(),"active",json!([]),"put",json!([mid,99,true,false]),"put",json!([mid,17,false,true])),
 "grouped"|"memo"|"fused"|"memo-fused"=>( (0..n).map(|i|json!([i,i,i%3,false])).collect(),"groups",json!([]),"put",json!([mid,99,1,false]),"put",json!([mid,17,0,true])),
 "dense"=>( (0..n).map(|i|json!([i,i])).collect(),"get",json!([0]),"put",json!([mid,99]),"erase",json!([mid,true])),
 "index"=>( (0..n).map(|i|json!([i,i])).collect(),"get",json!([mid]),"put",json!([mid,99]),"erase",json!([mid,true])),
 _=>panic!("kind")
 }
}
fn sample<D:Database>(kind:&str,n:usize)->Json{
 let (population,query,query_args,update,update_args,abort_action,abort_args)=configuration(kind,n);
 let startup=phase(32,||{black_box(D::new());});
 let before=LIVE.load(Ordering::Relaxed);let mut state=None;
 let initialise=phase(1,||{let mut db=D::new();for args in &population {db.call("put",args);db.ack();}state=Some(db);});
 let state_bytes=LIVE.load(Ordering::Relaxed)-before;let mut state=state.unwrap();
 let expected=state.call(query,&query_args);assert_eq!(expected["committed"],false);
 let query_json=phase(64,||{assert_eq!(black_box(state.call(query,&query_args)),expected);});
 let update_json=phase(32,||{assert_eq!(state.call(update,&update_args)["committed"],true);state.ack();});
 let saved=state.checkpoint();let after_reply=state.call(query,&query_args);
 let abort=phase(32,||{assert_eq!(state.call(abort_action,&abort_args)["committed"],false);});
 assert_eq!(state.checkpoint(),saved);
 let checkpoint=phase(8,||{black_box(state.checkpoint());});
 let restore=phase(8,||{black_box(D::restore(&saved));});assert_eq!(D::restore(&saved).checkpoint(),saved);
 let snapshot_sha256=format!("{:x}",Sha256::digest(&saved));
 let mut state=Some(state);let teardown=phase(1,||{drop(state.take());});
 json!({"startup":startup,"initialise":initialise,"query_json":query_json,"update_json":update_json,"abort":abort,"checkpoint":checkpoint,"restore":restore,"teardown":teardown,"state_requested_bytes":state_bytes,"snapshot_sha256":snapshot_sha256,"query_result":expected,"after_query_result":after_reply})
}
fn main(){let args:Vec<String>=std::env::args().collect();let n=args[3].parse().unwrap();let value=if args[1]=="before"{sample::<before::State>(&args[2],n)}else{sample::<after::State>(&args[2],n)};println!("{value}");}
'''

def command(args,**kwargs):
    result=subprocess.run([str(a)for a in args],capture_output=True,text=True,**kwargs)
    if result.returncode:raise RuntimeError(result.stderr)
    return result.stdout

def proposals(kind,model,path):
    if kind in ['grid','heap']:
        return [generate(model,path/'plain')['requests'][0],generate(model,path/'cached',cache_query='route'if kind=='grid'else'sorted',preserve_cache=True,delta_query=True)['requests'][1]]
    if kind=='field':
        opts=dict(cache_query='cached',preserve_cache=True)
        return [generate(model,path/'plain',**opts)['requests'][1],generate(model,path/'delta',delta_query=True,**opts)['requests'][1]]
    if kind=='shared':
        zero=generate(model,path/'zero',cache_query='zero',preserve_cache=True,delta_query=True)['requests'][1]
        one=generate(model,path/'one',cache_query='one',preserve_cache=True,delta_query=True)['requests'][1]
        return [product(model,[zero,one],path/'plain',{'one':1}),product(model,[zero,one],path/'shared',{'one':1},True)]
    if kind=='ordered':
        return [generate(model,path/'plain',column_mutations=True)['requests'][0],generate(model,path/'ordered',ordered_queries=['active','all'])['requests'][0]]
    if kind=='grouped':
        opts=dict(cache_query='groups',preserve_cache=True)
        return [generate(model,path/'plain',**opts)['requests'][1],generate(model,path/'grouped',aggregate_query=True,**opts)['requests'][1]]
    if kind=='memo':
        plain=generate(model,path/'plain')['requests'][0];return [plain,plain]
    if kind=='fused':
        return [generate(model,path/'plain')['requests'][0],generate(model,path/'fused',fused_queries=['groups'])['requests'][0]]
    if kind=='memo-fused':
        fused=generate(model,path/'fused',fused_queries=['groups'])['requests'][0];return [fused,fused]
    if kind=='dense':
        return [generate(model,path/'plain',column_mutations=True)['requests'][0],generate(model,path/'dense',dense_slots=2)['requests'][0]]
    if kind=='index':
        return [generate(model,path/'plain',column_mutations=True)['requests'][0],generate(model,path/'indexed',indexed=True)['requests'][0]]
    raise ValueError(kind)

def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--case',action='append',choices=['field','shared','ordered','grouped','memo','fused','memo-fused','index','dense','grid','heap']);parser.add_argument('--rounds',type=int,default=7);a=parser.parse_args()
    compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'));os.environ['INK_COMPILER']=str(compiler)
    sources={'grid':'examples/frontier-algorithm-cache.ink','heap':'examples/frontier-heap-cache.ink','field':'examples/frontier-field-sensitive.ink','shared':'knowledge/research/product-caches/source.ink','ordered':'examples/frontier-ordered-results.ink','grouped':'examples/frontier-grouped-results.ink','memo':'examples/frontier-grouped-results.ink','index':'knowledge/research/product-caches/source.ink','dense':'knowledge/research/product-caches/source.ink','fused':'examples/frontier-grouped-results.ink','memo-fused':'examples/frontier-grouped-results.ink'}
    for kind in a.case or ['field','shared','ordered','grouped','memo','fused','memo-fused','index','dense','grid','heap']:
        work=ROOT/'build/frontier-maintenance-bench'/kind;(work/'src').mkdir(parents=True,exist_ok=True)
        source=ROOT/sources[kind];command([compiler,'emit-action-model',source,'-o',work/'model.json']);model=json.loads((work/'model.json').read_text())
        started=time.perf_counter_ns();requests=proposals(kind,model,work/'db');author_ns=time.perf_counter_ns()-started
        costs=[]
        for variant,request in zip(['before','after'],requests):
            path=work/(variant+'.json');path.write_text(json.dumps(request,separators=(',',':')))
            target='rust-memo'if kind in ['memo','memo-fused']and variant=='after'else'rust'
            started=time.perf_counter_ns();command([compiler,'check-representation',source,path]);check_ns=time.perf_counter_ns()-started
            started=time.perf_counter_ns();command([compiler,'emit-representation',source,path,'--target',target,'-o',work/'src'/(variant+'.rs')]);emit_ns=time.perf_counter_ns()-started
            costs.append(dict(variant=variant,target=target,check_ns=check_ns,emit_ns=emit_ns))
        migration=bridge(requests[0],requests[1],work/'bridge-store',True);(work/'bridge.json').write_text(json.dumps(migration,separators=(',',':')))
        command([compiler,'check-migration',source,work/'before.json',work/'after.json',work/'bridge.json'])
        (work/'src/main.rs').write_text(DRIVER)
        (work/'Cargo.toml').write_text('[package]\nname="ink-maintenance-bench"\nversion="0.1.0"\nedition="2021"\n[workspace]\n[dependencies]\nserde_json={version="1",features=["float_roundtrip"]}\nsha2="0.10"\nnum-bigint="0.4"\n[profile.release]\nlto="thin"\ncodegen-units=1\n')
        compile_costs=[]
        for binary,flags in [('timing','-Awarnings'),('memory','-Awarnings --cfg counted')]:
            started=time.perf_counter_ns();command(['cargo','build','--release','--offline','--quiet','--manifest-path',work/'Cargo.toml','--target-dir',work/binary],env={**os.environ,'RUSTFLAGS':flags});compile_costs.append(dict(binary=binary,ns=time.perf_counter_ns()-started))
        inputs={'source.ink':source.read_bytes(),**{n:(work/n).read_bytes()for n in ['model.json','before.json','after.json','bridge.json','Cargo.toml','Cargo.lock']},**{n+'.rs':(work/'src'/(n+'.rs')).read_bytes()for n in ['before','after','main']}}
        hashes={n:hashlib.sha256(data).hexdigest()for n,data in inputs.items()};artifact=hashlib.sha256(json.dumps(hashes,sort_keys=True).encode()).hexdigest();evidence=ROOT/'reports/frontier-extensions/benchmark-inputs'/artifact;evidence.mkdir(parents=True,exist_ok=True)
        for name,data in inputs.items():(evidence/(name+'.gz')).write_bytes(gzip.compress(data,mtime=0))
        measurements=[]
        for n in ([1]if kind=='field'else[1,16,64]if kind in ['grid','heap']else[1,64,256]):
            samples=[]
            for round in range(a.rounds):
                for variant in (['before','after']if round%2==0 else['after','before']):samples.append(dict(variant=variant,round=round,**json.loads(command([work/'timing/release/ink-maintenance-bench',variant,kind,n]))))
            memories={v:json.loads(command([work/'memory/release/ink-maintenance-bench',v,kind,n]))for v in ['before','after']}
            for field in ['snapshot_sha256','query_result','after_query_result']:
                assert len({json.dumps(s[field],sort_keys=True)for s in [*samples,*memories.values()]})==1,(kind,n,field)
            phases=[p for p in ['startup','initialise','query_json','update_json','abort','checkpoint','restore','teardown']]
            medians={v:{p:statistics.median(s[p]['total_ns']/s[p]['repeats']for s in samples if s['variant']==v)for p in phases}for v in ['before','after']}
            measurements.append(dict(rows=n,samples=samples,memory=memories,median_ns=medians));print(kind,n,medians,flush=True)
        report=dict(schema=1,case=kind,machine=platform.platform(),rustc=command(['rustc','--version']).strip(),author_ns=author_ns,costs=costs,compile=compile_costs,artifact_directory='benchmark-inputs/'+artifact,artifact_sha256=hashes,compression='gzip, mtime zero; hashes bind decompressed exact bytes',rounds=a.rounds,measurements=measurements,scope='Complete standalone JSON actions with acknowledgement; uninstrumented alternating timings and separate requested-heap runs. Exact replies and checkpoints match, abort state unchanged; both candidates and migration independently checked. Restore includes teardown. No universal speedup or C/JS/Wasm timing claim.')
        out=ROOT/'reports/frontier-extensions'/(kind+'-maintenance-results.json');out.write_text(json.dumps(report,indent=2)+'\n');print(out,flush=True)
if __name__=='__main__':main()
