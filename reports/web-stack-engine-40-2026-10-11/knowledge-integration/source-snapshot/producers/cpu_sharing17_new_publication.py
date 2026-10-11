import json
from pathlib import Path
def named_laws():
 data=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-17/sharing-specialization/new-publication.json'
 return [(r["name"],r["law"]) for r in json.loads(data.read_text())["laws"]]
