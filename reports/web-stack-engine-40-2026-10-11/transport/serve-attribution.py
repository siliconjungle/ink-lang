"""Static report server with narrow result destinations; no timing gate created."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
import json,os
B=Path(__file__).resolve().parents[3];R=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def do_POST(self):
  destinations={'/save/transport40/validation':'attribution-validation.json','/save/transport40/attribution':'attribution-results.json'}
  if self.path not in [*destinations,'/save/transport40/failure']:self.send_error(404);return
  n=int(self.headers.get('Content-Length','0'))
  if not 0<n<=16*1024*1024:self.send_error(413);return
  raw=self.rfile.read(n);j=json.loads(raw)
  if self.path.endswith('/failure'):
   i=1
   while(R/f'attribution-failure-{i}.json').exists():i+=1
   out=R/f'attribution-failure-{i}.json'
  else:
   out=R/destinations[self.path]
   if out.exists():self.send_error(409,'preserve existing evidence');return
   if j.get('status')!='passed':self.send_error(422);return
  out.write_text(json.dumps(j,indent=2)+'\n');self.send_response(200);self.end_headers();self.wfile.write(b'saved')
os.chdir(B);ThreadingHTTPServer(('127.0.0.1',8908),Handler).serve_forever()
