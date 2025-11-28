import * as vscode from 'vscode';
import { gem } from './gemClient';

export class ChatViewProvider implements vscode.WebviewViewProvider {
    public static readonly viewType = 'crystalBall.chat';
    private _view?: vscode.WebviewView;

    constructor(private readonly extensionUri: vscode.Uri) {}

    resolveWebviewView(webviewView: vscode.WebviewView) {
        this._view = webviewView;
        webviewView.webview.options = { enableScripts: true };
        webviewView.webview.html = this.getHtml();

        webviewView.webview.onDidReceiveMessage(async message => {
            if (message.type === 'ready') return;

            const response = await gem.post('/rose-quartz/run', {
                messages: [{ role: "user", content: message }]
            });

            // Stream response back to webview
            const reader = response.body?.getReader();
            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const text = new TextDecoder().decode(value);
                webviewView.webview.postMessage({ type: 'chunk', text });
            }
            webviewView.webview.postMessage({ type: 'end' });
        });
    }

    private getHtml() {
        return `<!DOCTYPE html>
<html><body style="padding:10px;font-family:system-ui">
  <div id="chat"></div>
  <input id="input" placeholder="Ask Crystal Ball anything..." style="width:100%;padding:10px;margin-top:10px"/>
  <script>
    const vscode = acquireVsCodeApi();
    const chat = document.getElementById('chat');
    const input = document.getElementById('input');
    
    input.addEventListener('keypress', e => {
      if (e.key === 'Enter' && input.value) {
        chat.innerHTML += '<div><b>You:</b> ' + input.value + '</div>';
        vscode.postMessage(input.value);
        input.value = '';
        chat.innerHTML += '<div><b>Crystal Ball:</b> <span id="resp"></span></div>';
      }
    });

    window.addEventListener('message', e => {
      if (e.data.type === 'chunk') {
        document.getElementById('resp').innerText += e.data.text;
      }
      if (e.data.type === 'end') {
        chat.innerHTML += '<hr>';
      }
    });

    vscode.postMessage('ready');
  </script>
</body></html>`;
    }
}
