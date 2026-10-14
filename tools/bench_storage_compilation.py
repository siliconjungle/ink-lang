#!/usr/bin/env python3
"""Measure checked search-cache replay, overlapping admission and publication churn."""
import hashlib,json,statistics,subprocess,sys,tempfile,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'knowledge'));sys.path.insert(0,str(ROOT/'planner'))
from ink_knowledge import Store,entry,identity
OUT=ROOT/'reports/storage-bulk-incremental';COMPILER=ROOT/'target/debug/ink'
def run(args):
    start=time.perf_counter_ns();p=subprocess.run(list(map(str,args)),cwd=ROOT,capture_output=True,text=True)
    if p.returncode:raise RuntimeError(p.stderr)
    return json.loads(p.stdout),time.perf_counter_ns()-start

def main():
    OUT.mkdir(parents=True,exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='ink-incremental-measure-') as tmp:
        directory=Path(tmp);core=directory/'core.json';run([COMPILER,'emit-core',ROOT/'examples/bulk-collections.ink','-o',core]);(directory/'context').write_text('host javascript, deterministic bulk fixture, no fitted profile')
        args=[sys.executable,ROOT/'planner/plan.py','--compiler',COMPILER,'--core',core,'--knowledge-root',ROOT/'knowledge','--budget',4096,'--rounds',32,'--cache-dir',directory/'cache','--cache-context',directory/'context','-o',directory/'selection.json']
        cold,elapsed=run(args);selected=json.loads((directory/'selection.json').read_text());warm=[]
        for _ in range(7):
            receipt,t=run(args);assert receipt['cache']['hit'];warm.append(t);assert json.loads((directory/'selection.json').read_text())==selected
        cachefile=next((directory/'cache').glob('*.json'));cachefile.write_text('{"knowledge":null}')
        invalid,recovered=run(args);assert not invalid.get('cache',{}).get('hit');assert json.loads((directory/'selection.json').read_text())==selected
        store=Store(ROOT/'knowledge');ids=json.load(open(ROOT/'knowledge/store/bulk-collection-view.json'))['roots'];bundles=[store.bundle(ids[:64]),store.bundle(ids[32:96]),store.bundle(ids[64:128])];paths=[]
        for i,b in enumerate(bundles):p=directory/f'bundle-{i}.json';p.write_text(json.dumps(b));paths.append(p)
        separate=[]
        for p in paths:_,t=run([COMPILER,'knowledge-check',core,p]);separate.append(t)
        start=time.perf_counter_ns();child=subprocess.Popen([str(COMPILER),'selection-session',str(core),str(paths[0])],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True);assert json.loads(child.stdout.readline())['ready'];session=[time.perf_counter_ns()-start];admitted=[]
        for bundle in bundles[1:]:
            start=time.perf_counter_ns();child.stdin.write(json.dumps({'admit':bundle})+'\n');child.stdin.flush();receipt=json.loads(child.stdout.readline());assert receipt['admitted'];session.append(time.perf_counter_ns()-start);admitted.append(receipt['added'])
        child.stdin.close();assert child.wait()==0;child.stdout.close()
        objects=[entry('definition','benchmark-v1',{'body':i}) for i in range(3000)];old=Store.publish(directory/'publication',objects);old.rebuild();before={p.stem for p in (old.data/'trees').glob('*.json')};extra=[entry('definition','benchmark-v1',{'body':['extra',i]}) for i in range(8)];new=Store.publish(old.root,[*objects,*extra]);after={p.stem for p in (old.data/'trees').glob('*.json')}
        def legacy(items):
            ids=sorted(identity(o) for o in items);nodes=[identity(dict(schema=1,entries=ids[i:i+64])) for i in range(0,len(ids),64)];allnodes=set(nodes)
            while len(nodes)>1:
                if len(nodes)%2:nodes.append(identity(dict(schema=1,entries=[])))
                nodes=[identity(dict(schema=1,left=nodes[i],right=nodes[i+1])) for i in range(0,len(nodes),2)];allnodes.update(nodes)
            return allnodes
        refresh=[];rebuild=[]
        for _ in range(7):
            old.rebuild();start=time.perf_counter_ns();assert new.refresh_index()==8;refresh.append(time.perf_counter_ns()-start)
            start=time.perf_counter_ns();new.rebuild();rebuild.append(time.perf_counter_ns()-start)
        result=dict(schema=1,compiler_sha256=hashlib.sha256(COMPILER.read_bytes()).hexdigest(),snapshot=store.snapshot_id,
            search=dict(cold_ns=elapsed,warm_ns=warm,warm_median_ns=statistics.median(warm),cold_receipt=cold,invalid_cache_recovery_ns=recovered,scope='full planner process, discovery/producers/search on cold; fresh full selected-closure proof replay on hits; no backend emission or native compilation'),
            admissions=dict(independent_process_ns=separate,overlapping_session_ns=session,new_entries=admitted,scope='three 64-law closures overlapping by 32, all same source and snapshot; process startup included for first session only'),
            publication=dict(entries_before=3000,inserted=8,stable_new_tree_nodes=len(after-before),legacy_new_tree_nodes=len(legacy([*objects,*extra])-legacy(objects)),incremental_index_ns=refresh,rebuild_index_ns=rebuild,scope='existing canonical tree, hash-prefix topology unchanged; real index refresh and rebuild including atomic replacement; full publication still scans provided objects'))
        (OUT/'compilation.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps({k:v for k,v in result.items() if k not in ('search','admissions','publication')}))
if __name__=='__main__':main()
