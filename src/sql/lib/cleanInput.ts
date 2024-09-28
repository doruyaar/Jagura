export const cleanInput = (input: string): string => {
  return input.trim().toLowerCase().replace(/;$/, '');
}