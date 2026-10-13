"""Report automatic delivery, costs, losses and fixed-cohort timing uncertainty."""
import json
import math
from pathlib import Path
import random
import statistics
import sys

ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'reports/automatic-delivery-2026-10-13'
sys.path.insert(0,str(Path(__file__).resolve().parent))
from run import frozen,read,save


def mean_speedup(cells,lane,baseline,indices=None):
    logs=[]
    for i,cell in enumerate(cells):
        samples=cell['samples_ns'];a=samples[baseline];b=samples[lane]
        if indices is not None:
            a=[a[j] for j in indices[i]];b=[b[j] for j in indices[i]]
        logs.append(math.log(statistics.median(a)/statistics.median(b)))
    return math.exp(statistics.mean(logs))


def bootstrap(cells,lane,baseline,repetitions=2000):
    rng=random.Random(0x642312)
    values=sorted(mean_speedup(cells,lane,baseline,[[rng.randrange(11) for _ in range(11)] for cell in cells]) for _ in range(repetitions))
    return [values[int(repetitions*.025)],values[min(repetitions-1,int(repetitions*.975))]]


def main():
    protocol=frozen();corpus=read(OUT/'corpus.json')
    raw={r['name']:read(OUT/'timings'/(r['name']+'.json')) for r in corpus}
    cells=[dict(program=name,**r) for name,report in raw.items() for r in report['results'] if r['size']>0]
    assert len(cells)==96
    assert all(len(values)==11 and all(v>0 for v in values) for cell in cells for values in cell['samples_ns'].values())
    all_rows=[]
    for baseline,lanes,experiment in [('before/complete',['after/base','after/absorption','after/complete'],'machinery_and_growth'),
                                      ('after/base',['after/base','after/absorption','after/complete'],'frozen_machinery_database_growth')]:
        for lane in lanes:
            compilation=[];gates={};selected=0;changed=0
            lane_name,point=lane.split('/')
            for program in corpus:
                directory=OUT/'compiled'/lane_name/point/program['name']
                process=read(directory/'process.json');diagnosis=read(directory/'diagnostics.json')
                compilation.append(process['seconds'])
                selected+=diagnosis['delivery']['baseline_retained'] is False
                before=read(OUT/'compiled'/baseline.split('/')[0]/baseline.split('/')[1]/program['name']/'process.json')
                changed+=process['artifact_sha256']!=before['artifact_sha256']
                for gate,count in diagnosis['delivery']['gates'].items():gates[gate]=gates.get(gate,0)+count
            per_program={r['name']:mean_speedup([c for c in cells if c['program']==r['name']],lane,baseline) for r in corpus}
            rows=[]
            for cell in cells:
                ratio=mean_speedup([cell],lane,baseline)
                interval=bootstrap([cell],lane,baseline,1000) if lane!=baseline else [1.,1.]
                artifacts={r['name']:r['sha256'] for r in raw[cell['program']]['lanes']}
                same=artifacts[lane]==artifacts[baseline]
                kind='same_artifact_timing' if same else 'gain' if interval[0]>1 else 'regression' if interval[1]<1 else 'uncertain'
                rows.append(dict(program=cell['program'],size=cell['size'],distribution=cell['distribution'],speedup=ratio,ci95=interval,classification=kind))
            all_rows.append(dict(experiment=experiment,lane=lane,baseline=baseline,programs=len(corpus),nonempty_cells=len(cells),
                                 geometric_mean_speedup=mean_speedup(cells,lane,baseline),
                                 timing_only_fixed_corpus_ci95=bootstrap(cells,lane,baseline) if lane!=baseline else [1.,1.],
                                 selected_alternative_programs=selected,changed_artifact_programs=changed,
                                 compilation_median_seconds=statistics.median(compilation),compilation_total_seconds=sum(compilation),
                                 per_program=per_program,candidate_gates=gates,
                                 gains=sum(r['classification']=='gain' for r in rows),regressions=sum(r['classification']=='regression' for r in rows),
                                 same_artifact_cells=sum(r['classification']=='same_artifact_timing' for r in rows),cells=rows))
    save(OUT/'summary.json',dict(schema=1,scope=protocol,curves=all_rows))
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,axes=plt.subplots(1,3,figsize=(15,5));fig.subplots_adjust(left=.07,right=.98,bottom=.23,top=.8,wspace=.32)
    fig.suptitle('What ordinary Ink compilation delivers',fontsize=20,fontweight='bold',x=.07,ha='left')
    growth=[r for r in all_rows if r['experiment']=='frozen_machinery_database_growth']
    y=[r['geometric_mean_speedup'] for r in growth]
    errors=[[r['geometric_mean_speedup']-r['timing_only_fixed_corpus_ci95'][0] for r in growth],
            [r['timing_only_fixed_corpus_ci95'][1]-r['geometric_mean_speedup'] for r in growth]]
    axes[0].errorbar([0,1,2],y,yerr=errors,fmt='o-',capsize=4,color='#2563eb')
    axes[0].axhline(1,color='gray',linestyle='--',linewidth=1);axes[0].set_ylabel('Complete-call geometric-mean speedup ↑')
    axes[0].set_title('Frozen planner: database growth')
    axes[1].plot([0,1,2],[r['selected_alternative_programs'] for r in growth],'o-',color='#0f9c85')
    axes[1].set_ylim(-.3,8.3);axes[1].set_ylabel('Programs selecting an alternative / 8');axes[1].set_title('Automatic selection coverage')
    axes[2].plot([0,1,2],[r['compilation_median_seconds'] for r in growth],'o-',color='#d97706')
    axes[2].set_ylabel('Median complete compilation, seconds ↓');axes[2].set_title('Search + checking + probes + emission')
    for ax in axes:
        ax.set_xticks([0,1,2],['Baseline','+ absorption','+ controlled\nfusion']);ax.set_xlabel('Added reusable schemes: 0 → 1 → 2');ax.grid(axis='y',alpha=.3);ax.spines[['top','right']].set_visible(False)
    fig.text(.07,.035,'96 nonempty cells, eight handwritten partial kernels, fixed weighting. Timing-only intervals; synthetic evaluation inputs.\nNo forced selections or evaluation calls enter compilation. Different artifacts and every observed regression remain in summary.json.',fontsize=10,color='#52647b')
    for extension in ['png','svg']:fig.savefig(OUT/f'curves.{extension}',dpi=150)
    print(json.dumps([{k:v for k,v in r.items() if k not in {'cells','candidate_gates','per_program'}} for r in all_rows],indent=2))


if __name__=='__main__':main()
