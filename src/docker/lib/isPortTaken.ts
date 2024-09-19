import { ContainerInfo } from 'dockerode';

export const isPortTaken = (containers: Array<ContainerInfo>, port: number) => {
  return containers.some(container => {
    const ports = container.Ports || [];
    return ports.some(p => p.PublicPort === port);
  });
};