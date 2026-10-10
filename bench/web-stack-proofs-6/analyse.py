#!/usr/bin/env python3
"""Independent archived interval verification and measured candidate decisions."""
import argparse, collections, hashlib, json, random, statistics
from pathlib import Path

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def interval(a,b):
    assert len(a)==len(b)==7
    rng=random.Random(0);draws=[]
    for _ in range(4000):
        idx=[rng.randrange(7) for _ in range(7)]
        draws.append(statistics.median([a[i] for i in idx])/statistics.median([b[i] for i in idx]))
    draws.sort()
    return [statistics.median(a)/statistics.median(b),draws[100],draws[3899]]
def classify(ci):return 'faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive'
def analyse(report):
    metadata=json.loads((report/'metadata.json').read_text())
    for p,h in metadata['artifact_hashes'].items():assert sha(report/p)==h,p
    assert sha(Path(metadata['compiler_path']))==metadata['compiler_sha256']
    all_verified=0;decisions=[];routes=[];counts=collections.Counter();gpu_samples=gpu_cells=fallbacks=0
    for host in ['node','browser']:
        raw=json.loads((report/f'{host}-results.json').read_text());summary=json.loads((report/f'{host}-summary.json').read_text())
        groups=collections.defaultdict(lambda:collections.defaultdict(list))
        for row in raw['samples']:groups[(row['case'],row['input'])][row['variant']].append(row)
        for row in summary['measurements']:
            group=groups[(row['case'],row['input'])]
            values={v:[r['ns_per_call'] for r in sorted(rows,key=lambda r:r['round'])] for v,rows in group.items()}
            assert {v:statistics.median(x) for v,x in values.items()}==row['median_ns']
            for name,saved in row['paired_ratios_95pct'].items():
                if name.startswith(('prior_over_checked_','baseline_over_checked_')):
                    a,_,b,backend=name.split('_',3);av,bv=f'ink_{a}_{backend}',f'ink_{b}_{backend}'
                else:av,bv=name.split('_over_',1)
                recomputed=interval(values[av],values[bv]);assert saved==recomputed,(host,row['case'],name)
                all_verified+=1
                if name.startswith('prior_over_checked_'):
                    verdict=classify(recomputed);counts[verdict]+=1
                    decisions.append(dict(host=host,case=row['case'],input=row['input'],backend=name.split('prior_over_checked_')[1],ratio_95pct=recomputed,verdict=verdict,
                        measured_recommendation='new' if verdict=='faster' else 'prior',reason='new has supported latency benefit' if verdict=='faster' else 'retain prior: slower or unresolved'))
            if host=='browser':
                current={v.split('ink_checked_')[1]:statistics.median(x) for v,x in values.items() if v in ('ink_checked_js','ink_checked_wasm','ink_checked_gpu')}
                paired={backend:interval(values[f'ink_checked_{backend}'],values['ink_checked_gpu']) for backend in ['js','wasm']} if 'ink_checked_gpu' in values else {}
                routes.append(dict(case=row['case'],input=row['input'],median_ns=current,lowest_median_current_backend=min(current,key=current.get),checked_cpu_over_checked_gpu_95pct=paired))
        gpu_samples+=sum(r['variant'].endswith('_gpu') for r in raw['samples'])
        if host=='browser':
            gpu_cells=sum(r['variant'].endswith('_gpu') and r['actual_backend']=='gpu' for r in raw['availability'])
            fallbacks=sum(r['variant'].endswith('_gpu') and r['actual_backend']!='gpu' for r in raw['availability'])
    for name,data in [
      ('root-interval-verification.json',dict(status='passed',intervals_recomputed=all_verified,artifact_hashes_verified=len(metadata['artifact_hashes']),gpu_timed_samples=gpu_samples,actual_gpu_variant_cells=gpu_cells,gpu_fallback_variant_cells=fallbacks,method='independent paired resampling of archived shuffled seven rounds; Random(0),4000 draws, percentile100/3899')),
      ('profitability.json',dict(status='measured',counts=dict(counts),decisions=decisions,scope='Exploratory individual 95% intervals, unadjusted for multiple comparisons; same compiler, old834 versus new. Recommendations preserve prior candidate for unsupported or adverse differences. General target-specific policy not implemented.')),
      ('backend-routing.json',dict(status='measured',paired_comparisons=sum(len(r['checked_cpu_over_checked_gpu_95pct']) for r in routes),cells=routes,scope='Current checked runtime JS/Wasm/GPU complete calls only. Lowest median descriptive; paired CPU/GPU intervals recorded. No automatic routing policy implemented.'))]:
        (report/name).write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps(dict(intervals=all_verified,profitability=dict(counts),gpu_samples=gpu_samples,gpu_cells=gpu_cells,fallbacks=fallbacks,fastest=collections.Counter(r['lowest_median_current_backend'] for r in routes))))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('report',type=Path);analyse(p.parse_args().report.resolve())
