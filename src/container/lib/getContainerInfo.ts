import Docker from 'dockerode';

const docker = new Docker();

export const getContainerInfo = async (containerName: string) => {
  const container = docker.getContainer(containerName);
  const inspectData = await container.inspect();
  const stats = await container.stats({ stream: false });

  return {
    name: inspectData.Name,
    status: inspectData.State.Status,
    port: inspectData.NetworkSettings.Ports,
    cpuUsage: stats.cpu_stats?.cpu_usage?.total_usage ?? 'N/A',
    lastStarted: inspectData?.State?.StartedAt ?? 'N/A',
  }
}