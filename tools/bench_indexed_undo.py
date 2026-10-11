"""Complete native handle/buffer ABI calls; no Ink evaluator in timed calls."""
import ctypes,hashlib,json,sys,time
from pathlib import Path
library,snapshot,label=map(str,sys.argv[1:]);lib=ctypes.CDLL(library)
for name in ['lang_init','lang_buffer_alloc','lang_buffer_len','lang_buffer_free','lang_invoke','lang_restore','lang_checkpoint','lang_state_drop','lang_error']:
    getattr(lib,name).restype=ctypes.c_uint32
lib.lang_buffer_ptr.restype=ctypes.c_size_t
lib.lang_buffer_ptr.argtypes=[ctypes.c_uint32]
lib.lang_invoke.argtypes=[ctypes.c_uint32,ctypes.c_uint32]
lib.lang_restore.argtypes=[ctypes.c_uint32]
def put(data):
    h=lib.lang_buffer_alloc(len(data));assert h
    ctypes.memmove(lib.lang_buffer_ptr(h),data,len(data));return h
def get(h):
    assert h, 'native call failed'
    data=ctypes.string_at(lib.lang_buffer_ptr(h),lib.lang_buffer_len(h));assert lib.lang_buffer_free(h);return data
def restore(data):
    h=put(data)
    try: state=lib.lang_restore(h);assert state;return state
    finally:lib.lang_buffer_free(h)
def invoke(state,data):
    request=put(data)
    try:return json.loads(get(lib.lang_invoke(state,request)))
    finally:lib.lang_buffer_free(request)
initial=Path(snapshot).read_bytes();measurements=[]
for mode in ['query','write']:
    script=[json.dumps(dict(call='get' if mode=='query' else 'put',args=[i*17%4000]+([] if mode=='query' else [i])),separators=(',',':')).encode() for i in range(1000)]
    for round in range(9):
        state=restore(initial);start=time.perf_counter_ns();replies=[invoke(state,call) for call in script];ns=time.perf_counter_ns()-start
        final=get(lib.lang_checkpoint(state));assert lib.lang_state_drop(state)
        assert all('ok' in reply for reply in replies)
        measurements.append(dict(mode=mode,round=round,rows=4000,calls=1000,ns=str(ns),reply_sha256=hashlib.sha256(json.dumps(replies,sort_keys=True).encode()).hexdigest(),snapshot_sha256=hashlib.sha256(final).hexdigest()))
print(json.dumps(dict(schema=1,label=label,boundary='complete native handle/buffer ABI including JSON transport, reply parsing and buffer ownership; setup/restore/checkpoints excluded',measurements=measurements)))
