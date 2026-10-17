from pathlib import Path
import gzip,hashlib,io,json,shutil,subprocess,tarfile
root=Path(__file__).resolve().parents[2];base=Path(__file__).parent;report=root/'reports/f32-storage-experiments-2026-10-17';report.mkdir(exist_ok=False)
def save(name,data):
 p=report/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
def copy(name,p):save(name,p.read_bytes())
def archive(name,files):
 stream=io.BytesIO()
 with gzip.GzipFile(fileobj=stream,mode='wb',mtime=0)as gz:
  with tarfile.open(fileobj=gz,mode='w')as tar:
   for name_,data in sorted(files.items()):
    info=tarfile.TarInfo(name_);info.size=len(data);info.mtime=0;info.mode=0o644;tar.addfile(info,io.BytesIO(data))
 save(name,stream.getvalue())
 return {n:hashlib.sha256(d).hexdigest()for n,d in sorted(files.items())}
metadata={'schema':1,'status':'rejected-private-experiments','baseline_js':'a6c14fb6f232370fac8cafc973b4803083e1e0a8','baseline_distribution':'96979a8561fb885fbcaff9c0ac6f420ac1127b2c','core_package':'f625b7b6928d8535fba74390ad70d9a4eab5f710','archives':{},'cohorts':[]}
for label,folder,image in [('numbers',base,base/'neural-prepared.mjs'),('typed',base/'typed',base/'typed/neural-prepared.mjs'),('decoded',base/'decoded',base/'decoded/neural-prepared.mjs')]:
 files={str(p.relative_to(folder/'package')):p.read_bytes()for p in (folder/'package').rglob('*')if p.is_file()};name=f'sources/{label}.tar.gz';metadata['archives'][name]=archive(name,files)
 copy(f'images/{label}.mjs',image)
 for p in folder.glob('*'):
  if p.is_file()and p.suffix in ['.json','.log']and not p.name.startswith('neural-')and not p.name.startswith('graph-'):copy(f'validation/{label}/{p.name}',p)
 cohort=folder/'cohort-1';files={p.name:p.read_bytes()for p in cohort.iterdir()if p.is_file()};name=f'measurements/{label}.tar.gz';metadata['archives'][name]=archive(name,files);metadata['cohorts'].append({'name':label,'archive':name,'pairs':6,'image':f'images/{label}.mjs'})
 copy(f'measurements/{label}-acquisition.log',folder/'cohort-1.log')
data=root/'build/owned-carriers/neural-final'
for name in ['measure.mjs','model.snapshot','contexts.json','reference-history.json','source.core.json']:copy('workload/'+name,data/name)
copy('images/baseline.mjs',data/'new.mjs')
for name in ['prepare.py','prepare_typed.py','prepare_decoded.py','measure.py','gather.py']:copy('acquisition/'+name,base/name)
# This control image/case set is emitted by the typed source experiment and
# checked against the independently implemented core evaluator by its Rust test.
log=(base/'typed/controls.log').read_text();control=Path(log.split('retained at ',1)[1].splitlines()[0]);assert control.is_dir()
for name in ['program.mjs','cases.json','test.mjs','native.log','bits.log']:copy('controls/typed/'+name,control/name)
copy('controls/numbers/test.rs',base/'package/tests/number_buffers.rs')
# Baseline source is a complete checked-out standalone package; no build targets.
package=root/'lowerings/js';files={f:(package/f).read_bytes()for f in filter(None,subprocess.check_output(['git','ls-files','-z'],cwd=package).decode().split('\0'))if(package/f).is_file()};metadata['archives']['sources/baseline.tar.gz']=archive('sources/baseline.tar.gz',files)
save('study.json',(json.dumps(metadata,indent=2)+'\n').encode())
print(report)
