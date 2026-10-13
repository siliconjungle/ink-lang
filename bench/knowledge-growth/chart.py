from common import *
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib.ticker import FuncFormatter
import numpy as np,statistics
curves=read(OUT/'curves.json');points=['current','absorption','controlled'];colors={'forced':'#007f80','automatic-default':'#8a3860'}
fig,axes=plt.subplots(2,2,figsize=(12,8),layout='constrained')
for lane,label in [('forced','Forced checked alternatives'),('automatic-default','Ordinary installed defaults')]:
 rows=[next(r for r in curves if r['lane']==lane and r['checkpoint']==p)for p in points]
 x=[r['added_families']for r in rows];y=[r['program_geomean_speedup']for r in rows];ci=np.array([r['timing_only_fixed_corpus_ci']for r in rows]);
 axes[0,0].errorbar(x,y,yerr=[np.array(y)-ci[:,0],ci[:,1]-np.array(y)],marker='o',label=label,color=colors[lane],capsize=4)
 axes[0,1].errorbar([r['useful_program_coverage']for r in rows],y,yerr=[np.array(y)-ci[:,0],ci[:,1]-np.array(y)],marker='o',label=label,color=colors[lane],capsize=4)
 axes[1,1].plot(x,[r['useful_program_coverage']for r in rows],marker='o',label=label,color=colors[lane])
 if lane=='forced':
  values=[r['warm_forced_repeated_cohort_mean_seconds']for r in rows];means=[statistics.mean(v)for v in values];lo=[min(v)for v in values];hi=[max(v)for v in values];axes[1,0].errorbar(x,means,yerr=[np.array(means)-lo,np.array(hi)-means],marker='o',label=label+' (3 warm repeats)',color=colors[lane],capsize=4)
 else:axes[1,0].plot(x,[r['complete_compile_total_seconds']/10 for r in rows],marker='o',label=label+' (single matrix)',color=colors[lane])
for ax in axes.flat:ax.grid(alpha=.2);ax.spines[['top','right']].set_visible(False)
for ax in axes[0]:ax.axhline(1,color='black',linewidth=.8,linestyle='--');ax.set_ylabel('Speedup over same-lane current catalogue');ax.set_yscale('log');ax.legend(fontsize=8)
for ax in axes[0]:ax.yaxis.set_major_formatter(FuncFormatter(lambda v,p:f'{v:g}×'))
for ax in [axes[0,0],axes[1,0],axes[1,1]]:ax.set_xticks([0,1,2])
axes[0,0].set_xlabel('Cumulative additional reusable proof families');axes[0,1].set_xlabel('Programs with a robust gain (fixed cohort of 10)')
axes[1,0].set_yscale('log');axes[1,0].set_ylabel('Compilation / acquisition seconds per program');axes[1,0].set_xlabel('Cumulative additional reusable proof families');axes[1,0].legend(fontsize=8)
axes[1,1].set_ylabel('Programs with a robust gain / 10');axes[1,1].set_ylim(-.3,10.3);axes[1,1].set_xlabel('Cumulative additional reusable proof families');axes[1,1].legend(fontsize=8)
fig.suptitle('Frozen Ink E1: capability and ordinary selection remain separate',fontsize=15)
fig.supxlabel('Ten typed upstream-derived operations; many are partial kernels. Equal program / size / distribution weights.\nNonempty cohort: 180 cases. Timing intervals resample rounds, not a population of software. Compilation boundaries differ by lane.',fontsize=9)
for ext in ['png','svg']:fig.savefig(OUT/f'performance-and-cost.{ext}',dpi=180)
# Show every program, preserving unchanged controls and measured adverse cells.
fig,ax=plt.subplots(figsize=(12,6),layout='constrained');data=[next(r for r in curves if r['lane']=='forced'and r['checkpoint']==p)for p in points]
for r in data:ax.plot(range(10),[r['per_program'][n]for n in data[0]['per_program']],marker='o',label=r['checkpoint'])
ax.axhline(1,color='black',linestyle='--',linewidth=.8);ax.set_yscale('log');ax.set_xticks(range(10),data[0]['per_program'].keys(),rotation=28,ha='right');ax.set_ylabel('Forced-lane fixed-case geomean speedup');ax.set_title('No program is removed from the cohort');ax.legend();ax.grid(alpha=.2)
for ext in ['png','svg']:fig.savefig(OUT/f'programs.{ext}',dpi=180)
# Removal effects are conditional; never sum the two displayed curves.
abl=read(OUT/'ablations.json');fig,ax=plt.subplots(figsize=(12,6),layout='constrained')
for family in ['absorbing-left-fold','controlled-fold-fusion']:
 values=[]
 for name in data[0]['per_program']:
  subset=[r['removal_to_full_speedup']for r in abl if r['family']==family and r['program']==name and r['size']>0];values.append(np.exp(np.mean(np.log(subset))))
 ax.plot(range(10),values,marker='o',label='Remove '+family)
ax.set_xticks(range(10),data[0]['per_program'].keys(),rotation=28,ha='right');ax.set_yscale('log');ax.set_ylabel('Removed-family time / full-catalogue time');ax.axhline(1,color='black',linestyle='--',linewidth=.8);ax.set_title('Conditional removal effects: overlapping gains are not additive');ax.legend();ax.grid(alpha=.2)
for ext in ['png','svg']:fig.savefig(OUT/f'ablations.{ext}',dpi=180)
