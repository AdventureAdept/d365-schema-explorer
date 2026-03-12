import chalk from 'chalk';
import ora from 'ora';
import * as fs from 'fs';
import * as path from 'path';
import { ConfigManager } from '../config/manager';
import { AuthManager } from '../auth/manager';
import { CacheManager } from '../cache/manager';
import { DependencyClient } from '../api/dependency-client';
import { GraphBuilder } from '../impact/graph-builder';
import { GraphExportOptions } from '../impact/types';

/**
 * Validates entity/field name format
 */
function validateEntityName(name: string): boolean {
  // Allow alphanumeric and underscore, must start with letter
  return /^[a-zA-Z][a-zA-Z0-9_]*$/.test(name);
}

/**
 * Shared setup function for impact commands
 */
async function setupImpactCommand() {
  const config = new ConfigManager();
  const auth = new AuthManager(config);

  const activeClient = config.getActiveClient();
  if (!activeClient) {
    throw new Error('No active client. Run "d365ai env connect" first.');
  }

  const clientConfig = config.getActiveClientConfig();
  if (!clientConfig) {
    throw new Error('Active client configuration not found.');
  }

  const isAuthenticated = await auth.isAuthenticated(activeClient);
  if (!isAuthenticated) {
    throw new Error('Not authenticated. Run "d365ai env connect" first.');
  }

  const cache = new CacheManager(config.getConfigDir(), activeClient);
  cache.open();

  const dependencyClient = new DependencyClient(clientConfig.orgUrl, auth, activeClient);
  const graphBuilder = new GraphBuilder(dependencyClient, cache, clientConfig.orgUrl, auth, activeClient);

  return { config, auth, activeClient, clientConfig, cache, dependencyClient, graphBuilder };
}

export async function analyzeCommand(
  target: string,
  options: { entity?: string; field?: string }
): Promise<void> {
  // Validate target
  if (!target || typeof target !== 'string') {
    console.log(chalk.red('Target is required'));
    return;
  }
  
  let graphBuilder: GraphBuilder;
  let cache: CacheManager | undefined;
  let spinner: any;
  
  try {
    const setup = await setupImpactCommand();
    graphBuilder = setup.graphBuilder;
    cache = setup.cache;

    spinner = ora('Building dependency graph...').start();

    let graph;
    
    if (options.field && options.entity) {
      // Analyze specific field
      spinner.text = `Analyzing field ${options.entity}.${options.field}...`;
      graph = await graphBuilder.buildFieldGraph(options.entity, options.field);
    } else if (options.entity) {
      // Analyze entity
      spinner.text = `Analyzing entity ${options.entity}...`;
      graph = await graphBuilder.buildEntityGraph(options.entity);
    } else {
      // Try to parse target as entity.field or just entity
      const parts = target.split('.');
      if (parts.length === 2) {
        spinner.text = `Analyzing field ${parts[0]}.${parts[1]}...`;
        graph = await graphBuilder.buildFieldGraph(parts[0], parts[1]);
      } else {
        spinner.text = `Analyzing entity ${target}...`;
        graph = await graphBuilder.buildEntityGraph(target);
      }
    }

    const report = graphBuilder.generateImpactReport(graph);

    spinner.succeed(chalk.green('Dependency analysis complete'));

    // Display report
    console.log(chalk.bold('\n📊 Impact Analysis Report\n'));
    
    console.log(chalk.cyan('Target:'));
    console.log(`  Type: ${report.target.type}`);
    console.log(`  Name: ${report.target.name}`);
    if (report.target.entityName) {
      console.log(`  Entity: ${report.target.entityName}`);
    }
    console.log();

    console.log(chalk.cyan('Summary:'));
    console.log(`  Total dependencies: ${chalk.yellow(report.summary.totalDependencies)}`);
    console.log(`  Direct dependencies: ${chalk.yellow(report.summary.directDependencies)}`);
    console.log(`  Indirect dependencies: ${chalk.yellow(report.summary.indirectDependencies)}`);
    console.log();

    console.log(chalk.cyan('Risk Assessment:'));
    console.log(`  ${chalk.red('●')} High risk: ${report.summary.highRiskCount}`);
    console.log(`  ${chalk.yellow('●')} Medium risk: ${report.summary.mediumRiskCount}`);
    console.log(`  ${chalk.green('●')} Low risk: ${report.summary.lowRiskCount}`);
    console.log();

    // Display components by type
    if (report.components.plugins.length > 0) {
      console.log(chalk.cyan(`Plugins (${report.components.plugins.length}):`));
      report.components.plugins.forEach(p => {
        console.log(`  ${chalk.yellow('🔌')} ${p.name}`);
        if (p.metadata.description) {
          console.log(`     ${chalk.gray(p.metadata.description)}`);
        }
      });
      console.log();
    }

    if (report.components.workflows.length > 0) {
      console.log(chalk.cyan(`Workflows (${report.components.workflows.length}):`));
      report.components.workflows.forEach(w => {
        console.log(`  ${chalk.magenta('⚡')} ${w.name}`);
      });
      console.log();
    }

    if (report.components.forms.length > 0) {
      console.log(chalk.cyan(`Forms (${report.components.forms.length}):`));
      report.components.forms.forEach(f => {
        console.log(`  ${chalk.green('📄')} ${f.name}`);
      });
      console.log();
    }

    if (report.components.views.length > 0) {
      console.log(chalk.cyan(`Views (${report.components.views.length}):`));
      report.components.views.forEach(v => {
        console.log(`  ${chalk.blue('👁')} ${v.name}`);
      });
      console.log();
    }

    if (report.components.webResources.length > 0) {
      console.log(chalk.cyan(`Web Resources (${report.components.webResources.length}):`));
      report.components.webResources.forEach(wr => {
        console.log(`  ${chalk.cyan('📜')} ${wr.name}`);
        if (wr.metadata.description) {
          console.log(`     ${chalk.gray(wr.metadata.description)}`);
        }
        if (wr.metadata.lineNumber) {
          console.log(`     ${chalk.gray(`Line ${wr.metadata.lineNumber}: ${wr.metadata.codeSnippet?.substring(0, 60)}...`)}`);
        }
      });
      console.log();
    }

    console.log(chalk.cyan('Recommendations:'));
    report.recommendations.forEach(rec => {
      console.log(`  ${rec}`);
    });

  } catch (error: any) {
    if (spinner) {
      spinner.fail(chalk.red('Failed to analyze dependencies'));
    }
    console.error(chalk.red(error.message));
    throw error;
  } finally {
    cache?.close();
  }
}

export async function graphCommand(
  target: string,
  options: { 
    entity?: string; 
    field?: string; 
    format?: string; 
    output?: string;
    direction?: string;
  }
): Promise<void> {
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

  const dependencyClient = new DependencyClient(clientConfig.orgUrl, auth, activeClient);
  const graphBuilder = new GraphBuilder(dependencyClient, cache, clientConfig.orgUrl, auth, activeClient);

  const format = (options.format || 'mermaid') as 'mermaid' | 'dot' | 'json';
  const direction = (options.direction || 'LR') as 'TB' | 'BT' | 'LR' | 'RL';

  const spinner = ora('Building dependency graph...').start();

  try {
    let graph;
    
    if (options.field && options.entity) {
      spinner.text = `Building graph for field ${options.entity}.${options.field}...`;
      graph = await graphBuilder.buildFieldGraph(options.entity, options.field);
    } else if (options.entity) {
      spinner.text = `Building graph for entity ${options.entity}...`;
      graph = await graphBuilder.buildEntityGraph(options.entity);
    } else {
      const parts = target.split('.');
      if (parts.length === 2) {
        spinner.text = `Building graph for field ${parts[0]}.${parts[1]}...`;
        graph = await graphBuilder.buildFieldGraph(parts[0], parts[1]);
      } else {
        spinner.text = `Building graph for entity ${target}...`;
        graph = await graphBuilder.buildEntityGraph(target);
      }
    }

    const exportOptions: GraphExportOptions = { format, direction };
    
    let output: string;
    if (format === 'mermaid') {
      output = graphBuilder.exportToMermaid(graph, exportOptions);
    } else if (format === 'dot') {
      output = graphBuilder.exportToDOT(graph);
    } else {
      output = JSON.stringify(graphBuilder.generateImpactReport(graph), null, 2);
    }

    spinner.succeed(chalk.green('Graph generated'));

    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(chalk.green(`✓ Saved to ${options.output}`));
    } else {
      console.log('\n```' + format + '\n' + output + '\n```\n');
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to generate graph'));
    console.error(chalk.red(error.message));
    throw error;
  } finally {
    cache.close();
  }
}

export async function reportCommand(
  target: string,
  options: { 
    entity?: string; 
    field?: string; 
    output?: string;
    format?: string;
  }
): Promise<void> {
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

  const dependencyClient = new DependencyClient(clientConfig.orgUrl, auth, activeClient);
  const graphBuilder = new GraphBuilder(dependencyClient, cache, clientConfig.orgUrl, auth, activeClient);

  const spinner = ora('Generating impact report...').start();

  try {
    let graph;
    
    if (options.field && options.entity) {
      spinner.text = `Analyzing field ${options.entity}.${options.field}...`;
      graph = await graphBuilder.buildFieldGraph(options.entity, options.field);
    } else if (options.entity) {
      spinner.text = `Analyzing entity ${options.entity}...`;
      graph = await graphBuilder.buildEntityGraph(options.entity);
    } else {
      const parts = target.split('.');
      if (parts.length === 2) {
        spinner.text = `Analyzing field ${parts[0]}.${parts[1]}...`;
        graph = await graphBuilder.buildFieldGraph(parts[0], parts[1]);
      } else {
        spinner.text = `Analyzing entity ${target}...`;
        graph = await graphBuilder.buildEntityGraph(target);
      }
    }

    const report = graphBuilder.generateImpactReport(graph);
    const format = options.format || 'markdown';

    let output: string;
    if (format === 'json') {
      output = JSON.stringify(report, null, 2);
    } else {
      output = formatReportAsMarkdown(report);
    }

    spinner.succeed(chalk.green('Report generated'));

    if (options.output) {
      fs.writeFileSync(options.output, output);
      console.log(chalk.green(`✓ Saved to ${options.output}`));
    } else {
      console.log(output);
    }

  } catch (error: any) {
    spinner.fail(chalk.red('Failed to generate report'));
    console.error(chalk.red(error.message));
    throw error;
  } finally {
    cache.close();
  }
}

function formatReportAsMarkdown(report: any): string {
  let md = `# Impact Analysis Report\n\n`;
  md += `**Generated:** ${report.generatedAt}\n\n`;
  
  md += `## Target\n\n`;
  md += `- **Type:** ${report.target.type}\n`;
  md += `- **Name:** ${report.target.name}\n`;
  if (report.target.entityName) {
    md += `- **Entity:** ${report.target.entityName}\n`;
  }
  md += `\n`;
  
  md += `## Summary\n\n`;
  md += `- **Total Dependencies:** ${report.summary.totalDependencies}\n`;
  md += `- **Direct Dependencies:** ${report.summary.directDependencies}\n`;
  md += `- **Indirect Dependencies:** ${report.summary.indirectDependencies}\n`;
  md += `- **High Risk:** ${report.summary.highRiskCount}\n`;
  md += `- **Medium Risk:** ${report.summary.mediumRiskCount}\n`;
  md += `- **Low Risk:** ${report.summary.lowRiskCount}\n`;
  md += `\n`;
  
  md += `## Components\n\n`;
  
  if (report.components.plugins.length > 0) {
    md += `### Plugins (${report.components.plugins.length})\n\n`;
    report.components.plugins.forEach((p: any) => {
      md += `- **${p.name}**\n`;
      if (p.metadata.description) {
        md += `  - ${p.metadata.description}\n`;
      }
    });
    md += `\n`;
  }
  
  if (report.components.workflows.length > 0) {
    md += `### Workflows (${report.components.workflows.length})\n\n`;
    report.components.workflows.forEach((w: any) => {
      md += `- **${w.name}**\n`;
    });
    md += `\n`;
  }
  
  if (report.components.forms.length > 0) {
    md += `### Forms (${report.components.forms.length})\n\n`;
    report.components.forms.forEach((f: any) => {
      md += `- **${f.name}**\n`;
    });
    md += `\n`;
  }
  
  if (report.components.views.length > 0) {
    md += `### Views (${report.components.views.length})\n\n`;
    report.components.views.forEach((v: any) => {
      md += `- **${v.name}**\n`;
    });
    md += `\n`;
  }

  if (report.components.webResources.length > 0) {
    md += `### Web Resources (${report.components.webResources.length})\n\n`;
    report.components.webResources.forEach((wr: any) => {
      md += `- **${wr.name}**\n`;
      if (wr.metadata.description) {
        md += `  - ${wr.metadata.description}\n`;
      }
      if (wr.metadata.lineNumber) {
        md += `  - Line ${wr.metadata.lineNumber}: \`${wr.metadata.codeSnippet?.substring(0, 80)}...\`\n`;
      }
    });
    md += `\n`;
  }
  
  md += `## Recommendations\n\n`;
  report.recommendations.forEach((rec: string) => {
    md += `- ${rec}\n`;
  });
  
  return md;
}
