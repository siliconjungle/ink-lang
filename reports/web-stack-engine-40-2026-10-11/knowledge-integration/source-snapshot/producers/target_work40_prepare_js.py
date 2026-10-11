"""Untimed full captured-JS boundary acquisition for a frozen broad suite.
Exact actual runner capture/consume expressions surround every emitted entry.
No native/Wasm/Rust/GPU counts are borrowed; training labels are not opened.
"""
import argparse,json,platform,subprocess,sys
from pathlib import Path
B=Path(__file__).resolve().parents[2];sys.path[:0]=[str(B/'planner'),str(B/'knowledge')]
from ink_planner.physical_features import file_hash,load_observation
from producers.target_work40_sidecar import produce


def prepare(report,version,compiler,parser,output):
 report=Path(report).resolve();output=Path(output).resolve();compiler=Path(compiler).resolve();parser=Path(parser).resolve()
 if output.exists():raise ValueError('preserve acquired feature preparation')
 meta=json.loads((report/'metadata.json').read_text());spec=json.loads((report/'spec.json').read_text());fixtures=json.loads((report/'fixtures.json').read_text())['frames']
 if version not in meta['versions']or file_hash(compiler)!=meta[version+'_compiler_sha256']:raise ValueError('actual frozen compiler/version binding')
 for name,digest in meta['bindings'].items():
  if file_hash(report/name)!=digest:raise ValueError('frozen suite byte drift '+name)
 output.mkdir(parents=True);logs=[];common=output/'boundary';common.mkdir()
 def run(args):
  p=subprocess.run(list(map(str,args)),capture_output=True,text=True,timeout=120);logs.append(dict(command=list(map(str,args)),returncode=p.returncode,stdout=p.stdout,stderr=p.stderr))
  if p.returncode:raise ValueError(p.stderr)
  return p.stdout
 runner=report/'runner.mjs';adapter=common/'adapter.mjs';adapter_i=common/'adapter.instrumented.mjs';adapter_r=common/'instrumentation.json';extraction=common/'extraction.json'
 run(['node',B/'knowledge/producers/target_work40_js_boundary.mjs',runner,parser,adapter,extraction]);run(['node',B/'knowledge/producers/target_work40_js.mjs',adapter,adapter_i,adapter_r,parser]);node_version=run(['node','--version']).strip();rows=[];counts=dict(frames=0,known=0,unknown=0)
 for task in spec['tasks']:
  name=task['name'];directory=output/name;directory.mkdir();root=report/'targets'/name;artifact=root/version/'program.mjs';instrumented=directory/'program.instrumented.mjs';instrumentation=directory/'instrumentation.json';trace=directory/'trace.json';fixture=directory/'fixtures.json'
  chosen=[f for f in fixtures if f['task']==name];fixture.write_text(json.dumps([dict(id=f['id'],entry=name,args=[f['xs'],f['ys'],f['seed'],f['k']],expected=f['expected'])for f in chosen])+'\n')
  run(['node',B/'knowledge/producers/target_work40_js.mjs',artifact,instrumented,instrumentation,parser]);run(['node',B/'knowledge/producers/target_work40_js_boundary_replay.mjs',artifact,instrumented,instrumentation,adapter,adapter_i,adapter_r,extraction,runner,fixture,trace])
  paths=dict(original_core=root/(version+'.literal.core.json'),selected_core=root/(version+'.core.json'),selection=root/(version+'.selection.json'),artifact=artifact,fixture=fixture,instrumenter=B/'knowledge/producers/target_work40_js.mjs',instrumented=instrumented,instrumentation=instrumentation,runner=B/'knowledge/producers/target_work40_js_boundary_replay.mjs',trace=trace,parser=parser,boundary_runner=runner,boundary_extractor=B/'knowledge/producers/target_work40_js_boundary.mjs',boundary_adapter=adapter,boundary_instrumented=adapter_i,boundary_instrumentation=adapter_r,boundary_receipt=extraction)
  boundary='captured-js-owned'if task['output_kind']=='list_u32'else'captured-js-value';cohort=dict(target='javascript',host=dict(engine='node',version=node_version,platform=platform.system(),machine=platform.machine()),boundary=boundary,emitter_sha256=file_hash(compiler),entry_abi='ink-javascript-trusted-values-v2')
  sidecars=produce(directory/'sidecars',paths,cohort);by_id={f['id']:f for f in chosen}
  for sidecar in sidecars:
   observation=load_observation(sidecar['path']);f=by_id[sidecar['fixture_id']];counts['frames']+=1;counts['known'if all(observation['known'].values())else'unknown']+=1
   if not f['timed']:continue
   rows.append(dict(id=version+'/'+f['id'],sidecar=str(Path(sidecar['path']).relative_to(output)),operation=task['operation'],size=f['dimensions']['size'],split=f['split'],version=version))
 (output/'features.json').write_text(json.dumps(rows,indent=2)+'\n');(output/'commands.json').write_text(json.dumps(logs,indent=2)+'\n');receipt=dict(status='prepared_untimed_exact_captured_js_boundary',metadata_sha256=file_hash(report/'metadata.json'),declaration_spec_sha256=file_hash(report/'spec.json'),fixtures_sha256=file_hash(report/'fixtures.json'),compiler_sha256=file_hash(compiler),producer_sha256=file_hash(__file__),features_sha256=file_hash(output/'features.json'),counts=counts,timed_feature_cells=len(rows),scope='Exact actual runner capture/consume source expressions, typed resident input setup excluded. Input capture visits/typed slice payload bytes/carrier construction, generated module work and full returned-word consumer visits acquired by executing exact untimed fixtures. No timing labels opened, no online prediction/selector speed claim. Native/Rust/Wasm/GPU acquisition unavailable here; never substitute these JS counts.')
 (output/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');return receipt


def main():
 p=argparse.ArgumentParser(description=__doc__)
 for k in('report','version','compiler','parser','output'):p.add_argument('--'+k,required=True)
 a=p.parse_args();print(json.dumps(prepare(a.report,a.version,a.compiler,a.parser,a.output)))
if __name__=='__main__':main()
