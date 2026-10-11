#!/usr/bin/env python3
"""Time complete one-candidate native builds; no fabricated heap measurement."""
import argparse,json,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];directory=root/'build/point-delta-compile';directory.mkdir(parents=True,exist_ok=True);deps=root/'target/release/deps';source=root/'examples/point-query-delta.ink';samples=[]
# One coherent Cargo graph supplies the ordinary standalone codec dependencies.
graph=subprocess.run(['cargo','build','--offline','--release','--lib','--message-format=json'],cwd=root,check=True,capture_output=True,text=True)
artifacts=[json.loads(line) for line in graph.stdout.splitlines() if line.startswith('{')]
libs={}
for name in ['serde_json','sha2','num_bigint']:
    matches=[Path(file) for item in artifacts if item.get('reason')=='compiler-artifact' and item['target']['name']==name for file in item['filenames'] if file.endswith('.rlib')]
    if len(matches)!=1:raise RuntimeError(f'Expected one Cargo artifact for {name}: {matches}')
    libs[name]=matches[0]
for round in range(3):
    for label in (['direct','refresh','delta'] if round%2==0 else ['delta','refresh','direct']):
        request=root/f'knowledge/research/point-delta/{label}.json';body=directory/(label+'.rs');binary=directory/label;start=time.perf_counter_ns()
        subprocess.run([str(a.compiler.resolve()),'emit-representation',str(source),str(request),'-o',str(body)],check=True,capture_output=True)
        code=body.read_text()
        main='''\nfn main(){let mut state=State::new().unwrap();std::hint::black_box(state.invoke_json("zero",&serde_json::json!([])).unwrap());}\n'''
        body.write_text(code+main)
        command=['rustc','--edition=2021',str(body),'-o',str(binary),'-L','dependency='+str(deps),'-O','-C','lto=thin','-C','embed-bitcode=yes']
        for name,path in libs.items():command+=['--extern',name+'='+str(path)]
        subprocess.run(command,check=True,capture_output=True)
        ns=time.perf_counter_ns()-start
        subprocess.run([str(binary)],check=True,capture_output=True)
        samples.append(dict(candidate=label,plan=json.loads(request.read_text())['representation'],round=round,ns=ns,peak_bytes=None))
report=dict(schema=1,source=json.loads(request.read_text())['input_core_sha256'],rounds=3,library_profile='release',compiler='emit-representation then rustc -O -C lto=thin -C embed-bitcode=yes; complete candidate build, dependencies prebuilt',measurement_scope='read/check/emit and native compilation; post-build execution outside timing; compile independent of row count',memory_scope='compiler memory unmeasured',measurements=[dict(rows=rows,phase='compile',samples=samples) for rows in [0,24,48]])
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
