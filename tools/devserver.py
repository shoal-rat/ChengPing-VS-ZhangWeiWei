#!/usr/bin/env python3
"""Static dev server with caching disabled (ES modules otherwise stick in the cache).
POST /__shot?name=x with a data: URL body saves a canvas snapshot to $SHOT_DIR/x.jpg."""
import http.server, sys, functools, os, base64, urllib.parse

SHOT_DIR = os.environ.get("SHOT_DIR", "/tmp")

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()
    def log_message(self, *a):
        pass
    def do_POST(self):
        u = urllib.parse.urlparse(self.path)
        if u.path != "/__shot":
            self.send_response(404); self.end_headers(); return
        name = urllib.parse.parse_qs(u.query).get("name", ["shot"])[0]
        body = self.rfile.read(int(self.headers.get("Content-Length", 0))).decode()
        data = base64.b64decode(body.split(",", 1)[1])
        os.makedirs(SHOT_DIR, exist_ok=True)
        with open(os.path.join(SHOT_DIR, name + ".jpg"), "wb") as f:
            f.write(data)
        self.send_response(200); self.end_headers(); self.wfile.write(b"ok")

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
root = sys.argv[2] if len(sys.argv) > 2 else "."
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=root)).serve_forever()
