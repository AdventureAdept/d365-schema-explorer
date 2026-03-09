# D365 Schema Explorer

A CLI and VS Code extension for browsing Microsoft Dataverse schema.

## Features

- **CLI Tool** (`d365ai` command)
  - Multi-client configuration
  - Authenticate via MSAL device flow **or** service principal (client credentials)
  - Auto-refresh tokens — no re-authentication needed when using client credentials
  - **Delta sync** — Only fetch changed schema metadata for faster updates
  - Pull and cache schema metadata
  - Search entities, fields, and relationships
  - Export schema as JSON or Markdown

- **VS Code Extension**
  - Tree view of entities, attributes, and relationships
  - Search and navigate schema
  - Export entities from the sidebar
  - View detailed entity, attribute, and relationship information

## Installation

### CLI

```bash
npm install
npm run build
npm link  # Makes 'd365ai' command available globally
```

### VS Code Extension

```bash
# Install from the .vsix file
code --install-extension d365-schema-explorer-0.1.0.vsix
```

Or install from within VS Code:
1. Go to Extensions view
2. Click "..." menu → "Install from VSIX"
3. Select `d365-schema-explorer-0.1.0.vsix`

## Quick Start

```bash
# Connect to a Dataverse environment
d365ai env connect

# Pull schema metadata (auto-detects delta vs full sync)
d365ai schema pull

# Check sync status
d365ai schema sync-status

# Search entities
d365ai schema search account

# Export schema
d365ai schema export account --format markdown
```

## Authentication

Two authentication modes are supported:

### Device Code Flow (default)
Leave the Client Secret blank during `env connect`. You will be prompted to authenticate in a browser once. Tokens are cached but expire after ~1 hour and require re-authentication.

### Client Credentials (service principal)
Provide a Client ID and Client Secret during `env connect`. Tokens are automatically refreshed in the background — no user interaction ever required after initial setup.

**Setting up a service principal:**
1. Register an app in Azure AD (Azure Portal → App registrations)
2. Add a client secret (Certificates & secrets)
3. Grant `Dynamics CRM → user_impersonation` API permission
4. Add the app as an Application User in your Dataverse environment (Power Platform Admin Center → Environments → Settings → Users → Application Users) with an appropriate security role (e.g. System Customizer)

## Commands

### `d365ai use <client>`
Switch active client configuration.

### `d365ai env connect`
Authenticate with a Dataverse organization. Supports device code flow or client credentials (service principal).

### `d365ai env disconnect`
Remove authentication for current client.

### `d365ai env status`
Show connection status.

### `d365ai schema pull`
Pull schema metadata from Dataverse and cache locally.

**Options:**
- `--delta` — Force delta sync (only fetch changes since last sync)
- `--full` — Force full sync with all attributes and relationships
- `--force` — Force full refresh of cache

### `d365ai schema sync-status`
Show sync status and cache statistics.

### `d365ai schema search <query>`
Search entities, fields, and relationships.

### `d365ai schema export [entity]`
Export schema as JSON or Markdown.

## Delta Sync

The CLI automatically uses **delta sync** after the first full pull:

- **First run:** Full sync (pulls all entities, attributes, relationships)
- **Subsequent runs:** Delta sync (only fetches items modified since last sync)
- **Performance:** Delta sync is typically 10-20x faster than full sync

Delta sync uses the `ModifiedOn` timestamp from Dataverse to detect changes.

## Configuration

Client configurations are stored in `~/.d365ai/clients/`. Each client has:

- Organization URL
- Tenant ID
- Client ID (for app registration)
- Client Secret (optional — enables automatic token refresh)
- Cached authentication tokens
- Schema cache (`{clientName}-cache.json`)

## VS Code Extension

The VS Code extension provides a visual tree view of your Dataverse schema:

### Features
- **Tree View:** Browse entities → Attributes & Relationships
- **Search:** Quick search across entities and attributes
- **Export:** Export entities to JSON or Markdown from the sidebar
- **Details:** View full entity, attribute, and relationship details in webview panels

### Setup
1. Install the extension from the `.vsix` file
2. Open the D365 Schema Explorer sidebar (Explorer panel)
3. Click "Connect to Dataverse" and select your client
4. Browse your schema!

## Tech Stack

- TypeScript/Node.js
- MSAL Node for authentication
- Dataverse WebAPI for metadata
- JSON file cache
- Commander.js for CLI framework

## Development

```bash
# Run in development mode
npm run dev

# Build
npm run build

# Watch for changes
npm run watch

# Package VS Code extension
cd vscode-extension
npx vsce package
```

## License

MIT
