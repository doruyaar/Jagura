import Docker from 'dockerode';

import { getAvailableContainerName, getAvailableHostPort } from './index';

const docker = new Docker();

export const getContainerOptions = async (config: any) => {
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