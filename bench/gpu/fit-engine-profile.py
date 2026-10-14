#!/usr/bin/env python3
"""Fit only registered complete-engine training files, retaining their identities."""
import hashlib,json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2];sys.path[:0]=[str(ROOT/'planner'),str(ROOT/'knowledge')]
from ink_knowledge import Store
from ink_planner.engine_profiles import fit_records

output=Path(sys.argv[1]);paths=[Path(p)for p in sys.argv[2:]]
private=output.parent/'engine-profile-knowledge'
if private.exists():raise ValueError('choose a fresh output directory; retain prior observations')
records=[json.loads(p.read_text())for p in paths]
store=Store.publish(private,[]);ident,profile,rows=fit_records(store,records)
output.write_text(json.dumps(profile,indent=2)+'\n')
receipt=dict(model=ident,profile_sha256=hashlib.sha256(output.read_bytes()).hexdigest(),observations=rows,training_files={str(p):hashlib.sha256(p.read_bytes()).hexdigest()for p in paths},
    source_hashes={p:hashlib.sha256((ROOT/p).read_bytes()).hexdigest()for p in ['planner/ink_planner/engine_profiles.py','planner/ink_planner/cost_profiles.py','knowledge/ink_knowledge/cost-model-basis.json']},
    authority='Profitability evidence only; full engine costs, distinct from session scope. Evaluation observations excluded.')
(output.parent/'engine-fit-receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
print(json.dumps(dict(model=ident,observations=len(rows),output=str(output))))
