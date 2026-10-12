"""Reproduce checked generic pipeline JS ablations and a pinned Lodash baseline."""
import argparse,json,subprocess,sys,hashlib,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path.insert(0,str(ROOT/'tools'))
from pipeline_templates import generate_selection
p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,default=ROOT/'target/debug/ink');p.add_argument('--output',type=Path,default=ROOT/'build/broad-pipelines');p.add_argument('--lodash',type=Path,required=True);p.add_argument('--before-bundle',type=Path);args=p.parse_args()
compiler=args.compiler.resolve();out=args.output.resolve();out.mkdir(parents=True,exist_ok=True)
start=time.perf_counter();receipt=generate_selection(compiler,out);authoring=time.perf_counter()-start
source=ROOT/'tests/fixtures/pipeline-templates.ink';times={}
for lane,selection in [('baseline',[]),('selected',['--selection',str(out/'selection.json')])]:
 start=time.perf_counter();r=subprocess.run([str(compiler),'build',str(source),'--target','javascript',*selection,'-o',str(out/(lane+'.mjs'))],capture_output=True,text=True);assert r.returncode==0,r.stderr;times[lane]=time.perf_counter()-start
result=subprocess.run(['node','--expose-gc',str(Path(__file__).with_name('run.mjs')),str(out),str(args.lodash.resolve()),*([str(args.before_bundle.resolve())]if args.before_bundle else [])],capture_output=True,text=True,timeout=600);assert result.returncode==0,result.stderr
report=json.loads(result.stdout);report['compiler_sha256']=hashlib.sha256(compiler.read_bytes()).hexdigest();report['source_sha256']=hashlib.sha256(source.read_bytes()).hexdigest();report['selection_sha256']=hashlib.sha256((out/'selection.json').read_bytes()).hexdigest();report['artifact_sha256']={lane:hashlib.sha256((out/(lane+'.mjs')).read_bytes()).hexdigest()for lane in times};report['compilation_seconds']=dict(template_instantiation_and_replay=authoring,**times);report['conformance']=receipt
(out/'results.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(dict(results=str(out/'results.json'),compilation_seconds=report['compilation_seconds'])))
