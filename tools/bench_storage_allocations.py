#!/usr/bin/env python3
"""Measure allocation requests separately from uninstrumented runtime timings."""
import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];BUILD=ROOT/'build/storage-bulk-bench';OUT=ROOT/'reports/storage-bulk-incremental'
def main():
    rows=[];binaries={}
    for group,labels in [('table',['direct','packed-2','packed-4','indexed-4-hot-1023']),('boolean',['boolean-direct','any-delta','all-delta'])]:
        for label in labels:
            project=BUILD/label/'rust-wasm';runner=project/'src/bin/storage_allocations.rs';runner.write_bytes((ROOT/'bench/storage-bulk-allocations.rs.txt').read_bytes())
            subprocess.run(['cargo','build','--offline','--release','--manifest-path',str(project/'Cargo.toml'),'--target-dir',str(BUILD/'allocation-target'),'--bin','storage_allocations'],check=True,capture_output=True)
            binary=BUILD/'allocation-target/release/storage_allocations';binaries[label]=hashlib.sha256(binary.read_bytes()).hexdigest()
            r=subprocess.run([str(binary),group],check=True,capture_output=True,text=True)
            for line in r.stdout.splitlines():
                row=json.loads(line);samples=row.pop('samples_ns');row['allocation_and_reallocation_requests']=[x[0]/row['iterations'] for x in samples];row['requested_bytes']=[x[1]/row['iterations'] for x in samples];rows.append(dict(row,label=label))
    (OUT/'allocations.json').write_text(json.dumps(dict(scope='Separate instrumented release builds, complete public calls: allocation/reallocation requests and requested bytes; not live memory, retained capacity or timing',binary_sha256=binaries,rows=rows),indent=2)+'\n')
    print(json.dumps(dict(cases=len(rows))))
if __name__=='__main__':main()
