import * as vscode from 'vscode';
import { SchemaExplorerProvider } from './schemaExplorerProvider';
import { EntityDetailsPanel } from './entityDetailsPanel';

export function activate(context: vscode.ExtensionContext) {
    console.log('D365 Schema Explorer extension is now active');

    const schemaProvider = new SchemaExplorerProvider(context);

    // Register the tree data provider
    vscode.window.registerTreeDataProvider('d365SchemaExplorer', schemaProvider);

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.refresh', () => {
            schemaProvider.refresh();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.connect', async () => {
            await schemaProvider.connect();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.disconnect', async () => {
            await schemaProvider.disconnect();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.search', async () => {
            await schemaProvider.search();
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.exportEntity', (item) => {
            schemaProvider.exportEntity(item);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.viewEntityDetails', (item) => {
            EntityDetailsPanel.createOrShow(context.extensionUri, item, false, false);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.viewAttributeDetails', (item) => {
            EntityDetailsPanel.createOrShow(context.extensionUri, item, true, false);
        })
    );

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.viewRelationshipDetails', (item) => {
            EntityDetailsPanel.createOrShow(context.extensionUri, item, false, true);
        })
    );

    // Auto-connect if default client is configured
    const config = vscode.workspace.getConfiguration('d365SchemaExplorer');
    const defaultClient = config.get<string>('defaultClient');
    if (defaultClient) {
        schemaProvider.connectToClient(defaultClient);
    }
}

export function deactivate() {
    console.log('D365 Schema Explorer extension is now deactivated');
}