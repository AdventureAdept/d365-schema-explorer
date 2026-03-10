export const logger = {
  error(message: string, context?: string): void {
    console.error(`[${new Date().toISOString()}] ERROR: ${message}${context ? ` (${context})` : ''}`);
  },
  warn(message: string, context?: string): void {
    console.warn(`[${new Date().toISOString()}] WARN: ${message}${context ? ` (${context})` : ''}`);
  },
  info(message: string, context?: string): void {
    console.info(`[${new Date().toISOString()}] INFO: ${message}${context ? ` (${context})` : ''}`);
  },
};
