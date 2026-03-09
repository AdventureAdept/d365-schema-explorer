# D365 Schema Explorer

A CLI and VS Code extension for browsing Microsoft Dataverse schema.

## Features

- **CLI Tool** (`d365ai` command)
  - Multi-client configuration
  - Authenticate via MSAL device flow **or** service principal (client credentials)
  - Auto-refresh tokens — no re-authentication needed when using client credentials
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
- Client Secret (optional — enables automatic token refresh)
- Cached authentication tokens

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
```

## License

MIT
