"""Replay exact archived plans and six uniquely recorded source oracles."""
from pathlib import Path
import argparse,hashlib,json,subprocess,tarfile
from ink_planner.offline_measurements import reference_receipt
HERE=Path(__file__).resolve().parent
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--compiler',type=Path,required=True);p.add_argument('--scratch',type=Path,required=True);a=p.parse_args();compiler=a.compiler.resolve();out=a.scratch;out.mkdir(parents=True,exist_ok=False);before=sha(compiler);manifest=json.loads((HERE/'selected-inputs-index.json').read_bytes());assert sha(HERE/'selected-inputs.tar.gz')==manifest['archive_sha256'];source='ca2b86774a357d3698b322817d0f387d011195b36de09bc40f4ef0127c6abfa0'
 def run(args,label):
  r=subprocess.run([str(compiler),*map(str,args)],capture_output=True,text=True,timeout=180);(out/(label+'.stdout')).write_text(r.stdout);(out/(label+'.stderr')).write_text(r.stderr);assert r.returncode==0,(label,r.stderr[-3000:]);return r.stdout
 inputs={};oracles=[]
 with tarfile.open(HERE/'selected-inputs.tar.gz')as archive:
  def read(member):
   raw=archive.extractfile(member).read();assert hashlib.sha256(raw).hexdigest()==manifest['files'][member]['sha256'];inputs[member]=manifest['files'][member]['sha256'];return raw
  (out/'source.core.json').write_bytes(read('program/core.json'));assert sha(out/'source.core.json')==source
  for label,member in [('guard','program/searched.plan.json'),('zero-first','program-refined/searched.plan.json')]:
   path=out/(label+'.plan.json');path.write_bytes(read(member));run(['check-plan',out/'source.core.json',path,'--core'],'check-'+label)
  for split in ['training','holdout']:
   workload=json.loads(read('runtime-gpu/'+split+'.workload.json'))
   for phase,calls in workload['phases'].items():
    assert phase in {'power','nonpower','zero'};call=calls[0];label='oracle-'+split+'-'+phase+'-0';args=out/(label+'.args.json');args.write_text(json.dumps(call['args']));fresh=json.loads(run(['run',out/'source.core.json',call['function'],args,'--core','--input-receipt'],label));old=json.loads(read('runtime-gpu/oracle-'+split+'-'+phase+'-0.stdout'));result,fingerprint=reference_receipt(fresh,source,call['function']);assert (result,fingerprint)==reference_receipt(old,source,call['function']);oracles.append(dict(split=split,phase=phase,function=call['function'],input_sha256=fingerprint,receipt_sha256=sha(out/(label+'.stdout')),arguments_sha256=sha(args)))
 assert len(oracles)==6 and sha(compiler)==before
 (out/'terminal.json').write_text(json.dumps(dict(schema=1,exit_status=0,compiler_sha256=before,input_core_sha256=source,inputs=inputs,oracles=oracles,plans=['guard','zero-first'],scope='Ordinary merged-kernel proof replay and six complete original-source oracle values/input fingerprints, recorded separately by split/phase. No GPU timings, cost relabelling, publication or policy change.'),indent=2)+'\n');print('PASS both exact selected plans and six uniquely retained source oracles')
if __name__=='__main__':main()
