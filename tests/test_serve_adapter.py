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

from serve_adapter import AdapterHandler  # noqa: E402


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
        self.assertIn("A failed batch or a clarification question stops the run", body)
        self.assertIn("Download Word document", body)
        self.assertIn("Wrap math in LaTeX (for Nemeth)", body)
        self.assertIn("clarify-section", body)
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
        self.assertIn("parseClarify", body)
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


if __name__ == "__main__":
    unittest.main()
