import * as vscode from 'vscode';
import { BackendClient, ChatMessage } from '../core/backendClient';
import { ModuleManager } from '../core/moduleManager';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    private _view?: vscode.WebviewView;
    private backend: BackendClient;
    private abortController?: AbortController;

    constructor(
        private readonly _extensionUri: vscode.Uri,
        private modules: ModuleManager
    ) {
        this.backend = new BackendClient();
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this._view = webviewView;

        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this._extensionUri]
        };

        webviewView.webview.html = this.getHtmlForWebview(webviewView.webview);

        webviewView.webview.onDidReceiveMessage(async (message) => {
            if (message.type === 'sendMessage') {
                await this.handleUserMessage(message.text);
            } else if (message.type === 'cancelStream') {
                this.abortController?.abort();
            }
        });
    }

    public async handleTryCommand(feature: string): Promise<void> {
        const prompt = `Build this feature with full sandbox proof: ${feature}`;
        await this.handleUserMessage(prompt);
    }

    private async handleUserMessage(text: string): Promise<void> {
        if (!text.trim()) return;

        // Show user message
        this._view?.webview.postMessage({
            type: 'userMessage',
            content: text
        });

        // Check if backend/ollama available
        const coreEnabled = this.modules.isModuleEnabled('core');
        if (!coreEnabled) {
            this._view?.webview.postMessage({
                type: 'error',
                content: 'Crystal Ball AI is not properly initialized'
            });
            return;
        }

        // Start streaming
        this._view?.webview.postMessage({ type: 'streamStart' });

        this.abortController = new AbortController();
        
        try {
            const messages: ChatMessage[] = [
                { role: 'system', content: 'You are Crystal Ball AI, a precognitive coding assistant.' },
                { role: 'user', content: text }
            ];

            for await (const chunk of this.backend.streamChat(messages, this.abortController.signal)) {
                if (chunk.type === 'chunk') {
                    this._view?.webview.postMessage({
                        type: 'streamChunk',
                        content: chunk.content
                    });
                } else if (chunk.type === 'error') {
                    this._view?.webview.postMessage({
                        type: 'error',
                        content: chunk.error
                    });
                    break;
                } else if (chunk.type === 'done') {
                    break;
                }
            }
        } catch (error: any) {
            this._view?.webview.postMessage({
                type: 'error',
                content: `Error: ${error.message}`
            });
        } finally {
            this._view?.webview.postMessage({ type: 'streamEnd' });
        }
    }

    private getHtmlForWebview(webview: vscode.Webview): string {
        return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            padding: 16px;
        }
        #messages {
            height: calc(100vh - 120px);
            overflow-y: auto;
            margin-bottom: 12px;
        }
        .message {
            margin: 12px 0;
            padding: 12px;
            border-radius: 6px;
            line-height: 1.5;
        }
        .user {
            background: var(--vscode-input-background);
            border-left: 3px solid var(--vscode-button-background);
        }
        .assistant {
            background: var(--vscode-editor-background);
            border-left: 3px solid #8b5cf6;
        }
        .error {
            background: var(--vscode-inputValidation-errorBackground);
            border-left: 3px solid var(--vscode-inputValidation-errorBorder);
        }
        .thinking {
            font-style: italic;
            opacity: 0.7;
        }
        #input-area {
            display: flex;
            gap: 8px;
        }
        input {
            flex: 1;
            padding: 8px;
            background: var(--vscode-input-background);
            color: var(--vscode-input-foreground);
            border: 1px solid var(--vscode-input-border);
            border-radius: 4px;
        }
        button {
            padding: 8px 16px;
            background: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
            border: none;
            border-radius: 4px;
            cursor: pointer;
        }
        button:hover {
            background: var(--vscode-button-hoverBackground);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .status {
            text-align: center;
            padding: 8px;
            font-size: 12px;
            opacity: 0.7;
        }
    </style>
</head>
<body>
    <div class="status">🔮 Crystal Ball AI - Precognitive Coding Oracle</div>
    <div id="messages"></div>
    <div id="input-area">
        <input type="text" id="userInput" placeholder="Ask the crystal ball..." />
        <button id="sendBtn">Send</button>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        const messages = document.getElementById('messages');
        const userInput = document.getElementById('userInput');
        const sendBtn = document.getElementById('sendBtn');
        
        let currentAssistantMsg = null;
        let isStreaming = false;

        function addMessage(content, className) {
            const div = document.createElement('div');
            div.className = 'message ' + className;
            div.textContent = content;
            messages.appendChild(div);
            messages.scrollTop = messages.scrollHeight;
            return div;
        }

        function sendMessage() {
            const text = userInput.value.trim();
            if (!text || isStreaming) return;

            addMessage(text, 'user');
            userInput.value = '';

            vscode.postMessage({ type: 'sendMessage', text });
        }

        sendBtn.addEventListener('click', sendMessage);
        userInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') sendMessage();
        });

        window.addEventListener('message', (event) => {
            const msg = event.data;

            if (msg.type === 'userMessage') {
                // Already handled in sendMessage
            }
            else if (msg.type === 'streamStart') {
                isStreaming = true;
                sendBtn.disabled = true;
                currentAssistantMsg = addMessage('Thinking...', 'assistant thinking');
            }
            else if (msg.type === 'streamChunk') {
                if (currentAssistantMsg) {
                    if (currentAssistantMsg.classList.contains('thinking')) {
                        currentAssistantMsg.textContent = '';
                        currentAssistantMsg.classList.remove('thinking');
                    }
                    currentAssistantMsg.textContent += msg.content;
                    messages.scrollTop = messages.scrollHeight;
                }
            }
            else if (msg.type === 'streamEnd') {
                isStreaming = false;
                sendBtn.disabled = false;
                currentAssistantMsg = null;
            }
            else if (msg.type === 'error') {
                isStreaming = false;
                sendBtn.disabled = false;
                addMessage(msg.content, 'error');
                currentAssistantMsg = null;
            }
        });
    </script>
</body>
</html>`;
    }
}
