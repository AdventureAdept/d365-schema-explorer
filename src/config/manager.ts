import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { ClientConfig } from '../types';

const CONFIG_DIR = '.d365ai';
const CLIENTS_DIR = 'clients';
const CONFIG_FILE = 'config.json';

export class ConfigManager {
  private configDir: string;
  private clientsDir: string;
  private activeClient: string | null = null;

  constructor(baseDir?: string) {
    this.configDir = baseDir || path.join(os.homedir(), CONFIG_DIR);
    this.clientsDir = path.join(this.configDir, CLIENTS_DIR);
    this.ensureDirectories();
    this.loadActiveClient();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.configDir)) {
      fs.mkdirSync(this.configDir, { recursive: true });
    }
    if (!fs.existsSync(this.clientsDir)) {
      fs.mkdirSync(this.clientsDir, { recursive: true });
    }
  }

  private getConfigPath(): string {
    return path.join(this.configDir, CONFIG_FILE);
  }

  private getClientPath(name: string): string {
    return path.join(this.clientsDir, `${name}.json`);
  }

  private loadActiveClient(): void {
    const configPath = this.getConfigPath();
    if (fs.existsSync(configPath)) {
      const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      this.activeClient = config.activeClient || null;
    }
  }

  getActiveClient(): string | null {
    return this.activeClient;
  }

  setActiveClient(name: string): void {
    this.activeClient = name;
    const configPath = this.getConfigPath();
    const config = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, 'utf-8'))
      : {};
    config.activeClient = name;
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
  }

  listClients(): string[] {
    if (!fs.existsSync(this.clientsDir)) {
      return [];
    }
    return fs.readdirSync(this.clientsDir)
      .filter(f => f.endsWith('.json'))
      .map(f => f.replace('.json', ''));
  }

  getClient(name: string): ClientConfig | null {
    const clientPath = this.getClientPath(name);
    if (!fs.existsSync(clientPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(clientPath, 'utf-8'));
  }

  getActiveClientConfig(): ClientConfig | null {
    if (!this.activeClient) {
      return null;
    }
    return this.getClient(this.activeClient);
  }

  saveClient(config: ClientConfig): void {
    const clientPath = this.getClientPath(config.name);
    fs.writeFileSync(clientPath, JSON.stringify(config, null, 2));
    
    // Set as active if first client
    const clients = this.listClients();
    if (clients.length === 1) {
      this.setActiveClient(config.name);
    }
  }

  deleteClient(name: string): boolean {
    const clientPath = this.getClientPath(name);
    if (!fs.existsSync(clientPath)) {
      return false;
    }
    fs.unlinkSync(clientPath);
    
    // Clear active client if deleted
    if (this.activeClient === name) {
      const clients = this.listClients();
      this.activeClient = clients.length > 0 ? clients[0] : null;
      const configPath = this.getConfigPath();
      if (fs.existsSync(configPath)) {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        config.activeClient = this.activeClient;
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
      }
    }
    return true;
  }

  clientExists(name: string): boolean {
    return fs.existsSync(this.getClientPath(name));
  }

  getConfigDir(): string {
    return this.configDir;
  }

  getClientsDir(): string {
    return this.clientsDir;
  }
}

export default ConfigManager;