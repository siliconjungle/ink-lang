"""Offline complete-call observations for admitted pure implementation plans.
JavaScript trusted calls and native Rust JSON calls have distinct boundaries.
Other execution ABIs decline explicitly; observations never substitute for proof.
"""
import hashlib,json,platform,re,shutil,subprocess,time
from pathlib import Path
from ink_knowledge import canonical,identity,Store
from .representation_selection import phase_workload

RUNNER=Path(__file__).with_name('measure_calls.mjs')

def validated(measurements,acquisition):
    """Historical costs cannot resurrect a freshly rejected implementation."""
    accepted=set(acquisition['validated_measurements'])
    return [m for m in measurements if m in accepted]

def read_workload(path):
    raw=path.read_bytes()
    if len(raw)>16_000_000:raise ValueError('measurement workload byte budget')
    v=json.loads(raw)
    if not isinstance(v,dict):raise ValueError('measurement workload object')
    if v.get('schema')==2:
        from .state_measurements import read_workload as read_state
        return read_state(path)
    if set(v)!={'schema','phases','profile','workload'} or v['schema']not in (1,3):raise ValueError('measurement workload schema')
    if not isinstance(v['phases'],dict) or not 1<=len(v['phases'])<=64 or set(v['phases'])!=set(v['profile']):raise ValueError('measurement phases/profile mismatch')
    calls=0
    for phase,rows in v['phases'].items():
        if not isinstance(phase,str) or not re.fullmatch(r'[A-Za-z0-9:_\-.]{1,128}',phase):raise ValueError('measurement phase name')
        n=v['profile'][phase]
        if type(n) is not int or not 0<n<=1_000_000_000:raise ValueError('positive lifecycle weights required')
        if not isinstance(rows,list) or not rows:raise ValueError('measurement phase needs calls')
        for row in rows:
            fields={'function','args'}|({'boundary'}if v['schema']==3 else set())
            if set(row)!=fields or not isinstance(row['function'],str) or not isinstance(row['args'],list):raise ValueError('measurement call fields')
            if v['schema']==3 and row['boundary']not in ('trusted','portable','compact'):raise ValueError('measurement call boundary')
            calls+=1
    if calls>512:raise ValueError('measurement call budget')
    # All supplied calls are selection/training data. Independent evaluation must
    # use different inputs and is never passed back to this acquisition step.
    return v,hashlib.sha256(raw).hexdigest()

def independent_workloads(training,holdout):
    first,_=read_workload(training);second,_=read_workload(holdout)
    if first['schema']!=second['schema']:raise ValueError('holdout workload kind mismatch')
    if first['profile']!=second['profile']:raise ValueError('holdout must retain the lifecycle objective weights')
    if first['schema']==2:
        from .state_measurements import fingerprints
        if fingerprints(first)&fingerprints(second):raise ValueError('holdout state histories overlap selection histories')
        return
    def calls(spec):
        return {json.dumps([row['function'],row['args']],sort_keys=True,separators=(',',':'),allow_nan=False)
                for rows in spec['phases'].values()for row in rows}
    if calls(first)&calls(second):raise ValueError('holdout inputs overlap selection inputs')

def target_context(planner,state=False,encoded=False):
    if planner.options.target=='javascript':
        executable=shutil.which('node')
        if not executable:raise ValueError('offline measurement requires Node.js')
        version=subprocess.check_output([executable,'--version'],text=True).strip();runner=RUNNER
        bridge='trusted-values-v3;mean-complete-call;full-bit-aware-output-consumption'
        if encoded:bridge='schema-framed-owned-result-v1;whole-call-and-complete-byte-consumption'
        if state:
            from .state_measurements import RUNNER as runner
            bridge='typed-bound-full-observation-v1;independent-state-history;portable-lifecycle;whole-host-peak-rss'
    elif planner.options.target=='rust':
        from .native_measurements import RUNNER as runner
        executable=shutil.which('rustc')
        if not executable:raise ValueError('offline measurement requires Rust')
        version=subprocess.check_output([executable,'--version'],text=True).strip()
        bridge='generated-json-call-v1;mean-complete-call;full-bit-aware-output-consumption'
    else:raise ValueError('no installed offline measurement adapter for '+planner.options.target)
    return dict(hardware=platform.machine()+':'+platform.processor()+':'+platform.node(),driver=platform.system()+':'+platform.release(),toolchain='compiler:'+planner.compiler_hash+';host:'+version+';adapter:'+hashlib.sha256(runner.read_bytes()).hexdigest(),backend=planner.options.target,bridge=bridge)

def artifact_digest(path):
    if path.is_file():return hashlib.sha256(path.read_bytes()).hexdigest()
    return identity({str(p.relative_to(path)):hashlib.sha256(p.read_bytes()).hexdigest()for p in sorted(path.rglob('*'))if p.is_file()})

def native_project(source,directory,package):
    """Wrap literal emitted Rust without changing any generated source bytes."""
    (directory/'src').mkdir(parents=True)
    shutil.copyfile(source,directory/'src/lib.rs')
    (directory/'Cargo.toml').write_text('[package]\nname='+json.dumps(package)+'\nversion="0.1.0"\nedition="2021"\n[lib]\ncrate-type=["rlib"]\n[workspace]\n[dependencies]\nnum-bigint="=0.4.8"\nsha2="=0.10.9"\nserde_json={version="=1.0.151",features=["float_roundtrip"]}\n')
    return directory

def acquire(planner,store,packages,states,measurements,path,controls=None):
    acquisition_started=time.monotonic();deadline=acquisition_started+planner.options.measure_timeout
    def remaining():
        seconds=deadline-time.monotonic()
        if seconds<=0:raise ValueError('offline measurement acquisition time budget')
        return min(seconds,planner.options.check_timeout)
    spec,digest=read_workload(path)
    if spec['schema']==2:
        from .state_measurements import acquire as acquire_state
        return acquire_state(planner,store,packages,states,measurements,path,controls)
    if spec['schema']==3 and planner.options.target!='javascript':raise ValueError('encoded lifecycle adapter requires JavaScript')
    target=target_context(planner,encoded=spec['schema']==3);controls=controls or {}
    workload=dict(spec['workload'])
    if set(workload)!={'shape','distribution','concurrency','residency'}:raise ValueError('measurement workload provenance fields')
    workload['shape']=dict(inputs_sha256=digest,declared=workload['shape'])
    if workload['concurrency']!=1:raise ValueError('serial call adapter requires concurrency=1')
    Store.validate_observation(dict(schema=1,program=packages[0]['input_core_sha256'],entries=[],plan=measurements[0],target=target,workload=workload,metrics=dict(complete_call_ns=['0'],peak_bytes=None)))
    phases={};oracle_started=time.monotonic()
    # Reference execution is independently implemented and outside timing.
    for phase,rows in spec['phases'].items():
        phases[phase]=[]
        for i,row in enumerate(rows):
            args=planner.directory/'reference-args.json';args.write_text(json.dumps(row['args'],allow_nan=False))
            expected=planner.invoke('run',planner.original,row['function'],args,'--core',timeout=remaining())
            if isinstance(expected,str):expected=json.loads(expected)
            phases[phase].append(dict(row,expected=expected))
    reference_seconds=str(time.monotonic()-oracle_started)
    artifacts=[];rejected=[]
    for package,state,measurement in zip(packages,states,measurements):
        if not state.get('capability',{}).get('emittable',True):
            rejected.append(dict(measurement=measurement,reason='backend capability'));continue
        staged=planner.directory/(measurement+'.plan.json');staged.write_bytes(canonical(package)+b'\n')
        artifact=planner.directory/(measurement+('.mjs'if planner.options.target=='javascript'else'.rust'));begin=time.monotonic()
        try:
            planner.invoke('emit-plan',planner.original,staged,'--core','--target',planner.options.target,'-o',artifact,timeout=remaining())
            package_name='ink-observed-'+measurement[:24]
            if planner.options.target=='rust':artifact=native_project(artifact,planner.directory/(measurement+'.native'),package_name)
            artifacts.append(dict(measurement=measurement,path=str(artifact),package=package_name,artifact_sha256=artifact_digest(artifact),emission_seconds=str(time.monotonic()-begin)))
        except (ValueError,OSError,subprocess.TimeoutExpired)as error:rejected.append(dict(measurement=measurement,reason=str(error)[-2000:]))
    if not artifacts or artifacts[0]['measurement']!=measurements[0]:raise ValueError('baseline could not be measured')
    native_build=None
    if planner.options.target=='javascript':
        request=planner.directory/'measure-calls.json';request.write_text(json.dumps(dict(artifacts=artifacts,phases=phases,measurement=controls),allow_nan=False))
        processes=1 if controls else getattr(planner.options,'measure_processes',3)
        if type(processes) is not int or not 1<=processes<=8:raise ValueError('measurement process count')
        reports=[]
        for process in range(processes):
            result=subprocess.run([shutil.which('node'),'--max-old-space-size='+str(max(32,min(4096,getattr(planner.options,'memory_bytes',512000000)//1000000))),str(RUNNER),str(request)],capture_output=True,text=True,timeout=remaining())
            if result.returncode:raise ValueError('offline measurement failed: '+result.stderr[-2000:])
            reports.append(json.loads(result.stdout))
        accepted_everywhere={a['measurement']for a in artifacts}
        for report in reports:accepted_everywhere&={row['measurement']for row in report['rows']}
        fingerprints=reports[0]['input_fingerprints']
        if any(r['input_fingerprints']!=fingerprints for r in reports):raise ValueError('measurement normalized inputs changed across processes')
        report=dict(schema=1,processes=processes,rows=[dict(row,process=index)for index,r in enumerate(reports)for row in r['rows']if row['measurement']in accepted_everywhere],
                    input_fingerprints=fingerprints,rejected=[row for r in reports for row in r['rejected']],module_load=[dict(row,process=index)for index,r in enumerate(reports)for row in r['module_load']])
    else:
        from .native_measurements import measure
        report,native_build=measure(planner,artifacts,phases,controls,deadline)
    # Do not persist observations under a fingerprint that changed during the
    # acquisition, even when final compiler replay would reject the build.
    from .compiled_planning import code_fingerprint
    if hashlib.sha256(planner.compiler.read_bytes()).hexdigest()!=planner.compiler_hash or code_fingerprint()!=planner.code_hash or target_context(planner,encoded=spec['schema']==3)!=target:
        raise ValueError('execution machinery changed during offline acquisition')
    observations=[]
    accepted=set()
    for row in report['rows']:
        if row['measurement'] not in {a['measurement']for a in artifacts} or row['phase'] not in spec['phases']:raise ValueError('measurement response binding mismatch')
        Store.validate_observation(dict(schema=1,program=packages[0]['input_core_sha256'],entries=[],plan=row['measurement'],target=target,workload=phase_workload(workload,row['phase']),metrics=dict(complete_call_ns=row['complete_call_ns'],peak_bytes=None)))
        obj=dict(schema=1,program=packages[0]['input_core_sha256'],entries=[],plan=row['measurement'],target=target,workload=phase_workload(workload,row['phase']),metrics=dict(complete_call_ns=row['complete_call_ns'],peak_bytes=None))
        observations.append(store.observe(obj));accepted.add(row['measurement'])
    if measurements[0] not in accepted:raise ValueError('baseline failed measurement validation')
    return target,workload,spec['profile'],dict(schema=1,adapter=target['bridge'],workload_sha256=digest,reference_seconds=reference_seconds,acquisition_seconds=str(time.monotonic()-acquisition_started),observations=observations,validated_measurements=sorted(accepted),artifacts=artifacts,native_build=native_build,rejected=rejected+report['rejected'],acquisition=report,scope='Offline selection inputs; average whole call and full result consumption; separate setup; no exact peak memory evidence; no runtime probes')
