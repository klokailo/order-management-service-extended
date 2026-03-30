#!/bin/bash
set -e
WORKSPACE="${WORKSPACE_ROOT:-/workspace}"

# Disable fileMode tracking so chmod doesn't show as a git diff
git -C "$WORKSPACE" config core.fileMode false 2>/dev/null || true
chmod +x "$WORKSPACE/.cursor/mcp.js" 2>/dev/null || true
chmod +x "$WORKSPACE/.cursor/cg.sh" 2>/dev/null || true
mkdir -p "$HOME/bin"
ln -sf "$WORKSPACE/.cursor/mcp.js" "$HOME/bin/mcp" 2>/dev/null || true

# Install codebase-memory-mcp and index the repo.
# Runs before the LLM agent starts so no agent tokens are consumed.
# Safe on all conditions — baseline/MCP agents simply won't use CBM.
curl -fsSL https://raw.githubusercontent.com/DeusData/codebase-memory-mcp/main/install.sh | bash 2>/dev/null || true
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"
codebase-memory-mcp cli index_repository "{\"repo_path\":\"$WORKSPACE\"}" 2>/dev/null || true
