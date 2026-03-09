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
    // Query SdkMessageProcessingStep filtered by entity
    const response = await this.request<{
      value: {
        sdkmessageprocessingstepid: string;
        name: string;
        eventhandler_name: string;
        sdkmessageid_name: string;
        stage: number;
        mode: number;
        filteringattributes: string;
      }[];
    }>(
      `sdkmessageprocessingsteps?$select=sdkmessageprocessingstepid,name,stage,mode,filteringattributes&` +
      `$expand=eventhandler($select=name),sdkmessagefilter($select=primaryobjecttypecode)&` +
      `$filter=sdkmessagefilter/primaryobjecttypecode eq '${entityLogicalName}'`
    );

    return response.value.map(p => ({
      pluginAssemblyId: p.eventhandler_name || '',
      name: p.name,
      entityLogicalName,
      messageName: p.sdkmessageid_name || '',
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
      `$filter=objecttypecode eq '${entityLogicalName}' and type in (2, 7, 11)` // Main, QuickCreate, Card
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
      `$filter=returnedtypecode eq '${entityLogicalName}' and querytype in (0, 1, 2)`
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
}
