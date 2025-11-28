import * as vscode from 'vscode';
import { ChatViewProvider } from './views/chatViewProvider';
import { StatusTreeProvider } from './views/statusTreeProvider';
import { ModuleManager } from './core/moduleManager';

export async function activate(context: vscode.ExtensionContext) {
    console.log('🔮 Crystal Ball AI activating...');

    // Initialize module manager (handles graceful degradation)
    const modules = new ModuleManager(context);
    await modules.initialize();

    // Register chat view
    const chatProvider = new ChatViewProvider(context.extensionUri, modules);
    context.subscriptions.push(
        vscode.window.registerWebviewViewProvider('crystalBallChat', chatProvider)
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

        vscode.commands.registerCommand('crystalBall.try', async () => {
            const input = await vscode.window.showInputBox({
                prompt: 'What feature should I build and prove?',
                placeHolder: 'e.g., Add user authentication'
            });
            if (input) {
                chatProvider.handleTryCommand(input);
            }
        }),

        vscode.commands.registerCommand('crystalBall.evolve', async () => {
            if (!modules.isModuleEnabled('evolution')) {
                vscode.window.showWarningMessage('Evolution module is disabled');
                return;
            }
            // TODO: Trigger LoRA retraining
            vscode.window.showInformationMessage('Evolution training coming soon...');
        })
    );

    console.log('✅ Crystal Ball AI is active');
}

export function deactivate() {
    console.log('🔮 Crystal Ball AI deactivated');
}
