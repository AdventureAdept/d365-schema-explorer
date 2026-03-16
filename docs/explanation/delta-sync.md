# Delta Sync: How It Works

**Understanding the 10-20x performance improvement in schema synchronization.**

---

## Overview

D365 Tools uses **delta synchronization** to fetch only changed metadata since the last sync, resulting in:

| Metric | Full Sync | Delta Sync | Improvement |
|--------|-----------|------------|-------------|
| **Time** | 60 seconds | 3-5 seconds | **12-20x faster** |
| **API Calls** | 500+ | 10-20 | **25-50x fewer** |
| **Data Transferred** | 10-20 MB | 100-500 KB | **20-40x less** |

---

## How Delta Sync Works

### Step 1: Initial Full Sync

```bash
d365ai schema pull --full
```

**What happens:**
1. Fetch all entity metadata from Dataverse
2. Store in local cache (`~/.d365ai/cache/<org>/schema.json`)
3. Save sync token and ETags for each entity
4. Record timestamp

**Cache structure:**
```json
{
  "lastSync": "2026-03-16T15:30:00Z",
  "syncToken": "1234567890",
  "entities": {
    "account": {
      "etag": "\"abc123\"",
      "modifiedOn": "2026-03-15T10:00:00Z",
      "metadata": { ... }
    },
    "contact": {
      "etag": "\"def456\"",
      "modifiedOn": "2026-03-14T08:00:00Z",
      "metadata": { ... }
    }
  }
}
```

---

### Step 2: Subsequent Delta Sync

```bash
d365ai schema pull
# Auto-detects delta sync
```

**What happens:**
1. Send sync token to Dataverse
2. Dataverse returns only entities changed since last sync
3. Update changed entities in cache
4. Update ETags and timestamps
5. Save new sync token

**API call:**
```http
GET /api/data/v9.2/EntityDefinitions?$deltatoken=1234567890
```

**Response:**
```json
{
  "value": [
    {
      "LogicalName": "account",
      "ETag": "\"abc789\"",
      "ModifiedOn": "2026-03-16T14:00:00Z",
      ...
    }
  ],
  "@odata.deltaLink": "/EntityDefinitions?$deltatoken=9876543210"
}
```

Only **1 entity changed** (account), so only 1 entity is fetched!

---

## Key Technologies

### 1. OData Delta Token

Dataverse supports OData delta queries:

```http
# Initial query
GET /EntityDefinitions

# Response includes deltaLink
"@odata.deltaLink": "/EntityDefinitions?$deltatoken=12345"

# Next query uses deltaLink
GET /EntityDefinitions?$deltatoken=12345
```

**Benefits:**
- Server-side change tracking
- Guaranteed consistency
- No manual timestamp comparison

---

### 2. ETag Validation

Each entity has an ETag (entity tag):

```http
ETag: "abc123"
```

**How it works:**
1. Store ETag with cached entity
2. On sync, compare ETags
3. If ETag changed → fetch updated entity
4. If ETag same → skip (no changes)

**Prevents unnecessary fetches** even within delta results.

---

### 3. Local Cache

Cache location: `~/.d365ai/cache/<org>/`

**Files:**
```
~/.d365ai/cache/
└── yourorg.crm.dynamics.com/
    ├── schema.json          # Full schema cache
    ├── sync-token.txt       # Current delta token
    └── etags.json           # Entity ETags
```

**Cache invalidation:**
- Manual: `d365ai schema pull --force`
- Automatic: Every 7 days (configurable)
- Corruption: Auto-detect and rebuild

---

## Performance Breakdown

### Full Sync (First Time)

```
1. Fetch entity list              (1 API call)
2. For each entity (245 entities):
   - Fetch metadata               (245 API calls)
   - Fetch attributes             (245 API calls)
   - Fetch relationships          (245 API calls)
3. Total: 736 API calls
4. Time: 60 seconds
```

---

### Delta Sync (Subsequent)

```
1. Send delta token              (1 API call)
2. Dataverse returns changes     (e.g., 3 entities)
3. Fetch changed entities        (3 API calls)
4. Total: 4 API calls
5. Time: 3 seconds
```

**Result:** 185x fewer API calls, 20x faster!

---

## Real-World Scenarios

### Scenario 1: Daily Development

**Workflow:**
```bash
# Monday (first time)
d365ai schema pull --full
# Time: 60 seconds

# Tuesday-Friday (daily)
d365ai schema pull
# Time: 3-5 seconds (only your changes)
```

**Weekly time savings:**
- Full sync daily: 5 × 60s = 300 seconds
- Delta sync: 60s + (4 × 5s) = 80 seconds
- **Saved: 220 seconds (73% faster)**

---

### Scenario 2: CI/CD Pipeline

**Before (full sync every build):**
```yaml
- run: d365ai schema pull --full
  # Adds 60 seconds to every build
```

**After (delta sync):**
```yaml
- run: d365ai schema pull
  # Adds 3-5 seconds (cached from previous build)
```

**Impact:** 55 seconds saved per build × 20 builds/day = **18 minutes/day**

---

### Scenario 3: Multi-Environment Sync

**Sync Dev, Test, Prod:**

```bash
# Dev (full sync)
d365ai env connect --name Dev
d365ai schema pull --full    # 60s

# Test (delta - similar schema)
d365ai env connect --name Test
d365ai schema pull           # 5s (mostly same as Dev)

# Prod (delta - minimal changes)
d365ai env connect --name Prod
d365ai schema pull           # 3s (only prod-specific changes)
```

**Total time:** 68 seconds vs 180 seconds (3× full syncs)

---

## Edge Cases

### What If Delta Token Expires?

**Dataverse expires delta tokens** after:
- 7 days (default)
- Schema reset

**Automatic fallback:**
```
1. Try delta sync with token
2. Server returns "token expired"
3. Auto-fallback to full sync
4. Cache new token
5. Continue normally
```

**User sees:**
```
⚠️ Delta token expired, performing full sync...
✅ Full sync complete (60s)
```

---

### What If Cache Is Corrupted?

**Detection:**
```bash
d365ai schema pull
# Error: Cache checksum mismatch
```

**Automatic recovery:**
```
1. Detect corruption
2. Backup old cache
3. Perform full sync
4. Rebuild cache
5. Resume normal operation
```

**Manual fix:**
```bash
d365ai schema pull --force
```

---

### What If Network Fails Mid-Sync?

**Resume capability:**
```
1. Sync interrupted (network failure)
2. Cache partially updated
3. Next sync detects incomplete state
4. Retries from last successful point
5. Completes remaining entities
```

**No data loss, no duplicates!**

---

## Configuration

### Force Full Sync

```bash
# Force refresh (ignore cache)
d365ai schema pull --force
```

**Use when:**
- Suspect cache corruption
- After major schema changes
- Switching environments
- Debugging issues

---

### Cache Location

**Default:**
- Windows: `C:\Users\<user>\.d365ai\cache\`
- macOS: `~/.d365ai/cache/`
- Linux: `~/.d365ai/cache/`

**Custom location:**
```bash
export D365AI_CACHE_DIR="/custom/cache/path"
d365ai schema pull
```

---

### Cache Retention

**Default:** 7 days

**Configure:**
```json
{
  "cache": {
    "retentionDays": 14,
    "autoRefresh": true
  }
}
```

---

## Monitoring

### Check Sync Status

```bash
d365ai schema status
```

**Output:**
```
Schema Status:
  Last sync: 2026-03-16 15:30:00
  Sync type: Delta
  Changes detected: 3 entities
  Duration: 4.2s
  Cache size: 15.4 MB
  Next auto-refresh: 2026-03-23
```

---

### Verbose Logging

```bash
d365ai schema pull --verbose
```

**Output:**
```
[DEBUG] Using delta token: 1234567890
[DEBUG] Sending delta query...
[DEBUG] Server returned 3 changed entities
[FETCH] account (ETag changed)
[FETCH] contact (ETag changed)
[FETCH] opportunity (ETag changed)
[DEBUG] Updated cache with 3 entities
[DEBUG] New delta token: 9876543210
✅ Delta sync complete (4.2s, 3 entities changed)
```

---

## Best Practices

### ✅ Do

- Run `d365ai schema pull` daily (stays fast with delta)
- Use `--force` after major schema changes
- Monitor sync status periodically
- Keep cache directory on fast storage (SSD)

---

### ❌ Don't

- Don't delete cache manually (loses delta token)
- Don't sync every 5 minutes (unnecessary load)
- Don't ignore "token expired" warnings
- Don't share cache between environments

---

## Next Steps

- 📚 [Connect to Dataverse](./connect-to-dataverse.md)
- 🗂️ [Search Entities](./search-entities.md)
- 📦 [Export Schema](./export-schema.md)

---

**💡 Pro Tip:** Delta sync is automatic—just run `d365ai schema pull` and it figures out the optimal sync strategy!
