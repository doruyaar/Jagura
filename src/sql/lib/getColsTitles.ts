import { getMetadataColTitle, getRunCmdColTitle } from ".";

export const getColsTitles = (selectedColumns: Array<string>) => selectedColumns.map((col) => {
  if (col.includes("metadata(")) {
    return getMetadataColTitle(col);
  } else if (col.includes("run_cmd(")) {
    return getRunCmdColTitle(col);
  } else {
    return col;
  }
});