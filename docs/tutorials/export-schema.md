# Tutorial: Export Schema Metadata

**Learn how to export Dataverse schema documentation in multiple formats.**

---

## When to Use This

Export schema when you need to:

- 📋 Generate documentation for your team
- 📊 Create offline reference materials
- 🔍 Review schema without connecting to Dataverse
- 📦 Share schema with clients or stakeholders
- 📝 Archive schema for compliance

---

## Quick Examples

### Export Single Entity

```bash
# Export as JSON
d365ai export account --format json --output account.json

# Export as Markdown
d365ai export account --format markdown --output account.md

# Export as CSV
d365ai export account --format csv --output account.csv
```

### Export Multiple Entities

```bash
# Export specific entities
d365ai export account,contact,opportunity --format markdown

# Export all entities (large output!)
d365ai export all --format json --output full-schema.json
```

---

## Export Formats

### JSON Format

**Best for:** Programmatic access, integration with other tools

```bash
d365ai export account --format json --output account.json
```

**Output structure:**
```json
{
  "entity": "account",
  "logicalName": "account",
  "displayName": "Account",
  "attributes": [
    {
      "logicalName": "name",
      "displayName": "Account Name",
      "type": "String",
      "maxLength": 160,
      "required": true
    }
  ],
  "relationships": [...]
}
```

---

### Markdown Format

**Best for:** Human-readable documentation, wikis, README files

```bash
d365ai export account --format markdown --output account.md
```

**Output example:**
```markdown
# Account Entity

## Overview
- **Logical Name:** account
- **Display Name:** Account
- **Primary Key:** accountid

## Attributes

| Name | Type | Required | Max Length |
|------|------|----------|------------|
| Account Name | String | Yes | 160 |
| Account Number | String | No | 20 |
| ... | ... | ... | ... |

## Relationships

### 1:N Relationships
- account_primary_contact (contact)
- ...
```

---

### CSV Format

**Best for:** Excel analysis, data dictionaries, bulk review

```bash
d365ai export account --format csv --output account-fields.csv
```

**Output structure:**
```csv
Entity,Attribute,Type,Required,MaxLength,Description
account,name,String,Yes,160,Account Name
account,accountnumber,String,No,20,Account Number
...
```

---

## Advanced Options

### Include Relationships

```bash
# Include 1:N, N:1, and N:N relationships
d365ai export account --include-relationships --output account-full.md
```

### Exclude Attributes

```bash
# Export only entity metadata (no field details)
d365ai export account --exclude-attributes
```

### Filter by Attribute Type

```bash
# Export only string attributes
d365ai export account --attribute-type String

# Export only required fields
d365ai export account --required-only
```

---

## Real-World Scenarios

### Scenario 1: Generate Data Dictionary

**Goal:** Create comprehensive field documentation for business users

```bash
# Export all entities as Markdown
d365ai export all --format markdown --output data-dictionary.md
```

**Use:** Share with business analysts, compliance team, or clients.

---

### Scenario 2: Code Generation Prep

**Goal:** Get schema data for code generator

```bash
# Export as JSON for programmatic processing
d365ai export account,contact --format json --output schema-for-codegen.json
```

**Use:** Feed into T4 templates, custom code generators, or API clients.

---

### Scenario 3: Schema Comparison

**Goal:** Compare schema between environments (Dev vs Prod)

```bash
# Export from Dev
d365ai env connect --name Dev
d365ai schema pull
d365ai export all --format json --output dev-schema.json

# Export from Prod
d365ai env connect --name Prod
d365ai schema pull
d365ai export all --format json --output prod-schema.json

# Compare with diff tool
diff dev-schema.json prod-schema.json
```

**Use:** Identify missing entities/fields before deployment.

---

### Scenario 4: Offline Documentation

**Goal:** Create offline reference for travel/code review

```bash
# Export complete schema
d365ai export all --format markdown --output offline-docs.md

# Or split by entity
d365ai export all --format markdown --output-dir ./docs/
```

**Use:** Review schema on flights, in meetings without internet.

---

## Performance Tips

| Export Scope | Format | Time | File Size |
|-------------|--------|------|-----------|
| Single entity | JSON | <1s | 5-50 KB |
| Single entity | Markdown | <1s | 2-20 KB |
| All entities | JSON | 5-10s | 5-20 MB |
| All entities | Markdown | 10-20s | 2-10 MB |
| All entities | CSV | 5-10s | 1-5 MB |

**Optimizations:**
- Export uses local cache (no API calls after initial pull)
- Markdown generation is CPU-bound (fast)
- Large exports can be split by entity

---

## Troubleshooting

### Error: "No entities found"

**Cause:** Schema not pulled yet

**Fix:**
```bash
d365ai schema pull
d365ai export account
```

---

### Error: "Output directory not found"

**Cause:** Directory doesn't exist

**Fix:**
```bash
mkdir -p ./exports
d365ai export account --output ./exports/account.json
```

---

### Output File is Empty

**Cause:** Entity name incorrect

**Fix:**
```bash
# Verify entity exists
d365ai search entity accountname

# Use exact logical name
d365ai export accountname --format json
```

---

## Next Steps

- 📚 [Connect to Dataverse](./connect-to-dataverse.md)
- 🔍 [Analyze Impact](./analyze-impact.md)
- 🗂️ [Search Entities](./search-entities.md)

---

**💡 Pro Tip:** Export schema as part of your release process to maintain versioned documentation!
