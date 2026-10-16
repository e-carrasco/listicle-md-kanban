# Markdown Kanban

Turn a checkbox section of a markdown file into a kanban board inside VS Code.

## Usage

1. Open a markdown file.
2. Run **Markdown Kanban: Open Board from Section** from the Command Palette.
3. Pick the `## Heading` section to display.

## Markdown format

```markdown
## To Do This Week
- [ ] Task: Make lunch !high
    - make some fried rice
    - [ ] cook rice
    - [ ] cook protein
        - [ ] select protein
- [/] Task: Write a letter !low
- [!] Task: Open box
- [x] Task: Watch TV
```

- **Cards:** each top-level checkbox under the heading.
- **Subtasks:** nested checkboxes under a card (deeper levels are flattened).
- **Details:** plain `- text` bullets under a card.
- **Columns:** `[ ]` To Do, `[/]` In Progress, `[!]` Blocked, `[x]` Done.
- **Priority:** end a card line with `!high`, `!med` or `!low` (or `!1`, `!2`, `!3`).

## Features

- Drag cards between columns; the change is written back to the markdown file.
- Tick subtasks on the board to update the file.
- Expand or collapse individual cards, or all at once.
- Cards are sorted by priority within each column.

## License

[MIT](LICENSE)
