export const extractMetadataSelect = (col: string) => {
  const colParts = col.match(/^metadata\((.*?)\)(?:\.(.*))?$/);
  const containerCol = colParts?.[1] ?? '';
  const field = colParts?.[2] ?? '';
  return { containerCol, field };
}