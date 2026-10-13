"""Parent publication cost comparison; same post-change compiler/search workers."""
import cProfile,json,os,pstats,runpy,subprocess,sys,time
from pathlib import Path
from store_cost import ROOT,WORK,OUT,clone,old_class,set_refresh_mode
sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
def child(mode):
 set_refresh_mode(mode)
 if mode=='before':
  import ink_knowledge,ink_knowledge.store
  cls=old_class();ink_knowledge.Store=cls;ink_knowledge.store.Store=cls
 sys.argv=[sys.argv[0],*sys.argv[3:]]
 profile=cProfile.Profile();profile.enable()
 try:runpy.run_module('ink_planner.compiled_planning',run_name='__main__')
 finally:
  profile.disable();path=Path(os.environ['INK_COST_PROFILE']);profile.dump_stats(path)
  with path.with_suffix('.txt').open('w')as f:pstats.Stats(profile,stream=f).sort_stats('cumulative').print_stats(40)

def run():
 rows=[]
 for repeat in range(2):
  for mode in (['before','after']if repeat==0 else ['after','before']):
   db=clone(WORK/'catalogue',WORK/'cold-databases'/f'{repeat}-{mode}');directory=OUT/'cold-builds'/f'{repeat}-{mode}';directory.mkdir(parents=True,exist_ok=True)
   cmd=[sys.executable,str(Path(__file__).resolve()),'child',mode,'--compiler',str(WORK/'compiler/after'),'--source',str(ROOT/'bench/native-f32-epoch/corpus/selection-mode.ink'),'--knowledge-root',str(db),'--target','javascript','--planning-effort','quick','--cache','off','--emit',str(directory/'output.mjs'),'-o',str(directory/'plan.json')]
   env=dict(os.environ,INK_DISTRIBUTION=str(ROOT),PYTHONPATH=os.pathsep.join([str(ROOT/'knowledge'),str(ROOT/'planner')]),INK_COST_PROFILE=str(directory/'profile.pstats'));t=time.monotonic()
   with (directory/'stdout.txt').open('wb')as stdout,(directory/'stderr.txt').open('wb')as stderr:r=subprocess.run(cmd,env=env,stdout=stdout,stderr=stderr)
   row=dict(repeat=repeat,mode=mode,status=r.returncode,seconds=time.monotonic()-t,command=cmd);rows.append(row);(OUT/'cold-builds.json').write_text(json.dumps(rows,indent=2)+'\n');print(mode,repeat,row['seconds'],r.returncode,flush=True)
   assert r.returncode==0,(directory/'stderr.txt').read_text()[-2500:]
if __name__=='__main__':child(sys.argv[2])if sys.argv[1]=='child'else run()
