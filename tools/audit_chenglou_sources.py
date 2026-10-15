"""Inventory pinned reference files and map subsystems to Ink roadmap work.

Hash coverage is not a claim that semantic extraction or implementation is done.
The reference checkouts are read-only and must have no tracked modifications.
"""
import argparse
from collections import Counter
import hashlib
import json
import os
from pathlib import Path
import subprocess

PINS={
 'handwired':'09f23d276d3b9284cea4eec61ffd934950cc979e',
 'freerange':'4ee586f19f166377ac7c56f6ea4081cbd7ef2066',
 'pretext':'0a27bbe0f109c689b0a2af2fb1d2e659ddabf5b8',
}


def group(project,path):
    if project=='freerange':
        for prefix,label,stages in [
          ('src/domain/','numeric domains and value identity',[2,3]),
          ('src/engine/','control-flow inference and state joins',[2]),
          ('src/requirements/','backward requirements and summaries',[2]),
          ('src/lower/','supported-language boundary and explicit unknowns',[2]),
          ('src/ir/','stable IR identities and input obligations',[2]),
          ('src/report/','missing-premise diagnostics',[2]),
          ('src/typescript/','host-language integration',[1,2])]:
            if path.startswith(prefix):return label,stages
    if project=='handwired':
        for prefix,label,stages in [
          ('src/runtime/prefix-networks','associative parallel networks',[6]),
          ('src/runtime/numeric-ui-core','exact circuit construction and derivatives',[2,6,8]),
          ('src/runtime/cells','incremental dependencies and lifetimes',[4,7]),
          ('src/runtime/host-timing','measurement and scheduling',[7]),
          ('src/json-search/highlighter/','structured algorithms and compact tables',[4,5,6]),
          ('src/json-search/regex/','patterns as data and bounded automata',[4,6]),
          ('src/json-search/gpu/','resident storage and transfer boundaries',[5,7]),
          ('src/json-search/','bounded loops packing and search',[4,5,6,7]),
          ('src/learned-gallery/','frozen algorithms inside trainable computation',[8]),
          ('src/handwiredos/','UI computation and observation contracts',[4,5,7]),
          ('lab/trace-compiler/','source translation and numeric drift',[2,3,6]),
          ('lab/','research alternatives and negative experiments',[1,4,5,6,7,8])]:
            if path.startswith(prefix):return label,stages
    if project=='pretext':
        for prefix,label,stages in [
          ('src/measurement','external measurement cache and environment keys',[3,4]),
          ('src/prepare','prepared numeric storage and derived predicates',[4,6]),
          ('src/rich-inline','structured prepared data and streaming outputs',[4,5]),
          ('src/layout','requested observations and opaque prepared values',[4,5]),
          ('src/line-break.ts','numeric walks specialized by prepared facts',[3,5,6]),
          ('src/line-text','delayed text materialization and cursors',[5]),
          ('src/','segmentation engine models and data dependencies',[3,4,5]),
          ('harness/','independent browser oracles and adverse benchmarks',[1,3,7])]:
            if path.startswith(prefix):return label,stages
    if '/test' in path or '.test.' in path or path.startswith('tests/'):
        return 'validation and counterexamples',[1,7]
    if path.endswith('.md'):return 'documentation decisions limits and experiments',[1]
    if path.startswith(('pages/','demo/','video_exp_')):return 'application examples and validation workloads',[1,4,5,7]
    if path.startswith(('scripts/','.github/','.claude/')):return 'tooling reproducibility and validation',[1,7]
    return 'package resources and integration support',[1]


def inventory(project,root):
    def git(*args):return subprocess.check_output(['git','-C',str(root),*args])
    revision=git('rev-parse','HEAD').decode().strip()
    if revision!=PINS[project]:raise ValueError(project+' differs from the investigated revision')
    if git('status','--porcelain','--untracked-files=no').strip():raise ValueError(project+' has tracked changes')
    rows=[]
    for name in git('ls-files','-z').decode().split('\0'):
        if not name:continue
        path=root/name
        symlink=path.is_symlink()
        data=os.readlink(path).encode()if symlink else path.read_bytes()
        label,stages=group(project,name)
        rows.append(dict(path=name,kind='symlink'if symlink else'file',bytes=len(data),sha256=hashlib.sha256(data).hexdigest(),
            subsystem=label,roadmap_stages=stages,review='catalogued; semantic extraction and acceptance tracked separately'))
    if git('status','--porcelain','--untracked-files=no').strip():raise ValueError('Reference changed during inventory')
    return dict(project=project,revision=revision,license='MIT; preserve notices with source transfers',
        files=rows,subsystems=dict(sorted(Counter(r['subsystem']for r in rows).items())))


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    for name in PINS:parser.add_argument('--'+name,type=Path,required=True)
    parser.add_argument('-o',type=Path,required=True);args=parser.parse_args()
    result=dict(schema=1,scope='Complete tracked-file inventory at three pinned revisions; not a completed semantic audit or implementation',
        projects=[inventory(name,getattr(args,name).resolve())for name in PINS])
    args.o.parent.mkdir(parents=True,exist_ok=True);args.o.write_text(json.dumps(result,indent=2)+'\n')
    print(json.dumps({p['project']:len(p['files'])for p in result['projects']}))
