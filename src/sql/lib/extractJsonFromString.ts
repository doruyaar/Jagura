export const extractJsonFromString = (str: string): any => {
  const jsonStart = str.indexOf("{");
  const jsonEnd = str.lastIndexOf("}");
  if (jsonStart !== -1 && jsonEnd !== -1) {
    try {
      const jsonString = str.substring(jsonStart, jsonEnd + 1);
      return customParseJSON(jsonString);
    } catch (error) {
      return undefined;
    }
  }
  return undefined;
}

function customParseJSON(input: string) {
  const sanitizedInput = input.replace(/ObjectId\('([a-fA-F0-9]+)'\)/g, '"$1"');

  const jsonString = sanitizedInput
    .replace(/'/g, '"')
    .replace(/(\w+):/g, '"$1":');

  return JSON.parse(jsonString);
}