import hashlib,json,subprocess,time
from pathlib import Path
compiler=Path("target/release/ink")
source="build/action-specialization/early-return/core.json"
plan="build/action-specialization/final-filtered/plan.json"
packet=json.loads(Path(plan).read_bytes()); packet["steps"]=packet["steps"][:1]
process=subprocess.Popen([str(compiler),"plan-session",source,"--target","javascript"],stdin=subprocess.PIPE,stdout=subprocess.PIPE,text=True)
assert json.loads(process.stdout.readline())["ready"]
rows=[]
for label,p in [("fresh-maintained",packet),("same-maintained",packet)]:
 start=time.monotonic();process.stdin.write(json.dumps(p,separators=(",",":"))+"\n");process.stdin.flush();reply=json.loads(process.stdout.readline())
 assert reply.get("status")=="checked",reply
 rows.append(dict(label=label,seconds=time.monotonic()-start,reused_steps=reply["reused_steps"]))
p=json.loads(Path(plan).read_bytes())
for capacity in [256,4096]:
 p["steps"][-1]["package"]["dense_prefixes"][0]["capacity"]=capacity
 start=time.monotonic();process.stdin.write(json.dumps(p,separators=(",",":"))+"\n");process.stdin.flush();reply=json.loads(process.stdout.readline())
 assert reply.get("status")=="checked",reply
 rows.append(dict(label="dense-"+str(capacity),seconds=time.monotonic()-start,reused_steps=reply["reused_steps"]))
process.stdin.close();assert process.wait()==0
Path("build/planner-reliability/checker-profile.json").write_text(json.dumps(dict(compiler_sha256=hashlib.sha256(compiler.read_bytes()).hexdigest(),original_debug_fresh_seconds=31.703,rows=rows),indent=2)+"\n")
print(json.dumps(rows))
