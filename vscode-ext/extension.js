const vscode = require('vscode');
const path = require('path');
const fs = require('fs');

let lastReportMd = '';
let lastRisk = 'Low';
let statusBarItem;

function activate(context) {
    statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
    statusBarItem.text = '$(shield) Secure: N/A';
    statusBarItem.tooltip = 'No scan yet';
    statusBarItem.command = 'codebert-vuln-detector.showReport';
    statusBarItem.show();
    context.subscriptions.push(statusBarItem);

    context.subscriptions.push(vscode.commands.registerCommand('codebert-vuln-detector.showReport', () => {
        if (lastReportMd) {
            const output = vscode.window.createOutputChannel('Vulnerability Report');
            output.clear();
            output.appendLine(lastReportMd);
            output.show(true);
        } else {
            vscode.window.showInformationMessage('No report available yet.');
        }
    }));

    context.subscriptions.push(vscode.commands.registerCommand('codebert-vuln-detector.exportReport', async () => {
        if (!lastReportMd) {
            vscode.window.showWarningMessage('No report to export.');
            return;
        }
        const wsFolders = vscode.workspace.workspaceFolders;
        let defaultUri = wsFolders && wsFolders.length > 0 ? vscode.Uri.file(wsFolders[0].uri.fsPath) : undefined;
        const uri = await vscode.window.showSaveDialog({
            defaultUri: defaultUri ? vscode.Uri.joinPath(defaultUri, 'SECURITY_REPORT.md') : undefined,
            saveLabel: 'Export Vulnerability Report',
            filters: { 'Markdown': ['md'] }
        });
        if (uri) {
            fs.writeFileSync(uri.fsPath, lastReportMd, 'utf8');
            vscode.window.showInformationMessage('Vulnerability report exported to ' + uri.fsPath);
        }
    }));

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
                        statusBarItem.text = '$(shield) Secure: ';
                        statusBarItem.color = '#27ae60';
                        statusBarItem.tooltip = 'No vulnerabilities detected.';
                        lastRisk = 'Low';
                    } else {
                        // Build detailed vulnerability list
                        let vulnMsg = '$(alert) \x1b[33mVulnerabilities Found:\x1b[0m';
                        let vulnMd = '';
                        let highestRisk = 0;
                        let highestSeverity = 'Low';
                        data.vulnerabilities.forEach((v, i) => {
                            let sevIcon = '';
                            if (typeof v === 'string') {
                                vulnMsg += `\n${i+1}. ${v}`;
                                vulnMd += `- ${v}\n`;
                            } else {
                                if (v.severity === 'High') sevIcon = '';
                                else if (v.severity === 'Medium') sevIcon = '';
                                vulnMsg += `\n${i+1}. ${sevIcon} ${v.vulnerability}\n   Severity: ${v.severity}   Risk: ${v.risk}\n   Remediation: ${v.remediation}`;
                                vulnMd += `- **${sevIcon} ${v.vulnerability}**\n    - Severity: ${v.severity}\n    - Risk: ${v.risk}\n    - Remediation: ${v.remediation}\n`;
                                if (v.risk > highestRisk) highestRisk = v.risk;
                                if (v.severity === 'High') highestSeverity = 'High';
                                else if (v.severity === 'Medium' && highestSeverity !== 'High') highestSeverity = 'Medium';
                            }
                        });
                        // Add CodeBERT results if present
                        let codebertMsg = '';
                        let codebertMd = '';
                        if (data.codebert_results && data.codebert_results.length > 0) {
                            vulnMsg += '\n\n$(beaker) CodeBERT Analysis:';
                            codebertMd += '### CodeBERT Analysis\n';
                            data.codebert_results.forEach((r, i) => {
                                let sevIcon = '';
                                if (r.severity === 'High') sevIcon = '';
                                else if (r.severity === 'Medium') sevIcon = '';
                                vulnMsg += `\n${i+1}. ${sevIcon} Line: ${r.line}\n   Score: ${r.score.toFixed(2)}   Severity: ${r.severity}   Risk: ${r.risk}\n   ${r.message}\n   Remediation: ${r.remediation}`;
                                codebertMd += `- **${sevIcon} Line:** ${r.line}\n    - Score: ${r.score.toFixed(2)}\n    - Severity: ${r.severity}\n    - Risk: ${r.risk}\n    - ${r.message}\n    - Remediation: ${r.remediation}\n`;
                                if (r.risk > highestRisk) highestRisk = r.risk;
                                if (r.severity === 'High') highestSeverity = 'High';
                                else if (r.severity === 'Medium' && highestSeverity !== 'High') highestSeverity = 'Medium';
                            });
                        }
                        // Add overall risk/assurance summary
                        let riskIcon = '';
                        let riskColor = '#27ae60';
                        if (highestSeverity === 'High') { riskIcon = ''; riskColor = '#e74c3c'; }
                        else if (highestSeverity === 'Medium') { riskIcon = ''; riskColor = '#f1c40f'; }
                        vulnMsg += `\n\n${riskIcon} Overall Security Risk: ${highestSeverity} (Score: ${highestRisk}/10)`;
                        let aiReport = data.ai_report || data.gemini_report || '';
                        if (aiReport) {
                            vulnMsg += `\n\n$(comment) AI Security Analysis:\n${aiReport}`;
                        }
                        // Markdown for output channel
                        let riskMd = `**${riskIcon} Overall Security Risk:** <span style='color:${riskColor}'>${highestSeverity}</span> (${highestRisk}/10)`;
                        let timeMd = `**Scan Timestamp:** ${new Date().toLocaleString()}`;
                        let targetMd = `**Scan Target:** ${data.url}`;
                        let reportMd = `${targetMd}\n\n## Vulnerabilities Found\n${vulnMd}\n${codebertMd}\n## AI Security Analysis\n${aiReport}\n---\n${riskMd}\n${timeMd}`;
                        // Show in Output Channel
                        lastReportMd = reportMd;
                        lastRisk = highestSeverity;
                        statusBarItem.text = `$(shield) Secure: ${riskIcon} ${highestSeverity}`;
                        statusBarItem.color = riskColor;
                        statusBarItem.tooltip = `Last scan risk: ${highestSeverity}`;
                        const output = vscode.window.createOutputChannel('Vulnerability Report');
                        output.clear();
                        output.appendLine(reportMd);
                        output.show(true);
                        // Show quick pick for fix if available
                        if (data.fix) {
                            vulnMsg += '\n\nSuggested Fix:\n' + data.fix;
                            vscode.window.showWarningMessage(vulnMsg, 'Apply Fix', 'Dismiss').then(async (choice) => {
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
                            vscode.window.showWarningMessage(vulnMsg);
                        }
                    }
                } else {
                    vscode.window.showErrorMessage('Unexpected response from server.');
                }
            } catch (err) {
                vscode.window.showErrorMessage('Error: ' + err.message);
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
