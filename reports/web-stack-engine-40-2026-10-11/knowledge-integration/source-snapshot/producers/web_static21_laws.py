"""Ordinary checked compile-time certificates for batch21 subjects.
Shared old-only bridges receive equal admission and selection opportunities.
"""
import json
from pathlib import Path

def named_laws():
    root=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-21'
    reviewed=json.loads((root/'static-derivation-reviewed/witnesses.json').read_text())
    gpu=json.loads((root/'static-gpu/witnesses.json').read_text())
    if reviewed['status']!='checked' or gpu['status']!='checked':raise ValueError('static derivation not admitted')
    return [(r['name'],r['law']) for r in reviewed['shared_old']+reviewed['new_composed']+gpu['new_composed']]
