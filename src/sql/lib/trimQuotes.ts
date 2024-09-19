export const trimQuotes = (value: string): string => {
  return value.replace(/^['"](.+)['"]$/, "$1");
}