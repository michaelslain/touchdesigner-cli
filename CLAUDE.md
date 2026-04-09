# CLAUDE.md

## Build & Run

- Runtime: Bun (TypeScript, no build step)
- Run directly: `bun run src/index.ts <command>`
- Install as CLI: `bun link` → `td <command>`
- Tests: `bun test`

## Architecture

TCP client/server pattern:

- **Client** (`src/client/tcp-client.ts`): Sends JSON requests over TCP to TouchDesigner, reads JSON responses. Configurable via `TD_HOST`/`TD_PORT` env vars. Default port 9005, 5s timeout.
- **Server** (`server/td-server.py`): Python TCP server running inside TouchDesigner process. Threaded, handles line-delimited JSON.
- **Protocol** (`src/protocol/types.ts`): Request `{id, action, params}`, Response `{id, status, data|error}`. Actions: `info`, `project.create`, `node.*`, `param.*`, `exec`.

## Commands

Each command is a separate file in `src/commands/`. The CLI entrypoint (`src/index.ts`) routes by first positional arg. Subcommands (e.g. `node list`) are handled within each command file.

## Conventions

- Simple positional args + flag parsing (no arg parsing library)
- Error handling: check `res.status === "error"`, log, exit(1)
- `param set` auto-coerces values (number, boolean, string)
- Request IDs are UUIDs for correlation
- No build step — Bun runs TypeScript directly
