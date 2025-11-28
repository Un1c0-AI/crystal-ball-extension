import * as vscode from 'vscode';
import axios from 'axios';

export interface ModuleStatus {
    name: string;
    enabled: boolean;
    healthy: boolean;
    error?: string;
}

export class ModuleManager {
    private modules: Map<string, ModuleStatus> = new Map();
    private config: vscode.WorkspaceConfiguration;

    constructor(private context: vscode.ExtensionContext) {
        this.config = vscode.workspace.getConfiguration('crystalBall');
    }

    async initialize(): Promise<void> {
        // Core module (always enabled)
        this.registerModule('core', true, true);

        // Check backend connection
        const backendEnabled = await this.checkBackend();
        this.registerModule('backend', true, backendEnabled);

        // Optional modules (based on config)
        this.registerModule('sandbox', 
            this.config.get('enableSandbox', true), 
            backendEnabled
        );
        
        this.registerModule('memory', 
            this.config.get('enableMemory', true), 
            backendEnabled
        );
        
        this.registerModule('evolution', 
            this.config.get('enableEvolution', false), 
            backendEnabled
        );

        this.logStatus();
    }

    private async checkBackend(): Promise<boolean> {
        try {
            const url = this.config.get('backendUrl', 'http://127.0.0.1:8000');
            const response = await axios.get(`${url}/health`, { timeout: 2000 });
            return response.status === 200;
        } catch (error) {
            console.warn('Backend not available, running in limited mode');
            return false;
        }
    }

    private registerModule(name: string, enabled: boolean, healthy: boolean, error?: string): void {
        this.modules.set(name, { name, enabled, healthy, error });
    }

    isModuleEnabled(name: string): boolean {
        const module = this.modules.get(name);
        return module ? module.enabled && module.healthy : false;
    }

    getModuleStatus(name: string): ModuleStatus | undefined {
        return this.modules.get(name);
    }

    getAllModules(): ModuleStatus[] {
        return Array.from(this.modules.values());
    }

    private logStatus(): void {
        console.log('📊 Module Status:');
        for (const [name, status] of this.modules) {
            const icon = status.enabled && status.healthy ? '✅' : '⚠️';
            console.log(`  ${icon} ${name}: ${status.enabled ? 'enabled' : 'disabled'}, ${status.healthy ? 'healthy' : 'unhealthy'}`);
            if (status.error) console.log(`     Error: ${status.error}`);
        }
    }
}
