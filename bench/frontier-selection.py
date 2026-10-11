#!/usr/bin/env python3
"""Replay measured request-bound maintenance selection through the pinned planner.

Uses the actual seven-round lifecycle samples. Missing compile or migration
measurements retain the baseline. No benchmark result supplies mathematical
admission: requests are independently checked by the planner before selection.
"""
import argparse,gzip,hashlib,json,os,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
from ink_knowledge import Store
from ink_planner.representation_selection import phase_workload,rank


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--case',action='append',choices=['field','shared','ordered','grouped','index','fused','dense','grid','heap']);args=parser.parse_args()
    cases=args.case or ['field','shared','ordered','grouped','index','fused','dense','grid','heap']
    summaries=[];compiler=Path(os.environ.get('INK_COMPILER',ROOT/'target/debug/ink'))
    for kind in cases:
        report_path=ROOT/'reports/frontier-extensions'/(kind+'-maintenance-results.json')
        if not report_path.exists():continue
        report=json.loads(report_path.read_text());inputs=report_path.parent/report['artifact_directory']
        work=ROOT/'build/frontier-maintenance-selection'/kind;work.mkdir(parents=True,exist_ok=True)
        for filename in ['source.ink','before.json','after.json','bridge.json']:
            raw=gzip.decompress((inputs/(filename+'.gz')).read_bytes());assert hashlib.sha256(raw).hexdigest()==report['artifact_sha256'][filename];(work/filename).write_bytes(raw)
        requests=[json.loads((work/(v+'.json')).read_text())for v in ['before','after']]
        objects={k:o for r in requests for k,o in r['knowledge']['objects'].items()};store=Store.publish(work/'observations',objects.values())
        plans={v:hashlib.sha256((work/(v+'.json')).read_bytes()).hexdigest()for v in ['before','after']}
        target=dict(hardware=report['machine'],driver='native',toolchain=report['rustc']+'; release thin LTO; one codegen unit; emitted artifact '+Path(report['artifact_directory']).name,backend='rust standalone immutable Arc',bridge='JSON action, portable snapshot')
        (work/'target.json').write_text(json.dumps(target));(work/'candidates.json').write_text(json.dumps([dict(request='after.json',bridge='bridge.json')]))
        query={'field':'cached','shared':'zero','ordered':'active','grouped':'groups','index':'get','dense':'get','fused':'groups','grid':'route','heap':'sorted'}[kind]
        update='label'if kind=='field'else'put';abort_action='label'if kind=='field'else'erase'if kind in ['shared','index','dense']else'put'
        phases={'startup':'startup','initialise':'initialise','query_json':'action:'+query,'update_json':'action:'+update,'abort':'abort:'+abort_action,'checkpoint':'checkpoint','restore':'restore','teardown':'teardown'}
        admitted=None
        for row in report['measurements']:
            workload=dict(shape=dict(case=kind,rows=row['rows']),distribution='complete deterministic maintenance workload; average nanoseconds floored per call',concurrency=1,residency='native process, retained physical state')
            for variant in ['before','after']:
                for recorded,phase in phases.items():
                    timing=[str(s[recorded]['total_ns']//s[recorded]['repeats'])for s in row['samples']if s['variant']==variant]
                    memory=row['memory'][variant];peak=memory['state_requested_bytes']+memory[recorded]['peak_added_bytes']
                    store.observe(dict(schema=1,program=requests[0]['input_core_sha256'],entries=[],plan=plans[variant],target=target,workload=phase_workload(workload,phase),metrics=dict(complete_call_ns=timing,peak_bytes=peak)))
                cost=next(c for c in report['costs']if c['variant']==variant)
                store.observe(dict(schema=1,program=requests[0]['input_core_sha256'],entries=[],plan=plans[variant],target=target,workload=phase_workload(workload,'check'),metrics=dict(complete_call_ns=[str(cost['check_ns'])],peak_bytes=None)))
            (work/'workload.json').write_text(json.dumps(workload))
            profiles={
                'read-heavy':{'startup':1,'initialise':1,'action:'+query:10000,'action:'+update:10,'checkpoint':1,'restore':1,'teardown':1},
                'write-heavy':{'startup':1,'initialise':1,'action:'+query:10,'action:'+update:10000,'checkpoint':1,'restore':1,'teardown':1},
                'frequent-restore':{'action:'+query:10,'checkpoint':100,'restore':100},
                'missing-compile':{'action:'+query:10000,'compile':1},
                'missing-migration':{'action:'+query:10000},
            }
            for label,profile in profiles.items():
                (work/'profile.json').write_text(json.dumps(profile));out=work/(str(row['rows'])+'-'+label+'.json')
                if admitted is None:
                    cli=[sys.executable,ROOT/'planner/select_representation.py','--compiler',compiler,'--source',work/'source.ink','--baseline',work/'before.json','--candidates',work/'candidates.json','--knowledge-root',work/'observations','--target',work/'target.json','--workload',work/'workload.json','--profile',work/'profile.json','--check-timeout-seconds','60','-o',out]
                    result=subprocess.run([str(a)for a in cli],capture_output=True,text=True)
                    if result.returncode:raise RuntimeError(result.stderr)
                    admitted=json.loads(result.stdout)
                    if admitted['checked']!=2 or admitted['rejected']:raise RuntimeError('exact candidate admission failed: '+str(admitted['rejected']))
                    migration=subprocess.run([str(compiler),'check-migration',str(work/'source.ink'),str(work/'before.json'),str(work/'after.json'),str(work/'bridge.json')],capture_output=True,text=True)
                    if migration.returncode:raise RuntimeError(migration.stderr)
                    bridge_receipt=json.loads(migration.stdout)
                    assert bridge_receipt['status']=='checked'and bridge_receipt['from']==requests[0]['representation']and bridge_receipt['to']==requests[1]['representation']
                migration_count=int(label=='missing-migration')
                migration_phases={plans['after']:'migrate:'+plans['before']+':'+hashlib.sha256((work/'bridge.json').read_bytes()).hexdigest()}
                chosen,costs=rank(store,requests[0]['input_core_sha256'],list(plans.values()),target,workload,profile,plans['before'],migration_count,None,migration_phases)
                selected='after'if chosen==plans['after']else'before'
                if label in ['missing-compile','missing-migration']:assert selected=='before'
                if row is report['measurements'][0]and label=='read-heavy':assert chosen==admitted['request_sha256']
                raw=(work/(selected+'.json')).read_bytes();assert hashlib.sha256(raw).hexdigest()==chosen;out.write_bytes(raw)
                receipt=dict(schema=1,status='ranked',request_sha256=chosen,selected=requests[0 if selected=='before'else 1]['representation'],source=requests[0]['input_core_sha256'],snapshot=store.snapshot_id,target=target,workload=workload,profile=profile,migration_count=migration_count,costs=costs,admission=dict(checked=2,requests=plans,bridge_sha256=hashlib.sha256((work/'bridge.json').read_bytes()).hexdigest()),scope='Pinned CLI admitted exact endpoint bytes once; bridge independently rechecked once. Pinned rank API scores profiles over those unchanged bytes. Receipts are ranking data; replay rechecks the selected request.')
                Path(str(out)+'.selection.json').write_text(json.dumps(receipt,indent=2)+'\n')
                summaries.append(dict(case=kind,rows=row['rows'],profile=label,selected=selected,receipt=receipt))
                print(kind,row['rows'],label,selected,flush=True)
    out=ROOT/'reports/frontier-extensions/selection-results.json'
    if args.case and out.exists():summaries=[x for x in json.loads(out.read_text())['selections']if x['case']not in cases]+summaries
    out.write_text(json.dumps(dict(schema=1,selections=summaries,scope='Pinned external planner admits exact request and bridge bytes and ranks recorded complete lifecycle measurements. Each case reuses its admission only while exact bytes are unchanged; profiles use the pinned rank API. No compile-cost allocation or direct migration timing was invented; missing phases keep baseline. Timing floor has at most one ns per call quantisation. Results are workload-bound offline decisions, not live adaptation.'),indent=2)+'\n')
if __name__=='__main__':main()
