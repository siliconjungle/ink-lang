from pathlib import Path
import json,hashlib
r=Path(__file__).resolve().parents[1]
p=r/'targets-direct'
m=json.load(open(p/'metadata.json'))
s=json.load(open(r/'staging-direct/stage.json'))
sha=lambda f:hashlib.sha256(Path(f).read_bytes()).hexdigest()
checks=dict(all316bindings_match=all(sha(p/f)==h for f,h in m['bindings'].items()),compiler_binding=sha(m['compiler'])==m['compiler_sha256']==s['compiler_sha256'],staged_prior_snapshot=m['prior_snapshot']==s['fair_prior_snapshot'],staged_current_snapshot=m['new_snapshot']==s['snapshot'],same_unmodified_model=sha(p/'cost-model.json')==sha(r.parent/'web-stack-proofs-32-2026-10-11/cpu-cost-model.json')==m['cost_model_sha256'])
records=[]
for name,selection in m['selections'].items():
    assert selection['prior_equals_literal'] and selection['checked_changes_prior'] and selection['fresh_proof_required']
    a,b=selection['prior'],selection['checked']
    ar=json.load(open(p/Path(a['selection_path']).with_suffix('.receipt.json')))
    br=json.load(open(p/Path(b['selection_path']).with_suffix('.receipt.json')))
    assert ar['status']==br['status']=='passed' and ar['search']['cost_model']==br['search']['cost_model']
    assert b['applications'] and set(b['laws'])<=set(s['fresh_entries']) and set(b['laws'])==set(selection['fresh_laws'])
    assert a['applications']==0 and all(v['gpu']['eligible'] and v['gpu']['fallback_reason'] is None for v in (a,b))
    assert not any(n['op']=='scan' for n in b['gpu']['nodes'])
    assert a['gpu']['graph_stages']==(4 if 'heldout' in name else 2) and b['gpu']['graph_stages']==(2 if 'heldout' in name else 1)
    records.append(dict(name=name,initial_cost=br['search']['initial_cost'],selected_cost=br['search']['selected_cost'],prior_stages=a['gpu']['graph_stages'],checked_stages=b['gpu']['graph_stages'],checked_scan_stages=0,retained_map='heldout' in name,ordinary_checked=True))
n=json.load(open(p/'node-validation.json'))
na=json.load(open(p/'node-validation-audit.json'))
checks['node_untimed_full_validation']=n['status']==na['status']=='passed' and n['validate_only'] and not n['samples'] and na['validation']==1152 and na['complete_output_checks']==3072 and na['bindings']['metadata']==sha(p/'metadata.json') and na['bindings']['results']==sha(p/'node-validation.json')
result=dict(status='passed' if all(checks.values()) else 'failed',checks=checks,records=records,bindings_count=len(m['bindings']),metadata_sha256=sha(p/'metadata.json'),node_audit_sha256=sha(p/'node-validation-audit.json'),scope='Untimed reviewed preflight only. Four checked direct certificates selected naturally by same compiler/model. Actual WebGPU execution pending parent browser validation, no profitability claim.')
assert result['status']=='passed'
(r/'review/target-preflight-review.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
