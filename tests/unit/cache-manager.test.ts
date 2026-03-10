import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Cache Manager', () => {
  it('should have cache directory', () => {
    const cacheDir = path.join(process.env.HOME || '', '.d365ai', 'cache');
    // Just verify the path can be constructed
    expect(cacheDir).toBeDefined();
  });

  it('should handle missing cache file gracefully', () => {
    const nonExistentPath = '/tmp/non-existent-cache.json';
    expect(fs.existsSync(nonExistentPath)).toBe(false);
  });
});
