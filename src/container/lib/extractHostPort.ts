export const extractHostPort = (portObject: Record<string, any>, port: string) => {
  const portKey = `${port}/tcp`;
  if (portObject[portKey]) {
    const hostPort = portObject[portKey][0].HostPort || 'N/A';
    return hostPort;
  }
  else return 'N/A';
}