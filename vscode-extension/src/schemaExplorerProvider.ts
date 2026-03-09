import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import Database from 'better-sqlite3';

interface EntityMetadata {
    logical_name: string;
    schema_name: string;
    display_name: string;
    description: string;
    is_custom_entity: number;
    is_managed: number;
    primary_name_attribute: string;
}

interface AttributeMetadata {
    logical_name: string;
    schema_name: string;
    display_name: string;
    attribute_type: string;
    is_primary_id: number;
    is_primary_name: number;
}

export class SchemaExplorerProvider implements vscode.TreeDataProvider<SchemaItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<SchemaItem | undefined | null | void> = new vscode.EventEmitter<SchemaItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<SchemaItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private context: vscode.ExtensionContext;
    private currentClient: string | null = null;
    private db: Database.Database | null = null;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: SchemaItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SchemaItem): Thenable<SchemaItem[]> {
        if (!this.currentClient) {
            return Promise.resolve([new SchemaItem('Connect to Dataverse', vscode.TreeItemCollapsibleState.None, 'connect')]);}

        if (!element) {
            // Root level - show entities
            return this.getEntities();
        }

        if (element.contextValue === 'entity') {
            // Show attributes for this entity
            return this.getAttributes(element.label as string);
        }

        return Promise.resolve([]);
    }

    private getEntities(): Promise<SchemaItem[]> {
        if (!this.db) {
            return Promise.resolve([]);
        }

        const config = vscode.workspace.getConfiguration('d365SchemaExplorer');
        const showSystem = config.get<boolean>('showSystemEntities', true);
        const showCustom = config.get<boolean>('showCustomEntities', true);

        try {
            let query = 'SELECT logical_name, display_name, is_custom_entity FROM entities WHERE 1=1';
            if (!showSystem) {
                query += ' AND is_custom_entity = 1';
            }
            if (!showCustom) {
                query += ' AND is_custom_entity = 0';
            }
            query += ' ORDER BY logical_name';

            const stmt = this.db.prepare(query);
            const rows = stmt.all() as EntityMetadata[];

            return Promise.resolve(rows.map(row => {
                const displayName = row.display_name || row.logical_name;
                const icon = row.is_custom_entity ? 'package' : 'symbol-class';
                return new SchemaItem(
                    row.logical_name,
                    vscode.TreeItemCollapsibleState.Collapsed,
                    'entity',
                    displayName,
                    row.is_custom_entity ? 'Custom' : 'System',
                    icon
                );
            }));
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading entities: ${error}`);
            return Promise.resolve([]);
        }
    }

    private getAttributes(entityName: string): Promise<SchemaItem[]> {
        if (!this.db) {
            return Promise.resolve([]);
        }

        try {
            const stmt = this.db.prepare(
                'SELECT logical_name, display_name, attribute_type, is_primary_id, is_primary_name FROM attributes WHERE entity_name = ? ORDER BY is_primary_id DESC, is_primary_name DESC, logical_name'
            );
            const rows = stmt.all(entityName) as AttributeMetadata[];

            return Promise.resolve(rows.map(row => {
                const displayName = row.display_name || row.logical_name;
                let icon = 'symbol-field';
                if (row.is_primary_id) icon = 'key';
                else if (row.is_primary_name) icon = 'symbol-text';
                else if (row.attribute_type === 'Lookup') icon = 'link';
                else if (row.attribute_type === 'Picklist') icon = 'list-unordered';

                return new SchemaItem(
                    row.logical_name,
                    vscode.TreeItemCollapsibleState.None,
                    'attribute',
                    `${displayName} (${row.attribute_type})`,
                    row.attribute_type,
                    icon
                );
            }));
        } catch (error) {
            vscode.window.showErrorMessage(`Error loading attributes: ${error}`);
            return Promise.resolve([]);
        }
    }

    async connect(): Promise<void> {
        // Get list of available clients from CLI config
        const configDir = path.join(os.homedir(), '.d365ai', 'clients');
        if (!fs.existsSync(configDir)) {
            vscode.window.showInformationMessage('No clients configured. Use CLI to set up: d365ai env connect');
            return;
        }

        const clients = fs.readdirSync(configDir)
            .filter(f => f.endsWith('.json') && !f.endsWith('.auth.json'))
            .map(f => f.replace('.json', ''));

        if (clients.length === 0) {
            vscode.window.showInformationMessage('No clients configured. Use CLI to set up: d365ai env connect');
            return;
        }

        const selected = await vscode.window.showQuickPick(clients, {
            placeHolder: 'Select a client to connect to'
        });

        if (selected) {
            await this.connectToClient(selected);
        }
    }

    async connectToClient(clientName: string): Promise<void> {
        const cacheDir = path.join(os.homedir(), '.d365ai');
        const dbPath = path.join(cacheDir, `${clientName}.db`);

        if (!fs.existsSync(dbPath)) {
            const action = await vscode.window.showWarningMessage(
                `No schema cache found for ${clientName}. Run 'd365ai schema pull' first.`,
                'Pull Now',
                'Cancel'
            );
            if (action === 'Pull Now') {
                // Run CLI command to pull schema
                const terminal = vscode.window.createTerminal('D365 Schema Pull');
                terminal.sendText(`d365ai use ${clientName} && d365ai schema pull --full`);
                terminal.show();
            }
            return;
        }

        // Close existing connection
        if (this.db) {
            this.db.close();
        }

        try {
            this.db = new Database(dbPath);
            this.currentClient = clientName;
            this.refresh();
            vscode.window.showInformationMessage(`Connected to ${clientName}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to connect: ${error}`);
        }
    }

    async disconnect(): Promise<void> {
        if (this.db) {
            this.db.close();
            this.db = null;
        }
        this.currentClient = null;
        this.refresh();
        vscode.window.showInformationMessage('Disconnected');
    }

    async search(): Promise<void> {
        if (!this.currentClient || !this.db) {
            vscode.window.showInformationMessage('Please connect to a Dataverse environment first');
            return;
        }

        const query = await vscode.window.showInputBox({
            placeHolder: 'Search entities and attributes...',
            prompt: 'Enter search term'
        });

        if (!query) return;

        try {
            // Search entities
            const entityStmt = this.db.prepare(
                "SELECT logical_name, display_name FROM entities WHERE logical_name LIKE ? OR display_name LIKE ?"
            );
            const entities = entityStmt.all(`%${query}%`, `%${query}%`) as EntityMetadata[];

            // Search attributes
            const attrStmt = this.db.prepare(
                "SELECT entity_name, logical_name, display_name FROM attributes WHERE logical_name LIKE ? OR display_name LIKE ?"
            );
            const attributes = attrStmt.all(`%${query}%`, `%${query}%`) as Array<{entity_name: string, logical_name: string, display_name: string}>();

            const items: vscode.QuickPickItem[] = [
                ...entities.map(e => ({
                    label: `$(symbol-class) ${e.logical_name}`,
                    description: e.display_name,
                    detail: 'Entity'
                })),
                ...attributes.map(a => ({
                    label: `$(symbol-field) ${a.logical_name}`,
                    description: a.display_name,
                    detail: `Attribute in ${a.entity_name}`
                }))
            ];

            const selected = await vscode.window.showQuickPick(items, {
                placeHolder: `Found ${entities.length} entities and ${attributes.length} attributes`
            });

            if (selected) {
                // TODO: Navigate to selected item
                vscode.window.showInformationMessage(`Selected: ${selected.label}`);
            }
        } catch (error) {
            vscode.window.showErrorMessage(`Search failed: ${error}`);
        }
    }

    async exportEntity(item: SchemaItem): Promise<void> {
        if (!item || item.contextValue !== 'entity') return;

        const entityName = item.label as string;
        const format = await vscode.window.showQuickPick(['JSON', 'Markdown'], {
            placeHolder: 'Select export format'
        });

        if (!format) return;

        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(`${entityName}.${format.toLowerCase()}`),
            filters: format === 'JSON' 
                ? { 'JSON': ['json'] }
                : { 'Markdown': ['md'] }
        });

        if (!uri) return;

        try {
            if (format === 'JSON') {
                const stmt = this.db!.prepare('SELECT metadata_json FROM entities WHERE logical_name = ?');
                const row = stmt.get(entityName) as { metadata_json: string };
                if (row) {
                    fs.writeFileSync(uri.fsPath, JSON.stringify(JSON.parse(row.metadata_json), null, 2));
                }
            } else {
                // Generate Markdown
                const entity = this.db!.prepare('SELECT * FROM entities WHERE logical_name = ?').get(entityName) as EntityMetadata;
                const attributes = this.db!.prepare('SELECT * FROM attributes WHERE entity_name = ?').all(entityName) as AttributeMetadata[];
                
                let md = `# ${entity.display_name || entity.logical_name}\n\n`;
                md += `**Logical Name:** ${entity.logical_name}\n`;
                md += `**Schema Name:** ${entity.schema_name}\n`;
                if (entity.primary_name_attribute) {
                    md += `**Primary Name:** ${entity.primary_name_attribute}\n`;
                }
                md += `\n## Attributes\n\n`;
                md += `| Name | Type | Display Name |\n`;
                md += `|------|------|-------------|\n`;
                
                for (const attr of attributes) {
                    md += `| ${attr.logical_name} | ${attr.attribute_type} | ${attr.display_name || ''} |\n`;
                }
                
                fs.writeFileSync(uri.fsPath, md);
            }

            vscode.window.showInformationMessage(`Exported ${entityName} to ${uri.fsPath}`);
        } catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    }
}

class SchemaItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly description?: string,
        public readonly tooltip?: string,
        public readonly iconName?: string
    ) {
        super(label, collapsibleState);
        this.description = description;
        this.tooltip = tooltip || description;
        
        if (iconName) {
            this.iconPath = new vscode.ThemeIcon(iconName);
        }

        if (contextValue === 'entity') {
            this.command = {
                command: 'd365SchemaExplorer.viewEntityDetails',
                title: 'View Details',
                arguments: [this]
            };
        } else if (contextValue === 'attribute') {
            this.command = {
                command: 'd365SchemaExplorer.viewAttributeDetails',
                title: 'View Details',
                arguments: [this]
            };
        }
    }
}
