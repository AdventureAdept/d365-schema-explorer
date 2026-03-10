export const API_VERSION = process.env.DATAVERSE_API_VERSION || 'v9.2';

export function getApiBaseUrl(orgUrl: string): string {
  return `${orgUrl.replace(/\/+$/, '')}/api/data/${API_VERSION}`;
}
