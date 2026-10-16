import sys
from pathlib import Path
sys.path.insert(0,str(Path('knowledge').resolve()))
from producers import frozen_composition as fc
ordinary=fc.ChunkPartial.expr
def relevant(self,e,env=None,active=(),depth=0):
 if isinstance(e,dict) and 'Call' in e and e['Call'][0] in self.functions:
  name,original=e['Call'];arguments=[self.expr(a,env,active,depth+1) for a in original]
  if not any(self.value(a) and not self.value(b) for a,b in zip(arguments,original)):
   return {'Call':[name,arguments]}
 return ordinary(self,e,env,active,depth)
fc.ChunkPartial.expr=relevant
fc.main()
