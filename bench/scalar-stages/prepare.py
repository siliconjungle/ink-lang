#!/usr/bin/env python3
"""Prepare a fixed benchmark oracle from the original evaluator."""
import argparse,json,subprocess,tempfile
from pathlib import Path
parser=argparse.ArgumentParser();parser.add_argument('--ink',required=True,type=Path);parser.add_argument('--artifact',required=True,type=Path);parser.add_argument('-o',required=True,type=Path);args=parser.parse_args()
source=args.artifact/'compiled.core.json';core=json.loads(source.read_bytes());code=core['program']['frozen']['Structure'][0][1]
frames=[]
with tempfile.TemporaryDirectory(prefix='ink-scalar-oracle-') as folder:
 path=Path(folder)/'args.json'
 for index,(x,scale,bias) in enumerate([(0.25,0.875,0.01),(-0.5,0.95,0.02),(0.75,1.0,0.01),(-0.9,0.875,0.02)]):
  values=[{'scale':scale,'bias':bias},x];expected={}
  for count in [64,512]:
   path.write_text(json.dumps([code[:count],*values]));result=subprocess.run([str(args.ink.resolve()),'run',str(source),'evaluate',str(path),'--core'],capture_output=True,text=True,check=True);expected[str(count)]=json.loads(result.stdout)
  frames.append(dict(args=values,expected=expected))
args.o.parent.mkdir(parents=True,exist_ok=True);args.o.write_text(json.dumps(dict(schema=1,frames=frames),indent=2)+'\n')
