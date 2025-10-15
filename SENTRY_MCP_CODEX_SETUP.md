# Sentry MCP Server Setup for Codex CLI

This guide turns the Sentry MCP server documentation in `tracinginfo.md` into a
Codex-ready workflow. It keeps Sentry's tracing requirements intact while
showing how to run the server locally and surface it to the Codex CLI.

## Prerequisites
- Node.js 18+ (or Bun) to run `@sentry/mcp-server`.
- Python 3.9+ for the WebSocket bridge in `tools/mcp_websocket_bridge.py`.
- A Sentry **User Auth Token** with at least `org:read`, `project:read`,
  `team:read`, and `event:read`. Store it securely.
- Optional: an `OPENAI_API_KEY` if you plan to use the Sentry server's
  AI-assisted search tools.

## Environment Variables
Add the following to `.env` (or your preferred secret storage) so the CLI and
bridge scripts can source them:

```bash
SENTRY_MCP_ACCESS_TOKEN=your_sentry_user_auth_token
SENTRY_MCP_URL=https://sentry.io            # or self-hosted base URL
SENTRY_MCP_SCOPES=org:read,project:read
SENTRY_MCP_ADD_SCOPES=event:write           # optional, appended to defaults
SENTRY_MCP_DSN=                              # optional override for tracing DSN
OPENAI_API_KEY=                              # optional, enables AI search tools
```

If you omit `SENTRY_MCP_SCOPES`, the server keeps its default read-only scope
set. Use either `SENTRY_MCP_SCOPES` **or** `SENTRY_MCP_ADD_SCOPES`, not both.

## Launch the Sentry MCP Server (stdio)
```bash
source .env
npx --yes @sentry/mcp-server@latest \
  --access-token "$SENTRY_MCP_ACCESS_TOKEN" \
  ${SENTRY_MCP_URL:+--url "$SENTRY_MCP_URL"} \
  ${SENTRY_MCP_SCOPES:+--scopes "$SENTRY_MCP_SCOPES"} \
  ${SENTRY_MCP_ADD_SCOPES:+--add-scopes "$SENTRY_MCP_ADD_SCOPES"} \
  ${SENTRY_MCP_DSN:+--sentry-dsn "$SENTRY_MCP_DSN"}
```

Notes:
- `--url` supersedes `--host` and supports both SaaS and self-hosted Sentry.
- Passing `--sentry-dsn=` (empty value) disables upstream telemetry if you do
  not want Sentry to track the MCP server itself.

## Bridge stdio → WebSocket for Codex
The Codex CLI expects a WebSocket endpoint. Reuse the bridge shipped with the
project:

```bash
source .env
python3 tools/mcp_websocket_bridge.py \
  --host 127.0.0.1 \
  --port 49100 \
  -- npx --yes @sentry/mcp-server@latest \
    --access-token "$SENTRY_MCP_ACCESS_TOKEN" \
    ${SENTRY_MCP_URL:+--url "$SENTRY_MCP_URL"} \
    ${SENTRY_MCP_SCOPES:+--scopes "$SENTRY_MCP_SCOPES"} \
    ${SENTRY_MCP_ADD_SCOPES:+--add-scopes "$SENTRY_MCP_ADD_SCOPES"} \
    ${SENTRY_MCP_DSN:+--sentry-dsn "$SENTRY_MCP_DSN"}
```

Leave the bridge running while the Codex CLI connects to
`ws://127.0.0.1:49100`. Each new Codex session spawns a clean MCP server
process.

## Optional: Register in `.mcp/config.json`
If you prefer to let Codex spawn the server directly via stdio, add (or adapt)
an entry in `.mcp/config.json`:

```json
{
  "mcpServers": {
    "sentry": {
      "command": "npx",
      "args": [
        "--yes",
        "@sentry/mcp-server@latest",
        "--access-token",
        "$SENTRY_MCP_ACCESS_TOKEN",
        "--url",
        "$SENTRY_MCP_URL"
      ],
      "env": {
        "SENTRY_MCP_ACCESS_TOKEN": "$SENTRY_MCP_ACCESS_TOKEN",
        "SENTRY_MCP_URL": "$SENTRY_MCP_URL",
        "MCP_SCOPES": "$SENTRY_MCP_SCOPES",
        "MCP_ADD_SCOPES": "$SENTRY_MCP_ADD_SCOPES",
        "OPENAI_API_KEY": "$OPENAI_API_KEY"
      }
    }
  }
}
```

Adjust paths and quoting to match your shell and keep secrets out of version
control.

## Tracing Expectations
`@sentry/mcp-server` already emits the spans described in `tracinginfo.md`:

- All spans use `op="mcp.server"` (or the notification variants) and set
  `mcp.method.name`.
- `mcp.transport="stdio"` and `network.transport="pipe"` for Codex's stdio
  transport.
- Session metadata (`mcp.session.id`, `mcp.client.*`, `mcp.server.*`) propagates
  once the client sends it. Stateless connections simply omit these fields.
- Request-specific spans (`tools/list`, `tools/call`, `resources/read`,
  `prompts/list`, etc.) follow the naming and attribute contracts outlined in
  `tracinginfo.md`.

Verify traces by opening the Sentry performance view for your project and
filtering by the service name you configured.

## Troubleshooting Checklist
- Ensure the auth token includes every scope your workflow needs. Permission
  errors surface in the bridge logs.
- If the Codex CLI cannot connect, confirm no other process is bound to the
  chosen WebSocket port.
- Export `DEBUG=1` before running the bridge to see stdio messages.
  For telemetry configuration issues, rerun the MCP server without the bridge
  so you can watch its stdout/stderr directly.
