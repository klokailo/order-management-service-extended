#!/bin/bash
set -e
WORKSPACE="${WORKSPACE_ROOT:-/workspace}"
chmod +x "$WORKSPACE/.cursor/mcp.js" 2>/dev/null || true
mkdir -p "$HOME/bin"
ln -sf "$WORKSPACE/.cursor/mcp.js" "$HOME/bin/mcp" 2>/dev/null || true
