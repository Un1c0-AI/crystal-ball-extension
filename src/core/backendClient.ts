import * as vscode from 'vscode';
import axios from 'axios';

export interface BackendConfig {
    baseUrl: string;
    timeout: number;
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface StreamChunk {
    type: 'chunk' | 'done' | 'error';
    content?: string;
    error?: string;
}

export class BackendClient {
    private config: BackendConfig;

    constructor() {
        const wsConfig = vscode.workspace.getConfiguration('crystalBall');
        this.config = {
            baseUrl: wsConfig.get('backendUrl', 'http://127.0.0.1:8000'),
            timeout: 30000
        };
    }

    async checkHealth(): Promise<boolean> {
        try {
            const response = await axios.get(`${this.config.baseUrl}/health`, {
                timeout: 2000
            });
            return response.status === 200;
        } catch {
            return false;
        }
    }

    async* streamChat(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
        try {
            // Fallback: If backend not available, use local Ollama directly
            const backendHealthy = await this.checkHealth();
            
            if (!backendHealthy) {
                yield* this.streamOllamaDirectly(messages, signal);
                return;
            }

            // TODO: Implement backend streaming when ready
            yield { type: 'chunk', content: 'Backend streaming coming soon...' };
            yield { type: 'done' };

        } catch (error: any) {
            yield { 
                type: 'error', 
                error: `Stream error: ${error.message}` 
            };
        }
    }

    private async* streamOllamaDirectly(messages: ChatMessage[], signal?: AbortSignal): AsyncGenerator<StreamChunk> {
        const wsConfig = vscode.workspace.getConfiguration('crystalBall');
        const ollamaUrl = wsConfig.get('ollamaUrl', 'http://127.0.0.1:11434');
        const model = wsConfig.get('localModel', 'deepseek-r1:8b');

        try {
            const prompt = messages.map(m => `${m.role}: ${m.content}`).join('\n');
            
            const response = await fetch(`${ollamaUrl}/api/generate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: model,
                    prompt: prompt,
                    stream: true
                }),
                signal
            });

            if (!response.ok || !response.body) {
                yield { type: 'error', error: `Ollama error: ${response.status}` };
                return;
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n').filter(l => l.trim());

                for (const line of lines) {
                    try {
                        const data = JSON.parse(line);
                        if (data.response) {
                            yield { type: 'chunk', content: data.response };
                        }
                        if (data.done) {
                            yield { type: 'done' };
                            return;
                        }
                    } catch (e) {
                        // Ignore parse errors
                    }
                }
            }

            yield { type: 'done' };

        } catch (error: any) {
            if (error.name === 'AbortError') {
                yield { type: 'error', error: 'Request cancelled' };
            } else {
                yield { type: 'error', error: `Ollama error: ${error.message}` };
            }
        }
    }
}
