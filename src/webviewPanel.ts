import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';

export class WebviewPanel {
    public static currentPanel: WebviewPanel | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
        this._panel.webview.html = this._getWebviewContent(this._panel.webview, extensionUri);
        
        // Handle messages from the webview
        this._panel.webview.onDidReceiveMessage(
            async message => {
                switch (message.type) {
                    case 'prompt':
                        // Handle prompt submission
                        vscode.window.showInformationMessage(`Received prompt: ${message.value}`);
                        // Add to history
                        this._panel.webview.postMessage({
                            type: 'addHistory',
                            value: {
                                prompt: message.value,
                                response: 'AI response would go here...'
                            }
                        });
                        break;
                    case 'upload':
                        // Handle file upload
                        const result = await vscode.window.showOpenDialog({
                            canSelectFiles: true,
                            canSelectFolders: false,
                            canSelectMany: false
                        });
                        if (result && result[0]) {
                            vscode.window.showInformationMessage(`Selected file: ${result[0].fsPath}`);
                        }
                        break;
                    case 'codeAction':
                        // Handle code actions (debug/optimize)
                        vscode.window.showInformationMessage(`${message.action} action on code: ${message.code}`);
                        break;
                }
            },
            null,
            this._disposables
        );

        // Listen for text selection changes
        vscode.window.onDidChangeTextEditorSelection(e => {
            const selectedText = e.textEditor.document.getText(e.selections[0]);
            if (selectedText) {
                this._panel.webview.postMessage({
                    type: 'selectedCode',
                    value: selectedText
                });
            }
        }, null, this._disposables);
    }

    public static createOrShow(extensionUri: vscode.Uri) {
        const column = vscode.window.activeTextEditor
            ? vscode.window.activeTextEditor.viewColumn
            : undefined;

        if (WebviewPanel.currentPanel) {
            WebviewPanel.currentPanel._panel.reveal(column);
            return;
        }

        const panel = vscode.window.createWebviewPanel(
            'codeGenie',
            'CodeGenie',
            column || vscode.ViewColumn.One,
            {
                enableScripts: true,
                localResourceRoots: [
                    vscode.Uri.joinPath(extensionUri, 'src', 'webview')
                ]
            }
        );

        WebviewPanel.currentPanel = new WebviewPanel(panel, extensionUri);
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        const webviewUri = vscode.Uri.joinPath(extensionUri, 'src', 'webview');
        const htmlPath = vscode.Uri.joinPath(webviewUri, 'index.html');
        const htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

        // Convert all resource paths to webview URIs
        return htmlContent.replace(
            /(src|href)="([^"]*)"/g,
            (match, attr, value) => {
                const uri = vscode.Uri.joinPath(webviewUri, value);
                return `${attr}="${webview.asWebviewUri(uri)}"`;
            }
        );
    }

    public dispose() {
        WebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
