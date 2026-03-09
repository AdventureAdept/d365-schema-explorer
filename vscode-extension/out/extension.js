"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const schemaExplorerProvider_1 = require("./schemaExplorerProvider");
const entityDetailsPanel_1 = require("./entityDetailsPanel");
function activate(context) {
    console.log('D365 Schema Explorer extension is now active');
    const schemaProvider = new schemaExplorerProvider_1.SchemaExplorerProvider(context);
    // Register the tree data provider
    vscode.window.registerTreeDataProvider('d365SchemaExplorer', schemaProvider);
    // Register commands
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.refresh', () => {
        schemaProvider.refresh();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.connect', async () => {
        await schemaProvider.connect();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.disconnect', async () => {
        await schemaProvider.disconnect();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.search', async () => {
        await schemaProvider.search();
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.exportEntity', (item) => {
        schemaProvider.exportEntity(item);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.viewEntityDetails', (item) => {
        entityDetailsPanel_1.EntityDetailsPanel.createOrShow(context.extensionUri, item, false, false);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.viewAttributeDetails', (item) => {
        entityDetailsPanel_1.EntityDetailsPanel.createOrShow(context.extensionUri, item, true, false);
    }));
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.viewRelationshipDetails', (item) => {
        entityDetailsPanel_1.EntityDetailsPanel.createOrShow(context.extensionUri, item, false, true);
    }));
    // Auto-connect if default client is configured
    const config = vscode.workspace.getConfiguration('d365SchemaExplorer');
    const defaultClient = config.get('defaultClient');
    if (defaultClient) {
        schemaProvider.connectToClient(defaultClient);
    }
}
exports.activate = activate;
function deactivate() {
    console.log('D365 Schema Explorer extension is now deactivated');
}
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map