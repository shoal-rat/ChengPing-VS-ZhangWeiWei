#!/usr/bin/env python3
"""Static dev server with caching disabled (ES modules otherwise stick in the cache)."""
import http.server, sys, functools

class H(http.server.SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()
    def log_message(self, *a):
        pass

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8123
root = sys.argv[2] if len(sys.argv) > 2 else "."
http.server.ThreadingHTTPServer(("127.0.0.1", port), functools.partial(H, directory=root)).serve_forever()
