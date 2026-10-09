#!/usr/bin/env python3
"""Serve the filtered Wasm suite locally and save its browser receipt."""
import argparse
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8768)
    parser.add_argument('--receipt', type=Path, default=ROOT / 'build/filter-proof-wasm-browser-validation.json')
    args = parser.parse_args()
    receipt = args.receipt.resolve()
    receipt.parent.mkdir(parents=True, exist_ok=True)

    class Handler(SimpleHTTPRequestHandler):
        def __init__(self, *positional, **kwargs):
            super().__init__(*positional, directory=str(ROOT), **kwargs)

        def do_POST(self):
            if self.path != '/validation-receipt':
                self.send_error(404)
                return
            try:
                size = int(self.headers.get('content-length', '0'))
                if not 0 < size <= 16384:
                    self.send_error(413)
                    return
                data = json.loads(self.rfile.read(size))
                if not isinstance(data, dict) or data.get('status') != 'passed' or data.get('checks') != 4476 or data.get('fixtures') != 261:
                    raise ValueError('incomplete validation receipt')
                modules = data.get('modules')
                if not isinstance(modules, list) or len(modules) != 3 or [m['file'] for m in modules] != [f'/reports/filter-proof-wasm-phase1/{n}.wasm' for n in ['staged', 'checked', 'semantics']]:
                    raise ValueError('unexpected module set')
                if not isinstance(data.get('browser'), str):
                    raise ValueError('missing browser identity')
            except (ValueError, TypeError, KeyError, UnicodeError):
                self.send_error(400)
                return
            data['http_user_agent'] = self.headers.get('user-agent')
            data['http_origin'] = self.headers.get('origin')
            receipt.write_text(json.dumps(data, indent=2) + '\n')
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'OK')

    server = ThreadingHTTPServer(('127.0.0.1', args.port), Handler)
    print(f'Open http://127.0.0.1:{args.port}/bench/filtered/wasm.html', flush=True)
    print(f'Receipt: {receipt}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()


if __name__ == '__main__':
    main()
