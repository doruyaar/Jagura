export const parseColumns = (columnList: string): string[] => {
  const columns: string[] = [];
  let currentColumn: string = '';
  let parenCount: number = 0;
  let quoteChar: string | null = null; // Tracks the current quote character (' or ") if inside a quoted string

  for (let i = 0; i < columnList.length; i++) {
    const c: string = columnList[i];
    const prevChar: string = columnList[i - 1];

    // Check for quote characters
    if ((c === "'" || c === '"') && prevChar !== '\\') {
      if (quoteChar === c) {
        // Exiting the quoted string
        quoteChar = null;
      } else if (!quoteChar) {
        // Entering a quoted string
        quoteChar = c;
      }
      currentColumn += c;
      continue;
    }

    // If inside a quoted string, append character and continue
    if (quoteChar) {
      currentColumn += c;
      continue;
    }

    // Handle parentheses
    if (c === '(') {
      parenCount++;
      currentColumn += c;
      continue;
    }

    if (c === ')') {
      parenCount--;
      currentColumn += c;
      continue;
    }

    // Handle column separator
    if (c === ',' && parenCount === 0) {
      columns.push(currentColumn.trim());
      currentColumn = '';
      continue;
    }

    // Default case: append character
    currentColumn += c;
  }

  // Add the last column if it's not empty
  if (currentColumn.trim() !== '') {
    columns.push(currentColumn.trim());
  }

  return columns;
}