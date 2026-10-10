"""Benchmark-only scalar-device counters; compiled algorithms and policy unchanged."""
import hashlib,json
from pathlib import Path

def sha(b):return hashlib.sha256(b).hexdigest()
def instrument(directory):
    directory=Path(directory);device=directory/'ink-device.mjs';host=directory/'ink-gpu.mjs'
    original=device.read_bytes();original_host=host.read_bytes();text=original.decode();h=original_host.decode()
    changes=[
      ('let device,initialising,gpuError;', 'let device,initialising,gpuError,lastCounters;'),
      ('    await prepare(f,args);\n    const resources=[];', '    await prepare(f,args);\n    const counters={dispatches:0,upload_bytes:0,readback_bytes:0};\n    const resources=[];'),
      ('device.queue.writeBuffer(b,0,v);return b;', 'counters.upload_bytes+=v.byteLength;device.queue.writeBuffer(b,0,v);return b;'),
      ('pass.dispatchWorkgroups(Math.max(1,groups));pass.end();', 'counters.dispatches++;pass.dispatchWorkgroups(Math.max(1,groups));pass.end();'),
      ('encoder.copyBufferToBuffer(data,0,readback,0,4);', 'counters.readback_bytes+=4;encoder.copyBufferToBuffer(data,0,readback,0,4);'),
      ("      return f.result==='u64'?BigInt(value):value;", "      lastCounters={...counters};return f.result==='u64'?BigInt(value):value;"),
      ('return {prepare,run:gpu,close()', 'return {prepare,run:gpu,benchmarkCounters:()=>lastCounters,close()'),
    ]
    for a,b in changes:
        if text.count(a)!=1:raise ValueError('scalar instrumentation anchor differs '+a)
        text=text.replace(a,b,1)
    a='return {value:outcome.result,backend:outcome.backend,reason:outcome.reason,profile:outcome.profile};'
    b="if(outcome.backend==='gpu')return {value:outcome.result,backend:outcome.backend,reason:outcome.reason,profile:outcome.profile,counters:adapter.benchmarkCounters()};\n    "+a
    if h.count(a)!=1:raise ValueError('host instrumentation anchor differs')
    h=h.replace(a,b,1)
    (directory/'ink-device.original.mjs').write_bytes(original);(directory/'ink-gpu.original.mjs').write_bytes(original_host)
    device.write_text(text);host.write_text(h)
    receipt=dict(schema=1,scope='Saved benchmark bundles only; counters observe actual buffer writes, dispatch invocations and readback bytes. No production source changes, shader/algorithm or policy changes.',device_original_sha256=sha(original),host_original_sha256=sha(original_host),device_instrumented_sha256=sha(device.read_bytes()),host_instrumented_sha256=sha(host.read_bytes()),helper_sha256=sha(Path(__file__).read_bytes()))
    (directory/'benchmark-instrumentation.json').write_text(json.dumps(receipt,indent=2)+'\n')
    return receipt
