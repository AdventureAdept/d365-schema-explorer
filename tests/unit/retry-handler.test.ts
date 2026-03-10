import { describe, it, expect } from 'vitest';
import { retryWithBackoff } from '../../src/api/retry-handler';

describe('Retry Handler', () => {
  it('should return result on first success', async () => {
    const result = await retryWithBackoff(async () => 'success');
    expect(result).toBe('success');
  });

  it('should retry on 503 error', async () => {
    let attempts = 0;
    const error = new Error('Service Unavailable') as any;
    error.status = 503;
    
    const result = await retryWithBackoff(async () => {
      attempts++;
      if (attempts < 3) throw error;
      return 'success after retry';
    }, { maxRetries: 3, baseDelay: 10 });
    
    expect(result).toBe('success after retry');
    expect(attempts).toBe(3);
  });

  it('should NOT retry on 400 error', async () => {
    let attempts = 0;
    const error = new Error('Bad Request') as any;
    error.status = 400;
    
    await expect(async () => {
      await retryWithBackoff(async () => {
        attempts++;
        throw error;
      }, { maxRetries: 3 });
    }).rejects.toThrow();
    
    expect(attempts).toBe(1); // Should not retry
  });

  it('should NOT retry on 401 error', async () => {
    let attempts = 0;
    const error = new Error('Unauthorized') as any;
    error.status = 401;
    
    await expect(async () => {
      await retryWithBackoff(async () => {
        attempts++;
        throw error;
      }, { maxRetries: 3 });
    }).rejects.toThrow();
    
    expect(attempts).toBe(1);
  });

  it('should retry on 429 error', async () => {
    let attempts = 0;
    const error = new Error('Too Many Requests') as any;
    error.status = 429;
    
    const result = await retryWithBackoff(async () => {
      attempts++;
      if (attempts < 2) throw error;
      return 'success';
    }, { maxRetries: 3, baseDelay: 10 });
    
    expect(result).toBe('success');
    expect(attempts).toBe(2);
  });
});
