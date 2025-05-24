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
                    vscode.Uri.joinPath(extensionUri, 'src', 'webview'),
                    vscode.Uri.joinPath(extensionUri, 'out', 'webview'),
                    vscode.Uri.joinPath(extensionUri, 'node_modules')
                ]
            }
        );

        WebviewPanel.currentPanel = new WebviewPanel(panel, extensionUri);
    }

    public dispose() {
        WebviewPanel.currentPanel = undefined;
        this._panel.dispose();
        while (this._disposables.length) {
            const x = this._disposables.pop();
            if (x) {
                x.dispose();
            }
        }
    }

    private _getWebviewContent(webview: vscode.Webview, extensionUri: vscode.Uri): string {
        try {
            const distPath = vscode.Uri.joinPath(extensionUri, 'dist');
            const htmlPath = vscode.Uri.joinPath(distPath, 'index.html');

            if (!fs.existsSync(htmlPath.fsPath)) {
                throw new Error(`Webview HTML file not found at ${htmlPath.fsPath}`);
            }

            let htmlContent = fs.readFileSync(htmlPath.fsPath, 'utf8');

            // Convert all static resource paths to proper webview URIs
            htmlContent = htmlContent.replace(
                /(src|href)="([^"]+)"/g,
                (_, attr, srcPath) => {
                    try {
                        const resourcePath = vscode.Uri.joinPath(distPath, srcPath);
                        const webviewUri = webview.asWebviewUri(resourcePath);
                        return `${attr}="${webviewUri}"`;
                    } catch (error) {
                        console.error(`Failed to convert ${srcPath}`, error);
                        return `${attr}="${srcPath}"`; // fallback
                    }
                }
            );

            return htmlContent;
        } catch (err) {
            console.error('Error loading webview content:', err);
            return `<html><body><h1>Failed to load CodeGenie</h1><pre>${err}</pre></body></html>`;
        }
    }
    catch (error:Error) {
                console.error('Failed to load webview content:', error);
                return `
                    <!DOCTYPE html>
                    <html>
                    <head>
                        <meta charset="UTF-8">
                        <title>CodeGenie Error</title>
                    </head>
                    <body>
                        <div style="color: red; padding: 20px;">
                            Failed to load CodeGenie webview. Please try reloading the window.
                            <br>
                            Error: ${error instanceof Error ? error.message : String(error)}
                        </div>
                    </body>
                    </html>
                `;
            }
}
    