#!/usr/bin/env python3
"""Read-only untimed native coverage/input/binding audit; never executes kernels."""
import argparse,hashlib,json,struct
from pathlib import Path
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def read(p):return json.loads(Path(p).read_text())
def audit(report):
 p=Path(report);n=p/'native';main=read(p/'metadata.json');native=read(n/'metadata.json')
 if main['status']!='prepared'or native['status']!='prepared':raise ValueError('unprepared targets')
 if native['main_metadata_sha256']!=sha(p/'metadata.json'):raise ValueError('native/main binding')
 for root,m in [(p,main),(n,native)]:
  for path,h in m['bindings'].items():
   if sha(root/path)!=h:raise ValueError('bound drift '+path)
 frames=read(p/'fixtures.json')['frames'];ids={f['id']for f in frames}
 if len(ids)!=len(frames)or set(native['binaries'])!=ids:raise ValueError('fixture input coverage')
 expected_libraries=set(main['versions'])|{'expert','expert_rust_owned'}|{v+'_rust'for v in main['versions']if main['rust_targets'][v]['status']=='prepared'}
 if set(native['libraries'])!=expected_libraries:raise ValueError('native capability coverage')
 rows=native['validation'];expected={(f,v)for f in ids for v in expected_libraries}
 if len(rows)!=len(expected)or{(r['frame'],r['variant'])for r in rows}!=expected or any(r['passed']is not True for r in rows):raise ValueError('native complete-output validation coverage')
 for f in frames:
  wanted=struct.pack('<QQII',len(f['xs']),len(f['ys']),f['seed'],f['k'])+struct.pack('<'+'I'*(len(f['xs'])+len(f['ys'])),*f['xs'],*f['ys'])
  if Path(native['binaries'][f['id']]).read_bytes()!=wanted:raise ValueError('driver input differs '+f['id'])
 if any((n/name).exists()for name in ['results.json','journal.json','journal.ndjson']):raise ValueError('timing artifacts in preparation audit')
 return dict(status='passed',timed=False,frames=len(frames),libraries=sorted(expected_libraries),validation=len(rows),driver_input_replays=len(frames),bindings=dict(main_metadata=sha(p/'metadata.json'),native_metadata=sha(n/'metadata.json'),fixtures=sha(p/'fixtures.json')),audit_tool_sha256=sha(__file__),scope='Saved full-output/nonmutation preflight coverage, exact driver inputs and source/binary hashes; no target execution or timing, no refinement-proof claim')
def main():
 a=argparse.ArgumentParser();a.add_argument('--report',type=Path,required=True);x=a.parse_args();r=audit(x.report);target=x.report/'native/preparation-audit.json'
 if target.exists():raise ValueError('preserve prior preparation audit')
 target.write_text(json.dumps(r,indent=2)+'\n');print(json.dumps(r))
if __name__=='__main__':main()
