import React, { useState, useEffect } from 'react';
import './styles.css';
// Get vscode API
const vscode = acquireVsCodeApi();
function App() {
    const [history, setHistory] = useState([]);
    const [prompt, setPrompt] = useState('');
    const [selectedCode, setSelectedCode] = useState(null);
    useEffect(() => {
        // Listen for messages from the extension
        const messageHandler = (event) => {
            const message = event.data;
            switch (message.type) {
                case 'selectedCode':
                    setSelectedCode(message.value);
                    break;
                case 'addHistory':
                    setHistory(prev => [...prev, message.value]);
                    break;
                case 'clearHistory':
                    setHistory([]);
                    break;
            }
        };
        window.addEventListener('message', messageHandler);
        return () => window.removeEventListener('message', messageHandler);
    }, []);
    const handleSubmit = () => {
        if (!prompt.trim())
            return;
        // Send prompt to extension
        vscode.postMessage({
            type: 'prompt',
            value: prompt
        });
        setPrompt('');
    };
    const handleUpload = () => {
        vscode.postMessage({
            type: 'upload'
        });
    };
    const handleCodeAction = (action) => {
        if (!selectedCode)
            return;
        vscode.postMessage({
            type: 'codeAction',
            action,
            code: selectedCode
        });
    };
    return (React.createElement("div", { className: "webview-container" },
        selectedCode && (React.createElement("div", { className: "code-lens" },
            React.createElement("button", { onClick: () => handleCodeAction('debug') }, "\uD83D\uDD0D Debug (Shift+Alt+8)"),
            React.createElement("button", { onClick: () => handleCodeAction('optimize') }, "\u26A1 Optimize (Ctrl+O)"))),
        React.createElement("div", { className: "history-panel" }, history.map((item, index) => (React.createElement("div", { key: index, className: "prompt-item" },
            React.createElement("div", { className: "user-prompt" }, item.prompt),
            React.createElement("div", { className: "ai-response" }, item.response))))),
        React.createElement("div", { className: "input-container" },
            React.createElement("textarea", { value: prompt, onChange: (e) => setPrompt(e.target.value), placeholder: "Enter your prompt here...", onKeyDown: (e) => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleSubmit();
                    }
                } }),
            React.createElement("button", { onClick: handleSubmit }, "Send"),
            React.createElement("button", { className: "upload-button", onClick: handleUpload }, "\uD83D\uDCCE Upload"))));
}
export default App;
