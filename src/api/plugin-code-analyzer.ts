import * as fs from 'fs';
import { promises as fsPromises } from 'fs';
import * as path from 'path';

export interface PluginCodeUsage {
  pluginName: string;
  filePath: string;
  occurrences: {
    lineNumber: number;
    codeSnippet: string;
    context: string;
    functionDescription?: string;
  }[];
}

export class PluginCodeAnalyzer {
  private pluginSourcePath: string;
  private readonly allowedBasePath: string = '/home/node/.openclaw/workspace';
  private readonly maxFileSize: number = 10 * 1024 * 1024; // 10MB
  private readonly maxFiles: number = 10000;

  constructor(pluginSourcePath: string = '/home/node/.openclaw/workspace/plugin-source') {
    // Validate and sanitize the path
    const resolvedPath = path.resolve(pluginSourcePath);
    const resolvedBase = path.resolve(this.allowedBasePath);
    
    // Ensure the path is within allowed directory
    if (!resolvedPath.startsWith(resolvedBase)) {
      throw new Error(`Invalid plugin source path: ${pluginSourcePath}. Path must be within ${this.allowedBasePath}`);
    }
    
    // Check path exists and is directory (using sync for constructor)
    if (!fs.existsSync(resolvedPath) || !fs.statSync(resolvedPath).isDirectory()) {
      throw new Error(`Plugin source path does not exist or is not a directory: ${resolvedPath}`);
    }
    
    // Validate we can read the directory
    try {
      fs.accessSync(resolvedPath, fs.constants.R_OK);
    } catch {
      throw new Error(`Cannot read plugin source directory: ${resolvedPath}`);
    }
    
    this.pluginSourcePath = resolvedPath;
  }

  /**
   * Search plugin C# code for entity/field references
   */
  async searchPluginCode(
    searchTerm: string,
    entityName?: string,
    fieldName?: string
  ): Promise<PluginCodeUsage[]> {
    // Validate inputs
    if (!searchTerm || typeof searchTerm !== 'string') {
      throw new Error('searchTerm is required and must be a string');
    }
    
    if (searchTerm.length > 100) {
      throw new Error('searchTerm exceeds maximum length of 100 characters');
    }
    
    const usages: PluginCodeUsage[] = [];
    
    // Find all .cs files
    const csFiles = await this.findCSharpFilesAsync(this.pluginSourcePath);
    
    // Limit number of files processed
    const filesToProcess = csFiles.slice(0, this.maxFiles);
    
    for (const filePath of filesToProcess) {
      try {
        // Check file size before reading
        const stats = await fs.promises.stat(filePath);
        if (stats.size > this.maxFileSize) {
          console.warn(`Skipping large file ${filePath}: ${stats.size} bytes exceeds limit`);
          continue;
        }
        
        const content = await fs.promises.readFile(filePath, 'utf-8');
        const occurrences = this.findOccurrences(content, searchTerm, entityName, fieldName);
        
        if (occurrences.length > 0) {
          // Extract plugin name from file path or content
          const pluginName = this.extractPluginName(filePath, content);
          
          usages.push({
            pluginName,
            filePath: path.relative(this.pluginSourcePath, filePath),
            occurrences
          });
        }
      } catch (error) {
        console.warn(`Failed to read file ${filePath}:`, error);
        // Continue processing other files
      }
    }
    
    return usages;
  }

  /**
   * Find all C# files in the repository (async version)
   */
  private async findCSharpFilesAsync(dir: string): Promise<string[]> {
    const files: string[] = [];
    const directoriesToProcess: string[] = [dir];
    const processedDirs = new Set<string>();
    
    while (directoriesToProcess.length > 0 && files.length < this.maxFiles) {
      const currentDir = directoriesToProcess.shift()!;
      
      // Prevent infinite loops
      if (processedDirs.has(currentDir)) {
        continue;
      }
      processedDirs.add(currentDir);
      
      try {
        const items = await fs.promises.readdir(currentDir);
        
        for (const item of items) {
          const fullPath = path.join(currentDir, item);
          
          // Skip common non-source directories
          if (['bin', 'obj', '.git', 'node_modules', 'packages'].includes(item)) {
            continue;
          }
          
          try {
            const stat = await fs.promises.stat(fullPath);
            
            if (stat.isDirectory()) {
              directoriesToProcess.push(fullPath);
            } else if (item.endsWith('.cs')) {
              files.push(fullPath);
              
              if (files.length >= this.maxFiles) {
                console.warn(`Reached maximum file limit (${this.maxFiles}). Stopping search.`);
                break;
              }
            }
          } catch (statError) {
            console.warn(`Failed to stat ${fullPath}:`, statError);
          }
        }
      } catch (error) {
        console.warn(`Failed to read directory ${currentDir}:`, error);
      }
    }
    
    return files;
  }

  /**
   * Find occurrences of search term in C# code
   */
  private findOccurrences(
    content: string,
    searchTerm: string,
    entityName?: string,
    fieldName?: string
  ): PluginCodeUsage['occurrences'] {
    const lines = content.split('\n');
    const occurrences: PluginCodeUsage['occurrences'] = [];
    
    const searchPatterns = [
      searchTerm,
      `"${searchTerm}"`,
      `"${entityName}"`,
      `EntityReference`,
      `Target\["`,
      `GetAttributeValue`,
    ].filter(Boolean);

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      for (const pattern of searchPatterns) {
        if (line.includes(pattern) || (entityName && line.toLowerCase().includes(entityName.toLowerCase()))) {
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
   * Extract XML documentation comment for the containing method/class
   */
  private extractFunctionDescription(lines: string[], lineIndex: number): string | undefined {
    // Look backwards for XML documentation comments
    for (let i = lineIndex - 1; i >= 0 && i > lineIndex - 20; i--) {
      const line = lines[i].trim();
      
      // Check for XML comment end
      if (line === '*/') {
        const commentLines: string[] = [];
        for (let j = i - 1; j >= 0 && j > i - 15; j--) {
          const commentLine = lines[j].trim();
          if (commentLine.startsWith('/*')) {
            commentLines.unshift(commentLine.replace('/*', '').trim());
            break;
          }
          commentLines.unshift(commentLine.replace('*', '').trim());
        }
        return commentLines.join(' ').trim();
      }
      
      // Check for C# XML documentation
      if (line.startsWith('///')) {
        const commentLines: string[] = [];
        for (let j = i; j >= 0 && j > i - 10; j--) {
          const commentLine = lines[j].trim();
          if (!commentLine.startsWith('///')) {
            break;
          }
          // Extract summary content
          const summaryMatch = commentLine.match(/<summary>(.*?)<\/summary>/);
          if (summaryMatch) {
            return summaryMatch[1].trim();
          }
          commentLines.unshift(commentLine.replace('///', '').trim());
        }
        return commentLines.join(' ').trim();
      }
      
      // Check for regular comment
      if (line.startsWith('//')) {
        return line.replace('//', '').trim();
      }
      
      // Stop if we hit another method or class
      if (line.match(/^(public|private|protected|internal)\s+(static\s+)?(void|Task|IPlugin|class)\s+/)) {
        break;
      }
    }
    
    return undefined;
  }

  /**
   * Extract plugin name from file path or content
   */
  private extractPluginName(filePath: string, content: string): string {
    // Try to get from file name first
    const fileName = path.basename(filePath, '.cs');
    
    // Look for class name in content
    const classMatch = content.match(/class\s+(\w+)(?:\s*:\s*IPlugin)?/);
    if (classMatch) {
      return classMatch[1];
    }
    
    return fileName;
  }
}
