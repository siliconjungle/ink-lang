#!/usr/bin/env python3
"""Reproduce and locally check the frozen scalable-state candidates."""
import argparse, gzip, hashlib, json, pathlib, subprocess, time, os
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=pathlib.Path,default=pathlib.Path('target/debug/ink'));p.add_argument('--output',type=pathlib.Path,default=pathlib.Path('build/scalable-reproduction'));a=p.parse_args();a.compiler=a.compiler.resolve();os.environ["INK_COMPILER"]=str(a.compiler);a.output.mkdir(parents=True,exist_ok=True)
for name,query,tactic in [('bulk-maintenance','quantity_total','--aggregate-query'),('membership-cache','intersection','--membership-query')]:
 d=a.output/name;d.mkdir(exist_ok=True);source=pathlib.Path('knowledge/research')/name/'source.ink'
 started=time.perf_counter();subprocess.run([str(a.compiler),'emit-action-model',str(source),'-o',str(d/'model.json')],check=True,capture_output=True)
 projected=time.perf_counter();subprocess.run(['python3','knowledge/producers/representations.py',str(d/'model.json'),'--cache-query',query,'--preserve-cache','--compact-queries',tactic,'-o',str(d/'proposal.json')],check=True,capture_output=True)
 generated=time.perf_counter();request=json.load(open(d/'proposal.json'))['requests'][1];raw=json.dumps(request,sort_keys=True,separators=(',',':')).encode();(d/'request.json').write_bytes(raw)
 frozen=gzip.decompress((source.parent/'request.json.gz').read_bytes());assert raw==frozen, f'{name}: frozen request differs'
 result=subprocess.run([str(a.compiler),'check-representation',str(source),str(d/'request.json')],check=True,capture_output=True);receipt=json.loads(result.stdout);assert receipt['status']=='checked'
 checked=time.perf_counter();metadata=dict(name=name,request_sha256=hashlib.sha256(raw).hexdigest(),source=receipt['source'],representation=receipt['representation'],projection_seconds=projected-started,producer_seconds=generated-projected,checking_seconds=checked-generated)
 (d/'receipt.json').write_text(json.dumps(metadata,indent=2)+'\n');print(json.dumps(metadata),flush=True)
