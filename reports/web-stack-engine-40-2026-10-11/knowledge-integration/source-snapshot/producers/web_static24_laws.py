"""Checked round24 shared old-only certificates and fresh source bridges.

Old consequences receive equal prior/current opportunities. No admission is
inferred from the producer: the publication path checks all emitted proof bytes.
"""
import json
from pathlib import Path

def named_laws():
    path=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-24/static-derivation/witnesses.json'
    data=json.loads(path.read_text())
    if data['status']!='checked':raise ValueError('source derivation not admitted')
    return [(r['name'],r['law']) for r in data['shared_old']+data['new_composed']]
