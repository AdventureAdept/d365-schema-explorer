# Troubleshooting Guide

## Common Issues

### Authentication Failures

**Problem:** "Not authenticated. Run 'd365ai env connect' first."

**Solution:**
```bash
d365ai env connect
# Follow the URL shown and enter the device code
```

**Problem:** "Authentication failed: Invalid tenant ID"

**Solution:**
- Verify tenant ID is correct (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
- For multi-tenant apps, use `organizations` as tenant ID

---

### Token Expiration

**Problem:** "Token expired" or repeated authentication prompts

**Solution:**
1. Tokens auto-refresh with 5-minute buffer
2. If issue persists, disconnect and reconnect:
   ```bash
   d365ai env disconnect
   d365ai env connect
   ```

---

### Cache Issues

**Problem:** "Cache read error" or "Cache corrupted"

**Solution:**
1. Backup is automatically restored
2. If backup also corrupted, cache is rebuilt:
   ```bash
   d365ai schema pull
   ```

**Problem:** Schema out of date

**Solution:**
```bash
d365ai schema sync-status  # Check last sync time
d365ai schema pull         # Force full sync
```

---

### Rate Limiting

**Problem:** "429 Too Many Requests"

**Solution:**
- Tool implements automatic retry with exponential backoff
- Wait 5-10 minutes between large operations
- Check rate limit headers in verbose mode

---

### VS Code Extension Issues

**Problem:** Extension doesn't appear in sidebar

**Solution:**
1. Run `d365ai env connect` first (CLI must be authenticated)
2. Reload VS Code window: `Ctrl+Shift+P` → "Reload Window"
3. Check extension is enabled: `Ctrl+Shift+X` → Search "D365"

**Problem:** "No entities found" or empty tree view

**Solution:**
1. Verify connection: `d365ai env status`
2. Pull schema: `d365ai schema pull`
3. Refresh tree: Click refresh icon in D365 Schema Explorer panel

**Problem:** Webview not rendering

**Solution:**
- Check VS Code version (requires 1.74+)
- Disable hardware acceleration if webview is blank
- Check Developer Tools for errors: `Help` → `Toggle Developer Tools`

---

### Network Issues

**Problem:** "Network error" or timeout

**Solution:**
1. Check internet connection
2. Verify Dataverse URL is accessible
3. Check firewall/proxy settings
4. Increase timeout (advanced): Set `REQUEST_TIMEOUT` env var

---

### Permission Issues

**Problem:** "403 Forbidden" when accessing entities

**Solution:**
1. Verify user has Dataverse read permissions
2. Check security role includes:
   - Read permission on Entity metadata
   - Read permission on Attribute metadata
   - Read permission on Relationships
3. For service principal, ensure `user_impersonation` permission is granted

---

## Getting Help

### Enable Verbose Logging
```bash
export DEBUG=d365ai:*
d365ai schema pull
```

### Check Logs
```bash
# CLI logs to console with DEBUG enabled
# VS Code extension: View → Output → D365 Schema Explorer
```

### Report Issues
- GitHub: https://github.com/AdventureAdept/d365-schema-explorer
- Include: Error message, steps to reproduce, environment details
