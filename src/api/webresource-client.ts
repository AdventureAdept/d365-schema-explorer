import { DataverseClient } from './client';
import { AuthManager } from '../auth/manager';

export interface WebResource {
  webresourceid: string;
  name: string;
  displayname: string;
  webresourcetype: number;
  content: string;
  description?: string;
}

export interface WebResourceUsage {
  webResourceName: string;
  webResourceType: string;
  occurrences: {
    lineNumber: number;
    codeSnippet: string;
    context: string;
    functionDescription?: string;
  }[];
}

export class WebResourceClient extends DataverseClient {
  constructor(orgUrl: string, authManager: AuthManager, clientName: string) {
    super(orgUrl, authManager, clientName);
  }

  /**
   * Get all JavaScript web resources (paginated for performance)
   */
  async getJavaScriptWebResources(maxResources: number = 500): Promise<WebResource[]> {
    const webResources: WebResource[] = [];
    let fetchUrl = `webresourceset?$filter=webresourcetype eq 3&$select=webresourceid,name,displayname,webresourcetype,content,description&$top=100`;
    
    // Fetch in batches to avoid timeout
    while (fetchUrl && webResources.length < maxResources) {
      const response = await this.request<{
        value: {
          webresourceid: string;
          name: string;
          displayname: string;
          webresourcetype: number;
          content: string;
          description?: string;
        }[];
        '@odata.nextLink'?: string;
      }>(fetchUrl);

      const decoded = response.value.map(wr => ({
        ...wr,
        content: Buffer.from(wr.content, 'base64').toString('utf-8')
      }));
      
      webResources.push(...decoded);
      
      // Stop if we have enough
      if (webResources.length >= maxResources) {
        break;
      }
      
      fetchUrl = response['@odata.nextLink'] ? response['@odata.nextLink'].replace(/^.*\/api\/data\/v[\d.]+\//, '') : '';
    }

    return webResources.slice(0, maxResources);
  }

  /**
   * Search web resources for entity/field references
   */
  async searchWebResources(
    searchTerm: string,
    entityName?: string,
    fieldName?: string
  ): Promise<WebResourceUsage[]> {
    // Validate inputs
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new Error('searchTerm is required and must be a string');
    }
    
    if (searchTerm.length > 100) {
      throw new Error('searchTerm exceeds maximum length of 100 characters');
    }
    
    // Sanitize search term to prevent regex injection
    const sanitizedSearchTerm = this.sanitizeSearchTerm(searchTerm);
    const sanitizedEntityName = entityName ? this.sanitizeSearchTerm(entityName) : undefined;
    const sanitizedFieldName = fieldName ? this.sanitizeSearchTerm(fieldName) : undefined;
    
    // Fetch web resources with limit (default 500 for performance)
    const webResources = await this.getJavaScriptWebResources(500);
    
    // Process in parallel with concurrency limit
    const concurrencyLimit = 10;
    const usages: WebResourceUsage[] = [];
    
    for (let i = 0; i < webResources.length; i += concurrencyLimit) {
      const batch = webResources.slice(i, i + concurrencyLimit);
      
      const batchResults = await Promise.all(
        batch.map(async (wr) => {
          // Limit content size
          const maxContentSize = 500 * 1024; // 500KB limit
          const content = wr.content.length > maxContentSize 
            ? wr.content.substring(0, maxContentSize) 
            : wr.content;
          
          const occurrences = this.findOccurrences(content, sanitizedSearchTerm, sanitizedEntityName, sanitizedFieldName);
          
          if (occurrences.length > 0) {
            return {
              webResourceName: wr.name,
              webResourceType: this.getWebResourceTypeName(wr.webresourcetype),
              occurrences
            };
          }
          return null;
        })
      );
      
      usages.push(...batchResults.filter((r): r is WebResourceUsage => r !== null));
    }

    return usages;
  }

  /**
   * Search for JavaScript function definitions by name
   */
  async searchFunctions(functionName: string): Promise<WebResourceUsage[]> {
    // Validate input
    if (!functionName || typeof functionName !== 'string') {
      throw new Error('functionName is required and must be a string');
    }
    
    if (functionName.length > 100) {
      throw new Error('functionName exceeds maximum length of 100 characters');
    }
    
    const sanitizedFunctionName = this.sanitizeSearchTerm(functionName);
    const webResources = await this.getJavaScriptWebResources(500);
    
    const concurrencyLimit = 10;
    const usages: WebResourceUsage[] = [];
    
    for (let i = 0; i < webResources.length; i += concurrencyLimit) {
      const batch = webResources.slice(i, i + concurrencyLimit);
      
      const batchResults = await Promise.all(
        batch.map(async (wr) => {
          const maxContentSize = 500 * 1024;
          const content = wr.content.length > maxContentSize 
            ? wr.content.substring(0, maxContentSize) 
            : wr.content;
          
          const occurrences = this.findFunctionDefinitions(content, sanitizedFunctionName);
          
          if (occurrences.length > 0) {
            return {
              webResourceName: wr.name,
              webResourceType: this.getWebResourceTypeName(wr.webresourcetype),
              occurrences
            };
          }
          return null;
        })
      );
      
      usages.push(...batchResults.filter((r): r is WebResourceUsage => r !== null));
    }

    return usages;
  }

  /**
   * Find JavaScript function definitions
   */
  private findFunctionDefinitions(content: string, functionName: string): WebResourceUsage['occurrences'] {
    const lines = content.split('\n');
    const occurrences: WebResourceUsage['occurrences'] = [];
    
    // JavaScript function definition patterns
    const functionPatterns = [
      new RegExp(`\\bfunction\\s+${functionName}\\s*\\(`),
      new RegExp(`\\b${functionName}\\s*:\\s*function\\s*\\(`),
      new RegExp(`\\b${functionName}\\s*=\\s*(async\\s+)?function\\s*\\(`),
      new RegExp(`\\b(const|let|var)\\s+${functionName}\\s*=\\s*(async\\s+)?\\(`),
      new RegExp(`\\b${functionName}\\s*\\(.*?\\)\\s*\\{`),
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of functionPatterns) {
        if (pattern.test(line)) {
          const context = this.extractContext(lines, i);
          const functionDescription = this.extractFunctionDescription(lines, i);
          
          occurrences.push({
            lineNumber: i + 1,
            codeSnippet: line.trim(),
            context,
            functionDescription: functionDescription || `Function: ${functionName}`
          });
          
          break;
        }
      }
    }

    return occurrences;
  }

  /**
   * Sanitize search term to prevent regex injection and XSS
   */
  private sanitizeSearchTerm(term: string): string {
    // Remove potentially dangerous characters
    return term
      .replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape regex special chars
      .replace(/[<>"']/g, '') // Remove HTML/script tags
      .trim();
  }

  /**
   * Find occurrences of search term in JavaScript code
   */
  private findOccurrences(
    content: string,
    searchTerm: string,
    entityName?: string,
    fieldName?: string
  ): WebResourceUsage['occurrences'] {
    const lines = content.split('\n');
    const occurrences: WebResourceUsage['occurrences'] = [];
    
    const searchPatterns = [
      searchTerm,
      `"${searchTerm}"`,
      `'${searchTerm}'`,
      `"${entityName}"`,
      `'${entityName}'`,
    ].filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of searchPatterns) {
        if (line.includes(pattern)) {
          const context = this.extractContext(lines, i);
          const functionDescription = this.extractFunctionDescription(lines, i);
          
          occurrences.push({
            lineNumber: i + 1,
            codeSnippet: line.trim(),
            context,
            functionDescription
          });
          
          break; // Only record once per line
        }
      }
    }

    return occurrences;
  }

  /**
   * Extract surrounding context (3 lines before and after)
   */
  private extractContext(lines: string[], lineIndex: number): string {
    const start = Math.max(0, lineIndex - 2);
    const end = Math.min(lines.length, lineIndex + 3);
    return lines.slice(start, end).join('\n');
  }

  /**
   * Extract JSDoc comment for the containing function
   */
  private extractFunctionDescription(lines: string[], lineIndex: number): string | undefined {
    // Look backwards for JSDoc comment or function declaration
    for (let i = lineIndex - 1; i >= 0 && i > lineIndex - 20; i--) {
      const line = lines[i].trim();
      
      // Check for JSDoc comment end
      if (line === '*/') {
        const commentLines: string[] = [];
        for (let j = i - 1; j >= 0 && j > i - 10; j--) {
          const commentLine = lines[j].trim();
          if (commentLine.startsWith('/**')) {
            commentLines.unshift(commentLine.replace('/**', '').trim());
            break;
          }
          commentLines.unshift(commentLine.replace('*', '').trim());
        }
        return commentLines.join(' ').trim();
      }
      
      // Check for regular function comment
      if (line.startsWith('//')) {
        return line.replace('//', '').trim();
      }
      
      // Stop if we hit another function
      if (line.match(/^(function|const|let|var)\s+\w+\s*[=\(]/)) {
        break;
      }
    }
    
    return undefined;
  }

  /**
   * Get human-readable web resource type name
   */
  private getWebResourceTypeName(type: number): string {
    const types: Record<number, string> = {
      1: 'HTML',
      2: 'CSS',
      3: 'JavaScript',
      4: 'XML',
      5: 'PNG',
      6: 'JPG',
      7: 'GIF',
      8: 'XAP',
      9: 'XSL',
      10: 'ICO',
      11: 'SVG',
      12: 'RESX'
    };
    return types[type] || 'Unknown';
  }
}
