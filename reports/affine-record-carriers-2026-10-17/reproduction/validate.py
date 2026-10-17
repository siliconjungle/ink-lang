import hashlib,json,os,re,subprocess,time
from pathlib import Path
r=Path(__file__).resolve().parents[2];p=r/'lowerings/js';out=r/'build/owned-carriers/final-validation';out.mkdir(exist_ok=False)
sha=lambda data:hashlib.sha256(data).hexdigest()
files=[f for f in subprocess.check_output(['git','ls-files'],cwd=p,text=True).splitlines()if f in ['AGENTS.md','Cargo.toml','Cargo.lock']or f.startswith(('src/','tests/','examples/'))]
source={}
for f in files:
    data=(p/f).read_bytes();assert subprocess.check_output(['git','show',':'+f],cwd=p)==data;source[f]=sha(data)
    q=out/'source'/f;q.parent.mkdir(parents=True,exist_ok=True);q.write_bytes(data)
receipt=dict(status='running',source=source,index_tree=subprocess.check_output(['git','write-tree'],cwd=p,text=True).strip(),phases=[],rustc=subprocess.check_output(['rustc','--version'],text=True).strip(),node=subprocess.check_output(['node','--version'],text=True).strip(),rust_min_stack=os.environ.get('RUST_MIN_STACK'))
assert not receipt['rust_min_stack'],'Use the ordinary test harness stack'
def save():(out/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
def check():assert all(sha((p/f).read_bytes())==s for f,s in source.items()),'source changed during validation'
save()
for name,command in [('suite',['cargo','test','--locked']),('examples',['cargo','build','--locked','--examples']),('fetch',['cargo','fetch','--locked'])]:
    check();start=time.monotonic()
    with (out/(name+'.log')).open('wb')as log:result=subprocess.run(command,cwd=p,stdout=log,stderr=subprocess.STDOUT)
    phase=dict(name=name,command=command,exit_code=result.returncode,seconds=time.monotonic()-start,log_sha256=sha((out/(name+'.log')).read_bytes()));receipt['phases'].append(phase);save();print(json.dumps(phase),flush=True)
    if result.returncode:receipt['status']='failed';save();raise SystemExit(result.returncode)
check();log=(out/'suite.log').read_text();counts=re.findall(r'test result: ok\. (\d+) passed; (\d+) failed;',log)
assert len(counts)==48 and sum(int(a)for a,b in counts)==61 and all(b=='0'for a,b in counts)
receipt.update(status='passed',tests=61,targets=48,source_unchanged=True);save()
