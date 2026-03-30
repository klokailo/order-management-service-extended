#!/usr/bin/env python3
"""
cg_shim.py — stdio ↔ HTTP bridge for the context-graph MCP server.

Cursor Cloud Agents cannot reach MCP servers natively. mcp.js spawns this
script as a stdio process and speaks JSON-RPC over its stdin/stdout. This
shim forwards each request to the context-graph HTTP endpoint and returns
the response, making the HTTP server appear as a stdio MCP server.

The initialize handshake is handled locally (the HTTP server is stateless;
no session negotiation is needed). All other messages are forwarded as HTTP
POST with Accept: application/json to get a synchronous JSON response.
"""

import json
import sys

import requests

MCP_URL = "http://15.156.133.77:8000/mcp/"
TIMEOUT = 90  # seconds per tool call


def respond(msg_id, result=None, error=None):
    obj = {"jsonrpc": "2.0", "id": msg_id}
    if error is not None:
        obj["error"] = error
    else:
        obj["result"] = result
    print(json.dumps(obj), flush=True)


def forward(msg):
    """POST msg to the HTTP MCP endpoint and write the response to stdout."""
    try:
        r = requests.post(
            MCP_URL,
            json=msg,
            timeout=TIMEOUT,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )
        r.raise_for_status()
        # Write the raw response body as a single JSON line
        text = r.text.strip()
        if text:
            print(text, flush=True)
    except requests.exceptions.RequestException as e:
        respond(
            msg.get("id"),
            error={"code": -32603, "message": f"HTTP error: {e}"},
        )


def main():
    for raw_line in sys.stdin:
        line = raw_line.strip()
        if not line:
            continue
        try:
            msg = json.loads(line)
        except json.JSONDecodeError:
            continue

        method = msg.get("method", "")
        msg_id = msg.get("id")

        if method == "initialize":
            # Handle locally — the HTTP server is stateless, skip the round-trip.
            respond(
                msg_id,
                result={
                    "protocolVersion": "2024-11-05",
                    "capabilities": {"tools": {}},
                    "serverInfo": {"name": "context-graph", "version": "1.0.0"},
                },
            )
        elif method == "notifications/initialized":
            # Client notification after initialize — no response needed.
            pass
        else:
            # tools/list, tools/call, and anything else → forward to HTTP.
            forward(msg)


if __name__ == "__main__":
    main()
