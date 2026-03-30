#!/bin/bash
set -e
chmod +x "$WORKSPACE_ROOT/.cursor/mcp.js"
mkdir -p "$HOME/bin"
ln -sf "$WORKSPACE_ROOT/.cursor/mcp.js" "$HOME/bin/mcp"
