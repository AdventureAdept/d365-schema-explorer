# Tutorial: Search Entities and Fields

**Learn how to quickly find entities, fields, and relationships in your Dataverse schema.**

---

## When to Use This

Search schema when you need to:

- 🔍 Find the logical name of an entity or field
- 📋 Discover all entities containing a specific word
- 🔗 Find relationships between entities
- 📊 Understand schema structure before building solutions
- 🐛 Debug field name typos in code

---

## Quick Examples

### Search Entities

```bash
# Search for entities containing "account"
d365ai search entity account

# Exact match
d365ai search entity account --exact

# Limit results
d365ai search entity contact --limit 5
```

### Search Fields

```bash
# Search for fields containing "email"
d365ai search field email

# Search in specific entity
d365ai search field city --entity account

# Exact match
d365ai search field emailaddress1 --exact
```

### Search Relationships

```bash
# All relationships for an entity
d365ai search relationship account

# Filter by type
d365ai search relationship account --type 1:N

# Filter by related entity
d365ai search relationship account --related contact
```

---

## Entity Search

### Basic Search

```bash
d365ai search entity <query>
```

**Example:**
```bash
d365ai search entity account
```

**Output:**
```
Found 3 entities matching "account":

  account
    Display Name: Account
    Logical Name: account
    Primary Key: accountid
    Type: Standard

  accountsummary
    Display Name: Account Summary
    Logical Name: accountsummary
    Primary Key: accountsummaryid
    Type: Virtual

  useraccount
    Display Name: User Account
    Logical Name: useraccount
    Primary Key: useraccountid
    Type: Custom
```

---

### Exact Match

```bash
d365ai search entity account --exact
```

**Output:** Single entity result (if exists)

---

### Search by Display Name

```bash
# Search by display name (case-insensitive)
d365ai search entity "contact person"
```

**Output:** Entities with display name containing "contact person"

---

## Field Search

### Basic Field Search

```bash
d365ai search field <query>
```

**Example:**
```bash
d365ai search field email
```

**Output:**
```
Found 12 fields matching "email":

  account.emailaddress1
    Display Name: Email
    Type: String
    Length: 100

  contact.emailaddress1
    Display Name: Email
    Type: String
    Length: 100

  ...
```

---

### Search in Specific Entity

```bash
d365ai search field <query> --entity <entityname>
```

**Example:**
```bash
d365ai search field name --entity account
```

**Output:** Only fields in the account entity

---

### Filter by Field Type

```bash
# Search only string fields
d365ai search field name --type String

# Search only lookup fields
d365ai search field customer --type Lookup
```

**Supported types:**
- `String`
- `Integer`
- `Decimal`
- `Double`
- `Boolean`
- `DateTime`
- `Lookup`
- `Money`
- `Memo`

---

### Find Required Fields

```bash
# Find all required fields in an entity
d365ai search field * --entity account --required
```

**Output:** Only fields where Required = true

---

## Relationship Search

### Find All Relationships

```bash
d365ai search relationship <entity>
```

**Example:**
```bash
d365ai search relationship account
```

**Output:**
```
Relationships for account:

  1:N Relationships:
    account_primary_contact → contact
    account_customer_contacts → contact
    ...

  N:1 Relationships:
    account_originatinglead → lead
    account_masteraccount → account
    ...

  N:N Relationships:
    account_contacts → contact
    ...
```

---

### Filter by Relationship Type

```bash
# Only 1:N (one-to-many)
d365ai search relationship account --type 1:N

# Only N:1 (many-to-one)
d365ai search relationship account --type N:1

# Only N:N (many-to-many)
d365ai search relationship account --type N:N
```

---

### Find Related Entity

```bash
d365ai search relationship account --related contact
```

**Output:** Only relationships between account and contact

---

## Advanced Search Patterns

### Find All Custom Entities

```bash
# Custom entities typically start with prefix
d365ai search entity "tvs_" --exact
```

---

### Find Fields by Data Type

```bash
# Find all decimal fields
d365ai search field "" --type Decimal

# Find all datetime fields
d365ai search field "" --type DateTime
```

---

### Find Lookup Fields to Specific Entity

```bash
# Find all lookups to account
d365ai search field "" --type Lookup --target account
```

---

## Real-World Scenarios

### Scenario 1: Find Logical Name from Display Name

**Problem:** Business user says "I need the City field on Account"

**Solution:**
```bash
d365ai search field city --entity account
```

**Output:**
```
  account.tvs_city
    Display Name: City
    Type: String
    Length: 100
```

**Answer:** Logical name is `tvs_city`

---

### Scenario 2: Debug Field Not Found Error

**Problem:** Code references `account.city` but getting error

**Solution:**
```bash
d365ai search field city --entity account
```

**Output:** Shows correct name is `tvs_city` not `city`

**Fix:** Update code to use `account.tvs_city`

---

### Scenario 3: Find All Uses of an Entity

**Problem:** Need to know which entities reference account

**Solution:**
```bash
d365ai search relationship account --type N:1
```

**Output:** All entities with lookup to account

---

### Scenario 4: Document Integration Points

**Problem:** Need to list all entities that integrate with contacts

**Solution:**
```bash
d365ai search relationship contact --type N:N
```

**Output:** All many-to-many relationships with contact

---

## Performance Tips

| Search Type | Time | Cache Used |
|-------------|------|------------|
| Entity search | <1s | ✅ Yes |
| Field search (all) | 1-3s | ✅ Yes |
| Field search (single entity) | <1s | ✅ Yes |
| Relationship search | <1s | ✅ Yes |

**All searches use local cache** - no API calls after initial `schema pull`!

---

## Troubleshooting

### Error: "No entities found"

**Possible causes:**
- Schema not pulled yet
- Search term too specific
- Entity doesn't exist

**Fix:**
```bash
# Pull schema first
d365ai schema pull

# Try broader search
d365ai search entity account

# List all entities
d365ai search entity ""
```

---

### Error: "Schema cache is empty"

**Cause:** Never pulled schema or cache was cleared

**Fix:**
```bash
d365ai schema pull
```

---

### Search Returns Too Many Results

**Cause:** Search term too generic

**Fix:**
```bash
# Use --limit to reduce output
d365ai search field name --limit 10

# Be more specific
d365ai search field firstname --entity contact

# Use exact match
d365ai search field emailaddress1 --exact
```

---

## Next Steps

- 📚 [Connect to Dataverse](./connect-to-dataverse.md)
- 📦 [Export Schema](./export-schema.md)
- 🔍 [Analyze Impact](./analyze-impact.md)

---

**💡 Pro Tip:** Use search to find logical names before writing code—prevents typos and runtime errors!
