import { DependencyNode, DependencyGraph, GraphExportOptions, ImpactReport } from './types';
import { DependencyClient } from '../api/dependency-client';
import { CacheManager } from '../cache/manager';

export class GraphBuilder {
  private dependencyClient: DependencyClient;
  private cacheManager: CacheManager;

  constructor(dependencyClient: DependencyClient, cacheManager: CacheManager) {
    this.dependencyClient = dependencyClient;
    this.cacheManager = cacheManager;
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

    // Get workflows (simplified - would need to parse workflow XAML)
    // This is a placeholder for workflow field dependency detection
  }

  /**
   * Generate Mermaid diagram from graph
   */
  exportToMermaid(graph: DependencyGraph, options: Partial<GraphExportOptions> = {}): string {
    const direction = options.direction || 'TB';
    const lines: string[] = [`graph ${direction}`];
    
    // Add nodes with styling
    for (const node of graph.getAllNodes()) {
      const style = this.getMermaidStyle(node);
      const label = node.displayName || node.name;
      lines.push(`    ${node.id}["${label}"]${style}`);
    }
    
    // Add relationships
    for (const node of graph.getAllNodes()) {
      for (const depId of node.dependedOnBy) {
        lines.push(`    ${node.id} --> ${depId}`);
      }
    }
    
    // Add class definitions for styling
    lines.push('    classDef entity fill:#e94560,stroke:#333,stroke-width:2px,color:#fff');
    lines.push('    classDef attribute fill:#4ea8de,stroke:#333,stroke-width:2px,color:#fff');
    lines.push('    classDef plugin fill:#f4d03f,stroke:#333,stroke-width:1px');
    lines.push('    classDef workflow fill:#9b59b6,stroke:#333,stroke-width:1px,color:#fff');
    lines.push('    classDef form fill:#2ecc71,stroke:#333,stroke-width:1px');
    lines.push('    classDef view fill:#34495e,stroke:#333,stroke-width:1px,color:#fff');
    
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
    const highRisk = graph.getHighRiskNodes();
    
    const rootNode = graph.getNode(graph.rootId);
    
    return {
      target: {
        type: graph.rootType,
        name: rootNode?.name || '',
        entityName: rootNode?.entityName,
      },
      summary: {
        totalDependencies: allNodes.length - 1, // Exclude root
        directDependencies: rootNode?.dependedOnBy.length || 0,
        indirectDependencies: allNodes.length - 1 - (rootNode?.dependedOnBy.length || 0),
        highRiskCount: highRisk.length,
        mediumRiskCount: allNodes.filter(n => n.metadata.riskLevel === 'medium').length,
        lowRiskCount: allNodes.filter(n => n.metadata.riskLevel === 'low').length,
      },
      components: {
        plugins,
        workflows,
        forms,
        views,
        reports: [],
        relationships: [],
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
    
    if (graph.rootType === 'attribute') {
      recommendations.push('📋 Check all forms and views that reference this field.');
      recommendations.push('🔍 Review any JavaScript web resources that may use this field.');
    }
    
    recommendations.push('✅ Consider creating a solution backup before making changes.');
    recommendations.push('🧪 Test changes in a non-production environment first.');
    
    return recommendations;
  }
}
