import { DataverseClient } from './client';
import { AuthManager } from '../auth/manager';

export interface ComponentDependency {
  dependentComponentObjectId: string;
  dependentComponentType: number;
  dependentComponentTypeName: string;
  dependentComponentDisplayName: string;
  requiredComponentObjectId: string;
  requiredComponentType: number;
  requiredComponentTypeName: string;
  requiredComponentDisplayName: string;
}

export interface PluginRegistration {
  pluginAssemblyId: string;
  name: string;
  entityLogicalName: string;
  messageName: string;
  stage: number;
  mode: number;
}

export interface WorkflowDependency {
  workflowId: string;
  name: string;
  entityLogicalName: string;
  category: number;
  type: string;
}

export interface FormDependency {
  formId: string;
  name: string;
  entityLogicalName: string;
  type: number;
  formXml?: string;
}

export interface ViewDependency {
  viewId: string;
  name: string;
  entityLogicalName: string;
  queryType: number;
  layoutXml?: string;
}

export class DependencyClient extends DataverseClient {
  constructor(orgUrl: string, authManager: AuthManager, clientName: string) {
    super(orgUrl, authManager, clientName);
  }

  /**
   * Retrieve dependencies for deleting a component
   * Uses Dataverse RetrieveDependenciesForDelete API
   */
  async retrieveDependenciesForDelete(
    objectId: string, 
    componentType: number
  ): Promise<ComponentDependency[]> {
    const response = await this.request<{
      EntityType: string;
      Dependencies: {
        DependentComponentObjectId: string;
        DependentComponentType: number;
        DependentComponentTypeName: string;
        DependentComponentDisplayName: string;
        RequiredComponentObjectId: string;
        RequiredComponentType: number;
        RequiredComponentTypeName: string;
        RequiredComponentDisplayName: string;
      }[];
    }>(`RetrieveDependenciesForDelete(ObjectId=${objectId}, ComponentType=${componentType})`);

    return response.Dependencies.map(d => ({
      dependentComponentObjectId: d.DependentComponentObjectId,
      dependentComponentType: d.DependentComponentType,
      dependentComponentTypeName: d.DependentComponentTypeName,
      dependentComponentDisplayName: d.DependentComponentDisplayName,
      requiredComponentObjectId: d.RequiredComponentObjectId,
      requiredComponentType: d.RequiredComponentType,
      requiredComponentTypeName: d.RequiredComponentTypeName,
      requiredComponentDisplayName: d.RequiredComponentDisplayName,
    }));
  }

  /**
   * Get plugin registrations for an entity
   */
  async getPluginsForEntity(entityLogicalName: string): Promise<PluginRegistration[]> {
    // Query SdkMessageProcessingStep filtered by entity via sdkmessagefilter navigation
    const response = await this.request<{
      value: {
        sdkmessageprocessingstepid: string;
        name: string;
        stage: number;
        mode: number;
        filteringattributes: string;
      }[];
    }>(
      `sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name,stage,mode,filteringattributes&` +
      `$filter=sdkmessagefilterid/primaryobjecttypecode eq '${entityLogicalName}'`
    );

    return response.value.map(p => ({
      pluginAssemblyId: p.sdkmessageprocessingstepid,
      name: p.name,
      entityLogicalName,
      messageName: '',
      stage: p.stage,
      mode: p.mode,
    }));
  }

  /**
   * Get workflows for an entity
   */
  async getWorkflowsForEntity(entityLogicalName: string): Promise<WorkflowDependency[]> {
    const response = await this.request<{
      value: {
        workflowid: string;
        name: string;
        category: number;
        type: string;
        primaryentity: string;
      }[];
    }>(
      `workflows?$select=workflowid,name,category,type,primaryentity&` +
      `$filter=primaryentity eq '${entityLogicalName}' and statecode eq 1 and type eq 1`
    );

    return response.value.map(w => ({
      workflowId: w.workflowid,
      name: w.name,
      entityLogicalName: w.primaryentity,
      category: w.category,
      type: w.type,
    }));
  }

  /**
   * Get forms for an entity
   */
  async getFormsForEntity(entityLogicalName: string): Promise<FormDependency[]> {
    const response = await this.request<{
      value: {
        formid: string;
        name: string;
        type: number;
        formxml: string;
      }[];
    }>(
      `systemforms?$select=formid,name,type,formxml&` +
      `$filter=objecttypecode eq '${entityLogicalName}' and (type eq 2 or type eq 7 or type eq 11)` // Main, QuickCreate, Card
    );

    return response.value.map(f => ({
      formId: f.formid,
      name: f.name,
      entityLogicalName,
      type: f.type,
      formXml: f.formxml,
    }));
  }

  /**
   * Get views for an entity
   */
  async getViewsForEntity(entityLogicalName: string): Promise<ViewDependency[]> {
    const response = await this.request<{
      value: {
        savedqueryid: string;
        name: string;
        querytype: number;
        layoutxml: string;
      }[];
    }>(
      `savedqueries?$select=savedqueryid,name,querytype,layoutxml&` +
      `$filter=returnedtypecode eq '${entityLogicalName}' and (querytype eq 0 or querytype eq 1 or querytype eq 2)`
    );

    return response.value.map(v => ({
      viewId: v.savedqueryid,
      name: v.name,
      entityLogicalName,
      queryType: v.querytype,
      layoutXml: v.layoutxml,
    }));
  }

  /**
   * Check if a field is used in a form
   */
  async isFieldUsedInForm(fieldLogicalName: string, formXml: string): Promise<boolean> {
    // Parse form XML to check for field reference
    return formXml.includes(fieldLogicalName);
  }

  /**
   * Check if a field is used in a view
   */
  async isFieldUsedInView(fieldLogicalName: string, layoutXml: string): Promise<boolean> {
    // Parse layout XML to check for field reference
    return layoutXml.includes(fieldLogicalName);
  }

  /**
   * Get workflow details with XAML for field dependency analysis
   */
  async getWorkflowDetails(workflowId: string): Promise<{
    workflowId: string;
    name: string;
    xaml: string;
    inputParameters: string;
  } | null> {
    try {
      const response = await this.request<{
        workflowid: string;
        name: string;
        xaml: string;
        inputparameters: string;
      }>(`workflows(${workflowId})?$select=workflowid,name,xaml,inputparameters`);

      return {
        workflowId: response.workflowid,
        name: response.name,
        xaml: response.xaml || '',
        inputParameters: response.inputparameters || '',
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Check if a field is used in workflow XAML
   */
  isFieldUsedInWorkflow(fieldLogicalName: string, xaml: string): boolean {
    if (!xaml) return false;
    
    // Check for field reference in workflow XAML
    // Workflow XAML contains field references in various formats:
    // - <x:Reference>fieldname</x:Reference>
    // - AttributeName="fieldname"
    // - Property name="fieldname"
    const patterns = [
      new RegExp(`<[^>]*>${fieldLogicalName}</[^>]*>`, 'i'),
      new RegExp(`AttributeName="${fieldLogicalName}"`, 'i'),
      new RegExp(`Property name="${fieldLogicalName}"`, 'i'),
      new RegExp(`<x:Reference[^>]*>${fieldLogicalName}</x:Reference>`, 'i'),
      new RegExp(`Field name="${fieldLogicalName}"`, 'i'),
    ];

    return patterns.some(pattern => pattern.test(xaml));
  }

  /**
   * Get reports for an entity
   */
  async getReportsForEntity(entityLogicalName: string): Promise<{
    reportId: string;
    name: string;
    entityLogicalName: string;
    reportTypeCode: number;
  }[]> {
    try {
      const response = await this.request<{
        value: {
          reportid: string;
          name: string;
          reporttypecode: number;
          primaryentity: string;
        }[];
      }>(
        `reports?$select=reportid,name,reporttypecode,primaryentity&` +
        `$filter=primaryentity eq '${entityLogicalName}' and ispersonal eq false`
      );

      return response.value.map(r => ({
        reportId: r.reportid,
        name: r.name,
        entityLogicalName: r.primaryentity || entityLogicalName,
        reportTypeCode: r.reporttypecode,
      }));
    } catch (error) {
      return [];
    }
  }

  /**
   * Get recursive dependencies using RetrieveDependenciesForDelete
   * This follows the dependency chain to find indirect dependencies
   */
  async getRecursiveDependencies(
    objectId: string,
    componentType: number,
    maxDepth: number = 3
  ): Promise<ComponentDependency[]> {
    const allDependencies = new Map<string, ComponentDependency>();
    const visited = new Set<string>();
    
    const queue: Array<{ id: string; type: number; depth: number }> = [
      { id: objectId, type: componentType, depth: 0 }
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const key = `${current.type}:${current.id}`;
      
      if (visited.has(key) || current.depth >= maxDepth) {
        continue;
      }
      
      visited.add(key);

      try {
        const deps = await this.retrieveDependenciesForDelete(current.id, current.type);
        
        for (const dep of deps) {
          const depKey = `${dep.dependentComponentType}:${dep.dependentComponentObjectId}`;
          
          if (!allDependencies.has(depKey)) {
            allDependencies.set(depKey, dep);
            
            // Add to queue for further traversal
            queue.push({
              id: dep.dependentComponentObjectId,
              type: dep.dependentComponentType,
              depth: current.depth + 1
            });
          }
        }
      } catch (error) {
        // Continue with other nodes if one fails
        console.warn(`Failed to get dependencies for ${key}:`, error);
      }
    }

    return Array.from(allDependencies.values());
  }
}
