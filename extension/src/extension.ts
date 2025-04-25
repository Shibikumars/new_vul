import * as vscode from 'vscode';
import axios from 'axios';

// Your backend endpoint (replace with actual backend URL)
const BACKEND_URL = 'http://localhost:8000/review-code';  // Change this to the actual URL of your FastAPI

async function analyzeCode(code: string) {
    try {
        const response = await axios.post(BACKEND_URL, { code });
        return response.data;
    } catch (error) {
        vscode.window.showErrorMessage("Error connecting to backend: " + error.message);
    }
}

// Command to review code from an active editor
async function reviewCodeCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
        vscode.window.showInformationMessage('No active editor');
        return;
    }

    const code = editor.document.getText();
    const reviewResult = await analyzeCode(code);

    if (reviewResult) {
        const score = reviewResult.perplexityScore;
        const issues = reviewResult.issues;
        vscode.window.showInformationMessage(`Vulnerability Score: ${score}%`);

        // Display issues and fixes
        if (issues.length > 0) {
            issues.forEach(issue => {
                vscode.window.showWarningMessage(`Vulnerability Found: ${issue.description}`);
            });
        } else {
            vscode.window.showInformationMessage('No vulnerabilities detected!');
        }
    }
}

// Register command in the extension
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('extension.reviewCode', reviewCodeCommand);
    context.subscriptions.push(disposable);
}

export function deactivate() {}
