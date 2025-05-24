"use client"
import React from "react";
import { useState, useEffect } from "react"
import type { JSX } from "react/jsx-runtime"

// Declare the vscode API type
declare const acquireVsCodeApi:
  | (() => {
      postMessage: (message: any) => void
      getState: () => any
      setState: (state: any) => void
    })
  | undefined

// Safely get vscode API with fallback for preview/development
const getVsCodeApi = () => {
  if (typeof acquireVsCodeApi !== "undefined") {
    return acquireVsCodeApi()
  }
  // Fallback for preview/development mode
  return {
    postMessage: (message: any) => {
      console.log("Mock VS Code API - postMessage:", message)
    },
    getState: () => ({}),
    setState: (state: any) => {
      console.log("Mock VS Code API - setState:", state)
    },
  }
}

const vscode = getVsCodeApi()

// Types
interface HistoryItem {
  prompt: string
  response: string
}

interface VSCodeMessage {
  type: "selectedCode" | "addHistory" | "clearHistory"
  value?: string | HistoryItem
}

interface CodeAction {
  type: "codeAction"
  action: "debug" | "optimize"
  code: string
}

interface PromptMessage {
  type: "prompt"
  value: string
}

interface UploadMessage {
  type: "upload"
}

type OutgoingMessage = CodeAction | PromptMessage | UploadMessage

function App(): JSX.Element {
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [prompt, setPrompt] = useState<string>("")
  const [selectedCode, setSelectedCode] = useState<string | null>(null)

  useEffect(() => {
    // Listen for messages from the extension
    const messageHandler = (event: MessageEvent<VSCodeMessage>) => {
      const message = event.data
      switch (message.type) {
        case "selectedCode":
          setSelectedCode(message.value as string)
          break
        case "addHistory":
          setHistory((prev) => [...prev, message.value as HistoryItem])
          break
        case "clearHistory":
          setHistory([])
          break
      }
    }

    // Only add event listener if we're in a real webview context
    if (typeof acquireVsCodeApi !== "undefined") {
      window.addEventListener("message", messageHandler)
      return () => window.removeEventListener("message", messageHandler)
    } else {
      // For preview mode, add some mock data
      setHistory([
        {
          prompt: "How do I optimize this function?",
          response:
            "Here are some suggestions to optimize your function:\n\n1. Use more efficient algorithms\n2. Reduce memory allocation\n3. Cache frequently used values",
        },
        {
          prompt: "Debug this code snippet",
          response:
            "I found several issues in your code:\n\n1. Missing null checks\n2. Potential memory leaks\n3. Inefficient loops",
        },
      ])
      setSelectedCode("function example() {\n  // Your selected code here\n  return true;\n}")
    }
  }, [])

  const handleSubmit = (): void => {
    if (!prompt.trim()) return

    // Send prompt to extension or handle in preview mode
    if (typeof acquireVsCodeApi !== "undefined") {
      vscode.postMessage({
        type: "prompt",
        value: prompt,
      } as PromptMessage)
    } else {
      // Mock response for preview
      const mockResponse = `Mock AI response to: "${prompt}"\n\nThis is how the AI would respond to your prompt in the actual VS Code extension.`
      setHistory((prev) => [...prev, { prompt, response: mockResponse }])
    }

    setPrompt("")
  }

  const handleUpload = (): void => {
    if (typeof acquireVsCodeApi !== "undefined") {
      vscode.postMessage({
        type: "upload",
      } as UploadMessage)
    } else {
      alert("File upload would work in VS Code extension context")
    }
  }

  const handleCodeAction = (action: "debug" | "optimize"): void => {
    if (!selectedCode) return

    if (typeof acquireVsCodeApi !== "undefined") {
      vscode.postMessage({
        type: "codeAction",
        action,
        code: selectedCode,
      } as CodeAction)
    } else {
      const mockResponse = `Mock ${action} result:\n\nThis is how the ${action} feature would work in the actual VS Code extension.`
      setHistory((prev) => [
        ...prev,
        {
          prompt: `${action.charAt(0).toUpperCase() + action.slice(1)} selected code`,
          response: mockResponse,
        },
      ])
    }
  }

  return (
    <div className="webview-container">
      {/* Context indicator for development */}
      {typeof acquireVsCodeApi === "undefined" && (
        <div className="dev-indicator">🔧 Preview Mode - This is how the extension looks in VS Code</div>
      )}

      {selectedCode && (
        <div className="code-lens">
          <button onClick={() => handleCodeAction("debug")}>🔍 Debug (Shift+Alt+8)</button>
          <button onClick={() => handleCodeAction("optimize")}>⚡ Optimize (Ctrl+O)</button>
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
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault()
              handleSubmit()
            }
          }}
        />
        <button onClick={handleSubmit}>Send</button>
        <button className="upload-button" onClick={handleUpload}>
          📎 Upload
        </button>
      </div>
    </div>
  )
}

export default App
