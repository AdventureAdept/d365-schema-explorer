# 🦞 D365 Schema Explorer

**MVP v1.0.0** — A comprehensive CLI and VS Code extension for browsing, analyzing, and visualizing Microsoft Dataverse schema.

![MVP Ready](https://img.shields.io/badge/status-MVP%20Ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-blue)

---

## 🚀 What It Does

D365 Schema Explorer helps Dynamics 365 developers:

- **Browse** Dataverse schema (entities, attributes, relationships)
- **Search** across all metadata with instant results
- **Analyze** dependencies and impact of changes
- **Visualize** entity relationships with interactive graphs
- **Export** schema documentation in multiple formats
- **Sync** efficiently with delta sync (10-20x faster)

---

## ✨ Features

- **Schema Explorer** — Browse, search, and export Dataverse schema
- **Impact Analyzer** — Find dependencies across plugins, web resources, and code
- **VS Code Extension** — Tree view, dependency graphs, and inline help
- **Secure Auth** — OS credential manager, token encryption
- **Delta Sync** — 10-20x faster incremental updates

---

## 📑 Table of Contents

- [Installation](#-installation)
- [Quick Start](#-quick-start)
- [CLI Commands](#-cli-commands)
- [Authentication](#-authentication)
- [Delta Sync](#-delta-sync)
- [VS Code Extension](#-vs-code-extension)
- [Project Structure](#-project-structure)
- [Testing](#-testing)
- [Configuration](#-configuration)
- [Documentation](#-documentation)
- [Development](#-development)
- [CI/CD Pipelines](#-cicd-pipelines)
- [Use Cases](#-use-cases)

---

## 📦 Installation

### Prerequisites

- Node.js 18.0 or later
- npm or yarn
- VS Code 1.74+ (for extension)

### CLI Installation

```bash
# Clone the repository
git clone https://github.com/AdventureAdept/d365-schema-explorer.git
cd d365-schema-explorer

# Install dependencies
npm install

# Build the project
npm run build

# Link CLI globally (optional)
npm link
```

### VS Code Extension Installation

```bash
# From the repository root
cd vscode-extension
npm install
npm run package

# Install the .vsix file
code --install-extension d365-schema-explorer-0.1.0.vsix
```

Or install from VS Code:
1. Press `Ctrl+Shift+X` (Extensions)
2. Click `...` menu → **Install from VSIX**
3. Select `d365-schema-explorer-0.1.0.vsix`

---

## 🚀 Quick Start

```bash
# 1. Connect to Dataverse
d365ai env connect

# 2. Pull schema (auto delta sync after first pull)
d365ai schema pull

# 3. Check sync status
d365ai schema sync-status

# 4. Search entities
d365ai schema search account

# 5. Export schema
d365ai schema export account --format markdown
```

---

## 📖 CLI Commands

### Environment Commands

| Command | Description |
|---------|-------------|
| `d365ai env connect` | Connect to Dataverse (device code or service principal) |
| `d365ai env disconnect [client]` | Disconnect from environment |
| `d365ai env status` | Show current connection status |
| `d365ai env list` | List all configured environments |
| `d365ai use <client>` | Switch active client |

### Schema Commands

| Command | Description |
|---------|-------------|
| `d365ai schema pull` | Pull full schema from Dataverse |
| `d365ai schema sync-status` | Show last sync time and entity count |
| `d365ai schema search <term>` | Search entities, attributes, relationships |
| `d365ai schema export [entity]` | Export schema to JSON or Markdown |
| `d365ai schema list` | List all entities |

### Impact Commands (Enhanced)

| Command | Description |
|---------|-------------|
| `d365ai impact analyze <target>` | Analyze dependencies for entity/field |
| `d365ai impact graph <target>` | Show dependency graph (Mermaid format) |
| `d365ai impact report <target>` | Generate impact assessment report |

**Enhanced Impact Analysis Features:**

| Feature | Description |
|---------|-------------|
| **Web Resource Scanning** | Finds JavaScript web resources referencing the entity/field |
| **Plugin Code Analysis** | Scans C# plugin code from Azure DevOps repo |
| **Field-Level Analysis** | Search specific field usage: `account.tvs_city` |
| **Code Context** | Shows line numbers, code snippets, function descriptions |
| **Multi-Source** | Combines D365 API, web resources, and plugin code |

**Usage Examples:**

```bash
# Analyze entity (includes web resources and plugin code)
d365ai impact analyze tvs_city

# Analyze specific field
d365ai impact analyze account.tvs_city
# or
d365ai impact analyze --entity account --field tvs_city

# Generate dependency graph
d365ai impact graph tvs_city --format mermaid

# Export report
d365ai impact report tvs_city --format json --output report.json
```

**Output includes:**
- Registered plugins from D365
- Plugin code references from Azure DevOps
- Web resources (JavaScript) using the entity/field
- Forms, views, workflows
- Line numbers and code snippets
- Function descriptions from comments |

---

## 🔐 Authentication

### Device Code Flow (Interactive)

```bash
d365ai env connect
# Follow the URL shown and enter the device code
```

Best for: Personal accounts, development, one-time setup.

### Service Principal (Automated)

```bash
d365ai env connect --tenant-id <id> --client-id <id> --client-secret <secret>
```

Best for: CI/CD, automation, production environments.

**Setup Service Principal:**
1. Register app in Azure AD (Azure Portal → App registrations)
2. Add client secret (Certificates & secrets)
3. Grant `Dynamics CRM → user_impersonation` API permission
4. Add as Application User in Dataverse (Power Platform Admin Center)
5. Assign security role (e.g., System Customizer)

---

## 📊 Delta Sync

After the first full pull, all syncs are **delta syncs**:

| Sync Type | What It Fetches | Speed |
|-----------|-----------------|-------|
| **Full Sync** | All entities, attributes, relationships | Baseline |
| **Delta Sync** | Only items modified since last sync | **10-20x faster** |

Delta sync uses the `ModifiedOn` timestamp from Dataverse to detect changes.

---

## 💻 VS Code Extension

### Features

- **Tree View** — Browse entities → Attributes & Relationships
- **Search** — Quick search across all schema
- **Entity Details** — Full metadata in formatted webview
- **Dependency Graph** — Interactive Mermaid visualization
- **Export** — Export to JSON/Markdown from sidebar
- **Refresh** — Update schema without leaving VS Code

### Usage

1. Open D365 Schema Explorer sidebar (Explorer panel)
2. Click **Connect to Dataverse** and select your client
3. Browse entities, click to view details
4. Right-click for export options
5. Use **Show Dependency Graph** command for visualization

---

## 📁 Project Structure

```
d365-schema-explorer/
├── src/
│   ├── api/              # Dataverse API client
│   ├── auth/             # Authentication (MSAL, keytar)
│   ├── cache/            # Schema cache with delta sync
│   ├── commands/         # CLI commands
│   ├── config/           # Configuration management
│   ├── impact/           # Impact analysis & dependency graph
│   ├── odata/            # OData query validation
│   ├── utils/            # Logger, error handler, async lock
│   └── webview/          # HTML sanitization for XSS
├── vscode-extension/
│   └── src/              # VS Code extension code
├── tests/
│   └── unit/             # Unit tests (vitest)
├── docs/
│   ├── API_REFERENCE.md  # Complete API documentation
│   └── TROUBLESHOOTING.md # Common issues & solutions
└── .github/workflows/    # CI/CD pipelines
```

---

## 🧪 Testing

```bash
# Run unit tests
npm test

# Run with coverage
npm test -- --coverage

# Build and test
npm run build && npm test
```

**Test Coverage:**
- Auth (token storage, retrieval, deletion)
- Query validation (entity/attribute names)
- Retry handler (429/503 retry, 4xx skip)
- Cache manager (backup, corruption recovery)

---

## 🔧 Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATAVERSE_API_VERSION` | `v9.2` | Dataverse WebAPI version |
| `D365AI_CACHE_DIR` | `~/.d365ai/cache` | Schema cache directory |
| `D365AI_CLIENTS_DIR` | `~/.d365ai/clients` | Client config directory |

### Config Files

| Path | Purpose |
|------|---------|
| `~/.d365ai/clients/*.json` | Client configurations |
| `~/.d365ai/clients/*.auth.meta.json` | Token metadata (non-sensitive) |
| `~/.d365ai/cache/*-cache.json` | Schema cache with delta sync |

**OS Keychain:**
- Tokens stored in OS credential manager (not files)
- Windows: Credential Manager
- macOS: Keychain
- Linux: libsecret / GNOME Keyring

---

## 📚 Documentation

| Document | Description |
|----------|-------------|
| [API Reference](docs/API_REFERENCE.md) | Complete CLI command reference |
| [Troubleshooting](docs/TROUBLESHOOTING.md) | Common issues and solutions |
| [README](README.md) | This file — quick start and overview |

---

## 🛠️ Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Watch for changes
npm run watch

# Run linter
npm run lint

# Clean build artifacts
npm run clean
```

### Package VS Code Extension

```bash
cd vscode-extension
npm install
npm run package
# Creates: d365-schema-explorer-0.1.0.vsix
```

---

## 🚀 CI/CD Pipelines

### GitHub Actions Workflows

| Workflow | Trigger | Action |
|----------|---------|--------|
| **CI** | Push/PR to main | Build + Test |
| **Publish NPM** | Release published | `npm publish` |
| **Publish VSCE** | Release published | VS Code Marketplace |

---

## 🎯 Use Cases

### Schema Explorer

| Use Case | How To |
|----------|--------|
| **Browse D365 Schema** | `d365ai schema list` or VS Code tree view |
| **Find Entity Fields** | Search in VS Code or `d365ai schema search <term>` |
| **Export Documentation** | `d365ai schema export <entity> --format markdown` |
| **Sync Schema Changes** | `d365ai schema pull` (delta sync) |

### Impact Analyzer

| Use Case | How To | Output |
|----------|--------|--------|
| **Assess Change Impact** | `d365ai impact analyze <entity>` | Dependencies, risk levels |
| **Find Field Usage** | `d365ai impact analyze <entity>.<field>` | Forms, views, plugins, JS |
| **Visualize Dependencies** | `d365ai impact graph <entity>` | Mermaid diagram |
| **Audit Plugin Code** | `d365ai impact analyze <entity>` | Azure DevOps C# references |
| **Find Web Resource Usage** | `d365ai impact analyze <entity>` | JavaScript files using entity |
| **Generate Reports** | `d365ai impact report <entity> --format json` | JSON/Markdown export |

### Enhanced Impact Analysis (NEW)

**Scenario 1: Rename Field Safely**
```bash
# Check what depends on account.tvs_city
d365ai impact analyze account.tvs_city

# Output shows:
# - Forms using the field
# - Views displaying the field  
# - Plugins referencing the field
# - Web resources (JS) using the field
# - Plugin code from Azure DevOps
```

**Scenario 2: Delete Entity Assessment**
```bash
# Full impact analysis before deleting
d365ai impact analyze tvs_city

# Output shows:
# - 36 plugins registered on entity
# - 12 plugins in code referencing entity
# - 4 web resources using entity
# - 2 forms, 4 views
# - Risk assessment: HIGH
```

**Scenario 3: Code Review**
```bash
# Find all code (C# and JS) using an entity
d365ai impact analyze tvs_city --format json

# Review:
# - Line numbers in plugin code
# - Function descriptions from comments
# - Code snippets for context
```

---

## 🐛 Issues & Support

### Common Issues

| Problem | Solution |
|---------|----------|
| "Not authenticated" | Run `d365ai env connect` |
| "Token expired" | Tokens auto-refresh; if persists, reconnect |
| "Cache corrupted" | Auto-restores from backup; or run `schema pull` |
| "429 Too Many Requests" | Wait 5 min; auto-retry with backoff |
| VS Code extension not loading | Run `env connect` first, then reload window |

### Get Help

- **Documentation:** See [docs/](docs/) folder
- **Verbose Logging:** `export DEBUG=d365ai:*` then run command
- **GitHub Issues:** https://github.com/AdventureAdept/d365-schema-explorer/issues

---

## 📄 License

MIT License — see [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- Microsoft Dataverse Team
- MSAL Node Library
- VS Code Extension API
- Mermaid.js for graph visualization

---

**Built with ❤️ for the D365 Developer Community**
