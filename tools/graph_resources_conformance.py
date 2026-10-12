#!/usr/bin/env python3
"""Actual native GPU execution of compiler-embedded resource contracts."""
import argparse,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import canonical
from producers.resource_plans import propose

def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--root',type=Path,required=True);a=p.parse_args();d=a.root.resolve();d.mkdir(parents=True,exist_ok=True);compiler=a.compiler.resolve()
 def run(*args):
  r=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=600,env=dict(os.environ,CARGO_INCREMENTAL='0',CARGO_PROFILE_DEV_DEBUG='0',CARGO_TARGET_DIR=str(d/'target')))
  if r.returncode:raise AssertionError(r.stderr[-8000:])
  return r.stdout
 def cli(*args):return json.loads(run(compiler,*args))
 def save(name,v):path=d/name;path.write_bytes(canonical(v));return path
 source=d/'source.ink';source.write_text('module credits;fn bulk(xs:List<u32>)->u32{return sum(xs);}fn finish(x:u32)->u32{return x+1;}fn entry(xs:List<u32>)->u32{return finish(bulk(xs));}')
 core=d/'core.json';cli('emit-core',source,'-o',core);identity=cli('check-core',core)['core_sha256']
 graph=dict(schema=1,semantics='ink-literal-source-routing-v1',input_core_sha256=identity,entry='entry',stages=[dict(id='bulk',function='bulk',backend='gpu',domain='gpu',arguments=[{'Input':0}]),dict(id='finish',function='finish',backend='c',domain='cpu',arguments=[{'Stage':'bulk'}])],output={'Stage':'finish'})
 context=dict(route=graph,core=json.loads(core.read_bytes()),usage_profile=dict(peak_pending=2,peak_pending_bytes=32768))
 resource=list(propose(context))[1];plan=dict(schema=1,semantics='ink-compiled-plan-v1',input_core_sha256=identity,steps=[dict(kind='routing',package=dict(package=graph)),resource['step']]);packet=save('plan.json',plan)
 project=d/'bundle';cli('emit-plan',core,packet,'--core','--target','wgpu','-o',project)
 assert json.loads((project/'manifest.json').read_bytes())['usage_core_sha256']==identity
 native=project/'native';(native/'src/bin').mkdir(exist_ok=True)
 (native/'src/bin/check.rs').write_text('''use ink_gpu_program::Engine;use serde_json::json;fn main(){let mut e=Engine::new();let xs:Vec<u32>=(0..4096).collect();let result=e.call_route(&json!([xs])).unwrap();assert_eq!(result["value"],json!(8386561));assert!(result["stages"].as_array().unwrap().iter().any(|s|s["backend"]=="gpu"),"actual GPU required: {result}");let too_big=vec![0u32;8193];assert!(e.call_route(&json!([too_big])).unwrap_err().contains("INK_BACKPRESSURE"));assert_eq!(e.call_route(&json!([[1,2,3]])).unwrap()["value"],json!(7));println!("{}",result);}''')
 result=json.loads(run('cargo','run','--offline','--quiet','--manifest-path',native/'Cargo.toml','--bin','check'))
 save('checks.json',dict(status='passed',source=identity,resource=resource['step']['package'],actual_gpu_stages=sum(s['backend']=='gpu' for s in result['stages']),value=result['value'],scope='actual wgpu plus emitted admission/release checks; not a speed benchmark'))
 print(json.dumps(result))
if __name__=='__main__':main()
