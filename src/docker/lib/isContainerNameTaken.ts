import { ContainerInfo } from 'dockerode';

export const isContainerNameTaken = (containers: Array<ContainerInfo>, name: string) => {
  return containers.some(container => container.Names.includes(`/${name}`));
};