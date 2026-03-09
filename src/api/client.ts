import { AuthManager } from '../auth/manager';
import { EntityMetadata, AttributeMetadata } from '../types';

export class DataverseClient {
  private orgUrl: string;
  private authManager: AuthManager;
  private clientName: string;

  constructor(orgUrl: string, authManager: AuthManager, clientName: string) {
    this.orgUrl = orgUrl.replace(/\/+$/, ''); // Remove trailing slashes
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

  protected async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
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

  /**
   * Get entity definitions with optional delta sync
   * @param sinceTimestamp - If provided, only returns entities modified after this timestamp
   */
  async getEntityDefinitions(sinceTimestamp?: string): Promise<EntityMetadata[]> {
    let endpoint = 'EntityDefinitions?$select=LogicalName,SchemaName,DisplayName,Description,PrimaryIdAttribute,PrimaryNameAttribute,OwnershipType,IsIntersect,IsCustomEntity,IsManaged,EntitySetName,ModifiedOn';
    
    // Add delta filter if timestamp provided
    if (sinceTimestamp) {
      const encodedTimestamp = encodeURIComponent(sinceTimestamp);
      endpoint += `&$filter=ModifiedOn gt ${encodedTimestamp}`;
    }

    const response = await this.request<{ value: EntityMetadata[] }>(endpoint);
    return response.value;
  }

  /**
   * Get all entity definitions (for full sync)
   */
  async getAllEntityDefinitions(): Promise<EntityMetadata[]> {
    return this.getEntityDefinitions();
  }

  /**
   * Get entity definitions modified since a specific timestamp (delta sync)
   */
  async getEntityDefinitionsDelta(sinceTimestamp: string): Promise<EntityMetadata[]> {
    return this.getEntityDefinitions(sinceTimestamp);
  }

  async getEntityDefinition(logicalName: string): Promise<EntityMetadata> {
    return this.request(`EntityDefinitions(LogicalName='${logicalName}')`);
  }

  /**
   * Get entity attributes with optional delta sync
   */
  async getEntityAttributes(logicalName: string, sinceTimestamp?: string): Promise<AttributeMetadata[]> {
    let endpoint = `EntityDefinitions(LogicalName='${logicalName}')/Attributes?$select=LogicalName,SchemaName,DisplayName,Description,AttributeType,AttributeTypeName,IsPrimaryId,IsPrimaryName,RequiredLevel,IsValidForCreate,IsValidForUpdate,IsValidForRead,IsCustomAttribute,ModifiedOn`;
    
    if (sinceTimestamp) {
      const encodedTimestamp = encodeURIComponent(sinceTimestamp);
      endpoint += `&$filter=ModifiedOn gt ${encodedTimestamp}`;
    }

    const response = await this.request<{ value: AttributeMetadata[] }>(endpoint);
    return response.value;
  }

  /**
   * Get all attributes for an entity (for full sync)
   */
  async getAllEntityAttributes(logicalName: string): Promise<AttributeMetadata[]> {
    return this.getEntityAttributes(logicalName);
  }

  /**
   * Get attributes modified since a specific timestamp (delta sync)
   */
  async getEntityAttributesDelta(logicalName: string, sinceTimestamp: string): Promise<AttributeMetadata[]> {
    return this.getEntityAttributes(logicalName, sinceTimestamp);
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

  /**
   * Perform delta sync - get all changes since last sync
   */
  async performDeltaSync(sinceTimestamp: string): Promise<{
    entities: EntityMetadata[];
    attributes: Record<string, AttributeMetadata[]>;
    relationships: {
      manyToOne: any[];
      oneToMany: any[];
      manyToMany: any[];
    };
  }> {
    // Get modified entities
    const modifiedEntities = await this.getEntityDefinitionsDelta(sinceTimestamp);
    
    // For each modified entity, get modified attributes
    const modifiedAttributes: Record<string, AttributeMetadata[]> = {};
    for (const entity of modifiedEntities) {
      modifiedAttributes[entity.LogicalName] = await this.getEntityAttributesDelta(
        entity.LogicalName,
        sinceTimestamp
      );
    }

    // Get all relationships (relationships don't always have ModifiedOn)
    // We'll fetch relationships for all modified entities
    const relationships = {
      manyToOne: [] as any[],
      oneToMany: [] as any[],
      manyToMany: [] as any[],
    };

    for (const entity of modifiedEntities) {
      const entityRels = await this.getEntityRelationships(entity.LogicalName);
      if (entityRels.manyToOne) {
        relationships.manyToOne.push(...entityRels.manyToOne);
      }
      if (entityRels.oneToMany) {
        relationships.oneToMany.push(...entityRels.oneToMany);
      }
      if (entityRels.manyToMany) {
        relationships.manyToMany.push(...entityRels.manyToMany);
      }
    }

    return {
      entities: modifiedEntities,
      attributes: modifiedAttributes,
      relationships,
    };
  }

  /**
   * Perform full sync - get all metadata
   */
  async performFullSync(): Promise<{
    entities: EntityMetadata[];
    attributes: Record<string, AttributeMetadata[]>;
    relationships: {
      manyToOne: any[];
      oneToMany: any[];
      manyToMany: any[];
    };
  }> {
    // Get all entities
    const entities = await this.getAllEntityDefinitions();
    
    // Get all attributes for each entity
    const attributes: Record<string, AttributeMetadata[]> = {};
    for (const entity of entities) {
      attributes[entity.LogicalName] = await this.getAllEntityAttributes(entity.LogicalName);
    }

    // Get all relationships
    const relationships = {
      manyToOne: [] as any[],
      oneToMany: [] as any[],
      manyToMany: [] as any[],
    };

    for (const entity of entities) {
      const entityRels = await this.getEntityRelationships(entity.LogicalName);
      if (entityRels.manyToOne) {
        relationships.manyToOne.push(...entityRels.manyToOne);
      }
      if (entityRels.oneToMany) {
        relationships.oneToMany.push(...entityRels.oneToMany);
      }
      if (entityRels.manyToMany) {
        relationships.manyToMany.push(...entityRels.manyToMany);
      }
    }

    return {
      entities,
      attributes,
      relationships,
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
