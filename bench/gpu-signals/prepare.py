#!/usr/bin/env python3
"""Build source-pinned Ink GPU bundle and independent integer corner fixtures."""
import argparse,json,subprocess,os
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--zig',default=os.environ.get('INK_TEST_ZIG','zig'));a=p.parse_args()
subprocess.run(['cargo','build','--locked','--bin','ink'],cwd=ROOT,check=True)
subprocess.run([str(ROOT / 'target/debug/ink'), 'build', str(ROOT / 'bench/gpu-signals/compute.ink'), '--target', 'webgpu', '-o', str(ROOT / 'build/gpu-signals/ink')],cwd=ROOT,check=True)
fixtures=[]
for kind in ['affine','cheap-sum','heavy512','feedback32']:
 for n in [0,1,63,64,65,257]:
  xs=[([0,1,4294967295,2147483648][i%4]+i*29)&0xffffffff for i in range(n)]
  if kind=='feedback32':
   previous=xs
   for r in range(32):
    out=[]
    for k,x in enumerate(previous):
     v=(x+previous[(k+1)%n])&0xffffffff
     for i in range(64):v=(v*1664525+1013904223+i+(v%251)*v)&0xffffffff
     out.append(v)
    previous=out
   out=previous
  else:
   out=[]
   for v in xs:
    if kind in ['affine','cheap-sum']:v=(v*17+1)&0xffffffff
    else:
     for i in range(512):v=(v*1664525+1013904223+i+(v%251)*v)&0xffffffff
    out.append(v)
  fixtures.append(dict(kind=kind,input=xs,expected=sum(out)&0xffffffff if kind=='cheap-sum' else out))
(ROOT/'build/gpu-signals/corners.json').write_text(json.dumps(fixtures)+'\n')
