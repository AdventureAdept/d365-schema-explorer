# 🦞 D365 Tools

**2 Products in 1 Repository** — Comprehensive tools for Dynamics 365 developers

![Status](https://img.shields.io/badge/status-Production%20Ready-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)
![Node](https://img.shields.io/badge/node-%3E%3D18.0.0-green)
![TypeScript](https://img.shields.io/badge/typescript-5.9.3-blue)

---

## 📦 What's Included

This repository contains **2 complete products**:

| Product | Name | Description | Status |
|---------|------|-------------|--------|
| **Product 1** | 🗂️ **Schema Explorer** | Browse, search, and export Dataverse schema | ✅ **v1.0.0** |
| **Product 2** | 🔍 **Impact Analyzer** | Analyze dependencies and change impact | ✅ **v1.0.0** |

---

## 🎯 Use Cases

### When to Use Schema Explorer (Product 1)

- You need to **browse entities and fields** in Dataverse
- You want to **search schema** without opening D365
- You need to **export schema documentation**
- You want **VS Code integration** for schema browsing
- You need **fast delta sync** (10-20x faster than full sync)

### When to Use Impact Analyzer (Product 2)

- You're **renaming or deleting** an entity/field
- You need to find **what uses a specific field**
- You want to analyze **plugin and web resource dependencies**
- You need **dependency graphs** before making changes
- You want to **prevent breaking changes** in production

---

## ✨ Key Features

### Product 1: Schema Explorer

- **Browse** Dataverse schema (entities, attributes, relationships)
- **Search** across all metadata with instant results
- **Export** schema documentation in JSON/Markdown
- **VS Code Extension** with tree view and search
- **Delta Sync** - 10-20x faster incremental updates
- **Multi-Environment** - Manage connections to multiple orgs
- **Secure Auth** - MSAL with token encryption

### Product 2: Impact Analyzer

- **Dependency Detection** - Find all uses of an entity/field
- **Multi-Source Analysis**:
  - D365 API (relationships, workflows, business rules)
  - JavaScript web resources
  - C# plugin code (Azure DevOps integration)
- **Field-Level Analysis** - Search specific field usage
- **Code Context** - Shows line numbers and code snippets
- **Visual Graphs** - Interactive dependency visualization
- **Change Impact Reports** - Before you rename/delete

---

## 🚀 Quick Start

### Installation

```bash
# Clone the repository
git clone https://github.com/AdventureAdept/d365-tools.git
cd d365-tools

# Install dependencies
npm install

# Build both products
npm run build
```

### Product 1: Schema Explorer - Quick Start

```bash
# Connect to Dataverse
d365ai env connect

# Pull schema metadata
d365ai schema pull

# Search for entities
d365ai search entity account

# Export schema
d365ai export account --format markdown
```

### Product 2: Impact Analyzer - Quick Start

```bash
# Analyze entity dependencies
d365ai impact analyze account

# Search field usage
d365ai impact search account.tvs_city

# Generate impact report
d365ai impact report account --output impact-report.md

# Visualize dependencies
d365ai impact graph contact
```

---

## 📖 Documentation

| Product | Documentation |
|---------|--------------|
| **Product 1** | [Schema Explorer Docs](./docs/PRODUCT1-DOCS.md) |
| **Product 2** | [Impact Analyzer Docs](./docs/PRODUCT2-DOCS.md) |
| **API Reference** | [API Documentation](./docs/API.md) |
| **VS Code Extension** | [Extension Guide](./vscode-extension/README.md) |

---

## 🛠️ VS Code Extension

Both products are available in a **single VS Code extension**:

### Features

- **Schema Tree View** - Browse entities in sidebar
- **Search Panel** - Quick schema search
- **Dependency Graphs** - Visual impact analysis
- **Code Lens** - Inline schema information
- **Right-Click Actions** - Context menu integration

### Install

```bash
cd vscode-extension
npm install
npm run package

# Install the .vsix
code --install-extension d365-schema-tools-0.1.0.vsix
```

---

## 📊 Product Comparison

| Feature | Schema Explorer | Impact Analyzer |
|---------|----------------|-----------------|
| **Browse Schema** | ✅ Yes | ❌ No |
| **Search Entities** | ✅ Yes | ❌ No |
| **Export Schema** | ✅ Yes | ❌ No |
| **Dependency Analysis** | ❌ No | ✅ Yes |
| **Field Usage Search** | ❌ No | ✅ Yes |
| **Plugin Code Analysis** | ❌ No | ✅ Yes |
| **Web Resource Scan** | ❌ No | ✅ Yes |
| **Impact Reports** | ❌ No | ✅ Yes |
| **Dependency Graphs** | ❌ No | ✅ Yes |

---

## 🏗️ Architecture

```
d365-schema-tools/
├── src/
│   ├── api/              # Shared API clients
│   ├── commands/         # CLI commands
│   ├── schema/           # Product 1: Schema Explorer
│   ├── impact/           # Product 2: Impact Analyzer
│   └── utils/            # Shared utilities
├── vscode-extension/     # Combined VS Code extension
├── docs/                 # Documentation
│   ├── PRODUCT1-DOCS.md
│   ├── PRODUCT2-DOCS.md
│   └── API.md
└── tests/                # Test suites
```

---

## 🔧 Development

### Build Both Products

```bash
npm run build
```

### Run Tests

```bash
npm test
```

### Development Mode

```bash
# Watch mode for both products
npm run dev
```

---

## 📦 Publishing

### NPM Package

```bash
npm publish
```

### VS Code Marketplace

```bash
cd vscode-extension
vsce package
vsce publish
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🙏 Acknowledgments

- Built with [Microsoft Dataverse Web API](https://docs.microsoft.com/en-us/power-apps/developer/data-platform/webapi/)
- Uses [MSAL.js](https://github.com/AzureAD/microsoft-authentication-library-for-js) for authentication
- VS Code Extension API

---

**Questions?** Open an issue or contact the maintainer.
