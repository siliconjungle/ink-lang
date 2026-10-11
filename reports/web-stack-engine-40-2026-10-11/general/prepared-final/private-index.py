#!/usr/bin/env python3
"""Disposable, non-authoritative index for the exact General40 snapshot.

Only this report-local root is mutated. Canonical objects/trees are read through
symlinks; proof checking still grants admission, never this SQLite cache.
"""
from pathlib import Path
import hashlib,json,shutil,sys
ROOT=Path(__file__).resolve().parents[2]
sys.path.insert(0,str(ROOT/'knowledge'))
from ink_knowledge import Store
REPORT=ROOT/'reports/web-stack-engine-40-2026-10-11/general'
SNAPSHOT=REPORT/'declaration/baseline-knowledge-snapshot.json'
CACHE=REPORT/'knowledge-index-cache'
EXPECTED='481b4d7311e50faf632d2fb8c0d4a197fb516754aa9ad38f4c98c228d8970b9a'
def sha(p):return hashlib.sha256(Path(p).read_bytes()).hexdigest()
def main():
 if sha(SNAPSHOT)!=EXPECTED:raise ValueError('frozen snapshot drift')
 if CACHE.exists():raise ValueError('preserve previous private index')
 canonical=ROOT/'knowledge';shared=canonical/'index.sqlite'
 shared_before=sha(shared)if shared.exists()else None
 data=CACHE/'store';data.mkdir(parents=True)
 shutil.copy2(SNAPSHOT,data/'snapshot.json');shutil.copy2(canonical/'store/names.json',data/'names.json')
 for kind in ['objects','trees']:(data/kind).symlink_to(canonical/'store'/kind,target_is_directory=True)
 store=Store(CACHE,SNAPSHOT);count=store.rebuild()
 shared_after=sha(shared)if shared.exists()else None
 if shared_after!=shared_before:raise ValueError('shared index changed during private rebuild')
 members=sorted(store.members())
 receipt=dict(status='prepared',scope='disposable untrusted derived index; ordinary semantic checker validates all selected proof bytes',root=str(CACHE),snapshot_file=str(SNAPSHOT),snapshot_file_sha256=sha(SNAPSHOT),snapshot_id=store.snapshot_id,snapshot_root=store.snapshot['root'],members=count,member_ids_sha256=hashlib.sha256(json.dumps(members,separators=(',',':')).encode()).hexdigest(),names_sha256=sha(data/'names.json'),private_index_sha256=sha(CACHE/'index.sqlite'),shared_index_before_sha256=shared_before,shared_index_after_sha256=shared_after,canonical_mutation=False,observations='not copied; fixed frozen operation-cost model only, no observation-driven fitting in preparation',immutable_links={kind:str((data/kind).resolve())for kind in ['objects','trees']})
 (CACHE/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n');print(json.dumps(receipt))
if __name__=='__main__':main()
