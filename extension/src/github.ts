import * as vscode from 'vscode';
import axios from 'axios';

export class GitHubIntegration {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    private async handleGitHubError(error: any, context: string) {
        if (error.response) {
            console.error(`GitHub API Error (${context}):`, error.response.data);
            vscode.window.showErrorMessage(`GitHub API Error: ${error.response.data.message}`);
        } else {
            console.error(`Error (${context}):`, error);
            vscode.window.showErrorMessage(`Error: ${error.message}`);
        }
    }

    public async setupGitHubActions() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const workflowPath = vscode.Uri.joinPath(workspaceFolders[0].uri, '.github', 'workflows', 'security-check.yml');
        
        try {
            await vscode.workspace.fs.writeFile(workflowPath, Buffer.from(securityCheckYml));
            vscode.window.showInformationMessage('GitHub Actions workflow created successfully');
        } catch (error) {
            await this.handleGitHubError(error, 'setupGitHubActions');
        }
    }

    private isValidGitHubUrl(url: string): boolean {
        try {
            const parsedUrl = new URL(url);
            return parsedUrl.hostname === 'github.com' && 
                   parsedUrl.pathname.split('/').length >= 3;
        } catch {
            return false;
        }
    }

    public async createPullRequest() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const repoUrl = await vscode.window.showInputBox({
            prompt: 'Enter GitHub repository URL',
            placeHolder: 'https://github.com/user/repo',
            validateInput: (value) => this.isValidGitHubUrl(value) ? null : 'Invalid GitHub URL'
        });

        if (!repoUrl) {
            return;
        }

        try {
            const branchName = `feature/${Date.now()}`;
            const prTitle = await vscode.window.showInputBox({
                prompt: 'Enter Pull Request title',
                placeHolder: 'New feature implementation'
            });

            if (!prTitle) {
                return;
            }

            // Create PR using GitHub API
            try {
                // Create PR
                const response = await axios.post(`${repoUrl}/pulls`, {
                    title: prTitle,
                    head: branchName,
                    base: 'main'
                });
    
                // Run security check
                const securityResult = await this.runSecurityCheck(repoUrl, branchName);
                vscode.window.showInformationMessage(`Pull Request created: ${response.data.html_url}\nSecurity Score: ${securityResult.score}%`);
            } catch (error) {
                await this.handleGitHubError(error, 'createPullRequest');
            }
        }

        private async runSecurityCheck(repoUrl: string, branchName: string) {
            try {
                const response = await axios.post('http://localhost:8000/analyze', {
                    repo: repoUrl,
                    branch: branchName
                });
                return response.data;
            } catch (error) {
                throw new Error(`Security check failed: ${error.message}`);
            }
        }
    }

    public async checkPRStatus() {
        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            vscode.window.showErrorMessage('No workspace folder open');
            return;
        }

        const prUrl = await vscode.window.showInputBox({
            prompt: 'Enter Pull Request URL',
            placeHolder: 'https://github.com/user/repo/pull/1'
        });

        if (!prUrl) {
            return;
        }

        try {
            const response = await axios.get(prUrl);
            const status = response.data.state;
            const checks = response.data.statuses;

            vscode.window.showInformationMessage(`PR Status: ${status}\nChecks: ${checks.length}`);
        } catch (error) {
            await this.handleGitHubError(error, 'checkPRStatus');
        }
    }
}