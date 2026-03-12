"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SchemaItem = exports.SchemaExplorerProvider = void 0;
const vscode = require("vscode");
const path = require("path");
const fs = require("fs");
const os = require("os");
class SchemaExplorerProvider {
    constructor(context) {
        this._onDidChangeTreeData = new vscode.EventEmitter();
        this.onDidChangeTreeData = this._onDidChangeTreeData.event;
        this.currentClient = null;
        this.cacheData = null;
        this.cacheFilePath = null;
        this.context = context;
    }
    refresh() {
        this.loadCacheData();
        this._onDidChangeTreeData.fire();
    }
    getTreeItem(element) {
        return element;
    }
    getChildren(element) {
        if (!this.currentClient || !this.cacheData) {
            return Promise.resolve([new SchemaItem('Connect to Dataverse', vscode.TreeItemCollapsibleState.None, 'connect')]);
        }
        if (!element) {
            // Root level - show entities
            return this.getEntities();
        }
        if (element.contextValue === 'entity') {
            // Show children: Attributes folder and Relationships folder
            return Promise.resolve([
                new SchemaItem('Attributes', vscode.TreeItemCollapsibleState.Collapsed, 'attributesFolder', `${this.cacheData.attributes[element.label]?.length || 0} attributes`, undefined, 'symbol-folder', element.label),
                new SchemaItem('Relationships', vscode.TreeItemCollapsibleState.Collapsed, 'relationshipsFolder', undefined, undefined, 'symbol-interface', element.label)
            ]);
        }
        if (element.contextValue === 'attributesFolder') {
            // Show attributes for this entity
            return this.getAttributes(element.entityName);
        }
        if (element.contextValue === 'relationshipsFolder') {
            // Show relationships for this entity
            return this.getRelationships(element.entityName);
        }
        return Promise.resolve([]);
    }
    loadCacheData() {
        if (!this.cacheFilePath || !fs.existsSync(this.cacheFilePath)) {
            this.cacheData = null;
            return;
        }
        try {
            const content = fs.readFileSync(this.cacheFilePath, 'utf-8');
            this.cacheData = JSON.parse(content);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading cache: ${error}`);
            this.cacheData = null;
        }
    }
    getEntities() {
        if (!this.cacheData?.entities) {
            return Promise.resolve([]);
        }
        const config = vscode.workspace.getConfiguration('d365SchemaExplorer');
        const showSystem = config.get('showSystemEntities', true);
        const showCustom = config.get('showCustomEntities', true);
        try {
            let entities = Object.values(this.cacheData.entities);
            // Filter by custom/system
            if (!showSystem) {
                entities = entities.filter(e => e.IsCustomEntity);
            }
            if (!showCustom) {
                entities = entities.filter(e => !e.IsCustomEntity);
            }
            // Sort by logical name
            entities.sort((a, b) => a.LogicalName.localeCompare(b.LogicalName));
            return Promise.resolve(entities.map(entity => {
                const displayName = entity.DisplayName?.UserLocalizedLabel?.Label || '';
                const icon = entity.IsCustomEntity ? 'package' : 'symbol-class';
                return new SchemaItem(entity.LogicalName, vscode.TreeItemCollapsibleState.Collapsed, 'entity', displayName, entity.IsCustomEntity ? 'Custom' : 'System', icon);
            }));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading entities: ${error}`);
            return Promise.resolve([]);
        }
    }
    getAttributes(entityName) {
        if (!this.cacheData?.attributes?.[entityName]) {
            return Promise.resolve([]);
        }
        try {
            const attributes = this.cacheData.attributes[entityName];
            // Sort: primary ID first, then primary name, then alphabetically
            attributes.sort((a, b) => {
                if (a.IsPrimaryId && !b.IsPrimaryId)
                    return -1;
                if (!a.IsPrimaryId && b.IsPrimaryId)
                    return 1;
                if (a.IsPrimaryName && !b.IsPrimaryName)
                    return -1;
                if (!a.IsPrimaryName && b.IsPrimaryName)
                    return 1;
                return a.LogicalName.localeCompare(b.LogicalName);
            });
            return Promise.resolve(attributes.map(attr => {
                const displayName = attr.DisplayName?.UserLocalizedLabel?.Label || '';
                const attrType = attr.AttributeType || attr.AttributeTypeName?.Value || 'Unknown';
                let icon = 'symbol-field';
                if (attr.IsPrimaryId)
                    icon = 'key';
                else if (attr.IsPrimaryName)
                    icon = 'symbol-text';
                else if (attrType === 'Lookup')
                    icon = 'link';
                else if (attrType === 'Picklist')
                    icon = 'list-unordered';
                return new SchemaItem(attr.LogicalName, vscode.TreeItemCollapsibleState.None, 'attribute', `${displayName} (${attrType})`, attrType, icon, entityName);
            }));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading attributes: ${error}`);
            return Promise.resolve([]);
        }
    }
    getRelationships(entityName) {
        if (!this.cacheData?.relationships) {
            return Promise.resolve([]);
        }
        try {
            // Find relationships involving this entity
            const rels = Object.values(this.cacheData.relationships).filter(rel => rel.ReferencedEntity === entityName || rel.ReferencingEntity === entityName);
            // Sort by schema name
            rels.sort((a, b) => a.SchemaName.localeCompare(b.SchemaName));
            return Promise.resolve(rels.map(rel => {
                const isReferencing = rel.ReferencingEntity === entityName;
                const otherEntity = isReferencing ? rel.ReferencedEntity : rel.ReferencingEntity;
                const direction = isReferencing ? '→' : '←';
                const description = `${direction} ${otherEntity}`;
                return new SchemaItem(rel.SchemaName, vscode.TreeItemCollapsibleState.None, 'relationship', description, rel.RelationshipType, 'link');
            }));
        }
        catch (error) {
            vscode.window.showErrorMessage(`Error loading relationships: ${error}`);
            return Promise.resolve([]);
        }
    }
    async connect() {
        // Get list of available clients from CLI config
        const clientsDir = path.join(os.homedir(), '.d365ai', 'clients');
        if (!fs.existsSync(clientsDir)) {
            vscode.window.showInformationMessage('No clients configured. Use CLI to set up: d365ai env connect');
            return;
        }
        const clients = fs.readdirSync(clientsDir)
            .filter(f => f.endsWith('.json') && !f.endsWith('.auth.json') && !f.endsWith('-cache.json'))
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
    async connectToClient(clientName) {
        const cacheFile = path.join(os.homedir(), '.d365ai', `${clientName}-cache.json`);
        if (!fs.existsSync(cacheFile)) {
            const action = await vscode.window.showWarningMessage(`No schema cache found for ${clientName}. Run 'd365ai schema pull' first.`, 'Pull Now', 'Cancel');
            if (action === 'Pull Now') {
                // Run CLI command to pull schema
                const terminal = vscode.window.createTerminal('D365 Schema Pull');
                terminal.sendText(`d365ai use ${clientName} && d365ai schema pull --full`);
                terminal.show();
            }
            return;
        }
        this.cacheFilePath = cacheFile;
        this.currentClient = clientName;
        this.loadCacheData();
        this.refresh();
        vscode.window.showInformationMessage(`Connected to ${clientName}`);
    }
    async disconnect() {
        this.cacheData = null;
        this.cacheFilePath = null;
        this.currentClient = null;
        this.refresh();
        vscode.window.showInformationMessage('Disconnected');
    }
    async search() {
        if (!this.currentClient || !this.cacheData) {
            vscode.window.showInformationMessage('Please connect to a Dataverse environment first');
            return;
        }
        const query = await vscode.window.showInputBox({
            placeHolder: 'Search entities and attributes...',
            prompt: 'Enter search term'
        });
        if (!query)
            return;
        const lowerQuery = query.toLowerCase();
        const items = [];
        // Search entities
        for (const entity of Object.values(this.cacheData.entities)) {
            const logicalName = entity.LogicalName.toLowerCase();
            const schemaName = entity.SchemaName.toLowerCase();
            const displayName = (entity.DisplayName?.UserLocalizedLabel?.Label || '').toLowerCase();
            if (logicalName.includes(lowerQuery) || schemaName.includes(lowerQuery) || displayName.includes(lowerQuery)) {
                const item = new SchemaItem(entity.LogicalName, vscode.TreeItemCollapsibleState.Collapsed, 'entity', entity.DisplayName?.UserLocalizedLabel?.Label || '', entity.IsCustomEntity ? 'Custom' : 'System', entity.IsCustomEntity ? 'package' : 'symbol-class');
                items.push({ item, type: 'entity', sortKey: `1_${entity.LogicalName}` });
            }
        }
        // Search attributes
        for (const [entityName, attributes] of Object.entries(this.cacheData.attributes)) {
            for (const attr of attributes) {
                const logicalName = attr.LogicalName.toLowerCase();
                const displayName = (attr.DisplayName?.UserLocalizedLabel?.Label || '').toLowerCase();
                if (logicalName.includes(lowerQuery) || displayName.includes(lowerQuery)) {
                    const attrType = attr.AttributeType || attr.AttributeTypeName?.Value || 'Unknown';
                    const item = new SchemaItem(attr.LogicalName, vscode.TreeItemCollapsibleState.None, 'attribute', `${entityName} (${attrType})`, attrType, 'symbol-field', entityName);
                    items.push({ item, type: 'attribute', sortKey: `2_${entityName}_${attr.LogicalName}` });
                }
            }
        }
        // Sort results
        items.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
        const quickPickItems = items.map(({ item, type }) => ({
            label: type === 'entity' ? `$(symbol-class) ${item.label}` : `$(symbol-field) ${item.label}`,
            description: item.description || '',
            detail: type === 'entity' ? 'Entity' : `Attribute in ${item.entityName}`,
            item: item
        }));
        const selected = await vscode.window.showQuickPick(quickPickItems, {
            placeHolder: `Found ${items.length} results`
        });
        if (selected) {
            const selectedItem = selected.item;
            if (selectedItem.contextValue === 'entity') {
                // Reveal entity in tree
                this._onDidChangeTreeData.fire();
                // Note: VS Code doesn't have a direct API to reveal an item,
                // but we can open the details panel
                vscode.commands.executeCommand('d365SchemaExplorer.viewEntityDetails', selectedItem);
            }
            else if (selectedItem.contextValue === 'attribute') {
                // Open attribute details
                vscode.commands.executeCommand('d365SchemaExplorer.viewAttributeDetails', selectedItem);
            }
        }
    }
    async exportEntity(item) {
        if (!item || item.contextValue !== 'entity')
            return;
        const entityName = item.label;
        const format = await vscode.window.showQuickPick(['JSON', 'Markdown'], {
            placeHolder: 'Select export format'
        });
        if (!format)
            return;
        const defaultPath = path.join(os.homedir(), `${entityName}.${format.toLowerCase()}`);
        const uri = await vscode.window.showSaveDialog({
            defaultUri: vscode.Uri.file(defaultPath),
            filters: format === 'JSON'
                ? { 'JSON': ['json'] }
                : { 'Markdown': ['md'] }
        });
        if (!uri)
            return;
        try {
            if (format === 'JSON') {
                const entity = this.cacheData?.entities?.[entityName];
                const attributes = this.cacheData?.attributes?.[entityName];
                const fullEntity = { ...entity, Attributes: attributes };
                fs.writeFileSync(uri.fsPath, JSON.stringify(fullEntity, null, 2));
            }
            else {
                // Generate Markdown
                const entity = this.cacheData?.entities?.[entityName];
                const attributes = this.cacheData?.attributes?.[entityName] || [];
                let md = `# ${entity?.DisplayName?.UserLocalizedLabel?.Label || entityName}\n\n`;
                md += `**Logical Name:** ${entity?.LogicalName}\n`;
                md += `**Schema Name:** ${entity?.SchemaName}\n`;
                if (entity?.PrimaryNameAttribute) {
                    md += `**Primary Name:** ${entity.PrimaryNameAttribute}\n`;
                }
                md += `\n## Attributes\n\n`;
                md += `| Name | Type | Display Name |\n`;
                md += `|------|------|-------------|\n`;
                for (const attr of attributes) {
                    const attrType = attr.AttributeType || attr.AttributeTypeName?.Value || '';
                    const attrDisplayName = attr.DisplayName?.UserLocalizedLabel?.Label || '';
                    md += `| ${attr.LogicalName} | ${attrType} | ${attrDisplayName} |\n`;
                }
                fs.writeFileSync(uri.fsPath, md);
            }
            vscode.window.showInformationMessage(`Exported ${entityName} to ${uri.fsPath}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Export failed: ${error}`);
        }
    }
    getCurrentClient() {
        return this.currentClient;
    }
    getCacheData() {
        return this.cacheData;
    }
}
exports.SchemaExplorerProvider = SchemaExplorerProvider;
class SchemaItem extends vscode.TreeItem {
    constructor(label, collapsibleState, contextValue, description, tooltip, iconName, entityName) {
        super(label, collapsibleState);
        this.label = label;
        this.collapsibleState = collapsibleState;
        this.contextValue = contextValue;
        this.description = description;
        this.tooltip = tooltip;
        this.iconName = iconName;
        this.entityName = entityName;
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
        }
        else if (contextValue === 'attribute') {
            this.command = {
                command: 'd365SchemaExplorer.viewAttributeDetails',
                title: 'View Details',
                arguments: [this]
            };
        }
        else if (contextValue === 'relationship') {
            this.command = {
                command: 'd365SchemaExplorer.viewRelationshipDetails',
                title: 'View Details',
                arguments: [this]
            };
        }
    }
}
exports.SchemaItem = SchemaItem;
//# sourceMappingURL=schemaExplorerProvider.js.map