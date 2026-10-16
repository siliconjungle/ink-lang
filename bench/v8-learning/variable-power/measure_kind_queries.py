"""Complete query rows and independent VM-work controls on exact metadata."""
import argparse,hashlib,json,sqlite3,time
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--database',type=Path,required=True);p.add_argument('--label',required=True);a=p.parse_args();snapshot='14edbdd3dea8f2bea214b8badba800a004dfbeffc7c4feb02be8b9a1ad45e739';cases=[]
for kind in ['implementation','representation','maintenance','definition','theorem']:
 for after,limit in [(None,256),('8'*64,256),(None,1)]:
  q='SELECT e.id FROM entries e JOIN members m ON m.entry_id=e.id WHERE m.snapshot_id=? AND e.kind=?'+(' AND e.id>?'if after else'')+' ORDER BY e.id LIMIT ?';args=[snapshot,kind]+([after]if after else[])+[limit];cases.append((kind,after,limit,q,args))
rows=[];start=time.monotonic()
for kind,after,limit,q,args in cases:
 with sqlite3.connect(a.database.resolve().as_uri()+'?mode=ro',uri=True)as db:
  t=time.monotonic();result=db.execute(q,args).fetchall();seconds=time.monotonic()-t
 rows.append(dict(kind=kind,after=after,limit=limit,count=len(result),result_sha256=hashlib.sha256(json.dumps(result,separators=(',',':')).encode()).hexdigest(),query_seconds=str(seconds)))
elapsed=time.monotonic()-start;work=[]
for kind,after,limit,q,args in cases:
 with sqlite3.connect(a.database.resolve().as_uri()+'?mode=ro',uri=True)as db:
  count=[0]
  def progress():count[0]+=100;return 0
  db.set_progress_handler(progress,100);db.execute(q,args).fetchall();db.set_progress_handler(None,0);plan=db.execute('EXPLAIN QUERY PLAN '+q,args).fetchall()
 work.append(dict(kind=kind,after=after,limit=limit,vm_steps_lower_bound=count[0],vm_steps_upper_bound=count[0]+99,query_plan=plan))
print(json.dumps(dict(schema=1,exit_status=0,label=a.label,seconds=str(elapsed),queries=rows,work=work,snapshot=snapshot,scope='Fresh-process full15-query batch, independent untimed SQLite VM-work pass at100-instruction granularity. Same explicit minimal relational fixture; no canonical package/proof loading, compiler-wide speed, application runtime or admission authority.')))
