import inquirer from 'inquirer';
import chalk from 'chalk';
import ora from 'ora';
import { ConfigManager } from '../config/manager';
import { AuthManager } from '../auth/manager';
import { ClientConfig } from '../types';

export async function connectCommand(): Promise<void> {
  const config = new ConfigManager();
  const auth = new AuthManager(config);

  console.log(chalk.bold('\n🔗 Connect to Dataverse\n'));

  // Prompt for connection details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'orgUrl',
      message: 'Organization URL:',
      validate: (input: string) => {
        if (!input) return 'Organization URL is required';
        if (!input.startsWith('https://')) return 'URL must start with https://';
        return true;
      },
    },
    {
      type: 'input',
      name: 'clientName',
      message: 'Client name (for this connection):',
      default: (answers: any) => {
        const url = new URL(answers.orgUrl);
        return url.hostname.split('.')[0];
      },
      validate: (input: string) => {
        if (!input) return 'Client name is required';
        if (!/^[a-zA-Z0-9_-]+$/.test(input)) {
          return 'Client name can only contain letters, numbers, underscores, and hyphens';
        }
        return true;
      },
    },
    {
      type: 'input',
      name: 'tenantId',
      message: 'Tenant ID (leave empty for multi-tenant):',
      default: 'organizations',
    },
    {
      type: 'input',
      name: 'clientId',
      message: 'Client ID (leave empty for default):',
      default: '51f81489-12ee-4a9e-aaae-a2591f45987d',
    },
    {
      type: 'password',
      name: 'clientSecret',
      message: 'Client Secret (leave empty to use device code flow):',
      default: '',
    },
  ]);

  // Check if client already exists
  if (config.clientExists(answers.clientName)) {
    const { overwrite } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'overwrite',
        message: `Client "${answers.clientName}" already exists. Overwrite?`,
        default: false,
      },
    ]);
    if (!overwrite) {
      console.log(chalk.yellow('Operation cancelled.'));
      return;
    }
  }

  // Save client config
  const clientConfig: ClientConfig = {
    name: answers.clientName,
    orgUrl: answers.orgUrl,
    tenantId: answers.tenantId,
    clientId: answers.clientId,
    ...(answers.clientSecret ? { clientSecret: answers.clientSecret } : {}),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  config.saveClient(clientConfig);

  // Authenticate
  const spinner = ora('Authenticating with Microsoft...').start();
  
  try {
    const token = await auth.authenticate(
      answers.orgUrl,
      answers.tenantId,
      answers.clientId,
      answers.clientSecret || undefined
    );
    
    auth.saveAuth(answers.clientName, token);
    config.setActiveClient(answers.clientName);
    
    spinner.succeed(chalk.green('Authentication successful!'));
    
    console.log(chalk.gray(`\nClient: ${answers.clientName}`));
    console.log(chalk.gray(`Organization: ${answers.orgUrl}`));
    console.log(chalk.gray(`Token expires: ${token.expiresOn.toLocaleString()}`));
    console.log(chalk.green('\n✓ Connected successfully!'));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray('  d365ai schema pull    - Pull schema metadata'));
    console.log(chalk.gray('  d365ai schema search  - Search entities'));
    
  } catch (error: any) {
    spinner.fail(chalk.red('Authentication failed'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

export async function disconnectCommand(): Promise<void> {
  const config = new ConfigManager();
  const auth = new AuthManager(config);

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    console.log(chalk.yellow('No active client.'));
    return;
  }

  const clientConfig = config.getActiveClientConfig();
  if (!clientConfig) {
    console.log(chalk.yellow('No active client configuration found.'));
    return;
  }

  const { confirm } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Disconnect from "${activeClient}"?`,
      default: false,
    },
  ]);

  if (!confirm) {
    console.log(chalk.yellow('Operation cancelled.'));
    return;
  }

  auth.clearAuth(activeClient);
  console.log(chalk.green(`✓ Disconnected from "${activeClient}"`));
}

export async function statusCommand(): Promise<void> {
  const config = new ConfigManager();
  const auth = new AuthManager(config);

  const activeClient = config.getActiveClient();
  const clients = config.listClients();

  console.log(chalk.bold('\n📊 Connection Status\n'));

  if (clients.length === 0) {
    console.log(chalk.yellow('No clients configured.'));
    console.log(chalk.gray('Run "d365ai env connect" to add a client.'));
    return;
  }

  for (const clientName of clients) {
    const clientConfig = config.getClient(clientName);
    const isActive = clientName === activeClient;
    const isAuthenticated = await auth.isAuthenticated(clientName);

    console.log(`${isActive ? chalk.green('●') : '○'} ${chalk.bold(clientName)}${isActive ? chalk.green(' (active)') : ''}`);
    if (clientConfig) {
      console.log(chalk.gray(`  Organization: ${clientConfig.orgUrl}`));
      console.log(chalk.gray(`  Status: ${isAuthenticated ? chalk.green('Connected') : chalk.red('Not connected')}`));
    }
    console.log();
  }
}

export async function listClientsCommand(): Promise<void> {
  const config = new ConfigManager();
  const clients = config.listClients();
  const activeClient = config.getActiveClient();

  console.log(chalk.bold('\n📋 Configured Clients\n'));

  if (clients.length === 0) {
    console.log(chalk.yellow('No clients configured.'));
    console.log(chalk.gray('Run "d365ai env connect" to add a client.'));
    return;
  }

  for (const clientName of clients) {
    const clientConfig = config.getClient(clientName);
    const isActive = clientName === activeClient;
    
    console.log(`${isActive ? chalk.green('●') : '○'} ${clientName}`);
    if (clientConfig) {
      console.log(chalk.gray(`  URL: ${clientConfig.orgUrl}`));
    }
  }
}