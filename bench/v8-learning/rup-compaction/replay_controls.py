"""Replay selected exact inputs; write only to an explicitly separate scratch path."""
import argparse,copy,gzip,json,subprocess
from pathlib import Path
from ink_knowledge import Store,canonical,semantic_entry,identity
from producers.rup_compaction import compact_certificate
p=argparse.ArgumentParser();p.add_argument('--inputs',type=Path,default=Path(__file__).resolve().parent);p.add_argument('--compiler',type=Path,required=True);p.add_argument('--scratch',type=Path,required=True);a=p.parse_args();a.scratch.mkdir(parents=True,exist_ok=True);out=[]
for case in sorted((a.inputs/'controls').iterdir()):
 law=json.loads(gzip.decompress((case/'baseline.law.json.gz').read_bytes()));problem=json.loads(gzip.decompress((case/'problem.json.gz').read_bytes()));expected=gzip.decompress((case/'compacted.law.json.gz').read_bytes());packed,stats=compact_certificate(problem,law['proof']['BitVector']['certificate'],60);candidate=copy.deepcopy(law);candidate['proof']['BitVector']['certificate']=packed;assert canonical(candidate)==expected
 for label,current in [('baseline',law),('compacted',candidate),('corrupted',copy.deepcopy(candidate))]:
  if label=='corrupted':current['proof']['BitVector']['certificate']['steps'][-1]['hints']=[]
  obj=semantic_entry(current);store=Store.publish(a.scratch/case.name/label,[obj]);bundle=a.scratch/case.name/(label+'.json');bundle.write_bytes(canonical(store.bundle([identity(obj)])));r=subprocess.run([a.compiler.resolve(),'knowledge-check',a.inputs/'core.json',bundle],capture_output=True,text=True,timeout=120);assert (r.returncode==0)==(label!='corrupted'),r.stderr
  out.append(dict(case=case.name,variant=label,status=r.returncode,identity=identity(obj)))
(a.scratch/'replay.json').write_text(json.dumps(dict(schema=1,rows=out),indent=2)+'\n')
(a.scratch/'terminal.json').write_text(json.dumps(dict(schema=1,exit_status=0,checked=len(out),scope='All expected baseline/packed admissions and corrupted rejections completed before this receipt.'),indent=2)+'\n')
