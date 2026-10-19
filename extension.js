const vscode = require('vscode');
const fs = require('fs');
const { listSections, parseSection } = require('./parser');

function activate(context) {
    context.subscriptions.push(
    vscode.commands.registerCommand('ListicleMarkdownKanban.open', () => openMarkdownKanban(context))
    );
}

async function openMarkdownKanban(context) {
    let doc = vscode.window.activeTextEditor?.document;
    if (!doc || doc.languageId !== 'markdown') {
        const [uri] =
            (await vscode.window.showOpenDialog({
                filters: { Markdown: ['md', 'markdown'] },
                canSelectMany: false,
            })) || [];
        if (!uri) return;
        doc = await vscode.workspace.openTextDocument(uri);
    }
    const sections = listSections(doc.getText().split(/\r?\n/));
    if (!sections.length) {
        vscode.window.showWarningMessage('No "## Title" sections found.');
        return;
    }
    const pick = await vscode.window.showQuickPick(
        sections.map(s => s.title),
        { placeHolder: 'Which section should become a board?' }
    );
    if (!pick) {
        return;
    }
    openBoard(context, doc, pick);
}

const COLUMN_MARKS = { todo: ' ', doing: '/', blocked: '!', done: 'x' };

async function addCard(doc, title, column) {
    const text = await vscode.window.showInputBox({ prompt: 'New card text' });
    if (!text || !text.trim()) {
        return;
    }
    const lines = doc.getText().split(/\r?\n/);
    const sec = listSections(lines).find(section => section.title === title);
    if (!sec) {
        return;
    }
    let end = sec.line;
    let indent = null;
    for (let i = sec.line + 1; i < lines.length && !/^#{1,2}\s/.test(lines[i]); i++) {
        if (lines[i].trim()) {
            end = i;
        }
        const m = /^(\s*)[-*+]\s+\[[ xX\/!]\]\s/.exec(lines[i]);
        if (m && (indent === null || m[1].length < indent.length)) {
            indent = m[1];
        }
    }
    const newLine = `${indent || ''}- [${COLUMN_MARKS[column]}] ${text.trim()}`;
    const eol = doc.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n';
    const edit = new vscode.WorkspaceEdit();
    edit.insert(doc.uri, doc.lineAt(end).range.end, eol + newLine);
    await vscode.workspace.applyEdit(edit);
}

async function handleMessage(doc, msg, title) {
    if (msg.type === 'add') return addCard(doc, title, msg.column);
    const edit = new vscode.WorkspaceEdit();
    const mark = (lineNumber, checkboxMark) => {
        const line = doc.lineAt(lineNumber);
        edit.replace(doc.uri, line.range, line.text.replace(/\[[ xX\/!]\]/, `[${checkboxMark}]`));
    };

    if (msg.type === 'toggle') {
        const checked = /\[[xX]\]/.test(doc.lineAt(msg.line).text);
        mark(msg.line, checked ? ' ' : 'x');
    } else if (msg.type === 'move') {
        mark(msg.line, COLUMN_MARKS[msg.column]);
        if (msg.column === 'todo' || msg.column === 'done') {
            msg.subLines.forEach(lineNumber => mark(lineNumber, COLUMN_MARKS[msg.column]));
        }
    } else {
        return;
    }
    await vscode.workspace.applyEdit(edit);
}

function openBoard(context, doc, title) {
    const mediaRoot = vscode.Uri.joinPath(context.extensionUri, 'media');
    const panel = vscode.window.createWebviewPanel(
        'markdownKanban', `Kanban: ${title}`, vscode.ViewColumn.Beside,
        { enableScripts: true, localResourceRoots: [mediaRoot] }
    );
    const render = () => {
        const lines = doc.getText().split(/\r?\n/);
        const sec = listSections(lines).find(section => section.title === title);
        panel.webview.postMessage({ type: 'cards', cards: sec ? parseSection(lines, sec.line) : [] });
    };
    panel.webview.html = loadHtml(panel.webview, mediaRoot);
    panel.webview.onDidReceiveMessage(
        msg => (msg.type === 'ready' ? render() : handleMessage(doc, msg, title)),
        undefined,
        context.subscriptions
    );
    const sub = vscode.workspace.onDidChangeTextDocument(event => {
      if (event.document === doc) render();
    });
    panel.onDidDispose(() => sub.dispose());
}

function loadHtml(webview, mediaRoot) {
    const uri = file => webview.asWebviewUri(vscode.Uri.joinPath(mediaRoot, file)).toString();
    const template = fs.readFileSync(vscode.Uri.joinPath(mediaRoot, 'board.html').fsPath, 'utf8');
    return template
        .replace(/{{cspSource}}/g, webview.cspSource)
        .replace('{{css}}', uri('board.css'))
        .replace('{{js}}', uri('board.js'));
}

function deactivate() {}
module.exports = { activate, deactivate };
