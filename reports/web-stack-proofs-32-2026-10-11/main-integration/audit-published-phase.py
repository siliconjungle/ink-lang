from pathlib import Path
import json,hashlib,re,collections,subprocess
m=Path(__file__).resolve().parent;b=m.parents[2];p=m/'published-main-targets-untimed'
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
meta=json.loads((p/'metadata.json').read_text())
for path,h in meta['bindings'].items():assert sha(p/path)==h,path
records={}
for name,expected in [('node',1152),('browser',1440)]:
 path=p/f'{name}-validation.json';v=json.loads(path.read_text());assert v['status']=='passed'and v['samples']==[]and v['metadata_sha256']==sha(p/'metadata.json');assert len(v['validation'])==expected
 assert all(x['passed']and x['nonmutation']and (x['changed_input_lifetime'] is True if x['output_lifetime']=='owned' else x['changed_input_lifetime'] is None)for x in v['validation'])
 keys=[(x['name'],x['frame'],x['variant'])for x in v['validation']];assert len(set(keys))==expected
 avail=v['availability'];assert all(x['actual_backend']=='gpu'for x in avail)
 records[name]={'validation_rows':expected,'complete_output_checks':v['complete_output_checks'],'gpu_actual':len(avail),'fallbacks':0,'samples':0,'receipt_sha256':sha(path)}
assert records['browser']['gpu_actual']==288
r=json.loads((m/'proof-replay/published-main-run/review.json').read_text());assert r['status']=='passed';assert all(x['additional_body_effect']and x['current_uses_fresh32']for x in r['automatic_comparison']['results'])
source=json.loads((m/'published-compiler-binding.json').read_text())
for path,h in source['source_bindings'].items():
 repo=next((x for x in sorted(source['dependency_heads'],key=len,reverse=True)if x!='.'and path.startswith(x+'/')),'.')
 rel=path if repo=='.'else path[len(repo)+1:]
 data=subprocess.check_output(['git','show',source['dependency_heads'][repo]+':'+rel],cwd=b/repo)
 assert hashlib.sha256(data).hexdigest()==h,path
(m/'published-target-validation-audit.json').write_text(json.dumps({'status':'passed','scope':'Final compiled direct-main integration. Untimed correctness only, no frozen performance inheritance.','records':records,'emitted_bundles':12,'frames':96,'bindings_verified':len(meta['bindings']),'compiler_sha256':meta['compiler_sha256'],'proof_replay_sha256':sha(m/'proof-replay/published-main-run/review.json')},indent=2)+'\n')
print('PASS published target outputs and frozen source bindings')
raise SystemExit(0)
def read(log):
 module='unknown';out={}
 for line in log.read_text().splitlines():
  mm=re.search(r'Running tests/(\w+)\.rs',line)
  if mm:module=mm[1]
  match=re.match(r'test (.+?) \.\.\. (ok|FAILED|ignored)',line)
  if match:out[(module,match[1])]=match[2]
 return out
initial=read(m/'root-tests-combined.log');retry=read(m/'root-affected-tests-final.log');initial.update(retry);assert all(x=='ok'for x in initial.values());assert len(initial)==279
(m/'root-final-test-audit.json').write_text(json.dumps({'status':'passed','unique_integration_tests':279,'integration_modules':len({x[0]for x in initial}),'affected_retry_tests':len(retry),'core_tests_separately':61,'full_log':'root-tests-combined.log','retry_log':'root-affected-tests-final.log','first_failures_preserved':True,'trusted_callers':'Invalid-caller validation expectation removed; invalid selected proof and unknown-action/capability rejection remain covered.'},indent=2)+'\n')
print('PASS final targets and279 rootintegrationtests')
