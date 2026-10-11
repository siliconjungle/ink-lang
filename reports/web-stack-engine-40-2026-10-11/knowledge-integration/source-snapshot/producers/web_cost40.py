"""Offline literal-feature calibration with disjoint freeze/evaluate inputs.

Freeze never opens a heldout timing file. All exact fixture features may be
acquired untimed; acquisition/output knowledge is excluded from model speed
claims. Models stay opt-in and no default or canonical catalogue is modified.
"""
import argparse,hashlib,json,math,statistics,sys
from collections import defaultdict
from pathlib import Path
B=Path(__file__).resolve().parents[2];sys.path[:0]=[str(B/'planner'),str(B/'knowledge')]
from ink_planner.physical_features import PhysicalPrices,load_observation,file_hash,read_json


def encoded(data):return (json.dumps(data,sort_keys=True,separators=(',',':'),allow_nan=False)+'\n').encode()
def identity(data):return hashlib.sha256(encoded(data)).hexdigest()
def write(path,data):
    path=Path(path);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('xb')as f:f.write(encoded(data))


def fit(features,times,components):
    if not times or len(features)!=len(times):raise ValueError('training shape')
    if any(type(y)not in(int,float)or not math.isfinite(y)or y<=0 for y in times):raise ValueError('finite positive raw ns required')
    x=[[float(row[k])/y for k in components]for row,y in zip(features,times)]
    scales=[math.sqrt(sum(row[j]**2 for row in x))for j in range(len(components))]
    columns=[[row[j]/scales[j]if scales[j]else 0 for row in x]for j in range(len(components))]
    coefficients=[0.0]*len(components);residual=[-1.0]*len(x);max_delta=0
    for sweep in range(1200):
        max_delta=0
        for j,column in enumerate(columns):
            if not scales[j]:continue
            norm=sum(v*v for v in column);new=max(0,coefficients[j]-sum(v*r for v,r in zip(column,residual))/norm);delta=new-coefficients[j];coefficients[j]=new;residual=[r+v*delta for r,v in zip(residual,column)];max_delta=max(max_delta,abs(delta))
        if max_delta<=1e-10:break
    weights={k:coefficients[j]/scales[j]if scales[j]else 0 for j,k in enumerate(components)}
    if any(not math.isfinite(v)or v>1e9 for v in weights.values()):raise ValueError('finite price bound exceeded; no clipping or refit')
    matrix=[[column[i]for column in columns]for i in range(len(x))];rank=0;pivots=[]
    for col in range(len(components)):
        pivot=max(range(rank,len(matrix)),key=lambda i:abs(matrix[i][col]),default=None)
        if pivot is None or abs(matrix[pivot][col])<=1e-10:continue
        matrix[rank],matrix[pivot]=matrix[pivot],matrix[rank];scale=matrix[rank][col];matrix[rank]=[v/scale for v in matrix[rank]]
        for i in range(rank+1,len(matrix)):
            factor=matrix[i][col];matrix[i]=[a-factor*b for a,b in zip(matrix[i],matrix[rank])]
        pivots.append(components[col]);rank+=1
        if rank==len(matrix):break
    return dict(weights=weights,rows=len(x),rank=rank,columns=len(components),low_rank=rank<len(components),rank_pivots=pivots,zero_support=[k for j,k in enumerate(components)if not scales[j]],unidentified=[k for k in components if k not in pivots],support={k:dict(nonzero_rows=sum(row[k]!=0 for row in features),maximum=max(row[k]for row in features),scale=scales[j])for j,k in enumerate(components)},sweeps=sweep+1,max_delta=max_delta,relative_residual_sum_squares=sum(r*r for r in residual))


def features(path):
    data=read_json(path)
    if not isinstance(data,list)or len(data)>10000:raise ValueError('feature manifest budget')
    rows={}
    for row in data:
        if set(row)!={'id','sidecar','operation','size','split','version'}or not isinstance(row['id'],str)or row['id']in rows or any(not isinstance(row[k],str)or not 1<=len(row[k])<=4096 for k in('id','sidecar','operation','split','version'))or type(row['size'])is not int or not 0<=row['size']<=10**9:raise ValueError('feature manifest row')
        sidecar=(Path(path).parent/row['sidecar']).resolve();observation=load_observation(sidecar)
        rows[row['id']]=dict(row,observation=observation,sidecar_sha256=file_hash(sidecar),cohort_id=identity(observation['cohort']))
    return rows


def freeze(protocol_path,features_path,training_path,output):
    protocol=read_json(protocol_path);rows=features(features_path);training=read_json(training_path);output=Path(output)
    if output.exists():raise ValueError('preserve coefficient/prediction freeze')
    if set(training)!={'schema','kind','protocol_sha256','sources','rows'}or type(training['schema'])is not int or training['schema']!=1 or not isinstance(training['rows'],list)or len(training['rows'])>50000 or not isinstance(training['sources'],list)or len(training['sources'])>256 or training['kind']!='ink-target-work-training-v1'or training['protocol_sha256']!=file_hash(protocol_path):raise ValueError('training protocol binding')
    for source in training['sources']:
        if file_hash((Path(training_path).parent/source['path']).resolve())!=source['sha256']:raise ValueError('training source changed')
    train_operations=set(protocol['training']['families']);train_sizes=set(protocol['training']['sizes']);samples=defaultdict(list);rounds=defaultdict(set)
    for sample in training['rows']:
        if set(sample)!={'feature_id','round','ns_per_call'}or sample['feature_id']not in rows or type(sample['round'])is not int or not 0<=sample['round']<=1000:raise ValueError('training sample format')
        row=rows[sample['feature_id']]
        if row['operation']not in train_operations or row['size']not in train_sizes or row['split']!='train':raise ValueError('heldout observation supplied to freeze')
        if sample['round']in rounds[sample['feature_id']]:raise ValueError('duplicate training round')
        rounds[sample['feature_id']].add(sample['round']);samples[sample['feature_id']].append(sample['ns_per_call'])
    if any(len(r)!=5 for r in rounds.values()):raise ValueError('all five training rounds required')
    grouped=defaultdict(list)
    for id,row in rows.items():grouped[row['cohort_id']].append((id,row))
    fits={};models={};predictions=[]
    for id,cells in sorted(grouped.items()):
        cohort=cells[0][1]['observation']['cohort'];components=protocol['features']['gpu'if cohort['target']=='webgpu'else'cpu'];xs=[];ys=[];exclusions=[]
        for cell_id,row in cells:
            missing=[k for k in components if not row['observation']['known'][k]]
            if cell_id not in samples:continue
            if missing:exclusions.append(dict(id=cell_id,reason='unknown required work',components=missing));continue
            for sample in samples[cell_id]:xs.append(row['observation']['components']);ys.append(sample)
        if xs:
            try:
                fitted=fit(xs,ys,components);model=dict(schema=1,kind='ink-target-work-prices-v1',cohort=cohort,weights=fitted['weights'],training=dict(protocol_sha256=file_hash(protocol_path),observations_sha256=file_hash(training_path),scope='Offline exact-fixture emitted-site model; acquisition/setup excluded; all training rounds only, no heldout labels opened'))
                models[id]=PhysicalPrices(model);write(output/'models'/f'{id}.json',model);fits[id]=dict(status='fit',cohort=cohort,fit=fitted,excluded=exclusions)
            except ValueError as e:fits[id]=dict(status='fit_failure',cohort=cohort,reason=str(e),excluded=exclusions)
        else:fits[id]=dict(status='no_training_support',cohort=cohort,excluded=exclusions)
        for cell_id,row in cells:
            prediction,reason=models[id].score(row['observation'])if id in models else(None,'no fitted exact cohort')
            predictions.append(dict(id=cell_id,operation=row['operation'],size=row['size'],split=row['split'],version=row['version'],cohort=id,prediction_ns=prediction,unavailable=reason,feature_sha256=row['sidecar_sha256'],entry=row['observation']['entry'],fixture_id=row['observation']['fixture_id'],fixture_sha256=row['observation']['bindings']['fixture']['sha256'],source_sha256=row['observation']['bindings']['original_core']['sha256']))
    write(output/'fits.json',fits);write(output/'predictions.json',predictions)
    receipt=dict(status='frozen_before_heldout_evaluation',protocol_sha256=file_hash(protocol_path),features_sha256=file_hash(features_path),training_sha256=file_hash(training_path),producer_sha256=file_hash(__file__),fits_sha256=file_hash(output/'fits.json'),predictions_sha256=file_hash(output/'predictions.json'),models={str(p.relative_to(output)):file_hash(p)for p in sorted((output/'models').glob('*.json'))},scope='All coefficients/predictions frozen without opening heldout timing data. Offline executed fixture knowledge, not cheap online prediction. Missing required work retains baseline. No default change or performance claim.')
    write(output/'freeze.json',receipt);return receipt


def evaluate(frozen,heldout_path,output):
    frozen=Path(frozen);receipt=read_json(frozen/'freeze.json')
    if receipt.get('status')!='frozen_before_heldout_evaluation':raise ValueError('prediction freeze required')
    for name in('fits','predictions'):
        if file_hash(frozen/(name+'.json'))!=receipt[name+'_sha256']:raise ValueError('frozen model/prediction drift')
    for name,digest in receipt['models'].items():
        if file_hash(frozen/name)!=digest:raise ValueError('frozen price drift')
    data=read_json(heldout_path)
    if set(data)!={'schema','kind','freeze_sha256','sources','rows'}or type(data['schema'])is not int or data['schema']!=1 or not isinstance(data['rows'],list)or len(data['rows'])>50000 or not isinstance(data['sources'],list)or len(data['sources'])>256 or data['kind']!='ink-target-work-heldout-v1'or data['freeze_sha256']!=file_hash(frozen/'freeze.json'):raise ValueError('heldout freeze binding')
    for source in data['sources']:
        if file_hash((Path(heldout_path).parent/source['path']).resolve())!=source['sha256']:raise ValueError('heldout source changed')
    observed=defaultdict(list);rounds=defaultdict(set);predictions={r['id']:r for r in read_json(frozen/'predictions.json')}
    for row in data['rows']:
        if set(row)!={'feature_id','round','ns_per_call'}or row['feature_id']not in predictions or type(row['round'])is not int or not 0<=row['round']<=1000 or type(row['ns_per_call'])not in(int,float)or not math.isfinite(row['ns_per_call'])or row['ns_per_call']<=0:raise ValueError('heldout raw sample')
        if predictions[row['feature_id']]['split']=='train':raise ValueError('training samples supplied to heldout evaluation')
        if row['round']in rounds[row['feature_id']]:raise ValueError('duplicate heldout round')
        rounds[row['feature_id']].add(row['round']);observed[row['feature_id']].append(row['ns_per_call'])
    if any(len(r)!=5 for r in rounds.values()):raise ValueError('all five heldout rounds required')
    rows=[]
    for id,prediction in sorted(predictions.items()):
        if prediction['split']=='train':continue
        actual=statistics.median(observed[id])if id in observed else None;estimated=prediction['prediction_ns']
        rows.append(dict(prediction,observed_ns=actual,relative_error=estimated/actual-1 if estimated is not None and actual is not None else None))
    comparable=[r for r in rows if r['relative_error']is not None]
    fits=read_json(frozen/'fits.json');groups=defaultdict(dict);choices=[];inconclusive=[]
    for row in comparable:
        cohort=dict(fits[row['cohort']]['cohort']);cohort.pop('emitter_sha256');key=identity(dict(cohort=cohort,entry=row['entry'],fixture_id=row['fixture_id'],fixture_sha256=row['fixture_sha256'],source_sha256=row['source_sha256']));groups[key][row['version']]=row
    for key,alternatives in sorted(groups.items()):
        if set(alternatives)!={'baseline','candidate'}:
            inconclusive.append(dict(comparison=key,reason='missing exact comparable measured alternative'));continue
        base,other=alternatives['baseline'],alternatives['candidate'];selected=other if other['prediction_ns']<base['prediction_ns']else base;best=min((base,other),key=lambda r:r['observed_ns']);choices.append(dict(comparison=key,selected=selected['version'],fastest_measured=best['version'],regret_ns=selected['observed_ns']-best['observed_ns'],regret_relative=selected['observed_ns']/best['observed_ns']-1,lost=selected['observed_ns']>best['observed_ns'],scope='Offline compiler/lowering hypothesis at same exact boundary/fixture; no runtime selector speed or new DB law gain claim'))
    result=dict(status='evaluated_frozen_no_retuning',freeze_sha256=file_hash(frozen/'freeze.json'),heldout_sha256=file_hash(heldout_path),rows=rows,choices=choices,inconclusive=inconclusive,losses=sum(x['lost']for x in choices),scored=len(comparable),unsupported=len(rows)-len(comparable),median_absolute_relative_error=statistics.median(abs(r['relative_error'])for r in comparable)if comparable else None,scope='All errors/unsupported observations retained. No refit, no measured selection speed/general superiority claim. Acquisition/setup excluded; exact-fixture execution features are offline.')
    write(Path(output)/'evaluation.json',result);return result


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=('freeze','evaluate'))
    for key in('protocol','features','training','frozen','heldout','output'):p.add_argument('--'+key,type=Path)
    a=p.parse_args()
    if a.mode=='freeze':result=freeze(a.protocol,a.features,a.training,a.output)
    else:result=evaluate(a.frozen,a.heldout,a.output)
    print(json.dumps(result))
if __name__=='__main__':main()
