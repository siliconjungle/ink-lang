#!/usr/bin/env python3
"""Evaluate the implemented state runtime, with no cross-language speed claims."""
import json,random,statistics,subprocess,time
from pathlib import Path
root=Path(__file__).resolve().parents[1]
out=root/'reports/state-runtime-phase2'
out.mkdir(parents=True,exist_ok=True)
subprocess.run(['python3','dev.py','build','--release','--bin','state_bench'],cwd=root,check=True)
data=[];randomizer=random.Random(1937)
for n in [64,1024,8192]:
    for qpu in [0,1,10]:
        for repeat in range(5):
            modes=['scan','maintained'];randomizer.shuffle(modes)
            for mode in modes:
                result=subprocess.run([str(root/'target/release/state_bench'),mode,str(n),'100',str(qpu)],cwd=root,check=True,capture_output=True,text=True)
                row=json.loads(result.stdout);row['repeat']=repeat;data.append(row)
        group=[r for r in data if r['rows']==n and r['queries_per_update']==qpu]
        assert len({(r['checksum'],r['final_total'],r['events'],r['snapshot_bytes']) for r in group})==1
        med={m:statistics.median(r['seconds'] for r in group if r['mode']==m) for m in modes}
        print(f'rows={n} queries/update={qpu}: scan {med["scan"]:.6f}s, maintained {med["maintained"]:.6f}s, ratio {med["scan"]/med["maintained"]:.2f}x',flush=True)
        (out/'samples.json').write_text(json.dumps(data,indent=2))
lines=['# Stateful runtime milestone measurements','','The complete inventory application now executes in the Rust reference runtime. A checked maintenance package selects incremental exact totals. This report measures that implementation against its recomputing mode. **Stateful native code generation and the corresponding C/C++/Rust comparison are still pending.** These speed ratios must not be presented as a lead over optimised native implementations.','','Every case performs 100 committed updates. Input construction and initial cache installation are outside the timed loop; installation is separately reported. Query results are checked during timing in both modes. Checkpoints and restoration are validated after each trial. Five samples per mode, with randomised mode order.','','| Rows | Queries per update | Scan time ms | Maintained time ms | Scan divided by maintained | Cache install ms |','| ---: | ---: | ---: | ---: | ---: | ---: |']
for n in [64,1024,8192]:
    for qpu in [0,1,10]:
        group=[r for r in data if r['rows']==n and r['queries_per_update']==qpu]
        median=lambda field,mode:statistics.median(r[field] for r in group if r['mode']==mode)
        a=median('seconds','scan');b=median('seconds','maintained');install=median('installation_seconds','maintained')
        lines.append(f'| {n} | {qpu} | {a*1000:.3f} | {b*1000:.3f} | {a/b:.2f}× | {install*1000:.3f} |')
lines+=['','The update-only cases expose maintenance overhead. The query cases demonstrate the expected change from repeated table traversal to a maintained result. A production selector must account for update/query balance, initial construction and migration costs.','','Correctness tests separately compare 2,000 mixed operations between the two implementations, including inserts, replacements, deletes, nested failures, tentative queries, filtered sums, counts, checkpoint restoration and implementation switching. They compare results, events, versions and logical snapshot bytes.','','The certificate checker validates exact-integer arithmetic premises for a fixed finite-map induction schema. The Rust checker, application of the schema to supported row-local pipelines, runtime and storage encoding remain trusted. This is not the general dependent-type proof kernel or end-to-end machine-code verification.','','This milestone includes an in-memory transactional outbox and portable reference JSON snapshots. It does not yet include a durable write-ahead log or crash-safe storage adapter.','','[Raw samples](samples.json) · [Implementation status](../../STATUS.md)']
(out/'REPORT.md').write_text('\n'.join(lines)+'\n')
