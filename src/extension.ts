import * as vscode from 'vscode';
import { ChatViewProvider } from './chatViewProvider';
import { StatusTreeProvider } from './views/statusTreeProvider';
import { ModuleManager } from './core/moduleManager';
import { gem } from './gemClient';
import { registerTryCommand } from './commands/try';

    console.log('🔮 Crystal Ball AI activating...');

    // Initialize module manager (handles graceful degradation)
    const modules = new ModuleManager(context);
    await modules.initialize();

    // Register chat view
    const chatProvider = new ChatViewProvider(context.extensionUri);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider(ChatViewProvider.viewType, chatProvider)
    );

    // Register status tree
    const statusProvider = new StatusTreeProvider(modules);
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider('crystalBallStatus', statusProvider)
    );

    // Register commands
    context.subscriptions.push(
        vscode.commands.registerCommand('crystalBall.precog', async () => {
            if (!modules.isModuleEnabled('sandbox')) {
                vscode.window.showWarningMessage('Precog Sandbox module is disabled');
                return;
            }
            // TODO: Show predictions
            vscode.window.showInformationMessage('Precog predictions coming soon...');
        }),

        vscode.commands.registerCommand('crystalBall.sandbox', async () => {
            if (!modules.isModuleEnabled('sandbox')) {
                vscode.window.showWarningMessage('Sandbox module is disabled');
                return;
            }
            // TODO: Run sandbox
            vscode.window.showInformationMessage('Sandbox test coming soon...');
        }),

        vscode.commands.registerCommand('crystalBall.testSandbox', async () => {
            if (!vscode.workspace.workspaceFolders || vscode.workspace.workspaceFolders.length === 0) {
                vscode.window.showWarningMessage('No workspace folder open');
                return;
            }
            const result = await gem.post('/clear-quartz/run', {
                repo_path: vscode.workspace.workspaceFolders[0].uri.fsPath
            });
            vscode.window.showInformationMessage(
                result.passed ? `All tests passed in ${result.test_result.duration_sec}s` : 'Tests failed – see output'
            );
        }),
        vscode.window.showInformationMessage('Evolution training coming soon...');
    );

    // Register the legendary Try command
    registerTryCommand(context);
    vscode.commands.executeCommand('setContext', 'crystalBall.ready', true);
}

    console.log('✅ Crystal Ball AI is active');
}

export function deactivate() {
    console.log('🔮 Crystal Ball AI deactivated');
}
