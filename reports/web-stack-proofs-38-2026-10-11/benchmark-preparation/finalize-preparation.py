import hashlib,json
from pathlib import Path
B=Path(__file__).resolve().parents[3]
R=B/'reports/web-stack-proofs-38-2026-10-11'; P=R/'targets'; prep=R/'benchmark-preparation'
def read(p): return json.loads(p.read_text())
def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
m=read(P/'metadata.json'); n=read(P/'native/metadata.json'); c=read(prep/'control-validation.json'); fixtures=read(P/'fixtures.json'); spec=read(P/'spec.json')
for directory,metadata in [(P,m),(P/'native',n)]:
 for path,digest in metadata['bindings'].items():
  assert sha(directory/path)==digest,(directory,path)
assert n['main_metadata_sha256']==sha(P/'metadata.json')
assert len(n['validation'])==384 and all(v['passed'] for v in n['validation'])
assert c['status']=='passed' and c['frames']==96 and c['complete_outputs']==192
assert all(all(row[k] for k in ['js_complete','rust_wasm_complete','input_nonmutation','js_owned_lifetime','suffix_values_and_length_unobserved','full_vector_consumption_code']) for row in c['rows'])
node=read(P/'node-validation-audit.json'); browser=read(P/'browser-validation-audit.json')
assert node['status']==browser['status']=='passed' and not node['timed'] and not browser['timed']
assert node['validation']==1152 and node['complete_output_checks']==3072
assert browser['validation']==1440 and browser['complete_output_checks']==3936 and browser['actual_gpu_validation']==288 and browser['fallback_validation']==0
assert len(fixtures['frames'])==96
assert not list(P.glob('*results.json')) and not list((P/'native').glob('*results.json'))
selections=[]
for task in spec['tasks']:
 name=task['name']; v=m['selections'][name]
 assert v['prior']['applications']==0 and v['checked']['applications']==1 and v['prior_equals_literal'] and v['checked_changes_prior']
 costs={}
 for version in ['prior','checked']:
  receipt=read(P/'targets'/name/(version+'.selection.receipt.json'))
  costs[version]={'initial':receipt['search']['initial_cost'],'selected':receipt['search']['selected_cost'],'applications':v[version]['applications']}
 assert costs['checked']['selected']<costs['prior']['selected']
 for version in ['literal','prior']:
  assert v[version]['gpu']['graph_required'] and v[version]['gpu']['graph_stages']==4 and v[version]['gpu']['eligible']
 assert not v['checked']['gpu']['graph_required'] and v['checked']['gpu']['eligible']
 selections.append({'name':name,'padded_side':task['padded_side'],'secondary_composition_probe':task['secondary'],'both_values_observed':True,'fresh_laws':v['fresh_laws'],'costs':costs,'routes':{version:v[version]['gpu'] for version in ['literal','prior','checked']}})
paths=[P/'metadata.json',P/'spec.json',P/'fixtures.json',P/'commands.json',P/'node-validation.json',P/'node-validation-audit.json',P/'browser-validation.json',P/'browser-validation-audit.json',P/'native/metadata.json',P/'native/commands.json',prep/'control-spec.json',prep/'control-fixtures.json',prep/'control-validation.json',prep/'control-commands.json',prep/'rust-expert.wasm',prep/'prepare.log',prep/'node-validation.log',prep/'native-preparation.log',prep/'padded-indexed-probe.log',Path(__file__).resolve()]
paths.extend(sorted((prep/'padded-indexed-probe').rglob('summary.json')))
o={'status':'passed','timed':False,'report':str(P),'result_kind':'list_u32','compiler_sha256':m['compiler_sha256'],'model_sha256':m['cost_model_sha256'],'prior_snapshot':m['prior_snapshot'],'current_snapshot':m['new_snapshot'],'prepared_bindings_verified':len(m['bindings']),'native_bindings_verified':len(n['bindings']),'fixtures':96,'timed_cells':24,'ordinary_selection':{'prior_members':2534,'current_members':2550,'all_four_prior_unchanged':True,'all_four_current_one_fresh_application':True,'cost_policy_unchanged':True,'candidate_forcing':False},'strong_controls':{'frames':96,'complete_outputs':192,'input_nonmutation':True,'owned_lifetime':True,'suffix_values_and_length_perturbation':True,'both_mapper_results_observed':True,'full_word_checksum_validation':True},'node':node,'browser':browser,'native':{'status':'prepared','full_vector_output_and_input_nonmutation_checks':384,'samples':0,'result_kind':n['result_kind'],'boundary':n['boundary']},'web_consumption':{'rule':'length + sum((index+1)*word) modulo2^32','every_returned_element_read_inside_timer':True,'common_instrumentation_overhead_included':True,'journal_fields':['consumed_elements_per_call','consumed_elements','checksum_semantics'],'audit':'independent Python checksum times iterations modulo2^32 and exact element counts; full correctness outside timers','native_scope':'separate full-vector U64 protocol, not pooled with web'},'boundaries':list(m['protocol']['boundaries'])+['resident-native-destination','captured-native-destination'],'gpu_contract':{'logical_output_extent':'nx','prior_and_literal':{'primary_route':'required graph with four active stages','dispatches':4,'including_empty_inputs':True,'upload_bytes':'4*(nx+ny+4)','readback_bytes':'4*(nx+1)'},'checked':{'primary_route':'legacy single shader; alternate one-node graph descriptor inactive','physical_capacity':'nx; lengths [0]','dispatches':'1 iff nx>0, else 0','upload_bytes':'4*(nx+ny+9)','readback_bytes':'4*(nx+1)'},'comparison':'active graph four dispatches to one (zero for empty xs); upload increases 20 bytes; readback unchanged; both declared public inputs transported equally'},'scope':'Fixed scalar composition probes are not statistical holdouts. Word, index-branch and suffix shape regimes are jointly varied, not independent axes. No measured performance claim or timing runs in preparation.','selections':selections,'bindings':{str(p.relative_to(B)):sha(p) for p in paths}}
(prep/'completion-receipt.json').write_text(json.dumps(o,indent=2)+'\n')
print(json.dumps({'status':'passed','main_metadata':sha(P/'metadata.json'),'native_metadata':sha(P/'native/metadata.json'),'completion_receipt':sha(prep/'completion-receipt.json'),'bindings':len(o['bindings'])}))
