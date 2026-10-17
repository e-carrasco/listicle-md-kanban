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

function startDrag(event, card, element) {
    dragged = card;
    element.classList.add('dragging');
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', String(card.line));
}

function toggleSubtasks(card, body, toggle) {
    body.hidden = !body.hidden;
    toggle.textContent = body.hidden ? '▸' : '▾';
    if (body.hidden) collapsed.add(card.text);
    else collapsed.delete(card.text);
}

function renderSubtaskSection(card, body, title) {
    const toggle = document.createElement('span');
    toggle.className = 'tog';
    toggle.textContent = body.hidden ? '▸' : '▾';
    toggle.onclick = () => toggleSubtasks(card, body, toggle);
    const doneCount = card.subtasks.filter(s => s.checked).length;
    const count = document.createElement('span');
    count.className = 'cnt';
    count.textContent = ` (${doneCount}/${card.subtasks.length})`;
    title.append(toggle, document.createTextNode(card.text), count);
}

function renderCard(card) {
    const el = document.createElement('div');
    el.className = 'card ' + card.column;
    el.draggable = true;
    el.ondragstart = e => startDrag(e, card, el);
    el.ondragend = () => el.classList.remove('dragging');

    const title = document.createElement('div');
    title.className = 't';
    const badge = card.priority && Object.assign(document.createElement('span'), {
        className: 'badge ' + card.priority,
        textContent: card.priority,
    });
    const body = document.createElement('div');
    body.hidden = collapsed.has(card.text);
    card.subtasks.forEach(s => body.append(subtaskBox(s)));
    const details = card.details.map(text => {
        const detail = document.createElement('div');
        detail.className = 'detail';
        detail.textContent = text;
        return detail;
    });

    if (card.subtasks.length) { // card has subtasks
        renderSubtaskSection(card, body, title);
    } else {
        title.textContent = card.text;
    }
    if (badge) title.append(badge);
    el.append(title, ...details, body);
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
    const rank = { high: 0, med: 1, low: 2 };
    const sorted = [...cards].sort((a, b) => (rank[a.priority] ?? 3) - (rank[b.priority] ?? 3));
    for (const card of sorted) {
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
