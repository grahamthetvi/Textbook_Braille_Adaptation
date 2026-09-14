#!/usr/bin/env python3
"""HTTP tests for the local adapter server (static files + Gemini proxy)."""

from __future__ import annotations

import json
import threading
import unittest
from http.client import HTTPConnection
from pathlib import Path

import sys
from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parent.parent
SCRIPTS = ROOT / "scripts"
if str(SCRIPTS) not in sys.path:
    sys.path.insert(0, str(SCRIPTS))

from serve_adapter import AdapterHandler, resolve_ollama_base  # noqa: E402


class ServeAdapterTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = ThreadingHTTPServer(("127.0.0.1", 0), AdapterHandler)
        cls.port = cls.server.server_address[1]
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def _conn(self) -> HTTPConnection:
        return HTTPConnection("127.0.0.1", self.port, timeout=5)

    def test_homepage(self):
        conn = self._conn()
        conn.request("GET", "/")
        response = conn.getresponse()
        body = response.read().decode("utf-8")
        conn.close()
        self.assertEqual(response.status, 200)
        self.assertIn("Textbook Adapter", body)
        self.assertIn("js/app.js", body)
        self.assertIn("How to connect Gemini 3.8 Flash", body)
        self.assertIn("gemini-3.8-flash", body)
        self.assertIn("Model access", body)
        self.assertIn('id="effort"', body)
        self.assertIn('id="ollama-url"', body)
        self.assertIn("Ollama URL", body)
        self.assertIn("A failed batch, a clarification question, or blank output stops the run", body)
        self.assertIn("Download Word document", body)
        self.assertIn("Wrap math in LaTeX (for Nemeth)", body)
        self.assertIn("clarify-section", body)
        self.assertIn('id="locale-select"', body)
        self.assertIn('id="locale-hint"', body)
        self.assertIn('id="theme-toggle"', body)
        self.assertIn("error-section", body)
        self.assertIn("pdf.min.js", body)
        self.assertIn("blank-section", body)
        self.assertIn("Skip as blank", body)
        self.assertIn("screen-reader-accessible", body)
        self.assertIn('id="locale-select"', body)
        self.assertIn('id="theme-toggle"', body)
        self.assertIn("data-theme", body)

    def test_i18n_module(self):
        conn = self._conn()
        conn.request("GET", "/js/i18n.js")
        response = conn.getresponse()
        body = response.read().decode("utf-8")
        conn.close()
        self.assertEqual(response.status, 200)
        self.assertIn("export function t(", body)
        self.assertIn("textbook-adapter-locale", body)

    def test_app_module(self):
        conn = self._conn()
        conn.request("GET", "/js/app.js")
        response = conn.getresponse()
        body = response.read().decode("utf-8")
        conn.close()
        self.assertEqual(response.status, 200)
        self.assertIn("runAdaptation", body)
        self.assertIn("applyTranscriptionError", body)
        self.assertIn("parseClarifyResponse", body)
        self.assertIn("isBlankTranscription", body)
        self.assertIn("latexMath", body)

    def test_proxy_requires_api_key(self):
        conn = self._conn()
        payload = json.dumps({"contents": []}).encode("utf-8")
        conn.request(
            "POST",
            "/api/gemini/models/gemini-3.8-flash:generateContent",
            body=payload,
            headers={"Content-Type": "application/json"},
        )
        response = conn.getresponse()
        body = json.loads(response.read().decode("utf-8"))
        conn.close()
        self.assertEqual(response.status, 401)
        self.assertIn("API key", body["error"]["message"])

    def test_options_cors(self):
        conn = self._conn()
        conn.request("OPTIONS", "/api/gemini")
        response = conn.getresponse()
        response.read()
        conn.close()
        self.assertEqual(response.status, 204)
        self.assertEqual(response.getheader("Access-Control-Allow-Origin"), "*")
        allow = response.getheader("Access-Control-Allow-Headers") or ""
        self.assertIn("authorization", allow.lower())
        self.assertIn("anthropic-version", allow.lower())

    def test_anthropic_proxy_requires_api_key(self):
        conn = self._conn()
        payload = json.dumps({"model": "claude-sonnet-5", "messages": []}).encode("utf-8")
        conn.request(
            "POST",
            "/api/anthropic/v1/messages",
            body=payload,
            headers={"Content-Type": "application/json"},
        )
        response = conn.getresponse()
        body = json.loads(response.read().decode("utf-8"))
        conn.close()
        self.assertEqual(response.status, 401)
        self.assertIn("API key", body["error"]["message"])

    def test_openai_proxy_requires_api_key(self):
        conn = self._conn()
        payload = json.dumps({"model": "gpt-5.6-luna"}).encode("utf-8")
        conn.request(
            "POST",
            "/api/openai/v1/responses",
            body=payload,
            headers={"Content-Type": "application/json"},
        )
        response = conn.getresponse()
        body = json.loads(response.read().decode("utf-8"))
        conn.close()
        self.assertEqual(response.status, 401)
        self.assertIn("API key", body["error"]["message"])

    def test_ollama_non_loopback_is_rejected(self):
        conn = self._conn()
        conn.request(
            "GET",
            "/api/ollama/api/tags",
            headers={"x-ollama-url": "http://example.com:11434"},
        )
        response = conn.getresponse()
        body = json.loads(response.read().decode("utf-8"))
        conn.close()
        self.assertEqual(response.status, 400)
        self.assertIn("loopback", body["error"]["message"].lower())

    def test_resolve_ollama_base_allows_only_loopback(self):
        self.assertEqual(resolve_ollama_base(""), "http://127.0.0.1:11434")
        self.assertEqual(resolve_ollama_base("http://127.0.0.1:11434"), "http://127.0.0.1:11434")
        self.assertEqual(resolve_ollama_base("http://localhost:11434"), "http://localhost:11434")
        self.assertEqual(resolve_ollama_base("http://[::1]:11434"), "http://[::1]:11434")
        self.assertIsNone(resolve_ollama_base("http://example.com:11434"))
        self.assertIsNone(resolve_ollama_base("http://192.168.1.5:11434"))
        self.assertIsNone(resolve_ollama_base("http://user:pass@127.0.0.1:11434"))


if __name__ == "__main__":
    unittest.main()
