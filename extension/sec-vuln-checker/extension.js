const vscode = require('vscode');
const axios = require('axios');

function activate(context) {
    let disposable = vscode.commands.registerCommand('extension.checkVulnerabilities', async function () {
        const editor = vscode.window.activeTextEditor;
        if (!editor) {
            vscode.window.showErrorMessage("No active text editor found.");
            return;
        }

        const code = editor.document.getText();

        try {
            const response = await axios.post('http://localhost:8000/analyze', { code });
            const result = response.data;

            vscode.window.showInformationMessage(`🛡️ Vulnerability Check: ${result.message || 'No message returned.'}`);
            if (result.metrics) {
                vscode.window.showInformationMessage(`Risk Score: ${result.metrics.riskScore || 'N/A'}%`);
            }
        } catch (error) {
            vscode.window.showErrorMessage("Failed to check vulnerabilities: " + error.message);
        }
    });

    context.subscriptions.push(disposable);
}

function deactivate() {}

module.exports = {
    activate,
    deactivate
};
