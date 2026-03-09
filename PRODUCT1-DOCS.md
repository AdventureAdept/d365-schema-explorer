# Product 1: D365 Schema Explorer

## Overview

D365 Schema Explorer is a CLI tool for browsing Microsoft Dataverse schema metadata. It provides developers with fast, local access to entity definitions, attributes, and relationships without needing to open Dynamics 365 or XrmToolBox.

## Features

- **Multi-client configuration** — Manage connections to multiple Dataverse environments
- **MSAL authentication** — Device flow or service principal (client credentials) with automatic token refresh
- **Local schema cache** — JSON file caching with delta-sync support
- **Fast search** — Search entities, fields, and relationships locally
- **Export capabilities** — Export schema as JSON or Markdown
- **VS Code ready** — Designed to work as both CLI and VS Code extension

## Installation

```bash
# Clone or navigate to the project
cd d365-schema-explorer

# Install dependencies
npm install

# Build the project
npm run build

# Link globally (optional)
npm link

# Or use directly
node dist/cli.js --version
```

## Quick Start

### 1. Connect to a Dataverse Environment

```bash
# Interactive connection
d365ai env connect

# You'll be prompted for:
# - Organization URL (e.g., https://yourorg.crm.dynamics.com)
# - Client name (friendly name for this connection)
# - Tenant ID (optional, defaults to 'organizations')
# - Client ID (optional, uses default public client)
# - Client Secret (optional, enables automatic token refresh via service principal)
```

### 2. Pull Schema Metadata

```bash
# Pull basic entity definitions
d365ai schema pull

# Pull full metadata including attributes and relationships
d365ai schema pull --full

# Force refresh cache
d365ai schema pull --force
```

### 3. Search Schema

```bash
# Search all entities
d365ai schema search account

# Search specific type
d365ai schema search name --type attribute

# Limit results
d365ai schema search contact --limit 10
```

### 4. Export Schema

```bash
# Export all entities as JSON
d365ai schema export

# Export single entity as Markdown
d365ai schema export account --format markdown

# Export to file
d365ai schema export contact --format markdown --output contact-schema.md
```

## CLI Commands

### `d365ai use <client>`
Switch between configured clients.

```bash
# Switch to a specific client
d365ai use production
```

### `d365ai env`
Manage environment connections.

#### `d365ai env connect`
Connect to a Dataverse environment. Prompts for:
- Organization URL
- Client name
- Tenant ID
- Client ID
- Client Secret *(optional — leave blank for device code flow)*

#### `d365ai env disconnect`
Disconnect from current environment and clear cached tokens.

#### `d365ai env status`
Show connection status for all configured clients.

#### `d365ai env list`
List all configured clients.

### `d365ai schema`
Manage and explore Dataverse schema.

#### `d365ai schema pull [options]`
Pull schema metadata from Dataverse.

Options:
- `-f, --full` — Pull full metadata including attributes and relationships
- `--force` — Force full refresh of cache

#### `d365ai schema search <query> [options]`
Search entities, fields, and relationships.

Options:
- `-t, --type <type>` — Filter by type (entity, attribute, relationship)
- `-l, --limit <number>` — Limit number of results

#### `d365ai schema export [entity] [options]`
Export schema as JSON or Markdown.

Options:
- `-f, --format <format>` — Output format (json, markdown)
- `-o, --output <path>` — Output file path

#### `d365ai schema list`
List all cached entities.

## Configuration

### Client Configuration Directory

```
~/.d365ai/
├── config.json              # Active client and settings
└── clients/
    ├── production.json      # Client configuration
    └── production.auth.json # Cached authentication token
```

### Client Configuration File

```json
{
  "name": "production",
  "orgUrl": "https://yourorg.crm.dynamics.com",
  "tenantId": "your-tenant-id",
  "clientId": "your-app-client-id",
  "clientSecret": "your-client-secret",
  "createdAt": "2024-03-08T10:00:00.000Z",
  "updatedAt": "2024-03-08T10:00:00.000Z"
}
```

`clientSecret` is optional. When present, the CLI uses client credentials flow and automatically refreshes tokens without any user interaction.

## Authentication

### Device Code Flow (default)

Used when no `clientSecret` is configured. On first connect, the user authenticates once via browser. The access token is cached but expires after ~1 hour, requiring re-authentication.

### Client Credentials Flow (service principal)

Used when a `clientSecret` is present in the client config. Tokens are fetched and refreshed automatically — no user interaction required after initial setup. Recommended for CI/CD or persistent developer environments.

**Setup steps:**

1. **Register an Azure AD app**
   - Azure Portal → Azure Active Directory → App registrations → New registration

2. **Create a client secret**
   - App registration → Certificates & secrets → New client secret
   - Note the secret value (shown once only)

3. **Grant Dataverse permission**
   - App registration → API permissions → Add permission
   - Select *Dynamics CRM* → *user_impersonation* (delegated) or application permission
   - Grant admin consent

4. **Add as Application User in Dataverse**
   - Power Platform Admin Center → Environments → your environment → Settings → Users + permissions → Application users
   - Add the app registration
   - Assign a security role (e.g., *System Customizer* for read access to schema)

## Architecture

### Project Structure

```
d365-schema-explorer/
├── src/
│   ├── cli.ts              # CLI entry point
│   ├── index.ts            # Library exports
│   ├── commands/           # CLI commands
│   │   ├── use.ts
│   │   ├── env.ts
│   │   └── schema.ts
│   ├── auth/               # Authentication
│   │   └── manager.ts      # MSAL integration (device code + client credentials)
│   ├── api/                # Dataverse API
│   │   ├── client.ts       # WebAPI client
│   │   └── mock-client.ts  # Mock client for testing
│   ├── cache/              # Schema caching
│   │   └── manager.ts      # JSON file cache manager
│   ├── config/             # Configuration
│   │   └── manager.ts      # Client config manager
│   └── types/              # TypeScript types
│       └── index.ts
├── dist/                   # Compiled JavaScript
├── package.json
├── tsconfig.json
└── README.md
```

### Key Components

#### AuthManager (`src/auth/manager.ts`)
- MSAL Node.js integration
- Device code flow for interactive authentication
- Client credentials flow for service principal (non-interactive)
- Automatic token refresh — when a token is missing or expired and `clientSecret` is configured, a new token is acquired silently
- Multi-client token management

#### DataverseClient (`src/api/client.ts`)
- Dataverse WebAPI v9.2 integration
- Entity metadata retrieval
- Attribute and relationship fetching
- Search functionality

#### CacheManager (`src/cache/manager.ts`)
- JSON file-based local caching per client
- Entity, attribute, and relationship storage
- Search across cached data
- Delta-sync support

#### ConfigManager (`src/config/manager.ts`)
- Multi-client configuration
- Active client management
- Secure credential storage

## Dataverse API Usage

### Metadata Endpoints

The tool uses the Dataverse WebAPI metadata endpoints:

```
GET /api/data/v9.2/EntityDefinitions
GET /api/data/v9.2/EntityDefinitions(LogicalName='{entity}')
GET /api/data/v9.2/EntityDefinitions(LogicalName='{entity}')/Attributes
GET /api/data/v9.2/EntityDefinitions(LogicalName='{entity}')/ManyToOneRelationships
GET /api/data/v9.2/EntityDefinitions(LogicalName='{entity}')/OneToManyRelationships
GET /api/data/v9.2/EntityDefinitions(LogicalName='{entity}')/ManyToManyRelationships
```

### Authentication Flows

**Device code flow:**
1. User initiates connection
2. CLI requests device code from Microsoft
3. User authenticates at https://microsoft.com/devicelogin
4. CLI receives access token
5. Token cached locally

**Client credentials flow:**
1. CLI reads `clientSecret` from client config
2. CLI requests token from Azure AD using app credentials
3. Token cached locally and refreshed automatically on expiry

## Testing

### Mock Testing

Test without a real Dataverse environment:

```bash
# Run mock tests
./test-mock.sh
```

Mock data includes:
- 4 sample entities (account, contact, opportunity, custom_project)
- Various attribute types (string, lookup, picklist, money, etc.)
- Relationship metadata

### Live Testing

Test with a real Dataverse environment:

```bash
# Connect to your org
node dist/cli.js env connect

# Follow prompts to authenticate
# Then test all commands
node dist/cli.js schema pull --full
node dist/cli.js schema search account
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run watch
```

### Development Mode

```bash
npm run dev -- env connect
```

## Troubleshooting

### Authentication Issues

**Problem:** Device code flow fails
**Solution:** Ensure you complete authentication at microsoft.com/devicelogin within the time limit

**Problem:** Token expired (device code flow)
**Solution:** Run `d365ai env connect` again to re-authenticate, or switch to client credentials flow

**Problem:** Client credentials flow returns 403
**Solution:** Ensure the Application User has been assigned a security role in Dataverse with the required privileges

### Cache Issues

**Problem:** Schema appears outdated
**Solution:** Run `d365ai schema pull --force` to refresh cache

**Problem:** Cache corruption
**Solution:** Delete `~/.d365ai/clients/*.auth.json` and re-pull

### Connection Issues

**Problem:** Cannot connect to Dataverse
**Solution:**
- Verify organization URL
- Check network connectivity
- Ensure you have appropriate permissions

## Future Enhancements

### Product 2: Impact Analyzer
- Dependency graph visualization
- Change impact analysis
- Relationship mapping

### Product 3: Code Assistant
- AI-powered code generation
- Plugin scaffolding
- Code review

### VS Code Extension
- Tree view of entities
- Inline schema lookup
- IntelliSense support

## License

MIT

## Contributing

This is part of the D365 AI Dev Platform. See the main project documentation for contribution guidelines.
