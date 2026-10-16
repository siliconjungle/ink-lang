"""Keep declared terminal artifact/proof inputs, excluding caches and targets."""
from pathlib import Path
import gzip,hashlib,io,json,tarfile,shutil,subprocess
base=Path('build/v8-proof-transport');source=base/'trained-validation';here=Path('bench/v8-learning/hint-transport');files={}
def add(name,path,expected=None):
 data=path.read_bytes()
 if expected is not None:assert len(data)==expected['bytes']and hashlib.sha256(data).hexdigest()==expected['sha256']
 files[name]=data
for directory in sorted(source.iterdir()):
 if directory.is_dir()and(directory/'artifact.json').is_file():
  manifest=json.loads((directory/'artifact.json').read_bytes());add(directory.name+'/artifact.json',directory/'artifact.json')
  for name,entry in manifest['files'].items():
   assert not Path(name).is_absolute()and'..'not in Path(name).parts;add(directory.name+'/'+name,directory/name,entry)
 elif directory.is_file()and directory.name!='storage-retention.json':add(directory.name,directory)
assert len([n for n in files if n.endswith('/artifact.json')])==6
index={n:dict(bytes=len(b),sha256=hashlib.sha256(b).hexdigest())for n,b in sorted(files.items())}
with tarfile.open(here/'trained-integration-inputs.tar.gz','w:gz',compresslevel=9)as archive:
 for name,data in sorted(files.items()):
  info=tarfile.TarInfo(name);info.size=len(data);info.mode=0o644;info.mtime=0;archive.addfile(info,io.BytesIO(data))
(here/'trained-integration-index.json').write_text(json.dumps(dict(schema=1,archive_sha256=hashlib.sha256((here/'trained-integration-inputs.tar.gz').read_bytes()).hexdigest(),files=index,scope='Six exact validated public artifact inventories plus complete143-case reference observations/snapshots and replies. No private optional cache or build target.'),indent=2)+'\n')
for name in ['merged-trained-composition.log','merged-trained-proof-binding.log','merged-build.log']:
 data=(base/name).read_bytes();(here/(name+'.gz')).write_bytes(gzip.compress(data,mtime=0))
record=dict(schema=1,exit_status=0,production_source=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip(),compiler_sha256=hashlib.sha256((base/'frozen/ink-integrated').read_bytes()).hexdigest(),core_tree=subprocess.check_output(['git','rev-parse','HEAD:core'],text=True).strip(),tests=['composed_frozen_artifacts_initialize_live_weights_and_recheck_complete_plans','direct_specialization_references_bind_exact_checked_local_proof_bytes'],targets=['javascript','native','rust','webgpu','wasm32'],reference_cases=143,exact_snapshots=True,test_source_sha256=hashlib.sha256(Path('tests/trained_build.rs').read_bytes()).hexdigest(),test_output_root_override='INK_TRAINED_BUILD_ROOT: private owned experiment path',log_sha256={n:hashlib.sha256((base/n).read_bytes()).hexdigest()for n in ['merged-trained-composition.log','merged-trained-proof-binding.log']},scope='Observed sessions10812 and91962 exit0 with required target flags. Conformance/proof binding only; no new timings or whole-backend correctness proof.')
(here/'trained-integration.json').write_text(json.dumps(record,indent=2)+'\n');shutil.copyfile(base/'merged-cli-build-final.log',here/'merged-cli-build-final.log');print(json.dumps(dict(files=len(files),archive_bytes=(here/'trained-integration-inputs.tar.gz').stat().st_size)))
