import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { EntityMetadata, AttributeMetadata, CacheMetadata, DeltaSyncResult } from '../types';

interface CacheData {
  entities: Record<string, EntityMetadata>;
  attributes: Record<string, AttributeMetadata[]>;
  relationships: Record<string, any[]>;
  metadata: CacheMetadata | null;
}

export class CacheManager {
  private cacheDir: string;
  private clientName: string;
  private cacheFile: string;
  private data: CacheData;
  private loaded: boolean = false;

  constructor(cacheDir: string, clientName: string) {
    this.cacheDir = cacheDir;
    this.clientName = clientName;
    this.cacheFile = path.join(cacheDir, `${clientName}-cache.json`);
    this.data = {
      entities: {},
      attributes: {},
      relationships: {},
      metadata: null,
    };
    this.ensureCacheDir();
  }

  private ensureCacheDir(): void {
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  open(): void {
    if (this.loaded) return;
    
    if (fs.existsSync(this.cacheFile)) {
      try {
        const content = fs.readFileSync(this.cacheFile, 'utf-8');
        this.data = JSON.parse(content);
      } catch (error) {
        // If file is corrupted, start fresh
        this.data = { entities: {}, attributes: {}, relationships: {}, metadata: null };
      }
    }
    this.loaded = true;
  }

  close(): void {
    if (this.loaded) {
      this.save();
      this.loaded = false;
    }
  }

  private save(): void {
    fs.writeFileSync(this.cacheFile, JSON.stringify(this.data, null, 2));
  }

  // Entity operations
  upsertEntity(entity: EntityMetadata): void {
    this.data.entities[entity.LogicalName] = entity;
  }

  getEntity(logicalName: string): EntityMetadata | null {
    return this.data.entities[logicalName] || null;
  }

  getAllEntities(): EntityMetadata[] {
    return Object.values(this.data.entities).sort((a, b) => 
      a.LogicalName.localeCompare(b.LogicalName)
    );
  }

  searchEntities(query: string): EntityMetadata[] {
    const lowerQuery = query.toLowerCase();
    return this.getAllEntities().filter(entity => {
      const logicalName = entity.LogicalName?.toLowerCase() || '';
      const schemaName = entity.SchemaName?.toLowerCase() || '';
      const displayName = entity.DisplayName?.UserLocalizedLabel?.Label?.toLowerCase() || '';
      
      return logicalName.includes(lowerQuery) ||
             schemaName.includes(lowerQuery) ||
             displayName.includes(lowerQuery);
    });
  }

  // Attribute operations
  upsertAttributes(entityName: string, attributes: AttributeMetadata[]): void {
    this.data.attributes[entityName] = attributes;
  }

  getAttributes(entityName: string): AttributeMetadata[] {
    return this.data.attributes[entityName] || [];
  }

  searchAttributes(query: string): Array<{ entityName: string; attribute: AttributeMetadata }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ entityName: string; attribute: AttributeMetadata }> = [];
    
    for (const [entityName, attributes] of Object.entries(this.data.attributes)) {
      for (const attr of attributes) {
        const logicalName = attr.LogicalName?.toLowerCase() || '';
        const displayName = attr.DisplayName?.UserLocalizedLabel?.Label?.toLowerCase() || '';
        
        if (logicalName.includes(lowerQuery) || displayName.includes(lowerQuery)) {
          results.push({ entityName, attribute: attr });
        }
      }
    }
    return results;
  }

  // Relationship operations
  upsertRelationships(relationships: any[], type: string): void {
    for (const rel of relationships) {
      if (rel.SchemaName) {
        this.data.relationships[rel.SchemaName] = { ...rel, RelationshipType: type };
      }
    }
  }

  getRelationships(entityName: string): any[] {
    return Object.values(this.data.relationships).filter((rel: any) => 
      rel.ReferencedEntity === entityName || rel.ReferencingEntity === entityName
    );
  }

  searchRelationships(query: string): any[] {
    const lowerQuery = query.toLowerCase();
    return Object.values(this.data.relationships).filter((rel: any) => {
      const schemaName = rel.SchemaName?.toLowerCase() || '';
      const entity1 = rel.ReferencedEntity?.toLowerCase() || '';
      const entity2 = rel.ReferencingEntity?.toLowerCase() || '';
      
      return schemaName.includes(lowerQuery) || 
             entity1.includes(lowerQuery) || 
             entity2.includes(lowerQuery);
    });
  }

  // Cache metadata
  updateCacheMetadata(metadata: CacheMetadata): void {
    this.data.metadata = metadata;
    this.save();
  }

  getCacheMetadata(): CacheMetadata | null {
    return this.data.metadata;
  }

  // Delta sync operations
  getLastSyncTimestamp(): string | null {
    return this.data.metadata?.lastSync || null;
  }

  getLastFullSyncTimestamp(): string | null {
    return this.data.metadata?.lastFullSync || null;
  }

  /**
   * Perform delta sync - merge changes into existing cache
   */
  performDeltaSync(
    newEntities: EntityMetadata[],
    newAttributes: Record<string, AttributeMetadata[]>,
    newRelationships: { manyToOne: any[]; oneToMany: any[]; manyToMany: any[] }
  ): DeltaSyncResult {
    const result: DeltaSyncResult = {
      entitiesAdded: 0,
      entitiesUpdated: 0,
      entitiesDeleted: 0,
      attributesAdded: 0,
      attributesUpdated: 0,
      relationshipsAdded: 0,
      relationshipsUpdated: 0,
      lastSync: new Date().toISOString(),
    };

    // Process entities
    const existingEntityNames = new Set(Object.keys(this.data.entities));
    const newEntityNames = new Set(newEntities.map(e => e.LogicalName));

    for (const entity of newEntities) {
      const existing = this.data.entities[entity.LogicalName];
      
      if (!existing) {
        // New entity
        this.data.entities[entity.LogicalName] = entity;
        result.entitiesAdded++;
      } else if (this.isEntityChanged(existing, entity)) {
        // Updated entity
        this.data.entities[entity.LogicalName] = { ...existing, ...entity };
        result.entitiesUpdated++;
      }
    }

    // Mark deleted entities (optional - could also just keep them)
    for (const existingName of existingEntityNames) {
      if (!newEntityNames.has(existingName)) {
        result.entitiesDeleted++;
        // Optionally delete: delete this.data.entities[existingName];
      }
    }

    // Process attributes
    for (const [entityName, attributes] of Object.entries(newAttributes)) {
      const existingAttrs = this.data.attributes[entityName] || [];
      const existingAttrMap = new Map(existingAttrs.map(a => [a.LogicalName, a]));

      for (const attr of attributes) {
        const existing = existingAttrMap.get(attr.LogicalName);
        
        if (!existing) {
          result.attributesAdded++;
        } else if (this.isAttributeChanged(existing, attr)) {
          result.attributesUpdated++;
        }
      }

      this.data.attributes[entityName] = attributes;
    }

    // Process relationships
    const allNewRels = [
      ...newRelationships.manyToOne.map(r => ({ ...r, RelationshipType: 'ManyToOne' })),
      ...newRelationships.oneToMany.map(r => ({ ...r, RelationshipType: 'OneToMany' })),
      ...newRelationships.manyToMany.map(r => ({ ...r, RelationshipType: 'ManyToMany' })),
    ];

    for (const rel of allNewRels) {
      const existing = this.data.relationships[rel.SchemaName];
      if (!existing) {
        result.relationshipsAdded++;
      } else if (this.isRelationshipChanged(existing, rel)) {
        result.relationshipsUpdated++;
      }
      this.data.relationships[rel.SchemaName] = rel;
    }

    // Update metadata
    this.data.metadata = {
      ...this.data.metadata,
      lastSync: result.lastSync,
      entityCount: Object.keys(this.data.entities).length,
      deltaSyncEnabled: true,
    };

    this.save();
    return result;
  }

  /**
   * Check if entity has changed by comparing ModifiedOn timestamps
   */
  private isEntityChanged(existing: EntityMetadata, incoming: EntityMetadata): boolean {
    if (!incoming.ModifiedOn) return true; // If no timestamp, assume changed
    if (!existing.ModifiedOn) return true; // If existing has no timestamp, update
    return new Date(incoming.ModifiedOn) > new Date(existing.ModifiedOn);
  }

  /**
   * Check if attribute has changed
   */
  private isAttributeChanged(existing: AttributeMetadata, incoming: AttributeMetadata): boolean {
    if (!incoming.ModifiedOn) return true;
    if (!existing.ModifiedOn) return true;
    return new Date(incoming.ModifiedOn) > new Date(existing.ModifiedOn);
  }

  /**
   * Check if relationship has changed
   */
  private isRelationshipChanged(existing: any, incoming: any): boolean {
    if (!incoming.ModifiedOn) return false; // Relationships often don't have ModifiedOn
    if (!existing.ModifiedOn) return true;
    return new Date(incoming.ModifiedOn) > new Date(existing.ModifiedOn);
  }

  /**
   * Get statistics about the cache
   */
  getCacheStats(): {
    entityCount: number;
    attributeCount: number;
    relationshipCount: number;
    lastSync: string | null;
    lastFullSync: string | null;
  } {
    return {
      entityCount: Object.keys(this.data.entities).length,
      attributeCount: Object.values(this.data.attributes).reduce((sum, attrs) => sum + attrs.length, 0),
      relationshipCount: Object.keys(this.data.relationships).length,
      lastSync: this.data.metadata?.lastSync || null,
      lastFullSync: this.data.metadata?.lastFullSync || null,
    };
  }

  // Utility
  getEntityCount(): number {
    return Object.keys(this.data.entities).length;
  }

  clear(): void {
    this.data = { entities: {}, attributes: {}, relationships: {}, metadata: null };
    this.save();
  }

  private calculateChecksum(data: string): string {
    return crypto.createHash('md5').update(data).digest('hex');
  }
}

export default CacheManager;
