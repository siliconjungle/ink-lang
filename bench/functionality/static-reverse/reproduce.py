#!/usr/bin/env python3
"""Run the complete public compiled-reverse comparison with the required engine gate."""
import argparse,subprocess
from pathlib import Path
p=argparse.ArgumentParser(description=__doc__)
for k in ['compiler','node22','node26','chrome','out']:p.add_argument('--'+k,required=True)
p.add_argument('--playwright')
a=p.parse_args();here=Path(__file__).resolve().parent;root=here.parents[2]
assert (here/'source.ink').read_text().replace('compiled_reverse_','reverse_')==(here/'baseline-source.ink').read_text(), 'objective/update sources differ'
cmd=[a.node26,str(root/'tools/engine-gate/gate.mjs'),'--config',str(here/'comparison-config.json')]
for k in ['compiler','node22','node26','chrome','out','playwright']:
 if getattr(a,k):cmd+=['--'+k,getattr(a,k)]
subprocess.run(cmd,cwd=root,check=True)
