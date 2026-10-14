#!/usr/bin/env python3
"""Complete parsed-event ingestion, causal materialisation and output vs Diamond Types."""
import argparse,hashlib,json,os,re,statistics,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];HERE=Path(__file__).resolve().parent;B=ROOT/'build/crdt'
sys.path.insert(0,str(ROOT/'knowledge'))
from producers.physical_capabilities import produce
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--physical',choices=['scoped','direct'],default='direct');p.add_argument('--borrow',action='store_true');p.add_argument('--compact',action='store_true');p.add_argument('--dense',action='store_true');p.add_argument('--selection',type=Path);p.add_argument('--columns',action='store_true');p.add_argument('--inline-hints',action='store_true');a=p.parse_args()
compiler=ROOT/'build/compiler/debug/ink';source=ROOT/('examples/crdts/dense_graph.ink'if a.dense else'examples/crdts/compact_graph.ink'if a.compact else'examples/crdts/event_graph.ink');label=a.physical+('-borrow'if a.borrow else'')+('-dense'if a.dense else'-compact'if a.compact else'')+('-inline'if a.selection else'')+('-columns'if a.columns else'')+('-hints'if a.inline_hints else'');project=B/('event-native-'+label)
def run(args,**kw):return subprocess.run(list(map(str,args)),check=True,**kw)
if a.physical=='direct':
 plan=B/('event-plan-'+label);source_core=False
 if a.selection:
  run([compiler,'emit-core',source,'--selection',a.selection.resolve(),'-o',plan.with_suffix('.core.json')],capture_output=True)
  source=plan.with_suffix('.core.json');source_core=True
 records=[]
 if a.columns:
  run([compiler,'emit-core',source,*( ['--core']if source_core else[]),'-o',plan.with_suffix('.layouts.json')],capture_output=True)
  program=json.loads(plan.with_suffix('.layouts.json').read_text())['program']
  records=[name for name,fields in program['records'].items()if fields and all(t in ['U32','U64','Bool']for field,t in fields)]
 produce(source,compiler,plan,records,8 if a.columns else 0,bounds=False,buffers='direct',source_core=source_core)
 flags=['--core']if source_core else[]
 if a.borrow:
  from producers.planning_recipes import lexical_reads
  run([compiler,'emit-core',source,*flags,'-o',plan/'core.json'],capture_output=True)
  physical=json.loads((plan/'physical.json').read_text());physical['borrow_reads']=sorted(lexical_reads(json.loads((plan/'core.json').read_text())['program']))
  (plan/'physical.json').write_text(json.dumps(physical));run([compiler,'check-physical-plan',source,plan/'physical.json',*flags],capture_output=True)
  packet=json.loads((plan/'plan.json').read_text());packet['steps'][0]['package']=physical;(plan/'plan.json').write_text(json.dumps(packet))
 run([compiler,'emit-plan',source,plan/'plan.json',*flags,'--target','rust-wasm','-o',project],cwd=ROOT,capture_output=True)
else:run([compiler,'build',source,'--target','rust','-o',project],cwd=ROOT,capture_output=True)
code=(project/'src/lib.rs').read_text()
if a.inline_hints:
 code=re.sub(r'(?m)^(pub )?(fn function_)',lambda m:'#[inline(always)]\n'+(m[1]or'')+m[2],code);(project/'src/lib.rs').write_text(code)
event=re.search(r'pub fn function_l_materialize\(&self,l_events:Vec<([^>]+)>',code).group(1)
cargo=project/'Cargo.toml';cargo.write_text(cargo.read_text().replace('[workspace]',f'diamond-types={{path={json.dumps(str(B/"upstreams/diamond-types"))}}}\n[profile.release]\nlto="thin"\ncodegen-units=1\n[workspace]'))
(project/'src/bin').mkdir(exist_ok=True);(project/'src/bin/bench.rs').write_text((HERE/'event_native.rs').read_text().replace('EVENT_TYPE',event))
cases=json.loads((B/'event-graph-fixtures.json').read_text())
for i,c in enumerate(cases):c['name']=f'concurrent-seed-{i}'
for n in [1000,6000]:
 for pattern in ['append','prepend','middle']:
  events=[];text=[]
  for i in range(n):
   pos=len(text)if pattern=='append'else 0 if pattern=='prepend'else len(text)//2;id=(1<<32)+i+1
   events.append(dict(id=id,parents=[]if i==0 else[id-1],position=pos,insert=True,value=97+i%26));text.insert(pos,97+i%26)
  cases.append(dict(name=f'{pattern}-{n}',events=events,expected=text))
(B/'event-native-cases.json').write_text(json.dumps(cases)+'\n')
run(['cargo','build','--release','--bin','bench'],cwd=project,env={**os.environ,'CARGO_HOME':str(ROOT/'build/cargo-home'),'RUSTFLAGS':'-C target-cpu=native'})
rows=[json.loads(x)for x in subprocess.check_output([project/'target/release/bench',B/'event-native-cases.json'],text=True).splitlines()]
for row in rows:
 row['median_ns']=statistics.median(row['samples_ns']);dt=next(x for x in rows if x['case']==row['case']and x['variant']=='diamond_types');row['ratio_to_diamond']=row['median_ns']/statistics.median(dt['samples_ns'])
report=dict(schema=1,physical=label,experimental_inline_hints=a.inline_hints,phase=__doc__,compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),emitted_sha256=hashlib.sha256(code.encode()).hexdigest(),upstreams=json.loads((B/'upstreams/pins.json').read_text()),results=rows)
(B/('event-native-'+label+'-results.json')).write_text(json.dumps(report,indent=2)+'\n')
for row in rows:print(row['name'],row['variant'],round(row['median_ns']/1000,1),'us',round(row['ratio_to_diamond'],2),'x')
