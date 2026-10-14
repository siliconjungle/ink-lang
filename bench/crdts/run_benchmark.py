#!/usr/bin/env python3
"""Complete local text-edit comparison with a pinned current Diamond Types."""
import argparse,gzip,hashlib,json,os,re,statistics,subprocess,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,default=ROOT/'build/compiler/debug/ink');p.add_argument('--quick',action='store_true');p.add_argument('--physical',choices=['scoped','direct'],default='scoped');p.add_argument('--inline-hints',action='store_true');a=p.parse_args()
build=ROOT/'build/crdt';label=a.physical+('-hints'if a.inline_hints else'');project=build/('run-native-'+label);build.mkdir(parents=True,exist_ok=True)
def run(args,**kw):return subprocess.run(list(map(str,args)),check=True,**kw)
if a.physical=='direct':
 import sys;sys.path.insert(0,str(ROOT/'knowledge'))
 from producers.physical_capabilities import produce
 plan=build/'direct-plan';produce(ROOT/'examples/crdts/run_graph.ink',a.compiler.resolve(),plan,[],0,bounds=False,buffers='direct')
 run([a.compiler,'emit-plan',ROOT/'examples/crdts/run_graph.ink',plan/'plan.json','--target','rust-wasm','-o',project],cwd=ROOT,capture_output=True)
else:run([a.compiler,'build',ROOT/'examples/crdts/run_graph.ink','--target','rust','-o',project],cwd=ROOT)
source=(project/'src/lib.rs').read_text()
if a.inline_hints:
 source=re.sub(r'(?m)^(pub )?(fn function_)',lambda m:'#[inline(always)]\n'+(m[1]or'')+m[2],source);(project/'src/lib.rs').write_text(source)
edit=re.search(r'pub fn function_l_local\(&self,l_edits:Vec<([^>]+)>',source).group(1)
cargo=project/'Cargo.toml';s=cargo.read_text().replace('[workspace]',f'diamond-types={{path={json.dumps(str(build/"upstreams/diamond-types"))}}}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]');cargo.write_text(s)
(project/'src/bin').mkdir(exist_ok=True);(project/'src/bin/bench.rs').write_text((HERE/'run_native.rs').read_text().replace('EDIT_TYPE',edit))
cases=[]
for n in ([1000,6000]if a.quick else [1000,6000,60000]):
 for pattern in ['append','prepend','middle']:
  edits=[];text=[]
  for i in range(n):
   pos=len(text)if pattern=='append'else 0 if pattern=='prepend'else len(text)//2
   value=97+i%26;edits.append(dict(position=pos,remove=0,text=[value]));text.insert(pos,value)
  cases.append(dict(name=f'{pattern}-{n}',edits=edits,expected=text))
if not a.quick:
 for path in sorted((build/'upstreams/diamond-types/benchmark_data').glob('*.json.gz')):
  with gzip.open(path,'rt')as f:d=json.load(f)
  if 'txns'not in d:continue
  edits=[]
  if d['startContent']:edits.append(dict(position=0,remove=0,text=list(map(ord,d['startContent']))))
  for txn in d['txns']:
   for pos,delete,ins in txn['patches']:edits.append(dict(position=pos,remove=delete,text=list(map(ord,ins))))
  cases.append(dict(name=path.name,edits=edits,expected=list(map(ord,d['endContent']))))
(build/'native-cases.json').write_text(json.dumps(cases)+'\n')
t=time.perf_counter_ns();run(['cargo','build','--release','--bin','bench'],cwd=project,env={**os.environ,'RUSTFLAGS':'-C target-cpu=native','CARGO_HOME':str(build.parent/'cargo-home')})
compile_ns=time.perf_counter_ns()-t
raw=subprocess.check_output([project/'target/release/bench',build/'native-cases.json'],text=True,cwd=ROOT)
rows=[json.loads(s)for s in raw.splitlines()]
for row in rows:
 row['median_ns']=statistics.median(row['samples_ns']);control=next(x for x in rows if x['case']==row['case']and x['variant']=='diamond_types');row['ratio_to_diamond']=row['median_ns']/statistics.median(control['samples_ns'])
report=dict(schema=1,physical=a.physical,experimental_inline_hints=a.inline_hints,phase='local edits plus complete text materialisation',rounds=11,warmup_rounds=2,compile_ns=compile_ns,
 upstreams=json.loads((build/'upstreams/pins.json').read_text()),compiler_sha256=hashlib.sha256(a.compiler.read_bytes()).hexdigest(),emitted_sha256=hashlib.sha256(source.encode()).hexdigest(),
 caveat='Complete local edit and text projection phase. Forward identity runs are compressed; reverse runs and event-graph range walking remain work. Concurrent merge, load and memory phases are additional required gates.',results=rows)
(build/('run-native-'+label+'-results.json')).write_text(json.dumps(report,indent=2)+'\n')
for row in rows:print(row['case'],row['variant'],round(row['median_ns']/1e6,3),'ms',round(row['ratio_to_diamond'],2),'x DT')
