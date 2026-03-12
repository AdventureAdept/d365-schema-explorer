"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = require("vscode");
const cp = require("child_process");
const path = require("path");
const schemaExplorerProvider_1 = require("./schemaExplorerProvider");
const entityDetailsPanel_1 = require("./entityDetailsPanel");
const dependencyGraphPanel_1 = require("./dependencyGraphPanel");
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
    context.subscriptions.push(vscode.commands.registerCommand('d365SchemaExplorer.showDependencyGraph', async (item) => {
        let entityName;
        if (item && item.label) {
            entityName = item.label;
        }
        else {
            entityName = await vscode.window.showInputBox({
                prompt: 'Enter entity logical name',
                placeHolder: 'e.g. opportunity'
            });
        }
        if (!entityName)
            return;
        // Find CLI path from config or fallback to common locations
        const config = vscode.workspace.getConfiguration('d365SchemaExplorer');
        const configuredPath = config.get('cliPath');
        const cliPath = configuredPath || path.join(require('os').homedir(), 'Downloads', 'd365-schema-explorer', 'dist', 'cli.js');
        const client = schemaProvider.getCurrentClient() || 'test';
        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Analyzing ${entityName}...`,
            cancellable: false
        }, () => new Promise((resolve) => {
            // Run both commands in parallel: JSON report + mermaid graph
            let reportData = null;
            let mermaidGraph = '';
            let pending = 2;
            const done = () => {
                if (--pending > 0)
                    return;
                resolve();
                if (!reportData) {
                    vscode.window.showErrorMessage(`Failed to analyze ${entityName}`);
                    return;
                }
                dependencyGraphPanel_1.DependencyGraphPanel.createOrShow(context.extensionUri, {
                    ...reportData,
                    mermaidGraph
                });
            };
            cp.exec(`node "${cliPath}" impact report ${entityName} --format json`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
                if (!error) {
                    try {
                        reportData = JSON.parse(stdout.trim());
                    }
                    catch { }
                }
                done();
            });
            cp.exec(`node "${cliPath}" impact graph ${entityName} --format mermaid`, { maxBuffer: 1024 * 1024 * 10 }, (error, stdout) => {
                if (!error) {
                    const match = stdout.match(/```mermaid\n([\s\S]+?)```/);
                    mermaidGraph = match ? match[1].trim() : '';
                }
                done();
            });
        }));
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