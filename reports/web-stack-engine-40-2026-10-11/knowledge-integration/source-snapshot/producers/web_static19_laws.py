"""Frozen ordinary checked bridges for batch19 compile-time callback inputs.

The old-only bridges are shared by both comparison catalogues. Eight new bridges
instantiate thirteen arbitrary callback roots; they are not new compiler rules.
"""
import json
from pathlib import Path

def named_laws():
    path=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-19/static-derivation/witnesses.json'
    d=json.loads(path.read_text())
    if d['status']!='checked':raise ValueError('static derivation not admitted')
    return [(r['name'],r['law']) for r in d['shared_old']+d['new_composed']]
