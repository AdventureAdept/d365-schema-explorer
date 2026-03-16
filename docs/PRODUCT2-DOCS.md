# Product 2: D365 Impact Analyzer

**Enhanced Impact Analysis** — Find dependencies across Dataverse, web resources, and plugin code

![Status](https://img.shields.io/badge/status-v1.0.0-brightgreen)
![License](https://img.shields.io/badge/license-MIT-blue)

---

## 🎯 Overview

Impact Analyzer helps you understand the **full impact of schema changes** before you make them. It scans multiple sources to find where entities and fields are used:

- ✅ **Dataverse API** - Relationships, workflows, business rules
- ✅ **JavaScript Web Resources** - Client-side code usage
- ✅ **C# Plugin Code** - Server-side code from Azure DevOps
- ✅ **Field-Level Analysis** - Specific field usage tracking

---

## 🚀 Quick Start

### Analyze Entity Dependencies

```bash
# Basic analysis
d365ai impact analyze account

# Include web resources
d365ai impact analyze account --webresources

# Include plugin code
d365ai impact analyze account --plugins

# Full analysis (all sources)
d365ai impact analyze account --full
```

### Search Field Usage

```bash
# Search specific field
d365ai impact search account.tvs_city

# Search with context
d365ai impact search account.emailaddress1 --show-code
```

### Generate Impact Report

```bash
# Generate markdown report
d365ai impact report account --output impact-report.md

# Generate JSON report
d365ai impact report contact --format json --output contact-impact.json
```

### Visualize Dependencies

```bash
# Generate dependency graph
d365ai impact graph opportunity

# Open in browser
d365ai impact graph opportunity --open
```

---

## 📊 Features

### Multi-Source Analysis

| Source | What It Scans | Example Output |
|--------|--------------|----------------|
| **Dataverse API** | Relationships, workflows, business rules, views | `account` → `contact` (1:N relationship) |
| **Web Resources** | JavaScript files in Dataverse | `new_script.js` uses `account.name` |
| **Plugin Code** | C# files from Azure DevOps | `AccountPlugin.cs` line 45 accesses `account.email` |

### Field-Level Analysis

```bash
# Find all uses of a specific field
d365ai impact search account.tvs_city

# Output:
Found 5 usages of account.tvs_city:

1. Web Resource: new_address_validator.js (line 23)
   validateCity(formContext.getDataValue("tvs_city"));

2. Plugin: AddressValidationPlugin.cs (line 67)
   var city = entity.GetAttributeValue<string>("tvs_city");

3. Business Rule: Account BR Rules
   Field used in condition: tvs_city equals "New York"

4. Workflow: Account Update Workflow
   Field used in email template

5. View: Active Accounts
   Column displayed in view
```

### Code Context

Impact Analyzer shows **actual code snippets** with context:

```
📄 File: new_address_validator.js
📍 Line: 23
📝 Function: validateAddress

function validateAddress(formContext) {
    const city = formContext.getDataValue("tvs_city");
    // ↑ Field usage found here
    if (!city) {
        throw new Error("City is required");
    }
}
```

---

## 🔧 Configuration

### Azure DevOps Integration (for Plugin Analysis)

To analyze C# plugin code, configure Azure DevOps access:

```bash
# Set Azure DevOps credentials
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_REPO="your-repo"
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

### Analysis Options

| Option | Description | Default |
|--------|-------------|---------|
| `--webresources` | Include JavaScript web resources | false |
| `--plugins` | Include C# plugin code | false |
| `--full` | All sources | false |
| `--show-code` | Show code snippets | false |
| `--max-files` | Max files to scan | 1000 |
| `--timeout` | Analysis timeout (seconds) | 25 |

---

## 📈 Use Cases

### Use Case 1: Rename Field

**Before renaming `account.tvs_city` to `account.tvs_municipality`:**

```bash
d365ai impact search account.tvs_city --show-code
```

**Review output:**
- 5 usages found
- 2 in web resources (need update)
- 2 in plugins (need redeploy)
- 1 in business rule (auto-updates)

**Action:** Update code, test, then rename.

---

### Use Case 2: Delete Entity

**Before deleting custom entity `tvs_log`:**

```bash
d365ai impact analyze tvs_log --full
```

**Review dependency graph:**
- 3 plugins reference it
- 2 workflows use it
- 1 view displays it

**Action:** Remove dependencies first, then delete.

---

### Use Case 3: Code Review

**Review all plugin code that accesses sensitive fields:**

```bash
d365ai impact search account.creditlimit --show-code
```

**Audit usage:**
- Check for proper validation
- Verify security roles
- Ensure logging is in place

---

## 🏗️ Architecture

```
src/impact/
├── graph-builder.ts      # Build dependency graph
├── types.ts              # Type definitions
├── webresource-client.ts # Fetch & parse web resources
└── plugin-code-analyzer.ts # Scan C# plugin code
```

### Analysis Flow

```
1. User Request
   ↓
2. Fetch Entity Metadata (D365 API)
   ↓
3. Scan Web Resources (parallel)
   ↓
4. Scan Plugin Code (parallel)
   ↓
5. Build Dependency Graph
   ↓
6. Generate Report
```

---

## 🧪 Testing

### Run Tests

```bash
npm test -- impact
```

### Test Scenarios

- ✅ Entity with no dependencies
- ✅ Entity with relationships only
- ✅ Entity with web resource usage
- ✅ Entity with plugin code usage
- ✅ Field-level search
- ✅ Large codebase (10,000+ files)

---

## 📊 Performance

| Scenario | Time | Files Scanned |
|----------|------|---------------|
| Small org (< 100 entities) | 2-5s | 50-200 |
| Medium org (< 500 entities) | 10-15s | 500-2000 |
| Large org (> 1000 entities) | 20-30s | 5000-10000 |

**Optimizations:**
- Parallel processing (web + plugins)
- Paginated API calls
- 25s timeout with graceful fallback
- Concurrency limits (10 web, 20 plugins)

---

## 🔒 Security

- ✅ Path traversal validation
- ✅ Input sanitization (regex escaping)
- ✅ File size limits (10MB plugins, 500KB web resources)
- ✅ File count limits (10,000 max)
- ✅ Async file operations (non-blocking)

---

## 📝 Example Output

### JSON Output

```json
{
  "entity": "account",
  "timestamp": "2026-03-16T15:00:00Z",
  "dependencies": {
    "relationships": [
      {
        "type": "1:N",
        "target": "contact",
        "name": "account_primary_contact"
      }
    ],
    "webResources": [
      {
        "name": "new_address_validator.js",
        "usages": [
          {
            "line": 23,
            "field": "tvs_city",
            "function": "validateAddress",
            "snippet": "const city = formContext.getDataValue(\"tvs_city\");"
          }
        ]
      }
    ],
    "plugins": [
      {
        "file": "AccountPlugin.cs",
        "line": 67,
        "field": "tvs_city",
        "method": "Execute",
        "snippet": "var city = entity.GetAttributeValue<string>(\"tvs_city\");"
      }
    ]
  }
}
```

---

## 🤝 Integration with Product 1

Impact Analyzer uses Schema Explorer's metadata:

```bash
# Schema Explorer pulls metadata
d365ai schema pull

# Impact Analyzer uses cached metadata
d365ai impact analyze account
```

**No need to reconnect** - both products share the same cache!

---

## 📚 Related

- [Product 1: Schema Explorer](./PRODUCT1-DOCS.md)
- [API Documentation](./API.md)
- [VS Code Extension Guide](../vscode-extension/README.md)

---

**Need help?** Open an issue or check the [FAQ](./FAQ.md).
