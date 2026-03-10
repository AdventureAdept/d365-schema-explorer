export class AsyncLock {
  private locks: Map<string, Promise<void>> = new Map();
  private resolvers: Map<string, () => void> = new Map();

  async acquire(key: string): Promise<void> {
    while (this.locks.has(key)) {
      await this.locks.get(key);
    }
    const lockPromise = new Promise<void>(resolve => {
      this.resolvers.set(key, resolve);
    });
    this.locks.set(key, lockPromise);
  }

  release(key: string): void {
    const resolver = this.resolvers.get(key);
    if (resolver) {
      resolver();
      this.resolvers.delete(key);
      this.locks.delete(key);
    }
  }
}

export const tokenRefreshLock = new AsyncLock();
