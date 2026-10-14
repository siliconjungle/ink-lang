#!/usr/bin/env python3
"""Execute sealed physical plans in native Rust and Rust/Wasm against an oracle."""
import argparse,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--root',type=Path,required=True);p.add_argument('--plan',type=Path,required=True);p.add_argument('--source',type=Path,required=True);a=p.parse_args();d=a.root.resolve();d.mkdir(parents=True,exist_ok=True)
 def run(*args,cwd=None):
  r=subprocess.run(list(map(str,args)),cwd=cwd,capture_output=True,text=True,timeout=600)
  if r.returncode:raise AssertionError(f'{args}: {r.stderr[-12000:]}')
  return r.stdout
 compiler=a.compiler.resolve();source=a.source.resolve();plan=a.plan.resolve()
 # Explicit unsupported target selections must fail, never be silently dropped.
 for target in ['c','c-wasm','javascript','wgpu','webgpu']:
  result=subprocess.run([compiler,'emit-plan',source,plan,'--target',target,'-o',d/('unsupported-'+target)],capture_output=True,text=True)
  assert result.returncode and 'require the Rust or Rust-Wasm capability'in result.stderr,result.stderr
 selected=d/'selected.rs';run(compiler,'emit-plan',source,plan,'--target','rust','-o',selected)
 project=d/'selected';run(compiler,'emit-plan',source,plan,'--target','rust-wasm','-o',project)
 (project/'src/main.rs').write_bytes((ROOT/'tests/lowering-parity-runner.rs.txt').read_bytes())
 run('cargo','build','--offline','--quiet','--manifest-path',project/'Cargo.toml')
 out=run(project/'target/debug/compiled-state',d/'script.json');got=json.loads(out);expected=json.loads((d/'expected.json').read_text());assert got==expected,'native values/snapshots differ'
 run('cargo','build','--offline','--quiet','--lib','--target','wasm32-unknown-unknown','--manifest-path',project/'Cargo.toml')
 (d/'state-wasm.mjs').write_bytes((ROOT/'runtime/hosts/state-wasm.mjs').read_bytes())
 (d/'check.mjs').write_text("""import fs from 'node:fs';import assert from 'node:assert/strict';import {StatefulModule,parseExactJSON} from './state-wasm.mjs';
const module=await StatefulModule.instantiate(new Uint8Array(fs.readFileSync(new URL('selected/target/wasm32-unknown-unknown/debug/compiled_state.wasm',import.meta.url))));let state=module.create();
const steps=parseExactJSON(fs.readFileSync(new URL('script.json',import.meta.url),'utf8')),expected=parseExactJSON(fs.readFileSync(new URL('expected.json',import.meta.url),'utf8'));
const normal=v=>typeof v==='bigint'?v.toString():typeof v==='number'&&Number.isInteger(v)?String(v):Array.isArray(v)?v.map(normal):v&&typeof v==='object'?Object.fromEntries(Object.entries(v).map(([k,x])=>[k,normal(x)])):v;
let i=0;for(const s of steps){if(s.reject_restore){const before=Array.from(state.snapshot());assert.throws(()=>module.restore(new Uint8Array(s.reject_restore.map(Number))));assert.deepEqual(Array.from(state.snapshot()),before);continue;}if(s.restore){state.dispose();state=module.restore(new Uint8Array(s.restore.map(Number)));continue;}let reply;try{reply=s.pure?{value:state.pure(s.pure,s.args)}:{outcome:state.invoke(s.call,s.args)};}catch(error){reply={host_error:String(error.message??error)};}assert.deepEqual(normal(reply),normal(expected[i].reply),'reply '+i);assert.deepEqual(Array.from(state.snapshot()),expected[i].snapshot.map(Number),'snapshot '+i);i++;}state.dispose();console.log('Rust/Wasm checked physical carrier parity passed');""")
 print(run('node',d/'check.mjs').strip());print('Native checked physical carrier parity passed')
if __name__=='__main__':main()
