import * as vscode from 'vscode';
import * as cp from 'child_process';
import * as path from 'path';
import { SchemaExplorerProvider } from './schemaExplorerProvider';
import { EntityDetailsPanel } from './entityDetailsPanel';
import { DependencyGraphPanel } from './dependencyGraphPanel';

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

    context.subscriptions.push(
        vscode.commands.registerCommand('d365SchemaExplorer.showDependencyGraph', async (item) => {
            let entityName: string | undefined;

            if (item && item.label) {
                entityName = item.label as string;
            } else {
                entityName = await vscode.window.showInputBox({
                    prompt: 'Enter entity logical name',
                    placeHolder: 'e.g. opportunity'
                });
            }

            if (!entityName) return;

            // Find CLI path from config or fallback to common locations
            const config = vscode.workspace.getConfiguration('d365SchemaExplorer');
            const configuredPath = config.get<string>('cliPath');
            const cliPath = configuredPath || path.join(require('os').homedir(), 'Downloads', 'd365-schema-explorer', 'dist', 'cli.js');
            const client = schemaProvider.getCurrentClient() || 'test';

            vscode.window.withProgress({
                location: vscode.ProgressLocation.Notification,
                title: `Analyzing ${entityName}...`,
                cancellable: false
            }, () => new Promise<void>((resolve) => {
                // Run both commands in parallel: JSON report + mermaid graph
                let reportData: any = null;
                let mermaidGraph = '';
                let pending = 2;

                const done = () => {
                    if (--pending > 0) return;
                    resolve();
                    if (!reportData) {
                        vscode.window.showErrorMessage(`Failed to analyze ${entityName}`);
                        return;
                    }
                    DependencyGraphPanel.createOrShow(context.extensionUri, {
                        ...reportData,
                        mermaidGraph
                    });
                };

                cp.exec(
                    `node "${cliPath}" impact report ${entityName} --format json`,
                    { maxBuffer: 1024 * 1024 * 10 },
                    (error, stdout) => {
                        if (!error) {
                            try { reportData = JSON.parse(stdout.trim()); } catch {}
                        }
                        done();
                    }
                );

                cp.exec(
                    `node "${cliPath}" impact graph ${entityName} --format mermaid`,
                    { maxBuffer: 1024 * 1024 * 10 },
                    (error, stdout) => {
                        if (!error) {
                            const match = stdout.match(/```mermaid\n([\s\S]+?)```/);
                            mermaidGraph = match ? match[1].trim() : '';
                        }
                        done();
                    }
                );
            }));
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