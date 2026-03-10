import * as fs from 'fs';
import * as path from 'path';
import { PublicClientApplication, ConfidentialClientApplication, AuthenticationResult, DeviceCodeRequest, ClientCredentialRequest } from '@azure/msal-node';
import { ConfigManager } from '../config/manager';
import { TokenInfo } from '../types';
import { saveToken, getToken, deleteToken } from './token-storage';
import { tokenRefreshLock } from '../utils/async-lock';

// Default client ID for Dataverse
const DEFAULT_CLIENT_ID = '51f81489-12ee-4a9e-aaae-a2591f45987d';
const DEFAULT_SCOPES = ['https://org.api.crm.dynamics.com/.default'];

export class AuthManager {
  private configManager: ConfigManager;
  private msalApp: PublicClientApplication | null = null;

  constructor(configManager: ConfigManager) {
    this.configManager = configManager;
  }

  private getAuthPath(clientName: string): string {
    return path.join(this.configManager.getClientsDir(), `${clientName}.auth.json`);
  }

  private async getTokenInfo(clientName: string): Promise<TokenInfo | null> {
    const accessToken = await getToken(clientName);
    if (!accessToken) {
      return null;
    }
    // Store metadata (expiresOn, acquiredAt) in a separate non-sensitive file
    const metadataPath = path.join(this.configManager.getClientsDir(), `${clientName}.auth.meta.json`);
    let metadata: { expiresOn: string; acquiredAt: string } = { expiresOn: new Date().toISOString(), acquiredAt: new Date().toISOString() };
    if (fs.existsSync(metadataPath)) {
      metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
    }
    return {
      accessToken,
      expiresOn: new Date(metadata.expiresOn),
      refreshToken: undefined,
      acquiredAt: new Date(metadata.acquiredAt),
    };
  }

  private async saveTokenInfo(clientName: string, token: TokenInfo): Promise<void> {
    await saveToken(clientName, token.accessToken);
    // Store metadata (expiresOn, acquiredAt) in a separate non-sensitive file
    const metadataPath = path.join(this.configManager.getClientsDir(), `${clientName}.auth.meta.json`);
    fs.writeFileSync(metadataPath, JSON.stringify({
      expiresOn: token.expiresOn.toISOString(),
      acquiredAt: token.acquiredAt.toISOString(),
    }, null, 2));
  }

  private async deleteTokenInfo(clientName: string): Promise<void> {
    await deleteToken(clientName);
    const metadataPath = path.join(this.configManager.getClientsDir(), `${clientName}.auth.meta.json`);
    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }
  }

  private getMsalPublicApp(tenantId: string, clientId: string): PublicClientApplication {
    return new PublicClientApplication({
      auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  private getMsalConfidentialApp(tenantId: string, clientId: string, clientSecret: string): ConfidentialClientApplication {
    return new ConfidentialClientApplication({
      auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
        clientSecret: clientSecret,
      },
    });
  }

  async authenticate(orgUrl: string, tenantId?: string, clientId?: string, clientSecret?: string): Promise<TokenInfo> {
    const effectiveTenantId = tenantId || this.extractTenantId(orgUrl);
    const effectiveClientId = clientId || DEFAULT_CLIENT_ID;
    const scope = `${orgUrl}/.default`;

    if (clientSecret) {
      return this.authenticateWithClientCredentials(orgUrl, effectiveTenantId, effectiveClientId, clientSecret);
    }

    const msalApp = this.getMsalPublicApp(effectiveTenantId, effectiveClientId);

    const deviceCodeRequest: DeviceCodeRequest = {
      scopes: [scope],
      deviceCodeCallback: (response) => {
        console.log('\n' + response.message);
        console.log('\nWaiting for authentication...\n');
      },
    };

    try {
      const response = await msalApp.acquireTokenByDeviceCode(deviceCodeRequest);

      if (!response) {
        throw new Error('Authentication failed - no response');
      }

      return {
        accessToken: response.accessToken,
        expiresOn: new Date(response.expiresOn?.getTime() || Date.now() + 3600000),
        acquiredAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  private async authenticateWithClientCredentials(orgUrl: string, tenantId: string, clientId: string, clientSecret: string): Promise<TokenInfo> {
    const msalApp = this.getMsalConfidentialApp(tenantId, clientId, clientSecret);
    const scope = `${orgUrl}/.default`;

    try {
      const response = await msalApp.acquireTokenByClientCredential({ scopes: [scope] });

      if (!response) {
        throw new Error('Authentication failed - no response');
      }

      return {
        accessToken: response.accessToken,
        expiresOn: new Date(response.expiresOn?.getTime() || Date.now() + 3600000),
        acquiredAt: new Date(),
      };
    } catch (error: any) {
      throw new Error(`Client credentials authentication failed: ${error.message}`);
    }
  }

  async refreshToken(clientName: string): Promise<TokenInfo | null> {
    const clientConfig = this.configManager.getClient(clientName);
    if (!clientConfig?.clientSecret || !clientConfig.tenantId || !clientConfig.clientId) {
      return null;
    }

    try {
      return await this.authenticateWithClientCredentials(
        clientConfig.orgUrl,
        clientConfig.tenantId,
        clientConfig.clientId,
        clientConfig.clientSecret,
      );
    } catch {
      return null;
    }
  }

  private extractTenantId(orgUrl: string): string {
    // Try to extract tenant ID from org URL
    // Format: https://orgname.crm.dynamics.com or https://orgname.crm4.dynamics.com
    // We need to make an unauthenticated call to get tenant info
    return 'organizations'; // Default for multi-tenant apps
  }

  async getAccessToken(clientName: string): Promise<string | null> {
    const token = await this.getTokenInfo(clientName);
    if (!token) {
      // No cached token — try client credentials if configured
      await tokenRefreshLock.acquire('token-refresh');
      try {
        const newToken = await this.refreshToken(clientName);
        if (!newToken) {
          return null;
        }
        await this.saveTokenInfo(clientName, newToken);
        return newToken.accessToken;
      } finally {
        tokenRefreshLock.release('token-refresh');
      }
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresOn = new Date(token.expiresOn);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    
    if (expiresOn.getTime() - now.getTime() < bufferMs) {
      // Token is expired or about to expire
      await tokenRefreshLock.acquire('token-refresh');
      try {
        const newToken = await this.refreshToken(clientName);
        if (!newToken) {
          return null;
        }
        await this.saveTokenInfo(clientName, newToken);
        return newToken.accessToken;
      } finally {
        tokenRefreshLock.release('token-refresh');
      }
    }

    return token.accessToken;
  }

  async isAuthenticated(clientName: string): Promise<boolean> {
    const token = await this.getAccessToken(clientName);
    return token !== null;
  }

  async saveAuth(clientName: string, token: TokenInfo): Promise<void> {
    await this.saveTokenInfo(clientName, token);
  }

  async clearAuth(clientName: string): Promise<void> {
    await this.deleteTokenInfo(clientName);
  }
}

export default AuthManager;