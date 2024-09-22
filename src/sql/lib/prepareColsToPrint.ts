import { Column } from "./types";

export const prepareColsToPrint = (columns: Column[]): string => 
  `(${columns.map((col) => `${col.name} ${col.type}`).join(', ')})`;