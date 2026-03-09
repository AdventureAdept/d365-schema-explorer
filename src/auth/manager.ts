import * as fs from 'fs';
import * as path from 'path';
import { PublicClientApplication, AuthenticationResult, DeviceCodeRequest } from '@azure/msal-node';
import { ConfigManager } from '../config/manager';
import { TokenInfo } from '../types';

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

  private getTokenInfo(clientName: string): TokenInfo | null {
    const authPath = this.getAuthPath(clientName);
    if (!fs.existsSync(authPath)) {
      return null;
    }
    const data = JSON.parse(fs.readFileSync(authPath, 'utf-8'));
    return {
      accessToken: data.accessToken,
      expiresOn: new Date(data.expiresOn),
      refreshToken: data.refreshToken,
      acquiredAt: new Date(data.acquiredAt),
    };
  }

  private saveTokenInfo(clientName: string, token: TokenInfo): void {
    const authPath = this.getAuthPath(clientName);
    fs.writeFileSync(authPath, JSON.stringify({
      accessToken: token.accessToken,
      expiresOn: token.expiresOn.toISOString(),
      refreshToken: token.refreshToken,
      acquiredAt: token.acquiredAt.toISOString(),
    }, null, 2));
  }

  private deleteTokenInfo(clientName: string): void {
    const authPath = this.getAuthPath(clientName);
    if (fs.existsSync(authPath)) {
      fs.unlinkSync(authPath);
    }
  }

  private getMsalApp(tenantId: string, clientId: string): PublicClientApplication {
    return new PublicClientApplication({
      auth: {
        clientId: clientId,
        authority: `https://login.microsoftonline.com/${tenantId}`,
      },
    });
  }

  async authenticate(orgUrl: string, tenantId?: string, clientId?: string): Promise<TokenInfo> {
    // Extract tenant ID from org URL if not provided
    const effectiveTenantId = tenantId || this.extractTenantId(orgUrl);
    const effectiveClientId = clientId || DEFAULT_CLIENT_ID;

    const msalApp = this.getMsalApp(effectiveTenantId, effectiveClientId);

    const scope = `${orgUrl}/.default`;
    
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

      const tokenInfo: TokenInfo = {
        accessToken: response.accessToken,
        expiresOn: new Date(response.expiresOn?.getTime() || Date.now() + 3600000),
        acquiredAt: new Date(),
      };

      return tokenInfo;
    } catch (error: any) {
      throw new Error(`Authentication failed: ${error.message}`);
    }
  }

  async refreshToken(clientName: string): Promise<TokenInfo | null> {
    const token = this.getTokenInfo(clientName);
    if (!token?.refreshToken) {
      return null;
    }

    const clientConfig = this.configManager.getClient(clientName);
    if (!clientConfig) {
      return null;
    }

    // MSAL handles refresh tokens internally for confidential clients
    // For public clients with device code, we need to re-authenticate
    // This is a limitation of device code flow
    return null;
  }

  private extractTenantId(orgUrl: string): string {
    // Try to extract tenant ID from org URL
    // Format: https://orgname.crm.dynamics.com or https://orgname.crm4.dynamics.com
    // We need to make an unauthenticated call to get tenant info
    return 'organizations'; // Default for multi-tenant apps
  }

  async getAccessToken(clientName: string): Promise<string | null> {
    const token = this.getTokenInfo(clientName);
    if (!token) {
      return null;
    }

    // Check if token is expired (with 5 minute buffer)
    const now = new Date();
    const expiresOn = new Date(token.expiresOn);
    const bufferMs = 5 * 60 * 1000; // 5 minutes
    
    if (expiresOn.getTime() - now.getTime() < bufferMs) {
      // Token is expired or about to expire
      const newToken = await this.refreshToken(clientName);
      if (!newToken) {
        return null;
      }
      return newToken.accessToken;
    }

    return token.accessToken;
  }

  async isAuthenticated(clientName: string): Promise<boolean> {
    const token = await this.getAccessToken(clientName);
    return token !== null;
  }

  saveAuth(clientName: string, token: TokenInfo): void {
    this.saveTokenInfo(clientName, token);
  }

  clearAuth(clientName: string): void {
    this.deleteTokenInfo(clientName);
  }
}

export default AuthManager;