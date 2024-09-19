export const extractJsonFromString = (str: string): any => {
  const jsonStart = str.indexOf("{");
  const jsonEnd = str.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) {
    try {
      const jsonString = str.substring(jsonStart, jsonEnd + 1);
      return JSON.parse(jsonString);
    } catch (error) {
      return undefined;
    }
  }
  return undefined;
}