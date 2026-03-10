import { describe, it, expect } from 'vitest';
import { saveToken, getToken, deleteToken } from '../../src/auth/token-storage';

describe('Token Storage', () => {
  it('should save and retrieve token', async () => {
    const clientName = 'test-client';
    const testToken = 'test-token-12345';
    
    await saveToken(clientName, testToken);
    const retrieved = await getToken(clientName);
    
    expect(retrieved).toBe(testToken);
    
    await deleteToken(clientName);
  });

  it('should return null for non-existent token', async () => {
    const result = await getToken('non-existent-client');
    expect(result).toBeNull();
  });
});
