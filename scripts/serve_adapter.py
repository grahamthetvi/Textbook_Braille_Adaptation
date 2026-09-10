#!/usr/bin/env python3
"""Serve the adapter web app from docs/ and optionally proxy Gemini."""

from __future__ import annotations

import argparse
import json
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
DOCS_DIR = REPO_ROOT / "docs"
GEMINI_API_ROOT = "https://generativelanguage.googleapis.com/v1beta"
DEFAULT_MODEL = "gemini-2.5-flash"
MODEL_PATH_RE = re.compile(
    r"^/api/gemini/models/(?P<model>[^/]+):generateContent/?$"
)

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".svg": "image/svg+xml",
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".ico": "image/x-icon",
    ".woff2": "font/woff2",
    ".map": "application/json",
}


class AdapterHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS_DIR), **kwargs)

    def guess_type(self, path):
        ext = Path(str(path)).suffix.lower()
        return MIME_TYPES.get(ext, super().guess_type(path))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, x-goog-api-key, x-api-key",
        )
        super().end_headers()

    def log_message(self, fmt, *args):
        message = fmt % args
        if "key=" in message.lower():
            message = re.sub(r"(key=)[^&\s]+", r"\1[redacted]", message, flags=re.I)
        sys.stderr.write("%s - %s\n" % (self.address_string(), message))

    def _request_path(self) -> str:
        parsed = urllib.parse.urlparse(self.path)
        return urllib.parse.unquote(parsed.path)

    def _read_body(self) -> bytes:
        length = int(self.headers.get("Content-Length", "0") or 0)
        return self.rfile.read(length) if length > 0 else b""

    def _send_bytes(self, status: int, payload: bytes, content_type: str) -> None:
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(payload)))
        self.end_headers()
        self.wfile.write(payload)

    def _send_json(self, status: int, payload: dict) -> None:
        body = json.dumps(payload).encode("utf-8")
        self._send_bytes(status, body, "application/json; charset=utf-8")

    def _api_key(self) -> str:
        return (self.headers.get("x-goog-api-key") or self.headers.get("x-api-key") or "").strip()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        if self._request_path().startswith("/api/"):
            self._send_json(404, {"error": {"message": "Not found"}})
            return
        super().do_GET()

    def do_POST(self):
        path = self._request_path()
        match = MODEL_PATH_RE.match(path)
        if match:
            self._proxy_gemini(match.group("model"), self._read_body())
            return
        if path.rstrip("/") == "/api/gemini":
            self._proxy_gemini_from_body(self._read_body())
            return
        self._send_json(404, {"error": {"message": "Not found"}})

    def _proxy_gemini_from_body(self, body: bytes) -> None:
        try:
            data = json.loads(body.decode("utf-8") or "{}")
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._send_json(400, {"error": {"message": "Invalid JSON body"}})
            return
        if not isinstance(data, dict):
            self._send_json(400, {"error": {"message": "JSON body must be an object"}})
            return
        model = str(data.pop("model", "") or DEFAULT_MODEL)
        self._proxy_gemini(model, json.dumps(data).encode("utf-8"))

    def _proxy_gemini(self, model: str, body: bytes) -> None:
        api_key = self._api_key()
        if not api_key:
            self._send_json(
                401,
                {"error": {"message": "Missing API key (x-goog-api-key or x-api-key)"}},
            )
            return
        model = urllib.parse.unquote(model).strip()
        if not model or "/" in model:
            self._send_json(400, {"error": {"message": "Invalid model name"}})
            return
        url = f"{GEMINI_API_ROOT}/models/{model}:generateContent?key={api_key}"
        request = urllib.request.Request(
            url,
            data=body or b"{}",
            method="POST",
            headers={"Content-Type": "application/json"},
        )
        try:
            with urllib.request.urlopen(request, timeout=300) as response:
                payload = response.read()
                status = response.status
                content_type = response.headers.get("Content-Type", "application/json")
        except urllib.error.HTTPError as err:
            payload = err.read() or json.dumps({"error": {"message": f"HTTP {err.code}"}}).encode()
            status = err.code
            content_type = (
                err.headers.get("Content-Type", "application/json")
                if err.headers
                else "application/json"
            )
        except urllib.error.URLError as err:
            self._send_json(502, {"error": {"message": f"Could not reach Gemini: {err.reason}"}})
            return
        self._send_bytes(status, payload, content_type)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default 8000)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not DOCS_DIR.is_dir():
        print(f"docs directory not found: {DOCS_DIR}", file=sys.stderr)
        return 1
    server = ThreadingHTTPServer(("127.0.0.1", args.port), AdapterHandler)
    print(f"Serving {DOCS_DIR} at http://127.0.0.1:{args.port}", flush=True)
    print(f"Open http://127.0.0.1:{args.port}", flush=True)
    print("Gemini proxy: POST /api/gemini/models/<model>:generateContent", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
