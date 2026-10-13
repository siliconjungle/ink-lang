"""Exact topology counts and descriptive, noncontemporaneous cold-build data."""
import json,matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from pathlib import Path
out=Path(__file__).resolve().parents[2]/'reports/real-software-delivery-2026-10-13'
fig,axes=plt.subplots(1,2,figsize=(12,5));fig.subplots_adjust(bottom=.24,top=.80,wspace=.3)
fig.suptitle('Same knowledge, fewer tree operations',fontsize=19,fontweight='bold')
axes[0].bar(['2-entry leaves','64-entry leaves'],[41297,1085],color=['#94a3b8','#2563eb']);axes[0].set_ylabel('Publication node calls');axes[0].set_title('26,946 identical canonical entries')
labels=['D3 max\nquick','D3 max\nbalanced','Earcut area\nquick'];old=[];new=[]
for name,effort in [('d3-max','quick'),('d3-max','balanced'),('earcut-area','quick')]:
 old.append(json.loads((out/'compiled/base'/effort/name/'process.json').read_bytes())['seconds']);new.append(json.loads((out/'compiled/packed-base'/effort/name/'process.json').read_bytes())['seconds'])
axes[1].bar([i-.18 for i in range(3)],old,width=.36,color='#94a3b8',label='Compact');axes[1].bar([i+.18 for i in range(3)],new,width=.36,color='#2563eb',label='Repacked');axes[1].set_xticks(range(3),labels);axes[1].set_ylabel('Complete cold build, seconds');axes[1].set_title('Descriptive matching-source acquisitions');axes[1].legend(frameon=False)
for a in axes:a.spines[['top','right']].set_visible(False);a.grid(axis='y',alpha=.2);a.set_axisbelow(True)
fig.text(.08,.055,'Compiler, source and logical catalogue fixed. Node-call reduction is exact; cold builds are single acquisitions at different times\non a shared host, with differing cache/load conditions. These ratios are not controlled statistical estimates of layout speedup.',fontsize=10,color='#52647b')
for ext in ['png','svg']:fig.savefig(out/('storage-layout.'+ext),dpi=150)
