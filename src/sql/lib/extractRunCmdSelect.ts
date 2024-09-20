export const extractRunCmdSelect = (col: string) => {
  const colParts = col.match(/^(.*?)\.run_cmd\("(.*?)"\)(?:\.(.*))?$/);
  const containerCol = colParts?.[1] ?? '';
  const command = colParts?.[2] ?? '';
  const nestedField = colParts?.[3] ?? '';
  return { containerCol, command, nestedField };
}