Run after the final 91 source requests and CPU Wasm/packed part Wasm files have been generated:

```
python3 bench/composed-parity40-browser.py prepare
python3 bench/composed-parity40-browser.py serve --port 8904
```

Parent opens http://127.0.0.1:8904/bench/composed-parity40-browser.html and clicks Run untimed parity. The page saves only a passed receipt to `reports/web-stack-engine-40-2026-10-11/parity/browser-parity.json`. No timing clocks or samples are collected. Existing receipt files are never overwritten.

All fixtures compare reference full values. Both complete state hosts compare action outcomes and exact portable snapshots after every source request. Eligible numeric sources additionally check direct packed input capture by mutating caller inputs after submission, forced automatic JavaScript with captured U32 typed views, complete retained-output lifetime after later calls/reset/close, actual GPU routing, and independently computed physical GPU counters. F32 cpu_only markers retain CPU bits; unsupported carrier routes retain CPU fallback. Complete module inputs stay stable until the asynchronous module adapter settles; the direct packed adapter tests synchronous capture separately.
