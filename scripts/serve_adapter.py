#!/usr/bin/env python3
"""Serve the adapter web app from docs/ and proxy Gemini, Claude, OpenAI, and Ollama."""

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
ANTHROPIC_MESSAGES_URL = "https://api.anthropic.com/v1/messages"
OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses"
DEFAULT_MODEL = "gemini-3.8-flash"
DEFAULT_OLLAMA_URL = "http://127.0.0.1:11434"
ANTHROPIC_VERSION = "2023-06-01"
LOOPBACK_HOSTS = {"127.0.0.1", "localhost", "::1"}
MODEL_PATH_RE = re.compile(
    r"^/api/gemini/models/(?P<model>[^/]+):generateContent/?$"
)
OLLAMA_PATH_RE = re.compile(r"^/api/ollama(?P<rest>/api/(?:tags|chat))/?$")

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

CORS_ALLOW_HEADERS = (
    "Content-Type, x-goog-api-key, x-api-key, authorization, "
    "anthropic-version, x-ollama-url"
)


def resolve_ollama_base(raw: str) -> str | None:
    """Return a loopback Ollama origin, or None if the URL is not allowed."""
    text = (raw or "").strip() or DEFAULT_OLLAMA_URL
    parsed = urllib.parse.urlparse(text)
    if parsed.scheme not in ("http", "https"):
        return None
    if parsed.username or parsed.password:
        return None
    host = (parsed.hostname or "").lower()
    if host not in LOOPBACK_HOSTS:
        return None
    hostname = parsed.hostname
    if host == "::1":
        netloc = f"[{hostname}]"
        if parsed.port:
            netloc = f"[{hostname}]:{parsed.port}"
    else:
        netloc = hostname
        if parsed.port:
            netloc = f"{hostname}:{parsed.port}"
    return f"{parsed.scheme}://{netloc}"


class _NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(newurl, code, "Redirects are not followed", headers, fp)


_NO_REDIRECT_OPENER = urllib.request.build_opener(_NoRedirect)


class AdapterHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(DOCS_DIR), **kwargs)

    def guess_type(self, path):
        ext = Path(str(path)).suffix.lower()
        return MIME_TYPES.get(ext, super().guess_type(path))

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", CORS_ALLOW_HEADERS)
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

    def _authorization(self) -> str:
        return (self.headers.get("Authorization") or "").strip()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        path = self._request_path()
        ollama = OLLAMA_PATH_RE.match(path)
        if ollama:
            rest = ollama.group("rest")
            if rest != "/api/tags":
                self._send_json(404, {"error": {"message": "Not found"}})
                return
            self._proxy_ollama("GET", rest, b"")
            return
        if path.startswith("/api/"):
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
        if path.rstrip("/") == "/api/anthropic/v1/messages":
            self._proxy_anthropic(self._read_body())
            return
        if path.rstrip("/") == "/api/openai/v1/responses":
            self._proxy_openai(self._read_body())
            return
        ollama = OLLAMA_PATH_RE.match(path)
        if ollama:
            self._proxy_ollama("POST", ollama.group("rest"), self._read_body())
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
        self._forward(
            url,
            body or b"{}",
            headers={"Content-Type": "application/json"},
            unreachable="Could not reach Gemini",
        )

    def _proxy_anthropic(self, body: bytes) -> None:
        api_key = self._api_key()
        if not api_key:
            self._send_json(401, {"error": {"message": "Missing API key (x-api-key)"}})
            return
        version = (self.headers.get("anthropic-version") or ANTHROPIC_VERSION).strip()
        self._forward(
            ANTHROPIC_MESSAGES_URL,
            body or b"{}",
            headers={
                "Content-Type": "application/json",
                "x-api-key": api_key,
                "anthropic-version": version or ANTHROPIC_VERSION,
            },
            unreachable="Could not reach Anthropic",
        )

    def _proxy_openai(self, body: bytes) -> None:
        authorization = self._authorization()
        api_key = self._api_key()
        if authorization.lower().startswith("bearer "):
            token = authorization[7:].strip()
        else:
            token = api_key
        if not token:
            self._send_json(
                401,
                {"error": {"message": "Missing API key (Authorization or x-api-key)"}},
            )
            return
        self._forward(
            OPENAI_RESPONSES_URL,
            body or b"{}",
            headers={
                "Content-Type": "application/json",
                "Authorization": f"Bearer {token}",
            },
            unreachable="Could not reach OpenAI",
        )

    def _proxy_ollama(self, method: str, rest: str, body: bytes) -> None:
        raw_url = (self.headers.get("x-ollama-url") or "").strip()
        base = resolve_ollama_base(raw_url)
        if not base:
            self._send_json(
                400,
                {
                    "error": {
                        "message": (
                            "Ollama proxy only allows loopback URLs "
                            "(127.0.0.1, localhost, ::1)"
                        )
                    }
                },
            )
            return
        url = f"{base}{rest}"
        headers = {"Content-Type": "application/json"}
        self._forward(
            url,
            body if method == "POST" else None,
            headers=headers,
            method=method,
            unreachable="Could not reach Ollama",
            opener=_NO_REDIRECT_OPENER,
        )

    def _forward(
        self,
        url: str,
        body: bytes | None,
        headers: dict[str, str],
        unreachable: str,
        method: str = "POST",
        opener: urllib.request.OpenerDirector | None = None,
    ) -> None:
        request = urllib.request.Request(
            url,
            data=body,
            method=method,
            headers=headers,
        )
        open_url = opener.open if opener is not None else urllib.request.urlopen
        try:
            with open_url(request, timeout=300) as response:
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
            self._send_json(502, {"error": {"message": f"{unreachable}: {err.reason}"}})
            return
        self._send_bytes(status, payload, content_type)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1", help="Bind address (default 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="Port to listen on (default 8000)")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if not DOCS_DIR.is_dir():
        print(f"docs directory not found: {DOCS_DIR}", file=sys.stderr)
        return 1
    server = ThreadingHTTPServer((args.host, args.port), AdapterHandler)
    print(f"Serving {DOCS_DIR} at http://{args.host}:{args.port}", flush=True)
    print(f"Open http://{args.host}:{args.port}", flush=True)
    print("Gemini proxy: POST /api/gemini/models/<model>:generateContent", flush=True)
    print("Claude proxy: POST /api/anthropic/v1/messages", flush=True)
    print("OpenAI proxy: POST /api/openai/v1/responses", flush=True)
    print("Ollama proxy: GET|POST /api/ollama/api/tags and /api/ollama/api/chat", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
