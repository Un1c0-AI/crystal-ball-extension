import * as vscode from 'vscode';
import { ModuleManager, ModuleStatus } from '../core/moduleManager';

export class StatusTreeProvider implements vscode.TreeDataProvider<StatusItem> {
    private _onDidChangeTreeData = new vscode.EventEmitter<StatusItem | undefined>();
    readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

    constructor(private modules: ModuleManager) {}

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: StatusItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: StatusItem): StatusItem[] {
        if (!element) {
            // Root level - show all modules
            const allModules = this.modules.getAllModules();
            return allModules.map(m => new StatusItem(
                m.name,
                m.enabled && m.healthy ? '✅' : '⚠️',
                m.enabled ? (m.healthy ? 'Healthy' : 'Unhealthy') : 'Disabled',
                vscode.TreeItemCollapsibleState.None
            ));
        }
        return [];
    }
}

class StatusItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly icon: string,
        public readonly status: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState
    ) {
        super(label, collapsibleState);
        this.description = status;
        this.tooltip = `${label}: ${status}`;
    }
}
