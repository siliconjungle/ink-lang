"""Split audited raw Node captured-JS labels without computing heldout summaries.
Training extraction reads ns only after the frozen feature split admits a row.
Evaluation extraction additionally binds the already frozen predictions.
"""
import argparse,json,sys
from pathlib import Path
B=Path(__file__).resolve().parents[2];sys.path[:0]=[str(B/'planner'),str(B/'knowledge')]
from ink_planner.physical_features import file_hash,load_observation
from producers.web_cost40 import features,write


def training_view(report,path,metadata,audit):
 view=json.loads(Path(path).read_text())
 if view.get('schema')!=1 or view.get('kind')!='general40-audited-training-view-v1' or view.get('status')!='passed':raise ValueError('audited restricted training view required')
 required=['metadata.json','spec.json','fixtures.json','node-results.json','node-audit.json']
 if set(view.get('source_bindings',{}))!=set(required) or any(file_hash(report/name)!=view['source_bindings'][name]for name in required):raise ValueError('restricted training source drift')
 if view.get('metadata_sha256')!=file_hash(report/'metadata.json') or view.get('prepared_bindings')!=metadata['bindings'] or view.get('protocol')!=metadata['protocol']:raise ValueError('restricted training metadata association')
 if audit.get('bindings',{}).get('results')!=view['source_bindings']['node-results.json']:raise ValueError('restricted training result audit')
 fixtures=json.loads((report/'fixtures.json').read_text())['frames'];allowed={f['id']for f in fixtures if f['timed']and f['split']=='train'}
 if len(allowed)!=48 or view.get('frames')!=sorted(allowed):raise ValueError('restricted training frozen coverage')
 if any(sample['frame']not in allowed or sample['split']!='train'for sample in view['samples']):raise ValueError('heldout row in training view')
 return view


def extract(mode,report,features_path,protocol,output,frozen=None,view_path=None):
 report=Path(report).resolve();index=features(features_path);meta=json.loads((report/'metadata.json').read_text());raw_path=report/'node-results.json';audit_path=report/'node-audit.json';audit=json.loads(audit_path.read_text())
 if audit.get('status')!='passed'or audit.get('host')!='node'or audit.get('timed')is not True or audit.get('bindings',{}).get('metadata')!=file_hash(report/'metadata.json')or audit['bindings'].get('results')!=file_hash(raw_path):raise ValueError('actual bound Node timing audit required')
 if view_path is not None:
  if mode!='training':raise ValueError('restricted view only for training')
  raw=training_view(report,view_path,meta,audit)
 else:
  raw=json.loads(raw_path.read_text())
  if raw.get('metadata_sha256')!=file_hash(report/'metadata.json')or audit.get('samples')!=len(raw['samples']):raise ValueError('audited raw metadata/sample count')
 for path,digest in meta['bindings'].items():
  if file_hash(report/path)!=digest:raise ValueError('frozen timed suite drift '+path)
 points=[]
 for sample in raw['samples']:
  # Other language/host/boundary cohorts never supply labels for these features.
  if not sample['variant'].endswith('_js_owned'):continue
  version=sample['variant'][:-len('_js_owned')];id=version+'/'+sample['frame']
  if id not in index:continue
  feature=index[id];is_train=feature['split']=='train'
  if (mode=='training')!=is_train:continue
  observation=feature['observation'];root=report/'targets'/sample['name'];
  if observation['cohort']['host']['version']!=raw['host']or observation['cohort']['boundary']!=sample['boundary']or observation['cohort']['emitter_sha256']!=meta[version+'_compiler_sha256']:raise ValueError('actual target-specific timing/feature cohort mismatch')
  for binding,path in [('artifact',root/version/'program.mjs'),('selection',root/(version+'.selection.json')),('original_core',root/(version+'.literal.core.json')),('selected_core',root/(version+'.core.json'))]:
   if file_hash(path)!=observation['bindings'][binding]['sha256']:raise ValueError('feature differs from timed emitted artifact/core/selection')
  # No ns_per_call access for a cell excluded above by its frozen split.
  points.append(dict(feature_id=id,round=sample['round'],ns_per_call=sample['ns_per_call']))
 sources=[dict(path=str(p),sha256=file_hash(p))for p in [report/'metadata.json',raw_path,audit_path,Path(features_path).resolve()]+([Path(view_path).resolve()]if view_path is not None else[])]
 if mode=='training':data=dict(schema=1,kind='ink-target-work-training-v1',protocol_sha256=file_hash(protocol),sources=sources,rows=points)
 else:
  if frozen is None:raise ValueError('prediction freeze before heldout extraction')
  data=dict(schema=1,kind='ink-target-work-heldout-v1',freeze_sha256=file_hash(Path(frozen)/'freeze.json'),sources=sources,rows=points)
 write(output,data);return dict(status='extracted_'+mode,samples=len(points),scope='Exact audited target/host/boundary/emitter/core/artifact JS cohort; disjoint frozen training split, no summary calculation or other-target substitution')


def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=('training','heldout'))
 for name in('report','features','protocol','output'):p.add_argument('--'+name,required=True)
 p.add_argument('--frozen');p.add_argument('--training-view');a=p.parse_args();print(json.dumps(extract(a.mode,a.report,a.features,a.protocol,a.output,a.frozen,a.training_view)))
if __name__=='__main__':main()
