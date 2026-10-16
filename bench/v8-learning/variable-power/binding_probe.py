from pathlib import Path
import cProfile,pstats,time
from ink_knowledge import Store
from ink_knowledge.published_bindings import build
b=Path('build/v8-variable-power-cases/search-profile');root=b/'wide-final-cli/knowledge';s=Store(root,root/'store/snapshots/14edbdd3dea8f2bea214b8badba800a004dfbeffc7c4feb02be8b9a1ad45e739.json');p=cProfile.Profile();p.enable();start=time.monotonic();r=build(s);p.disable();print('seconds',time.monotonic()-start,'bindings',{k:len(v)for k,v in r['entries'].items()},flush=True);pstats.Stats(p).sort_stats('cumtime').print_stats(24)
