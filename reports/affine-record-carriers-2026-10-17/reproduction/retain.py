import gzip,hashlib,io,json,subprocess,tarfile
from pathlib import Path
r=Path(__file__).resolve().parents[2];b=r/'build/owned-carriers';out=r/'reports/affine-record-carriers-2026-10-17';out.mkdir(exist_ok=True)
sha=lambda data:hashlib.sha256(data).hexdigest()
artifacts={};cohorts={};archives={}
def keep(path,name):
    data=path.read_bytes();compressed=len(data)>50000 or path.suffix=='.log'
    stored=gzip.compress(data,compresslevel=9,mtime=0)if compressed else data
    target=out/(name+'.gz'if compressed else name);target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(stored)
    artifacts[name]=dict(stored=str(target.relative_to(out)),encoding='gzip'if compressed else'identity',bytes=len(data),sha256=sha(data),stored_sha256=sha(stored))
def tree(path,name):
    for f in sorted(path.rglob('*')):
        if f.is_file()and'target'not in f.relative_to(path).parts:keep(f,str(Path(name)/f.relative_to(path)))
def source_archive(path,name,inventory):
    content={};buffer=io.BytesIO()
    with tarfile.open(fileobj=buffer,mode='w',format=tarfile.USTAR_FORMAT)as archive:
        for f,digest in sorted(inventory.items()):
            data=(path/f).read_bytes();assert sha(data)==digest,f
            info=tarfile.TarInfo(f);info.size=len(data);info.mtime=0;info.mode=0o644;archive.addfile(info,io.BytesIO(data));content[f]=digest
    data=gzip.compress(buffer.getvalue(),compresslevel=9,mtime=0);target=out/name;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(data)
    archives[name]=dict(bytes=len(data),sha256=sha(data),files=content)
workloads=[('graph-final','final/graph','graph',['cohort-1']),('neural-final','final/neural-prepared','neural',['cohort-1','cohort-2']),('neural-unprepared-final','final/neural-earlier','neural',['cohort-1']),('graph','diagnostics/pre-fold/graph','graph',['cohort-1']),('neural','diagnostics/pre-fold/neural','neural',['pilot','cohort-1']),('graph-fold','diagnostics/fold-with-initial/graph','graph',['cohort-1'])]
for folder,label,kind,studies in workloads:
    path=b/folder
    for name in ['source.core.json','baseline.mjs','new.mjs','data.json','model.snapshot','contexts.json','reference-history.json','measure.mjs','run.py','emission.json']:
        if(path/name).exists():keep(path/name,label+'/'+name)
    for study in studies:
        tree(path/study,label+'/'+study);cohorts[label+'/'+study]=dict(kind=kind,images=label)
        if(path/(study+'.log')).exists():keep(path/(study+'.log'),label+'/'+study+'.log')
tree(b/'controls-final','controls')
validation=json.loads((b/'final-validation/receipt.json').read_bytes());assert validation['status']=='passed'
for name in ['receipt.json','suite.log','examples.log','fetch.log']:keep(b/'final-validation'/name,'validation/package/'+name)
source_archive(b/'final-validation/source','sources/final-package.tar.gz',validation['source'])
for folder,inventory,name in [('pre-fold-source','package-sources.json','sources/pre-fold.tar.gz'),('fold-before-initial-source','package-fold-sources.json','sources/fold-with-initial.tar.gz')]:
    source_archive(b/folder,name,json.loads((b/inventory).read_bytes())['files'])
for name in ['package-sources.json','package-receipt.json','package.log','package-fold-sources.json','package-fold-receipt.json','package-fold.log','emitter-receipt.json','emitter-fold-receipt.json','emitter-final-receipt.json','emitter-build.log','emitter-fold-build.log','focused.log','focused-full.log','focused-fold.log','focused-fold-getters.log','focused-final.log','partition-tests.log','feature-audit.json','feature-audit.log','host-load-after-cohort.json','distribution-image-reproduction.json','gpu-metadata.log','gpu-fetch.log','runtime-metadata.log','runtime-fetch.log','distribution-metadata.log','distribution-fetch.log']:
    if(b/name).exists():keep(b/name,'validation/'+name)
for f in b.glob('fixture-build*.log'):keep(f,'diagnostics/authoring/'+f.name)
integration=json.loads((b/'integration/receipt.json').read_bytes());assert integration['status']=='passed'
for name in ['receipt.json','sources.json','compile.log','owned-records.log','numerical-state.log','function-specialization.log']:keep(b/'integration'/name,'validation/integration/'+name)
tree(b/'gpu-validation','validation/gpu')
parity=b/'integration/source/build/owned-record-carrier-parity';tree(parity,'parity');keep(parity/'rust/target/wasm32-unknown-unknown/debug/compiled_state.wasm','parity/compiled_state.wasm')
for name in ['validate.py','integrate.py','validate_gpu.py','retain.py']:keep(b/name,'reproduction/'+name)
keep(r/'tests/owned_record_carriers.rs','reproduction/owned_record_carriers.rs')
git=lambda repo:subprocess.check_output(['git','-C',str(repo),'rev-parse','HEAD'],text=True).strip()
summary=dict(schema=1,status='validated-measured-unadmitted',distribution_source=integration['distribution'],core='f625b7b6928d8535fba74390ad70d9a4eab5f710',packages={name:git(r/name)for name in ['lowerings/js','lowerings/gpu','runtime','abi','native-support','lowerings/rust','lowerings/wasm','knowledge','planner']},baseline=dict(javascript='306aa216d84f0f3ef0f7887c29b7fc4d1666b2c2',compiler_sha256='bbd0db5629d396868895750b9af02eff106da39871c61eabc2f5f745a1277b70',compiler_inventory='../rounded-f32-carriers-2026-10-17/validation/integration/sources.json.gz'),results=dict(package_tests=61,package_targets=48,pure_cases_per_mode=1731,state_outcomes=96,restores=17,cross_target_outcomes=1251,cross_target_restores=17),cohorts=cohorts,source_archives=archives,artifacts=artifacts,scope='Literal local affine record storage, bounded helper expansion and ordered folds. Shared-host observations with all adverse/preliminary samples retained; no automatic planner admission, GPU training or upstream parity claim.',files={str(f.relative_to(out)):dict(bytes=f.stat().st_size,sha256=sha(f.read_bytes()))for f in sorted(out.rglob('*'))if f.is_file()and f!=out/'summary.json'})
(out/'summary.json').write_text(json.dumps(summary,indent=2)+'\n');print(json.dumps(dict(files=len(summary['files']),artifacts=len(artifacts),stored_bytes=sum(f['bytes']for f in summary['files'].values()))))
