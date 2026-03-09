import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config/manager';
import { AuthManager } from '../auth/manager';
import { CacheManager } from '../cache/manager';
import { DataverseClient } from '../api/client';
import { EntityMetadata, ExportOptions, SearchResult } from '../types';

export async function pullCommand(options: { full?: boolean; force?: boolean }): Promise<void> {
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
  if (cacheMeta && !options.force) {
    console.log(chalk.gray(`Last sync: ${cacheMeta.lastSync}`));
    console.log(chalk.gray(`Entities cached: ${cacheMeta.entityCount}`));
    console.log();
  }

  const spinner = ora('Fetching entity definitions...').start();

  try {
    // Fetch all entity definitions
    const entities = await api.getEntityDefinitions();
    spinner.text = `Processing ${entities.length} entities...`;

    // Store entities in cache
    for (const entity of entities) {
      cache.upsertEntity(entity);
    }

    // If full pull, fetch attributes and relationships for each entity
    if (options.full) {
      spinner.text = 'Fetching full metadata (attributes & relationships)...';
      
      let processed = 0;
      for (const entity of entities) {
        try {
          const fullEntity = await api.getFullEntityMetadata(entity.LogicalName);
          
          if (fullEntity.Attributes) {
            cache.upsertAttributes(entity.LogicalName, fullEntity.Attributes);
          }
          if (fullEntity.OneToManyRelationships) {
            cache.upsertRelationships(fullEntity.OneToManyRelationships, 'OneToMany');
          }
          if (fullEntity.ManyToOneRelationships) {
            cache.upsertRelationships(fullEntity.ManyToOneRelationships, 'ManyToOne');
          }
          if (fullEntity.ManyToManyRelationships) {
            cache.upsertRelationships(fullEntity.ManyToManyRelationships, 'ManyToMany');
          }
          
          processed++;
          spinner.text = `Fetching full metadata... (${processed}/${entities.length})`;
        } catch (error) {
          // Continue on error for individual entities
          console.log(chalk.yellow(`\nWarning: Could not fetch full metadata for ${entity.LogicalName}`));
        }
      }
    }

    // Update cache metadata
    cache.updateCacheMetadata({
      lastSync: new Date().toISOString(),
      entityCount: entities.length,
      version: '1.0',
    });

    spinner.succeed(chalk.green(`Pulled ${entities.length} entities`));
    
    console.log(chalk.gray(`\nCache location: ${path.join(config.getConfigDir(), `${activeClient}.db`)}`));
    console.log(chalk.gray('\nNext steps:'));
    console.log(chalk.gray('  d365ai schema search <query>  - Search entities'));
    console.log(chalk.gray('  d365ai schema export <entity>  - Export entity schema'));

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to pull schema'));
    console.error(chalk.red(error.message));
    process.exit(1);
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