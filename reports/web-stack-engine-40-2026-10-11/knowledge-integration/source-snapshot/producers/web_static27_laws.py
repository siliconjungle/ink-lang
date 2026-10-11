"""Checked round27 shared old-only certificates and fresh source bridges.

Previously published content aliases remain historical opportunities; they are
not republished or counted as new entries. All proof bytes need kernel admission.
"""
import json
from pathlib import Path
from ink_knowledge import Store,identity,semantic_entry

def named_laws():
    root=Path(__file__).resolve().parents[1];path=root/'research/web-stack-proofs-27/static-derivation/witnesses.json';data=json.loads(path.read_text())
    if data['status']!='checked':raise ValueError('source derivation not admitted')
    prior=Store(root,root/'store/snapshots'/f'{data["historical_snapshot"]}.json');before=set(prior.members())
    return [(r['name'],r['law']) for r in data['shared_old']+data['new_composed'] if identity(semantic_entry(r['law'])) not in before]
