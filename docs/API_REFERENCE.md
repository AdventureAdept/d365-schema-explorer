# D365 Schema Explorer - API Reference

## CLI Commands

### Environment Commands

| Command | Description |
|---------|-------------|
| `d365ai env connect` | Connect to Dataverse environment (device code or service principal) |
| `d365ai env disconnect [client]` | Disconnect from environment |
| `d365ai env status` | Show current connection status |
| `d365ai env list` | List all configured environments |

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

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `DATAVERSE_API_VERSION` | `v9.2` | Dataverse WebAPI version |
| `D365AI_CACHE_DIR` | `~/.d365ai/cache` | Schema cache directory |
| `D365AI_CLIENTS_DIR` | `~/.d365ai/clients` | Client config directory |

### Config Files

| Path | Purpose |
|------|---------|
| `~/.d365ai/clients/*.json` | Client configurations (org URL, credentials) |
| `~/.d365ai/clients/*.auth.meta.json` | Token metadata (expiresOn, acquiredAt) |
| `~/.d365ai/cache/*-cache.json` | Schema cache with delta sync |

## Authentication

### Device Code Flow (Interactive)
```bash
d365ai env connect
# Follow the URL and enter the code shown
```

### Service Principal (Automated)
```bash
d365ai env connect --tenant-id <id> --client-id <id> --client-secret <secret>
```

## Error Codes

| Code | Meaning | Resolution |
|------|---------|------------|
| 401 | Unauthorized | Run `d365ai env connect` |
| 403 | Forbidden | Check user permissions |
| 404 | Not Found | Verify entity/attribute name |
| 429 | Rate Limited | Wait and retry (auto-retry enabled) |
| 503 | Service Unavailable | Retry with exponential backoff |
