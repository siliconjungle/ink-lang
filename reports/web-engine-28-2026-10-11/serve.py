from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
import json
R=Path(__file__).resolve().parent
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw):super().__init__(*a,directory=str(R),**kw)
 def do_POST(self):
  names={'browser-validation.json','browser-results.json','gpu-validation.json','gpu-results.json'};name=self.path.removeprefix('/save/')
  if name not in names:self.send_error(404);return
  content=self.rfile.read(int(self.headers['Content-Length']));data=json.loads(content);assert data['status']=='passed';(R/name).write_bytes(content);self.send_response(200);self.end_headers();self.wfile.write(b'ok')
ThreadingHTTPServer(('127.0.0.1',8821),Handler).serve_forever()
