#!/bin/bash
# cg.sh — one-shot wrapper for the context-graph MCP server
#
# Usage: bash .cursor/cg.sh <tool_name> '<json_arguments>'
#
# Examples:
#   bash .cursor/cg.sh search_code '{"repo_id":"order-management-v2","query":"maxAttempts","regex":true}'
#   bash .cursor/cg.sh search_code_graph '{"repo_id":"order-management-v2","query":"webhook"}'
#   bash .cursor/cg.sh get_code_snippet '{"repo_id":"order-management-v2","qualified_name":"order-management-v2.src.models.WebhookJob.__file__"}'
#   bash .cursor/cg.sh trace_call_path '{"repo_id":"order-management-v2","qualified_name":"order-management-v2.src.webhooks.webhookService.enqueueWebhook"}'
#   bash .cursor/cg.sh get_code_graph_schema '{"repo_id":"order-management-v2"}'
#
# The script handles the MCP session handshake (initialize → notifications/initialized)
# and outputs only the JSON result data, stripping SSE framing.

set -euo pipefail

TOOL="${1:-}"
ARGS="${2:-}"
MCP_URL="http://15.156.133.77:8000/mcp"

if [[ -z "$TOOL" || -z "$ARGS" ]]; then
  echo "Usage: bash .cursor/cg.sh <tool_name> '<json_arguments>'" >&2
  echo "Tools: search_code, search_code_graph, get_code_snippet, trace_call_path, get_code_graph_schema" >&2
  exit 1
fi

# Step 1: Initialize — get session ID from response header
SESSION=$(curl -sL -D - -o /dev/null -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","method":"initialize","id":"init1","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"cg-wrapper","version":"1.0"}}}' \
  | grep -i "^mcp-session-id:" | tr -d '\r' | awk '{print $2}')

if [[ -z "$SESSION" ]]; then
  echo "ERROR: could not obtain MCP session ID from server" >&2
  exit 1
fi

# Step 2: Send initialized notification (no response needed)
curl -sL -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION" \
  -d '{"jsonrpc":"2.0","method":"notifications/initialized","params":{}}' > /dev/null

# Step 3: Call the tool — strip SSE framing, output raw JSON
curl -sL -X POST "$MCP_URL" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "mcp-session-id: $SESSION" \
  -d "{\"jsonrpc\":\"2.0\",\"method\":\"tools/call\",\"id\":\"1\",\"params\":{\"name\":\"${TOOL}\",\"arguments\":${ARGS}}}" \
  | grep '^data:' | sed 's/^data: //'
