const vscode = acquireVsCodeApi();
const titles = { todo: 'To Do', doing: 'In Progress', blocked: 'Blocked', done: 'Done' };
const collapsed = new Set();
let dragged = null;

function subtaskBox(item) {
    const label = document.createElement('label');
    label.className = 'sub';
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = item.checked;
    input.onchange = () => vscode.postMessage({ type: 'toggle', line: item.line });
    const text = document.createElement('span');
    text.textContent = ' ' + item.text;
    label.append(input, text);
    return label;
}

function renderCard(card) {
    const el = document.createElement('div');
    el.className = 'card ' + card.column;
    el.draggable = true;
    el.ondragstart = e => {
        dragged = card;
        el.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(card.line));
    };
    el.ondragend = () => el.classList.remove('dragging');

    const title = document.createElement('div');
    title.className = 't';
    const body = document.createElement('div');
    body.hidden = collapsed.has(card.text);
    card.subtasks.forEach(s => body.append(subtaskBox(s)));

    if (card.subtasks.length) {
        const toggle = document.createElement('span');
        toggle.className = 'tog';
        toggle.textContent = body.hidden ? '▸' : '▾';
        toggle.onclick = () => {
        body.hidden = !body.hidden;
        toggle.textContent = body.hidden ? '▸' : '▾';
        if (body.hidden) collapsed.add(card.text);
        else collapsed.delete(card.text);
        };
        const doneCount = card.subtasks.filter(s => s.checked).length;
        const count = document.createElement('span');
        count.className = 'cnt';
        count.textContent = ` (${doneCount}/${card.subtasks.length})`;
        title.append(toggle, document.createTextNode(card.text), count);
    } else {
        title.textContent = card.text;
    }
    el.append(title, body);
    return el;
}

for (const id in titles) {
    const col = document.getElementById(id);
    col.ondragover = event => {
        event.preventDefault();
        col.classList.add('over');
    };
    col.ondragleave = event => {
        if (!col.contains(event.relatedTarget)) col.classList.remove('over');
    };
    col.ondrop = event => {
        event.preventDefault();
        col.classList.remove('over');
        if (dragged && dragged.column !== id) {
        vscode.postMessage({
            type: 'move',
            line: dragged.line,
            column: id,
            subLines: dragged.subtasks.map(s => s.line),
        });
        }
        dragged = null;
    };
}

let cards = [];

function renderBoard() {
    for (const id in titles) {
        const col = document.getElementById(id);
        col.innerHTML = '';
        const heading = document.createElement('h2');
        heading.textContent = titles[id];
        col.append(heading);
    }
    for (const card of cards) {
        document.getElementById(card.column).append(renderCard(card));
    }
}

document.getElementById('collapse-all').onclick = () => {
    cards.filter(c => c.subtasks.length).forEach(c => collapsed.add(c.text));
    renderBoard();
};
document.getElementById('expand-all').onclick = () => {
    collapsed.clear();
    renderBoard();
};

window.addEventListener('message', event => {
    if (event.data.type !== 'cards') return;
    cards = event.data.cards;
    renderBoard();
});

vscode.postMessage({ type: 'ready' });
