import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { EntityMetadata, CacheMetadata } from '../types';

interface CacheData {
  entities: Record<string, EntityMetadata>;
  attributes: Record<string, any[]>;
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
  upsertAttributes(entityName: string, attributes: any[]): void {
    this.data.attributes[entityName] = attributes;
  }

  getAttributes(entityName: string): any[] {
    return this.data.attributes[entityName] || [];
  }

  searchAttributes(query: string): Array<{ entityName: string; attribute: any }> {
    const lowerQuery = query.toLowerCase();
    const results: Array<{ entityName: string; attribute: any }> = [];
    
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
