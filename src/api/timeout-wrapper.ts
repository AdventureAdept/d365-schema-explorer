export function withTimeout<T>(
  promise: Promise<T>,
  ms: number,
  operation: string = 'API request'
): Promise<T> {
  const timeout = new Promise<never>((_, reject) => {
    setTimeout(() => {
      reject(new Error(`${operation} timed out after ${ms}ms`));
    }, ms);
  });
  
  return Promise.race([promise, timeout]);
}

export const DEFAULT_TIMEOUT = 30000; // 30 seconds
