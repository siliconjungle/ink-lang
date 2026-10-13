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
    warm=read(OUT/'warm-summary.json') if (OUT/'warm-summary.json').exists() else None
    save(OUT/'summary.json',dict(schema=1,scope=protocol,curves=all_rows,warm_compilation=warm))
    chart(all_rows,warm)
    print(json.dumps([{k:v for k,v in r.items() if k not in {'cells','candidate_gates','per_program'}} for r in all_rows],indent=2))


def chart(all_rows,warm):
    import matplotlib
    matplotlib.use('Agg')
    import matplotlib.pyplot as plt
    fig,axes=plt.subplots(2,2,figsize=(13,9))
    fig.subplots_adjust(left=.08,right=.97,bottom=.13,top=.87,wspace=.27,hspace=.47)
    fig.suptitle('Ordinary compilation now delivers checked optimisations',fontsize=20,fontweight='bold',x=.08,ha='left')
    total=[r for r in all_rows if r['experiment']=='machinery_and_growth']
    growth=[r for r in all_rows if r['experiment']=='frozen_machinery_database_growth']
    ax=axes[0,0];y=[1.]+[r['geometric_mean_speedup'] for r in total]
    ci=[[1.,1.]]+[r['timing_only_fixed_corpus_ci95'] for r in total]
    ax.errorbar(range(4),y,yerr=[[a-c[0] for a,c in zip(y,ci)],[c[1]-a for a,c in zip(y,ci)]],fmt='o-',capsize=4,color='#2563eb')
    ax.set_xticks(range(4),['Previous planner\nfull catalogue','Automatic planner\nbase catalogue','+ absorbing folds','+ controlled\nfusion'])
    ax.set_ylabel('Complete-call speedup vs previous planner ↑');ax.set_ylim(.9,1.95);ax.set_title('Same eight programs and 96 nonempty cases')
    ax.annotate(f'{y[-1]:.2f}×',(3,y[-1]),xytext=(5,-17),textcoords='offset points',color='#2563eb')
    ax=axes[0,1];y=[r['geometric_mean_speedup'] for r in growth]
    ci=[r['timing_only_fixed_corpus_ci95'] for r in growth]
    ax.errorbar(range(3),y,yerr=[[a-c[0] for a,c in zip(y,ci)],[c[1]-a for a,c in zip(y,ci)]],fmt='o-',capsize=4,color='#2563eb')
    ax.set_ylabel('Speedup vs new planner’s base catalogue ↑');ax.set_ylim(.97,1.28);ax.set_title('Database growth with machinery frozen')
    ax.set_xticks(range(3),['Baseline','+ absorbing folds','+ controlled\nfusion'])
    ax.annotate(f'{y[-1]:.2f}×',(2,y[-1]),xytext=(5,-17),textcoords='offset points',color='#2563eb')
    ax=axes[1,0];ax.plot(range(4),[0]+[r['selected_alternative_programs'] for r in total],'o-',color='#0f9c85')
    ax.set_xticks(range(4),['Previous planner','Automatic planner','+ absorbing folds','+ controlled\nfusion'])
    ax.set_ylim(-.3,8.3);ax.set_ylabel('Programs selecting an alternative / 8');ax.set_title('Automatic selection coverage')
    ax=axes[1,1];ax.plot(range(3),[r['compilation_median_seconds'] for r in growth],'o-',color='#d97706',label='Cold builds')
    if warm:ax.axhline(warm['median_seconds'],color='#64748b',linestyle='--',label=f'Warm cache + proof replay: {warm["median_seconds"]:.2f} s')
    ax.set_xticks(range(3),['Baseline','+ absorbing folds','+ controlled\nfusion']);ax.set_ylim(0,85)
    ax.set_ylabel('Median complete compilation, seconds ↓');ax.set_title('First-build cost remains high');ax.legend(frameon=False,loc='center right',fontsize=9)
    for ax in axes.flat:
        ax.grid(axis='y',alpha=.3);ax.spines[['top','right']].set_visible(False)
        ax.axhline(1,color='gray',linestyle='--',linewidth=.8) if ax in list(axes[0]) else None
    fig.text(.08,.035,'Fixed corpus, handwritten partial kernels, synthetic inputs; timing-only 95% intervals. No forced selections or evaluation calls enter planning.\nAdditional database gain comes chiefly from Unicode search. Retained controls, unchanged-artifact noise and every loss remain in summary.json.',fontsize=10,color='#52647b')
    for extension in ['png','svg']:fig.savefig(OUT/f'curves.{extension}',dpi=150)


if __name__=='__main__':main()
