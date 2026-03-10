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

### 🔐 Security (Phase 1)
- ✅ **OS Credential Manager** — Tokens stored in OS keychain (not plain text)
- ✅ **XSS Protection** — All webview content HTML-escaped
- ✅ **Input Validation** — Strict patterns prevent OData injection
- ✅ **API Retry Logic** — Exponential backoff for transient failures
- ✅ **Rate Limit Handling** — Automatic retry on 429 errors

### 🛡️ Reliability (Phase 2)
- ✅ **Unit Test Suite** — Tests for auth, validation, retry, cache
- ✅ **Error Handling** — Custom error types with context logging
- ✅ **Token Refresh Locking** — Prevents concurrent refresh race conditions
- ✅ **Cache Backup** — Auto-backup before writes, corruption recovery
- ✅ **Request Timeouts** — 30s default timeout on all API calls
- ✅ **Null Safety** — Strict TypeScript null checks throughout

### 🏗️ Infrastructure (Phase 3)
- ✅ **CI/CD Pipelines** — GitHub Actions for build, test, publish
- ✅ **Configurable API Version** — `DATAVERSE_API_VERSION` env var
- ✅ **Dependency Graph GUI** — Interactive Mermaid viewer in VS Code

### 📚 Documentation (Phase 4)
- ✅ **API Reference** — Complete CLI command documentation
- ✅ **Troubleshooting Guide** — Common issues with solutions
- ✅ **CSP Headers** — Secure webview configuration

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

### Impact Commands

| Command | Description |
|---------|-------------|
| `d365ai impact analyze <target>` | Analyze dependencies for entity/field |
| `d365ai impact graph <target>` | Show dependency graph (Mermaid format) |
| `d365ai impact report <target>` | Generate impact assessment report |

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

## 📈 Roadmap

### ✅ Product 1: Schema Explorer (MVP Complete)
- CLI with env, schema, impact commands
- VS Code extension with tree view + graph viewer
- Security, stability, infrastructure, polish (Phases 1-4)

### ✅ Product 2: Impact Analyzer (Bundled)
- Dependency graph builder
- Impact analysis and reports
- Mermaid/DOT export

### 📋 Product 3: Code Assistant (Future)
- AI-powered plugin code generation
- Code review with D365 best practices
- Unit test generation (FakeXrmEasy)

### 📋 Product 4: DevOps Bridge (Future)
- PAC CLI integration
- Azure DevOps pipeline triggers
- Solution export/import automation

### 📋 Product 5: Project Hub (Future)
- Jira integration
- Architecture recommendations
- Auto-generated technical docs

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
