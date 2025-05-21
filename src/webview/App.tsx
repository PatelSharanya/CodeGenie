import React, { useState, useEffect } from 'react';
import './styles.css';

// Declare the vscode API type
declare const acquireVsCodeApi: () => {
    postMessage: (message: any) => void;
    getState: () => any;
    setState: (state: any) => void;
};

// Get vscode API
const vscode = acquireVsCodeApi();

// Types
interface HistoryItem {
    prompt: string;
    response: string;
}

interface VSCodeMessage {
    type: 'selectedCode' | 'addHistory' | 'clearHistory';
    value?: string | HistoryItem;
}

interface CodeAction {
    type: 'codeAction';
    action: 'debug' | 'optimize';
    code: string;
}

interface PromptMessage {
    type: 'prompt';
    value: string;
}

interface UploadMessage {
    type: 'upload';
}

type OutgoingMessage = CodeAction | PromptMessage | UploadMessage;

function App(): JSX.Element {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [prompt, setPrompt] = useState<string>('');
    const [selectedCode, setSelectedCode] = useState<string | null>(null);

    useEffect(() => {
        // Listen for messages from the extension
        const messageHandler = (event: MessageEvent<VSCodeMessage>) => {
            const message = event.data;
            switch (message.type) {
                case 'selectedCode':
                    setSelectedCode(message.value as string);
                    break;
                case 'addHistory':
                    setHistory(prev => [...prev, message.value as HistoryItem]);
                    break;
                case 'clearHistory':
                    setHistory([]);
                    break;
            }
        };

        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);

    const handleSubmit = (): void => {
        if (!prompt.trim()) return;

        // Send prompt to extension
        vscode.postMessage({
            type: 'prompt',
            value: prompt
        } as PromptMessage);

        setPrompt('');
    };

    const handleUpload = (): void => {
        vscode.postMessage({
            type: 'upload'
        } as UploadMessage);
    };

    const handleCodeAction = (action: 'debug' | 'optimize'): void => {
        if (!selectedCode) return;
        
        vscode.postMessage({
            type: 'codeAction',
            action,
            code: selectedCode
        } as CodeAction);
    };

    return (
        <div className="webview-container">
            {selectedCode && (
                <div className="code-lens">
                    <button onClick={() => handleCodeAction('debug')}>
                        🔍 Debug (Shift+Alt+8)
                    </button>
                    <button onClick={() => handleCodeAction('optimize')}>
                        ⚡ Optimize (Ctrl+O)
                    </button>
                </div>
            )}

            <div className="history-panel">
                {history.map((item, index) => (
                    <div key={index} className="prompt-item">
                        <div className="user-prompt">{item.prompt}</div>
                        <div className="ai-response">{item.response}</div>
                    </div>
                ))}
            </div>

            <div className="input-container">
                <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Enter your prompt here..."
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                            e.preventDefault();
                            handleSubmit();
                        }
                    }}
                />
                <button onClick={handleSubmit}>Send</button>
                <button className="upload-button" onClick={handleUpload}>
                    📎 Upload
                </button>
            </div>
        </div>
    );
}

export default App; 