export const extractPort = (portObject: Record<string, any>) => {
  const keys = Object.keys(portObject);
  const port = keys[0].split('/')[0];
  return parseInt(port, 10);
}