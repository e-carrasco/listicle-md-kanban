const HEADING = /^##\s+(.*?)\s*#*\s*$/;
const CHECKBOX = /^(\s*)[-*+]\s+\[([ xX\/!])\]\s+(.*)$/;

const NOTE = /^(\s*)[-*+]\s+(?!\[[ xX\/!]\]\s)(.+)$/;

// Trailing "!high" / "!med" / "!low" (or !1-!3) on a card line sets its priority.
const PRIORITY = /\s+!(high|med|low|1|2|3)\s*$/i;
const PRIORITY_LEVELS = { high: 'high', 1: 'high', med: 'med', 2: 'med', low: 'low', 3: 'low' };

function listSections(lines) {
    const out = [];
    lines.forEach((l, i) => {
        const m = HEADING.exec(l);
        if (m && !l.startsWith('###')) out.push({ title: m[1], line: i });
    });
    return out;
}

// Top-level checkboxes become cards; every nested checkbox is flattened into
// that card's subtasks.
function parseSection(lines, headingLine) {
    const cards = [];
    let baseIndent = null;
    let card = null;
    for (let i = headingLine + 1; i < lines.length; i++) {
        const line = lines[i];
        if (/^#{1,2}\s/.test(line)) break;
        const m = CHECKBOX.exec(line);
        if (!m) {
            const note = NOTE.exec(line);
            if (note && card && note[1].replace(/\t/g, '    ').length > baseIndent) {
                card.details.push(note[2].trim());
            }
            continue;
        }
        const indent = m[1].replace(/\t/g, '    ').length;
        if (baseIndent === null) baseIndent = indent;
        const item = { line: i, text: m[3].trim(), checked: m[2] === 'x' || m[2] === 'X', doing: m[2] === '/', blocked: m[2] === '!' };
        if (indent <= baseIndent) {
            card = { ...item, subtasks: [], details: [] };
            const tag = PRIORITY.exec(card.text);
            card.priority = tag ? PRIORITY_LEVELS[tag[1].toLowerCase()] : null;
            if (tag) card.text = card.text.replace(PRIORITY, '').trim();
            cards.push(card);
        } else if (card) {
            card.subtasks.push(item);
        }
    }
    for (const c of cards) {
            c.column = c.checked ? 'done' : c.blocked ? 'blocked' : c.doing ? 'doing' : 'todo';
    }
    return cards;
}

module.exports = { listSections, parseSection };
