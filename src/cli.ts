#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';

// Import commands
import { useCommand } from './commands/use';
import { connectCommand, disconnectCommand, statusCommand, listClientsCommand } from './commands/env';
import { pullCommand, searchCommand, exportCommand, listEntitiesCommand, syncStatusCommand } from './commands/schema';

// Read package.json for version
const packageJsonPath = path.join(__dirname, '..', 'package.json');
const packageJson = fs.existsSync(packageJsonPath) 
  ? JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'))
  : { version: '0.0.0' };

const program = new Command();

program
  .name('d365ai')
  .description('D365 Schema Explorer - CLI for browsing Dataverse schema')
  .version(packageJson.version);

// ============================================
// Client management
// ============================================

program
  .command('use <client>')
  .description('Switch active client')
  .action(async (client: string) => {
    await useCommand(client);
  });

// ============================================
// Environment commands
// ============================================

const envCommand = program
  .command('env')
  .description('Manage Dataverse environment connections');

envCommand
  .command('connect')
  .description('Connect to a Dataverse environment (MSAL device flow or service principal)')
  .action(async () => {
    await connectCommand();
  });

envCommand
  .command('disconnect')
  .description('Disconnect from current environment')
  .action(async () => {
    await disconnectCommand();
  });

envCommand
  .command('status')
  .description('Show connection status')
  .action(async () => {
    await statusCommand();
  });

envCommand
  .command('list')
  .description('List configured clients')
  .action(async () => {
    await listClientsCommand();
  });

// ============================================
// Schema commands
// ============================================

const schemaCommand = program
  .command('schema')
  .description('Manage and explore Dataverse schema');

schemaCommand
  .command('pull')
  .description('Pull schema metadata from Dataverse (auto-detects delta vs full sync)')
  .option('-f, --full', 'Force full metadata pull including all attributes and relationships')
  .option('--force', 'Force full refresh of cache (ignore existing data)')
  .option('--delta', 'Force delta sync (only fetch changes since last sync)')
  .action(async (options) => {
    await pullCommand(options);
  });

schemaCommand
  .command('sync-status')
  .description('Show sync status and cache statistics')
  .action(async () => {
    await syncStatusCommand();
  });

schemaCommand
  .command('search <query>')
  .description('Search entities, fields, and relationships')
  .option('-t, --type <type>', 'Filter by type (entity, attribute, relationship)')
  .option('-l, --limit <number>', 'Limit number of results', parseInt)
  .action(async (query: string, options) => {
    await searchCommand(query, options);
  });

schemaCommand
  .command('export [entity]')
  .description('Export schema as JSON or Markdown')
  .option('-f, --format <format>', 'Output format (json, markdown)', 'json')
  .option('-o, --output <path>', 'Output file path')
  .action(async (entity: string | undefined, options) => {
    await exportCommand(entity, {
      format: options.format,
      outputPath: options.output,
    });
  });

schemaCommand
  .command('list')
  .description('List all cached entities')
  .action(async () => {
    await listEntitiesCommand();
  });

// ============================================
// Run the CLI
// ============================================

program.parseAsync().catch((error) => {
  console.error(chalk.red('Error:'), error.message);
  process.exit(1);
});
