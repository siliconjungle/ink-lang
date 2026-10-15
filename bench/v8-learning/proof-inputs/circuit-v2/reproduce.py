"""Reauthor this review slice with the normal distribution CLI and pinned SAT dependency."""
import argparse,json,subprocess,sys
from pathlib import Path
root=Path(__file__).resolve().parents[4]
p=argparse.ArgumentParser(description=__doc__);p.add_argument('--compiler',type=Path,default=root/'target/debug/ink');p.add_argument('--output-store',type=Path,required=True);p.add_argument('--data',type=Path,required=True);a=p.parse_args()
rows=json.loads(Path(__file__).with_name('goals.json').read_text())
command=[sys.executable,'-m','producers.author_word_identities','--family','v8','--library','--compiler',str(a.compiler),'--output-store',str(a.output_store),'--data',str(a.data),'--seconds','15','--semantics','fixed-words-v2','--encoding','shared-v2']
for row in rows:command += ['--case',row['name']]
subprocess.run(command,cwd=root,check=True)
