#!/usr/bin/env python3
"""Local untimed browser validation receiver; preserve every receipt."""
from pathlib import Path
import http.server,json,time
ROOT=Path(__file__).resolve().parent/'published-main-targets-untimed'
class Handler(http.server.SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def do_POST(self):
  data=self.rfile.read(int(self.headers['Content-Length'])); value=json.loads(data)
  if self.path=='/failure':target=ROOT.parent/('browser-failure-'+str(time.time_ns())+'.json')
  elif self.path=='/save/browser-validation.json'and value.get('status')=='passed'and value.get('samples')==[]:target=ROOT/'browser-validation.json'
  else:self.send_error(400);return
  if target.exists():self.send_error(409);return
  target.write_bytes(data);self.send_response(200);self.end_headers();self.wfile.write(b'ok')
http.server.ThreadingHTTPServer(('127.0.0.1',9132),Handler).serve_forever()
