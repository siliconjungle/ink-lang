#!/usr/bin/env python3
"""Audit retained measurements and derive medians, including losing controls."""
import argparse
import hashlib
import json
from pathlib import Path
import statistics

ROOT=Path(__file__).resolve().parents[2]
def median(values):return statistics.median(values)
def load(root,name):return json.loads((root/name).read_text())
def summarize(root):
    neural=load(root,'neural.json')['records'];table=load(root,'table.json')['records'];training=load(root,'training.json')['records'];memory=load(root,'memory.json')['records'];emission=load(root,'emission.json')['records']
    for records,rows in [(neural,33),(table,176),(training,66)]:
        assert {(r['cohort'],r['process'])for r in records}=={(c,p)for c in ['development','holdout']for p in range(3)}
        for record in records:
            assert len(record['rows'])==rows
            for row in record['rows']:
                timing=row.get('ns',row.get('ns_per_turn'));assert timing>0
        assert len({r['node']for r in records})==1
    for r in neural:
        assert len({(x['sample'],x['name'])for x in r['rows']})==33
        for i in range(11):assert len({x['sink']for x in r['rows']if x['sample']==i})==1
    for r in table:
        assert len(r['cold'])==8 and len(r['histories'])==48
        for i in range(11):
            for size in [0,1,128,4096]:
                for observation in ['names','value']:assert len({x['sink']for x in r['rows']if x['sample']==i and x['size']==size and x['observation']==observation})==1
    for r in training:
        assert len({(x['sample'],x['name'],x['reads'])for x in r['rows']})==66
        for i in range(11):assert len({x['checkpoint_sha256']for x in r['rows']if x['sample']==i})==1
    held=lambda records:[r for r in records if r['cohort']=='holdout']
    n={name:median(median(x['ns']for x in r['rows']if x['name']==name)for r in held(neural))for name in ['direct','prepared','dense']}
    t=[]
    for size in [0,1,128,4096]:
        for observation in ['names','value']:
            timing={name:median(median(x['ns']for x in r['rows']if x['name']==name and x['size']==size and x['observation']==observation)for r in held(table))for name in ['direct','prepared']}
            t.append(dict(size=size,observation=observation,**timing,ratio=timing['direct']/timing['prepared']))
    h=[]
    for reads in [0,1,16]:
        values={name:median(median(x['ns']for x in r['histories']if x['name']==name and x['reads']==reads)for r in held(table))for name in ['direct','prepared']};h.append(dict(reads=reads,**values,ratio=values['direct']/values['prepared']))
    c=[]
    for size in [0,1,128,4096]:
        item=dict(size=size)
        for field in ['first_ns','heap_delta_bytes']:item[field]={name:median(x[field]for r in held(table)for x in r['cold']if x['name']==name and x['size']==size)for name in ['direct','prepared']}
        c.append(item)
    g=[]
    for reads in [0,4,16]:
        values={name:median(median(x['ns_per_turn']for x in r['rows']if x['name']==name and x['reads']==reads)for r in held(training))for name in ['direct','prepared']};g.append(dict(reads=reads,**values,ratio=values['direct']/values['prepared']))
    m=[]
    assert len(memory)==12
    for size in [1024,16384]:m.append(dict(size=size,heap_delta_bytes={name:median(r['heap_delta_bytes']for r in memory if r['name']==name and r['size']==size)for name in ['direct','prepared']}))
    e=[]
    bindings={('neural','direct'):'neural-baseline.mjs',('neural','prepared'):'neural/program.mjs.source.mjs',('table','direct'):'table-baseline.mjs',('table','prepared'):'table-current.mjs'}
    for record in emission:
        emitted=(root/bindings[(record['name'],record['label'])]).read_bytes()
        source=(root/('neural/source.core.json' if record['name']=='neural' else 'table.core.json')).read_bytes()
        assert record['javascript_sha256']==hashlib.sha256(emitted).hexdigest()
        assert record['source_sha256']==hashlib.sha256(source).hexdigest()
    assert len(emission)==12
    for name in ['neural','table']:
        for label in ['direct','prepared']:
            records=[r for r in emission if r['name']==name and r['label']==label];assert len(records)==3 and all(len(r['emit_ns'])==5 for r in records)
            assert len({r['javascript_sha256']for r in records})==1
            e.append(dict(name=name,label=label,check_ns=median(r['check_ns']for r in records),emit_ns=median(median(r['emit_ns'])for r in records),javascript_bytes=records[0]['bytes']))
    return dict(schema=1,neural_ns=n,neural_ratio=n['direct']/n['prepared'],dense_gap=n['prepared']/n['dense'],table_ns=t,histories_ns=h,cold=c,training_ns_per_turn=g,memory=m,emission=e)
def markdown(summary):
    n=summary['neural_ns'];lines=['# Structured preparation measurements','',f"Held-out process medians on Node 25.3.0 / Apple M4 Pro: neural prediction {n['direct']/1000:.3f} → {n['prepared']/1000:.3f} µs ({summary['neural_ratio']:.2f}×). The separate dense kernel is {n['dense']/1000:.3f} µs and omits state/ABI costs.",'','| Rows | Observation | Direct µs | Retained µs | Direct / retained |','| --- | --- | ---: | ---: | ---: |']
    for r in summary['table_ns']:lines.append(f"| {r['size']} | {r['observation']} | {r['direct']/1000:.3f} | {r['prepared']/1000:.3f} | {r['ratio']:.2f}× |")
    lines+=['','| Reads per table update | Direct µs/turn | Retained µs/turn | Direct / retained |','| --- | ---: | ---: | ---: |']
    for r in summary['histories_ns']:lines.append(f"| {r['reads']} | {r['direct']/1000:.3f} | {r['prepared']/1000:.3f} | {r['ratio']:.2f}× |")
    lines+=['','| Predictions per training turn | Direct µs/turn | Retained µs/turn | Direct / retained |','| --- | ---: | ---: | ---: |']
    for r in summary['training_ns_per_turn']:lines.append(f"| {r['reads']} | {r['direct']/1000:.3f} | {r['prepared']/1000:.3f} | {r['ratio']:.2f}× |")
    lines+=['','Ratios below one are regressions. One training turn has two Adam updates, with one rolled-back frame per four turns. Timed calls consume their complete outputs; checkpoint comparison and persistence are outside timing.','',f"The 4096-row first names read is {summary['cold'][-1]['first_ns']['direct']/1e6:.3f} → {summary['cold'][-1]['first_ns']['prepared']/1e6:.3f} ms. Private-cache startup and retained-memory costs remain visible.",'']
    return '\n'.join(lines)
def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('directory',type=Path);parser.add_argument('--check',action='store_true');args=parser.parse_args();root=args.directory
    metadata=load(root,'metadata.json')
    for path,binding in metadata['files'].items():
        file=root/path;assert file.is_file() and not file.is_symlink();data=file.read_bytes();assert dict(bytes=len(data),sha256=hashlib.sha256(data).hexdigest())==binding,path
    for path,expected in metadata['scripts'].items():assert hashlib.sha256((ROOT/path).read_bytes()).hexdigest()==expected,path
    summary=summarize(root);text=markdown(summary)
    if args.check:assert summary==load(root,'summary.json') and text==(root/'summary.md').read_text()
    else:(root/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');(root/'summary.md').write_text(text)
    print(json.dumps(dict(status='checked',neural_ratio=summary['neural_ratio'],scope='Retained evidence and derived statistics; no proof, profitability authorization, universal throughput or authenticity guarantee.')))
if __name__=='__main__':main()
