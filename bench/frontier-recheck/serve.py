#!/usr/bin/env python3
import http.server
import argparse
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parents[2]
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def end_headers(self):
        self.send_header('Cross-Origin-Opener-Policy','same-origin')
        self.send_header('Cross-Origin-Embedder-Policy','require-corp')
        self.send_header('Cache-Control','no-store');super().end_headers()
    def log_message(self,*args):pass
    def do_POST(self):
        if self.path not in ['/benchmark-result','/benchmark-result/prepared']:self.send_error(404);return
        data=self.rfile.read(int(self.headers['Content-Length']))
        value=json.loads(data)
        if value.get('status')!='passed' or len(value.get('samples',[]))<100:self.send_error(400);return
        output=ROOT/'reports/frontier-recheck-2026-10-12'/'browser-results.json'
        if output.exists():self.send_error(409,'preserve prior results before a new run');return
        output.write_text(json.dumps(value,indent=2)+'\n')
        self.send_response(200);self.end_headers();self.wfile.write(b'saved')
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8921);a=p.parse_args()
http.server.ThreadingHTTPServer(('127.0.0.1',a.port),Handler).serve_forever()
