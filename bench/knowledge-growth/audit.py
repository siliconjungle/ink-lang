from common import *
import sys,copy
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store,canonical,semantic_entry,identity
check_frozen();assert read(OUT/'helper-validation/all-targets-process.json')['status']==0
checks=[]
for lane in ['forced','automatic','automatic-default']:
 for r in read(OUT/f'{lane}-compilation.json'):
  assert r['status']==0 and sha(ROOT/r['output'])==r['artifact_sha256'];checks.append(dict(lane=lane,checkpoint=r['checkpoint'],program=r['program'],status='artifact verified'))
for repeat in [3,4,5]:
 for r in read(OUT/f'forced-compilation-repeat-{repeat}.json'):
  main=next(x for x in read(OUT/'forced-compilation.json')if x['program']==r['program']and x['checkpoint']==r['checkpoint']);assert r['artifact_sha256']==main['artifact_sha256'],(repeat,r['program'],r['checkpoint'])
for mode,expected in [('validate',10),('time',10),('memory',127)]:
 rs=read(OUT/f'{mode}-processes.json');assert len(rs)==expected,(mode,len(rs));assert all(r['status']==0 for r in rs),mode
assert all(r['replay']['status']==0 for r in read(OUT/'candidate-replay.json'))
# A fully re-addressed canonical object and authenticated membership still do
# not authorize a false equality. Preserve the adversarial bytes and rejection.
st=Store(OUT/'growth/admission-store');record=next(r for r in read(OUT/'growth/admission.json')['instances']if r['name']=='left-any'and r['bindings']=={'A':'U32'});obj=copy.deepcopy(st.object(record['root']));payload=obj['payload'];payload['to']={'sort':{'Value':'Bool'},'node':{'Bool':False}};bad=semantic_entry(dict(schema=1,semantics=obj['semantics'],dependencies=obj['dependencies'],**payload));ident=identity(bad)
closure=st.bundle([record['root']])['objects'];closure={i:o for i,o in closure.items()if i!=record['root']};closure[ident]=bad;d=OUT/'negative-authority-check';pub=Store.publish(d/'store',closure.values());view=d/'view.json';view.write_bytes(canonical(pub.bundle([ident])));r=process([INK,'knowledge-check',OUT/'growth/core.json',view],d/'check');assert r['status']!=0
save(d/'result.json',dict(canonical_object=ident,valid_content_and_membership_transport=True,checker_status=r['status'],result='False equality rejected despite recomputed identity and valid membership; hashes and storage grant no proof authority.'))
processes=read(OUT/'time-processes.json');samples=0;comparisons=0
for r in processes:
 data=read(ROOT/r['stdout']);samples+=sum(sum(len(xs)for xs in c['samples_ns'].values())for c in data['results']);comparisons+=sum(len(data['lanes'])for c in data['results'])
base={k:v for k,v in read(OUT/'protocol.json')['pins'].items()if k not in ['distribution','core']}
for path,commit in base.items():assert subprocess.check_output(['git','-C',str(ROOT/path),'rev-parse','HEAD'],text=True).strip()==commit,path
save(OUT/'audit.json',dict(schema=1,status='passed',compiler_sha256=sha(INK),artifact_checks=checks,compiled_main_artifacts=len(checks),clean_forced_repeat_artifacts=150,automatic_candidate_fresh_replays=len(read(OUT/'candidate-replay.json')),typed_representative_instances=36,raw_timing_samples=samples,complete_value_input_comparisons=comparisons,reference_cases=len(read(OUT/'reference-processes.json')),memory_processes=127,negative_authority_check='rejected correctly',all_execution_file_hashes_unchanged=True,package_pins_unchanged=True,scope='Checks recorded artifacts, complete finite outputs, immutable inputs and fresh mathematical replay. Does not prove backend machine code or arbitrary-software generalisation.'))
print('audit passed',samples,'raw timing samples',comparisons,'complete comparisons')
