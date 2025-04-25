import * as vscode from 'vscode';
import axios from 'axios';

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand('prism.scanCode', async () => {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showErrorMessage('No code file open!');
      return;
    }

    const code = editor.document.getText();

    const loading = vscode.window.setStatusBarMessage('🔍 Analyzing with PRism AI...');

    try {
      const res = await axios.post('http://127.0.0.1:8000/analyze', { code });
      const { vulnerability_score, suggestions } = res.data;

      vscode.window.showInformationMessage(`🔐 PRism Risk Score: ${vulnerability_score}%`);

      const panel = vscode.window.createWebviewPanel(
        'prismSuggestions',
        'PRism Suggestions',
        vscode.ViewColumn.Beside,
        {}
      );

      panel.webview.html = getWebviewContent(vulnerability_score, suggestions);
    } catch (error) {
      vscode.window.showErrorMessage('❌ Failed to connect to PRism backend');
    } finally {
      loading.dispose();
    }
  });

  context.subscriptions.push(disposable);
}

function getWebviewContent(score: number, suggestions: string[]): string {
  return `
    <html>
      <body style="font-family: sans-serif; padding: 1rem;">
        <h2>🔐 PRism Vulnerability Score: ${score}%</h2>
        <h3>🛠️ Suggestions:</h3>
        <ul>
          ${suggestions.map(s => `<li>${s}</li>`).join('')}
        </ul>
      </body>
    </html>
  `;
}

export function deactivate() {}
