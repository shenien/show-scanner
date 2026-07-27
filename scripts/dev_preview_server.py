import http.server
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")
DATA = os.path.join(ROOT, "data")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=PUBLIC, **kwargs)

    def do_GET(self):
        if self.path == "/api/bands":
            with open(os.path.join(DATA, "bands.json")) as f:
                bands = json.load(f)
            self._send_json({"bands": bands})
            return
        if self.path == "/api/shows":
            with open(os.path.join(DATA, "shows.json")) as f:
                shows = json.load(f)
            self._send_json(shows)
            return
        super().do_GET()

    def _send_json(self, obj):
        body = json.dumps(obj).encode("utf-8")
        self.send_response(200)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)


if __name__ == "__main__":
    port = 4174
    http.server.ThreadingHTTPServer(("", port), Handler).serve_forever()
