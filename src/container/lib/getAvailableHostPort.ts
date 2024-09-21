import { ContainerInfo } from "dockerode";

export const getAvailableHostPort = (containers: Array<ContainerInfo>, config: Record<string, any>) => {
  let hostPort = parseInt(config.hostConfig?.PortBindings?.["80/tcp"]?.[0]?.HostPort || '0');

  if(!hostPort) {
    return {}
  }

  while (isPortTaken(containers, hostPort)) {
    hostPort += 1;
  }

  return {
    PortBindings: {
      "80/tcp": [
        {
          HostPort: hostPort.toString()
        }
      ]
    }
  }
}

function isPortTaken (containers: Array<ContainerInfo>, port: number) {
  return containers.some(container => {
    const ports = container.Ports || [];
    return ports.some(p => p.PublicPort === port);
  });
};