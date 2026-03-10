import * as vscode from 'vscode';

interface DependencyGraphData {
  mermaidGraph: string;
  title: string;
  entities: string[];
}

export class DependencyGraphPanel {
  public static currentPanel: DependencyGraphPanel | undefined;
  public static readonly viewType = 'dependencyGraph';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, graphData: DependencyGraphData) {
    const column = vscode.window.activeTextEditor
      ? vscode.window.activeTextEditor.viewColumn
      : undefined;

    const panel = vscode.window.createWebviewPanel(
      DependencyGraphPanel.viewType,
      graphData.title,
      column || vscode.ViewColumn.One,
      {
        enableScripts: true,
        localResourceRoots: [vscode.Uri.joinPath(extensionUri, 'media')],
      }
    );

    DependencyGraphPanel.currentPanel = new DependencyGraphPanel(panel, extensionUri);
    DependencyGraphPanel.currentPanel.update(graphData);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;

    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

    this._panel.webview.onDidReceiveMessage(
      message => {
        switch (message.command) {
          case 'export':
            this.exportGraph(message.format);
            break;
        }
      },
      null,
      this._disposables
    );
  }

  public update(graphData: DependencyGraphData) {
    this._panel.title = graphData.title;
    this._panel.webview.html = this._getHtmlForWebview(graphData);
  }

  private _getHtmlForWebview(graphData: DependencyGraphData) {
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${this._panel.webview.cspSource} 'unsafe-inline'; script-src https://cdn.jsdelivr.net; img-src ${this._panel.webview.cspSource} https:;">
  <title>${graphData.title}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      padding: 20px;
      background-color: var(--vscode-editor-background);
      color: var(--vscode-foreground);
    }
    h1 {
      color: var(--vscode-textLink-foreground);
      border-bottom: 1px solid var(--vscode-panel-border);
      padding-bottom: 10px;
    }
    .mermaid {
      background: var(--vscode-editor-background);
      padding: 20px;
      border-radius: 5px;
      overflow: auto;
    }
    .toolbar {
      margin-bottom: 20px;
    }
    button {
      background-color: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
      border: none;
      padding: 8px 16px;
      margin-right: 10px;
      cursor: pointer;
      border-radius: 3px;
    }
    button:hover {
      background-color: var(--vscode-button-hoverBackground);
    }
  </style>
</head>
<body>
  <h1>${graphData.title}</h1>
  <div class="toolbar">
    <button id="export-png">Export PNG</button>
    <button id="export-svg">Export SVG</button>
    <button id="export-mermaid">Export Mermaid</button>
  </div>
  <div class="mermaid">
${graphData.mermaidGraph}
  </div>
  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ 
      startOnLoad: true,
      theme: 'default',
      securityLevel: 'loose'
    });

    document.getElementById('export-png').addEventListener('click', () => {
      vscode.postMessage({ command: 'export', format: 'png' });
    });

    document.getElementById('export-svg').addEventListener('click', () => {
      vscode.postMessage({ command: 'export', format: 'svg' });
    });

    document.getElementById('export-mermaid').addEventListener('click', () => {
      vscode.postMessage({ command: 'export', format: 'mermaid' });
    });
  </script>
</body>
</html>`;
  }

  private exportGraph(format: string) {
    vscode.window.showInformationMessage(`Exporting graph as ${format}... (implementation pending)`);
  }

  public dispose() {
    DependencyGraphPanel.currentPanel = undefined;

    this._panel.dispose();

    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) {
        x.dispose();
      }
    }
  }
}
