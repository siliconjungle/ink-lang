#!/usr/bin/env python3
"""Recompute every archived interval and preserve adverse/expert comparisons."""
import argparse,collections,hashlib,json,random,statistics
from pathlib import Path

def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def interval(a,b):
    assert len(a)==len(b)
    n=len(a);rng=random.Random(0);draws=[]
    for _ in range(4000):
        ix=[rng.randrange(n) for _ in range(n)];draws.append(statistics.median([a[i] for i in ix])/statistics.median([b[i] for i in ix]))
    draws.sort();return [statistics.median(a)/statistics.median(b),draws[100],draws[3899]]
def classify(ci):return 'faster' if ci[1]>1 else 'slower' if ci[2]<1 else 'inconclusive'
def analyse(report):
    metadata=json.loads((report/'metadata.json').read_text());spec=json.loads((report/'spec.json').read_text());tasks={t['name']:t for t in spec['tasks']}
    for p,h in metadata['artifact_hashes'].items():assert sha(report/p)==h,p
    assert sha(Path(metadata['compiler_path']))==metadata['compiler_sha256']
    gpu_fresh={}
    for n,t in metadata['tasks'].items():
        bodies=[json.loads((report/'tasks'/n/f'gpu-{k}-selected.core.json').read_text())['program']['functions'][0]['body'] for k in ['prior','checked']]
        gpu_fresh[n]=bool(set(t['gpu_selections']['checked']['laws'])-set(t['gpu_selections']['prior']['laws'])) and bodies[0]!=bodies[1]
    verified=0;decisions=[];routes=[];controls=[];counts=collections.Counter();fresh_counts=collections.Counter();reference_counts=collections.Counter();anchors=collections.Counter();gpu_samples=gpu_cells=fallbacks=0
    for host in ['node','browser']:
        raw=json.loads((report/f'{host}-results.json').read_text());summary=json.loads((report/f'{host}-summary.json').read_text());groups=collections.defaultdict(lambda:collections.defaultdict(list))
        for r in raw['samples']:groups[(r['case'],r['input'])][r['variant']].append(r)
        for row in summary['measurements']:
            values={v:[r['ns_per_call'] for r in sorted(rows,key=lambda r:r['round'])] for v,rows in groups[(row['case'],row['input'])].items()}
            assert {v:statistics.median(x) for v,x in values.items()}==row['median_ns']
            for name,saved in row['paired_ratios_95pct'].items():
                a,b=row['ratio_variants'][name];ci=interval(values[a],values[b]);assert ci==saved,(host,row['case'],name);verified+=1
                if name.startswith('prior_over_checked_'):
                    verdict=classify(ci);counts[verdict]+=1;fresh=gpu_fresh[row['case']] if name.endswith('_gpu') else bool(tasks[row['case']]['fresh_proof_required'])
                    (fresh_counts if fresh else reference_counts)[verdict]+=1
                    if tasks[row['case']]['cohort']=='anchor':anchors[verdict]+=1
                    decisions.append(dict(host=host,case=row['case'],input=row['input'],cohort=tasks[row['case']]['cohort'],fresh_proof_required=fresh,backend=name.split('prior_over_checked_')[1],ratio_95pct=ci,verdict=verdict,recommendation='checked' if verdict=='faster' else 'retain_prior'))
                if name.startswith('ink_checked_') and any(x in name for x in ('js_expert','rust_expert','js_literal','rust_literal')):
                    controls.append(dict(host=host,case=row['case'],input=row['input'],comparison=name,ink_over_control_95pct=ci,verdict='Ink_faster' if ci[2]<1 else 'control_faster' if ci[1]>1 else 'inconclusive'))
            if host=='browser':
                current={v.split('ink_checked_')[1]:statistics.median(x) for v,x in values.items() if v in ['ink_checked_js','ink_checked_wasm','ink_checked_gpu']}
                paired={b:interval(values[f'ink_checked_{b}'],values['ink_checked_gpu']) for b in ['js','wasm']} if 'ink_checked_gpu' in values else {}
                routes.append(dict(case=row['case'],input=row['input'],median_ns=current,lowest_median_current_backend=min(current,key=current.get),checked_cpu_over_checked_gpu_95pct=paired))
        gpu_samples+=sum(r['variant'].endswith('_gpu') for r in raw['samples'])
        if host=='browser':
            gpu_cells=sum(r['variant'].endswith('_gpu') and r['actual_backend']=='gpu' for r in raw['availability']);fallbacks=sum(r['variant'].endswith('_gpu') and r['actual_backend']!='gpu' for r in raw['availability'])
    files={
      'root-interval-verification.json':dict(status='passed',intervals_recomputed=verified,artifact_hashes_verified=len(metadata['artifact_hashes']),gpu_timed_samples=gpu_samples,actual_gpu_variant_cells=gpu_cells,gpu_fallback_variant_cells=fallbacks,method='Independent paired bootstrap of archived shuffled rounds; Random(0),4000draws,100/3899percentiles'),
      'profitability.json':dict(status='measured',counts=dict(counts),fresh_recipe_counts=dict(fresh_counts),reference_counts=dict(reference_counts),anchor_counts=dict(anchors),decisions=decisions,scope='Exploratory unadjusted individual intervals; Fresh recipe counts include only tasks requiring a round22 fresh proof. Eight CPU recipes require fresh endpoints; four complementary recipes use shared old-only proofs as references. Scalar GPU fallbacks and indexed vector eligibility are separately measured. Vector full output and scalar modular score boundaries differ. Captured and borrowed JS views correlated; no broad language ranking or general routing policy.'),
      'strong-controls.json':dict(status='measured',comparisons=controls,scope='Original eager algorithms versus strong already-fused/skipping expert algorithms. Captured web boundaries and direct borrowed kernels remain separate. Expert scratch reuse permitted; no tuning after timings.'),
      'backend-routing.json':dict(status='measured',paired_comparisons=sum(len(r['checked_cpu_over_checked_gpu_95pct']) for r in routes),cells=routes,scope='Current forced runtime JS/Wasm/actualGPU complete calls only; lowest median descriptive. Missing GPU records are fallbacks, not slower GPU samples.')}
    for name,data in files.items():(report/name).write_text(json.dumps(data,indent=2)+'\n')
    print(json.dumps(dict(intervals=verified,counts=dict(counts),fresh=dict(fresh_counts),references=dict(reference_counts),anchors=dict(anchors),gpu_samples=gpu_samples,gpu_cells=gpu_cells,fallbacks=fallbacks)))
if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('report',type=Path);analyse(p.parse_args().report.resolve())
