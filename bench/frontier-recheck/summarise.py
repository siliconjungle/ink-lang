"""Check complete cells, GPU execution and paired same-process comparisons."""
import collections
import json
import random
import statistics
import sys
from pathlib import Path

root=Path(__file__).resolve().parents[2]
report=root/'reports/frontier-recheck-2026-10-12'
fixtures=json.load(open(root/'build/frontier-recheck/fixtures.json'))
rng=random.Random(71331)
summary={'schema':1,'audit':[],'cells':[],'ratio':'Frontier / Ink; above one favours Ink'}
native={}

def phases(f):
    result=['diff','hint','apply','roundtrip','final-state']
    if f['kind']=='scalar' and len(f['edits'])<=256:result.append('apply-probe')
    return result

for run in ['node-results','browser-results']:
    data=json.load(open(report/(run+'.json')))
    assert data['status']=='passed' and data['protocol']['rounds']==7
    expected=set()
    for f in fixtures:
        for phase in phases(f):
            labels=['frontier','ink-javascript','ink-wasm-full','ink-js-main','ink-js-previous','ink-js-selected']
            if phase=='final-state' and f['kind']!='scalar':labels.append('ink-js-fields')
            if phase=='final-state' and f['kind']!='scalar' and f['rows']>=16384 and f['changes']>0:labels.remove('ink-wasm-full')
            if phase not in ['roundtrip','final-state']:labels.append('ink-wasm-prepared')
            if run=='browser-results' and phase in ['diff','hint','apply-probe']:labels+=['ink-webgpu-full','ink-webgpu-resident']
            expected.update((f['id'],phase,label) for label in labels)
    groups=collections.defaultdict(dict)
    for s in data['samples']:
        key=(s['case'],s['phase'],s['variant'])
        assert s['round'] not in groups[key]
        assert s['iterations']>0 and s['ns_per_call']>0
        groups[key][s['round']]=s['ns_per_call']/1000
        if s['variant'].startswith('ink-webgpu'):
            assert s['actual_backend']=='gpu' and s['counters']['dispatches']>0
            if s['variant']=='ink-webgpu-resident':assert s['counters']['upload_bytes']==0
    assert set(groups)==expected,(run,expected-set(groups),set(groups)-expected)
    assert all(set(cell)==set(range(7)) for cell in groups.values())
    assert len([v for v in data['validation'] if v.get('passed')])==sum(len(phases(f)) for f in fixtures)
    gpu_cells=len([k for k in groups if k[2].startswith('ink-webgpu')])
    summary['audit'].append({'run':run,'cases':len(fixtures),'cells':len(groups),'samples':len(data['samples']),'rounds':7,'actual_gpu_cells':gpu_cells,'passed':True,'excluded':data['unsupported']})
    for key,values in groups.items():
        case,phase,label=key
        row={'run':run,'case':case,'phase':phase,'variant':label,'median_us':statistics.median(values.values()),'min_us':min(values.values()),'max_us':max(values.values())}
        # Diff and hint return different public patch formats; final-state and
        # replay observations agree. Ratios remain labelled by that scope.
        if label!='frontier':
            frontier=groups[(case,phase,'frontier')]
            row['frontier_over_ink']=statistics.median(frontier.values())/row['median_us']
            draws=[]
            for _ in range(2000):
                indices=[rng.randrange(7) for _ in range(7)]
                draws.append(statistics.median(frontier[i] for i in indices)/statistics.median(values[i] for i in indices))
            draws.sort();row['paired_bootstrap_95_ratio']=[draws[49],draws[1949]]
        summary['cells'].append(row)

for line in (report/'native-results.jsonl').read_text().splitlines():
    s=json.loads(line);key=(s['case'],s['phase'])
    native.setdefault(key,{})
    assert s['round'] not in native[key]
    assert s['iterations']>0
    native[key][s['round']]=s['ns_per_call']/1000
expected={(f['id'],phase) for f in fixtures for phase in phases(f)}
assert set(native)==expected and all(set(v)==set(range(7)) for v in native.values())
for (case,phase),values in native.items():
    summary['cells'].append({'run':'native-results','case':case,'phase':phase,'variant':'ink-rust','median_us':statistics.median(values.values()),'min_us':min(values.values()),'max_us':max(values.values()),'boundary':'typed owned inputs/output; Vec input clones included; separate unpaired process'})
summary['audit'].append({'run':'native-results','cases':len(fixtures),'cells':len(native),'samples':sum(map(len,native.values())),'rounds':7,'passed':True})
focus=json.load(open(report/'node-focus.json'))
assert focus['status']=='passed'
fg=collections.defaultdict(dict)
labels={'frontier','latest-final','previous-final','main-final','latest-roundtrip','main-roundtrip','fields'}
for s in focus['samples']:
    key=(s['case'],s['variant']);assert s['round'] not in fg[key]
    assert s['iterations']>0 and s['us']>0
    fg[key][s['round']]=s['us']
assert set(fg)=={(f['id'],label) for f in fixtures if f['kind']!='scalar' for label in labels}
assert all(set(v)==set(range(11)) for v in fg.values())
assert len(focus['validation'])==len(fg)
for (case,label),values in fg.items():
    row={'run':'node-focus','case':case,'phase':'roundtrip' if label.endswith('roundtrip') else 'final-state','variant':label,'median_us':statistics.median(values.values()),'min_us':min(values.values()),'max_us':max(values.values())}
    if label!='frontier':
        comparator=fg[(case,'frontier')]
        row['frontier_over_ink']=statistics.median(comparator.values())/row['median_us']
        draws=[]
        for _ in range(5000):
            indices=[rng.randrange(11) for _ in range(11)]
            draws.append(statistics.median(comparator[i] for i in indices)/statistics.median(values[i] for i in indices))
        draws.sort();row['paired_bootstrap_95_ratio']=[draws[124],draws[4874]]
    summary['cells'].append(row)
summary['audit'].append({'run':'node-focus','cases':18,'cells':len(fg),'samples':len(focus['samples']),'rounds':11,'passed':True})
print(json.dumps(summary,indent=2))
