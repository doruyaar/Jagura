import { extractRunCmdSelect } from "./extractRunCmdSelect";

export const getRunCmdColTitle = (col: string) => {
  const {command, containerCol, nestedField} = extractRunCmdSelect(col);
  const baseColTitle = `${containerCol}("${command}")`
  return nestedField ? `${baseColTitle}.${nestedField}` : baseColTitle;
}