# Tutorial: Analyze Impact Before Schema Changes

**Learn how to find dependencies and prevent breaking changes in production.**

---

## When to Use This

Use Impact Analyzer **before**:

- ⚠️ Renaming an entity or field
- ⚠️ Deleting an entity or field
- ⚠️ Changing field data type
- ⚠️ Removing a relationship
- 📋 Code review of plugin/web resource changes

---

## Quick Example

**Scenario:** You need to rename `account.tvs_city` to `account.tvs_municipality`

### Step 1: Find All Usages

```bash
d365ai impact search account.tvs_city --show-code
```

**Expected output:**
```
Found 5 usages of account.tvs_city:

1. 📄 Web Resource: new_address_validator.js (line 23)
   validateCity(formContext.getDataValue("tvs_city"));

2. 📄 Plugin: AddressValidationPlugin.cs (line 67)
   var city = entity.GetAttributeValue<string>("tvs_city");

3. 📋 Business Rule: Account BR Rules
   Field used in condition: tvs_city equals "New York"

4. ⚙️ Workflow: Account Update Workflow
   Field used in email template

5. 👁️ View: Active Accounts
   Column displayed in view
```

---

### Step 2: Review Code Context

The `--show-code` flag shows actual code snippets:

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

### Step 3: Generate Impact Report

```bash
d365ai impact report account --output impact-report.md
```

**This creates a markdown report with:**
- All dependencies
- Code snippets
- File locations
- Recommended actions

---

## Full Analysis Options

### Analyze Entire Entity

```bash
# Basic analysis (D365 API only)
d365ai impact analyze account

# Include web resources
d365ai impact analyze account --webresources

# Include plugin code (requires Azure DevOps config)
d365ai impact analyze account --plugins

# Full analysis (all sources)
d365ai impact analyze account --full
```

---

### Output Formats

```bash
# Markdown report (human-readable)
d365ai impact report account --format markdown --output report.md

# JSON report (machine-readable)
d365ai impact report account --format json --output report.json

# Console output (quick check)
d365ai impact analyze account
```

---

## Visualize Dependencies

Generate an interactive dependency graph:

```bash
# Generate graph
d365ai impact graph opportunity

# Open in browser automatically
d365ai impact graph opportunity --open
```

**Output:** Interactive HTML graph showing:
- Entity relationships
- Plugin dependencies
- Web resource usage
- Workflow connections

---

## Real-World Scenarios

### Scenario 1: Before Deleting Custom Entity

**Question:** Is it safe to delete `tvs_log` entity?

```bash
d365ai impact analyze tvs_log --full
```

**Review output:**
- ✅ 0 dependencies → Safe to delete
- ⚠️ 3 plugins found → Update plugins first
- ⚠️ 2 workflows found → Remove workflows first

**Action Plan:**
1. Update/remove 3 plugins
2. Delete 2 workflows
3. Re-run analysis (should show 0 dependencies)
4. Delete entity safely

---

### Scenario 2: Code Review - Audit Field Access

**Question:** Who's accessing sensitive field `account.creditlimit`?

```bash
d365ai impact search account.creditlimit --show-code
```

**Audit checklist:**
- ✅ Is validation in place?
- ✅ Are security roles correct?
- ✅ Is access logged?
- ✅ Is data encrypted if needed?

---

### Scenario 3: Before Changing Field Type

**Scenario:** Changing `account.tvs_population` from `Whole Number` to `Decimal`

```bash
# Find all code that reads/writes this field
d365ai impact search account.tvs_population --show-code

# Look for:
# - Type casting (may break)
# - Mathematical operations (may need update)
# - Comparisons (may need adjustment)
```

**Review code for type-specific operations:**
```csharp
// ⚠️ May break after type change
int population = entity.GetAttributeValue<int>("tvs_population");

// ✅ Should be updated to
decimal population = entity.GetAttributeValue<decimal>("tvs_population");
```

---

## Configuration

### Azure DevOps Integration (for Plugin Analysis)

To analyze C# plugin code from Azure DevOps:

```bash
# Set environment variables
export AZURE_DEVOPS_ORG="your-org"
export AZURE_DEVOPS_PROJECT="your-project"
export AZURE_DEVOPS_REPO="your-repo"
export AZURE_DEVOPS_PAT="your-personal-access-token"
```

**Then run:**
```bash
d365ai impact analyze account --plugins
```

---

## Performance Tips

| Analysis Type | Time | Files Scanned |
|--------------|------|---------------|
| Basic (API only) | 2-5s | N/A |
| + Web Resources | 10-15s | 50-200 |
| + Plugin Code | 20-30s | 1000-5000 |
| Full Analysis | 25-35s | 1000-5000 |

**Optimizations:**
- Uses parallel processing (web + plugins)
- 25s timeout with graceful fallback
- Concurrency limits (10 web, 20 plugins)

---

## Troubleshooting

### Error: "No usages found"

**Possible causes:**
- Field name incorrect (check logical name)
- Web resources/plugins not scanned (add `--webresources --plugins`)
- Field truly has no dependencies (safe to change!)

**Fix:**
```bash
# Verify field exists
d365ai search field tvs_city

# Run full analysis
d365ai impact search account.tvs_city --full
```

---

### Error: "Azure DevOps authentication failed"

**Cause:** Invalid PAT or incorrect org/project name

**Fix:**
```bash
# Verify PAT is valid and has Code read permissions
# Check org/project/repo names match exactly
echo $AZURE_DEVOPS_ORG
echo $AZURE_DEVOPS_PROJECT
```

---

## Next Steps

- 📚 [Connect to Dataverse](./connect-to-dataverse.md)
- 🗂️ [Pull Schema Metadata](./pull-schema.md)
- 📊 [Generate Dependency Graph](./generate-graph.md)

---

**💡 Pro Tip:** Run impact analysis as part of your PR review process to catch breaking changes before merge!
