import inquirer from 'inquirer';
import chalk from 'chalk';
import { ConfigManager } from '../config/manager';

export async function useCommand(clientName?: string): Promise<void> {
  const config = new ConfigManager();
  const clients = config.listClients();

  if (clients.length === 0) {
    console.log(chalk.yellow('No clients configured. Run "d365ai env connect" to add a client.'));
    return;
  }

  if (clientName) {
    if (!config.clientExists(clientName)) {
      console.log(chalk.red(`Client "${clientName}" not found.`));
      console.log(chalk.gray(`Available clients: ${clients.join(', ')}`));
      return;
    }
    config.setActiveClient(clientName);
    console.log(chalk.green(`✓ Switched to client "${clientName}"`));
    return;
  }

  // Interactive selection
  const activeClient = config.getActiveClient();
  const { selectedClient } = await inquirer.prompt([
    {
      type: 'list',
      name: 'selectedClient',
      message: 'Select active client:',
      choices: clients.map(c => ({
        name: c + (c === activeClient ? chalk.green(' (active)') : ''),
        value: c,
      })),
      default: activeClient || clients[0],
    },
  ]);

  config.setActiveClient(selectedClient);
  console.log(chalk.green(`✓ Switched to client "${selectedClient}"`));
}