#!/usr/bin/env python3
"""Validate retained lifecycle report coverage and artifact provenance."""
import argparse,hashlib,json,re,statistics,subprocess,tempfile
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__);p.add_argument('report',type=Path);p.add_argument('--project',type=Path,required=True);p.add_argument('--source',type=Path,required=True);p.add_argument('--control-source',type=Path);p.add_argument('--control-compiler',type=Path);p.add_argument('--plan',type=Path);p.add_argument('--control-plan',type=Path);p.add_argument('--cases',type=Path,required=True);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--owned-document',action='store_true');p.add_argument('-o',type=Path,required=True);a=p.parse_args()
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
r=json.loads(a.report.read_text());assert r['compiler_sha256']==sha(a.compiler)and r['source_sha256']==sha(a.source)and r['input_sha256']==sha(a.cases)
if 'input_core_sha256'in r:
 with tempfile.TemporaryDirectory(prefix='ink-crdt-source-audit-')as temporary:
  actual=json.loads(subprocess.check_output([a.compiler.resolve(),'emit-core',a.source.resolve(),'-o',Path(temporary)/'core.json'],text=True))['core_sha256']
 assert actual==r['input_core_sha256']
 if a.plan:assert actual==json.loads(a.plan.read_text())['input_core_sha256']
 else:
  assert r['source_build_manifest_sha256']==sha(a.project/'plan.json')
  assert actual==json.loads((a.project/'plan.json').read_text())['input_core_sha256']
for field,plan,compiler,source in [('plan_sha256',a.plan,a.compiler,a.source),('control_plan_sha256',a.control_plan,a.control_compiler or a.compiler,a.control_source)]:
 assert (field in r)==bool(plan)
 if plan:
  assert r[field]==sha(plan)
  subprocess.run([compiler.resolve(),'check-plan',source.resolve(),plan.resolve(),'--target','rust'],check=True,capture_output=True)
binary='owned_compare'if a.owned_document else'persistent_compare'
assert r['emitted_sha256']==sha(a.project/'src/lib.rs')and r['executable_sha256']==sha(a.project/'target/release'/binary)
assert r['harness_sha256']==sha(a.project/'src/bin'/(binary+'.rs'))and r['native_adapter_sha256']==sha(a.project/'src/bin/persistent_diamond.rs')
if 'auxiliary_emitted_sha256'in r:
 actual={str(f.relative_to(a.project)):sha(f)for f in sorted((a.project/'src').glob('*.rs'))if f.name not in ['lib.rs','main.rs','control.rs']}
 assert actual==r['auxiliary_emitted_sha256']
variants={'ink_owned_document'if a.owned_document else'ink_retained_causal','diamond_types_document'}
if a.control_source:
 variants.add('ink_transactional_control'if a.owned_document else'ink_control');assert r.get('control_compiler_sha256',r['compiler_sha256']if a.owned_document else None)==sha(a.control_compiler or a.compiler);assert r['control_source_sha256']==sha(a.control_source)and r['control_link_wrapper_sha256']==sha(a.project/'src/control.rs')
 original=re.sub(r'#\[export_name="ink_control_(lang_[A-Za-z_][A-Za-z0-9_]*)"\]', '#[no_mangle]',(a.project/'src/control.rs').read_text())
 assert hashlib.sha256(original.encode()).hexdigest()==r['control_emitted_sha256']
cases=json.loads(a.cases.read_text());assert len(r['results'])==len(cases)*len(variants)
assert {(row['case'],row['variant'])for row in r['results']}=={(c['name'],v)for c in cases for v in variants}
for c in cases:
 for row in [x for x in r['results']if x['case']==c['name']]:
  assert row['retained_batches']==len(c['changes'])//2 and row['merged_batches']==len(c['changes'])-len(c['changes'])//2 and row.get('merge_chunk',r['merge_chunk']if a.owned_document else None)==r['merge_chunk']
  if c['expected']is not None:assert row['output_codepoints']==len(c['expected'])
  if not a.owned_document:assert row['checkpoint_bytes']>0
  for phase in (['merge']if a.owned_document else['merge','save','load']):
   xs=row[phase+'_samples_ns'];assert len(xs)==r['rounds']and all(type(x)is int and x>0 for x in xs)and row[phase+'_median_ns']==statistics.median(xs)
pin=subprocess.check_output(['git','rev-parse','HEAD'],cwd=Path(__file__).resolve().parents[2]/'build/crdt/upstreams/diamond-types',text=True).strip();assert pin==r['diamond_types_revision']
a.o.write_text(json.dumps(dict(status='passed',report_sha256=sha(a.report),compiler_sha256=r['compiler_sha256'],diamond_types_revision=pin,scope='Current artifact hashes, wrapper reversal, fixture/variant/phase coverage and sample consistency; harness validates full text outside timing; no universal equivalence or peak-memory claim'),indent=2)+'\n')
