from pathlib import Path
import subprocess,tarfile,io,json,os
root=Path.cwd();base=root/'build/v8-proof-transport';path=base/'legacy-compiler';path.mkdir()
source='1a5c025fe86e92e7729edb1af093aa1ceb5e1abb'
archive=subprocess.check_output(['git','archive',source,'Cargo.toml','Cargo.lock','src','core'])
with tarfile.open(fileobj=io.BytesIO(archive))as tar:tar.extractall(path,filter='data')
assert subprocess.check_output(['git','rev-parse',source+':core'])==subprocess.check_output(['git','rev-parse','69980ec3664a7d702a5fc6108c969f1584995ee7:core'])
pins={}
for name in ['runtime','abi','native-support','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu']:
 expected=subprocess.check_output(['git','rev-parse',source+':'+name],text=True).strip();actual=subprocess.check_output(['git','-C',str(root/name),'rev-parse','HEAD'],text=True).strip();assert expected==actual
 destination=path/name;destination.parent.mkdir(parents=True,exist_ok=True);destination.symlink_to(root/name,target_is_directory=True);pins[name]=actual
(path/'storage-retention.json').write_text(json.dumps(dict(schema=1,keep=[dict(path='.',reason='Active required legacy checker regression baseline: only declared committed distribution source/core/manifests materialized; immutable exact backend sources shared read-only. No knowledge/report/target copies.')],safe_to_remove=[]),indent=2)+'\n')
(base/'legacy-source-pins.json').write_text(json.dumps(dict(schema=1,distribution_source=source,core_package='69980ec3664a7d702a5fc6108c969f1584995ee7',pins=pins,method='Minimal declared compiler source/core/manifests plus exact read-only backend inputs; required untimed compiler regression build, debug/incremental disabled, two jobs.'),indent=2)+'\n')
