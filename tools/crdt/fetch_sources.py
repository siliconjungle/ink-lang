#!/usr/bin/env python3
"""Read-only, pinned upstream and complete public Hunchroom proof harvest."""
import argparse, concurrent.futures, hashlib, json, ssl, subprocess, time, urllib.request
from pathlib import Path

REPOS = {
    'diamond-types': 'josephg/diamond-types',
    'eg-walker-reference': 'josephg/eg-walker-reference',
    'egwalker-paper': 'josephg/egwalker-paper',
    'reference-crdts': 'josephg/reference-crdts',
    'yjs': 'yjs/yjs',
    'automerge': 'automerge/automerge',
    'loro': 'loro-dev/loro',
    'fugue': 'mweidner037/fugue',
}

def get(path, raw=False):
    for attempt in range(9):
        try:
            # Node's normal HTTPS client matches the site's public API client
            # contract; the system Python urllib client receives HTTP 403.
            client="const r=await fetch(process.argv[1],{signal:AbortSignal.timeout(60000)});if(!r.ok)throw Error(r.status);process.stdout.write(Buffer.from(await r.arrayBuffer()));"
            data=subprocess.check_output(['node','--input-type=module','-e',client,
                                          'https://hunchroom.com/api/v1'+path],stderr=subprocess.PIPE)
            return data if raw else json.loads(data)
        except Exception:
            if attempt == 8: raise
            time.sleep(min(2 ** attempt, 30))

def pages(path, key):
    out=[]; cursor=None
    while True:
        data=get(path+('&' if '?' in path else '?')+'before='+str(cursor) if cursor else path)
        out.extend(data[key]); cursor=data.get('next_before')
        if not cursor: return out

def harvest(root):
    root.mkdir(parents=True, exist_ok=True)
    lists={name:pages(path,key) for name,path,key in [
        ('problems','/problems?view=new','problems'),('modules','/modules','modules'),
        ('events','/progress','events'),('links','/research/links','links')]}
    print('Public inventory', {k:len(v) for k,v in lists.items()},flush=True)
    def detail(p):
        dst=root/'problems'/f"{p['id']}.json";dst.parent.mkdir(exist_ok=True)
        d=get('/problems/'+str(p['id'])); cursor=d.get('submissions_next_before')
        while cursor:
            more=get('/problems/'+str(p['id'])+'?submissions_before='+str(cursor))
            d['submissions'].extend(more['submissions']);cursor=more.get('submissions_next_before')
        dst.write_text(json.dumps(d,indent=2)+'\n');return d
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        details=[]
        for d in pool.map(detail,lists['problems']):
            details.append(d)
            if len(details)%50==0:print('Problem details',len(details),flush=True)
    submissions=[s for d in details for s in d.get('submissions',[])]
    def proof(s):
        dst=root/'proofs'/f"{s['id']}.lean";dst.parent.mkdir(exist_ok=True)
        data=get('/submissions/'+str(s['id'])+'/proof',True);dst.write_bytes(data)
        return dict(id=s['id'],problem_id=s.get('problem_id'),status=s.get('status'),
                    sha256=hashlib.sha256(data).hexdigest(),bytes=len(data))
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        proofs=[]
        for row in pool.map(proof,submissions):
            proofs.append(row)
            if len(proofs)%50==0:print('Proof sources',len(proofs),flush=True)
    # Module detail includes exact imports, hashes and source download routes.
    def module(m):
        d=get('/modules/'+str(m['id'])); dst=root/'modules'/f"{m['id']}.json"
        dst.parent.mkdir(exist_ok=True);dst.write_text(json.dumps(d,indent=2)+'\n');return d
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        modules=list(pool.map(module,lists['modules']))
    report=dict(fetched_at=time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime()),
                **lists,proofs=proofs)
    (root/'inventory.json').write_text(json.dumps(report,indent=2)+'\n')
    print('Harvest complete',len(details),'problems',len(proofs),'proofs',len(modules),'modules',flush=True)

def repos(root):
    root.mkdir(parents=True, exist_ok=True)
    def clone(pair):
        name,repo=pair; dst=root/name
        if not dst.exists():
            subprocess.run(['git','clone','--depth=1','https://github.com/'+repo+'.git',str(dst)],check=True,capture_output=True)
        return name,dict(url='https://github.com/'+repo,revision=subprocess.check_output(['git','-C',str(dst),'rev-parse','HEAD'],text=True).strip())
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        result=dict(pool.map(clone,REPOS.items()))
    (root/'pins.json').write_text(json.dumps(result,indent=2)+'\n');print(json.dumps(result,indent=2),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('mode',choices=['repos','hunchroom']);p.add_argument('directory',type=Path)
    a=p.parse_args();(repos if a.mode=='repos' else harvest)(a.directory)
