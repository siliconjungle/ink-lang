"""Serve the checked test bundle locally and retain a single conformance receipt."""
import argparse
import http.server
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--output',type=Path,default=ROOT/'reports/internal-snapshots-2026-10-12/webgpu-conformance.json')
OUTPUT=parser.parse_args().output
class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
    def do_POST(self):
        if self.path!='/save-conformance':self.send_error(404);return
        n=int(self.headers.get('Content-Length','0'))
        if not 0<n<=1_000_000:self.send_error(413);return
        try:
            with OUTPUT.open('xb') as output:output.write(self.rfile.read(n))
        except FileExistsError:self.send_error(409,'receipt already saved');return
        self.send_response(201);self.end_headers()
http.server.ThreadingHTTPServer(('127.0.0.1',8918),Handler).serve_forever()
