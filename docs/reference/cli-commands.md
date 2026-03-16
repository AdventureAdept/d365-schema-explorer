# CLI Command Reference

**Complete reference for all `d365ai` commands and flags.**

---

## Table of Contents

- [Environment Commands](#environment-commands)
- [Schema Commands](#schema-commands)
- [Search Commands](#search-commands)
- [Impact Commands](#impact-commands)
- [Export Commands](#export-commands)
- [Global Flags](#global-flags)

---

## Environment Commands

### `d365ai env connect`

Connect to a Dataverse environment.

```bash
d365ai env connect [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--url <url>` | Organization URL | (prompted) |
| `--name <name>` | Friendly name for connection | (prompted) |
| `--tenant <id>` | Azure AD Tenant ID | `organizations` |
| `--client-id <id>` | Application (client) ID | (default public client) |
| `--client-secret <secret>` | Client secret for service principal | (optional) |

**Interactive mode:**
```bash
d365ai env connect
# Prompts for all required information
```

**Service principal mode:**
```bash
d365ai env connect \
  --url https://yourorg.crm.dynamics.com \
  --name Production \
  --tenant 9ffd1050-5319-41ca-b384-09122ed336d0 \
  --client-id ef356da8-abc2-42ec-9fb7-fb0645467578 \
  --client-secret "your-secret"
```

---

### `d365ai env list`

List all connected environments.

```bash
d365ai env list
```

**Output:**
```
Connected environments:

  Production
    URL: https://yourorg.crm.dynamics.com
    Auth: Service Principal
    Status: ✅ Active

  Development
    URL: https://yourorgdev.crm.dynamics.com
    Auth: Interactive
    Status: ✅ Active
```

---

### `d365ai env disconnect`

Disconnect from an environment.

```bash
d365ai env disconnect <name>
```

**Example:**
```bash
d365ai env disconnect Production
```

---

### `d365ai env refresh`

Refresh authentication token.

```bash
d365ai env refresh [name]
```

If no name provided, refreshes current environment.

---

## Schema Commands

### `d365ai schema pull`

Pull schema metadata from Dataverse.

```bash
d365ai schema pull [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--delta` | Pull only changes since last sync | Auto-detect |
| `--full` | Force full sync | `false` |
| `--force` | Force refresh (ignore cache) | `false` |
| `--entities <list>` | Comma-separated entity list | All entities |

**Examples:**
```bash
# Auto-detect delta vs full
d365ai schema pull

# Force delta sync
d365ai schema pull --delta

# Force full sync
d365ai schema pull --full

# Pull specific entities only
d365ai schema pull --entities account,contact,opportunity
```

**Performance:**
- **Delta sync:** 3-5 seconds (10-20 API calls)
- **Full sync:** 60 seconds (500+ API calls)

---

### `d365ai schema status`

Show schema sync status.

```bash
d365ai schema status
```

**Output:**
```
Schema Status:
  Last sync: 2026-03-16 15:30:00
  Entities: 245
  Attributes: 3,456
  Relationships: 1,234
  Sync type: Delta
  Duration: 4.2s
```

---

## Search Commands

### `d365ai search entity`

Search for entities by name.

```bash
d365ai search entity <query> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--exact` | Exact match only | `false` |
| `--limit <n>` | Max results | 10 |

**Examples:**
```bash
# Search for entities containing "account"
d365ai search entity account

# Exact match
d365ai search entity account --exact

# Limit results
d365ai search entity account --limit 5
```

---

### `d365ai search field`

Search for fields by name.

```bash
d365ai search field <query> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--entity <name>` | Filter by entity | All entities |
| `--exact` | Exact match only | `false` |
| `--limit <n>` | Max results | 10 |

**Examples:**
```bash
# Search for fields containing "city"
d365ai search field city

# Search in specific entity
d365ai search field city --entity account

# Exact match
d365ai search field emailaddress1 --exact
```

---

### `d365ai search relationship`

Search for relationships.

```bash
d365ai search relationship <entity> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--type <type>` | Filter by type (1:N, N:1, N:N) | All types |
| `--related <entity>` | Filter by related entity | All related |

**Examples:**
```bash
# All relationships for account
d365ai search relationship account

# Only 1:N relationships
d365ai search relationship account --type 1:N

# Relationships with contact
d365ai search relationship account --related contact
```

---

## Impact Commands

### `d365ai impact analyze`

Analyze dependencies for an entity.

```bash
d365ai impact analyze <entity> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--webresources` | Include web resources | `false` |
| `--plugins` | Include plugin code | `false` |
| `--full` | All sources | `false` |
| `--show-code` | Show code snippets | `false` |
| `--max-files <n>` | Max files to scan | 1000 |
| `--timeout <seconds>` | Analysis timeout | 25 |

**Examples:**
```bash
# Basic analysis (D365 API only)
d365ai impact analyze account

# Include web resources
d365ai impact analyze account --webresources

# Include plugin code
d365ai impact analyze account --plugins

# Full analysis (all sources)
d365ai impact analyze account --full

# Show code snippets
d365ai impact analyze account --show-code
```

---

### `d365ai impact search`

Search for field usage across all sources.

```bash
d365ai impact search <entity.field> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--show-code` | Show code snippets | `false` |
| `--context <lines>` | Lines of context | 3 |
| `--format <format>` | Output format (console/json/md) | `console` |

**Examples:**
```bash
# Find all uses of a field
d365ai impact search account.tvs_city

# Show code snippets
d365ai impact search account.tvs_city --show-code

# JSON output
d365ai impact search account.tvs_city --format json
```

---

### `d365ai impact report`

Generate impact analysis report.

```bash
d365ai impact report <entity> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--output <file>` | Output file path | Console |
| `--format <format>` | Output format (md/json) | `md` |
| `--webresources` | Include web resources | `false` |
| `--plugins` | Include plugin code | `false` |

**Examples:**
```bash
# Markdown report
d365ai impact report account --output report.md

# JSON report
d365ai impact report account --format json --output report.json

# Full report with all sources
d365ai impact report account --full --output full-report.md
```

---

### `d365ai impact graph`

Generate interactive dependency graph.

```bash
d365ai impact graph <entity> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--open` | Open in browser | `false` |
| `--output <file>` | Output HTML file | Auto-generated |
| `--depth <n>` | Graph depth (levels) | 2 |

**Examples:**
```bash
# Generate graph
d365ai impact graph opportunity

# Open in browser
d365ai impact graph opportunity --open

# Deeper graph (3 levels)
d365ai impact graph opportunity --depth 3
```

---

## Export Commands

### `d365ai export`

Export schema documentation.

```bash
d365ai export <entity> [options]
```

**Options:**
| Flag | Description | Default |
|------|-------------|---------|
| `--format <format>` | Output format (json/md/csv) | `json` |
| `--output <file>` | Output file path | Console |
| `--include-relationships` | Include relationships | `false` |
| `--include-attributes` | Include attributes | `true` |

**Examples:**
```bash
# Export as JSON
d365ai export account --format json

# Export as Markdown
d365ai export account --format markdown --output account.md

# Export as CSV
d365ai export account --format csv --output account.csv

# Include relationships
d365ai export account --include-relationships
```

---

## Global Flags

These flags work with all commands:

| Flag | Description |
|------|-------------|
| `--env <name>` | Use specific environment |
| `--verbose` | Verbose output |
| `--quiet` | Minimal output |
| `--help` | Show help for command |
| `--version` | Show version number |

**Examples:**
```bash
# Use specific environment
d365ai schema pull --env Production

# Verbose output (debugging)
d365ai impact analyze account --verbose

# Quiet mode (scripts)
d365ai schema pull --quiet
```

---

## Quick Reference Card

### Most Common Commands

```bash
# Connect to environment
d365ai env connect

# Pull schema (delta sync)
d365ai schema pull

# Search for entity
d365ai search entity account

# Find field usage (before renaming!)
d365ai impact search account.fieldname --show-code

# Analyze full impact
d365ai impact analyze account --full

# Export schema
d365ai export account --format markdown
```

---

**💡 Tip:** Use `d365ai <command> --help` for detailed help on any command.
