#!/bin/bash
set -e
WORKSPACE="${WORKSPACE_ROOT:-/workspace}"
# Disable fileMode tracking so chmod doesn't show as a git diff
git -C "$WORKSPACE" config core.fileMode false 2>/dev/null || true
chmod +x "$WORKSPACE/.cursor/mcp.js" 2>/dev/null || true
chmod +x "$WORKSPACE/.cursor/cg.sh" 2>/dev/null || true
mkdir -p "$HOME/bin"
ln -sf "$WORKSPACE/.cursor/mcp.js" "$HOME/bin/mcp" 2>/dev/null || true
