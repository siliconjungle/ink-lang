"""Freeze inputs, build ordinary plans, and compare automatic delivery checkpoints.

No evaluation calls, expected results, forced plan or timing enter compilation.
Databases are isolated below build/. Reproduction uses the recorded original
knowledge snapshot, not whatever happens to be the latest catalogue.
"""
import argparse
import hashlib
import json
import os
from pathlib import Path
import random
import shutil
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT/'reports/automatic-delivery-2026-10-13'
SCRATCH = ROOT/'build/automatic-delivery'


def sha(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def save(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, allow_nan=False)+'\n')


def read(path):
    return json.loads(path.read_bytes())


def frozen():
    protocol=read(OUT/'protocol.json')
    for key,filename in [('corpus_sha256','corpus.json'),('fixtures_sha256','fixtures.json')]:
        assert sha(OUT/filename)==protocol[key], filename
    for row in read(OUT/'corpus.json'):
        assert sha(ROOT/row['source'])==row['sha256'], row['source']
    for row in read(OUT/'fixtures.json'):
        assert sha(ROOT/row['path'])==row['sha256'], row['path']
    return protocol


def inputs(name,n,distribution):
    rng=random.Random(0x152931+n+len(name)*1000+['none','sparse','mixed','all'].index(distribution))
    active=lambda i: distribution=='all' or distribution=='mixed' and i%2==0 or distribution=='sparse' and i==n-1
    values=[rng.randrange(0,2**32) for _ in range(n)]
    if name in {'telemetry-total','alert-query','plain-projection'}:
        rows=[dict(value=values[i],valid=active(i),channel=rng.randrange(256)) for i in range(n)]
        return [rows,97] if name=='alert-query' else [rows]
    if name=='ordered-mask':
        return [[(values[i] if active(i) else values[i]%97) for i in range(n)],97]
    if name in {'visible-count','row-update'}:
        rows=[dict(id=values[i],opacity=rng.randrange(256),visible=active(i),label=f'layer-{i}-λ雪😀') for i in range(n)]
        return [rows,97 if name=='visible-count' else 23]
    if name=='unicode-query':
        return [['λ雪' if active(i) else rng.choice(['','😀','e\u0301','\u0000','plain']) for i in range(n)],'λ雪']
    if name=='ordered-energy':
        return [[-0.0 if i%31==0 else (rng.randrange(-2048,2048)/8 if active(i) else rng.randrange(-8,8)/8) for i in range(n)]]
    raise ValueError(name)


def freeze(args):
    if (OUT/'protocol.json').exists():
        raise ValueError('report already frozen; use a fresh checkout to create another epoch')
    corpus=[];fixtures=[]
    for source in sorted((ROOT/'bench/automatic-delivery/corpus').glob('*.ink')):
        name=source.stem
        core=SCRATCH/'typecheck'/f'{name}.json';core.parent.mkdir(parents=True,exist_ok=True)
        subprocess.run([str(args.compiler),'emit-core',str(source),'-o',str(core)],check=True,capture_output=True)
        corpus.append(dict(name=name,source=str(source.relative_to(ROOT)),sha256=sha(source),
                           scope='Fresh partial typed kernel; handwritten source, synthetic data; not a whole application or an unbiased software population',
                           control=name in {'plain-projection','row-update'}))
        for n in [0,31,511,8191]:
            for distribution in ['none','sparse','mixed','all']:
                path=OUT/'inputs'/name/f'{n}-{distribution}.json';save(path,inputs(name,n,distribution))
                fixtures.append(dict(program=name,size=n,distribution=distribution,path=str(path.relative_to(ROOT)),sha256=sha(path)))
    save(OUT/'corpus.json',corpus);save(OUT/'fixtures.json',fixtures)
    sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
    from ink_knowledge import Store,identity
    store=Store(args.knowledge,args.snapshot)
    names=read(store.data/'names.json')
    growth={n.split('/')[-1]:i for n,i in names.items() if n.startswith('knowledge-growth-e1/')}
    assert set(growth)=={'any-absorption','every-absorption','left-any','left-every','controlled-filter','controlled-map'}
    snapshot_path=OUT/'original-snapshot.json';save(snapshot_path,store.snapshot)
    save(OUT/'protocol.json',dict(schema=1,epoch='automatic-delivery-audit',created_unix=time.time(),
        corpus_sha256=sha(OUT/'corpus.json'),fixtures_sha256=sha(OUT/'fixtures.json'),
        original_snapshot=store.snapshot_id,original_knowledge_revision=subprocess.check_output(['git','-C',str(args.knowledge),'rev-parse','HEAD'],text=True).strip(),
        compiler_sha256=sha(args.compiler),growth_templates=growth,
        design='Sources typechecked and inputs frozen before automatic measurements. Previous law-family knowledge informed human source choices; this is an independent replication corpus, not an unbiased generalisation estimate.',
        selection='Ordinary balanced compilation. Evaluation sources are compiler inputs; evaluation calls/results/timings are never selection inputs. No forced selection or manual workload supplied.',
        evaluation='Eight partial pure kernels including two controls; 128 total cells, 96 nonempty cells. Fixed equal program/size/distribution weighting. Empty/duplicate cases retained outside the headline.',
        attribution='Before/after machinery at the complete catalogue; within after machinery, remove/add the same six genuine E1 template objects (two reusable schemes). Other canonical knowledge is held fixed.',
        timing='Eleven randomised interleaved rounds of complete trusted JavaScript calls and full output consumption. Separate process-high-water memory observations are coarse diagnostics, not allocation counts.',
        policy='Report every regression. Do not tune planner/probe policy or laws using these evaluation outcomes. Add new laws in another epoch with separate validation data.'))
    print('Frozen eight programs and 128 evaluation cells',flush=True)


def databases(args):
    protocol=frozen();sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
    from ink_knowledge import Store,canonical,identity
    original=Store(args.knowledge,OUT/'original-snapshot.json');assert original.snapshot_id==protocol['original_snapshot']
    members=original.members();growth=set(protocol['growth_templates'].values())
    absorption={i for n,i in protocol['growth_templates'].items() if n not in {'controlled-map','controlled-filter'}}
    names=read(original.data/'names.json');rows=[]
    for label,added in [('base',set()),('absorption',absorption),('complete',growth)]:
        dest=SCRATCH/'databases'/label
        if (dest/'store/snapshot.json').exists():
            stored=Store(dest, dest/'input-snapshot.json')
        else:
            dest.mkdir(parents=True,exist_ok=True)
            # Link immutable canonical bytes, never another experiment's index,
            # observations, planning cache, or mutable publication pointers.
            for folder in ['objects','trees','snapshots']:
                shutil.copytree(original.data/folder,dest/'store'/folder,copy_function=os.link)
            ids=set(members)-growth|added
            for ident in ids:
                if not set(original._read_object(ident)['dependencies'])<=ids:
                    raise ValueError('checkpoint omits a required proof dependency')
            stored=Store._publish_ids(dest,ids,{n:i for n,i in names.items() if i in ids},64)
            (dest/'input-snapshot.json').write_bytes(canonical(stored.snapshot)+b'\n')
            stored.ensure_index()
        rows.append(dict(label=label,snapshot=stored.snapshot_id,entries=len(stored.members()),
                         added_schemes=0 if label=='base' else 1 if label=='absorption' else 2,
                         added_templates=len(added)))
    save(OUT/'checkpoints.json',rows);print(rows,flush=True)


def build(args):
    protocol=frozen();assert sha(args.compiler)==protocol['compiler_sha256'], 'compiler changed between checkpoints'
    sys.path[:0]=[str(ROOT/'knowledge'),str(ROOT/'planner')]
    env=dict(os.environ,INK_DISTRIBUTION=str(args.code.resolve()),PYTHONPATH=os.pathsep.join([str(args.code/'knowledge'),str(args.code/'planner')]))
    points=read(OUT/'checkpoints.json')
    if args.lane=='before':points=[r for r in points if r['label']=='complete']
    machinery={}
    pins=read(args.code/'.pins.json') if (args.code/'.pins.json').exists() else {}
    for package in ['planner','knowledge']:
        machinery[package]=pins.get(package) or subprocess.check_output(['git','-C',str(args.code/package),'rev-parse','HEAD'],text=True).strip()
        folders=['ink_knowledge','producers','libraries'] if package=='knowledge' else ['ink_planner']
        machinery[package+'_files']={str(p.relative_to(args.code/package)):sha(p) for folder in folders for p in (args.code/package/folder).rglob('*') if p.is_file() and p.suffix in {'.py','.json','.mjs','.txt'} }
    manifest=OUT/(args.lane+'-machinery.json')
    if manifest.exists():assert read(manifest)==machinery,'machinery changed within a lane'
    else:save(manifest,machinery)
    for point in points:
        database=SCRATCH/'databases'/point['label']
        for program in read(OUT/'corpus.json'):
            if args.names and program['name'] not in args.names:continue
            directory=OUT/'compiled'/args.lane/point['label']/program['name'];directory.mkdir(parents=True,exist_ok=True)
            if (directory/'process.json').exists():continue
            command=[sys.executable,'-m','ink_planner.compiled_planning','--compiler',str(args.compiler.resolve()),'--source',str(ROOT/program['source']),
                     '--knowledge-root',str(database.resolve()),'--snapshot',str((database/'input-snapshot.json').resolve()),
                     '--target','javascript','--emit',str((directory/'output.mjs').resolve()),'-o',str((directory/'plan.json').resolve())]
            started=time.monotonic()
            with (directory/'stdout.txt').open('wb') as stdout,(directory/'stderr.txt').open('wb') as stderr:
                child=subprocess.Popen(command,cwd=ROOT,env=env,stdout=stdout,stderr=stderr)
                _,status,usage=os.wait4(child.pid,0);code=os.waitstatus_to_exitcode(status)
            process=dict(command=command,status=code,seconds=time.monotonic()-started,
                         process_peak_rss_bytes=usage.ru_maxrss*(1 if sys.platform=='darwin' else 1024),
                         compiler_sha256=sha(args.compiler),checkpoint=point,program=program['name'],lane=args.lane)
            if code==0:
                process['artifact_sha256']=sha(directory/'output.mjs')
                receipt=read(directory/'plan.json.receipt.json')
                from ink_planner.planning_diagnostics import diagnose
                save(directory/'diagnostics.json',diagnose(receipt))
            save(directory/'process.json',process)
            print(args.lane,point['label'],program['name'],code,round(process['seconds'],3),flush=True)
            if code:raise ValueError((directory/'stderr.txt').read_text()[-3000:])
    frozen()


def reference(args):
    frozen()
    for fixture in read(OUT/'fixtures.json'):
        path=OUT/'reference'/fixture['program']/f"{fixture['size']}-{fixture['distribution']}.json"
        if path.exists():continue
        source=ROOT/'bench/automatic-delivery/corpus'/(fixture['program']+'.ink')
        result=subprocess.run([str(args.compiler),'run',str(source),'run',str(ROOT/fixture['path'])],capture_output=True,text=True,timeout=120)
        if result.returncode:raise ValueError(result.stderr[-3000:])
        save(path,json.loads(result.stdout))
    print('Independent reference results complete',flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('mode',choices=['freeze','databases','build','reference'])
    parser.add_argument('--compiler',type=Path,default=ROOT/'target/release/ink')
    parser.add_argument('--knowledge',type=Path,default=ROOT/'knowledge')
    parser.add_argument('--snapshot',type=Path)
    parser.add_argument('--code',type=Path,default=ROOT)
    parser.add_argument('--lane',choices=['before','after'],default='before')
    parser.add_argument('--names',nargs='*')
    args=parser.parse_args()
    globals()[args.mode](args)


if __name__=='__main__':main()
