import * as vscode from 'vscode';

interface ComponentItem {
  name: string;
  description?: string;
  riskLevel?: string;
}

interface ImpactReportData {
  target: { type: string; name: string; entityName?: string };
  summary: {
    totalDependencies: number;
    highRiskCount: number;
    mediumRiskCount: number;
    lowRiskCount: number;
  };
  components: {
    plugins: ComponentItem[];
    workflows: ComponentItem[];
    forms: ComponentItem[];
    views: ComponentItem[];
    reports: ComponentItem[];
  };
  recommendations: string[];
  mermaidGraph: string;
}

export class DependencyGraphPanel {
  public static currentPanel: DependencyGraphPanel | undefined;
  public static readonly viewType = 'dependencyGraph';

  private readonly _panel: vscode.WebviewPanel;
  private readonly _extensionUri: vscode.Uri;
  private _disposables: vscode.Disposable[] = [];

  public static createOrShow(extensionUri: vscode.Uri, data: ImpactReportData) {
    const panel = vscode.window.createWebviewPanel(
      DependencyGraphPanel.viewType,
      `Impact: ${data.target.name}`,
      vscode.ViewColumn.One,
      { enableScripts: true }
    );

    DependencyGraphPanel.currentPanel = new DependencyGraphPanel(panel, extensionUri);
    DependencyGraphPanel.currentPanel.update(data);
  }

  private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
    this._panel = panel;
    this._extensionUri = extensionUri;
    this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
  }

  public update(data: ImpactReportData) {
    this._panel.title = `Impact: ${data.target.name}`;
    this._panel.webview.html = this._getHtml(data);
  }

  private _section(icon: string, title: string, items: ComponentItem[], color: string): string {
    if (items.length === 0) return '';
    const rows = items.map(item => {
      const risk = item.riskLevel === 'high' ? '🔴' : item.riskLevel === 'medium' ? '🟡' : '🟢';
      const desc = item.description ? `<div class="desc">${item.description}</div>` : '';
      return `<div class="item">${risk} <strong>${item.name || '(unnamed)'}</strong>${desc}</div>`;
    }).join('');

    return `
    <div class="section">
      <div class="section-header" onclick="toggle(this)" style="border-left: 4px solid ${color}">
        <span>${icon} ${title}</span>
        <span class="badge">${items.length}</span>
        <span class="chevron">▼</span>
      </div>
      <div class="section-body">${rows}</div>
    </div>`;
  }

  private _getHtml(data: ImpactReportData): string {
    const plugins   = this._section('🔌', 'Plugins',   data.components.plugins,   '#f4d03f');
    const workflows = this._section('⚡', 'Workflows', data.components.workflows, '#9b59b6');
    const forms     = this._section('📄', 'Forms',     data.components.forms,     '#2ecc71');
    const views     = this._section('👁', 'Views',     data.components.views,     '#34495e');
    const reports   = this._section('📊', 'Reports',   data.components.reports,   '#e67e22');

    const recs = data.recommendations.map(r => `<li>${r}</li>`).join('');
    const mermaid = data.mermaidGraph;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; script-src https://cdn.jsdelivr.net 'unsafe-inline' 'unsafe-eval'; img-src * data: blob:; font-src https://cdn.jsdelivr.net data:;">
  <style>
    body { font-family: var(--vscode-font-family); padding: 16px; background: var(--vscode-editor-background); color: var(--vscode-foreground); }
    h1 { margin: 0 0 4px; font-size: 1.3em; }
    .meta { color: var(--vscode-descriptionForeground); margin-bottom: 16px; font-size: 0.9em; }
    .summary { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
    .stat { padding: 10px 16px; border-radius: 6px; font-size: 0.9em; }
    .stat.total  { background: #2c3e50; color: #fff; }
    .stat.high   { background: #e74c3c; color: #fff; }
    .stat.medium { background: #f39c12; color: #fff; }
    .stat.low    { background: #27ae60; color: #fff; }
    .graph-box { background: var(--vscode-input-background); border-radius: 6px; padding: 16px; margin-bottom: 20px; overflow: auto; min-height: 120px; }
    .section { margin-bottom: 10px; border-radius: 6px; overflow: hidden; border: 1px solid var(--vscode-panel-border); }
    .section-header { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; cursor: pointer; background: var(--vscode-sideBar-background); font-weight: bold; user-select: none; }
    .section-header:hover { background: var(--vscode-list-hoverBackground); }
    .badge { background: var(--vscode-badge-background); color: var(--vscode-badge-foreground); border-radius: 10px; padding: 2px 8px; font-size: 0.8em; }
    .chevron { transition: transform 0.2s; }
    .section-body { padding: 8px 14px; display: none; }
    .section-body.open { display: block; }
    .item { padding: 6px 0; border-bottom: 1px solid var(--vscode-panel-border); font-size: 0.9em; }
    .item:last-child { border-bottom: none; }
    .desc { color: var(--vscode-descriptionForeground); font-size: 0.85em; margin-top: 2px; }
    .recs { margin-top: 20px; }
    .recs ul { padding-left: 20px; line-height: 1.8; }
    h2 { font-size: 1em; margin: 0 0 10px; color: var(--vscode-textLink-foreground); }
  </style>
</head>
<body>
  <h1>Impact Analysis: <strong>${data.target.name}</strong></h1>
  <div class="meta">${data.target.type}${data.target.entityName ? ' · ' + data.target.entityName : ''}</div>

  <div class="summary">
    <div class="stat total">📦 ${data.summary.totalDependencies} total</div>
    <div class="stat high">🔴 ${data.summary.highRiskCount} high risk</div>
    <div class="stat medium">🟡 ${data.summary.mediumRiskCount} medium</div>
    <div class="stat low">🟢 ${data.summary.lowRiskCount} low</div>
  </div>

  <h2>Dependency Graph</h2>
  <div class="graph-box">
    <div class="mermaid">${mermaid}</div>
  </div>

  <h2>Components — click to expand</h2>
  ${plugins}${workflows}${forms}${views}${reports}

  <div class="recs">
    <h2>Recommendations</h2>
    <ul>${recs}</ul>
  </div>

  <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
  <script>
    mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });

    function toggle(header) {
      const body = header.nextElementSibling;
      const chevron = header.querySelector('.chevron');
      body.classList.toggle('open');
      chevron.style.transform = body.classList.contains('open') ? 'rotate(180deg)' : '';
    }
  </script>
</body>
</html>`;
  }

  public dispose() {
    DependencyGraphPanel.currentPanel = undefined;
    this._panel.dispose();
    while (this._disposables.length) {
      const x = this._disposables.pop();
      if (x) x.dispose();
    }
  }
}
