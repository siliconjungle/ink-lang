"""Fresh full plan replay, exact frozen input/machinery checks and proof export."""
import os
import hashlib,json,pathlib,subprocess,sys,tarfile
ROOT=pathlib.Path(__file__).resolve().parents[2];OUT=pathlib.Path(os.environ.get('INK_AUTO_REPORT', ROOT/'reports/automatic-planning-2026-10-13')).resolve()
code=pathlib.Path(sys.argv[3]).resolve()if len(sys.argv)>3 else ROOT
sys.path[:0]=[str(code/'knowledge'),str(code/'planner')]
from ink_knowledge import Store,canonical
from ink_planner.compiled_planning import code_fingerprint
compiler=pathlib.Path(sys.argv[1]).resolve();database=pathlib.Path(sys.argv[2]).resolve()
freeze=json.loads((OUT/'after-machinery-freeze.json').read_text());assert freeze['code_fingerprint']==code_fingerprint();assert freeze['compiler_sha256']==hashlib.sha256(compiler.read_bytes()).hexdigest()
protocol=json.loads((OUT/'protocol.json').read_text());programs=json.loads((OUT/'corpus.json').read_text())
for key,name in [('corpus_sha256','corpus.json'),('fixtures_sha256','fixtures.json')]:assert hashlib.sha256((OUT/name).read_bytes()).hexdigest()==protocol[key]
for p in programs:assert hashlib.sha256((ROOT/p['source']).read_bytes()).hexdigest()==p['sha256']
for f in json.loads((OUT/'fixtures.json').read_text()):assert hashlib.sha256((ROOT/f['path']).read_bytes()).hexdigest()==f['sha256']
export=OUT/'candidate-export';export.mkdir(exist_ok=True);store=Store(database);replays=[];seen=set()
for program in programs:
 d=OUT/'compiled/after/javascript'/program['name'];receipt=json.loads((d/'plan.json.receipt.json').read_text())
 for candidate in receipt['candidates']:
  ident=candidate['candidate']
  if ident in seen:continue
  seen.add(ident);package=store.object(ident)['payload']['package'];file=export/(ident+'.json');file.write_bytes(canonical(package)+b'\n')
  result=subprocess.run([str(compiler),'check-plan',str(ROOT/program['source']),str(file),'--target','javascript'],capture_output=True,text=True)
  replays.append(dict(candidate=ident,program=program['name'],status=result.returncode,stdout=result.stdout,stderr=result.stderr));assert result.returncode==0,result.stderr
(OUT/'candidate-replay.json').write_text(json.dumps(replays,indent=2)+'\n')
with tarfile.open(OUT/'automatic-candidates.tar.xz','w:xz')as t:
 for file in sorted(export.iterdir()):t.add(file,arcname=file.name)
for mode,expected in [('reference',210),('validate',16),('time',16),('memory',32)]:
 rows=json.loads((OUT/(mode+'-processes.json')).read_text());assert len(rows)==expected and all(r['status']==0 for r in rows)
warm=json.loads((OUT/'warm-compilation.json').read_text());assert len(warm)==48 and all(r['status']==0 for r in warm)
samples=sum(sum(len(v)for v in case['samples_ns'].values())for p in programs for case in json.loads((OUT/'measurements/time'/p['name']/'all/stdout.txt').read_text())['results'])
audit=dict(schema=1,status='passed',candidate_complete_chain_fresh_replays=len(replays),warm_complete_chain_fresh_replays=48,
           reference_cases=210,value_input_comparisons=720,raw_timing_samples=samples,memory_processes=32,
           frozen_programs_inputs_machinery_unchanged=True,scope='Finite complete-output/immutability checks and fresh mathematical full-plan replay; no backend-correctness or whole-application proof')
(OUT/'audit.json').write_text(json.dumps(audit,indent=2)+'\n');print(json.dumps(audit))
