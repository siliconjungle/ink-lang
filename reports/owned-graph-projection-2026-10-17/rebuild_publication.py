"""Materialize exact committed sources privately and replay executed images.

APFS clonefile is only a copy-on-write source copy optimization. Both sides are
checked against the committed Git blob; Cargo creates every build artifact.
"""
import argparse,ctypes,errno,gzip,hashlib,json,os,shutil,subprocess,sys,time
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PACKAGES=['abi','native-support','knowledge','planner','runtime','lowerings/rust','lowerings/js','lowerings/wasm','lowerings/gpu']
SUBSETS={'knowledge':['ink_knowledge','producers','libraries'],'planner':['ink_planner','browser','plan.py','compile_plan.py']}
def git(path,*args):return subprocess.check_output(['git','-C',str(path),*args])
def blob(data):return hashlib.sha1(b'blob '+str(len(data)).encode()+b'\0'+data).hexdigest()
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def main():
 p=argparse.ArgumentParser();p.add_argument('--source',required=True);p.add_argument('--destination',type=Path,required=True);a=p.parse_args();base=a.destination.resolve();base.mkdir(parents=True,exist_ok=False);source=git(ROOT,'rev-parse',a.source+'^{commit}').decode().strip();checkout=base/'source';checkout.mkdir();counts=dict(cloned=0,materialized=0,symlinks=0,bytes=0)
 api=ctypes.CDLL('/usr/lib/libSystem.B.dylib',use_errno=True)if sys.platform=='darwin'else None
 if api:api.clonefile.argtypes=[ctypes.c_char_p,ctypes.c_char_p,ctypes.c_int];api.clonefile.restype=ctypes.c_int
 def materialize(repository,revision,destination,paths=()):
  rows=git(repository,'ls-tree','-r','-z',revision,*paths).split(b'\0')
  for row in rows:
   if not row:continue
   meta,name=row.split(b'\t',1);mode,kind,ident=meta.decode().split();name=os.fsdecode(name)
   if kind!='blob':raise ValueError('unexpected non-blob source '+name)
   target=destination/name;target.parent.mkdir(parents=True,exist_ok=True);original=repository/name
   if mode=='120000':
    os.symlink(os.fsdecode(git(repository,'cat-file','blob',ident)),target);counts['symlinks']+=1;continue
   contents=original.read_bytes()if original.is_file()and not original.is_symlink()else None
   cloned=False
   if contents is not None and blob(contents)==ident and api:
    cloned=api.clonefile(os.fsencode(original),os.fsencode(target),0)==0
   if not cloned:
    contents=git(repository,'cat-file','blob',ident);target.write_bytes(contents);counts['materialized']+=1
   else:counts['cloned']+=1
   actual=target.read_bytes()
   if blob(actual)!=ident:raise ValueError('committed private source mismatch '+name)
   target.chmod(0o755 if mode=='100755'else 0o644);counts['bytes']+=len(actual)
 materialize(ROOT,source,checkout,['Cargo.toml','src','core','stdlib','examples'])
 if not(checkout/'Cargo.lock').exists():shutil.copyfile(Path(__file__).with_name('publication-Cargo.lock') if Path(__file__).with_name('publication-Cargo.lock').exists() else ROOT/'Cargo.lock',checkout/'Cargo.lock')
 links={}
 for path in PACKAGES:
  row=git(ROOT,'ls-tree',source,path).decode().split();assert row[0]=='160000';links[path]=row[2];materialize(ROOT/path,row[2],checkout/path,SUBSETS.get(path,()))
 rec=dict(schema=1,source=source,packages=links,private_checkout=True,private_target=True,resolution_lock_sha256=sha(checkout/'Cargo.lock'),source_materialization=counts,scope='Exact committed source blobs, private copy-on-write source files and fresh ordinary Cargo compilation. Replays both complete plans and compares retained emitted images; finite reproducibility, not compiler correctness.')
 env=dict(os.environ,CARGO_TARGET_DIR=str(base/'target'),INK_DISTRIBUTION=str(checkout),PYTHONPATH=os.pathsep.join(str(checkout/x)for x in ['knowledge','planner']),PYTHONNOUSERSITE='1')
 log=base/'build-and-replay.log'
 def run(args):
  with log.open('ab')as stream:
   result=subprocess.run(list(map(str,args)),cwd=checkout,env=env,stdout=stream,stderr=subprocess.STDOUT)
  if result.returncode:raise ValueError('command failed '+str(args[:4])+'; see '+str(log))
 (base/'source.json').write_text(json.dumps(rec,indent=2)+'\n');print(json.dumps(dict(materialized=counts)),flush=True)
 run(['cargo','build','--locked','--bin','ink']);ink=base/'target/debug/ink';rec['compiler_sha256']=sha(ink)
 retained=ROOT/'reports/owned-graph-projection-2026-10-17'
 def input(name):
  path=retained/name;data=path.read_bytes()if path.exists()else gzip.decompress((retained/(name+'.gz')).read_bytes());out=base/name;out.write_bytes(data);return out
 core=input('source.core.json');images={}
 for name,plan in [('baseline',None),('projected','projection-plan.json'),('selected','final-plan.json')]:
  out=base/(name+'.mjs');args=[ink,'compile'if plan else'build',core,'--core']
  if plan:args+=['--plan',input(plan)]
  run([*args,'--target','javascript','-o',out]);expected=retained/(name+'.mjs');images[name]=dict(actual=sha(out),expected=sha(expected),equal=out.read_bytes()==expected.read_bytes())
  if not images[name]['equal']:raise ValueError('executed image differs: '+name)
 proposal=base/'regenerated.plan.json';run([sys.executable,retained/'propose.py',core,'--compiler',ink,'--function','evaluate','--field','values','-o',proposal]);previous=input('projection-plan.json');rec['authoring']=dict(actual=sha(proposal),expected=sha(previous),equal=proposal.read_bytes()==previous.read_bytes())
 if not rec['authoring']['equal']:raise ValueError('regenerated proposal differs')
 rec.update(status='passed',images=images,log_sha256=sha(log));(base/'receipt.json').write_text(json.dumps(rec,indent=2)+'\n');print(json.dumps(rec),flush=True)
if __name__=='__main__':main()
