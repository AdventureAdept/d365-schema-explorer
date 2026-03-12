import { DependencyNode, DependencyGraph, GraphExportOptions, ImpactReport } from './types';
import { DependencyClient } from '../api/dependency-client';
import { WebResourceClient, WebResourceUsage } from '../api/webresource-client';
import { PluginCodeAnalyzer, PluginCodeUsage } from '../api/plugin-code-analyzer';
import { CacheManager } from '../cache/manager';
import { AuthManager } from '../auth/manager';

export class GraphBuilder {
  private dependencyClient: DependencyClient;
  private webResourceClient: WebResourceClient;
  private pluginCodeAnalyzer: PluginCodeAnalyzer;
  private cacheManager: CacheManager;
  private orgUrl: string;
  private authManager: AuthManager;
  private clientName: string;

  constructor(
    dependencyClient: DependencyClient, 
    cacheManager: CacheManager, 
    orgUrl: string,
    authManager: AuthManager,
    clientName: string,
    pluginSourcePath?: string
  ) {
    this.dependencyClient = dependencyClient;
    this.cacheManager = cacheManager;
    this.orgUrl = orgUrl;
    this.authManager = authManager;
    this.clientName = clientName;
    this.webResourceClient = new WebResourceClient(orgUrl, authManager, clientName);
    try {
      this.pluginCodeAnalyzer = new PluginCodeAnalyzer(pluginSourcePath);
    } catch {
      // Plugin source path not configured or doesn't exist — skip local code analysis
      this.pluginCodeAnalyzer = null as any;
    }
  }

  /**
   * Build dependency graph for an entity
   */
  async buildEntityGraph(entityLogicalName: string): Promise<DependencyGraph> {
    const nodes = new Map<string, DependencyNode>();
    
    // Add root entity node
    const entityNode: DependencyNode = {
      id: `entity:${entityLogicalName}`,
      type: 'entity',
      name: entityLogicalName,
      dependencies: [],
      dependedOnBy: [],
      metadata: {
        riskLevel: 'high',
      },
    };
    nodes.set(entityNode.id, entityNode);

    // Get entity dependencies
    await this.addEntityDependencies(entityLogicalName, nodes, entityNode);

    return {
      nodes,
      rootId: entityNode.id,
      rootType: 'entity',
      generatedAt: new Date().toISOString(),
      
      getNode: (id: string) => nodes.get(id),
      getDependencies: (id: string) => {
        const node = nodes.get(id);
        if (!node) return [];
        return node.dependencies.map(depId => nodes.get(depId)).filter(Boolean) as DependencyNode[];
      },
      getDependents: (id: string) => {
        const node = nodes.get(id);
        if (!node) return [];
        return node.dependedOnBy.map(depId => nodes.get(depId)).filter(Boolean) as DependencyNode[];
      },
      getAllNodes: () => Array.from(nodes.values()),
      getNodesByType: (type: DependencyNode['type']) => 
        Array.from(nodes.values()).filter(n => n.type === type),
      getHighRiskNodes: () => 
        Array.from(nodes.values()).filter(n => n.metadata.riskLevel === 'high'),
    };
  }

  /**
   * Build dependency graph for a specific field/attribute
   */
  async buildFieldGraph(
    entityLogicalName: string, 
    fieldLogicalName: string
  ): Promise<DependencyGraph> {
    const nodes = new Map<string, DependencyNode>();
    
    // Add root field node
    const fieldNode: DependencyNode = {
      id: `attribute:${entityLogicalName}.${fieldLogicalName}`,
      type: 'attribute',
      name: fieldLogicalName,
      entityName: entityLogicalName,
      dependencies: [],
      dependedOnBy: [],
      metadata: {
        riskLevel: 'high',
      },
    };
    nodes.set(fieldNode.id, fieldNode);

    // Get field dependencies
    await this.addFieldDependencies(entityLogicalName, fieldLogicalName, nodes, fieldNode);

    return {
      nodes,
      rootId: fieldNode.id,
      rootType: 'attribute',
      generatedAt: new Date().toISOString(),
      
      getNode: (id: string) => nodes.get(id),
      getDependencies: (id: string) => {
        const node = nodes.get(id);
        if (!node) return [];
        return node.dependencies.map(depId => nodes.get(depId)).filter(Boolean) as DependencyNode[];
      },
      getDependents: (id: string) => {
        const node = nodes.get(id);
        if (!node) return [];
        return node.dependedOnBy.map(depId => nodes.get(depId)).filter(Boolean) as DependencyNode[];
      },
      getAllNodes: () => Array.from(nodes.values()),
      getNodesByType: (type: DependencyNode['type']) => 
        Array.from(nodes.values()).filter(n => n.type === type),
      getHighRiskNodes: () => 
        Array.from(nodes.values()).filter(n => n.metadata.riskLevel === 'high'),
    };
  }

  /**
   * Add entity dependencies to graph
   */
  private async addEntityDependencies(
    entityLogicalName: string,
    nodes: Map<string, DependencyNode>,
    entityNode: DependencyNode
  ): Promise<void> {
    // Get plugins
    try {
      const plugins = await this.dependencyClient.getPluginsForEntity(entityLogicalName);
      for (const plugin of plugins) {
        const pluginNode: DependencyNode = {
          id: `plugin:${plugin.pluginAssemblyId}`,
          type: 'plugin',
          name: plugin.name,
          entityName: entityLogicalName,
          dependencies: [entityNode.id],
          dependedOnBy: [],
          metadata: {
            componentId: plugin.pluginAssemblyId,
            componentType: 'plugin',
            riskLevel: 'high',
            description: `${plugin.messageName} - Stage ${plugin.stage}`,
          },
        };
        nodes.set(pluginNode.id, pluginNode);
        entityNode.dependedOnBy.push(pluginNode.id);
      }
    } catch (error) {
      console.warn(`Failed to get plugins for ${entityLogicalName}:`, error);
    }

    // Get workflows
    try {
      const workflows = await this.dependencyClient.getWorkflowsForEntity(entityLogicalName);
      for (const workflow of workflows) {
        const workflowNode: DependencyNode = {
          id: `workflow:${workflow.workflowId}`,
          type: 'workflow',
          name: workflow.name,
          entityName: entityLogicalName,
          dependencies: [entityNode.id],
          dependedOnBy: [],
          metadata: {
            componentId: workflow.workflowId,
            componentType: 'workflow',
            riskLevel: 'medium',
            description: `Category: ${workflow.category}`,
          },
        };
        nodes.set(workflowNode.id, workflowNode);
        entityNode.dependedOnBy.push(workflowNode.id);
      }
    } catch (error) {
      console.warn(`Failed to get workflows for ${entityLogicalName}:`, error);
    }

    // Get forms
    try {
      const forms = await this.dependencyClient.getFormsForEntity(entityLogicalName);
      for (const form of forms) {
        const formNode: DependencyNode = {
          id: `form:${form.formId}`,
          type: 'form',
          name: form.name,
          entityName: entityLogicalName,
          dependencies: [entityNode.id],
          dependedOnBy: [],
          metadata: {
            componentId: form.formId,
            componentType: 'form',
            riskLevel: 'medium',
            description: `Type: ${form.type}`,
          },
        };
        nodes.set(formNode.id, formNode);
        entityNode.dependedOnBy.push(formNode.id);
      }
    } catch (error) {
      console.warn(`Failed to get forms for ${entityLogicalName}:`, error);
    }

    // Get views
    try {
      const views = await this.dependencyClient.getViewsForEntity(entityLogicalName);
      for (const view of views) {
        const viewNode: DependencyNode = {
          id: `view:${view.viewId}`,
          type: 'view',
          name: view.name,
          entityName: entityLogicalName,
          dependencies: [entityNode.id],
          dependedOnBy: [],
          metadata: {
            componentId: view.viewId,
            componentType: 'view',
            riskLevel: 'low',
            description: `Query Type: ${view.queryType}`,
          },
        };
        nodes.set(viewNode.id, viewNode);
        entityNode.dependedOnBy.push(viewNode.id);
      }
    } catch (error) {
      console.warn(`Failed to get views for ${entityLogicalName}:`, error);
    }

    // Get reports
    try {
      const reports = await this.dependencyClient.getReportsForEntity(entityLogicalName);
      for (const report of reports) {
        const reportNode: DependencyNode = {
          id: `report:${report.reportId}`,
          type: 'report',
          name: report.name,
          entityName: entityLogicalName,
          dependencies: [entityNode.id],
          dependedOnBy: [],
          metadata: {
            componentId: report.reportId,
            componentType: 'report',
            riskLevel: 'low',
            description: `Report Type: ${report.reportTypeCode}`,
          },
        };
        nodes.set(reportNode.id, reportNode);
        entityNode.dependedOnBy.push(reportNode.id);
      }
    } catch (error) {
      console.warn(`Failed to get reports for ${entityLogicalName}:`, error);
    }

    // Get web resources (JavaScript files that reference this entity)
    try {
      const webResourceUsages = await this.webResourceClient.searchWebResources(entityLogicalName);
      for (const usage of webResourceUsages) {
        for (const occurrence of usage.occurrences) {
          const webResourceNode: DependencyNode = {
            id: `webresource:${usage.webResourceName}:${occurrence.lineNumber}`,
            type: 'webresource',
            name: usage.webResourceName,
            entityName: entityLogicalName,
            dependencies: [entityNode.id],
            dependedOnBy: [],
            metadata: {
              componentType: 'webresource',
              riskLevel: 'medium',
              description: occurrence.functionDescription || `Web Resource (${usage.webResourceType})`,
              codeSnippet: occurrence.codeSnippet,
              lineNumber: occurrence.lineNumber,
              context: occurrence.context,
            },
          };
          nodes.set(webResourceNode.id, webResourceNode);
          entityNode.dependedOnBy.push(webResourceNode.id);
        }
      }
    } catch (error) {
      console.warn(`Failed to get web resources for ${entityLogicalName}:`, error);
    }

    // Get plugin code references (C# files from local source)
    try {
      if (!this.pluginCodeAnalyzer) throw new Error('Plugin source path not configured');
      const pluginUsages = await this.pluginCodeAnalyzer.searchPluginCode(entityLogicalName);
      for (const usage of pluginUsages) {
        for (const occurrence of usage.occurrences) {
          const pluginCodeNode: DependencyNode = {
            id: `plugincode:${usage.pluginName}:${occurrence.lineNumber}`,
            type: 'plugin',
            name: `${usage.pluginName} (Code)`,
            entityName: entityLogicalName,
            dependencies: [entityNode.id],
            dependedOnBy: [],
            metadata: {
              componentType: 'plugin',
              riskLevel: 'high',
              description: occurrence.functionDescription || `Plugin code reference`,
              codeSnippet: occurrence.codeSnippet,
              lineNumber: occurrence.lineNumber,
              context: occurrence.context,
            },
          };
          nodes.set(pluginCodeNode.id, pluginCodeNode);
          entityNode.dependedOnBy.push(pluginCodeNode.id);
        }
      }
    } catch (error) {
      console.warn(`Failed to analyze plugin code for ${entityLogicalName}:`, error);
    }
  }

  /**
   * Add field dependencies to graph
   */
  private async addFieldDependencies(
    entityLogicalName: string,
    fieldLogicalName: string,
    nodes: Map<string, DependencyNode>,
    fieldNode: DependencyNode
  ): Promise<void> {
    // Get forms and check if field is used
    try {
      const forms = await this.dependencyClient.getFormsForEntity(entityLogicalName);
      for (const form of forms) {
        if (form.formXml && form.formXml.includes(fieldLogicalName)) {
          const formNode: DependencyNode = {
            id: `form:${form.formId}`,
            type: 'form',
            name: form.name,
            entityName: entityLogicalName,
            dependencies: [fieldNode.id],
            dependedOnBy: [],
            metadata: {
              componentId: form.formId,
              componentType: 'form',
              riskLevel: 'high',
              description: `Contains field ${fieldLogicalName}`,
            },
          };
          nodes.set(formNode.id, formNode);
          fieldNode.dependedOnBy.push(formNode.id);
        }
      }
    } catch (error) {
      console.warn(`Failed to get forms for ${entityLogicalName}:`, error);
    }

    // Get views and check if field is used
    try {
      const views = await this.dependencyClient.getViewsForEntity(entityLogicalName);
      for (const view of views) {
        if (view.layoutXml && view.layoutXml.includes(fieldLogicalName)) {
          const viewNode: DependencyNode = {
            id: `view:${view.viewId}`,
            type: 'view',
            name: view.name,
            entityName: entityLogicalName,
            dependencies: [fieldNode.id],
            dependedOnBy: [],
            metadata: {
              componentId: view.viewId,
              componentType: 'view',
              riskLevel: 'medium',
              description: `Contains field ${fieldLogicalName}`,
            },
          };
          nodes.set(viewNode.id, viewNode);
          fieldNode.dependedOnBy.push(viewNode.id);
        }
      }
    } catch (error) {
      console.warn(`Failed to get views for ${entityLogicalName}:`, error);
    }

    // Get workflows and check if field is used in XAML
    try {
      const workflows = await this.dependencyClient.getWorkflowsForEntity(entityLogicalName);
      for (const workflow of workflows) {
        const workflowDetails = await this.dependencyClient.getWorkflowDetails(workflow.workflowId);
        if (workflowDetails && workflowDetails.xaml) {
          const isFieldUsed = this.dependencyClient.isFieldUsedInWorkflow(
            fieldLogicalName,
            workflowDetails.xaml
          );
          
          if (isFieldUsed) {
            const workflowNode: DependencyNode = {
              id: `workflow:${workflow.workflowId}`,
              type: 'workflow',
              name: workflow.name,
              entityName: entityLogicalName,
              dependencies: [fieldNode.id],
              dependedOnBy: [],
              metadata: {
                componentId: workflow.workflowId,
                componentType: 'workflow',
                riskLevel: 'high',
                description: `Uses field ${fieldLogicalName} in workflow logic`,
              },
            };
            nodes.set(workflowNode.id, workflowNode);
            fieldNode.dependedOnBy.push(workflowNode.id);
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to get workflows for ${entityLogicalName}:`, error);
    }

    // Get web resources and check if field is referenced in JavaScript
    try {
      const webResourceUsages = await this.webResourceClient.searchWebResources(
        fieldLogicalName,
        entityLogicalName,
        fieldLogicalName
      );
      for (const usage of webResourceUsages) {
        for (const occurrence of usage.occurrences) {
          const webResourceNode: DependencyNode = {
            id: `webresource:${usage.webResourceName}:${occurrence.lineNumber}`,
            type: 'webresource',
            name: usage.webResourceName,
            entityName: entityLogicalName,
            dependencies: [fieldNode.id],
            dependedOnBy: [],
            metadata: {
              componentType: 'webresource',
              riskLevel: 'high',
              description: occurrence.functionDescription || `Uses field ${fieldLogicalName} (${usage.webResourceType})`,
              codeSnippet: occurrence.codeSnippet,
              lineNumber: occurrence.lineNumber,
              context: occurrence.context,
            },
          };
          nodes.set(webResourceNode.id, webResourceNode);
          fieldNode.dependedOnBy.push(webResourceNode.id);
        }
      }
    } catch (error) {
      console.warn(`Failed to get web resources for field ${fieldLogicalName}:`, error);
    }
  }

  /**
   * Generate Mermaid diagram from graph
   */
  private sanitizeMermaidId(id: string): string {
    // Mermaid node IDs cannot contain colons, hyphens, dots, or spaces
    return id.replace(/[:\-.\s]/g, '_');
  }

  exportToMermaid(graph: DependencyGraph, options: Partial<GraphExportOptions> = {}): string {
    const direction = options.direction || 'LR';
    const SUMMARY_THRESHOLD = 5; // Use summary nodes when a type has more than this many items

    const lines: string[] = [`graph ${direction}`];

    const rootNode = graph.getNode(graph.rootId);
    if (!rootNode) return lines.join('\n');

    const rootSafeId = this.sanitizeMermaidId(rootNode.id);
    const rootLabel = (rootNode.displayName || rootNode.name).replace(/["<>]/g, "'");
    lines.push(`    ${rootSafeId}["${rootLabel}"]:::${rootNode.type}`);

    const typeConfig: { type: DependencyNode['type']; icon: string; style: string }[] = [
      { type: 'plugin',   icon: '🔌', style: 'plugin' },
      { type: 'workflow', icon: '⚡', style: 'workflow' },
      { type: 'form',     icon: '📄', style: 'form' },
      { type: 'view',     icon: '👁', style: 'view' },
      { type: 'report',   icon: '📊', style: 'report' },
      { type: 'webresource', icon: '📜', style: 'webresource' },
    ];

    for (const { type, icon, style } of typeConfig) {
      const nodes = graph.getNodesByType(type);
      if (nodes.length === 0) continue;

      if (nodes.length > SUMMARY_THRESHOLD) {
        // Summary node: show count only
        const summaryId = `summary_${type}`;
        const highRisk = nodes.filter(n => n.metadata.riskLevel === 'high').length;
        const riskLabel = highRisk > 0 ? ` ⚠️${highRisk} high risk` : '';
        lines.push(`    ${summaryId}["${icon} ${nodes.length} ${type}s${riskLabel}"]:::${style}`);
        lines.push(`    ${rootSafeId} --> ${summaryId}`);
      } else {
        // Show individual nodes
        for (const node of nodes) {
          const rawLabel = node.displayName || node.name || '';
          const label = `${icon} ${(rawLabel.trim() || 'unnamed').replace(/["<>]/g, "'")}`;
          const safeId = this.sanitizeMermaidId(node.id);
          lines.push(`    ${safeId}["${label}"]:::${style}`);
          lines.push(`    ${rootSafeId} --> ${safeId}`);
        }
      }
    }

    // Class definitions
    lines.push('    classDef entity fill:#e94560,stroke:#333,stroke-width:2px,color:#fff');
    lines.push('    classDef attribute fill:#4ea8de,stroke:#333,stroke-width:2px,color:#fff');
    lines.push('    classDef plugin fill:#f4d03f,stroke:#333,stroke-width:1px');
    lines.push('    classDef workflow fill:#9b59b6,stroke:#333,stroke-width:1px,color:#fff');
    lines.push('    classDef form fill:#2ecc71,stroke:#333,stroke-width:1px');
    lines.push('    classDef view fill:#34495e,stroke:#333,stroke-width:1px,color:#fff');
    lines.push('    classDef webresource fill:#3498db,stroke:#333,stroke-width:1px,color:#fff');
    lines.push('    classDef report fill:#e67e22,stroke:#333,stroke-width:1px,color:#fff');

    return lines.join('\n');
  }

  private getMermaidStyle(node: DependencyNode): string {
    switch (node.type) {
      case 'entity':
        return ':::entity';
      case 'attribute':
        return ':::attribute';
      case 'plugin':
        return ':::plugin';
      case 'workflow':
        return ':::workflow';
      case 'form':
        return ':::form';
      case 'view':
        return ':::view';
      case 'webresource':
        return ':::webresource';
      default:
        return '';
    }
  }

  /**
   * Generate DOT format for Graphviz
   */
  exportToDOT(graph: DependencyGraph): string {
    const lines: string[] = ['digraph DependencyGraph {'];
    lines.push('    rankdir=TB;');
    lines.push('    node [shape=box, style="filled,rounded", fontname="Arial"];');
    
    // Add nodes
    for (const node of graph.getAllNodes()) {
      const color = this.getDOTColor(node);
      const label = node.displayName || node.name;
      lines.push(`    "${node.id}" [label="${label}", fillcolor="${color}"];`);
    }
    
    // Add edges
    for (const node of graph.getAllNodes()) {
      for (const depId of node.dependedOnBy) {
        lines.push(`    "${node.id}" -> "${depId}";`);
      }
    }
    
    lines.push('}');
    return lines.join('\n');
  }

  private getDOTColor(node: DependencyNode): string {
    switch (node.type) {
      case 'entity':
        return '#e94560';
      case 'attribute':
        return '#4ea8de';
      case 'plugin':
        return '#f4d03f';
      case 'workflow':
        return '#9b59b6';
      case 'form':
        return '#2ecc71';
      case 'view':
        return '#34495e';
      case 'report':
        return '#e67e22';
      case 'webresource':
        return '#3498db';
      default:
        return '#95a5a6';
    }
  }

  /**
   * Generate impact report from graph
   */
  generateImpactReport(graph: DependencyGraph): ImpactReport {
    const allNodes = graph.getAllNodes();
    const plugins = graph.getNodesByType('plugin');
    const workflows = graph.getNodesByType('workflow');
    const forms = graph.getNodesByType('form');
    const views = graph.getNodesByType('view');
    const reports = graph.getNodesByType('report');
    const webResources = graph.getNodesByType('webresource');
    const highRisk = graph.getHighRiskNodes();
    
    const rootNode = graph.getNode(graph.rootId);
    
    // Calculate direct vs indirect dependencies
    const directDeps = rootNode?.dependedOnBy.length || 0;
    const totalDeps = allNodes.length - 1; // Exclude root
    const indirectDeps = Math.max(0, totalDeps - directDeps);
    
    return {
      target: {
        type: graph.rootType,
        name: rootNode?.name || '',
        entityName: rootNode?.entityName,
      },
      summary: {
        totalDependencies: totalDeps,
        directDependencies: directDeps,
        indirectDependencies: indirectDeps,
        highRiskCount: highRisk.length,
        mediumRiskCount: allNodes.filter(n => n.metadata.riskLevel === 'medium').length,
        lowRiskCount: allNodes.filter(n => n.metadata.riskLevel === 'low').length,
      },
      components: {
        plugins,
        workflows,
        forms,
        views,
        reports,
        relationships: [],
        webResources,
      },
      recommendations: this.generateRecommendations(graph),
      generatedAt: new Date().toISOString(),
    };
  }

  private generateRecommendations(graph: DependencyGraph): string[] {
    const recommendations: string[] = [];
    const rootNode = graph.getNode(graph.rootId);
    
    if (!rootNode) return recommendations;
    
    const highRiskCount = graph.getHighRiskNodes().length;
    const plugins = graph.getNodesByType('plugin');
    const workflows = graph.getNodesByType('workflow');
    
    if (highRiskCount > 0) {
      recommendations.push(`⚠️ ${highRiskCount} high-risk dependencies found. Review before making changes.`);
    }
    
    if (plugins.length > 0) {
      recommendations.push(`🔌 ${plugins.length} plugin(s) depend on this. Changes may break plugin logic.`);
    }
    
    if (workflows.length > 0) {
      recommendations.push(`⚡ ${workflows.length} workflow(s) use this. Check workflow conditions and steps.`);
    }
    
    const reports = graph.getNodesByType('report');
    if (reports.length > 0) {
      recommendations.push(`📊 ${reports.length} report(s) depend on this. Verify report data sources.`);
    }
    
    if (graph.rootType === 'attribute') {
      recommendations.push('📋 Check all forms and views that reference this field.');
      recommendations.push('🔍 Review any JavaScript web resources that may use this field.');
      recommendations.push('⚙️ Review workflows that may use this field in conditions or actions.');
    }
    
    recommendations.push('✅ Consider creating a solution backup before making changes.');
    recommendations.push('🧪 Test changes in a non-production environment first.');
    
    return recommendations;
  }
}
