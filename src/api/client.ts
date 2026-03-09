import { AuthManager } from '../auth/manager';
import { EntityMetadata } from '../types';

export class DataverseClient {
  private orgUrl: string;
  private authManager: AuthManager;
  private clientName: string;

  constructor(orgUrl: string, authManager: AuthManager, clientName: string) {
    this.orgUrl = orgUrl.replace(/\/$/, ''); // Remove trailing slash
    this.authManager = authManager;
    this.clientName = clientName;
  }

  private async getHeaders(): Promise<Record<string, string>> {
    const accessToken = await this.authManager.getAccessToken(this.clientName);
    if (!accessToken) {
      throw new Error('Not authenticated. Run "d365ai env connect" first.');
    }
    return {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
    };
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = await this.getHeaders();
    const url = `${this.orgUrl}/api/data/v9.2/${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        ...headers,
        ...options.headers,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Dataverse API error (${response.status}): ${errorText}`);
    }

    // Handle empty responses
    const text = await response.text();
    if (!text) {
      return {} as T;
    }

    return JSON.parse(text);
  }

  async testConnection(): Promise<boolean> {
    try {
      await this.request('WhoAmI');
      return true;
    } catch {
      return false;
    }
  }

  async getWhoAmI(): Promise<{ UserId: string; OrganizationId: string }> {
    return this.request('WhoAmI');
  }

  async getEntityDefinitions(): Promise<EntityMetadata[]> {
    const response = await this.request<{ value: EntityMetadata[] }>(
      'EntityDefinitions?$select=LogicalName,SchemaName,DisplayName,Description,PrimaryIdAttribute,PrimaryNameAttribute,OwnershipType,IsIntersect,IsCustomEntity,IsManaged,EntitySetName'
    );
    return response.value;
  }

  async getEntityDefinition(logicalName: string): Promise<EntityMetadata> {
    return this.request(`EntityDefinitions(LogicalName='${logicalName}')`);
  }

  async getEntityAttributes(logicalName: string): Promise<EntityMetadata['Attributes']> {
    const response = await this.request<{ value: EntityMetadata['Attributes'] }>(
      `EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName,SchemaName,DisplayName,Description,AttributeType,AttributeTypeName,IsPrimaryId,IsPrimaryName,RequiredLevel,IsValidForCreate,IsValidForUpdate,IsValidForRead,IsCustomAttribute,MaxLength,MinValue,MaxValue`
    );
    return response.value;
  }

  async getEntityRelationships(logicalName: string): Promise<{
    manyToOne: EntityMetadata['ManyToOneRelationships'];
    oneToMany: EntityMetadata['OneToManyRelationships'];
    manyToMany: EntityMetadata['ManyToManyRelationships'];
  }> {
    const [manyToOne, oneToMany, manyToMany] = await Promise.all([
      this.request<{ value: EntityMetadata['ManyToOneRelationships'] }>(
        `EntityDefinitions(LogicalName='${logicalName}')/ManyToOneRelationships`
      ),
      this.request<{ value: EntityMetadata['OneToManyRelationships'] }>(
        `EntityDefinitions(LogicalName='${logicalName}')/OneToManyRelationships`
      ),
      this.request<{ value: EntityMetadata['ManyToManyRelationships'] }>(
        `EntityDefinitions(LogicalName='${logicalName}')/ManyToManyRelationships`
      ),
    ]);

    return {
      manyToOne: manyToOne.value,
      oneToMany: oneToMany.value,
      manyToMany: manyToMany.value,
    };
  }

  async getFullEntityMetadata(logicalName: string): Promise<EntityMetadata> {
    const [entity, attributes, relationships] = await Promise.all([
      this.getEntityDefinition(logicalName),
      this.getEntityAttributes(logicalName),
      this.getEntityRelationships(logicalName),
    ]);

    return {
      ...entity,
      Attributes: attributes,
      ManyToOneRelationships: relationships.manyToOne,
      OneToManyRelationships: relationships.oneToMany,
      ManyToManyRelationships: relationships.manyToMany,
    };
  }

  async searchEntities(query: string): Promise<EntityMetadata[]> {
    // Dataverse doesn't have a native search for metadata, so we need to fetch all and filter
    // This is where local caching becomes important
    const allEntities = await this.getEntityDefinitions();
    const lowerQuery = query.toLowerCase();
    
    return allEntities.filter(entity => {
      const logicalName = entity.LogicalName?.toLowerCase() || '';
      const schemaName = entity.SchemaName?.toLowerCase() || '';
      const displayName = entity.DisplayName?.UserLocalizedLabel?.Label?.toLowerCase() || '';
      
      return logicalName.includes(lowerQuery) ||
             schemaName.includes(lowerQuery) ||
             displayName.includes(lowerQuery);
    });
  }

  getOrgUrl(): string {
    return this.orgUrl;
  }
}

export default DataverseClient;