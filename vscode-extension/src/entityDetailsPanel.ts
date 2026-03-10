import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { escapeHtml } from '../../src/webview/sanitize';

// Cache data interfaces matching CLI JSON structure
interface EntityMetadata {
    LogicalName: string;
    SchemaName: string;
    DisplayName?: { UserLocalizedLabel?: { Label: string } };
    Description?: { UserLocalizedLabel?: { Label: string } };
    PrimaryIdAttribute: string;
    PrimaryNameAttribute?: string;
    OwnershipType?: string;
    IsIntersect?: boolean;
    IsCustomEntity?: boolean;
    IsManaged?: boolean;
    EntitySetName?: string;
    ModifiedOn?: string;
}

interface AttributeMetadata {
    LogicalName: string;
    SchemaName: string;
    DisplayName?: { UserLocalizedLabel?: { Label: string } };
    Description?: { UserLocalizedLabel?: { Label: string } };
    AttributeType?: string;
    AttributeTypeName?: { Value: string };
    IsPrimaryId?: boolean;
    IsPrimaryName?: boolean;
    RequiredLevel?: { Value: string };
    IsValidForCreate?: boolean;
    IsValidForUpdate?: boolean;
    IsValidForRead?: boolean;
    IsCustomAttribute?: boolean;
    MaxLength?: number;
    MinValue?: number;
    MaxValue?: number;
    ModifiedOn?: string;
}

interface RelationshipMetadata {
    SchemaName: string;
    ReferencingEntity?: string;
    ReferencingAttribute?: string;
    ReferencedEntity?: string;
    ReferencedAttribute?: string;
    RelationshipType?: string;
    ModifiedOn?: string;
}

interface CacheData {
    entities: Record<string, EntityMetadata>;
    attributes: Record<string, AttributeMetadata[]>;
    relationships: Record<string, RelationshipMetadata>;
    metadata: {
        lastSync?: string;
        lastFullSync?: string;
        entityCount?: number;
        deltaSyncEnabled?: boolean;
    } | null;
}

export class EntityDetailsPanel {
    public static currentPanel: EntityDetailsPanel | undefined;
    public static readonly viewType = 'entityDetails';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _item: any;
    private _isAttribute: boolean;
    private _isRelationship: boolean;

    public static createOrShow(extensionUri: vscode.Uri, item: any, isAttribute: boolean = false, isRelationship: boolean = false) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (EntityDetailsPanel.currentPanel) {
            EntityDetailsPanel.currentPanel._panel.reveal(column);
            EntityDetailsPanel.currentPanel._update(item, isAttribute, isRelationship);
            return;
        }

        // Otherwise, create a new panel
        const title = isRelationship 
            ? `Relationship: ${item.label}` 
            : isAttribute 
                ? `Attribute: ${item.label}` 
                : `Entity: ${item.label}`;
        
        const panel = vscode.window.createWebviewPanel(
            EntityDetailsPanel.viewType,
            title,
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        EntityDetailsPanel.currentPanel = new EntityDetailsPanel(panel, extensionUri, item, isAttribute, isRelationship);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, item: any, isAttribute: boolean, isRelationship: boolean) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._item = item;
        this._isAttribute = isAttribute;
        this._isRelationship = isRelationship;

        // Set the webview's initial html content
        this._update(item, isAttribute, isRelationship);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update(this._item, this._isAttribute, this._isRelationship);
                }
            },
            null,
            this._disposables
        );
    }

    private _update(item: any, isAttribute: boolean, isRelationship: boolean) {
        this._item = item;
        this._isAttribute = isAttribute;
        this._isRelationship = isRelationship;
        const webview = this._panel.webview;
        
        let title: string;
        if (isRelationship) {
            title = `Relationship: ${item.label}`;
        } else if (isAttribute) {
            title = `Attribute: ${item.label}`;
        } else {
            title = `Entity: ${item.label}`;
        }
        
        this._panel.title = title;
        webview.html = this._getHtmlForWebview(webview, item, isAttribute, isRelationship);
    }

    private _getHtmlForWebview(webview: vscode.Webview, item: any, isAttribute: boolean, isRelationship: boolean): string {
        const name = item.label;
        const configDir = path.join(os.homedir(), '.d365ai');
        
        // Find the active client
        const configPath = path.join(configDir, 'config.json');
        let clientName = '';
        if (fs.existsSync(configPath)) {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
            clientName = config.activeClient;
        }

        if (!clientName) {
            return this._getErrorHtml('No active client');
        }

        const cacheFilePath = path.join(configDir, 'clients', `${clientName}-cache.json`);
        if (!fs.existsSync(cacheFilePath)) {
            return this._getErrorHtml('No schema cache found');
        }

        let cacheData: CacheData;
        try {
            const content = fs.readFileSync(cacheFilePath, 'utf-8');
            cacheData = JSON.parse(content);
        } catch (error) {
            return this._getErrorHtml(`Failed to read cache: ${error}`);
        }

        if (isRelationship) {
            const relationship = cacheData.relationships?.[name];
            if (!relationship) {
                return this._getErrorHtml('Relationship not found');
            }
            return this._getRelationshipHtml(relationship);
        } else if (isAttribute) {
            const entityName = item.entityName;
            const attribute = cacheData.attributes?.[entityName]?.find(a => a.LogicalName === name);
            if (!attribute) {
                return this._getErrorHtml('Attribute not found');
            }
            return this._getAttributeHtml(attribute, entityName);
        } else {
            const entity = cacheData.entities?.[name];
            if (!entity) {
                return this._getErrorHtml('Entity not found');
            }
            const attributes = cacheData.attributes?.[name] || [];
            const relationships = Object.values(cacheData.relationships || {}).filter(r => 
                r.ReferencedEntity === name || r.ReferencingEntity === name
            );
            return this._getEntityHtml(entity, attributes, relationships);
        }
    }

    private _getEntityHtml(entity: EntityMetadata, attributes: AttributeMetadata[], relationships: RelationshipMetadata[]): string {
        const attributesHtml = attributes.map((attr: AttributeMetadata) => {
            const attrType = attr.AttributeType || attr.AttributeTypeName?.Value || 'Unknown';
            return `
            <tr>
                <td><code>${attr.LogicalName}</code></td>
                <td>${attrType}</td>
                <td>${attr.DisplayName?.UserLocalizedLabel?.Label || ''}</td>
                <td>${attr.IsPrimaryId ? '✓' : ''}</td>
                <td>${attr.IsPrimaryName ? '✓' : ''}</td>
                <td>${attr.IsCustomAttribute ? '✓' : ''}</td>
            </tr>
        `}).join('');

        const relationshipsHtml = relationships.map((rel: RelationshipMetadata) => `
            <tr>
                <td>${rel.SchemaName}</td>
                <td>${rel.RelationshipType || 'Unknown'}</td>
                <td>${rel.ReferencingEntity || ''}</td>
                <td>${rel.ReferencedEntity || ''}</td>
            </tr>
        `).join('');

        const description = entity.Description?.UserLocalizedLabel?.Label || '';

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Entity: ${escapeHtml(entity.LogicalName)}</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 {
                        color: var(--vscode-textLink-foreground);
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 10px;
                    }
                    h2 {
                        color: var(--vscode-foreground);
                        margin-top: 30px;
                    }
                    .property {
                        margin: 10px 0;
                    }
                    .property-label {
                        font-weight: bold;
                        color: var(--vscode-textPreformat-foreground);
                    }
                    .property-value {
                        margin-left: 10px;
                    }
                    .badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 3px;
                        font-size: 0.85em;
                        margin-left: 10px;
                    }
                    .badge-custom {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                    .badge-system {
                        background: var(--vscode-badge-background);
                        color: var(--vscode-badge-foreground);
                    }
                    table {
                        width: 100%;
                        border-collapse: collapse;
                        margin-top: 10px;
                    }
                    th, td {
                        text-align: left;
                        padding: 8px;
                        border-bottom: 1px solid var(--vscode-panel-border);
                    }
                    th {
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        font-weight: bold;
                    }
                    tr:hover {
                        background: var(--vscode-list-hoverBackground);
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        background: var(--vscode-textCodeBlock-background);
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                </style>
            </head>
            <body>
                <h1>
                    ${entity.DisplayName?.UserLocalizedLabel?.Label || entity.LogicalName}
                    <span class="badge ${entity.IsCustomEntity ? 'badge-custom' : 'badge-system'}">
                        ${entity.IsCustomEntity ? 'Custom' : 'System'}
                    </span>
                </h1>
                
                <div class="property">
                    <span class="property-label">Logical Name:</span>
                    <span class="property-value"><code>${entity.LogicalName}</code></span>
                </div>
                
                <div class="property">
                    <span class="property-label">Schema Name:</span>
                    <span class="property-value">${entity.SchemaName}</span>
                </div>
                
                ${entity.PrimaryIdAttribute ? `
                <div class="property">
                    <span class="property-label">Primary ID:</span>
                    <span class="property-value"><code>${entity.PrimaryIdAttribute}</code></span>
                </div>
                ` : ''}
                
                ${entity.PrimaryNameAttribute ? `
                <div class="property">
                    <span class="property-label">Primary Name:</span>
                    <span class="property-value"><code>${entity.PrimaryNameAttribute}</code></span>
                </div>
                ` : ''}
                
                ${entity.OwnershipType ? `
                <div class="property">
                    <span class="property-label">Ownership:</span>
                    <span class="property-value">${entity.OwnershipType}</span>
                </div>
                ` : ''}
                
                ${entity.EntitySetName ? `
                <div class="property">
                    <span class="property-label">Entity Set:</span>
                    <span class="property-value">${entity.EntitySetName}</span>
                </div>
                ` : ''}
                
                ${description ? `
                <div class="property">
                    <span class="property-label">Description:</span>
                    <span class="property-value">${description}</span>
                </div>
                ` : ''}
                
                <h2>Attributes (${attributes.length})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>Display Name</th>
                            <th>Primary ID</th>
                            <th>Primary Name</th>
                            <th>Custom</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${attributesHtml}
                    </tbody>
                </table>

                ${relationships.length > 0 ? `
                <h2>Relationships (${relationships.length})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Type</th>
                            <th>From</th>
                            <th>To</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${relationshipsHtml}
                    </tbody>
                </table>
                ` : ''}
            </body>
            </html>`;
    }

    private _getAttributeHtml(data: AttributeMetadata, entityName: string): string {
        const attrType = data.AttributeType || data.AttributeTypeName?.Value || 'Unknown';
        const description = data.Description?.UserLocalizedLabel?.Label || '';

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Attribute: ${data.LogicalName}</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 {
                        color: var(--vscode-textLink-foreground);
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 10px;
                    }
                    .property {
                        margin: 10px 0;
                    }
                    .property-label {
                        font-weight: bold;
                        color: var(--vscode-textPreformat-foreground);
                    }
                    .property-value {
                        margin-left: 10px;
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        background: var(--vscode-textCodeBlock-background);
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                    .badge {
                        display: inline-block;
                        padding: 2px 8px;
                        border-radius: 3px;
                        font-size: 0.85em;
                        margin-left: 10px;
                    }
                    .badge-primary {
                        background: var(--vscode-button-background);
                        color: var(--vscode-button-foreground);
                    }
                </style>
            </head>
            <body>
                <h1>
                    ${data.DisplayName?.UserLocalizedLabel?.Label || data.LogicalName}
                    ${data.IsPrimaryId ? '<span class="badge badge-primary">Primary ID</span>' : ''}
                    ${data.IsPrimaryName ? '<span class="badge badge-primary">Primary Name</span>' : ''}
                </h1>
                
                <div class="property">
                    <span class="property-label">Logical Name:</span>
                    <span class="property-value"><code>${data.LogicalName}</code></span>
                </div>
                
                <div class="property">
                    <span class="property-label">Schema Name:</span>
                    <span class="property-value">${data.SchemaName}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Type:</span>
                    <span class="property-value">${attrType}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Entity:</span>
                    <span class="property-value"><code>${entityName}</code></span>
                </div>
                
                ${data.RequiredLevel?.Value ? `
                <div class="property">
                    <span class="property-label">Required Level:</span>
                    <span class="property-value">${data.RequiredLevel.Value}</span>
                </div>
                ` : ''}
                
                ${data.MaxLength ? `
                <div class="property">
                    <span class="property-label">Max Length:</span>
                    <span class="property-value">${data.MaxLength}</span>
                </div>
                ` : ''}
                
                ${data.MinValue !== undefined ? `
                <div class="property">
                    <span class="property-label">Min Value:</span>
                    <span class="property-value">${data.MinValue}</span>
                </div>
                ` : ''}
                
                ${data.MaxValue !== undefined ? `
                <div class="property">
                    <span class="property-label">Max Value:</span>
                    <span class="property-value">${data.MaxValue}</span>
                </div>
                ` : ''}
                
                <div class="property">
                    <span class="property-label">Valid for Create:</span>
                    <span class="property-value">${data.IsValidForCreate ? 'Yes' : 'No'}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Valid for Update:</span>
                    <span class="property-value">${data.IsValidForUpdate ? 'Yes' : 'No'}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Valid for Read:</span>
                    <span class="property-value">${data.IsValidForRead ? 'Yes' : 'No'}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Custom:</span>
                    <span class="property-value">${data.IsCustomAttribute ? 'Yes' : 'No'}</span>
                </div>
                
                ${description ? `
                <div class="property">
                    <span class="property-label">Description:</span>
                    <span class="property-value">${description}</span>
                </div>
                ` : ''}
            </body>
            </html>`;
    }

    private _getRelationshipHtml(data: RelationshipMetadata): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Relationship: ${data.SchemaName}</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        padding: 20px;
                        line-height: 1.6;
                    }
                    h1 {
                        color: var(--vscode-textLink-foreground);
                        border-bottom: 1px solid var(--vscode-panel-border);
                        padding-bottom: 10px;
                    }
                    .property {
                        margin: 10px 0;
                    }
                    .property-label {
                        font-weight: bold;
                        color: var(--vscode-textPreformat-foreground);
                    }
                    .property-value {
                        margin-left: 10px;
                    }
                    code {
                        font-family: var(--vscode-editor-font-family);
                        background: var(--vscode-textCodeBlock-background);
                        padding: 2px 4px;
                        border-radius: 3px;
                    }
                    .diagram {
                        margin: 20px 0;
                        padding: 15px;
                        background: var(--vscode-editor-inactiveSelectionBackground);
                        border-radius: 5px;
                        text-align: center;
                        font-size: 1.1em;
                    }
                </style>
            </head>
            <body>
                <h1>${data.SchemaName}</h1>
                
                <div class="property">
                    <span class="property-label">Schema Name:</span>
                    <span class="property-value">${data.SchemaName}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Relationship Type:</span>
                    <span class="property-value">${data.RelationshipType || 'Unknown'}</span>
                </div>
                
                ${data.ReferencingEntity && data.ReferencedEntity ? `
                <div class="diagram">
                    <code>${data.ReferencingEntity}</code> 
                    → <strong>${data.SchemaName}</strong> → 
                    <code>${data.ReferencedEntity}</code>
                </div>
                ` : ''}
                
                ${data.ReferencingEntity ? `
                <div class="property">
                    <span class="property-label">Referencing Entity:</span>
                    <span class="property-value"><code>${data.ReferencingEntity}</code></span>
                </div>
                ` : ''}
                
                ${data.ReferencingAttribute ? `
                <div class="property">
                    <span class="property-label">Referencing Attribute:</span>
                    <span class="property-value"><code>${data.ReferencingAttribute}</code></span>
                </div>
                ` : ''}
                
                ${data.ReferencedEntity ? `
                <div class="property">
                    <span class="property-label">Referenced Entity:</span>
                    <span class="property-value"><code>${data.ReferencedEntity}</code></span>
                </div>
                ` : ''}
                
                ${data.ReferencedAttribute ? `
                <div class="property">
                    <span class="property-label">Referenced Attribute:</span>
                    <span class="property-value"><code>${data.ReferencedAttribute}</code></span>
                </div>
                ` : ''}
            </body>
            </html>`;
    }

    private _getErrorHtml(message: string): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Error</title>
                <style>
                    body {
                        font-family: var(--vscode-font-family);
                        font-size: var(--vscode-font-size);
                        color: var(--vscode-foreground);
                        padding: 20px;
                    }
                    .error {
                        color: var(--vscode-errorForeground);
                        padding: 20px;
                        background: var(--vscode-inputValidation-errorBackground);
                        border: 1px solid var(--vscode-inputValidation-errorBorder);
                        border-radius: 4px;
                    }
                </style>
            </head>
            <body>
                <div class="error">
                    <h2>Error</h2>
                    <p>${message}</p>
                </div>
            </body>
            </html>`;
    }

    public dispose() {
        EntityDetailsPanel.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }
}