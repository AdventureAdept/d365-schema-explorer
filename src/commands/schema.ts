import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config/manager';
import { AuthManager } from '../auth/manager';
import { CacheManager } from '../cache/manager';
import { DataverseClient } from '../api/client';
import { EntityMetadata, ExportOptions } from '../types';

export async function pullCommand(options: { full?: boolean; force?: boolean; delta?: boolean }): Promise<void> {
  const config = new ConfigManager();
  const auth = new AuthManager(config);

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    console.log(chalk.yellow('No active client. Run "d365ai env connect" first.'));
    return;
  }

  const clientConfig = config.getActiveClientConfig();
  if (!clientConfig) {
    console.log(chalk.red('Active client configuration not found.'));
    return;
  }

  const isAuthenticated = await auth.isAuthenticated(activeClient);
  if (!isAuthenticated) {
    console.log(chalk.yellow('Not authenticated. Run "d365ai env connect" first.'));
    return;
  }

  const cache = new CacheManager(config.getConfigDir(), activeClient);
  cache.open();

  const api = new DataverseClient(clientConfig.orgUrl, auth, activeClient);

  // Check existing cache
  const cacheMeta = cache.getCacheMetadata();
  const lastSync = cache.getLastSyncTimestamp();
  
  if (cacheMeta && !options.force) {
    console.log(chalk.gray(`Last sync: ${cacheMeta.lastSync || 'never'}`));
    console.log(chalk.gray(`Entities cached: ${cacheMeta.entityCount || 0}`));
    console.log(chalk.gray(`Delta sync enabled: ${cacheMeta.deltaSyncEnabled ? 'yes' : 'no'}`));
    console.log();
  }

  // Determine sync mode
  const canDeltaSync = lastSync && !options.force && !options.full;
  const useDeltaSync = options.delta || canDeltaSync;

  if (useDeltaSync && lastSync) {
    await performDeltaSync(api, cache, lastSync);
  } else {
    await performFullSync(api, cache, options.full || false);
  }

  cache.close();
}

async function performFullSync(api: DataverseClient, cache: CacheManager, fetchFullMetadata: boolean): Promise<void> {
  const spinner = ora('Fetching entity definitions...').start();

  try {
    spinner.text = 'Performing full sync...';
    const syncResult = await api.performFullSync();
    
    spinner.text = `Processing ${syncResult.entities.length} entities...`;

    // Store in cache using delta sync (which handles both new and updates)
    const deltaResult = cache.performDeltaSync(
      syncResult.entities,
      syncResult.attributes,
      syncResult.relationships
    );

    // Update metadata for full sync
    const now = new Date().toISOString();
    cache.updateCacheMetadata({
      lastSync: now,
      lastFullSync: now,
      entityCount: syncResult.entities.length,
      version: '1.0',
      deltaSyncEnabled: true,
    });

    spinner.succeed(chalk.green(`Full sync complete: ${deltaResult.entitiesAdded} added, ${deltaResult.entitiesUpdated} updated`));
    
    if (fetchFullMetadata) {
      console.log(chalk.gray(`Attributes: ${deltaResult.attributesAdded} added, ${deltaResult.attributesUpdated} updated`));
      console.log(chalk.gray(`Relationships: ${deltaResult.relationshipsAdded} added, ${deltaResult.relationshipsUpdated} updated`));
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to pull schema'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

async function performDeltaSync(api: DataverseClient, cache: CacheManager, sinceTimestamp: string): Promise<void> {
  const spinner = ora(`Performing delta sync since ${sinceTimestamp}...`).start();

  try {
    const syncResult = await api.performDeltaSync(sinceTimestamp);
    
    if (syncResult.entities.length === 0) {
      spinner.succeed(chalk.green('No changes detected'));
      
      // Still update the timestamp
      cache.updateCacheMetadata({
        ...cache.getCacheMetadata(),
        lastSync: new Date().toISOString(),
      });
      return;
    }

    spinner.text = `Processing ${syncResult.entities.length} changed entities...`;

    // Merge changes into cache
    const deltaResult = cache.performDeltaSync(
      syncResult.entities,
      syncResult.attributes,
      syncResult.relationships
    );

    // Update metadata
    cache.updateCacheMetadata({
      ...cache.getCacheMetadata(),
      lastSync: deltaResult.lastSync,
      entityCount: cache.getEntityCount(),
    });

    spinner.succeed(chalk.green(`Delta sync complete:`));
    console.log(chalk.gray(`  Entities: ${deltaResult.entitiesAdded} added, ${deltaResult.entitiesUpdated} updated, ${deltaResult.entitiesDeleted} deleted`));
    console.log(chalk.gray(`  Attributes: ${deltaResult.attributesAdded} added, ${deltaResult.attributesUpdated} updated`));
    console.log(chalk.gray(`  Relationships: ${deltaResult.relationshipsAdded} added, ${deltaResult.relationshipsUpdated} updated`));

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to perform delta sync'));
    console.error(chalk.red(error.message));
    console.log(chalk.yellow('\nFalling back to full sync...'));
    await performFullSync(api, cache, true);
  }
}

export async function syncStatusCommand(): Promise<void> {
  const config = new ConfigManager();

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    console.log(chalk.yellow('No active client. Run "d365ai env connect" first.'));
    return;
  }

  const cache = new CacheManager(config.getConfigDir(), activeClient);
  cache.open();

  try {
    const stats = cache.getCacheStats();
    const meta = cache.getCacheMetadata();

    console.log(chalk.bold('\n📊 Sync Status\n'));
    console.log(`Client: ${chalk.cyan(activeClient)}`);
    console.log(`Entities: ${chalk.green(stats.entityCount.toString())}`);
    console.log(`Attributes: ${chalk.green(stats.attributeCount.toString())}`);
    console.log(`Relationships: ${chalk.green(stats.relationshipCount.toString())}`);
    console.log();
    console.log(`Last sync: ${meta?.lastSync ? chalk.gray(meta.lastSync) : chalk.yellow('never')}`);
    console.log(`Last full sync: ${meta?.lastFullSync ? chalk.gray(meta.lastFullSync) : chalk.yellow('never')}`);
    console.log(`Delta sync: ${meta?.deltaSyncEnabled ? chalk.green('enabled') : chalk.yellow('disabled')}`);
    console.log();
    console.log(chalk.gray('Commands:'));
    console.log(chalk.gray('  d365ai schema pull        - Delta sync (fast, only changes)'));
    console.log(chalk.gray('  d365ai schema pull --full - Full sync with all metadata'));
    console.log(chalk.gray('  d365ai schema pull --force - Force full refresh'));

  } finally {
    cache.close();
  }
}

export async function searchCommand(query: string, options: { type?: string; limit?: number }): Promise<void> {
  const config = new ConfigManager();

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    console.log(chalk.yellow('No active client. Run "d365ai env connect" first.'));
    return;
  }

  const cache = new CacheManager(config.getConfigDir(), activeClient);
  cache.open();

  const cacheMeta = cache.getCacheMetadata();
  if (!cacheMeta) {
    console.log(chalk.yellow('No schema cache found. Run "d365ai schema pull" first.'));
    cache.close();
    return;
  }

  const limit = options.limit || 20;

  console.log(chalk.bold(`\n🔍 Search results for "${query}"\n`));

  try {
    // Search entities
    if (!options.type || options.type === 'entity') {
      const entities = cache.searchEntities(query);
      if (entities.length > 0) {
        console.log(chalk.cyan.bold('Entities:'));
        entities.slice(0, limit).forEach(entity => {
          const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || '';
          console.log(`  ${chalk.green(entity.LogicalName)}${displayName ? ` - ${displayName}` : ''}`);
        });
        if (entities.length > limit) {
          console.log(chalk.gray(`  ... and ${entities.length - limit} more`));
        }
        console.log();
      }
    }

    // Search attributes
    if (!options.type || options.type === 'attribute') {
      const attributes = cache.searchAttributes(query);
      if (attributes.length > 0) {
        console.log(chalk.cyan.bold('Attributes:'));
        attributes.slice(0, limit).forEach(({ entityName, attribute }) => {
          const displayName = attribute.DisplayName?.UserLocalizedLabel?.Label || '';
          console.log(`  ${chalk.gray(entityName + '.')} ${chalk.green(attribute.LogicalName)}${displayName ? ` - ${displayName}` : ''}`);
        });
        if (attributes.length > limit) {
          console.log(chalk.gray(`  ... and ${attributes.length - limit} more`));
        }
        console.log();
      }
    }

    // Search relationships
    if (!options.type || options.type === 'relationship') {
      const relationships = cache.searchRelationships(query);
      if (relationships.length > 0) {
        console.log(chalk.cyan.bold('Relationships:'));
        relationships.slice(0, limit).forEach((rel: any) => {
          console.log(`  ${chalk.green(rel.SchemaName)} - ${rel.ReferencedEntity || ''} → ${rel.ReferencingEntity || ''}`);
        });
        if (relationships.length > limit) {
          console.log(chalk.gray(`  ... and ${relationships.length - limit} more`));
        }
        console.log();
      }
    }

  } finally {
    cache.close();
  }
}

export async function exportCommand(entityName?: string, options?: ExportOptions): Promise<void> {
  const config = new ConfigManager();

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    console.log(chalk.yellow('No active client. Run "d365ai env connect" first.'));
    return;
  }

  const cache = new CacheManager(config.getConfigDir(), activeClient);
  cache.open();

  const cacheMeta = cache.getCacheMetadata();
  if (!cacheMeta) {
    console.log(chalk.yellow('No schema cache found. Run "d365ai schema pull" first.'));
    cache.close();
    return;
  }

  const format = options?.format || 'json';

  try {
    if (entityName) {
      // Export single entity
      const entity = cache.getEntity(entityName);
      if (!entity) {
        console.log(chalk.red(`Entity "${entityName}" not found.`));
        return;
      }

      const output = format === 'markdown' 
        ? formatEntityMarkdown(entity)
        : JSON.stringify(entity, null, 2);

      if (options?.outputPath) {
        fs.writeFileSync(options.outputPath, output);
        console.log(chalk.green(`✓ Exported to ${options.outputPath}`));
      } else {
        console.log(output);
      }
    } else {
      // Export all entities
      const entities = cache.getAllEntities();
      
      if (format === 'markdown') {
        let output = `# Dataverse Schema Export\n\n`;
        output += `Generated: ${new Date().toISOString()}\n`;
        output += `Entities: ${entities.length}\n\n`;
        
        for (const entity of entities) {
          output += formatEntityMarkdown(entity) + '\n---\n\n';
        }
        
        if (options?.outputPath) {
          fs.writeFileSync(options.outputPath, output);
          console.log(chalk.green(`✓ Exported ${entities.length} entities to ${options.outputPath}`));
        } else {
          console.log(output);
        }
      } else {
        const output = JSON.stringify(entities, null, 2);
        if (options?.outputPath) {
          fs.writeFileSync(options.outputPath, output);
          console.log(chalk.green(`✓ Exported ${entities.length} entities to ${options.outputPath}`));
        } else {
          console.log(output);
        }
      }
    }
  } finally {
    cache.close();
  }
}

function formatEntityMarkdown(entity: EntityMetadata): string {
  const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName;
  const description = entity.Description?.UserLocalizedLabel?.Label || '';
  
  let md = `## ${displayName}\n\n`;
  md += `**Logical Name:** ${entity.LogicalName}\n`;
  md += `**Schema Name:** ${entity.SchemaName}\n`;
  if (entity.PrimaryIdAttribute) {
    md += `**Primary ID:** ${entity.PrimaryIdAttribute}\n`;
  }
  if (entity.PrimaryNameAttribute) {
    md += `**Primary Name:** ${entity.PrimaryNameAttribute}\n`;
  }
  if (entity.EntitySetName) {
    md += `**Entity Set:** ${entity.EntitySetName}\n`;
  }
  if (description) {
    md += `\n${description}\n`;
  }
  
  // Attributes
  if (entity.Attributes && entity.Attributes.length > 0) {
    md += `\n### Attributes\n\n`;
    md += `| Name | Type | Display Name |\n`;
    md += `|------|------|-------------|\n`;
    for (const attr of entity.Attributes.slice(0, 50)) { // Limit to 50 for readability
      const attrDisplayName = attr.DisplayName?.UserLocalizedLabel?.Label || '';
      const attrType = attr.AttributeType || attr.AttributeTypeName?.Value || '';
      md += `| ${attr.LogicalName} | ${attrType} | ${attrDisplayName} |\n`;
    }
    if (entity.Attributes.length > 50) {
      md += `\n*... and ${entity.Attributes.length - 50} more attributes*\n`;
    }
  }
  
  return md;
}

export async function listEntitiesCommand(): Promise<void> {
  const config = new ConfigManager();

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    console.log(chalk.yellow('No active client. Run "d365ai env connect" first.'));
    return;
  }

  const cache = new CacheManager(config.getConfigDir(), activeClient);
  cache.open();

  const cacheMeta = cache.getCacheMetadata();
  if (!cacheMeta) {
    console.log(chalk.yellow('No schema cache found. Run "d365ai schema pull" first.'));
    cache.close();
    return;
  }

  try {
    const entities = cache.getAllEntities();
    
    console.log(chalk.bold(`\n📋 Entities (${entities.length})\n`));
    
    for (const entity of entities) {
      const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || '';
      console.log(`  ${chalk.green(entity.LogicalName)}${displayName ? ` - ${displayName}` : ''}`);
    }
    
    console.log(chalk.gray(`\nTotal: ${entities.length} entities`));
    console.log(chalk.gray(`Last sync: ${cacheMeta.lastSync}`));
    
  } finally {
    cache.close();
  }
}
