#!/usr/bin/env python3
"""Time complete one-candidate native builds; no fabricated heap measurement."""
import argparse,json,subprocess,time
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--output',type=Path,required=True);a=p.parse_args()
root=Path(__file__).resolve().parents[2];directory=root/'build/point-delta-compile';directory.mkdir(parents=True,exist_ok=True);deps=root/'target/release/deps';source=root/'examples/point-query-delta.ink';samples=[]
libs={name:max(deps.glob('lib'+name+'-*.rlib'),key=lambda p:p.stat().st_mtime) for name in ['verified_language','ink_runtime','serde_json']}
for round in range(3):
    for label in (['direct','refresh','delta'] if round%2==0 else ['delta','refresh','direct']):
        request=root/f'knowledge/research/point-delta/{label}.json';body=directory/(label+'.rs');binary=directory/label;start=time.perf_counter_ns()
        subprocess.run([str(a.compiler.resolve()),'emit-representation',str(source),str(request),'-o',str(body)],check=True,capture_output=True)
        code=body.read_text();prefix='use verified_language as ink_core; use verified_language::runtime as ink_runtime;\n'
        main='''\nfn main(){let module=ink_core::core::CheckedModule::from_source(ink_core::syntax::parse(include_str!(SOURCE)).unwrap()).unwrap();let args:Vec<_>=std::env::args().collect();let request:ink_core::representation::Request=serde_json::from_slice(&std::fs::read(&args[1]).unwrap()).unwrap();let plan=ink_core::representation::check(&module,&request).unwrap();let mut session=ink_runtime::representation::Session::new(plan,Native).unwrap();std::hint::black_box(session.invoke_json("zero",&serde_json::json!([])).unwrap());}\n'''.replace('SOURCE',json.dumps(str(source)))
        body.write_text(prefix+code+main)
        command=['rustc','--edition=2021',str(body),'-o',str(binary),'-L','dependency='+str(deps),'-O','-C','lto=thin','-C','embed-bitcode=yes']
        for name,path in libs.items():command+=['--extern',name+'='+str(path)]
        subprocess.run(command,check=True,capture_output=True)
        ns=time.perf_counter_ns()-start
        subprocess.run([str(binary),str(request)],check=True,capture_output=True)
        samples.append(dict(candidate=label,plan=json.loads(request.read_text())['representation'],round=round,ns=ns,peak_bytes=None))
report=dict(schema=1,source=json.loads(request.read_text())['input_core_sha256'],rounds=3,library_profile='release',compiler='emit-representation then rustc -O -C lto=thin -C embed-bitcode=yes; complete candidate build, dependencies prebuilt',measurement_scope='read/check/emit and native compilation; post-build execution outside timing; compile independent of row count',memory_scope='compiler memory unmeasured',measurements=[dict(rows=rows,phase='compile',samples=samples) for rows in [0,24,48]])
a.output.parent.mkdir(parents=True,exist_ok=True);a.output.write_text(json.dumps(report,indent=2)+'\n')
