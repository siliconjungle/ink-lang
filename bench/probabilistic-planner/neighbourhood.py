#!/usr/bin/env python3
"""HNSW scaling probe on synthetic vectors; actual Ink planning is in measure.py."""
import argparse,hashlib,json,os,statistics,tempfile,time
from pathlib import Path
for name in ('OPENBLAS_NUM_THREADS','VECLIB_MAXIMUM_THREADS','OMP_NUM_THREADS'):os.environ[name]='1'
import hnswlib
import numpy as np
ROOT=Path(__file__).resolve().parents[2]
p=argparse.ArgumentParser();p.add_argument('--large',action='store_true');args=p.parse_args()
rng=np.random.default_rng(173);results=[]
for n in ((100000,) if args.large else (2048,8192)):
    rows=rng.standard_normal((n,64)).astype(np.float32);rows/=np.linalg.norm(rows,axis=1)[:,None]
    queries=rng.standard_normal((128,64)).astype(np.float32);queries/=np.linalg.norm(queries,axis=1)[:,None]
    expected=[set(np.argpartition(np.sum((rows-q)**2,axis=1),15)[:16].tolist()) for q in queries]
    start=time.perf_counter_ns();index=hnswlib.Index(space='l2',dim=64)
    index.init_index(max_elements=n,M=16,ef_construction=100,random_seed=173)
    index.add_items(rows,np.arange(n),num_threads=1);index.set_ef(64);index.set_num_threads(1)
    setup=time.perf_counter_ns()-start
    with tempfile.TemporaryDirectory() as tmp:
        path=Path(tmp)/'index';index.save_index(str(path));index_bytes=path.stat().st_size
    for round in range(7):
        labels=['exact','hnsw-64','hnsw-256','hnsw-1024'] if args.large else ['exact','hnsw']
        for label in labels if round%2 else reversed(labels):
            if label!='exact':index.set_ef(int(label.split('-')[1]) if args.large else 64)
            start=time.perf_counter_ns()
            if label=='exact':actual=[set(np.argpartition(np.sum((rows-q)**2,axis=1),15)[:16].tolist()) for q in queries]
            else:actual=[set(index.knn_query(q,k=16,num_threads=1)[0][0].tolist()) for q in queries]
            elapsed=time.perf_counter_ns()-start
            recall=sum(len(a&e)/16 for a,e in zip(actual,expected))/len(queries)
            results.append(dict(n=n,label=label,round=round,queries=len(queries),ns=elapsed/len(queries),
                recall_at_16=recall,setup_ns=setup if label!='exact' else 0,index_bytes=index_bytes,
                vectors_sha256=hashlib.sha256(rows.tobytes()).hexdigest(),queries_sha256=hashlib.sha256(queries.tobytes()).hexdigest()))
report=dict(schema=1,seed=173,dimensions=64,M=16,ef=[64,256,1024] if args.large else 64,ef_construction=100,hnswlib='0.8.0',numpy=np.__version__,
    samples=results,scope='synthetic independent unit vectors, single CPU thread; not semantic law embeddings or an Ink speed claim; exact scan includes top-k partition; graph setup separately charged')
(ROOT/('reports/probabilistic-planner-2026-10-12/neighbourhood-large.json' if args.large else 'reports/probabilistic-planner-2026-10-12/neighbourhood.json')).write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({str(n):{label:dict(us=statistics.median([r['ns'] for r in results if r['n']==n and r['label']==label])/1000,
    recall=next(r['recall_at_16'] for r in results if r['n']==n and r['label']==label)) for label in sorted({r['label'] for r in results if r['n']==n})} for n in sorted({r['n'] for r in results})},indent=2))
