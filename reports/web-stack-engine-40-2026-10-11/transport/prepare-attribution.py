"""Prepare instrumented complete-call attribution; never runs timers.
Only source-bound bundles are accepted. Instrumented results are diagnosis,
not uninstrumented performance estimates or backend correctness proofs.
"""
from pathlib import Path
import argparse,json,hashlib,shutil
B=Path(__file__).resolve().parents[3]
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def prepare(bundle,out,host,device=None):
 assert not out.exists(),'preserve prior preparations'
 out.mkdir(parents=True)
 manifest=json.loads((bundle/'manifest.json').read_text());assert manifest['schema']==2
 for source in bundle.iterdir():
  if source.is_file() and source.name!='attribution-preparation.json' and source.suffix in ['.mjs','.json','.wasm','.wgsl']:shutil.copy2(source,out/source.name)
 if device:shutil.copy2(device,out/'ink-device.mjs')
 source=host.read_text()
 # Instrument nested spans on a report-only clone. Runtime/backend selection
 # remains literal; no source names, data values or law hashes tune this tool.
 for name in ['pack','unpack','cpuCall']:
  old='function '+name+'(';assert source.count(old)==1,old;source=source.replace(old,'function '+name+'Implementation(',1)
  source+='\nfunction '+name+'(...args){return attribute('+json.dumps(name)+',()=>'+name+'Implementation(...args));}\n' if name!='cpuCall' else ''
 # cpuCall is lexical to loadInk, so insert its wrapper beside that declaration.
 source=source.replace('  function cpuCallImplementation(',"  function cpuCall(...args){return attribute('cpu-total',()=>cpuCallImplementation(...args));}\n  function cpuCallImplementation(",1)
 anchor='values[i]=s.f.javascript(...args);';assert anchor in source;source=source.replace(anchor,"values[i]=attribute('execution',()=>s.f.javascript(...args));")
 anchor='const value=f.output(f.javascript(...args));';assert anchor in source;source=source.replace(anchor,"const value=attribute('execution',()=>f.output(f.javascript(...args)));")
 anchor='cpu.ink_compute_call(f.index, ptrs, lengths, header, header + 4);';assert anchor in source;source=source.replace(anchor,"attribute('execution',()=>"+anchor[:-1]+');')
 anchor='const result = direct(f.index, ptrs, lengths);';assert anchor in source;source=source.replace(anchor,"const result = attribute('execution',()=>direct(f.index,ptrs,lengths));")
 anchor='      for (let i = 0; i < args.length; i++) {';assert anchor in source;source=source.replace(anchor,"      attribute('arena-upload',()=>{\n"+anchor,1)
 anchor='      // The declared result type';assert anchor in source;source=source.replace(anchor,'      });\n'+anchor,1)
 source="const attribute=(name,fn)=>globalThis.__INK_TRANSPORT_ATTRIBUTION__.span(name,fn);\n"+source
 (out/'ink-compute.mjs').write_text(source)
 receipt={'status':'prepared_untimed','original_host_sha256':sha(host),'instrumented_host_sha256':sha(out/'ink-compute.mjs'),'bundle_manifest_sha256':sha(bundle/'manifest.json'),'phase_spans':['pack','arena-upload','execution','unpack','cpu-total'],'span_rule':'Nested inclusive intervals. cpu-total includes upload/execution/output; subtract union of child spans to inspect residual. Instrumented phase results do not establish uninstrumented speed. Caller capture during pack retained; external consumer timed by runner.','bindings':{p.name:sha(p)for p in sorted(out.iterdir())if p.is_file()}}
 (out/'attribution-preparation.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps({'status':'prepared_untimed','out':str(out),'bindings':len(receipt['bindings'])}))
if __name__=='__main__':
 p=argparse.ArgumentParser();p.add_argument('--bundle',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--host',type=Path,default=B/'runtime/hosts/ink-compute.mjs');p.add_argument('--device',type=Path);a=p.parse_args();prepare(a.bundle.resolve(),a.out.resolve(),a.host.resolve(),a.device.resolve()if a.device else None)
