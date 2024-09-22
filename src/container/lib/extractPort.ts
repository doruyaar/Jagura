export const extractPort = (portObject: Record<string, any>) => {
  const keys = Object.keys(portObject);
  if (keys.length) {
    const port = keys[0].split('/')[0];
    return port;
  }
  else return 'N/A';
}