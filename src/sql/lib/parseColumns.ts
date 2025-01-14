export const parseColumns = (columnList: string): string[] => {
  const columns: string[] = [];
  let currentColumn: string = '';
  let parenCount: number = 0;
  let quoteChar: string | null = null;

  for (let i = 0; i < columnList.length; i++) {
    const c: string = columnList[i];
    const prevChar: string = columnList[i - 1];

    if ((c === "'" || c === '"') && prevChar !== '\\') {
      if (quoteChar === c) {
        quoteChar = null;
      } else if (!quoteChar) {
        quoteChar = c;
      }
      currentColumn += c;
      continue;
    }

    if (quoteChar) {
      currentColumn += c;
      continue;
    }

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

    if (c === ',' && parenCount === 0) {
      columns.push(currentColumn.trim());
      currentColumn = '';
      continue;
    }

    currentColumn += c;
  }

  if (currentColumn.trim() !== '') {
    columns.push(currentColumn.trim());
  }

  return columns;
}