# 🦞 D365 Tools

**A lightning-fast CLI to browse Dataverse schema and analyze dependency impact before you break production.**

![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-blue)
![NPM](https://img.shields.io/npm/v/d365-tools)
![Build](https://img.shields.io/github/actions/workflow/status/AdventureAdept/d365-tools/ci.yml)

---

## 🎬 Quick Demo

> **[INSERT: 10-second terminal GIF showing `d365ai impact search account.tvs_city` in action]**

*Figure: Finding all uses of a field in 2 seconds*

---

## ✨ Features

### 🗂️ Schema Management

- **Browse Schema** — Explore entities, attributes, and relationships
- **Search Entities** — Find entities and fields instantly
- **Export Schema** — Export as JSON, Markdown, or CSV
- **Delta Sync** — 10-20x faster incremental updates (3-5s vs 60s)
- **Multi-Environment** — Manage connections to Dev, Test, Prod
- **VS Code Extension** — Tree view, search panel, Code Lens

### 🔍 Impact Analysis

- **Dependency Detection** — Find all uses of an entity or field
- **Multi-Source Scanning**:
  - Dataverse API (relationships, workflows, business rules)
  - JavaScript web resources
  - C# plugin code (Azure DevOps integration)
- **Field-Level Analysis** — Search specific field usage (e.g., `account.tvs_city`)
- **Code Context** — Shows line numbers and code snippets
- **Visual Graphs** — Interactive dependency visualization
- **Impact Reports** — Markdown/JSON reports for change review

---

## ⚡ Quick Start (5 Minutes)

### Prerequisites

- ✅ Node.js 18.0+
- ✅ Dataverse environment URL (e.g., `https://yourorg.crm.dynamics.com`)
- ✅ Azure AD App Registration (for non-interactive login) **OR** use interactive device flow

### Install

```bash
npm install -g d365-tools
```

### Connect

```bash
d365ai env connect
```

**You'll be prompted for:**
- Organization URL
- Client name (friendly name for this connection)
- Interactive login via device code (or provide Client ID/Secret for service principal)

### Pull Schema

```bash
d365ai schema pull
```

### Search & Analyze

```bash
# Search for entities
d365ai search entity account

# Find field dependencies (prevents breaking changes!)
d365ai impact search account.tvs_city

# Analyze full impact before renaming
d365ai impact analyze account --full
```

---

## 🎯 Use Cases

### 🔧 Scenario 1: Rename Field (Without Breaking Production)

**Problem:** You need to rename `account.tvs_city` to `account.tvs_municipality`

**Solution:**
```bash
# 1. Find all usages first
d365ai impact search account.tvs_city --show-code

# 2. Review output - shows plugins, web resources, workflows
# 3. Update code, test, then rename
```

**Why:** Prevents 5 hidden dependencies from breaking in production.

---

### 🔍 Scenario 2: Before Deleting Custom Entity

**Problem:** Is it safe to delete `tvs_log` entity?

**Solution:**
```bash
d365ai impact analyze tvs_log --full
```

**Output:** Shows 3 plugins, 2 workflows, 1 view using it.

**Action:** Remove dependencies first, then delete safely.

---

### 📊 Scenario 3: Code Review - Audit Sensitive Field Access

**Problem:** Who's accessing `account.creditlimit`?

**Solution:**
```bash
d365ai impact search account.creditlimit --show-code
```

**Audit:** Check for proper validation, security roles, and logging.

---

## 📸 Visual Proof

### VS Code Extension

> **[INSERT: Screenshot of VS Code Tree View showing entity browser]**

*Figure: Browse Dataverse schema directly in VS Code*

### Dependency Graph

> **[INSERT: Screenshot of interactive dependency graph visualization]**

*Figure: Visual impact analysis before schema changes*

### Terminal Demo

> **[INSERT: GIF created with vhs showing delta sync speed]**

*Figure: Delta sync completes in 3 seconds (vs 60 seconds for full sync)*

---

## 🏗️ Architecture

```
.
├── 📂 src
│   ├── 🔌 api/          # Dataverse & Azure DevOps connectivity
│   ├── 🛠️ commands/     # CLI entry points (d365ai)
│   ├── 🗂️ schema/       # Schema management (browse, search, export)
│   └── 🔍 impact/       # Impact analysis (dependencies, graphs)
├── 💻 vscode-extension/ # Tree view, WebView, Code Lens
├── 📚 docs/
│   ├── tutorials/       # How-to guides
│   ├── reference/       # CLI flags, API docs
│   └── explanation/     # Architecture, design decisions
└── 🧪 tests/            # Unit & Integration (Vitest)
```

---

## 🚀 Performance

### Delta Sync: 10-20x Faster

| Sync Type | Time | API Calls |
|-----------|------|-----------|
| **Full Sync** | 60s | 500+ |
| **Delta Sync** | 3-5s | 10-20 |

**How?** Uses ETag headers and delta-token tracking to fetch only changed metadata since last sync.

---

## 🔒 Security

### Token Storage

✅ **OS Keychain/Secret Store** - Tokens encrypted using:
- Windows: Credential Manager
- macOS: Keychain
- Linux: libsecret (GNOME Keyring/KWallet)

**Never stored in plain text!**

### Authentication

- **MSAL.js** with device flow (interactive)
- **Service Principal** support (client credentials)
- **Automatic token refresh** (no manual re-auth)

---

## 🎯 Common Workflows

### Workflow 1: Rename Field Safely

```bash
# 1. Find the field
d365ai search field city

# 2. Check all usages before renaming
d365ai impact search account.tvs_city --show-code

# 3. Review dependencies (plugins, web resources, workflows)
# 4. Update code, test, then rename in Dataverse
```

### Workflow 2: Delete Entity Safely

```bash
# 1. Analyze full impact
d365ai impact analyze tvs_log --full

# 2. Review dependencies
# 3. Remove/update dependencies
# 4. Delete entity safely
```

### Workflow 3: Code Review

```bash
# Audit who's accessing sensitive fields
d365ai impact search account.creditlimit --show-code

# Check for validation, security roles, logging
```

---

## 📖 Documentation

| Type | Content |
|------|---------|
| **📚 Tutorials** | [Connect to Dataverse](./docs/tutorials/connect.md) • [Analyze Impact](./docs/tutorials/analyze-impact.md) • [Before Renaming Field](./docs/tutorials/before-rename.md) |
| **📋 Reference** | [CLI Commands](./docs/reference/cli-commands.md) • [API Reference](./docs/reference/api.md) |
| **💡 Explanation** | [Architecture](./docs/explanation/architecture.md) • [Delta Sync Design](./docs/explanation/delta-sync.md) |

---

## 🛠️ Development Setup

### Clone & Install

```bash
git clone https://github.com/AdventureAdept/d365-tools.git
cd d365-tools
npm install
```

### Link Locally (for testing)

```bash
npm link
d365ai --version  # Test your local changes
```

### Run Tests

```bash
npm test
```

### Build

```bash
npm run build
```

---

## 🤝 Contributing

### Quick Start for Contributors

1. **Fork** the repository
2. **Create branch:** `git checkout -b feature/your-feature`
3. **Make changes** and test locally with `npm link`
4. **Run tests:** `npm test`
5. **Submit PR** with description of changes

### Development Tips

- Use `npm link` to test CLI changes in real-time
- Run `npm run watch` for auto-rebuild during development
- Add tests for new features (Vitest)
- Update docs in the same PR as code changes

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [Microsoft Dataverse Web API](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/)
- Uses [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js) for authentication
- VS Code Extension API

---

## 📞 Support

**Questions?** 
- 📖 [Read the docs](./docs/)
- 🐛 [Open an issue](https://github.com/AdventureAdept/d365-tools/issues)
- 💬 [Discussions](https://github.com/AdventureAdept/d365-tools/discussions)

---

**Made with ❤️ for Dynamics 365 developers**
