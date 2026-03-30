#!/usr/bin/env node
// CLI wrapper for MCP servers - enables Cursor Cloud Agents to call MCP tools

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Smart config lookup
const possiblePaths = [
  path.join(process.cwd(), 'mcp.json'),
  path.join(process.cwd(), '.cursor', 'mcp.json'),
  path.join(process.env.HOME || '/home/user', '.cursor', 'mcp.json'),
];

let configPath = null;
let config = null;

for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    configPath = p;
    config = JSON.parse(fs.readFileSync(p, 'utf8')).mcpServers;
    break;
  }
}

if (!config) {
  console.error('✖ Could not find mcp.json');
  console.error('  Looked in:');
  possiblePaths.forEach(p => console.error(`    ${p}`));
  process.exit(1);
}

console.log(`Using MCP config: ${configPath}`);

const USAGE = `
MCP one-shot CLI wrapper (for Cursor Cloud Agents)

Usage:
  mcp servers                     List all available MCP servers
  mcp tools <server>              List tools for a server
  mcp run <server> <tool> [input] Call a tool (input is JSON string or - for stdin)
`.trim();

if (process.argv.length < 3 || ['-h', '--help'].includes(process.argv[2])) {
  console.log(USAGE);
  process.exit(0);
}

const sub = process.argv[2].toLowerCase();

async function main() {
  try {
    if (sub === 'servers') {
      console.log('Available servers:');
      Object.keys(config).forEach(s => console.log('  ' + s));
      return;
    }

    if (sub === 'tools' || sub === 'list') {
      const server = process.argv[3];
      if (!server || !config[server]) {
        console.error('Provide a valid server. Use mcp servers to see them.');
        process.exit(1);
      }
      await runMcp(server, null, null);
      return;
    }

    if (sub === 'run' || sub === 'call') {
      const server = process.argv[3];
      const tool   = process.argv[4];
      let inputJson = process.argv[5];

      if (!server || !tool || !config[server]) {
        console.error('Invalid arguments. Use mcp --help');
        process.exit(1);
      }

      if (!inputJson || inputJson === '-') {
        // Read from stdin for large inputs
        inputJson = await new Promise((res, rej) => {
          let data = '';
          process.stdin.on('data', chunk => data += chunk);
          process.stdin.on('end', () => res(data));
          process.stdin.on('error', rej);
        });
      }

      let input;
      try {
        input = JSON.parse(inputJson);
      } catch (e) {
        console.error('Input is not valid JSON.');
        process.exit(1);
      }

      await runMcp(server, tool, input);
      return;
    }

    console.error('Unknown command. Use mcp --help');
    process.exit(1);
  } catch (err) {
    console.error('Unexpected error:', err.message || err);
    process.exit(1);
  }
}

// Core MCP runner – one-shot with timeout
async function runMcp(server, toolName, input) {
  const cfg = config[server];

  // Security: Validate command to prevent injection
  if (!cfg.command || typeof cfg.command !== 'string') {
    throw new Error(`Invalid command for server "${server}"`);
  }
  if (!/^[\w./-]+$/.test(cfg.command)) {
    throw new Error(`Invalid command for server "${server}": unsafe characters`);
  }
  if (!Array.isArray(cfg.args)) {
    throw new Error(`Invalid args for server "${server}": must be array`);
  }
  for (let i = 0; i < cfg.args.length; i++) {
    if (typeof cfg.args[i] !== 'string') {
      throw new Error(`Invalid arg at index ${i}: must be string`);
    }
  }

  const child = spawn(cfg.command, cfg.args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: { ...process.env, ...(cfg.env || {}) }
  });

  child.stderr.on('data', data => {
    console.error(`[${server} stderr] ${data}`);
  });

  // Live output
  child.stdout.on('data', chunk => process.stdout.write(chunk));

  const send = (msg) => {
    if (!msg.id) msg.id = Date.now().toString();
    child.stdin.write(JSON.stringify(msg) + '\n');
  };

  const waitFor = (predicate, timeoutMs = 90_000) => new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      child.stdout.removeAllListeners('data');
      child.removeAllListeners('close');
      reject(new Error(`Timeout after ${timeoutMs/1000}s`));
    }, timeoutMs);

    const handler = (data) => {
      const lines = (data + '').split('\n');
      for (let line of lines) {
        line = line.trim();
        if (!line) continue;
        let msg;
        try { msg = JSON.parse(line); } catch (_) { continue; }
        if (predicate(msg)) {
          clearTimeout(timer);
          child.stdout.removeListener('data', handler);
          child.removeListener('close', closeHandler);
          resolve(msg);
          return;
        }
      }
    };

    const closeHandler = () => {
      clearTimeout(timer);
      reject(new Error('MCP process exited prematurely'));
    };

    child.stdout.on('data', handler);
    child.on('close', closeHandler);
  });

  // Initialize MCP protocol
  const initId = 'init-1';
  send({
    jsonrpc: '2.0',
    method: 'initialize',
    id: initId,
    params: {
      protocolVersion: '2024-11-05',
      capabilities: {},
      clientInfo: { name: 'mcp-cli-wrapper', version: '1.0.0' }
    }
  });

  try {
    const initResponse = await waitFor(m => m.id === initId, 15_000);
    if (initResponse.error) {
      throw new Error(`Initialize failed: ${JSON.stringify(initResponse.error)}`);
    }
  } catch (e) {
    console.error('Failed to initialize MCP server');
    child.kill();
    throw e;
  }

  if (!toolName) {
    // List tools mode
    send({ jsonrpc: '2.0', method: 'tools/list', id: 'list' });
    const resp = await waitFor(m => m.id === 'list');
    console.log('\nTools for "' + server + '":');
    const tools = resp.tools || resp.result?.tools || [];
    tools.forEach(t => {
      console.log(`  ${t.name}`);
      if (t.description) console.log(`    ${t.description}`);
      if (t.inputSchema) console.log(`    input: ${JSON.stringify(t.inputSchema)}`);
      console.log('');
    });
    child.stdin.end();
    child.kill('SIGTERM');
    setTimeout(() => process.exit(0), 50);
    return;
  }

  // Call tool
  const callId = 'call-1';
  send({
    jsonrpc: '2.0',
    method: 'tools/call',
    id: callId,
    params: { name: toolName, arguments: input }
  });

  const resultMsg = await waitFor(m => m.id === callId);

  if (resultMsg.error) {
    console.error('MCP tool error:', resultMsg.error.message || JSON.stringify(resultMsg.error));
    process.exit(1);
  }

  // Pretty-print result
  console.log('\n[FINAL RESULT]');
  const result = resultMsg.result || resultMsg;
  if (result.content) {
    result.content.forEach(item => {
      if (item.type === 'text') {
        console.log(item.text);
      } else {
        console.log(JSON.stringify(item, null, 2));
      }
    });
  } else {
    console.log(JSON.stringify(result, null, 2));
  }

  child.stdin.end();
  child.kill('SIGTERM');
  setTimeout(() => process.exit(0), 50);
}

main().catch(err => {
  console.error('\nFailed:', err.message || err);
  process.exit(1);
});
