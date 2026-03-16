# Tutorial: Use the VS Code Extension

**Learn how to browse Dataverse schema and analyze impact directly in VS Code.**

---

## When to Use This

Use the VS Code extension when you need to:

- 🗂️ Browse schema without leaving your editor
- 🔍 Quick lookup of entity/field names while coding
- 📊 View dependency graphs inline
- 💡 Get schema context during development
- ⚡ Fast access to metadata during plugin/web resource development

---

## Installation

### From VSIX File

```bash
# Navigate to the extension folder
cd vscode-extension

# Build the extension
npm install
npm run package

# Install the .vsix file
code --install-extension d365-tools-0.1.0.vsix
```

### From VS Code Marketplace (Coming Soon)

1. Open VS Code
2. Press `Ctrl+Shift+X` (Extensions)
3. Search for "D365 Tools"
4. Click **Install**

---

## Quick Start

### 1. Connect to Dataverse

The extension uses the same connection as the CLI:

```bash
d365ai env connect
```

Once connected in CLI, the extension automatically detects the connection.

---

### 2. Open the Sidebar

1. Click the **D365 Schema** icon in the Activity Bar (left sidebar)
2. Or press `Ctrl+Shift+D` (Windows/Linux) / `Cmd+Shift+D` (Mac)

---

### 3. Browse Entities

The sidebar shows:

```
📊 D365 Schema
├── 🔍 Search
├── 🗂️ Entities
│   ├── account
│   ├── contact
│   ├── opportunity
│   └── ...
└── ⚙️ Settings
```

**Click an entity** to see:
- Display name and logical name
- Primary key
- All attributes
- Relationships

---

## Features

### 🔍 Schema Search

**Access:** Click the search box at top of sidebar

**Search types:**
- Entity names
- Field names
- Display names

**Example:**
```
Search: "email"

Results:
- account.emailaddress1
- contact.emailaddress1
- lead.emailaddress1
```

**Click a result** to navigate to that entity/field.

---

### 🗂️ Entity Tree View

**Browse entities alphabetically:**

1. Expand **Entities** node
2. Scroll or type to filter
3. Click entity to view details

**Entity details panel shows:**
```
Account
Logical Name: account
Primary Key: accountid

Attributes (45)
├── accountid (Uniqueidentifier)
├── name (String, Required)
├── accountnumber (String)
├── telephone1 (String)
└── ...

Relationships (12)
├── 1:N
│   ├── account_primary_contact → contact
│   └── ...
├── N:1
│   ├── account_originatinglead → lead
│   └── ...
└── N:N
    └── account_contacts ↔ contact
```

---

### 📊 Dependency Graph

**View visual dependency graph:**

1. Right-click an entity
2. Select **Show Dependency Graph**
3. Graph opens in new tab

**Graph shows:**
- Entity relationships (1:N, N:1, N:N)
- Plugin dependencies (if analyzed)
- Web resource usage (if analyzed)

**Interact with graph:**
- **Zoom:** Mouse wheel
- **Pan:** Click and drag
- **Click node:** See details
- **Double-click:** Navigate to entity

---

### 💡 Code Lens Integration

**While coding plugins or web resources:**

The extension adds inline hints:

```typescript
// Retrieve account record
const account = await Xrm.WebApi.retrieveRecord(
  "account",                    // ← Hover: Shows entity details
  accountId,
  "?$select=name,accountnumber" // ← Hover: Shows field types
);
```

**Hover over entity/field names** to see:
- Display name
- Data type
- Required status
- Max length (for strings)

---

### 🔗 Right-Click Actions

**Right-click an entity:**

- **Show Dependency Graph** - Visual graph
- **Export as JSON** - Save to file
- **Export as Markdown** - Generate docs
- **Copy Logical Name** - To clipboard
- **Search Usage** - Find dependencies (Impact Analyzer)

**Right-click a field:**

- **Copy Logical Name** - To clipboard
- **Copy Schema Name** - To clipboard
- **Search Usage** - Find where used
- **Show Details** - Full metadata

---

## Real-World Scenarios

### Scenario 1: Plugin Development

**Goal:** Write a plugin for Account entity

**Workflow:**
1. Open VS Code extension sidebar
2. Browse to **account** entity
3. Review fields and relationships
4. Right-click → **Copy Logical Name**
5. Paste into plugin code
6. Hover over field names to verify types

**Benefit:** No need to switch to D365 or XrmToolBox!

---

### Scenario 2: Web Resource Development

**Goal:** Create form script for Contact entity

**Workflow:**
1. Open extension sidebar
2. Search for "email"
3. Find `contact.emailaddress1`
4. Right-click → **Copy Logical Name**
5. Use in form script
6. Code Lens shows field type hints

**Benefit:** Prevents typos and type mismatches!

---

### Scenario 3: Impact Analysis While Coding

**Goal:** Check if renaming a field will break code

**Workflow:**
1. Right-click field in sidebar
2. Select **Search Usage**
3. Review dependencies in output panel
4. See plugins, web resources, workflows using it

**Benefit:** Catch breaking changes before deployment!

---

### Scenario 4: Quick Schema Reference

**Goal:** Need logical name during code review

**Workflow:**
1. Press `Ctrl+Shift+D` to open sidebar
2. Search for field name
3. Copy logical name
4. Continue code review

**Benefit:** Faster than opening browser!

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+Shift+D` | Open D365 Schema sidebar |
| `Ctrl+Shift+P` → "D365: Search" | Quick search |
| `Ctrl+Shift+P` → "D365: Refresh" | Refresh schema cache |
| `Ctrl+Shift+P` → "D365: Connect" | Connect to environment |

---

## Settings

**Access:** File → Preferences → Settings → Search "D365"

| Setting | Default | Description |
|---------|---------|-------------|
| `d365-tools.environment` | Current | Default environment to use |
| `d365-tools.autoRefresh` | `false` | Auto-refresh on file save |
| `d365-tools.showTypes` | `true` | Show field types in tree |
| `d365-tools.graphLayout` | `hierarchical` | Default graph layout |

---

## Troubleshooting

### Extension Not Showing in Sidebar

**Cause:** Extension not installed or disabled

**Fix:**
1. Press `Ctrl+Shift+X` (Extensions)
2. Search for "D365 Tools"
3. Enable or reinstall

---

### "No Connection Found" Error

**Cause:** CLI not connected to Dataverse

**Fix:**
```bash
d365ai env connect
```

Then reload VS Code window (`Ctrl+Shift+P` → "Developer: Reload Window")

---

### Schema Not Loading

**Cause:** Schema cache empty or corrupted

**Fix:**
```bash
# Pull fresh schema
d365ai schema pull --force

# Then refresh extension
Ctrl+Shift+P → "D365: Refresh"
```

---

### Dependency Graph Not Opening

**Cause:** Missing graphviz dependency

**Fix:**
```bash
# Install graphviz
npm install -g graphviz

# Or use built-in viewer
Settings → d365-tools.graphLayout → "built-in"
```

---

## Next Steps

- 📚 [Connect to Dataverse](./connect-to-dataverse.md)
- 🔍 [Analyze Impact](./analyze-impact.md)
- 📦 [Export Schema](./export-schema.md)

---

**💡 Pro Tip:** Keep the D365 sidebar open while coding—hover hints save countless lookup trips!
