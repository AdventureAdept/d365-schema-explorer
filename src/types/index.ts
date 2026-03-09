// Dataverse entity metadata
export interface EntityMetadata {
  LogicalName: string;
  SchemaName: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  Description?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  PrimaryIdAttribute: string;
  PrimaryNameAttribute?: string;
  OwnershipType?: string;
  IsIntersect?: boolean;
  IsCustomEntity?: boolean;
  IsManaged?: boolean;
  EntitySetName?: string;
  Attributes?: AttributeMetadata[];
  ManyToOneRelationships?: RelationshipMetadata[];
  OneToManyRelationships?: RelationshipMetadata[];
  ManyToManyRelationships?: ManyToManyRelationshipMetadata[];
}

// Dataverse attribute metadata
export interface AttributeMetadata {
  LogicalName: string;
  SchemaName: string;
  DisplayName?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  Description?: {
    UserLocalizedLabel?: {
      Label: string;
    };
  };
  AttributeType?: string;
  AttributeTypeName?: {
    Value: string;
  };
  IsPrimaryId?: boolean;
  IsPrimaryName?: boolean;
  RequiredLevel?: {
    Value: string;
  };
  IsValidForCreate?: boolean;
  IsValidForUpdate?: boolean;
  IsValidForRead?: boolean;
  IsCustomAttribute?: boolean;
  MaxLength?: number;
  MinValue?: number;
  MaxValue?: number;
  OptionSet?: OptionSetMetadata;
  Targets?: string[];
}

// Option set metadata
export interface OptionSetMetadata {
  Name?: string;
  OptionSetType?: string;
  Options?: {
    Value: number;
    Label?: {
      UserLocalizedLabel?: {
        Label: string;
      };
    };
  }[];
}

// Relationship metadata
export interface RelationshipMetadata {
  SchemaName: string;
  ReferencingEntity?: string;
  ReferencingAttribute?: string;
  ReferencedEntity?: string;
  ReferencedAttribute?: string;
  RelationshipType?: string;
}

// Many-to-many relationship metadata
export interface ManyToManyRelationshipMetadata {
  SchemaName: string;
  Entity1LogicalName?: string;
  Entity2LogicalName?: string;
  IntersectEntityName?: string;
}

// Client configuration
export interface ClientConfig {
  name: string;
  orgUrl: string;
  tenantId?: string;
  clientId?: string;
  clientSecret?: string;
  createdAt: string;
  updatedAt: string;
}

// Auth token info
export interface TokenInfo {
  accessToken: string;
  expiresOn: Date;
  refreshToken?: string;
  acquiredAt: Date;
}

// Search result
export interface SearchResult {
  type: 'entity' | 'attribute' | 'relationship';
  name: string;
  label?: string;
  entityName?: string;
  description?: string;
}

// Schema export options
export interface ExportOptions {
  format: 'json' | 'markdown';
  includeAttributes?: boolean;
  includeRelationships?: boolean;
  includeOptionSets?: boolean;
  outputPath?: string;
}

// Cache metadata
export interface CacheMetadata {
  lastSync?: string;
  entityCount?: number;
  version?: string;
  checksum?: string;
}

// CLI context passed to commands
export interface CLIContext {
  config: import('../config/manager').ConfigManager;
  cache: import('../cache/manager').CacheManager;
  auth: import('../auth/manager').AuthManager;
  api: import('../api/client').DataverseClient;
}