import Docker from 'dockerode';
import { getAvailableContainerName, getAvailableHostPort } from '.';

const docker = new Docker();

export const createContainer = async (config: Record<string, any>) => {
  const containerOptions = await getContainerOptions(config)
  return docker.createContainer(containerOptions);
}

async function getContainerOptions (config: Record<string, any>): Promise<Docker.ContainerCreateOptions> {
  const containers = await docker.listContainers({ all: true });

  const name = getAvailableContainerName(containers, config);
  const hostConfig = getAvailableHostPort(containers, config);

  return {
    Image: config.image,
    Cmd: config.command,
    name,
    Tty: true,
    AttachStdin: false,
    OpenStdin: true,
    ExposedPorts: config.exposedPorts || {},
    HostConfig: hostConfig,
  }
} 