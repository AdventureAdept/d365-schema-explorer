// Impact Analyzer Types

export interface DependencyNode {
  id: string;
  type: 'entity' | 'attribute' | 'plugin' | 'workflow' | 'form' | 'view' | 'report' | 'relationship';
  name: string;
  displayName?: string;
  entityName?: string;
  dependencies: string[];
  dependedOnBy: string[];
  metadata: {
    componentId?: string;
    componentType?: string;
    solutionId?: string;
    isManaged?: boolean;
    description?: string;
    riskLevel?: 'high' | 'medium' | 'low';
  };
}

export interface DependencyGraph {
  nodes: Map<string, DependencyNode>;
  rootId: string;
  rootType: 'entity' | 'attribute';
  generatedAt: string;
  
  getNode(id: string): DependencyNode | undefined;
  getDependencies(id: string): DependencyNode[];
  getDependents(id: string): DependencyNode[];
  getAllNodes(): DependencyNode[];
  getNodesByType(type: DependencyNode['type']): DependencyNode[];
  getHighRiskNodes(): DependencyNode[];
}

export interface ImpactReport {
  target: {
    type: 'entity' | 'attribute';
    name: string;
    entityName?: string;
  };
  summary: {
    totalDependencies: number;
    directDependencies: number;
    indirectDependencies: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  };
  components: {
    plugins: DependencyNode[];
    workflows: DependencyNode[];
    forms: DependencyNode[];
    views: DependencyNode[];
    reports: DependencyNode[];
    relationships: DependencyNode[];
  };
  recommendations: string[];
  generatedAt: string;
}

export interface GraphExportOptions {
  format: 'mermaid' | 'dot' | 'json';
  direction?: 'TB' | 'BT' | 'LR' | 'RL';
  includeAttributes?: boolean;
  maxDepth?: number;
}
