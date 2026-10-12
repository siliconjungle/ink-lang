"""Stop only this benchmark child if a validated call exceeds 30 seconds."""
import json
import subprocess
import sys
import time
from pathlib import Path

root=Path(__file__).resolve().parents[2]
bundle=sys.argv[2] if len(sys.argv)>2 else 'ink'
child=subprocess.Popen(['node',str(Path(__file__).with_suffix('.mjs')),bundle],cwd=root,
                       stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
ready=child.stdout.readline()
assert json.loads(ready)['status']=='ready',ready
start=time.monotonic()
try:
    output,error=child.communicate(timeout=30)
    assert child.returncode==0,error
    result=json.loads(output)
except subprocess.TimeoutExpired:
    child.kill()
    output,error=child.communicate()
    result={'status':'validation-timeout','case':'rows-16384-sparse','bundle':bundle,
            'deadline_seconds':30,'elapsed_seconds':time.monotonic()-start,
            'scope':'first complete-state Wasm logical call after module instantiation',
            'correctness':'no completed reply; excluded from warm timing claims',
            'stderr':error,'partial_stdout':output}
Path(sys.argv[1]).write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps(result))
