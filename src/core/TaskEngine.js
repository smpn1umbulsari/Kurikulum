import fs from 'fs';
import path from 'path';

export class TaskEngine {
  constructor(documentEngine = null) {
    this.documentEngine = documentEngine; // Reserved for future use if we want DocumentEngine integration
  }

  parseTaskFile(filePath) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Task file not found at: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    const tasks = [];

    // Match patterns:
    // Group 1: Leading spaces/tabs (indent)
    // Group 2: The checkbox status character inside [ ]
    // Group 3: The actual task text
    const checkboxRegex = /^([ \t]*)-\s+\[([ xX/])\]\s+(.+)$/;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const match = checkboxRegex.exec(line);
      if (match) {
        const indentStr = match[1];
        const statusChar = match[2];
        const text = match[3].trim();

        // Calculate indent level (e.g. 2 spaces = level 1, 4 spaces = level 2)
        // Or just count whitespace characters
        const indent = indentStr.length;

        let status = 'pending';
        if (statusChar === '/') {
          status = 'in_progress';
        } else if (statusChar === 'x' || statusChar === 'X') {
          status = 'completed';
        }

        tasks.push({
          index: i,
          indent,
          status,
          text,
          lineText: line
        });
      }
    }

    return tasks;
  }

  updateTaskStatus(filePath, lineIndexOrText, newStatus) {
    if (!fs.existsSync(filePath)) {
      throw new Error(`Task file not found at: ${filePath}`);
    }

    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/);
    let updated = false;

    let statusChar = ' ';
    if (newStatus === 'in_progress') statusChar = '/';
    else if (newStatus === 'completed') statusChar = 'x';

    if (typeof lineIndexOrText === 'number') {
      const index = lineIndexOrText;
      if (index >= 0 && index < lines.length) {
        const line = lines[index];
        const checkboxRegex = /^([ \t]*-\s+\[)([ xX/])(\]\s+.+)$/;
        const match = checkboxRegex.exec(line);
        if (match) {
          lines[index] = `${match[1]}${statusChar}${match[3]}`;
          updated = true;
        }
      }
    } else {
      // Find by matching text substring
      const searchTarget = lineIndexOrText.toLowerCase().trim();
      const checkboxRegex = /^([ \t]*-\s+\[)([ xX/])(\]\s+(.+))$/;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const match = checkboxRegex.exec(line);
        if (match) {
          const text = match[4].trim().toLowerCase();
          if (text.includes(searchTarget)) {
            lines[i] = `${match[1]}${statusChar}${match[3]}`;
            updated = true;
            break; // Update first match
          }
        }
      }
    }

    if (updated) {
      fs.writeFileSync(filePath, lines.join('\n'), 'utf-8');
    } else {
      throw new Error(`Could not find task line matching: "${lineIndexOrText}" to update status.`);
    }
  }

  generateTaskTemplate(tasks) {
    return tasks.map(task => {
      const indentStr = ' '.repeat(task.indent || 0);
      let statusChar = ' ';
      if (task.status === 'in_progress') statusChar = '/';
      else if (task.status === 'completed') statusChar = 'x';

      return `${indentStr}- [${statusChar}] ${task.text}`;
    }).join('\n');
  }
}
