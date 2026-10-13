from pathlib import Path
import json,subprocess
r=Path(__file__).resolve().parents[2];b=r/'build/numeric-text-primitives';g=b/'gpu/native';work=b/'backend-bench';(work/'src').mkdir(parents=True,exist_ok=True)
source=(g/'src/main.rs').read_text().split('include!("state-cli.rs");')[0]
import re
source=re.sub(r'#\[path="([^"]+)"\]',lambda m:'#[path='+json.dumps(str((g/'src'/m.group(1)).resolve()))+']',source)
(work/'src/main.rs').write_text(source+(r/'bench/numeric-text-primitives/backend-bench.rs').read_text())
build=(g/'build.rs').read_text();build=re.sub(r'\.file\("([^"]+)"\)',lambda m:'.file('+json.dumps(str((g/m.group(1)).resolve()))+')',build);(work/'build.rs').write_text(build)
cargo=(g/'Cargo.toml').read_text().replace('name="ink-module-program"','name="ink-numeric-bench"').replace('path="../cpu"','path='+json.dumps(str(b/'rust')));(work/'Cargo.toml').write_text(cargo)
rows=[]
for n in [16,512,4096]:
 vals=[((i%101)-50)/16 for i in range(n)];words=[((i*1664525+1013904223) <<16)&((1<<64)-1)for i in range(n)]
 rows.extend([dict(name='float_ops',size=n,args=[[[x,vals[(i*17+1)%n]]for i,x in enumerate(vals)]]),dict(name='word_stats',size=n,args=[words]),dict(name='from_wide',size=n,args=[words])])
(r/'reports/numeric-text-primitives-2026-10-13/backend-inputs.json').write_text(json.dumps(rows,indent=2)+'\n')
subprocess.run(['cargo','build','--release','--offline','--manifest-path',str(work/'Cargo.toml')],check=True)
with (r/'reports/numeric-text-primitives-2026-10-13/native-gpu.ndjson').open('wb')as log:
 subprocess.run([str(work/'target/release/ink-numeric-bench'),str(r/'reports/numeric-text-primitives-2026-10-13/backend-inputs.json')],stdout=log,check=True)
