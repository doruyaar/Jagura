export const getNestedProperty = (obj: any, path: string) => {
  return path.split(".").reduce((prev, curr) => prev && prev[curr], obj);
}