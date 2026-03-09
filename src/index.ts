// Main exports for library usage
export { ConfigManager } from './config/manager';
export { AuthManager } from './auth/manager';
export { CacheManager } from './cache/manager';
export { DataverseClient } from './api/client';
export * from './types';

// Command exports
export { useCommand } from './commands/use';
export { 
  connectCommand, 
  disconnectCommand, 
  statusCommand, 
  listClientsCommand 
} from './commands/env';
export { 
  pullCommand, 
  searchCommand, 
  exportCommand, 
  listEntitiesCommand 
} from './commands/schema';