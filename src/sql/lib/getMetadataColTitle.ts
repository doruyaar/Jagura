import { extractMetadataSelect } from "./extractMetadataSelect";

export const getMetadataColTitle = (col: string) => {
  const { containerCol, field } = extractMetadataSelect(col);
  return field ? `metadata(${containerCol}).${field}` : `metadata(${containerCol})`; 
}