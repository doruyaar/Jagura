import { extractRunCmdSelect } from "./extractRunCmdSelect";

export const getRunCmdColTitle = (col: string) => {
  const {command, containerCol, nestedField} = extractRunCmdSelect(col);
  const baseColTitle = `${containerCol}.run_cmd("${command}")`
  return nestedField ? `${baseColTitle}.${nestedField}` : baseColTitle;
}