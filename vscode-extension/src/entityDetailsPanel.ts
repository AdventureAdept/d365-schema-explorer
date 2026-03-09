import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import Database from 'better-sqlite3';

export class EntityDetailsPanel {
    public static currentPanel: EntityDetailsPanel | undefined;
    public static readonly viewType = 'entityDetails';

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];
    private _item: any;
    private _isAttribute: boolean;

    public static createOrShow(extensionUri: vscode.Uri, item: any, isAttribute: boolean = false) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        // If we already have a panel, show it
        if (EntityDetailsPanel.currentPanel) {
            EntityDetailsPanel.currentPanel._panel.reveal(column);
            EntityDetailsPanel.currentPanel._update(item, isAttribute);
            return;
        }

        // Otherwise, create a new panel
        const panel = vscode.window.createWebviewPanel(
            EntityDetailsPanel.viewType,
            isAttribute ? 'Attribute Details' : 'Entity Details',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')]
            }
        );

        EntityDetailsPanel.currentPanel = new EntityDetailsPanel(panel, extensionUri, item, isAttribute);
    }

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, item: any, isAttribute: boolean) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._item = item;
        this._isAttribute = isAttribute;

        // Set the webview's initial html content
        this._update(item, isAttribute);

        // Listen for when the panel is disposed
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

        // Update the content based on view changes
        this._panel.onDidChangeViewState(
            e => {
                if (this._panel.visible) {
                    this._update(this._item, this._isAttribute);
                }
            },
            null,
            this._disposables
        );
    }

    private _update(item: any, isAttribute: boolean) {
        this._item = item;
        this._isAttribute = isAttribute;
        const webview = this._panel.webview;
        this._panel.title = isAttribute ? `Attribute: ${item.label}` : `Entity: ${item.label}`;
        webview.html = this._getHtmlForWebview(webview, item, isAttribute);
    }

    private _getHtmlForWebview(webview: vscode.Webview, item: any, isAttribute: boolean): string {
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

        const dbPath = path.join(configDir, `${clientName}.db`);
        if (!fs.existsSync(dbPath)) {
            return this._getErrorHtml('No schema cache found');
        }

        let data: any = null;
        try {
            const db = new Database(dbPath);
            
            if (isAttribute) {
                // Get attribute details
                const stmt = db.prepare('SELECT * FROM attributes WHERE logical_name = ?');
                data = stmt.get(name);
            } else {
                // Get entity details
                const stmt = db.prepare('SELECT * FROM entities WHERE logical_name = ?');
                data = stmt.get(name);
                
                // Also get attributes
                const attrStmt = db.prepare('SELECT * FROM attributes WHERE entity_name = ? ORDER BY is_primary_id DESC, is_primary_name DESC, logical_name');
                const attributes = attrStmt.all(name);
                
                if (data) {
                    data.attributes = attributes;
                }
            }
            
            db.close();
        } catch (error) {
            return this._getErrorHtml(`Database error: ${error}`);
        }

        if (!data) {
            return this._getErrorHtml('Data not found');
        }

        if (isAttribute) {
            return this._getAttributeHtml(data);
        } else {
            return this._getEntityHtml(data);
        }
    }

    private _getEntityHtml(data: any): string {
        const attributes = data.attributes || [];
        const attributesHtml = attributes.map((attr: any) => `
            <tr>
                <td><code>${attr.logical_name}</code></td>
                <td>${attr.attribute_type || 'Unknown'}</td>
                <td>${attr.display_name || ''}</td>
                <td>${attr.is_primary_id ? '✓' : ''}</td>
                <td>${attr.is_primary_name ? '✓' : ''}</td>
                <td>${attr.is_custom_attribute ? '✓' : ''}</td>
            </tr>
        `).join('');

        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Entity: ${data.logical_name}</title>
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
                    ${data.display_name || data.logical_name}
                    <span class="badge ${data.is_custom_entity ? 'badge-custom' : 'badge-system'}">
                        ${data.is_custom_entity ? 'Custom' : 'System'}
                    </span>
                </h1>
                
                <div class="property">
                    <span class="property-label">Logical Name:</span>
                    <span class="property-value"><code>${data.logical_name}</code></span>
                </div>
                
                <div class="property">
                    <span class="property-label">Schema Name:</span>
                    <span class="property-value">${data.schema_name || 'N/A'}</span>
                </div>
                
                ${data.primary_id_attribute ? `
                <div class="property">
                    <span class="property-label">Primary ID:</span>
                    <span class="property-value"><code>${data.primary_id_attribute}</code></span>
                </div>
                ` : ''}
                
                ${data.primary_name_attribute ? `
                <div class="property">
                    <span class="property-label">Primary Name:</span>
                    <span class="property-value"><code>${data.primary_name_attribute}</code></span>
                </div>
                ` : ''}
                
                ${data.ownership_type ? `
                <div class="property">
                    <span class="property-label">Ownership:</span>
                    <span class="property-value">${data.ownership_type}</span>
                </div>
                ` : ''}
                
                ${data.description ? `
                <div class="property">
                    <span class="property-label">Description:</span>
                    <span class="property-value">${data.description}</span>
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
            </body>
            </html>`;
    }

    private _getAttributeHtml(data: any): string {
        return `<!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Attribute: ${data.logical_name}</title>
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
                </style>
            </head>
            <body>
                <h1>${data.display_name || data.logical_name}</h1>
                
                <div class="property">
                    <span class="property-label">Logical Name:</span>
                    <span class="property-value"><code>${data.logical_name}</code></span>
                </div>
                
                <div class="property">
                    <span class="property-label">Schema Name:</span>
                    <span class="property-value">${data.schema_name || 'N/A'}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Type:</span>
                    <span class="property-value">${data.attribute_type || 'Unknown'}</span>
                </div>
                
                <div class="property">
                    <span class="property-label">Entity:</span>
                    <span class="property-value"><code>${data.entity_name}</code></span>
                </div>
                
                ${data.is_primary_id ? `
                <div class="property">
                    <span class="property-label">Primary ID:</span>
                    <span class="property-value">Yes</span>
                </div>
                ` : ''}
                
                ${data.is_primary_name ? `
                <div class="property">
                    <span class="property-label">Primary Name:</span>
                    <span class="property-value">Yes</span>
                </div>
                ` : ''}
                
                ${data.is_custom_attribute ? `
                <div class="property">
                    <span class="property-label">Custom:</span>
                    <span class="property-value">Yes</span>
                </div>
                ` : ''}
                
                ${data.description ? `
                <div class="property">
                    <span class="property-label">Description:</span>
                    <span class="property-value">${data.description}</span>
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
