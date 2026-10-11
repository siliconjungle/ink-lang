"""Ordinary checked compile-time certificates for batch20 subjects.
Shared old-only bridges receive equal admission and selection opportunities.
"""
import json
from pathlib import Path

def named_laws():
    path=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-20/static-derivation/witnesses.json'
    data=json.loads(path.read_text())
    if data['status']!='checked':raise ValueError('static derivation not admitted')
    return [(r['name'],r['law']) for r in data['shared_old']+data['new_composed']]
