# Tutorial: Connect to Dataverse

**Learn how to connect d365-tools to your Dataverse environment in 2 minutes.**

---

## Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18.0+ installed
- ✅ `d365-tools` installed (`npm install -g d365-tools`)
- ✅ A Dataverse environment URL (e.g., `https://yourorg.crm.dynamics.com`)

---

## Step 1: Start Connection

```bash
d365ai env connect
```

You'll be prompted for:

```
? Organization URL: https://yourorg.crm.dynamics.com
? Client name: Production
```

---

## Step 2: Authenticate

### Option A: Interactive Login (Recommended for Development)

The tool will display a device code:

```
To sign in, use a web browser to open the URL https://microsoft.com/devicelogin
and enter the code ABC123XYZ to authenticate.
```

**Steps:**
1. Open browser to `https://microsoft.com/devicelogin`
2. Enter the code
3. Sign in with your Microsoft account
4. Return to terminal - connection complete!

---

### Option B: Service Principal (Recommended for CI/CD)

Provide Azure AD App Registration credentials:

```
? Organization URL: https://yourorg.crm.dynamics.com
? Client name: Production
? Use service principal? Yes
? Tenant ID: 9ffd1050-5319-41ca-b384-09122ed336d0
? Client ID: ef356da8-abc2-42ec-9fb7-fb0645467578
? Client Secret: [hidden]
```

**Benefits:**
- ✅ Non-interactive (perfect for scripts)
- ✅ Automatic token refresh
- ✅ No manual re-authentication

---

## Step 3: Verify Connection

```bash
d365ai env list
```

**Expected output:**
```
Connected environments:

  Production
    URL: https://yourorg.crm.dynamics.com
    Auth: Service Principal
    Status: ✅ Active
```

---

## Step 4: Pull Schema

Now you're ready to pull schema metadata:

```bash
d365ai schema pull
```

---

## Troubleshooting

### Error: "Authentication failed"

**Cause:** Incorrect credentials or expired token

**Fix:**
```bash
# Remove and reconnect
d365ai env disconnect Production
d365ai env connect
```

---

### Error: "Organization not found"

**Cause:** Wrong URL format

**Fix:** Use full URL format:
- ✅ `https://yourorg.crm.dynamics.com`
- ❌ `yourorg`
- ❌ `yourorg.crm.com`

---

### Error: "Token expired"

**Cause:** Service principal token expired (should auto-refresh)

**Fix:**
```bash
# Force token refresh
d365ai env refresh Production
```

---

## Next Steps

- 📚 [Pull Schema Metadata](./pull-schema.md)
- 🔍 [Analyze Impact](./analyze-impact.md)
- 🗂️ [Search Entities](./search-entities.md)

---

**💡 Tip:** You can connect to multiple environments (Dev, Test, Prod) and switch between them!
