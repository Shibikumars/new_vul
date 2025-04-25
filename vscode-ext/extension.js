const vscode = require('vscode');

function activate(context) {
    let disposable = vscode.commands.registerCommand('codebert-vuln-detector.checkVulnerabilities', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage('No active editor');
            return;
        }
        const selection = editor.selection;
        const code = selection.isEmpty ? editor.document.getText() : editor.document.getText(selection);

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: 'Checking for vulnerabilities...'
        }, async () => {
            try {
                const res = await fetch('http://localhost:5000/predict', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ code })
                });
                if (!res.ok) {
                    vscode.window.showErrorMessage('Server error: ' + res.status);
                    return;
                }
                const data = await res.json();
                if (data && data.vulnerabilities) {
                    if (data.vulnerabilities.length === 0) {
                        vscode.window.showInformationMessage('No vulnerabilities detected.');
                    } else {
                        let msg = 'Vulnerabilities Found:\n' + data.vulnerabilities.map(v => '• ' + v).join('\n');
                        if (data.fix) {
                            msg += '\n\nSuggested Fix:\n' + data.fix;
                            vscode.window.showWarningMessage(msg, 'Apply Fix', 'Dismiss').then(async (choice) => {
                                if (choice === 'Apply Fix') {
                                    await editor.edit(editBuilder => {
                                        if (selection.isEmpty) {
                                            // Replace whole document
                                            const lastLine = editor.document.lineCount - 1;
                                            const lastChar = editor.document.lineAt(lastLine).text.length;
                                            editBuilder.replace(new vscode.Range(0, 0, lastLine, lastChar), data.fix);
                                        } else {
                                            // Replace selection
                                            editBuilder.replace(selection, data.fix);
                                        }
                                    });
                                    vscode.window.showInformationMessage('Fix applied!');
                                }
                            });
                        } else {
                            vscode.window.showWarningMessage(msg);
                        }
                    }
                } else {
                    vscode.window.showErrorMessage('Unexpected response from server.');
                }
            } catch (err) {
                vscode.window.showErrorMessage('Error connecting to backend: ' + err);
            }
        });
    });
    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
