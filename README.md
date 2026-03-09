# D365 Schema Explorer

A CLI and VS Code extension for browsing Microsoft Dataverse schema.

## Features

- **CLI Tool** (`d365ai` command)
  - Multi-client configuration
  - Authenticate with Dataverse organizations via MSAL device flow
  - Pull and cache schema metadata
  - Search entities, fields, and relationships
  - Export schema as JSON or Markdown

- **VS Code Extension** (planned)
  - Tree view of entities/fields
  - Search panel

## Installation

```bash
npm install
npm run build
npm link  # Makes 'd365ai' command available globally
```

## Quick Start

```bash
# Connect to a Dataverse environment
d365ai env connect

# Pull schema metadata
d365ai schema pull

# Search entities
d365ai schema search account

# Export schema
d365ai schema export account --format markdown
```

## Commands

### `d365ai use <client>`
Switch active client configuration.

### `d365ai env connect`
Authenticate with a Dataverse organization using MSAL device flow.

### `d365ai env disconnect`
Remove authentication for current client.

### `d365ai env status`
Show current connection status.

### `d365ai schema pull`
Pull schema metadata from Dataverse and cache locally.

### `d365ai schema search <query>`
Search entities, fields, and relationships.

### `d365ai schema export [entity]`
Export schema as JSON or Markdown.

## Configuration

Client configurations are stored in `~/.d365ai/clients/`. Each client has:

- Organization URL
- Tenant ID
- Client ID (for app registration)
- Cached authentication tokens

## Tech Stack

- TypeScript/Node.js
- MSAL Node for authentication
- Dataverse WebAPI for metadata
- SQLite for local caching
- Commander.js for CLI framework

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Watch for changes
npm run watch
```

## License

MIT