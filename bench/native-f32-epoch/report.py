"""Report all cells, immutable artifact comparisons, costs, memory and losses."""
import hashlib,json,math,random,statistics
from pathlib import Path
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
ROOT=Path(__file__).resolve().parents[2];OUT=ROOT/'reports/native-f32-epoch-2026-10-13'
def read(p):return json.loads(p.read_bytes())
def sha(p):return hashlib.sha256(p.read_bytes()).hexdigest()
def interval(rows,a,b):
 rng=random.Random(12893);values=[]
 for _ in range(3000):
  ratios=[]
  for row in rows:
   aa=row['samples_ns'][a];bb=row['samples_ns'][b];indices=[rng.randrange(len(aa))for _ in aa]
   ratios.append(statistics.median(aa[i]for i in indices)/statistics.median(bb[i]for i in indices))
  values.append(statistics.geometric_mean(ratios))
 values.sort();return [values[75],values[2925]]
results=[];comparisons=0
for p in sorted((OUT/'runtime').glob('*.json')):
 r=read(p);rows=[x for x in r['rows']if x['size']];ratios=[statistics.median(x['samples_ns']['before'])/statistics.median(x['samples_ns']['after'])for x in rows]
 comparisons+=len(r['rows'])*(5 if r['fresh']else 2)
 item=dict(program=p.stem,fresh=r['fresh'],speedup=statistics.geometric_mean(ratios),timing_interval=interval(rows,'before','after'),cells=[dict(label=x['label'],size=x['size'],medians_ns={k:statistics.median(v)for k,v in x['samples_ns'].items()})for x in r['rows']])
 if r['fresh']:
  item['identical_growth_artifact']=(OUT/'automatic/base'/p.stem/'output.mjs').read_bytes()==(OUT/'automatic/grown'/p.stem/'output.mjs').read_bytes()
  item['observed_growth_ratio']=statistics.geometric_mean([statistics.median(x['samples_ns']['base'])/statistics.median(x['samples_ns']['grown'])for x in rows])
  item['upstream_relative_speed']=statistics.geometric_mean([statistics.median(x['samples_ns']['upstream'])/statistics.median(x['samples_ns']['grown'])for x in rows])
 results.append(item)
costs=read(OUT/'store-costs.json');storage={m:{k:statistics.median(x['seconds'][k]for x in costs if x['mode']==m)for k in costs[0]['seconds']}for m in ['before','after']}
storage['complete_publication_median']={m:statistics.median(sum(x['seconds'][k]for k in ['extend','ensure_index','bundle'])for x in costs if x['mode']==m)for m in ['before','after']}
cold=read(OUT/'cold-builds.json');cold_medians={m:statistics.median(x['seconds']for x in cold if x['mode']==m)for m in ['before','after']}
builds=[]
for p in sorted(OUT.glob('automatic/*/*/process.json')):
 r=read(p);builds.append(dict(checkpoint=p.parent.parent.name,program=p.parent.name,seconds=r['seconds'],alternative=r['alternative'],admitted=r['admitted'],status=r['status'],artifact_sha256=r['artifact_sha256']))
memory=[dict(program=r['program'],lane=r['lane'],peak_rss_bytes=r['peak_rss'])for r in [read(p)for p in sorted((OUT/'memory').glob('*.json'))]]
summary=dict(schema=1,runtime=results,complete_reference_comparisons=comparisons,storage=storage,cold_build_medians=cold_medians,builds=builds,memory=memory,held_out_supported=4,held_out_total=5,new_database_objects=21,checked_concrete_proofs=18,additional_held_out_selection=0,scope='Fixed bounded kernel corpus. Timing intervals resample rounds within fixed cases only; no population inference. Identical growth artifacts indicate no generated-code improvement regardless of observed timing differences. Compiler-driven float gains are separate from theorem growth.')
(OUT/'summary.json').write_text(json.dumps(summary,indent=2)+'\n')
plt.rcParams.update({'font.family':'DejaVu Sans','font.size':10,'axes.spines.top':False,'axes.spines.right':False})
fig,axes=plt.subplots(1,3,figsize=(15,4.8),gridspec_kw={'width_ratios':[1.45,1,1]})
selected=[r for r in results if r['program']in ['gl-matrix-dot','gl-matrix-length','three-bounds','gl-vec2-distance','gl-vec3-lerp']]
labels={'gl-matrix-dot':'gl-matrix dot','gl-matrix-length':'gl-matrix length²','three-bounds':'Three.js bounds','gl-vec2-distance':'gl-matrix distance² (new)','gl-vec3-lerp':'gl-matrix lerp (new)'}
ax=axes[0];ys=range(len(selected));vals=[r['speedup']for r in selected];ax.barh(ys,vals,color='#267d90');ax.set_yticks(list(ys),[labels[r['program']]for r in selected]);ax.invert_yaxis();ax.axvline(1,color='#64748b',linestyle='--');ax.set_xlim(0,max(vals)*1.25)
for y,r in zip(ys,selected):ax.text(r['speedup']+.12,y,f"{r['speedup']:.2f}×",va='center')
ax.set_title('Complete JavaScript float calls');ax.set_xlabel('Speed relative to pre-change lowering')
ax=axes[1];names=['Index refresh','Duplicate publication','Profiled build'];before=[storage['before']['ensure_index'],storage['before']['duplicate_publication'],cold_medians['before']];after=[storage['after']['ensure_index'],storage['after']['duplicate_publication'],cold_medians['after']];x=range(3);ax.bar([n-.18 for n in x],before,.36,label='Before',color='#b9c2cf');ax.bar([n+.18 for n in x],after,.36,label='After',color='#267d90');ax.set_yscale('log');ax.set_xticks(list(x),['Refresh','Duplicate','Build']);ax.set_ylabel('Seconds (log scale)');ax.set_title('Costs: separate acquisitions');ax.legend(frameon=False)
ax=axes[2];points=read(OUT/'checkpoints.json');ax.plot([p['entries']for p in points],[1,1],marker='o',color='#267d90');ax.set_ylim(.8,1.2);ax.set_xticks([p['entries']for p in points]);ax.set_xlabel('Canonical database entries');ax.set_ylabel('Generated-code speedup');ax.set_title('New proofs: held-out result');ax.text(sum(p['entries']for p in points)/2,.91,'Identical artifacts; 0/5 additional selections',ha='center',fontsize=9)
fig.suptitle('Native float gains, cheaper index updates — no new theorem-driven execution gain',fontsize=14);fig.text(.5,.01,'15 interleaved runtime rounds; storage 4 pairs; profiled builds 2 pairs on a shared host. Separate facets, not additive costs.',ha='center',fontsize=9,color='#475569');fig.tight_layout(rect=(0,.04,1,.94));fig.savefig(OUT/'curves.png',dpi=180);fig.savefig(OUT/'curves.svg');plt.close(fig)
print(json.dumps({'comparisons':comparisons,'storage':storage,'cold':cold_medians},indent=2))
