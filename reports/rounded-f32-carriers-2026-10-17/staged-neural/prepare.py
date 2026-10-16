import json,subprocess,shutil
from pathlib import Path
root=Path(__file__).resolve().parents[3];out=Path(__file__).resolve().parent
artifact=root/'reports/prepared-initializers-2026-10-16/neural'
shutil.copy2(artifact/'source.core.json',out/'source.core.json');shutil.copy2(artifact/'model.snapshot',out/'model.snapshot')
seed=51749;contexts=[]
def next_word():
 global seed
 seed^=(seed<<13)&0xffffffff;seed^=seed>>17;seed^=(seed<<5)&0xffffffff;seed&=0xffffffff;return seed
for _ in range(16):
 contexts.append(dict(features=[(next_word()%2049-1024)/1024 for _ in range(10)],target=[(next_word()%257)/256 for _ in range(4)]))
(out/'contexts.json').write_text(json.dumps(contexts))
script=[]
for turn,c in enumerate(contexts[:8]):
 script.append(dict(call='observe',args=[c['features'],c['target'],2]))
 if turn%4==3:script.append(dict(call='cancel',args=[c['features'],c['target']]))
for c in contexts:script.append(dict(call='predict',args=[c['features']]))
script.append(dict(call='model',args=[]))
snapshot=out/'reference.snapshot';shutil.copy2(out/'model.snapshot',snapshot)
history=[dict(restore=list(snapshot.read_bytes()))];compiler=root/'build/function-projection/guard-publication-ink'
for step in script:
 (out/'reference-call.json').write_text(json.dumps([step]))
 result=subprocess.run([str(compiler),'execute',str(out/'source.core.json'),str(out/'reference-call.json'),'--core','--restore',str(snapshot),'--snapshot-out',str(snapshot),'--portable'],capture_output=True,text=True,check=True,timeout=180)
 outcome=json.loads(result.stdout)[0];history.append(dict(**step,expected=outcome,snapshot=list(snapshot.read_bytes())))
 if step['call']=='cancel':assert not outcome['committed']
 if step['call']=='observe':assert outcome['committed']
(out/'reference-history.json').write_text(json.dumps(history));print(json.dumps(dict(status='independent-reference-captured',outcomes=len(script))))
