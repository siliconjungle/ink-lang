"""Immutable measurements for checked proofs and separately identified controls."""
from pathlib import Path
import collections, hashlib, json, math, platform, sys
R = Path(__file__).resolve().parent
B = R.parents[1]
K = B/'knowledge'
sys.path.insert(0, str(K))
from ink_knowledge import Store, identity
read = lambda p: json.loads(Path(p).read_text())
sha = lambda p: hashlib.sha256(Path(p).read_bytes()).hexdigest()

def main():
    p = R
    metadata = read(p/'metadata.json')
    publication = read(R/'publication.json')
    store = Store(K)
    assert store.snapshot_id == publication['snapshot']
    pins = read(R/'initial-pins.json')
    assert sha(Path(pins['compiler'])) == pins['compiler_sha256'] == metadata['compiler_sha256']
    before = {f.stem for f in (K/'store/observations').glob('*.json')}
    sources = [p/'node-results.json', p/'browser-results.json', p/'native/results.json']
    sources = [f for f in sources if f.exists()]
    assert len(sources) >= 2
    plans = {}; rows = []; samples = 0
    for path in sources:
        raw = read(path)
        assert raw['status'] == 'passed'
        host = 'native' if path.parent.name == 'native' else path.name.removesuffix('-results.json')
        groups = collections.defaultdict(list)
        for x in raw['samples']:
            groups[(x['name'], x['frame'], x['variant'], x['boundary'])].append(x)
        for (name, frame, variant, boundary), timings in sorted(groups.items()):
            timings.sort(key=lambda x: x['round'])
            assert [x['round'] for x in timings] == list(range(9))
            assert all(math.isfinite(x['ns_per_call']) and x['ns_per_call'] > 0 for x in timings)
            selected = metadata['selections'][name]
            version = next((v for v in ['checked', 'prior', 'literal'] if variant==v or variant.startswith(v+'_')), None)
            laws = sorted(selected[version].get('laws', [])) if version is not None else []
            assert set(laws) <= set(store.members())
            plan = dict(schema=29, program=selected['input_core_sha256'],
                        core_file_sha256=selected[version]['core_sha256'] if version else None,
                        compiler_sha256=metadata['compiler_sha256'],
                        metadata_sha256=sha(p/'metadata.json'), timing_artifact_sha256=sha(path),
                        host=host, variant=variant, boundary=boundary,
                        selection_sha256=selected[version].get('selection_sha256') if version else None,
                        selection_scope='unchanged frozen compiler/model, ordinary checked automatic planner',
                        control_scope='efficient handwritten equivalent algorithm' if version is None else None)
            memory = 'not measured; peak_bytes=0 is an explicit unknown sentinel'
            peak = 0
            if variant.endswith('gpu_requested'):
                assert all(sum(x['actual_backend_counts'].values()) == x['iterations'] for x in timings)
                actual = sorted({backend for x in timings for backend in x['actual_backend_counts']})
                plan['actual_backends'] = actual
                # Keep target identity truthful when a requested backend falls back.
                availability = [x for x in raw.get('availability',[]) if x['frame']==frame and x['variant']==variant]
                if len(availability)==1 and availability[0].get('actual_backend')=='gpu':
                    counters = availability[0].get('counters', {})
                    if 'live_buffer_bytes' in counters:
                        peak = counters['live_buffer_bytes']
                        memory = 'actual WebGPU live-buffer bytes; excludes host heap'
            plan_id = identity(plan); plans[plan_id] = plan
            obj = dict(schema=1, program=selected['input_core_sha256'], entries=laws, plan=plan_id,
                       target=dict(hardware=platform.platform()+' '+platform.machine(),
                                   driver=str(raw.get('host', host)),
                                   toolchain='frozen engine28 '+metadata['compiler_sha256'],
                                   backend=variant, bridge=host+'/'+boundary+'; raw '+sha(path)),
                       workload=dict(shape=dict(task=name,frame=frame,input_elements=timings[0]['size'],memory_metric=memory),
                                     distribution=dict(scope='fixed independent small/full input recipes; no changing-load claim',
                                                       statistic='nine positive per-call samples, rounded to integer nanoseconds'),
                                     concurrency=1,residency=boundary),
                       metrics=dict(complete_call_ns=[str(max(1,round(x['ns_per_call']))) for x in timings],peak_bytes=peak))
            oid = store.observe(obj)
            rows.append(dict(id=oid,host=host,name=name,frame=frame,variant=variant,boundary=boundary,
                             plan=plan_id,proof_entries=laws))
            samples += len(timings)
    (R/'measurement-plans.json').write_text(json.dumps(plans,indent=2)+'\n')
    result=dict(status='published',snapshot=store.snapshot_id,entries=len(store.members()),
                previous_observations=len(before),new_observations=len({x['id'] for x in rows}-before),
                observations_total=len(list((K/'store/observations').glob('*.json'))),samples=samples,
                rows=rows,source_hashes={str(f.relative_to(R)):sha(f) for f in sources},
                plans_sha256=sha(R/'measurement-plans.json'),
                scope='Measurements guide profitability only; no timing used as a proof premise. Controls carry no proof entries.')
    (R/'observations.json').write_text(json.dumps(result,indent=2)+'\n')
    archive=K/'research/web-stack-proofs-29'; archive.mkdir(parents=True,exist_ok=True)
    for name in ['measurement-plans.json','observations.json']:
        (archive/name).write_bytes((R/name).read_bytes())
    print(json.dumps({k:v for k,v in result.items() if k not in ['rows','source_hashes']},indent=2))

if __name__=='__main__':
    main()
