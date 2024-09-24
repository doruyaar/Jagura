export const removeSemicolon = (input: string): string => {
  if (input.endsWith(";")) {
      return input.slice(0, -1);
  }
  return input;
}