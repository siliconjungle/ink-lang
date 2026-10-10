#!/usr/bin/env python3
"""Validate real native GPU + compiled CPU against the independent oracle."""
import json, os, subprocess, sys
from pathlib import Path
from fixtures import fixtures
binary=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
cases=fixtures();steps=[];expected=[]
for case in cases:
    for backend in ['cpu','gpu']:
        steps.append({'call':case['call'],'args':case['args'],'backend':backend})
        expected.append((case['expected'],'gpu' if backend=='gpu' and case['gpu_eligible'] else 'cpu'))
script=out/'script.json';script.write_text(json.dumps(steps))
result=subprocess.run([str(binary),'--script',str(script)],capture_output=True,text=True,check=True)
observations=json.loads(result.stdout)
assert len(observations)==len(expected)
for i,(observed,(value,backend)) in enumerate(zip(observations,expected)):
    assert observed['value']==value,(i,steps[i]['call'],observed,value)
    assert observed['backend']==backend,(i,observed)
env=os.environ.copy();env['INK_GPU_DISABLE']='1'
fallback=json.loads(subprocess.check_output([str(binary),'--script',str(script)],env=env,text=True))
assert all(x['backend']=='cpu' and x['value']==value for x,(value,_) in zip(fallback,expected))
invalid=[[[4294967296],1],[[-1],1],[[1],-1],[[1],True]]
for args in invalid:
    script.write_text(json.dumps(args))
    bad=subprocess.run([str(binary),'total',str(script),'--backend','gpu'],capture_output=True,text=True)
    assert bad.returncode!=0,('invalid argument accepted',args)
# A size rejection must allow a later small call to use the same GPU function.
script.write_text(json.dumps([{'call':'filtered','args':[[0]*1048577,0],'backend':'gpu'},{'call':'filtered','args':[[1,2,3],4],'backend':'gpu'}]))
limits=json.loads(subprocess.check_output([str(binary),'--script',str(script)],text=True))
assert limits[0]['backend']=='cpu' and limits[0]['value']==0 and 'budget' in limits[0]['reason']
assert limits[1]['backend']=='gpu' and limits[1]['value']==14
receipt={'invalid_arguments_rejected':len(invalid),'limit_fallback_and_retry':limits,'native_gpu_cpu_comparisons' :len(observations),'no_gpu_fallback_comparisons':len(fallback),'status':'passed'}
(out/'validation.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
