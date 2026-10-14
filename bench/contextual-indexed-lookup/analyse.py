"""Report every registered cell; never fit or select a plan from evaluation."""
import argparse,hashlib,itertools,json,math,pathlib,statistics

def analyse(directory):
 d=pathlib.Path(directory);registration=json.loads((d/'registration.json').read_text());protocol=registration['evaluation']
 complete=json.loads((d/'complete.json').read_text())
 if complete.get('complete')is not True:raise ValueError('experiment incomplete')
 for name,sha in registration['files'].items():
  if hashlib.sha256((d/name).read_bytes()).hexdigest()!=sha:raise ValueError('frozen source mismatch: '+name)
 expected=set(itertools.product(['records','predicate','nested'],protocol['sizes'],protocol['queries'],protocol['shapes']))
 labels={};raw_files={}
 for label in ['large','small']:
  paths={'baseline':d/'baseline.mjs','selected':d/(label+'.mjs'),'indexed':d/'indexed.mjs'}
  hashes={name:hashlib.sha256(p.read_bytes()).hexdigest()for name,p in paths.items()}
  per_cell={key:[]for key in expected}
  for process in range(protocol['processes']):
   p=d/f'{label}-evaluation-{process}.json';raw=p.read_bytes();data=json.loads(raw);raw_files[p.name]=hashlib.sha256(raw).hexdigest()
   if data['registration']!=registration or data['hashes']!=hashes or data['label']!=label or data['process']!=process:raise ValueError('evaluation provenance mismatch')
   seen=set()
   for row in data['rows']:
    key=tuple(row[k]for k in ['operation','n','queries','shape'])
    if key not in expected or key in seen or row.get('validated')is not True:raise ValueError('invalid/duplicate evaluation cell')
    seen.add(key);samples=row['samples_ns'];names={'baseline','selected','indexed','native_set'}
    if set(samples)!=names or any(len(xs)!=protocol['rounds']or any(not isinstance(x,(int,float))or not math.isfinite(x)or x<=0 for x in xs)for xs in samples.values()):raise ValueError('invalid timing samples')
    orders=row['orders']
    if len(orders)!=protocol['rounds']or any(len(order)!=4 or set(order)!=names for order in orders):raise ValueError('invalid acquisition order')
    for position in range(4):
     if any(sum(order[position]==name for order in orders)!=protocol['rounds']//4 for name in names):raise ValueError('unbalanced positions')
    for a,b in itertools.permutations(names,2):
     if sum((x,y)==(a,b)for order in orders for x,y in zip(order,order[1:]))!=protocol['rounds']//4:raise ValueError('unbalanced adjacent pairs')
    medians={name:statistics.median(xs)for name,xs in samples.items()};per_cell[key].append(medians)
   if seen!=expected:raise ValueError('missing registered evaluation cells')
  cells=[]
  for key,processes in sorted(per_cell.items()):
   cells.append(dict(zip(['operation','n','queries','shape'],key),
    median_ns={name:statistics.median(p[name]for p in processes)for name in ['baseline','selected','indexed','native_set']},
    speedup_vs_baseline={name:statistics.median(p['baseline']/p[name]for p in processes)for name in ['selected','indexed','native_set']},
    selected_speedup_vs_native=statistics.median(p['native_set']/p['selected']for p in processes),
    process_medians_ns=processes))
  labels[label]=dict(hashes=hashes,selected_bytes_equal_baseline=hashes['selected']==hashes['baseline'],
   cases=len(cells),median_loss_cells={name:sum(c['speedup_vs_baseline'][name]<1 for c in cells)for name in ['selected','indexed','native_set']},
   largest_batches=[c for c in cells if c['n']==max(protocol['sizes'])and c['queries']==max(protocol['queries'])],cells=cells)
 return dict(schema=1,scope=registration['scope'],selection=registration['selection'],registration=registration,
  limitations='Shared-machine diagnostic timings. Source used to develop the producer, not an unseen library. Static plans may regress outside their profiled workload. No per-candidate memory or GPU-device result. Ratios above one are faster; raw sub-one cells are retained, including noise when selected code equals baseline.',
  complete=complete,raw_files=raw_files,labels=labels)

def main():
 p=argparse.ArgumentParser(description=__doc__);p.add_argument('directory',type=pathlib.Path);p.add_argument('--output',type=pathlib.Path,required=True);a=p.parse_args()
 result=analyse(a.directory);a.output.write_text(json.dumps(result,indent=2)+'\n')
 for label,data in result['labels'].items():
  print(label,'cases',data['cases'],'raw median losses',data['median_loss_cells'],'baseline retained',data['selected_bytes_equal_baseline'])
  for c in data['largest_batches']:print(c['operation'],c['shape'],{name:round(x,3)for name,x in c['speedup_vs_baseline'].items()},'selected/native',round(c['selected_speedup_vs_native'],3))
if __name__=='__main__':main()
