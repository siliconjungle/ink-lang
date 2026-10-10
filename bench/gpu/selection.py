#!/usr/bin/env python3
"""Record native adaptive selection, including cached/rechecked decisions."""
import json, subprocess, sys
from pathlib import Path
binary=Path(sys.argv[1]).resolve();out=Path(sys.argv[2]);out.mkdir(parents=True,exist_ok=True)
values=[(i*1664525+1013904223)&0xffffffff for i in range(1048576)]
steps=[{'call':'total','args':[[1,2,3,4],3]}]*34
steps += [{'call':'heavy','args':[values],'backend':'cpu'},{'call':'heavy','args':[values]},{'call':'heavy','args':[values]}]
script=out/'selection-script.json';script.write_text(json.dumps(steps))
observed=json.loads(subprocess.check_output([str(binary),'--script',str(script)],text=True))
assert all(x['value']==30 for x in observed[:34])
assert observed[31]['profile']['uses']==32 and observed[32]['profile']['uses']==1
assert observed[34]['value']==observed[35]['value']==observed[36]['value']
receipt={'status':'passed','small_selection':observed[0],'small_rechecked':observed[32],'large_reference':observed[34],'large_selection':observed[35],'large_cached':observed[36]}
(out/'native-selection.json').write_text(json.dumps(receipt,indent=2));print(json.dumps(receipt))
