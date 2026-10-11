import json
from ink_knowledge import identity,semantic_entry
from pathlib import Path
def named_laws():
 data=Path(__file__).resolve().parents[1]/'research/web-stack-proofs-17/specialization/old-witnesses.json'
 return [(r["name"]+"_"+identity(semantic_entry(r["law"])),r["law"]) for r in json.loads(data.read_text())["laws"]]
