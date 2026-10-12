#!/usr/bin/env python3
"""Complete typed Rust calls for voxel painting, run decoding and column removal.

Compare bulk Ink with ordinary scalar Ink and matching handwritten Rust.
Input ownership, output allocation/copying and destruction are timed. Compilation
and JSON transport are separate. This does not rank complete engines or codecs.
"""
import hashlib,json,os,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;OUT=ROOT/'build/bulk-buffer-bench'
sys.path.insert(0,str(ROOT/'bench'));import methodology
OUT.mkdir(parents=True,exist_ok=True)
source='''module bulk_benchmark;
import "../../knowledge/libraries/buffers.ink" as ranges;
import "../../knowledge/libraries/voxels.ink" as voxels;
import "../../knowledge/libraries/codecs.ink" as codecs;
fn copy_one(b:Buffer<u32>,source:u32,destination:u32)->Buffer<u32>{let v=b.at_or(source,0);return b.set(destination,v);}
fn scalar_fill(b:Buffer<u32>,start:u32,count:u32,v:u32)->Buffer<u32>{return repeat_until(count,b,fn(b)=>false,fn(i)=>fn(b)=>b.set(start+i,v));}
fn voxel_bulk(xs:List<u32>,width:u32,height:u32)->List<u32>{return voxels.paint_box<u32>(xs,width,height,1,0,0,width-2,height,1,9);}
fn decode_bulk(xs:List<u32>,maximum:u32)->Result<List<u32>,codecs.DecodeError>{return codecs.decode_runs(xs,maximum);}
fn erase_bulk(xs:List<u32>,start:u32,count:u32)->List<u32>{return ranges.erase_range<u32>(xs,start,count);}
fn erase_scalar(xs:List<u32>,start:u32,count:u32)->List<u32>{
 let n=length(xs);let start=ranges.minimum(start,n);let count=ranges.minimum(count,n-start);
 let b=buffer(xs);let b=repeat_until(n-start-count,b,fn(b)=>false,fn(i)=>fn(b)=>copy_one(b,start+count+i,start+i));
 return b.truncate(n-count).freeze();
}
'''
voxel=(ROOT/'knowledge/libraries/voxels.ink').read_text().split('fn paint_box<T>',1)[1].split('// Linear addressing',1)[0]
source+='fn voxel_scalar'+voxel.replace('List<T>','List<u32>').replace('value:T','value:u32').replace('b.fill_range((z+zi)*plane+(y+yi)*width+x,nx,value)','scalar_fill(b,(z+zi)*plane+(y+yi)*width+x,nx,value)')
codec=(ROOT/'knowledge/libraries/codecs.ink').read_text().split('fn decode_runs',1)[1]
source+='fn decode_scalar'+codec.replace('DecodeError','codecs.DecodeError').replace('output.fill_range(position,count,word)','scalar_fill(output,position,count,word)')
(OUT/'source.ink').write_text(source)
compiler=ROOT/'target/debug/ink';env=os.environ.copy()
t=time.perf_counter_ns();subprocess.run([str(compiler),'build',str(OUT/'source.ink'),'--target','rust','-o',str(OUT/'rust')],cwd=ROOT,check=True,stdout=subprocess.DEVNULL);emit=time.perf_counter_ns()-t
project=OUT/'rust';(project/'src/bin').mkdir(exist_ok=True);(project/'src/bin/benchmark.rs').write_text((HERE/'driver.rs').read_text());p=project/'Cargo.toml';p.write_text(p.read_text().replace('["rlib","cdylib","staticlib"]','["rlib"]'))
t=time.perf_counter_ns();subprocess.run(['cargo','build','--offline','--release','--bin','benchmark'],cwd=project,env=env,check=True,stdout=subprocess.DEVNULL);compile_ns=time.perf_counter_ns()-t
raw=json.loads(subprocess.check_output([str(project/'target/release/benchmark')],text=True))
report=dict(schema=1,method=__doc__,rounds=9,order=['ink_bulk','ink_scalar','rust_control'],source_sha256=hashlib.sha256(source.encode()).hexdigest(),driver_sha256=hashlib.sha256((HERE/'driver.rs').read_bytes()).hexdigest(),compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),library_sha256={name:hashlib.sha256((ROOT/'knowledge/libraries'/name).read_bytes()).hexdigest() for name in ['buffers.ink','voxels.ink','codecs.ink']},emit_ns=emit,compile_ns=compile_ns,environment=methodology.environment(env),results=raw)
(HERE/'results.json').write_text(json.dumps(report,indent=2)+'\n')
for r in raw:print(r['workload'],r['n'],'scalar/bulk',round(r['median_ns'][1]/r['median_ns'][0],3),'Ink/Rust',round(r['median_ns'][0]/r['median_ns'][2],3))
